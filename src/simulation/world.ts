import ndarray from 'ndarray';
import { IWorldgenOptions, IWorldgenWorkerOutput } from './simulation';



export enum ETerrainType {
  OCEAN,
  LAND,
  RIVER,
  STREAM,
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
  drainageBasin?: DrainageBasin;

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

export class DrainageBasin {
  id: number;
  color: number;
  cells: Cell[];

  constructor(id: number, color, cells: Cell[]) {
    this.id = id;
    this.color = color;
    this.cells = cells;
    for (const cell of cells) {
      cell.drainageBasin = this;
    }
  }
}

export default class World {
  grid: Cell[][];
  cells: Set<Cell>;
  size: {
    width: number;
    height: number;
  };
  drainageBasins: DrainageBasin[];

  constructor(params: IWorldgenWorkerOutput) {
    this.grid = [];
    this.cells = new Set();
    this.size = params.options.size;
    const heightmap = ndarray(params.heightmap, [this.size.width, this.size.height]);
    const terrainTypes = ndarray(params.terrainTypes, [this.size.width, this.size.height]);
    const flowDirections = ndarray(params.flowDirections, [this.size.width, this.size.height]);
    for (let x = 0; x < this.size.width; x++) {
      this.grid[x] = [];
      for (let y = 0; y < this.size.height; y++) {
        const cell: Cell = new Cell({
          x, y,
          height: heightmap.get(x, y),
          flowDir: flowDirections.get(x, y) as EDirection,
          terrainType: terrainTypes.get(x, y) as ETerrainType,
        });
        this.cells.add(cell);
        this.grid[x][y] = cell;
      }
    }
    this.drainageBasins = [];
    for (const [id, { color, cells }] of Object.entries(params.drainageBasins)) {
      this.drainageBasins.push(
        new DrainageBasin(parseInt(id, 10), color, cells.map(([x, y]) => this.grid[x][y])
      ));
    };
  }

}
