import { IWorldCell } from "./worldTypes";
import { ObservableSet } from "./ObservableSet";
import { Subject } from "rxjs";
import { EBiome } from './worldTypes'
import { enumMembers } from "../utils/enums";

const carryingCapacities: Record<EBiome, number> = {
  [EBiome.NONE]: 0,
  [EBiome.GLACIAL]: 10,
  [EBiome.TUNDRA]: 50,
  [EBiome.BOREAL_FOREST]: 10000,
  [EBiome.SHRUBLAND]: 500,
  [EBiome.WOODLAND]: 5000,
  [EBiome.GRASSLAND]: 1000,
  [EBiome.SAVANNA]: 500,
  [EBiome.DESERT]: 100,
  [EBiome.TEMPERATE_FOREST]: 10000,
  [EBiome.TEMPERATE_RAINFOREST]: 10000,
  [EBiome.TROPICAL_FOREST]: 50000,
  [EBiome.TROPICAL_RAINFOREST]: 50000
}

const maintenanceFactor: number = 10;

export enum EPopClass {
  FORAGER,
  FARMER,
  NOBLE,
}

export const growthRates: Record<EPopClass, number> =  {
  [EPopClass.NOBLE]: 1/1000,
  [EPopClass.FARMER]: 1/1300,
  [EPopClass.FORAGER]: 0
}

const populationPriorities = [EPopClass.NOBLE, EPopClass.FARMER, EPopClass.FORAGER];
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
      let food = Math.floor(Math.min(Math.floor(population) * 1.1, gameCell.carryingCapacity));
      let maxFarms = new Map<EBuildingType, number>([[EBuildingType.FARM, population * .1]]);
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
      const farmerFactor = 1.2;
      const farmerProductionFactor = 1.1;
      let food = Math.min(Math.floor(population), gameCell.buildingByType[EBuildingType.FARM]) * farmerProductionFactor;
      const maxFarms = new Map<EBuildingType, number>([[
        EBuildingType.FARM,
        Math.min(population, gameCell.carryingCapacity * farmerFactor) * farmerProductionFactor
      ]]);
      let maxPops = newPopsMap();
      maxPops.set(EPopClass.FARMER, Math.max(food, gameCell.buildingByType[EBuildingType.FARM]));
      maxPops.set(EPopClass.NOBLE, Math.floor(population / 100));
      return {
        maxBuildings: maxFarms,
        maxHousing: Math.floor(population) * 1.3,
        foodProduced: food,
        maxPeople: maxPops
      };
    },
    housingReq: 1.1
  },
  [EPopClass.NOBLE]: {
    title: 'Noble',
    labor: (population: number, gameCell: GameCell) : IGameCellDelta => {
      let maxPops = newPopsMap();
      maxPops.set(EPopClass.NOBLE, Math.floor(population * .75));
      return {
        maxBuildings: new Map<EBuildingType, number>(),
        maxHousing: 0,
        foodProduced: 0,
        maxPeople: maxPops
      };
    },
    housingReq: 2
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
}

interface IBuildingAttributes {
  title: string
}

export const buildingAttributes: Record<EBuildingType, IBuildingAttributes> = {
  [EBuildingType.FARM]: {
    title: 'Farm',
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
  [EPopClass.NOBLE]: [EPopClass.FARMER],
  [EPopClass.FARMER]: [EPopClass.FORAGER],
  [EPopClass.FORAGER]: []
}

const demotionPath: Record<EPopClass, EPopClass | null> = {
  [EPopClass.NOBLE]: EPopClass.FARMER,
  [EPopClass.FARMER]: EPopClass.FORAGER,
  [EPopClass.FORAGER]: null
}

const requiredBuilding: Record<EBuildingType, EPopClass | null> = {
  [EBuildingType.FARM]: EPopClass.FARMER
};

export interface IGameCellView {
  pops: Set<IPopView>,
  buildingByType: Record<EBuildingType, number>,
  xCoord: number,
  yCoord: number
}

export default class GameCell {
  pops: ObservableSet<Pop>;
  popsByClass: Map<EPopClass, ObservableSet<Pop>>;
  newPop$: Subject<Pop>;
  buildingByType: Record<EBuildingType, number>;
  housing: number;
  food: number;
  readonly carryingCapacity: number;

  constructor(
    readonly worldCell: IWorldCell,
  ) {
    this.newPop$ = new Subject();
    this.pops = new ObservableSet();
    this.popsByClass = new Map();
    this.buildingByType = {
      [EBuildingType.FARM]: 0
    };
    for (const item of enumMembers(EPopClass)) {
      this.popsByClass.set(item as EPopClass, new ObservableSet())
    }
    this.housing = 0;
    this.food = 0;
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

  // ran every tick
  update() {
    const deltas = new Array<IGameCellDelta>();
    for (const pop of this.pops) {
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

    console.log(delta.maxPeople);
    for (const buildingType of delta.maxBuildings.keys()) {
      const currBuildings = this.buildingByType[buildingType];
      let buildingDelta = Math.floor((delta.maxBuildings.get(buildingType) - currBuildings) / maintenanceFactor);
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
        promotions.set(popType, Math.floor(popLimit * Math.random()));
      }
    }
    for (const popType of promotionPriority) {
      if (promotions.get(popType) > 0) {
        let popsToRemove = new Array<Pop>();
        let populationToAdd = 0;
        let maxNewPopulation = promotions.get(popType);
        let destPop: Pop;
        if (this.popsByClass.get(popType).size < 1) {
          destPop = this.addPop(popType, populationToAdd);
        } else {
          for (const pop of this.popsByClass.get(popType)) {
            destPop = pop;
            break;
          }
        }
        for(const sourceType of promoteFrom[popType]) {
          for(const sourcePop of this.popsByClass.get(sourceType)) {
            if (maxNewPopulation > 0) {
              let popsFromSource = sourcePop.emigrate(maxNewPopulation, destPop);
              maxNewPopulation -= popsFromSource;
              if (sourcePop.totalPopulation <= 0) {
                popsToRemove.push(sourcePop);
              }
            }
          }
          this.removePops(popsToRemove);
        }
      }
    }
  }
}
