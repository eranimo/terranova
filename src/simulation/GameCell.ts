import { IWorldCell } from "./worldTypes";
import { ObservableSet } from "./ObservableSet";
import { Subject } from "rxjs";
import { EBiome } from './worldTypes'
import { enumMembers } from "../utils/enums";

export const carryingCapacities: Record<EBiome, number> = {
  [EBiome.NONE]: 0,
  [EBiome.GLACIAL]: 10,
  [EBiome.TUNDRA]: 50,
  [EBiome.BOREAL_FOREST]: 1000,
  [EBiome.SHRUBLAND]: 50,
  [EBiome.WOODLAND]: 500,
  [EBiome.GRASSLAND]: 100,
  [EBiome.SAVANNA]: 100,
  [EBiome.DESERT]: 10,
  [EBiome.TEMPERATE_FOREST]: 1000,
  [EBiome.TEMPERATE_RAINFOREST]: 1000,
  [EBiome.TROPICAL_FOREST]: 5000,
  [EBiome.TROPICAL_RAINFOREST]: 5000
}

export const farmEfficiencies: Record<EBiome, number> = {
  [EBiome.NONE]: 0,
  [EBiome.GLACIAL]: 0,
  [EBiome.TUNDRA]: 0,
  [EBiome.BOREAL_FOREST]: .5,
  [EBiome.SHRUBLAND]: .25,
  [EBiome.WOODLAND]: .5,
  [EBiome.GRASSLAND]: .25,
  [EBiome.SAVANNA]: .5,
  [EBiome.DESERT]: 0,
  [EBiome.TEMPERATE_FOREST]: 1,
  [EBiome.TEMPERATE_RAINFOREST]: 1.5,
  [EBiome.TROPICAL_FOREST]: 2,
  [EBiome.TROPICAL_RAINFOREST]: 3
}

export const developmentRates: Record<EBiome, number> = {
  [EBiome.NONE]: 0,
  [EBiome.GLACIAL]: 0,
  [EBiome.TUNDRA]: 0,
  [EBiome.BOREAL_FOREST]: .75,
  [EBiome.SHRUBLAND]: 1,
  [EBiome.WOODLAND]: 1,
  [EBiome.GRASSLAND]: 1,
  [EBiome.SAVANNA]: 1,
  [EBiome.DESERT]: 0,
  [EBiome.TEMPERATE_FOREST]: .75,
  [EBiome.TEMPERATE_RAINFOREST]: .75,
  [EBiome.TROPICAL_FOREST]: .5,
  [EBiome.TROPICAL_RAINFOREST]: .25
}

const maintenanceFactor: number = 1;

export enum EPopClass {
  FORAGER,
  FARMER,
  ARTISAN,
  NOBLE,
}

export const promotionRate: Record<EPopClass, number> ={
  [EPopClass.NOBLE]: 1,
  [EPopClass.ARTISAN]: 1,
  [EPopClass.FARMER]: .1,
  [EPopClass.FORAGER]: .1
}

export const growthRates: Record<EPopClass, number> =  {
  [EPopClass.NOBLE]: 1/70,
  [EPopClass.ARTISAN]: -1/1000,
  [EPopClass.FARMER]: 1/70,
  [EPopClass.FORAGER]: 1/120
}

const populationPriorities = [EPopClass.NOBLE, EPopClass.FARMER, EPopClass.ARTISAN, EPopClass.FORAGER];
const promotionPriority = populationPriorities.reverse();

interface IClassAttributes {
  title: string,
  labor: (population: number, gameCell: GameCell) => IGameCellDelta
  housingReq: number
}

