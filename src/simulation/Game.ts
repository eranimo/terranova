import { worldStore } from './index';
import World from "./World";

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

export default class Game {
  name: string;
  world: World | null;
  gameData: IGameData;
  params: IGameParams;

  constructor(params: IGameParams) {
    this.name = params.name;
    this.gameData = params.gameData || Object.assign({}, initialGameData);
    this.params = params;
    this.world = null;
  }

  async init() {
    this.world = await worldStore.load(this.params.worldSaveName);
  }
}
