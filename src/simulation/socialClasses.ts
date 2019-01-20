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
import Game from './Game';
import {
  IGameCellDelta
} from './gameCells'
// Monthly growth rate
const growthFactor: number = .00083;
// Monthly survivalRate
const adultSurvivalRate: number = .999997;

export abstract class PopulationClass {
  population: number;
  protected carryingCapcityMultiplier: number;
  protected growthMultiplier: number;
  protected adultSurvivalRate: number;
  constructor (
    populationP: number,
    carryingCapcityMultiplierP: number,
    growthMultiplierP: number,
    adultSurvivalRateP: number,
    ) {
    this.population = populationP;
    this.carryingCapcityMultiplier = carryingCapcityMultiplierP;
    this.growthMultiplier = growthMultiplierP * growthFactor;
    this.adultSurvivalRate = adultSurvivalRateP;
  }
  abstract labor(Game: Game, xCoord: number, yCoord: number): {[key:string]: IGameCellDelta;} | null;
  agePopulation(): void {
    var populationDelta: number = 0;
    populationDelta += this.population * this.growthMultiplier;
    populationDelta -= this.population * this.adultSurvivalRate;
  }
}

export class Forager extends PopulationClass {
  constructor(
    population: number,
    ){
      super(
        population,
        1,
        1,
        adultSurvivalRate
      );
  }
  labor(Game: Game, xCoord: number, yCoord: number): {[key:string]: IGameCellDelta;} | null {
      return null;
      // { 
      //   (xCoord.toString() + ',' + yCoord.toString()):{
      //     buildingDeltas: { 'farms': this.male},
      //     populationDeltas: { }}
      // };
  }
}
export interface PopulationClassDelta {
  populationChange: number
}