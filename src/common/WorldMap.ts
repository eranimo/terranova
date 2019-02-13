import { IWorldRegionView } from '../simulation/WorldRegion';
import World from "../simulation/World";
import Array2D from "../utils/Array2D";
import { IGameCellView } from '../simulation/GameCell';
import { Subject, ReplaySubject, Observable } from 'rxjs';
import ndarray from 'ndarray';
import { random } from 'lodash';


export class WorldMap {
  world: World;
  regionMap: Map<string, IWorldRegionView>;
  cellRegionMap: Array2D<string>;
  cellRegionUpdate$: Array2D<ReplaySubject<string>>;
  regionUpdate$: ReplaySubject<IWorldRegionView>;
  gameCellMap: Array2D<IGameCellView>;

  populationMap: ndarray;
  populationMapUpdate$: Subject<void>;

  constructor(world: World) {
    this.world = world;
    const { width, height } = this.world.size;
    this.regionMap = new Map();
    this.cellRegionMap = new Array2D(width, height);
    this.cellRegionUpdate$ = new Array2D(
      width,
      height,
      (x, y) => new ReplaySubject<string>(),
    );
    this.regionUpdate$ = new ReplaySubject<IWorldRegionView>();
    this.gameCellMap = new Array2D(width, height);

    this.populationMap = ndarray(new Uint32Array(width * height), [width, height]);
    this.populationMap.set(113, 86, 1000);
    this.populationMap.set(112, 86, 5000);
    this.populationMap.set(112, 85, 15000);
    this.populationMap.set(112, 84, 20000);
    this.populationMapUpdate$ = new Subject();

    setInterval(() => {
      this.populationMap.set(random(width), random(height), random(20000));
      this.populationMapUpdate$.next();
    }, 2000);
  }

  addRegion(region: IWorldRegionView) {
    this.regionMap.set(region.name, region);
    this.regionUpdate$.next(region);

    for (const cell of region.cells) {
      this.cellRegionMap.set(cell.x, cell.y, region.name);
      this.cellRegionUpdate$.get(cell.x, cell.y).next(region.name)
    }
  }

  addGameCell(gameCell: IGameCellView) {
    this.gameCellMap.set(gameCell.xCoord, gameCell.yCoord, gameCell);
  }
}
