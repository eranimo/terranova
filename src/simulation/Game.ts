import { Point } from 'pixi.js';
import { worldStore } from "./stores";
import World from "./World";
import GameLoop from './GameLoop';
import { IWorldCell } from './worldTypes';
import { meanBy } from 'lodash';
import { WorldRegion } from './WorldRegion';


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

  constructor(params: IGameParams) {
    super();
    this.gameData = params.gameData || Object.assign({}, initialGameData);
    this.params = params;
    this.world = null;
  }

  async init() {
    // this.start();
    this.world = await worldStore.load(this.params.worldSaveName);
    const cells = [
      this.world.getCell(79, 135),
      this.world.getCell(79, 134),
      this.world.getCell(80, 135),
      this.world.getCell(80, 134),
      this.world.getCell(81, 135),
    ];
    console.log('cells', cells);
    const region = new WorldRegion(cells);
    // (this.world as any).foobar = 'barbaz';
    // this.world.regions.subscribe(regions => console.log('R', regions));
    this.world.regions.add(region);
  }
}
