import { IWorldCell } from "./worldTypes";
import { ObservableSet } from "./ObservableSet";
import { Subject, ReplaySubject, BehaviorSubject } from "rxjs";
import { EBiome } from './worldTypes'
import { enumMembers } from "../utils/enums";

export const timeFactor = 1;

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
  [EBiome.GRASSLAND]: .5,
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

const maintenanceFactor: number = timeFactor;

export enum EPopClass {
  FORAGER,
  FARMER,
  ARTISAN,
  PRIEST,
}

export const promotionRate: Record<EPopClass, number> ={
  [EPopClass.PRIEST]: 1,
  [EPopClass.ARTISAN]: 0,
  [EPopClass.FARMER]: 1,
  [EPopClass.FORAGER]: 1//.01
}

export const growthRates: Record<EPopClass, number> =  {
  [EPopClass.PRIEST]: Math.pow(1/70, 1/timeFactor),
  [EPopClass.ARTISAN]: -Math.pow(1/1000, 1/timeFactor),
  [EPopClass.FARMER]: Math.pow(1/100, 1/timeFactor),
  [EPopClass.FORAGER]: Math.pow(1/400, 1/timeFactor)
}

export enum EBuildingType {
  FARM,
  WORKSHOP,
  PALACE
}

export enum EGoods{
  FARM_TOOLS_1
}

const GoodsEffect: Record<EGoods, number> = {
  [EGoods.FARM_TOOLS_1]: 1
}

const populationPriorities = [EPopClass.PRIEST, EPopClass.FARMER, EPopClass.ARTISAN, EPopClass.FORAGER];
const promotionPriority = populationPriorities.reverse();

interface IClassAttributes {
  title: string,
  labor: (population: number, gameCell: GameCell, goodsUsed: Array<EGoods>) => IGameCellDelta
  housingReq: number,
  goodsUsed: Array<EGoods>
}

export const popClassAttributes: Record<EPopClass, IClassAttributes> = {
  [EPopClass.FORAGER]: {
    title: 'Forager',
    labor: (population: number, gameCell: GameCell, goodsUsed: Array<EGoods>) : IGameCellDelta => {
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
        maxPeople: maxPops,
        goodsProduced: new Map()
      };
    },
    housingReq: 1,
    goodsUsed: []
  },
  [EPopClass.FARMER]: {
    title: 'Farmer',
    labor: (population: number, gameCell: GameCell, goodsUsed: Array<EGoods>) : IGameCellDelta => {
      let goodsMultiplier = 1;
      for (const goodsType of goodsUsed) {
        goodsMultiplier += Math.min(gameCell.goodsStockPile[goodsType]/population, 1) * GoodsEffect[goodsType];
      }
      const biome = gameCell.worldCell.biome;
      const developmentRate: number = developmentRates[biome];
      const farmerFactor = 100;
      const farmerProductionFactor = 4;
      let food = Math.min(
          Math.floor(population),
          gameCell.buildingByType[EBuildingType.FARM]
        ) * 
        farmerProductionFactor * farmEfficiencies[biome] * goodsMultiplier;
      const maxBuildings = new Map<EBuildingType, number>([
        [
          EBuildingType.FARM,
          Math.min(population * 1.2 , gameCell.carryingCapacity * farmerFactor)
        ],
        [
          EBuildingType.WORKSHOP,
          food * .01
        ]
      ]);
      // console.log(Math.min(
      //     Math.floor(population),
      //     gameCell.buildingByType[EBuildingType.FARM]
      //   ) * 
      //   farmerProductionFactor * farmEfficiencies[biome], food);
      // console.log(goodsMultiplier);
      let maxPops = newPopsMap();
      return {
        maxBuildings: maxBuildings,
        maxHousing: Math.floor(population) * 1.3 * developmentRate,
        foodProduced: food,
        maxPeople: maxPops,
        goodsProduced: new Map()
      };
    },
    housingReq: 1.1,
    goodsUsed: [EGoods.FARM_TOOLS_1]
  },
  [EPopClass.ARTISAN]: {
    title: 'Artisan',
    labor: (population: number, gameCell: GameCell, goodsUsed: Array<EGoods>) : IGameCellDelta => {
      const biome = gameCell.worldCell.biome;
      const developmentRate: number = developmentRates[biome];
      const workshopRatio = .01;
      const maxWorkshops = new Map<EBuildingType, number>([[
        EBuildingType.PALACE,
        population * workshopRatio * developmentRate
      ]]);
      let maxPops = newPopsMap();
      return {
        maxBuildings: maxWorkshops,
        maxHousing: Math.floor(population) * 5 * developmentRate,
        foodProduced: 0,
        maxPeople: maxPops,
        goodsProduced: new Map([[EGoods.FARM_TOOLS_1, population]])
      };
    },
    housingReq: 2,
    goodsUsed: []
  },
  [EPopClass.PRIEST]: {
    title: 'PRIEST',
    labor: (population: number, gameCell: GameCell, goodsUsed: Array<EGoods>) : IGameCellDelta => {
      let maxPops = newPopsMap();
      // maxPops.set(EPopClass.PRIEST, Math.floor(population * .75));
      return {
        maxBuildings: new Map<EBuildingType, number>(),
        maxHousing: 0,
        foodProduced: 0,
        maxPeople: maxPops,
        goodsProduced: new Map()
      };
    },
    housingReq: 5,
    goodsUsed: []
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
  [EBuildingType.PALACE]: {
    title: 'Palace',
  },
}

