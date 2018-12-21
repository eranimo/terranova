import { Point } from 'pixi.js';
import { worldStore } from './index';
import World from "./World";
import GameLoop from './GameLoop';
import { IWorldCell } from './worldTypes';
import { meanBy } from 'lodash';


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

class Cell {
  constructor(
    public x: number,
    public y: number,
    public worldCell: IWorldCell,
  ) {

  }
}

class Region {
  cells: Set<IWorldCell>;
  averages: Record<string, number>;

  static MEAN_PROPS: Array<keyof IWorldCell> = [
    'height', 'moisture', 'temperature', 'terrainRoughness'
  ];

  constructor(cells?: IWorldCell[]) {
    this.cells = new Set(cells);
    this.averages = {};
    this.recalculate();
  }

  public add(...cells: IWorldCell[]) {
    for (const cell of cells) {
      this.cells.add(cell);
    }
    this.recalculate();
  }

  public remove(...cells: IWorldCell[]) {
    for (const cell of cells) {
      this.cells.delete(cell);
    }
    this.recalculate();
  }

  private recalculate() {
    const cells = Array.from(this.cells);
    for (const prop of Region.MEAN_PROPS) {
      this.averages[prop] = meanBy(cells, prop);
    }
  }

  get size() {
    return this.cells.size;
  }
}

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
    const region = new Region(cells);

    console.log(region);
  }
}