export const popClassAttributes: Record<EPopClass, IClassAttributes> = {
  [EPopClass.FORAGER]: {
    title: 'Forager',
    labor: (population: number, gameCell: GameCell) : IGameCellDelta => {
      const biome = gameCell.worldCell.biome;
      const developmentRate: number = developmentRates[biome];
      let food = Math.floor(Math.min(Math.floor(population) * 1.1, gameCell.carryingCapacity));
      let maxFarms = new Map<EBuildingType, number>([[
        EBuildingType.FARM,
        population * .1 * developmentRate
      ]]);
      let maxPops = newPopsMap();
      maxPops.set(EPopClass.FORAGER, food);
      return {
        maxBuildings: maxFarms,
        maxHousing: Math.floor(population) * 1.1 ,
        foodProduced: food,
        maxPeople: maxPops
      };
    },
    housingReq: 1
  },
  [EPopClass.FARMER]: {
    title: 'Farmer',
    labor: (population: number, gameCell: GameCell) : IGameCellDelta => {
      const biome = gameCell.worldCell.biome;
      const developmentRate: number = developmentRates[biome];
      const farmerFactor = 100;
      const farmerProductionFactor = 5;
      let food = Math.min(
          Math.floor(population),
          gameCell.buildingByType[EBuildingType.FARM]
        ) * 
        farmerProductionFactor * farmEfficiencies[biome];
      const maxBuildings = new Map<EBuildingType, number>([
        [
          EBuildingType.FARM,
          Math.min(population, gameCell.carryingCapacity * farmerFactor) * farmerProductionFactor * developmentRate
        ],
        [
          EBuildingType.WORKSHOP,
          .01 * developmentRate * food
        ]
      ]);
      let maxPops = newPopsMap();
      maxPops.set(EPopClass.FARMER, Math.max(food, gameCell.buildingByType[EBuildingType.FARM]));
      return {
        maxBuildings: maxBuildings,
        maxHousing: Math.floor(population) * 1.3 * developmentRate,
        foodProduced: food,
        maxPeople: maxPops
      };
    },
    housingReq: 1.1
  },
  [EPopClass.ARTISAN]: {
    title: 'Artisan',
    labor: (population: number, gameCell: GameCell) : IGameCellDelta => {
      const biome = gameCell.worldCell.biome;
      const developmentRate: number = developmentRates[biome];
      const workshopRatio = .01;
      const maxWorkshops = new Map<EBuildingType, number>([[
        EBuildingType.WORKSHOP,
        population * workshopRatio * developmentRate
      ]]);
      let maxPops = newPopsMap();
      maxPops.set(EPopClass.NOBLE, Math.floor(population / 100));
      return {
        maxBuildings: maxWorkshops,
        maxHousing: Math.floor(population) * 5 * developmentRate,
        foodProduced: 0,
        maxPeople: maxPops
      };
    },
    housingReq: 2
  },
  [EPopClass.NOBLE]: {
    title: 'Noble',
    labor: (population: number, gameCell: GameCell) : IGameCellDelta => {
      let maxPops = newPopsMap();
      // maxPops.set(EPopClass.NOBLE, Math.floor(population * .75));
      return {
        maxBuildings: new Map<EBuildingType, number>(),
        maxHousing: 0,
        foodProduced: 0,
        maxPeople: maxPops
      };
    },
    housingReq: 5
  },
}

const newPopsMap = () : Map<EPopClass, number> => {
  let maxPops = new Map<EPopClass, number>()
  for (const populationType of enumMembers(EPopClass)) {
    maxPops.set(
      populationType as EPopClass,
      0
    );
  }
  return maxPops;
}

enum EBuildingType {
  FARM,
  WORKSHOP,
}

interface IBuildingAttributes {
  title: string
}

export const buildingAttributes: Record<EBuildingType, IBuildingAttributes> = {
  [EBuildingType.FARM]: {
    title: 'Farm',
  },
  [EBuildingType.WORKSHOP]: {
    title: 'Workshop',
  },
}

export class Pop {
  readonly class: EPopClass;
  private population: number;
  readonly growthRate: number; // per Month
  popGrowth$: Subject<number>;

  constructor(popClass: EPopClass, population: number) {
    this.class = popClass;
    this.growthRate = growthRates[popClass];
    this.population = population;
    this.popGrowth$ = new Subject();
  }

  public emigrate(maxToRemove: number, targetPop: Pop): number {
    let ret = Math.min(maxToRemove, this.population);
    this.population -= ret;
    this.popGrowth$.next(this.population);
    targetPop.immigrate(ret);
    return ret;
  }

  private immigrate(addPop: number): void {
    this.population += addPop;
    this.popGrowth$.next(this.population);
  }

  private updatePopulation(maxPop: number) {
    this.population = Math.min(this.population * (1 + this.growthRate), maxPop);
    this.popGrowth$.next(this.population);
  }

  get totalPopulation: number {
    return this.population;
  }

  update(maxPop: number): number {
    this.updatePopulation(maxPop);
    return this.population;
  }
}