export class Pop {
  readonly class: EPopClass;
  population: number;
  readonly growthRate: number; // per Month
  popGrowth$: BehaviorSubject<number>;

  constructor(popClass: EPopClass, population: number) {
    this.class = popClass;
    this.growthRate = growthRates[popClass];
    this.population = population;
    this.popGrowth$ = new BehaviorSubject(population);
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

  get totalPopulation(): number {
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
  maxPeople: Map<EPopClass, number>,
  goodsProduced: Map<EGoods, number>
}
const promoteFrom: Record<EPopClass, Array<EPopClass>> = {
  [EPopClass.PRIEST]: [EPopClass.ARTISAN],
  [EPopClass.ARTISAN]: [EPopClass.FARMER],
  [EPopClass.FARMER]: [EPopClass.FORAGER],
  [EPopClass.FORAGER]: []
}

const demotionPath: Record<EPopClass, EPopClass | null> = {
  [EPopClass.PRIEST]: EPopClass.ARTISAN,
  [EPopClass.ARTISAN]: EPopClass.FARMER,
  [EPopClass.FARMER]: EPopClass.FORAGER,
  [EPopClass.FORAGER]: null
}

const requiredBuilding: Record<EBuildingType, EPopClass | null> = {
  [EBuildingType.FARM]: EPopClass.FARMER,
  [EBuildingType.WORKSHOP]: EPopClass.ARTISAN,
  [EBuildingType.PALACE]: EPopClass.PRIEST
};

export interface IGameCellView {
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

let gameCellIDs = 0;

export default class GameCell {
  pops: ObservableSet<Pop>;
  popsByClass: Map<EPopClass, ObservableSet<Pop>>;
  newPop$: ReplaySubject<Pop>;
  buildingByType: Record<EBuildingType, number>;
  housing: number;
  goodsStockPile: Record<EGoods, number>;
  // food: number;
  readonly carryingCapacity: number;
  gameCellState$: BehaviorSubject<IGameCellView>
  id: number;

  constructor(
    readonly worldCell: IWorldCell,
  ) {
    this.id = gameCellIDs++;
    this.newPop$ = new ReplaySubject();
    this.pops = new ObservableSet();
    this.popsByClass = new Map();
    const biome = this.worldCell.biome;
    const developmentRate: number = developmentRates[biome];
    this.buildingByType = {
      [EBuildingType.FARM]: carryingCapacities[this.worldCell.biome] * .1,
      [EBuildingType.WORKSHOP]: 0,
      [EBuildingType.PALACE]: 0
    };
    this.goodsStockPile = {
      [EGoods.FARM_TOOLS_1]: 0
    }
    for (const item of enumMembers(EPopClass)) {
      this.popsByClass.set(item as EPopClass, new ObservableSet())
    }
    this.housing = Math.floor(carryingCapacities[this.worldCell.biome]/10);
    // this.food = 0;
    this.carryingCapacity = carryingCapacities[worldCell.biome];
    this.gameCellState$ = new BehaviorSubject(this.getState());
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

  private getState() {
    const popViews = new Array<IPopView>();
    for (const pop of this.pops) {
      popViews.push({population: pop.population, socialClass: pop.class})
    }
    return {
      ...this.getReference(),
      pops: popViews,
      populationSize: this.populationSize,
    }
  }

  getReference() {
    return {
      xCoord: this.worldCell.x,
      yCoord: this.worldCell.y
    };
  }

  deliverState() {
    this.gameCellState$.next(this.getState())
  }

  get populationSize(): number {
    let result: number = 0;
    for (const pop of this.pops) {
      result += pop.population;
    }
    return result;
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
    if (this.pops.size > 0 && this.getTotalPopulation()) {
      // console.log(this.worldCell.x, this.worldCell.y);
      // Generate deltas for each pop, these will be combined later to determine the new gameCell state
      for (const pop of this.pops) {
        // console.log(pop);
        if (pop.totalPopulation) {
          const popAttributes = popClassAttributes[pop.class];
          deltas.push(popAttributes.labor(pop.totalPopulation, this, popAttributes.goodsUsed));
        }
      }
      // Combine the deltas
      const delta = deltas.reduce((previous: IGameCellDelta, next: IGameCellDelta) : IGameCellDelta => {
        let buildingDeltas = new Map<EBuildingType, number>();
  
        for (const buildingType of enumMembers(EBuildingType)) {
          buildingDeltas.set(
            buildingType,
            (
              (previous.maxBuildings.get(buildingType) || 0) +
              (next.maxBuildings.get(buildingType) || 0)
            )
          );
        }
        let maxPops = new Map<EPopClass, number>();
  
        for (const populationType of enumMembers(EPopClass)) {
          maxPops.set(
            populationType,
            (
              previous.maxPeople.get(populationType as EPopClass) +
              next.maxPeople.get(populationType as EPopClass)
            )
          );
        }

        let goodsProduced = new Map<EGoods, number>();
        for (const goodType of enumMembers(EGoods)) {
          goodsProduced.set(
            goodType,
            (
              (previous.goodsProduced.get(goodType) || 0) +
              (next.goodsProduced.get(goodType) || 0)
            )
          );
        }
        return {
          maxBuildings: buildingDeltas,
          maxHousing: (previous.maxHousing + next.maxHousing),
          foodProduced: (previous.foodProduced + next.foodProduced),
          maxPeople: maxPops,
          goodsProduced: goodsProduced
        };
      });
  
      // Apply the changes to building counts to the gameCell
      for (const buildingType of delta.maxBuildings.keys()) {
        const currBuildings = this.buildingByType[buildingType];
        let buildingDelta = ((delta.maxBuildings.get(buildingType) - currBuildings) / maintenanceFactor) * developmentRates[this.worldCell.biome];
        this.buildingByType[buildingType] = currBuildings + buildingDelta;
        const maxPeople = delta.maxPeople;
        if (maxPeople.has(requiredBuilding[buildingType])) {
          maxPeople.set(
            requiredBuilding[buildingType],
            Math.floor(Math.max(this.buildingByType[buildingType], maxPeople.get(requiredBuilding[buildingType])))
          );
        }
      }
      for (const good of delta.goodsProduced.entries()) {
        // console.log(good);
        this.goodsStockPile[good[0]] = good[1];
      }
      this.housing += Math.floor((delta.maxHousing - this.housing) / maintenanceFactor);
      let food: number = delta.foodProduced;
      // console.log(food);
      // console.log(this.buildingByType);
      // console.log(this.goodsStockPile);
      let housingLimit: number = this.housing;
      const promotions: Map<EPopClass, number> = new Map();
      // Distribute food based on which social class gets food priority, pops will prefer to grow even during a food shortage
      for (const popType of populationPriorities) {
        let popLimit = delta.maxPeople.get(popType);
        let popsToRemove = new Array<Pop>();
        let totalInClass = 0;
        for (const pop of this.popsByClass.get(popType)) {
          let newPopulation = pop.update(Math.min(popLimit, food));
          popLimit = Math.max(popLimit - newPopulation, 0);
          food = Math.max(food - newPopulation, 0);
          if (newPopulation <= 0) {
            popsToRemove.push(pop);
          }
        }
        this.removePops(popsToRemove);
        if (popLimit > 0) {
          promotions.set(popType, popLimit);
        }
      }
      // Promote pops to new available roles
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
              this.removePops(popsToRemove);
            }
            migrationPossibilites.set(popType, maxNewPopulation);
          }
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
    //   'PRIESTs': this.getSocialPopulation(EPopClass.PRIEST),
    // });
    return [migrationOptions[0], migrationOptions[migrationOptions.length - 1]];
    this.deliverState();
  }

  export(): IGameCellView {
    return this.getState();
  }
}
