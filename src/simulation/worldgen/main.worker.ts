import { ITerrainWorkerOutput } from './../types';
import ndarray from 'ndarray';
import Alea from 'alea';
import SimplexNoise from 'simplex-noise';
import fill from 'ndarray-fill';
import ops from 'ndarray-ops';
import { IWorldgenOptions, IWorldgenWorkerOutput, EWorldShape } from '../types';
import {
  ECellType,
  ECellFeature,
  EDirection,
  EBiome,
  moistureZoneRanges,
  temperatureZoneRanges,
  biomeRanges,
  ETerrainType
} from '../world';
import * as Collections from 'typescript-collections';
import * as Stats from 'simple-statistics';
import {
  BFS,
  groupDistinct,
  ndarrayStats,
  countUnique,
  getNeighborsLabelled,
  neighborForDirection,
  oppositeDirections,
  isValidCell,
  getValidNeighborsLabelled,
  shuffle,
  loopGridCircle,
} from './utils';


const ctx: Worker = self as any;

/**
 * Priority Flood algorithm from:
 * https://arxiv.org/pdf/1511.04463v1.pdf
 */

function removeDepressions(options: IWorldgenOptions, heightmap: ndarray, sealevel: number) {
  const { seed, size: { width, height }, depressionFillPercent } = options;
  const rng = new (Alea as any)(seed);

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
  const cellNeighbors = [];
  for (let x = 0; x < width; x++) {
    cellNeighbors[x] = [];
    for (let y = 0; y < height; y++) {
      cellNeighbors[x][y] = getValidNeighborsLabelled(x, y, width, height);
      const isEdge = cellNeighbors[x][y].length != 4;
      if (isEdge) {
        open.add([x, y, heightmap.get(x, y)]);
        closed.set(x, y, 1);
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
    const [cx, cy] = cell;

    for (const [nx, ny] of cellNeighbors[cx][cy]) {
      if (closed.get(nx, ny) === 1) continue;
      closed.set(nx, ny, 1);
      if (waterheight.get(nx, ny) <= waterheight.get(cx, cy)) {
        waterheight.set(nx, ny, waterheight.get(cx, cy));
        pit.add([nx, ny, waterheight.get(nx, ny)]);
      } else {
        open.add([nx, ny, waterheight.get(nx, ny)]);
      }
    }
  }

  // turn lakes into hills by inverting them

  let depressions: number[][][] = [];
  const depressionCellsGrid = ndarray(new Uint8ClampedArray(width * height), [width, height]);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (waterheight.get(x, y) > heightmap.get(x, y) && waterheight.get(x, y) >= sealevel) {
        depressionCellsGrid.set(x, y, 1);
      } else {
        depressionCellsGrid.set(x, y, 0);
      }
    }
  }

  const visited = ndarray(new Uint8ClampedArray(width * height), [width, height]);
  function groupFunc(x: number, y: number) {
    return depressionCellsGrid.get(x, y) === 1;
  }
  fill(visited, () => 0);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (depressionCellsGrid.get(x, y) === 1 && visited.get(x, y) === 0) {
        // new island
        const lakeCells = BFS(visited, groupFunc, x, y);
        depressions.push(lakeCells);
      }
    }
  }

  // fill in tiny lakes
  function fillDepression(depression: number[][]) {
    for (const [x, y] of depression) {
      const newHeight = waterheight.get(x, y) + (waterheight.get(x, y) - heightmap.get(x, y));
      heightmap.set(x, y, newHeight);
    }
  }
  depressions = depressions.filter(depression => {
    if (depression.length <= 3) {
      fillDepression(depression);
      return false;
    }
    return true;
  });

  // fill in a percent of all depressions
  const filledIndex = depressions.length * depressionFillPercent;
  const lakes = shuffle(rng, depressions).filter((depression, index) => {
    if (index < filledIndex) {
      fillDepression(depression);
      return false;
    }
    return true;
  });

  return { waterheight, cellNeighbors, heightmap, lakes };
}

