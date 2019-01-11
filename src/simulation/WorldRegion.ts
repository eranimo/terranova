import { BehaviorSubject } from 'rxjs';
import { ObservableSet } from './ObservableSet';
import { IWorldCell } from './worldTypes';

export class WorldRegion {
  cells$: ObservableSet<IWorldCell>;
  averages: Record<string, number>;
  averages$: BehaviorSubject<Record<string, number>>;

  static MEAN_PROPS: Array<keyof IWorldCell> = [
    'height', 'moisture', 'temperature', 'terrainRoughness'
  ];

  constructor(cells?: IWorldCell[]) {
    this.cells$ = new ObservableSet(cells);
    this.averages = {};
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
}
