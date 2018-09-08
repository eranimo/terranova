import ndarray from 'ndarray';
import { IWorldgenOptions, IWorldgenWorkerOutput } from './simulation';



export enum ETerrainType {
  OCEAN,
  LAND,
  RIVER,
  LAKE,
  COAST,
  MOUNTAIN,
}

export enum EBiome {
  NONE,
  TUNDRA,
  BOREAL_FOREST,
  SHRUBLAND,
  GRASSLAND,
  SAVANNA,
  DESERT,
  TEMPERATE_FOREST,
  TEMPERATE_RAINFOREST,
  TROPICAL_FOREST,
  TROPICAL_RAINFOREST
}

export enum EMoistureZone {
  BARREN,
  ARID,
  SEMIARID,
  SEMIWET,
  WET,
}

export enum ETemperatureZone {
  ARCTIC,
  SUBARCTIC,
  TEMPERATE,
  SUBTROPICAL,
  TROPICAL,
}

export const biomeTitles = {
  [EBiome.NONE]: 'None',
  [EBiome.TUNDRA]: 'Tundra',
  [EBiome.BOREAL_FOREST]: 'Boreal Forest',
  [EBiome.SHRUBLAND]: 'Scrubland',
  [EBiome.GRASSLAND]: 'Grassland',
  [EBiome.SAVANNA]: 'Savanna',
  [EBiome.DESERT]: 'Desert',
  [EBiome.TEMPERATE_FOREST]: 'Temperate Forest',
  [EBiome.TEMPERATE_RAINFOREST]: 'Temperate Rainforest',
  [EBiome.TROPICAL_FOREST]: 'Tropical Forest',
  [EBiome.TROPICAL_RAINFOREST]: 'Tropical Rainforest'
}

export const biomeColors = {
  [EBiome.NONE]: 0x4783A0,
  [EBiome.TUNDRA]: 0x96D1C3,
  [EBiome.BOREAL_FOREST]: 0x006259,
  [EBiome.SHRUBLAND]: 0xB26A47,
  [EBiome.GRASSLAND]: 0xF6EB64,
  [EBiome.SAVANNA]: 0xC7C349,
  [EBiome.DESERT]: 0x8B4D32,
  [EBiome.TEMPERATE_FOREST]: 0x92D847,
  [EBiome.TEMPERATE_RAINFOREST]: 0x6B842A,
  [EBiome.TROPICAL_FOREST]: 0x097309,
  [EBiome.TROPICAL_RAINFOREST]: 0x005100
}

export const moistureZoneRanges = {
  [EMoistureZone.BARREN]: { start: 0, end: 25 },
  [EMoistureZone.ARID]: { start: 25, end: 50 },
  [EMoistureZone.SEMIARID]: { start: 50, end: 100 },
  [EMoistureZone.SEMIWET]: { start: 100, end: 200 },
  [EMoistureZone.WET]: { start: 200, end: 500 },
}

export const temperatureZoneRanges = {
  [ETemperatureZone.ARCTIC]: { start: -50, end: -10 },
  [ETemperatureZone.SUBARCTIC]: { start: -10, end: 2 },
  [ETemperatureZone.TEMPERATE]: { start: 2, end: 15 },
  [ETemperatureZone.SUBTROPICAL]: { start: 15, end: 20 },
  [ETemperatureZone.TROPICAL]: { start: 20, end: 30 },
}

// mapping between moisture zones and temperatures which returns biome
export const biomeRanges = {
  [EMoistureZone.BARREN]: {
    [ETemperatureZone.ARCTIC]: EBiome.TUNDRA,
    [ETemperatureZone.SUBARCTIC]: EBiome.TUNDRA,
    [ETemperatureZone.TEMPERATE]: EBiome.GRASSLAND,
    [ETemperatureZone.SUBTROPICAL]: EBiome.GRASSLAND,
    [ETemperatureZone.TROPICAL]: EBiome.DESERT,
  },
  [EMoistureZone.ARID]: {
    [ETemperatureZone.ARCTIC]: EBiome.TUNDRA,
    [ETemperatureZone.SUBARCTIC]: EBiome.TUNDRA,
    [ETemperatureZone.TEMPERATE]: EBiome.SHRUBLAND,
    [ETemperatureZone.SUBTROPICAL]: EBiome.SHRUBLAND,
    [ETemperatureZone.TROPICAL]: EBiome.DESERT,
  },
  [EMoistureZone.SEMIARID]: {
    [ETemperatureZone.ARCTIC]: EBiome.TUNDRA,
    [ETemperatureZone.SUBARCTIC]: EBiome.BOREAL_FOREST,
    [ETemperatureZone.TEMPERATE]: EBiome.TEMPERATE_FOREST,
    [ETemperatureZone.SUBTROPICAL]: EBiome.SHRUBLAND,
    [ETemperatureZone.TROPICAL]: EBiome.SAVANNA,
  },
  [EMoistureZone.SEMIWET]: {
    [ETemperatureZone.ARCTIC]: EBiome.TUNDRA,
    [ETemperatureZone.SUBARCTIC]: EBiome.BOREAL_FOREST,
    [ETemperatureZone.TEMPERATE]: EBiome.TEMPERATE_FOREST,
    [ETemperatureZone.SUBTROPICAL]: EBiome.TEMPERATE_FOREST,
    [ETemperatureZone.TROPICAL]: EBiome.TROPICAL_FOREST,
  },
  [EMoistureZone.WET]: {
    [ETemperatureZone.ARCTIC]: EBiome.TUNDRA,
    [ETemperatureZone.SUBARCTIC]: EBiome.BOREAL_FOREST,
    [ETemperatureZone.TEMPERATE]: EBiome.TEMPERATE_RAINFOREST,
    [ETemperatureZone.SUBTROPICAL]: EBiome.TEMPERATE_RAINFOREST,
    [ETemperatureZone.TROPICAL]: EBiome.TROPICAL_RAINFOREST,
  },
}

