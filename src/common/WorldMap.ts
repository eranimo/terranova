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
    // these go away when setPopulation is called
    // TODO: better way to set min / max map mode (maybe new map mode type)
    this.populationMap.set(0, 0, 0);
    this.populationMap.set(0, 1, 2000);
    this.populationMapUpdate$ = new Subject();


    // TODO: update map mode when data changes
    setInterval(() => {
      this.populationMapUpdate$.next();
    }, 2000);
  }

  setPopulation(buffer: SharedArrayBuffer) {
    const { width, height } = this.world.size;
    this.populationMap = ndarray(new Uint32Array(buffer), [width, height]);
    this.populationMapUpdate$.next();
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