export interface IPopView {
  population: number,
  socialClass: EPopClass
}

export interface IPopCoordinates {
  population: number,
  socialClass: EPopClass,
  popGrowth$: Subject<number>,
  xCoord: number,
  yCoord: number
}

export interface PopulationClassDelta {
  populationChange: number
}

export interface IGameCellDelta {
  maxBuildings: Map<EBuildingType, number>,
  maxHousing: number,
  foodProduced: number,
  maxPeople: Map<EPopClass, number>
}
const promoteFrom: Record<EPopClass, Array<EPopClass>> = {
  [EPopClass.NOBLE]: [EPopClass.ARTISAN],
  [EPopClass.ARTISAN]: [EPopClass.FARMER],
  [EPopClass.FARMER]: [EPopClass.FORAGER],
  [EPopClass.FORAGER]: []
}

const demotionPath: Record<EPopClass, EPopClass | null> = {
  [EPopClass.NOBLE]: EPopClass.FARMER,
  [EPopClass.ARTISAN]: EPopClass.FARMER,
  [EPopClass.FARMER]: EPopClass.FORAGER,
  [EPopClass.FORAGER]: null
}

const requiredBuilding: Record<EBuildingType, EPopClass | null> = {
  [EBuildingType.FARM]: EPopClass.FARMER,
  [EBuildingType.WORKSHOP]: EPopClass.ARTISAN
};

export interface IGameCellView {
  pops: Set<IPopView>,
  buildingByType: Record<EBuildingType, number>,
  xCoord: number,
  yCoord: number
}

export interface IGameMigration {
  socialClass: EPopClass,
  populationPressure: number,
  totalPopulation: number,
  x: number,
  y: number
}

export default class GameCell {
  pops: ObservableSet<Pop>;
  popsByClass: Map<EPopClass, ObservableSet<Pop>>;
  newPop$: Subject<Pop>;
  buildingByType: Record<EBuildingType, number>;
  housing: number;
  // food: number;
  readonly carryingCapacity: number;

  constructor(
    readonly worldCell: IWorldCell,
  ) {
    this.newPop$ = new Subject();
    this.pops = new ObservableSet();
    this.popsByClass = new Map();
    const biome = this.worldCell.biome;
    const developmentRate: number = developmentRates[biome];
    this.buildingByType = {
      [EBuildingType.FARM]: carryingCapacities[this.worldCell.biome] * .1,
      [EBuildingType.WORKSHOP]: 0
    };
    for (const item of enumMembers(EPopClass)) {
      this.popsByClass.set(item as EPopClass, new ObservableSet())
    }
    this.housing = Math.floor(carryingCapacities[this.worldCell.biome]/10);
    // this.food = 0;
    this.carryingCapacity = carryingCapacities[worldCell.biome];
  }

  addPop(popClass: EPopClass, population: number) {
    let pop = new Pop(popClass, population)
    this.pops.add(pop);
    this.popsByClass.get(pop.class).add(pop);
    this.newPop$.next(pop);
    return pop;
  }

  removePops(popsToRemove: Array<Pop>) {
      for(const pop of popsToRemove) {
        this.pops.remove(pop);
        this.popsByClass.get(pop.class).remove(pop);
      }
  }

  getNextPop(socialClass: EPopClass): Pop {
    for (const pop of this.popsByClass.get(socialClass)) {
      if(pop.totalPopulation > 0)
      {
        return pop; 
      }
    }
    return this.addPop(socialClass, 0);
  }

  getSocialPopulation(socialClass: EPopClass): number {
    let ret = 0;
    for (const pop of this.popsByClass.get(socialClass)) {
      ret += pop.totalPopulation;
    }
    return ret;
  }

  getTotalPopulation(): number {
    let ret = 0;
    for (const pop of this.pops) {
      ret += pop.totalPopulation;
    }
    return ret;
  }