function determineFlowDirections(
  options: IWorldgenOptions,
  waterheight: ndarray<number>
) {
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
      const validNeighbors = [];
      const invalidNeighbors = [];
      for (const n of allNeighbors) {
        if (isValidCell(n[0], n[1], width, height)) {
          validNeighbors.push(n);
        } else {
          invalidNeighbors.push(n);
        }
      }

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
  const { size: { width, height }, riverThreshold } = options;

  // calculate ocean cells by flood fill from the top-left of the map
  // cells which are below sea level and touch the edge of the map are ocean cells
  const seenCells = ndarray(new Int16Array(width * height), [width, height]);
  fill(seenCells, () => 0);

  // inland ocean cells should be considered lakes
  // NOTE: assumes top-left cell of the map is an ocean cell
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

  const riverMap = ndarray(new Int16Array(width * height), [width, height]);
  fill(riverMap, () => 0);

  const upstreamCells = ndarray(new Int16Array(width * height), [width, height]);
  fill(upstreamCells, () => 0);

  // determine coastal cells by finding all land cells with at least one ocean neighbor
  const coastalCells = [];
  const isCoastalCell = ndarray(new Int16Array(width * height), [width, height]);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      // cell is coastal if it's a land cell next to lake or ocean
      const isCoastal = (
        (isOcean.get(x, y) === 0 && isLake.get(x, y) === 0) &&
        (cellNeighbors[x][y].some(([nx, ny]) => isOcean.get(nx, ny) === 1) ||
         cellNeighbors[x][y].some(([nx, ny]) => isLake.get(nx, ny) === 1))
      );
      if (isCoastal) {
        coastalCells.push([x, y]);
        isCoastalCell.set(x, y, 1);
      } else {
        isCoastalCell.set(x, y, 0);
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
  // const upstreamCellsMax = ops.sup(upstreamCells);
  let riverThresholdAmount;
  if (data.length > 0) {
    riverThresholdAmount = Stats.quantile(data, riverThreshold);
  } else {
    riverThresholdAmount = Infinity;
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const upstreamCount = upstreamCells.get(x, y);
      if (upstreamCount > riverThresholdAmount) {
        riverMap.set(x, y, 1);
      }
    }
  }

  const cellTypes = ndarray(new Int16Array(width * height), [width, height]);
  fill(cellTypes, (x, y) => {
    if (isOcean.get(x, y)) {
      return ECellType.OCEAN;
    }
    return ECellType.LAND;
  });

  const terrainRoughness = ndarray(new Int16Array(width * height), [width, height]);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const allNeighbors = getNeighborsLabelled(x, y);
      const myHeight = heightmap.get(x, y);
      let min = Infinity;
      let max = -Infinity;
      let changeInHeight = 0;
      for (let nx = x - 2; nx < x + 2; nx++) {
        for (let ny = y - 2; ny < y + 2; ny++) {
          if (isValidCell(nx, ny, width, height)) {
            const neighborHeight = heightmap.get(nx, ny);
            min = Math.min(min, neighborHeight);
            max = Math.max(max, neighborHeight);
            changeInHeight += Math.abs(myHeight - neighborHeight);
          }
        }
      }
      // terrainRoughness.set(x, y, max - min);
      terrainRoughness.set(x, y, changeInHeight);
    }
  }
  console.log('terrainRoughness', ndarrayStats(terrainRoughness));

  const cellFeatures = ndarray(new Int16Array(width * height), [width, height]);
  let oceanCellCount = 0;
  fill(cellFeatures, (x, y) => {
    if (isOcean.get(x, y)) {
      const waterDepth = sealevel - waterheight.get(x, y);
      oceanCellCount++;
      if (waterDepth < 10) {
        return ECellFeature.COASTAL;
      }
      return ECellFeature.OCEANIC;
    }
    if (isLake.get(x, y) === 1) {
      riverMap.set(x, y, 0);
      return ECellFeature.LAKE;
    }
    return ECellFeature.LAND;
  });

  const terrainMap = ndarray(new Int16Array(width * height), [width, height]);
  const ROUGHNESS_CUTOFF = 75;
  const HIGHNESS_CUTOFF = 140;
  fill(terrainMap, (x, y) => {
    if (cellFeatures.get(x, y) === ECellFeature.LAND) {
      if (
        // low altitude, flat terrain
        terrainRoughness.get(x, y) < ROUGHNESS_CUTOFF &&
        heightmap.get(x, y) < HIGHNESS_CUTOFF
      ) {
        return ETerrainType.PLAIN;
      } else if (
        // low altitude, rough terrain
        terrainRoughness.get(x, y) > ROUGHNESS_CUTOFF &&
        heightmap.get(x, y) < HIGHNESS_CUTOFF
      ) {
        return ETerrainType.FOOTHILLS;
      } else if (
        // high altitude, flat terrain
        terrainRoughness.get(x, y) < ROUGHNESS_CUTOFF &&
        heightmap.get(x, y) > HIGHNESS_CUTOFF
      ) {
        return ETerrainType.PLATEAU;
      } else if (
        // high altitude, rough terrain
        terrainRoughness.get(x, y) > ROUGHNESS_CUTOFF &&
        heightmap.get(x, y) > HIGHNESS_CUTOFF
      ) {
        return ETerrainType.MOUNTAINOUS;
      }
    }
  });

  return { cellTypes, cellFeatures, upstreamCells, oceanCellCount, terrainRoughness, riverMap, terrainMap };
}

