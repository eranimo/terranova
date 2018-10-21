import ndarray from 'ndarray';
import { IWorldgenWorkerOutput } from './types';
import { mapValues } from 'lodash';
import ops from 'ndarray-ops';


export enum ECellType {
  OCEAN,
  LAND,
}

export enum ECellFeature {
  // OCEAN
  COASTAL,
  SHELF,
  OCEANIC,
  LAND,
  LAKE,
}

// LAND
export enum ETerrainType {
  NONE,
  PLAIN, // low altitude, flat terrain
  FOOTHILLS, // low altitude, high terrain
  PLATEAU, // high altitude, flat terrain
  HIGHLANDS, // high altitude, rough terrain
}

export const terrainTypeLabels = {
  [ETerrainType.NONE]: 'None',
  [ETerrainType.PLAIN]: 'Plain',
  [ETerrainType.FOOTHILLS]: 'Foothills',
  [ETerrainType.PLATEAU]: 'Plateau',
  [ETerrainType.HIGHLANDS]: 'Highlands',
}

export const cellFeatureLabels = {
  [ECellFeature.COASTAL]: 'Coastal',
  [ECellFeature.SHELF]: 'Shelf',
  [ECellFeature.OCEANIC]: 'Oceanic',
  [ECellFeature.LAND]: 'Land',
  [ECellFeature.LAKE]: 'Lake',
}

