import { meanBy } from 'lodash';
import { Point } from 'pixi.js';
import { ReplaySubject, Subject, BehaviorSubject } from 'rxjs';
import GameLoop from './GameLoop';
import World from './World';
import { IWorldCell } from './worldTypes';
import { WorldRegion } from './WorldRegion';
import { worldStore } from './stores';
import GameCell, { Pop, EPopClass, IPopCoordinates, IGameCellView, IPopView, timeFactor } from './GameCell';
import Array2D from '../utils/Array2D';
import { ObservableSet } from './ObservableSet';


export interface IGameData {
  entities: any[];
}

export interface IGameParams {
  worldSaveName: string;
  name: string;
  gameData?: IGameData
}

const initialGameData: IGameData = {
  entities: [],
};

export default class Game extends GameLoop {
  world: World | null;
  gameData: IGameData;
  params: IGameParams;
  newRegion$: ReplaySubject<WorldRegion>;
  gameCells: ObservableSet<GameCell>;
  gameCell$: ReplaySubject<GameCell>;
  gameCellMap: Array2D<GameCell>;

  constructor(params: IGameParams, onError: (error: Error) => void) {
    super(onError);
    this.gameData = params.gameData || Object.assign({}, initialGameData);
    this.params = params;
    this.world = null;
    this.gameCell$ = new ReplaySubject();
    this.gameCell$.subscribe(gameCell => this.gameCells.add(gameCell));
  }

  async init() {
    // start playing:
    // this.start();

    // initialize world
    this.world = await worldStore.load(this.params.worldSaveName);
    this.newRegion$ = new ReplaySubject();
    this.gameCells = new ObservableSet();
    this.gameCellMap = new Array2D(this.world.size.width, this.world.size.height);
  }

  testData() {
    // create regions
    const cells = [
      this.world.getCell(79, 135),
      this.world.getCell(79, 134),
      this.world.getCell(80, 135),
      this.world.getCell(80, 134),
      this.world.getCell(81, 135),
      this.world.getCell(81, 134),
    ];
    console.log('cells', cells);
    const region1 = new WorldRegion({
      cells,
      name: 'Alpha',
      color: 0xFF0000,
    });
    const region2 = new WorldRegion({
      cells: [
        this.world.getCell(81, 135),
        this.world.getCell(82, 135),
        this.world.getCell(83, 135),
        this.world.getCell(83, 136),
        this.world.getCell(84, 136),
        this.world.getCell(84, 135),
      ],
      name: 'Beta',
      color: 0x0000FF,
    })
    console.log('GAME: add region Alpha')
    this.world.regions.add(region1);
    this.newRegion$.next(region1);

    // setTimeout(() => {
    //   console.log('GAME: add region Beta')
    //   this.world.regions.add(region2);
    //   this.newRegion$.next(region2);
    // }, 4000);

    // setTimeout(() => {
    //   console.log('GAME: update region Alpha')
    //   region1.cells$.add(this.world.getCell(85, 136));
    //   this.newRegion$.next(region1);
    // }, 6000);

    // setTimeout(() => {
    //   const region = new WorldRegion({
    //     cells: [
    //       this.world.getCell(181, 135),
    //       this.world.getCell(182, 135),
    //     ],
    //     name: 'Cappa',
    //     color: 0x00FFFF,
    //   });
    //   console.log('GAME: add region Cappa')
    //   this.world.regions.add(region);
    //   this.newRegion$.next(region);
    // }, 7000);

    // this.addTimer({
    //   ticksLength: 30,
    //   isRepeated: true,
    //   onTick: (ticksElapsed: number) => console.log('ticks', ticksElapsed),
    //   onFinished: () => console.log('timer done!'),
    // });

    console.log('GAME: add game cell');
    const gc1 = this.populateCell(81, 135);
    gc1.addPop(EPopClass.FORAGER, 1000);

    setTimeout(() => {
      region2.cells$.add(this.world.getCell(85, 136));
      this.newRegion$.next(region2);
    }, 6000);

    this.addTimer({
      ticksLength: 30,
      isRepeated: true,
      onTick: null,
      onFinished: () =>  this.updatePops(),
    });
  }

  populateCell(x: number, y: number): GameCell {
    const gameCell = new GameCell(this.world.getCell(x, y));
    this.gameCells.add(gameCell);
    this.gameCellMap.set(x, y, gameCell);
    return gameCell;
  }

  update(elapsedTime: number) {
    super.update(elapsedTime);
  }

  updatePops() {
    for (const gameCell of this.gameCells) {
      gameCell.update();
    }
  }
}