export enum EDirection {
  NONE,
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

export class Cell {
  world: World;
  x: number;
  y: number;
  height: number;
  terrainType: ETerrainType;
  flowDir: EDirection;
  drainageBasin?: DrainageBasin;
  temperature: number;
  upstreamCount: number;
  isLand: boolean;
  moisture: number;
  biome: EBiome;

  constructor(
    world: World,
    {
      x,
      y,
      terrainType,
      height,
      flowDir,
      temperature,
      upstreamCount,
      moisture,
      biome,
    }: {
      x: number,
      y: number,
      height: number,
      terrainType: ETerrainType,
      flowDir: EDirection,
      temperature: number,
      upstreamCount: number,
      moisture: number,
      biome: EBiome,
    }
  ) {
    this.world = world;
    this.x = x;
    this.y = y;
    this.height = height;
    this.terrainType = terrainType;
    this.isLand = terrainType !== ETerrainType.OCEAN && terrainType !== ETerrainType.COAST;
    this.flowDir = flowDir;
    this.temperature = temperature;
    this.upstreamCount = upstreamCount;
    this.moisture = moisture;
    this.biome = biome;
  }
}

export class DrainageBasin {
  id: number;
  color: number;
  cells: Cell[];

  constructor(id: number, color, cells: Cell[]) {
    this.id = id;
    this.color = color;
    this.cells = cells;
    for (const cell of cells) {
      cell.drainageBasin = this;
    }
  }
}

export default class World {
  grid: Cell[][];
  cells: Set<Cell>;
  size: {
    width: number;
    height: number;
  };
  sealevel: number;
  drainageBasins: DrainageBasin[];

  constructor(params: IWorldgenWorkerOutput) {
    this.grid = [];
    this.cells = new Set();
    this.size = params.options.size;
    this.sealevel = params.sealevel;
    const heightmap = ndarray(params.heightmap, [this.size.width, this.size.height]);
    const terrainTypes = ndarray(params.terrainTypes, [this.size.width, this.size.height]);
    const flowDirections = ndarray(params.flowDirections, [this.size.width, this.size.height]);
    const temperatures = ndarray(params.temperatures, [this.size.width, this.size.height]);
    const upstreamCells = ndarray(params.upstreamCells, [this.size.width, this.size.height]);
    const moistureMap = ndarray(params.moistureMap, [this.size.width, this.size.height]);
    const biomes = ndarray(params.biomes, [this.size.width, this.size.height]);
    for (let x = 0; x < this.size.width; x++) {
      this.grid[x] = [];
      for (let y = 0; y < this.size.height; y++) {
        const cell: Cell = new Cell(this, {
          x, y,
          height: heightmap.get(x, y),
          flowDir: flowDirections.get(x, y) as EDirection,
          terrainType: terrainTypes.get(x, y) as ETerrainType,
          temperature: temperatures.get(x, y),
          upstreamCount: upstreamCells.get(x, y),
          moisture: moistureMap.get(x, y),
          biome: biomes.get(x, y),
        });
        this.cells.add(cell);
        this.grid[x][y] = cell;
      }
    }
    this.drainageBasins = [];
    for (const [id, { color, cells }] of Object.entries(params.drainageBasins)) {
      this.drainageBasins.push(
        new DrainageBasin(parseInt(id, 10), color, cells.map(([x, y]) => this.grid[x][y])
      ));
    };
  }

  getCell(x: number, y: number): Cell | null {
    if (x < 0 || y < 0 || x >= this.size.width || y >= this.size.height) {
      return null;
    }
    return this.grid[x][y];
  }

}
