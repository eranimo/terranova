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
  PopulationClass,
  PopulationClassDelta
} from './socialClasses'
export interface IGameCellDelta {
  buildingDeltas: { [key:string]: number; },
  populationDeltas: { [key:string]: PopulationClassDelta; },
  housing: number
}
export interface IGameCell {
  worldCell: IWorldCell,
  buildings: { [key:string]: number; },
  population: { [key:string]: PopulationClass; },
  food: number,
  housing: number
}