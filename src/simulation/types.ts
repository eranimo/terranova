import ndarray from 'ndarray';
import { IFeature } from './worldTypes';


export interface IWorldMapGenOptions {
  seed: string | number,
  sealevel: number,
  size: {
    width: number,
    height: number,
  },
  worldShape: EWorldShape,
  worldShapePower: number,
  riverThreshold: number,
  temperature: {
    min: number,
    max: number,
  }
  elevationCoolingAmount: number,
  depressionFillPercent: number, // 0 to 1
}
/**
 * Terminology
 * Global Cell = one grid cell in world map
 * Region = a rectangle area of the world which is generated
 *          and contains local cells
 * Local Cell = one grid cell in game map
 *
 * Top left cell height of the local region map = height of top left cell of world map
 */
export interface IRegionGenInput {
  // coordinate of this region
  location: {
    x: number;
    y: number;
  };

  // one world cell equals this many local cells
  scale: number;

  // size of region in global cells
  regionSize: {
    width: number,
    height: number,
  };
}

export interface IRegionWorkerOutput {
  heightmap: ndarray.Data<number>;
}

export enum EWorldShape {
  FREEFORM = 'freeform',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
}

export interface IWorldWorkerOutput {
  buildVersion: string;
  options: IWorldMapGenOptions,
  sealevel: number,
  heightmap: ndarray.Data<number>,
  riverMap: ndarray.Data<number>,
  terrainMap: ndarray.Data<number>,
  flowDirections: ndarray.Data<number>,
  cellTypes: ndarray.Data<number>,
  cellFeatures: ndarray.Data<number>,
  drainageBasins: {
    [id: number]: {
      color: number,
      cells: [number, number][],
    }
  },
  upstreamCells: ndarray.Data<number>;
  temperatures: ndarray.Data<number>;
  moistureMap: ndarray.Data<number>;
  moistureZones: ndarray.Data<number>;
  temperatureZones: ndarray.Data<number>;
  biomes: ndarray.Data<number>;
  terrainRoughness: ndarray.Data<number>;
  landforms: IFeature[];
}

export interface ITerrainWorkerOutput {
  heightmap: ndarray.Data<number>;
}