  update(): [IGameMigration, IGameMigration] {
    const deltas = new Array<IGameCellDelta>();
    const migrationPossibilites: Map<EPopClass, number> = newPopsMap();
    if (this.pops.size > 0) {
      // console.log(this.worldCell.x, this.worldCell.y);
      for (const pop of this.pops) {
        // console.log(pop);
        deltas.push(popClassAttributes[pop.class].labor(pop.totalPopulation, this));
      }
      const delta = deltas.reduce((previous: IGameCellDelta, next: IGameCellDelta) : IGameCellDelta => {
        let buildingDeltas = new Map<EBuildingType, number>();
  
        for (const buildingType of enumMembers(EBuildingType)) {
          buildingDeltas.set(
            buildingType as EBuildingType,
            (
              (previous.maxBuildings.get(buildingType as EBuildingType) || 0) +
              (next.maxBuildings.get(buildingType as EBuildingType) || 0)
            )
          );
        }
        let maxPops = new Map<EPopClass, number>();
  
        for (const populationType of enumMembers(EPopClass)) {
          maxPops.set(
            populationType as EPopClass,
            (
              previous.maxPeople.get(populationType as EPopClass) +
              next.maxPeople.get(populationType as EPopClass)
            )
          );
        }
  
        return {
          maxBuildings: buildingDeltas,
          maxHousing: (previous.maxHousing + next.maxHousing),
          foodProduced: (previous.foodProduced + next.foodProduced),
          maxPeople: maxPops
        };
      });
  
      for (const buildingType of delta.maxBuildings.keys()) {
        const currBuildings = this.buildingByType[buildingType];
        let buildingDelta = ((delta.maxBuildings.get(buildingType) - currBuildings) / maintenanceFactor);
        this.buildingByType[buildingType] = currBuildings + buildingDelta;
        const maxPeople = delta.maxPeople;
        if (maxPeople.has(requiredBuilding[buildingType])) {\
          maxPeople.set(
            requiredBuilding[buildingType],
            Math.max(this.buildingByType[buildingType], maxPeople.get(requiredBuilding[buildingType]))
          );
        }
      }
      this.housing += Math.floor((delta.maxHousing - this.housing) / maintenanceFactor);
      let food: number = delta.foodProduced;
      // console.log(food);
      let housingLimit: number = this.housing;
      const promotions: Map<EPopClass, number> = new Map();
      for (const popType of populationPriorities) {
        let popLimit = delta.maxPeople.get(popType);
        let popsToRemove = new Array<Pop>();
        let totalInClass = 0;
        for(const pop of this.popsByClass.get(popType)) {
          let newPopulation = pop.update(Math.min(popLimit, food));
          popLimit = Math.max(popLimit - newPopulation, 0);
          food = Math.max(food - newPopulation, 0);
          if (newPopulation <= 0) {
            popsToRemove.push(pop);
          }
        }
        this.removePops(popsToRemove);
        if (popLimit > 0) {
          promotions.set(popType, popLimit * Math.random());
        }
      }
      for (const popType of promotionPriority) {
        if (promotions.get(popType) > 0) {
          let popsToRemove = new Array<Pop>();
          let populationToAdd = 0;
          let maxNewPopulation = promotions.get(popType);
          let destPop: Pop = this.getNextPop(popType);
          for(const sourceType of promoteFrom[popType]) {
            for(const sourcePop of this.popsByClass.get(sourceType)) {
              if (maxNewPopulation > 0) {
                let popsFromSource = sourcePop.emigrate(Math.floor(maxNewPopulation * promotionRate[sourceType]), destPop);
                maxNewPopulation -= popsFromSource;
                if (sourcePop.totalPopulation <= 0) {
                  popsToRemove.push(sourcePop);
                }
              }
            }
            this.removePops(popsToRemove);
          }
          migrationPossibilites.set(popType, maxNewPopulation);
        }
      }
    }
    const migrationOptions: Array<IGameMigration> = new Array();
    for (const entry of migrationPossibilites.entries()) {
      migrationOptions.push({socialClass: entry[0], populationPressure: entry[1], totalPopulation: this.getSocialPopulation(entry[0]), x: this.worldCell.x, y: this.worldCell.y });
    }
    migrationOptions.sort((a, b) => a.populationPressure - b.populationPressure);
    // console.log({
    //   'Foragers': this.getSocialPopulation(EPopClass.FORAGER),
    //   'Famers': this.getSocialPopulation(EPopClass.FARMER),
    //   'Artisan': this.getSocialPopulation(EPopClass.ARTISAN),
    //   'Nobles': this.getSocialPopulation(EPopClass.NOBLE),
    // });
    return [migrationOptions[0], migrationOptions[migrationOptions.length - 1]];
  }
}
