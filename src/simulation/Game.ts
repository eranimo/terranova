import { meanBy } from 'lodash';
import { Point } from 'pixi.js';
import { ReplaySubject, Subject } from 'rxjs';
import GameLoop from './GameLoop';
import World from './World';
import { IWorldCell } from './worldTypes';
import { WorldRegion } from './WorldRegion';
import { worldStore } from './stores';
import GameCell, { Pop, EPopClass } from './GameCell';
import Array2D from '../utils/Array2D';


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
  gameCells: Set<GameCell>;
  gameCellMap: Array2D<GameCell>;

  constructor(params: IGameParams) {
    super();
    this.gameData = params.gameData || Object.assign({}, initialGameData);
    this.params = params;
    this.world = null;
  }

  async init() {
    // start playing:
    // this.start();

    // initialize world
    this.world = await worldStore.load(this.params.worldSaveName);

    this.newRegion$ = new ReplaySubject();

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

    setTimeout(() => {
      console.log('GAME: add region Beta')
      this.world.regions.add(region2);
      this.newRegion$.next(region2);
    }, 4000);

    setTimeout(() => {
      console.log('GAME: update region Beta')
      region2.cells$.add(this.world.getCell(85, 136));
      this.newRegion$.next(region2);
    }, 6000);

    setTimeout(() => {
      const region = new WorldRegion({
        cells: [
          this.world.getCell(181, 135),
          this.world.getCell(182, 135),
        ],
        name: 'Cappa',
        color: 0x00FFFF,
      });
      console.log('GAME: add region Cappa')
      this.world.regions.add(region);
      this.newRegion$.next(region);
    }, 7000);

    // this.addTimer({
    //   ticksLength: 30,
    //   isRepeated: true,
    //   onTick: (ticksElapsed: number) => console.log('ticks', ticksElapsed),
    //   onFinished: () => console.log('timer done!'),
    // });

    this.gameCells = new Set();
    this.gameCellMap = new Array2D(this.world.size.width, this.world.size.height);

    // perf test
    // for (let x = 0; x < 10; x++) {
    //   for (let y = 0; y < 10; y++) {
    //     const gc1 = this.populateCell(x, y);
    //     gc1.addPop(new Pop(EPopClass.FORAGER, 1000));
    //     gc1.addPop(new Pop(EPopClass.FARMER, 10000));
    //     gc1.addPop(new Pop(EPopClass.NOBLE, 50));
    //   }
    // }
  }

  populateCell(x: number, y: number): GameCell {
    const gameCell = new GameCell(this.world.getCell(x, y));
    this.gameCells.add(gameCell);
    this.gameCellMap.set(x, y, gameCell);

    return gameCell;
  }

  update(elapsedTime: number) {
    super.update(elapsedTime);

    for (const gameCell of this.gameCells) {
      gameCell.update();
    }
  }
}
