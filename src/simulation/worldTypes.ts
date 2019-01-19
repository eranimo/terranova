import {  } from './colors';
import World from './World';
import {PopulationClass,
        Forager} from './socialClasses.ts'


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

export enum ETemperatureZone {
  ARCTIC,
  SUBARCTIC,
  TEMPERATE,
  SUBTROPICAL,
  TROPICAL,
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

export enum ERiverType {
  NONE,
  RIVER,
}

export interface IWorldCell {
  world: World;
  x: number;
  y: number;
  height: number;
  type: ECellType;
  riverType: ERiverType;
  terrainType: ETerrainType;
  feature: ECellFeature;
  flowDir: EDirection;
  drainageBasin?: IDrainageBasin;
  temperature: number;
  upstreamCount: number;
  moisture: number;
  moistureZone: EMoistureZone;
  temperatureZone: ETemperatureZone;
  biome: EBiome;
  terrainRoughness: number;
  buildings: { [key:string]:number; };
  population: { [key:string]:PopulationClass; };
}

export interface IDrainageBasin {
  id: number;
  color: number;
  cells: IWorldCell[];
}


export enum EDirection8 {
  NONE,
  NORTH_WEST,
  NORTH,
  NORTH_EAST,
  WEST,
  EAST,
  SOUTH_WEST,
  SOUTH,
  SOUTH_EAST,
}

export const tileDirections = [
  EDirection8.NORTH,
  EDirection8.NORTH_EAST,
  EDirection8.EAST,
  EDirection8.SOUTH_EAST,
  EDirection8.SOUTH,
  EDirection8.SOUTH_WEST,
  EDirection8.WEST,
  EDirection8.NORTH_WEST,
]

export const tileDirectionWeights = [
  [EDirection8.NORTH_WEST, 1],
  [EDirection8.NORTH, 2],
  [EDirection8.NORTH_EAST, 4],
  [EDirection8.WEST, 8],
  [EDirection8.EAST, 16],
  [EDirection8.SOUTH_WEST, 32],
  [EDirection8.SOUTH, 64],
  [EDirection8.SOUTH_EAST, 128],
]

export const cellTileBase = 4;
export const cellFeatureTileIndex = {
  [ECellFeature.COASTAL]: 0,
  [ECellFeature.OCEANIC]: 1,
  [ECellFeature.LAND]: 2,
  [ECellFeature.LAKE]: 3,
}