function decideDrainageBasins(
  options: IWorldgenOptions,
  cellNeighbors: [number, number, number][][][],
  waterheight: ndarray,
  cellTypes: ndarray,
) {
  const { seed, size: { width, height } } = options;

  const rng = new (Alea as any)(seed);
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
      if (cellTypes.get(x, y) === ECellType.OCEAN) continue;
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

/**
 * Decide temperature of each cell
 *
 * Considerations:
 *    - warmer near the equator
 *    - colder near the poles
 *    - colder at higher elevations
 *    - warmer near shallow waters
 */
function decideTemperature(
  options: IWorldgenOptions,
  sealevel: number,
  waterheight: ndarray
): ndarray {
  const { size: { width, height }, temperature, elevationCoolingAmount } = options;

  const latitudeRatio = ndarray(new Float32Array(width * height), [width, height]);
  fill(latitudeRatio, (x, y) => {
    let ratio = y / height;
    if (ratio < 0.5) {
      ratio /= 0.5;
    } else {
      ratio = (1 - ratio) / 0.5;
    }
    return ratio;
  });

  const temperatureMap = ndarray(new Int16Array(width * height), [width, height]);
  const maxAltitude = 255 - sealevel;
  fill(temperatureMap, (x, y) => {
    const ratio = latitudeRatio.get(x, y);
    // radiation is a function of latitude only
    const radiation = (Math.abs(temperature.min) + (temperature.max - 10)) * ratio + temperature.min;
    // includes heights
    let part2 = 0;
    const altitude = waterheight.get(x, y) - sealevel;
    if (altitude < 0) { // ocean
      // shallow seas are warmer than deep oceans
      part2 = (1 - (Math.abs(altitude) / sealevel)) * 10;
    } else {
      // higher is colder
      // lower is warmer
      part2 = 10 + (altitude / maxAltitude) * -elevationCoolingAmount;
    }
    return radiation + part2;
  });

  return temperatureMap;
}

function generateMoisture(
  options: IWorldgenOptions,
  heightmap: ndarray,
  sealevel: number,
  cellTypes: ndarray,
  riverMap: ndarray,
): ndarray {
  const { seed, size: { width, height } } = options;
  const rng = new (Alea as any)(seed);
  const moistureMap = ndarray(new Int16Array(width * height), [width, height]);
  const simplex = new SimplexNoise(rng);
  fill(moistureMap, (x, y) => {
    if (cellTypes.get(x, y) === ECellType.LAND) {
      const nx = x / width - 0.5;
      const ny = y / height - 0.5;
      const moisture = ((simplex.noise2D(3 * nx, 3 * ny) + 1) / 2);
      const inlandRatio = (heightmap.get(x, y) - sealevel) / (255 - sealevel);
      return (moisture * (1 - inlandRatio)) * 500;
    }
    return 0;
  });
  let cells = [];
  const scale = Math.max(width, height) / 250;
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (riverMap.get(x, y) === 1) {
        const inlandRatio = (heightmap.get(x, y) - sealevel) / (255 - sealevel);
        const riverAdd = (1 - inlandRatio) * 15;
        let size = scale * 15 + Math.round(rng() * 10); // 15 to 25
        cells = loopGridCircle(x, y, size);
        for (const [cx, cy] of cells) {
          moistureMap.set(cx, cy, moistureMap.get(cx, cy) + riverAdd);
        }

        size = scale * 5 + Math.round(rng() * 10); // 5 to 15
        cells = loopGridCircle(x, y, size);
        for (const [cx, cy] of cells) {
          moistureMap.set(cx, cy, moistureMap.get(cx, cy) + (riverAdd * 2));
        }

        size = scale * 5 + Math.round(rng() * 5); // 5 to 10
        cells = loopGridCircle(x, y, size);
        for (const [cx, cy] of cells) {
          moistureMap.set(cx, cy, moistureMap.get(cx, cy) + (riverAdd * 3));
        }
      }
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (cellTypes.get(x, y) === ECellType.OCEAN) {
        moistureMap.set(x, y, 0);
      }
    }
  }

  return moistureMap;
}

