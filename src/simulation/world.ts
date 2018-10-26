import ndarray from 'ndarray';
import ops from 'ndarray-ops';
import { IWorldgenWorkerOutput } from './worldgen/types';
import { mapValues } from 'lodash';
import { ICell, IDrainageBasin, EDirection, ECellType, ERiverType, ETerrainType, ECellFeature, EBiome } from './worldTypes';


interface IRange {
  min: number,
  max: number
}

export interface IWorldStats {
  biomePercents: Record<any, number>;
  ranges: Record<string, IRange>;
}

export function ndarrayRange(array: ndarray): IRange {
  return {
    min: ops.inf(array),
    max: ops.sup(array),
  }
}

export default class World {
  grid: ICell[][];
  cells: Set<ICell>;
  size: {
    width: number;
    height: number;
  };
  sealevel: number;
  drainageBasins: IDrainageBasin[];
  params: IWorldgenWorkerOutput;
  stats: IWorldStats;

  constructor(params: IWorldgenWorkerOutput) {
    this.params = params;
    this.grid = [];
    this.cells = new Set();
    this.size = params.options.size;
    this.sealevel = params.sealevel;
    const heightmap = ndarray(params.heightmap, [this.size.width, this.size.height]);
    const cellTypes = ndarray(params.cellTypes, [this.size.width, this.size.height]);
    const cellFeatures = ndarray(params.cellFeatures, [this.size.width, this.size.height]);
    const flowDirections = ndarray(params.flowDirections, [this.size.width, this.size.height]);
    const riverMap = ndarray(params.riverMap, [this.size.width, this.size.height]);
    const terrainMap = ndarray(params.terrainMap, [this.size.width, this.size.height]);
    const temperatures = ndarray(params.temperatures, [this.size.width, this.size.height]);
    const upstreamCells = ndarray(params.upstreamCells, [this.size.width, this.size.height]);
    const moistureZones = ndarray(params.moistureZones, [this.size.width, this.size.height]);
    const temperatureZones = ndarray(params.temperatureZones, [this.size.width, this.size.height]);
    const moistureMap = ndarray(params.moistureMap, [this.size.width, this.size.height]);
    const biomes = ndarray(params.biomes, [this.size.width, this.size.height]);
    const terrainRoughness = ndarray(params.terrainRoughness, [this.size.width, this.size.height]);

    for (let x = 0; x < this.size.width; x++) {
      this.grid[x] = [];
      for (let y = 0; y < this.size.height; y++) {
        const cell: ICell = {
          world: this,
          x, y,
          height: heightmap.get(x, y),
          flowDir: flowDirections.get(x, y) as EDirection,
          type: cellTypes.get(x, y) as ECellType,
          riverType: riverMap.get(x, y) as ERiverType,
          terrainType: terrainMap.get(x, y) as ETerrainType,
          feature: cellFeatures.get(x, y) as ECellFeature,
          temperature: temperatures.get(x, y),
          upstreamCount: upstreamCells.get(x, y),
          moisture: moistureMap.get(x, y),
          moistureZone: moistureZones.get(x, y),
          temperatureZone: temperatureZones.get(x, y),
          terrainRoughness: terrainRoughness.get(x, y),
          biome: biomes.get(x, y),
        };
        this.cells.add(cell);
        this.grid[x][y] = cell;
      }
    }
    this.drainageBasins = [];
    for (const [id, { color, cells }] of Object.entries(params.drainageBasins)) {
      const drainageBasin: IDrainageBasin = {
        id: parseInt(id, 10),
        cells: cells.map(([x, y]) => this.grid[x][y]),
        color,
      }
      this.drainageBasins.push(drainageBasin);
    }

    // make stats
    const biomeCounts: any = {};
    let landCount = 0;
    for (const cell of this.cells) {
      if (cell.biome !== EBiome.NONE) {
        landCount++;
        if (cell.biome in biomeCounts) {
          biomeCounts[cell.biome]++;
        } else {
          biomeCounts[cell.biome] = 1;
        }
      }
    }
    const biomePercents = mapValues(biomeCounts, i => i / landCount);
    const ranges = {
      temperature: ndarrayRange(temperatures),
      moisture: ndarrayRange(moistureMap),
      height: ndarrayRange(heightmap),
    };
    this.stats = { biomePercents, ranges };
  }

  get cellCount() {
    return this.size.width * this.size.height;
  }

  get exportString() {
    return encodeURIComponent(btoa(JSON.stringify(this.params.options)));
  }

  getCell(x: number, y: number): ICell | null {
    if (x < 0 || y < 0 || x >= this.size.width || y >= this.size.height) {
      return null;
    }
    return this.grid[x][y];
  }
}

