import ndarray from 'ndarray';
import Alea from 'alea';
import SimplexNoise from 'simplex-noise';
import fill from 'ndarray-fill';
import ops from 'ndarray-ops';
import { IWorldgenOptions, IWorldgenWorkerOutput } from './simulation';
import { ETerrainType } from './world';
import * as Collections from 'typescript-collections';


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
      0.60 * noise(2.50 * nx, 2.50 * ny) +
      0.20 * noise(5.00 * nx, 5.00 * ny) +
      0.10 * noise(10.0 * nx, 10.0 * ny)
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
  const { seed, size: { width, height } } = options;

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
      const neighbors = getNeighbors(x, y).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < width && ny < height);
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
  console.log('lakeCount', lakeCount);

  return waterheight;
}

function decideTerrainTypes(options: IWorldgenOptions, sealevel: number, heightmap: ndarray, waterheight: ndarray) {
  const { size: { width, height } } = options;
  const terrainTypes = ndarray(new Int16Array(width * height), [width, height]);
  let oceanCells = 0;
  fill(terrainTypes, (x, y) => {
    const height = heightmap.get(x, y);
    if (height <= sealevel) {
      oceanCells++;
      return ETerrainType.OCEAN;
    }
    if (waterheight.get(x, y) > heightmap.get(x, y)) {
      return ETerrainType.LAKE;
    }
    return ETerrainType.LAND;
  });
  console.log('Ocean percent', oceanCells / (width * height));
  return terrainTypes;
}

onmessage = function (event: MessageEvent) {
  const options: IWorldgenOptions = event.data;
  const sealevel = 102;
  const heightmap = generateHeightmap(options);
  const waterheight = removeDepressions(options, heightmap);
  const terrainTypes = decideTerrainTypes(options, sealevel, heightmap, waterheight);

  const output: IWorldgenWorkerOutput = {
    options,
    sealevel,
    heightmap: heightmap.data,
    terrainTypes: terrainTypes.data,
  };
  (postMessage as any)(output);
}
