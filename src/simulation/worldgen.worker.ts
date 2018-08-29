import ndarray from 'ndarray';
import Alea from 'alea';
import SimplexNoise from 'simplex-noise';
import fill from 'ndarray-fill';
import ops from 'ndarray-ops';
import { IWorldgenOptions, IWorldgenWorkerOutput } from './simulation';
import { ETerrainType, EDirection } from './world';
import * as Collections from 'typescript-collections';
import * as Stats from 'simple-statistics';


/**
 * Priority Flood algorithm from:
 * https://arxiv.org/pdf/1511.04463v1.pdf
 */

function ndarrayStats(ndarray: ndarray) {
  return {
    array: ndarray,
    avg: ops.sum(ndarray) / (ndarray.shape[0] * ndarray.shape[0]),
    max: ops.sup(ndarray),
    min: ops.inf(ndarray),
  };
}

const getNeighbors = (x: number, y: number): number[][] => [
  [x - 1, y],
  [x + 1, y],
  [x, y - 1],
  [x, y + 1],
]

const getNeighborsLabelled = (x: number, y: number): number[][] => [
  [x - 1, y, EDirection.LEFT],
  [x + 1, y, EDirection.RIGHT],
  [x, y - 1, EDirection.UP],
  [x, y + 1, EDirection.DOWN],
]

const neighborForDirection = {
  [EDirection.UP]: (x: number, y: number) => [x, y - 1],
  [EDirection.DOWN]: (x: number, y: number) => [x, y + 1],
  [EDirection.LEFT]: (x: number, y: number) => [x - 1, y],
  [EDirection.RIGHT]: (x: number, y: number) =>  [x + 1, y],
}

const oppositeDirections = {
  [EDirection.NONE]: EDirection.NONE,
  [EDirection.UP]: EDirection.DOWN,
  [EDirection.DOWN]: EDirection.UP,
  [EDirection.LEFT]: EDirection.RIGHT,
  [EDirection.RIGHT]: EDirection.LEFT,
}

function isValidCell(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function generateHeightmap(options: IWorldgenOptions) {
  const { seed, size: { width, height } } = options;

  const heightmap = ndarray(new Uint8ClampedArray(width * height), [width, height]);
  const rng = new Alea(seed);
  const simplex = new SimplexNoise(rng);
  const noise = (nx, ny) => simplex.noise2D(nx, ny);
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const maxDistanceToCenter = 2 * Math.sqrt(Math.pow(width, 2) + Math.pow(width, 2));

  fill(heightmap, (x, y) => {
    // use simplex noise to create random terrain
    const nx = x / width - 0.5;
    const ny = y / height - 0.5;
    let value = (
      0.35 * noise(2.50 * nx, 2.50 * ny) +
      0.30 * noise(5.00 * nx, 5.00 * ny) +
      0.20 * noise(10.0 * nx, 10.0 * ny) +
      0.10 * noise(20.0 * nx, 20.0 * ny) +
      0.05 * noise(40.0 * nx, 40.0 * ny)
    );
    value = (value + 1) / 2;

    // decrease the height of cells farther away from the center to create an island
    const d = (2 * Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) / maxDistanceToCenter) / 0.5;
    const a = 0;
    const b = 1.8;
    const c = 2.2;
    value = (value + a) * (1 - b * Math.pow(d, c));
    return value * 255;
  });

  return heightmap;
}

function removeDepressions(options: IWorldgenOptions, heightmap: ndarray) {
  const { size: { width, height } } = options;

  // copy heightmap into waterheight
  const waterheight = ndarray(new Uint8ClampedArray(width * height), [width, height]);
  ops.assign(waterheight, heightmap);

  // priority flood to fill lakes
  const open = new Collections.PriorityQueue((a, b) => {
    if (a[2] < b[2]) {
      return 1;
    } else if (a[2] > b[2]) {
      return -1;
    }
    return 0;
  });
  const pit = new Collections.Queue();

  const closed = ndarray(new Uint8ClampedArray(width * height), [width, height]);
  fill(closed, () => 0);

  // add all edges to the open queue
  // set them as "closed"
  // calculate all cell neighbors
  const cellNeighbors = []
  for (let x = 0; x < width; x++) {
    cellNeighbors[x] = [];
    for (let y = 0; y < height; y++) {
      const neighbors = getNeighborsLabelled(x, y).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < width && ny < height);
      cellNeighbors[x][y] = neighbors;
      const isEdge = neighbors.length != 4;
      if (isEdge) {
        open.add([x, y, heightmap.get(x, y)]);
        closed.set(x, y, 1);
      }
    }
  }
  let lakeCount = 0;
  while(!open.isEmpty() || !pit.isEmpty()) {
    let cell;
    if (!pit.isEmpty()) {
      cell = pit.dequeue();
    } else {
      cell = open.dequeue();
    }
    const [cx, cy] = cell;

    for (const [nx, ny] of cellNeighbors[cx][cy]) {
      if (closed.get(nx, ny) === 1) continue;
      closed.set(nx, ny, 1);
      if (waterheight.get(nx, ny) <= waterheight.get(cx, cy)) {
        lakeCount++;
        waterheight.set(nx, ny, waterheight.get(cx, cy));
        pit.add([nx, ny, waterheight.get(nx, ny)]);
      } else {
        open.add([nx, ny, waterheight.get(nx, ny)]);
      }
    }
  }
  // console.log('lakeCount', lakeCount);

  return { waterheight, cellNeighbors };
}

