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
  world: World;
  x: number;
  y: number;
  height: number;
  terrainType: ETerrainType;
  flowDir: EDirection;
  drainageBasin?: DrainageBasin;
  temperature: number;
  upstreamCount: number;
  isLand: boolean;
  moisture: number;

  constructor(
    world: World,
    {
      x,
      y,
      terrainType,
      height,
      flowDir,
      temperature,
      upstreamCount,
      moisture,
    }: {
      x: number,
      y: number,
      height: number,
      terrainType: ETerrainType,
      flowDir: EDirection,
      temperature: number,
      upstreamCount: number,
      moisture: number,
    }
  ) {
    this.world = world;
    this.x = x;
    this.y = y;
    this.height = height;
    this.terrainType = terrainType;
    this.isLand = terrainType !== ETerrainType.OCEAN;
    this.flowDir = flowDir;
    this.temperature = temperature;
    this.upstreamCount = upstreamCount;
    this.moisture = moisture;
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
  sealevel: number;
  drainageBasins: DrainageBasin[];

  constructor(params: IWorldgenWorkerOutput) {
    this.grid = [];
    this.cells = new Set();
    this.size = params.options.size;
    this.sealevel = params.sealevel;
    const heightmap = ndarray(params.heightmap, [this.size.width, this.size.height]);
    const terrainTypes = ndarray(params.terrainTypes, [this.size.width, this.size.height]);
    const flowDirections = ndarray(params.flowDirections, [this.size.width, this.size.height]);
    const temperatures = ndarray(params.temperatures, [this.size.width, this.size.height]);
    const upstreamCells = ndarray(params.upstreamCells, [this.size.width, this.size.height]);
    const moistureMap = ndarray(params.moistureMap, [this.size.width, this.size.height]);
    for (let x = 0; x < this.size.width; x++) {
      this.grid[x] = [];
      for (let y = 0; y < this.size.height; y++) {
        const cell: Cell = new Cell(this, {
          x, y,
          height: heightmap.get(x, y),
          flowDir: flowDirections.get(x, y) as EDirection,
          terrainType: terrainTypes.get(x, y) as ETerrainType,
          temperature: temperatures.get(x, y),
          upstreamCount: upstreamCells.get(x, y),
          moisture: moistureMap.get(x, y),
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

  getCell(x: number, y: number): Cell | null {
    if (x < 0 || y < 0 || x >= this.size.width || y >= this.size.height) {
      return null;
    }
    return this.grid[x][y];
  }

}