export enum EBiome {
  NONE,
  GLACIAL,
  TUNDRA,
  BOREAL_FOREST,
  SHRUBLAND,
  WOODLAND,
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

export const moistureZoneTitles = {
  [EMoistureZone.BARREN]: 'Barren',
  [EMoistureZone.ARID]: 'Arid',
  [EMoistureZone.SEMIARID]: 'Semiarid',
  [EMoistureZone.SEMIWET]: 'Semiwet',
  [EMoistureZone.WET]: 'Wet',
}

export enum ETemperatureZone {
  ARCTIC,
  SUBARCTIC,
  TEMPERATE,
  SUBTROPICAL,
  TROPICAL,
}

export const temperatureZoneTitles = {
  [ETemperatureZone.ARCTIC]: 'Arctic',
  [ETemperatureZone.SUBARCTIC]: 'Subarctic',
  [ETemperatureZone.TEMPERATE]: 'Temperate',
  [ETemperatureZone.SUBTROPICAL]: 'Subtropical',
  [ETemperatureZone.TROPICAL]: 'Tropical',
}

export const biomeTitles = {
  [EBiome.NONE]: 'None',
  [EBiome.GLACIAL]: 'Glacial',
  [EBiome.TUNDRA]: 'Tundra',
  [EBiome.BOREAL_FOREST]: 'Boreal Forest',
  [EBiome.SHRUBLAND]: 'Scrubland',
  [EBiome.WOODLAND]: 'Woodland',
  [EBiome.GRASSLAND]: 'Grassland',
  [EBiome.SAVANNA]: 'Savanna',
  [EBiome.DESERT]: 'Desert',
  [EBiome.TEMPERATE_FOREST]: 'Temperate Forest',
  [EBiome.TEMPERATE_RAINFOREST]: 'Temperate Rainforest',
  [EBiome.TROPICAL_FOREST]: 'Tropical Forest',
  [EBiome.TROPICAL_RAINFOREST]: 'Tropical Rainforest'
}

export const biomeLabelColors = {
  [EBiome.NONE]: 0x4783A0,
  [EBiome.GLACIAL]: 0xFFFFFF,
  [EBiome.TUNDRA]: 0x96D1C3,
  [EBiome.BOREAL_FOREST]: 0x006259,
  [EBiome.SHRUBLAND]: 0xB26A47,
  [EBiome.WOODLAND]: 0xB26A47,
  [EBiome.GRASSLAND]: 0xF6EB64,
  [EBiome.SAVANNA]: 0xC7C349,
  [EBiome.DESERT]: 0x8B4D32,
  [EBiome.TEMPERATE_FOREST]: 0x92D847,
  [EBiome.TEMPERATE_RAINFOREST]: 0x6B842A,
  [EBiome.TROPICAL_FOREST]: 0x097309,
  [EBiome.TROPICAL_RAINFOREST]: 0x005100
}

export const climateColors = {
  ocean: {
    deep: 0x3A52BB,
    coast: 0x4E6AE6,
  },
  biomes: {
    [EBiome.NONE]: 0x000000,
    [EBiome.GLACIAL]: 0xFFFFFF,
    [EBiome.TUNDRA]: {
      [ETerrainType.PLAIN]: 0x6e7c59,
      [ETerrainType.FOOTHILLS]: 0x75805B,
      [ETerrainType.PLATEAU]: 0x75805B,
      [ETerrainType.HIGHLANDS]: 0x75805B,
    },
    [EBiome.BOREAL_FOREST]: {
      [ETerrainType.PLAIN]: 0x42562F,
      [ETerrainType.FOOTHILLS]: 0x4d5b40,
      [ETerrainType.PLATEAU]: 0x42562F,
      [ETerrainType.HIGHLANDS]: 0x3f513a,
    },
    [EBiome.SHRUBLAND]: {
      [ETerrainType.PLAIN]: 0xD7CC9E,
      [ETerrainType.FOOTHILLS]: 0xd3c9a0,
      [ETerrainType.PLATEAU]: 0xD7CC9E,
      [ETerrainType.HIGHLANDS]: 0xc9c09b,
    },
    [EBiome.WOODLAND]: {
      [ETerrainType.PLAIN]: 0x9fb277,
      [ETerrainType.FOOTHILLS]: 0x92a075,
      [ETerrainType.PLATEAU]: 0x92a36e,
      [ETerrainType.HIGHLANDS]: 0x9ca883,
    },
    [EBiome.GRASSLAND]: {
      [ETerrainType.PLAIN]: 0x9fb981,
      [ETerrainType.FOOTHILLS]: 0xADB981,
      [ETerrainType.PLATEAU]: 0x9fb981,
      [ETerrainType.HIGHLANDS]: 0xa3ad8a,
    },
    [EBiome.SAVANNA]: {
      [ETerrainType.PLAIN]: 0xC9CD7C,
      [ETerrainType.FOOTHILLS]: 0xcbce8a,
      [ETerrainType.PLATEAU]: 0xC9CD7C,
      [ETerrainType.HIGHLANDS]: 0xbabc84,
    },
    [EBiome.DESERT]: {
      [ETerrainType.PLAIN]: 0xD9BF8C,
      [ETerrainType.FOOTHILLS]: 0xC4AC80,
      [ETerrainType.PLATEAU]: 0xB39B73,
      [ETerrainType.HIGHLANDS]: 0x917d5d,
    },
    [EBiome.TEMPERATE_FOREST]: {
      [ETerrainType.PLAIN]: 0x4d703a,
      [ETerrainType.FOOTHILLS]: 0x5d704c,
      [ETerrainType.PLATEAU]: 0x626E49,
      [ETerrainType.HIGHLANDS]: 0x5c6641,
    },
    [EBiome.TEMPERATE_RAINFOREST]: {
      [ETerrainType.PLAIN]: 0x425D27,
      [ETerrainType.FOOTHILLS]: 0x405927,
      [ETerrainType.PLATEAU]: 0x405927,
      [ETerrainType.HIGHLANDS]: 0x49593a,
    },
    [EBiome.TROPICAL_FOREST]: {
      [ETerrainType.PLAIN]: 0x4d703a,
      [ETerrainType.FOOTHILLS]: 0x5d704c,
      [ETerrainType.PLATEAU]: 0x626E49,
      [ETerrainType.HIGHLANDS]: 0x5c6641,
    },
    [EBiome.TROPICAL_RAINFOREST]: {
      [ETerrainType.PLAIN]: 0x426D18,
      [ETerrainType.FOOTHILLS]: 0x426D18,
      [ETerrainType.PLATEAU]: 0x3d6616,
      [ETerrainType.HIGHLANDS]: 0x3d6616,
    },
  },
}

export const moistureZoneRanges = {
  [EMoistureZone.BARREN]: { start: 0, end: 25 },
  [EMoistureZone.ARID]: { start: 25, end: 50 },
  [EMoistureZone.SEMIARID]: { start: 50, end: 100 },
  [EMoistureZone.SEMIWET]: { start: 100, end: 200 },
  [EMoistureZone.WET]: { start: 200, end: Infinity },
}

export const temperatureZoneRanges = {
  [ETemperatureZone.ARCTIC]: { start: -Infinity, end: -10 },
  [ETemperatureZone.SUBARCTIC]: { start: -10, end: 2 },
  [ETemperatureZone.TEMPERATE]: { start: 2, end: 15 },
  [ETemperatureZone.SUBTROPICAL]: { start: 15, end: 20 },
  [ETemperatureZone.TROPICAL]: { start: 20, end: Infinity },
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
    [ETemperatureZone.SUBTROPICAL]: EBiome.SAVANNA,
    [ETemperatureZone.TROPICAL]: EBiome.DESERT,
  },
  [EMoistureZone.SEMIARID]: {
    [ETemperatureZone.ARCTIC]: EBiome.GLACIAL,
    [ETemperatureZone.SUBARCTIC]: EBiome.BOREAL_FOREST,
    [ETemperatureZone.TEMPERATE]: EBiome.TEMPERATE_FOREST,
    [ETemperatureZone.SUBTROPICAL]: EBiome.WOODLAND,
    [ETemperatureZone.TROPICAL]: EBiome.SAVANNA,
  },
  [EMoistureZone.SEMIWET]: {
    [ETemperatureZone.ARCTIC]: EBiome.GLACIAL,
    [ETemperatureZone.SUBARCTIC]: EBiome.BOREAL_FOREST,
    [ETemperatureZone.TEMPERATE]: EBiome.TEMPERATE_FOREST,
    [ETemperatureZone.SUBTROPICAL]: EBiome.TEMPERATE_FOREST,
    [ETemperatureZone.TROPICAL]: EBiome.TROPICAL_FOREST,
  },
  [EMoistureZone.WET]: {
    [ETemperatureZone.ARCTIC]: EBiome.GLACIAL,
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

export const directionLabels = {
  [EDirection.NONE]: 'None',
  [EDirection.UP]: 'Up',
  [EDirection.DOWN]: 'Down',
  [EDirection.LEFT]: 'Left',
  [EDirection.RIGHT]: 'Right',
}

export enum ERiverType {
  NONE,
  RIVER,
}

export class Cell {
  world: World;
  x: number;
  y: number;
  height: number;
  type: ECellType;
  riverType: ERiverType;
  terrainType: ETerrainType;
  feature: ECellFeature;
  flowDir: EDirection;
  drainageBasin?: DrainageBasin;
  temperature: number;
  upstreamCount: number;
  isLand: boolean;
  moisture: number;
  moistureZone: EMoistureZone;
  temperatureZone: ETemperatureZone;
  biome: EBiome;
  terrainRoughness: number;

  constructor(
    world: World,
    {
      x,
      y,
      type,
      riverType,
      terrainType,
      feature,
      height,
      flowDir,
      temperature,
      upstreamCount,
      moisture,
      biome,
      moistureZone,
      temperatureZone,
      terrainRoughness,
    }: {
      x: number,
      y: number,
      height: number,
      type: ECellType,
      riverType: ERiverType,
      terrainType: ETerrainType,
      feature: ECellFeature,
      flowDir: EDirection,
      temperature: number,
      upstreamCount: number,
      moisture: number,
      biome: EBiome,
      moistureZone: EMoistureZone,
      temperatureZone: ETemperatureZone,
      terrainRoughness: number,
    }
  ) {
    this.world = world;
    this.x = x;
    this.y = y;
    this.height = height;
    this.type = type;
    this.riverType = riverType;
    this.terrainType = terrainType;
    this.feature = feature;
    this.isLand = type === ECellType.LAND;
    this.flowDir = flowDir;
    this.temperature = temperature;
    this.upstreamCount = upstreamCount;
    this.moisture = moisture;
    this.biome = biome;
    this.moistureZone = moistureZone;
    this.temperatureZone = temperatureZone;
    this.terrainRoughness = terrainRoughness;
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

interface IRange {
  min: number,
  max: number
}

interface IWorldStats {
  biomePercents: Record<any, number>;
  ranges: Record<string, IRange>;
}

function ndarrayRange(array: ndarray): IRange {
  return {
    min: ops.inf(array),
    max: ops.sup(array),
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
        const cell: Cell = new Cell(this, {
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

  getCell(x: number, y: number): Cell | null {
    if (x < 0 || y < 0 || x >= this.size.width || y >= this.size.height) {
      return null;
    }
    return this.grid[x][y];
  }

}
