import { Sprite, Container, Point } from 'pixi.js';
import World, { Cell } from '../../simulation/world';
import { IWorldRendererOptions } from './WorldRenderer';
import { EMapMode, mapModes } from './mapModes';
import { isFunction } from 'lodash';
import Array2D from '../../utils/Array2D';


interface IChunkData {
  position: Point,
  mapModes: Record<EMapMode, Sprite>;
  // grid: Sprite;
  // arrows: Container;
}

interface IChunkRef {
  chunkX: number;
  chunkY: number;
}

export class ChunkRenderer {
  world: World;
  options: IWorldRendererOptions;
  renderedChunks: Array2D<IChunkData>;
  chunkColumns: number;
  chunkRows: number;
  mapModeState: any;
  chunkContainer: Container;

  constructor(world: World, options: IWorldRendererOptions) {
    this.world = world;
    this.options = options;

    this.chunkColumns = world.size.width / this.options.chunkWidth;
    this.chunkRows = world.size.height / this.options.chunkHeight;
    this.renderedChunks = new Array2D<IChunkData>(this.chunkColumns, this.chunkRows);

    this.mapModeState = {};
    for (const [mapMode, mapModeDef] of Object.entries(mapModes)) {
      if (isFunction(mapModeDef.initState)) {
        this.mapModeState[mapMode] = mapModeDef.initState(world);
      } else {
        this.mapModeState[mapMode] = {};
      }
    }

    this.chunkContainer = new Container();
    this.chunkContainer.width = world.size.width * this.options.cellWidth;
    this.chunkContainer.height = world.size.height * this.options.cellHeight;
  }

  getChunkAtCell(cell: Cell): IChunkRef {
    return {
      chunkX: Math.floor(cell.x / this.options.chunkWidth),
      chunkY: Math.floor(cell.y / this.options.chunkHeight),
    };
  }

  getCellAtPoint(x: number, y: number) {
    return {
      cellX: Math.floor(x / this.options.cellWidth),
      cellY: Math.floor(y / this.options.cellHeight),
    };
  }

  getChunkAtPoint(x: number, y: number): IChunkRef {
    const { cellX, cellY } = this.getCellAtPoint(x, y);
    const cell = this.world.getCell(cellX, cellY);
    if (cell === null) {
      throw new Error(`No cell at (${cellX}, ${cellY}) for point (${x}, ${y})`);
    }
    return this.getChunkAtCell(cell);
  }

  getCellsInChunk(chunkX: number, chunkY: number): Cell[] {
    return Array.from(this.mapCellsInChunk(chunkX, chunkY));
  }

  *mapCellsInChunk(chunkX: number, chunkY: number): IterableIterator<Cell> {
    const { chunkWidth, chunkHeight } = this.options;
    for (let x = chunkX * chunkWidth; x < (chunkX + 1) * chunkWidth; x++) {
      for (let y = chunkY * chunkHeight; y < (chunkY + 1) * chunkHeight; y++) {
        yield this.world.getCell(x, y)
      }
    }
  }

  renderChunk(chunkX: number, chunkY: number) {
    if (this.renderedChunks.has(chunkX, chunkY)) {
      return;
    }
    const chunkPosition = new Point(
      chunkX * this.options.chunkWidth * this.options.cellWidth,
      chunkY * this.options.chunkHeight * this.options.cellHeight,
    );
    const chunkCells = this.getCellsInChunk(chunkX, chunkY);

    const chunk = new Container();
    chunk.width = this.options.chunkWidth;
    chunk.height = this.options.chunkHeight;
    chunk.x = chunkX * this.options.chunkWidth;
    chunk.y = chunkY * this.options.chunkHeight;
    this.chunkContainer.addChild(chunk);

    // render map modes
    const mapModeLayers = {};
    for (const [mapMode, mapModeDef] of Object.entries(mapModes)) {
      const mapModeSprite = mapModeDef.renderChunk(
        this,
        chunkCells,
        this.mapModeState[mapMode],
        chunkPosition
      );
      chunk.addChild(mapModeSprite);

      mapModeLayers[mapMode] = mapModeSprite;
    }
    this.renderedChunks.set(chunkX, chunkY, {
      position: chunkPosition,
      mapModes: mapModeLayers as Record<EMapMode, Sprite>,
    });
  }
}