function generateBiomes(
  options: IWorldgenOptions,
  temperatures: ndarray,
  moistureMap: ndarray,
  cellTypes: ndarray,
  cellFeatures: ndarray,
): Record<string, ndarray> {
  const { size: { width, height } } = options;
  const biomes = ndarray(new Int16Array(width * height), [width, height]);
  const moistureZones = ndarray(new Int16Array(width * height), [width, height]);
  const temperatureZones = ndarray(new Int16Array(width * height), [width, height]);
  fill(biomes, (x, y) => {
    if (
      cellTypes.get(x, y) !== ECellType.LAND ||
      cellFeatures.get(x, y,) === ECellFeature.LAKE
    ) {
      return EBiome.NONE;
    }
    const moisture = moistureMap.get(x, y) / 10;
    const temperature = temperatures.get(x, y);
    let moistureZone = null;
    for (const [zone, { start, end }] of Object.entries(moistureZoneRanges)) {
      if (moisture >= start && moisture < end) {
        moistureZone = zone;
      }
    }
    moistureZones.set(x, y, moistureZone);
    let temperatureZone = null;
    for (const [zone, { start, end }] of Object.entries(temperatureZoneRanges)) {
      if (temperature >= start && temperature < end) {
        temperatureZone = zone;
      }
    }
    temperatureZones.set(x, y, temperatureZone);
    if (moistureZone === null) {
      throw new Error(`Failed to find biome for moisture: ${moisture}`);
    }
    if (temperatureZone === null) {
      throw new Error(`Failed to find biome for temperature: ${temperature}`);
    }
    return biomeRanges[moistureZone][temperatureZone];
  });

  return {
    biomes,
    moistureZones,
    temperatureZones,
  };
}

function findFeatures(
  options: IWorldgenOptions,
  cellTypes: ndarray,
  riverMap: ndarray,
  oceanCellCount: number
) {
  const { size: { width, height } } = options;
  const landCellCount = (width * height) - oceanCellCount;

  // determine land features
  const landFeatures = groupDistinct(
    (x: number, y: number) => cellTypes.get(x, y) === ECellType.LAND,
    width, height,
  ).map(feature => ({
    relativeSize: feature.length / landCellCount,
    cells: feature,
  }));
  console.log('landFeatures', landFeatures);

  // determine rivers
  const rivers = groupDistinct(
    (x: number, y: number) => (
      riverMap.get(x, y) === 1
    ),
    width, height,
  );
  console.log('rivers', rivers);

  return { rivers, landFeatures }
}

function runTerrainWorker<T>(
  workerClass: any,
  options,
): Promise<T> {
  const worker = new workerClass();
  worker.postMessage(options);
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent) => {
      resolve(event.data as T);
    };
    worker.onerror = reject;
  });
}

const createWorkerRunner = (
  workerClass: any,
  options: IWorldgenOptions,
  heightmap,
) => cursor => runTerrainWorker(workerClass, { options, heightmap, cursor });

