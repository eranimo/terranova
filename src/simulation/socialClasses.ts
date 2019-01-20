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
  Game
} from './game';
import {
  IGameCellDelta
} from './'
// Monthly growth rate
const growthFactor: number = .00083;
const maleRatio = .535;
const femaleRatio = .465;
// const housingProducedFactor:number = 1;
// const housingRequiredFactor:number = 1;
// Monthly survivalRate
// const adultSurvivalRate:number = .999997;
// const childSurvivalRate:number = .998;

export abstract class PopulationClass {
  malePopulation: number;
  femalePopulation: number;
  maleChildren: number;
  femaleChildren: number;
  protected carryingCapcityMultiplier: number;
  protected growthMultiplier: number;
  protected ageOfMajority: number;
  protected adultSurvivalRate: number;
  protected childSurvivalRate: number;
  protected emancipationDivisor: number;
  protected malePopulationGrowthFactor: number;
  protected femalePopulationGrowthFactor: number;
  constructor (
    malePopulationP: number,
    femalePopulationP: number,
    maleChildrenP: number,
    femaleChildrenP: number,
    // housingRequiredMultiplier: number,
    // housingMaintenanceMultiplier: number,
    carryingCapcityMultiplierP: number,
    growthMultiplierP: number,
    // farmMaintenanceModifier: number,
    ageOfMajorityP: number,
    adultSurvivalRateP: number,
    childSurvivalRateP: number
    ) {
    this.malePopulation = malePopulationP;
    this.femalePopulation = femalePopulationP;
    this.maleChildren = maleChildrenP;
    this.femaleChildren = femaleChildrenP;
    this.carryingCapcityMultiplier = carryingCapcityMultiplierP;
    this.growthMultiplier = growthMultiplierP;
    this.ageOfMajority = ageOfMajorityP;
    this.adultSurvivalRate = adultSurvivalRateP;
    this.childSurvivalRate = childSurvivalRateP;
    this.emancipationDivisor = 12 * this.ageOfMajority;
    this.malePopulationGrowthFactor = maleRatio * this.growthMultiplier * this.growthFactor;
    this.femalePopulationGrowthFactor = maleRatio * this.growthMultiplier * this.growthFactor;
  }
  abstract labor(Game: Game): IGameCellDeltas[];
  agePopulation(): void {
    this.malePopulation *= this.adultSurvivalRate;
    this.femalePopulation *= this.adultSurvivalRate;
    this.maleChildren *= this.childSurvivalRate;
    this.femaleChildren *= this.childSurvivalRate;
    this.malePopulation += this.maleChildren / this.emancipationDivisor;
    this.femalePopulation += this.femaleChildren / this.emancipationDivisor;
    const totalPopulation = (this.malePopulation + this.femalePopulation);
    this.maleChildren += this.totalPopulation * this.malePopulationGrowthFactor;
    this.femaleChildren += this.totalPopulation * this.femalePopulationGrowthFactor;
  }
}

// export class  extends PopulationClass {
//     constructor(malePopulation: number, femalePopulation: number){
//         super(
//             malePopulation,
//             femalePopulation,
//             malePopulation,
//             femalePopulation,
//             // 1,
//             // 1,
//             1,
//             1,
//             // 1,
//             15
//         );
//     }
    // labor(world: World, xCoord: number, yCoord: number): WorldDelta {
    //     this.malePopulation += this.male
    // }
// }