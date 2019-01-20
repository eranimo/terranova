import {
  IWorldCell,
  IDrainageBasin,
  EDirection,
  ECellType,
  ERiverType,
  ETerrainType,
  ECellFeature,
  EBiome,
  EDirection8,
  tileDirectionWeights,
} from './worldTypes';
import {
  PopulationClass
} from './socialClasses'
export interface IGameCellDelta {
  buildingDeltas: { [key:string]: number; },
  populationDeltas: { [key:string]: PopulationClass; }
}
export interface IGameCell {
  worldCell: IWorldCell,
  buildings: { [key:string]: number; },
  population: { [key:string]: PopulationClass; },
  food: number,
  housing: number
}