ctx.onmessage = async (event: MessageEvent) => {
  const options: IWorldgenOptions = event.data;
  const sealevel = options.sealevel;
  console.time('Worldgen');

  console.time('step: terrain');

  console.time('terrain init');
  const TerrainWorker = require('worker-loader!./terrain.worker');
  console.timeEnd('terrain init');

  console.time('terrain worker');
  const { size: { width, height } } = options;
  const heightmapData = new SharedArrayBuffer(width * height * Uint8ClampedArray.BYTES_PER_ELEMENT);
  const terrainWorkerRunner = createWorkerRunner(TerrainWorker, options, heightmapData);

  // top left
  const workerPromises = [];
  const TERRAIN_WORKER_SPLIT = 1;
  for (let cx = 0; cx < width; cx += width / TERRAIN_WORKER_SPLIT) {
    for (let cy = 0; cy < height; cy += height / TERRAIN_WORKER_SPLIT) {
      workerPromises.push(terrainWorkerRunner([cx, cy, cx + (width / TERRAIN_WORKER_SPLIT), cy + (height / TERRAIN_WORKER_SPLIT)]));
    }
  }
  await Promise.all(workerPromises);
  console.timeEnd('terrain worker');
  const heightmap = ndarray(new Uint8ClampedArray(heightmapData), [width, height]);

  console.time('terrain reinit');
  console.timeEnd('terrain reinit');

  console.time('step: remove depressions');
  const { waterheight, cellNeighbors, lakes } = removeDepressions(options, heightmap, options.sealevel);
  console.timeEnd('step: remove depressions');

  console.timeEnd('step: terrain');

  console.time('step: determineFlowDirections');
  const flowDirections = determineFlowDirections(options, heightmap);
  console.timeEnd('step: determineFlowDirections');

  console.time('step: decideTerrainTypes');
  let {
    cellTypes,
    cellFeatures,
    upstreamCells,
    oceanCellCount,
    terrainRoughness,
    riverMap,
    terrainMap,
  } = decideTerrainTypes(options, sealevel, heightmap, waterheight, flowDirections, cellNeighbors);
  console.timeEnd('step: decideTerrainTypes');

  console.time('step: decideDrainageBasins');
  const drainageBasins = decideDrainageBasins(options, cellNeighbors, waterheight, cellTypes);
  console.timeEnd('step: decideDrainageBasins');

  console.time('step: decideTemperature');
  const temperatures = decideTemperature(options, sealevel, waterheight);
  console.timeEnd('step: decideTemperature');

  console.time('step: generateMoisture');
  const moistureMap = generateMoisture(options, heightmap, sealevel, cellTypes, riverMap);
  console.timeEnd('step: generateMoisture');

  console.time('step: generateBiomes');
  const {
    biomes,
    moistureZones,
    temperatureZones
  } = generateBiomes(options, temperatures, moistureMap, cellTypes, cellFeatures);
  console.timeEnd('step: generateBiomes');

  console.time('step: findFeatures');
  findFeatures(options, cellTypes, cellFeatures, oceanCellCount);
  console.log('lakes', lakes);
  console.timeEnd('step: findFeatures');

  // console.log('upstreamCells', ndarrayStats(upstreamCells));
  // console.log('moistureMap', ndarrayStats(moistureMap));
  // console.log('temperatures', ndarrayStats(temperatures));
  // console.log('biomes', countUnique(biomes));
  console.timeEnd('Worldgen');

  const output: IWorldgenWorkerOutput = {
    options,
    sealevel,
    heightmap: heightmap.data,
    flowDirections: flowDirections.data,
    cellTypes: cellTypes.data,
    cellFeatures: cellFeatures.data,
    drainageBasins,
    upstreamCells: upstreamCells.data,
    temperatures: temperatures.data,
    moistureMap: moistureMap.data,
    moistureZones: moistureZones.data,
    riverMap: riverMap.data,
    terrainMap: terrainMap.data,
    temperatureZones: temperatureZones.data,
    terrainRoughness: terrainRoughness.data,
    biomes: biomes.data,
  };
  ctx.postMessage(output, [
    (flowDirections.data as any).buffer,
    (cellTypes.data as any).buffer,
    (cellFeatures.data as any).buffer,
    (upstreamCells.data as any).buffer,
    (temperatures.data as any).buffer,
    (moistureMap.data as any).buffer,
    (moistureZones.data as any).buffer,
    (temperatureZones.data as any).buffer,
    (terrainRoughness.data as any).buffer,
    (biomes.data as any).buffer,
  ]);
}