function determineFlowDirections(options: IWorldgenOptions, waterheight: ndarray<number>) {
  const { size: { width, height } } = options;

  const flowDirections = ndarray(new Uint8ClampedArray(width * height), [width, height]);
  fill(flowDirections, () => EDirection.NONE);

  const open = new Collections.PriorityQueue<number[]>((a, b) => {
    if (a[2] < b[2]) {
      return 1;
    } else if (a[2] > b[2]) {
      return -1;
    }
    return 0;
  });
  const closed = ndarray(new Uint8ClampedArray(width * height), [width, height]);
  fill(closed, () => 0);

  const cellNeighbors = [];
  for (let x = 0; x < width; x++) {
    cellNeighbors[x] = [];
    for (let y = 0; y < height; y++) {
      const allNeighbors = getNeighborsLabelled(x, y);
      const validNeighbors = allNeighbors.filter(([nx, ny]) => isValidCell(nx, ny, width, height));
      const invalidNeighbors = allNeighbors.filter(([nx, ny]) => !isValidCell(nx, ny, width, height));
      cellNeighbors[x][y] = validNeighbors;
      if (invalidNeighbors.length > 0) { // on the edge of the map
        open.add([x, y, waterheight.get(x, y)]);
        closed.set(x, y, 1);
        flowDirections.set(x, y, invalidNeighbors[0][2]);
      }
    }
  }

  while(!open.isEmpty()) {
    const cell = open.dequeue();
    const [cx, cy] = cell;
    for (const [nx, ny, ndir] of cellNeighbors[cx][cy]) {
      if (closed.get(nx, ny) === 1) continue;
      flowDirections.set(nx, ny, oppositeDirections[ndir]);
      closed.set(nx, ny, 1);
      open.add([nx, ny, waterheight.get(nx, ny)]);
    }
  }

  return flowDirections;
}

function decideTerrainTypes(
  options: IWorldgenOptions,
  sealevel: number,
  heightmap: ndarray,
  waterheight: ndarray,
  flowDirections: ndarray,
  cellNeighbors: [number, number, number][][][],
) {
  const { size: { width, height } } = options;

  // calculate ocean cells by flood fill from the top-left of the map
  // cells which are below sea level and touch the edge of the map are ocean cells
  const seenCells = ndarray(new Int16Array(width * height), [width, height]);
  fill(seenCells, () => 0);

  const isOcean = ndarray(new Int16Array(width * height), [width, height]);
  fill(isOcean, () => 0);
  const q = new Collections.Queue<[number, number]>();
  isOcean.set(0, 0, 1);
  q.add([0, 0]);
  while (!q.isEmpty()) {
    const [cx, cy] = q.dequeue();
    isOcean.set(cx, cy, 1);

    for (const [nx, ny] of cellNeighbors[cx][cy]) {
      if (heightmap.get(nx, ny) <= sealevel && seenCells.get(nx, ny) === 0) {
        seenCells.set(nx, ny, 1);
        q.add([nx, ny]);
      }
    }
  }

  const isLake = ndarray(new Int16Array(width * height), [width, height]);
  fill(isLake, (x, y) => waterheight.get(x, y) > heightmap.get(x, y));

  const isRiver = ndarray(new Int16Array(width * height), [width, height]);
  fill(isRiver, () => 0);

  const upstreamCells = ndarray(new Int16Array(width * height), [width, height]);
  fill(upstreamCells, () => 0);

  // determine coastal cells by finding all land cells with at least one ocean neighbor
  const coastalCells = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const isCoastalOcean = isOcean.get(x, y) === 0 && cellNeighbors[x][y].some(([nx, ny]) => isOcean.get(nx, ny) === 1);
      if (isCoastalOcean) {
        coastalCells.push([x, y]);
      }
    }
  }
  // console.log('coastalCells', coastalCells);

  // determine upstream cell count
  function findUpstreamCount(x, y) {
    let count = 0;
    for (const [nx, ny, ndir] of cellNeighbors[x][y]) {
      const neighborFlowDir: EDirection = flowDirections.get(nx, ny);
      const isUpstream = oppositeDirections[neighborFlowDir] === ndir;
      if (isUpstream) {
        count += 1 + findUpstreamCount(nx, ny);
      }
    }
    upstreamCells.set(x, y, upstreamCells.get(x, y) + count);
    return count;
  }

  for (const [x, y] of coastalCells) {
    findUpstreamCount(x, y);
  }

  const data = Array.from(upstreamCells.data).filter(i => i > 0);
  const riverThreshold = Stats.quantile(data, 0.95);
  const streamThreshold = Stats.quantile(data, 0.92);
  console.log('riverThreshold', riverThreshold);
  console.log('streamThreshold', streamThreshold);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (upstreamCells.get(x, y) > riverThreshold) {
        isRiver.set(x, y, 1);
      } else if (upstreamCells.get(x, y) > streamThreshold) {
        isRiver.set(x, y, 2);
      }
    }
  }

  const terrainTypes = ndarray(new Int16Array(width * height), [width, height]);
  let oceanCellCount = 0;
  fill(terrainTypes, (x, y) => {
    if (isOcean.get(x, y)) {
      oceanCellCount++;
      return ETerrainType.OCEAN;
    }
    if (isLake.get(x, y) === 1) {
      return ETerrainType.LAKE;
    }
    if (isRiver.get(x, y) === 1) {
      return ETerrainType.RIVER;
    }
    if (isRiver.get(x, y) === 2) {
      return ETerrainType.STREAM;
    }
    return ETerrainType.LAND;
  });
  // console.log('Ocean percent', oceanCellCount / (width * height));
  return terrainTypes;
}

