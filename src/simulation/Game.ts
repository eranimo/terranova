import { meanBy } from 'lodash';
import { Point } from 'pixi.js';
import { ReplaySubject, Subject } from 'rxjs';
import GameLoop from './GameLoop';
import World from './World';
import { IWorldCell } from './worldTypes';
import { WorldRegion } from './WorldRegion';
import { worldStore } from './stores';


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
    this.world.regions.add(region1);
    this.newRegion$.next(region1);

    setTimeout(() => {
      this.world.regions.add(region2);
      this.newRegion$.next(region2);
    }, 4000);

    setTimeout(() => {
      region2.cells$.add(this.world.getCell(85, 136));
      this.newRegion$.next(region2);
    }, 6000);

    // this.addTimer({
    //   ticksLength: 30,
    //   isRepeated: true,
    //   onTick: (ticksElapsed: number) => console.log('ticks', ticksElapsed),
    //   onFinished: () => console.log('timer done!'),
    // });
  }
}
