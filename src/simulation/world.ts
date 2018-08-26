import ndarray from 'ndarray';
import { IWorldgenOptions, IWorldgenWorkerOutput } from './simulation';


export enum ETerrainType {
  OCEAN,
  LAND,
  RIVER,
  LAKE,
}

export enum EDirection {
  NONE,
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

export class Cell {
  x: number;
  y: number;
  height: number;
  terrainType: ETerrainType;
  flowDir: EDirection;

  constructor({ x, y, terrainType, height, flowDir }: {
    x: number,
    y: number,
    height: number,
    terrainType: ETerrainType,
    flowDir: EDirection,
  }) {
    this.x = x;
    this.y = y;
    this.height = height;
    this.terrainType = terrainType;
    this.flowDir = flowDir;
  }
}

export default class World {
  grid: Cell[][];
  cells: Set<Cell>;
  size: {
    width: number;
    height: number;
  };

  constructor(params: IWorldgenWorkerOutput) {
    this.grid = [];
    this.cells = new Set();
    this.size = params.options.size;
    const heightmap = ndarray(params.heightmap, [this.size.width, this.size.height]);
    const terrainTypes = ndarray(params.terrainTypes, [this.size.width, this.size.height]);
    for (let x = 0; x < this.size.width; x++) {
      this.grid[x] = [];
      for (let y = 0; y < this.size.height; y++) {
        const cell: Cell = new Cell({
          x, y,
          height: heightmap.get(x, y),
          flowDir: EDirection.NONE,
          terrainType: terrainTypes.get(x, y) as ETerrainType,
        });
        this.cells.add(cell);
        this.grid[x][y] = cell;
      }
    }
  }

}