function decideDrainageBasins(
  options: IWorldgenOptions,
  cellNeighbors: [number, number, number][][][],
  waterheight: ndarray,
  terrainTypes: ndarray,
) {
  const { seed, size: { width, height } } = options;

  const rng = new Alea(seed);
  const open = new Collections.PriorityQueue<number[]>((a, b) => {
    if (a[2] < b[2]) {
      return 1;
    } else if (a[2] > b[2]) {
      return -1;
    }
    return 0;
  });
  const pit = new Collections.Queue();
  const labels = [];

  let currentLabel = 1;

  for (let x = 0; x < width; x++) {
    labels[x] = [];
    for (let y = 0; y < height; y++) {
      labels[x][y] = undefined; // candidate
      const isEdge = getNeighborsLabelled(x, y)
        .some(([nx, ny]) => !isValidCell(nx, ny, width, height));
      if (isEdge) {
        open.add([x, y, waterheight.get(x, y)]);
        labels[x][y] = null; // queued
      }
    }
  }

  while(!open.isEmpty() || !pit.isEmpty()) {
    let cell;
    if (!pit.isEmpty()) {
      cell = pit.dequeue();
    } else {
      cell = open.dequeue();
    }
    const [cx, cy, z] = cell;
    if (labels[cx][cy] === null) {
      labels[cx][cy] = currentLabel;
      currentLabel++;
    }

    for (const [nx, ny] of cellNeighbors[cx][cy]) {
      if (labels[nx][ny] !== undefined) continue;
      labels[nx][ny] = labels[cx][cy];
      if (waterheight.get(nx, ny) <= z) {
        pit.add([nx, ny, z]);
      } else {
        open.add([nx, ny, waterheight.get(nx, ny)]);
      }
    }
  }

  const drainageBasins: {
    [id: number]: {
      color: number,
      cells: [number, number][],
    }
  } = {};
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (terrainTypes.get(x, y) === ETerrainType.OCEAN) continue;
      const id: number = labels[x][y];
      if (!(id in drainageBasins)) {
        const red: number = Math.round(rng() * 255);
        const green: number = Math.round(rng() * 255);
        const blue: number = Math.round(rng() * 255);
        drainageBasins[id] = {
          color: (red << 16) + (green << 8) + blue,
          cells: [],
        };
      }
      drainageBasins[id].cells.push([x, y]);
    }
  }

  return drainageBasins;
}

onmessage = function (event: MessageEvent) {
  const options: IWorldgenOptions = event.data;
  const sealevel = 102;
  const heightmap = generateHeightmap(options);
  const { waterheight, cellNeighbors } = removeDepressions(options, heightmap);
  const flowDirections = determineFlowDirections(options, waterheight);
  const terrainTypes = decideTerrainTypes(options, sealevel, heightmap, waterheight, flowDirections, cellNeighbors);

  const drainageBasins = decideDrainageBasins(options, cellNeighbors, waterheight, terrainTypes);

  const output: IWorldgenWorkerOutput = {
    options,
    sealevel,
    heightmap: heightmap.data,
    flowDirections: flowDirections.data,
    terrainTypes: terrainTypes.data,
    drainageBasins,
  };
  (postMessage as any)(output);
}
