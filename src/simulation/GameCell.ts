import { IWorldCell } from "./worldTypes";
import { ObservableSet } from "./ObservableSet";
import { Subject } from "rxjs";


enum EPopClass {
  FORAGER = 'forager',
  FARMER = 'farmer',
  NOBLE = 'noble',
}

interface IClassAttributes {
  title: string,
}

const popClassAttributes: Record<EPopClass, IClassAttributes> = {
  [EPopClass.FORAGER]: {
    title: 'Forager',
  },
  [EPopClass.FARMER]: {
    title: 'Farmer',
  },
  [EPopClass.NOBLE]: {
    title: 'Noble',
  },
}

class Pop {
  class: EPopClass;
  population: number;
  growthRate: number; // per Month
  labor: (population: number, gameCell: GameCell) => Map<string, IGameCellDelta>;
  popGrowth$: Subject<number>;

  constructor(popClass: EPopClass, population: number) {
    this.class = popClass;
    this.growthRate = (1 / 1300);
    this.population = population;
    this.popGrowth$ = new Subject();
  }

  private updatePopulation() {
    this.population *= this.growthRate;
    this.popGrowth$.next(this.population);
  }

  update(gameCell: GameCell) {
    this.updatePopulation();
    this.labor(this.population, gameCell);
  }
}
export interface PopulationClassDelta {
  populationChange: number
}
export interface IGameCellDelta {
  buildingDeltas: { [key:string]: number; },
  populationDeltas: { [key:string]: PopulationClassDelta; },
  housing: number
}
export default class GameCell {
  pops: ObservableSet<Pop>;
  popsByClass: Map<EPopClass, ObservableSet<Pop>>;
  newPop$: Subject<Pop>;
  buildings: Map<string, number>;
  housing: number;
  constructor(
    public worldCell: IWorldCell,
  ) {
    this.newPop$ = new Subject();
    this.pops = new ObservableSet();
    for (const popClass in Object.keys(EPopClass)) {
      this.popsByClass.set(popClass as EPopClass, new ObservableSet())
    }
  }

  addPop(pop: Pop) {
    this.pops.add(pop);
    this.popsByClass.get(pop.class).add(pop);
    this.newPop$.next(pop);
  }

  // ran every tick
  update() {
    for (const pop of this.pops) {
      pop.update(this);
    }
  }
}
