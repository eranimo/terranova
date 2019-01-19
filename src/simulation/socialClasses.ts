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

// Monthly growth rate
const growthFactor:number = .00003;
// const housingProducedFactor:number = 1;
// const housingRequiredFactor:number = 1;

// Monthly survivalRate
const adultSurvivalRate:number = .999997;
const childSurvivalRate:number = .998;


export abstract class PopulationClass {
  constructor (
    malePopulation: number,
    femalePopulation: number,
    maleChildren: number,
    femaleChildren: number,
    // housingRequiredMultiplier: number,
    // housingMaintenanceMultiplier: number,
    carryingCapcityMultiplier: number,
    growthMultiplier: number,
    // farmMaintenanceModifier: number,
    ageOfMajority: number
    ) {
  }
  abstract labor(world: World): WorldDelta;
  agePopulation(): void {
    this.malePopulation *= adultSurvivalRate;
    this.femalePopulation *= adultSurvivalRate;
    this.maleChildren *= childSurvivalRate;
    this.femaleChildren *= childSurvivalRate;
    const divisor:number = 12 * this.ageOfMajority;
    this.malePopulation += this.maleChildren / divisor;
    this.femalePopulation += this.femaleChildren / divisor;
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