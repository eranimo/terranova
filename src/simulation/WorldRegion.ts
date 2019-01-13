import { BehaviorSubject } from 'rxjs';
import { ObservableSet } from './ObservableSet';
import { IWorldCell } from './worldTypes';


export interface IWorldRegionView {
  name: string,
  color: number,
  cells: Array<{
    x: number,
    y: number,
  }>;
}

export class WorldRegion {
  cells$: ObservableSet<IWorldCell>;
  averages: Record<string, number>;
  averages$: BehaviorSubject<Record<string, number>>;
  name: string;
  color: number;

  static MEAN_PROPS: Array<keyof IWorldCell> = [
    'height', 'moisture', 'temperature', 'terrainRoughness'
  ];

  constructor({
    cells = [],
    name,
    color,
  }: {
    cells: IWorldCell[],
    name: string,
    color: number,
  }) {
    this.cells$ = new ObservableSet(cells);
    this.averages = {};
    this.name = name;
    this.color = color;
    this.averages$ = new BehaviorSubject({});

    this.cells$.subscribe((newCells: IWorldCell[]) => {
      for (const prop of WorldRegion.MEAN_PROPS) {
        this.averages[prop] = 0;
      }
      for (const cell of newCells) {
        for (const prop of WorldRegion.MEAN_PROPS) {
          this.averages[prop] += cell[prop] as number;
        }
      }
      for (const prop of WorldRegion.MEAN_PROPS) {
        this.averages[prop] /= newCells.length;
      }
      this.averages$.next(this.averages);
    });
  }

  export(): IWorldRegionView {
    return {
      name: this.name,
      color: this.color,
      cells: this.cells$.value.map(cell => ({
        x: cell.x,
        y: cell.y
      })),
    }
  }
}
