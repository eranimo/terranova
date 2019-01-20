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
const maleRatio: number = .535;
const femaleRatio: number = .465;
// const housingProducedFactor:number = 1;
// const housingRequiredFactor:number = 1;
// Monthly survivalRate
const adultSurvivalRate: number = .999997;
// const childSurvivalRate:number = .998;

export abstract class PopulationClass {
  population: number;
  // malePopulation: number;
  // femalePopulation: number;
  // maleChildren: number;
  // femaleChildren: number;
  protected carryingCapcityMultiplier: number;
  protected growthMultiplier: number;
  // protected ageOfMajority: number;
  protected adultSurvivalRate: number;
  // protected childSurvivalRate: number;
  // protected emancipationDivisor: number;
  // protected malePopulationGrowthFactor: number;
  // protected femalePopulationGrowthFactor: number;
  constructor (
    populationP: number,
    // malePopulationP: number,
    // femalePopulationP: number,
    // maleChildrenP: number,
    // femaleChildrenP: number,
    // housingRequiredMultiplier: number,
    // housingMaintenanceMultiplier: number,
    carryingCapcityMultiplierP: number,
    growthMultiplierP: number,
    // farmMaintenanceModifier: number,
    // ageOfMajorityP: number,
    adultSurvivalRateP: number,
    // childSurvivalRateP: number
    ) {
    this.population = populationP;
    // this.malePopulation = malePopulationP;
    // this.femalePopulation = femalePopulationP;
    // this.maleChildren = maleChildrenP;
    // this.femaleChildren = femaleChildrenP;
    this.carryingCapcityMultiplier = carryingCapcityMultiplierP;
    this.growthMultiplier = growthMultiplierP * growthFactor;
    // this.ageOfMajority = ageOfMajorityP;
    this.adultSurvivalRate = adultSurvivalRateP;
    // this.childSurvivalRate = childSurvivalRateP;
    // this.emancipationDivisor = 12 * this.ageOfMajority;
    // this.malePopulationGrowthFactor = maleRatio * this.growthMultiplier * growthFactor;
    // this.femalePopulationGrowthFactor = maleRatio * this.growthMultiplier * growthFactor;
  }
  abstract labor(Game: Game, xCoord: number, yCoord: number): {[key:string]: IGameCellDelta;} | null;
  // totalAdultPopulation(): number {
  //   return this.malePopulation + this.femalePopulation;
  // }
  // totalChildrenPopulation(): number {
  //   return this.maleChildren + this.femaleChildren;
  // }
  // totalPopulation(): number {
  //   return this.totalAdultPopulation() + this.totalChildrenPopulation();
  // }
  agePopulation(): void {
    // this.malePopulation *= this.adultSurvivalRate;
    // this.femalePopulation *= this.adultSurvivalRate;
    // this.maleChildren *= this.childSurvivalRate;
    // this.femaleChildren *= this.childSurvivalRate;
    // this.malePopulation += this.maleChildren / this.emancipationDivisor;
    // this.femalePopulation += this.femaleChildren / this.emancipationDivisor;
    // const totalAdultPopulationV = this.totalAdultPopulation();
    // this.maleChildren += totalAdultPopulationV * this.malePopulationGrowthFactor;
    // this.femaleChildren += totalAdultPopulationV * this.femalePopulationGrowthFactor;
    var populationDelta: number = 0;
    populationDelta += this.population * this.growthMultiplier;
    populationDelta -= this.population * this.adultSurvivalRate;
  }
}

export class Forager extends PopulationClass {
  constructor(
    population: number,
    // malePopulation: number,
    // femalePopulation: number
    ){
      super(
        population,
        // malePopulation,
        // femalePopulation,
        // 0,
        // 0,
        // 1,
        // 1,
        1,
        1,
        // 1,
        // 15,
        // 1,
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