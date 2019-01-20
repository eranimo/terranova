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
  growthRate: number; // per day

  popGrowth$: Subject<number>;

  constructor(popClass: EPopClass, population: number) {
    this.class = popClass;
    this.growthRate = (1 / 100);
    this.population = population;
    this.popGrowth$ = new Subject();
  }

  private updatePopulation() {
    this.population *= this.growthRate;
    this.popGrowth$.next(this.population);
  }

  update() {
    this.updatePopulation();
  }
}

export default class GameCell {
  pops: ObservableSet<Pop>;
  popsByClass: Map<EPopClass, ObservableSet<Pop>>;
  newPop$: Subject<Pop>;

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
      pop.update();
    }
  }
}
