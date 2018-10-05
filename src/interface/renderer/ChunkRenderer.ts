import { Sprite, Container, Point } from 'pixi.js';
import World, { Cell } from '../../simulation/world';
import { IWorldRendererOptions } from './WorldRenderer';
import { EMapMode, mapModes } from './mapModes';
import { isFunction } from 'lodash';
import Array2D from '../../utils/Array2D';


interface IChunkData {
  container: Container;
  position: Point,
  mapModes: Record<EMapMode, Sprite>;
  grid: Sprite;
  // arrows: Container;
}

interface IChunkRef {
  chunkX: number;
  chunkY: number;
}

export class ChunkRenderer {
  world: World;
  viewport: Viewport;
  options: IWorldRendererOptions;
  renderedChunks: Array2D<IChunkData>;
  chunkColumns: number;
  chunkRows: number;
  mapModeState: any;
  chunkContainer: Container;
  overpaint: Point;
  visibleChunks: number;
  chunkWorldWidth: number;
  chunkWorldHeight: number;

  constructor(world: World, viewport: Viewport, options: IWorldRendererOptions) {
    this.world = world;
    this.viewport = viewport;
    this.options = options;

    this.chunkColumns = world.size.width / this.options.chunkWidth;
    this.chunkRows = world.size.height / this.options.chunkHeight;
    this.renderedChunks = new Array2D<IChunkData>(this.chunkColumns, this.chunkRows);
    this.chunkWorldWidth = this.options.chunkWidth * this.options.cellWidth
    this.chunkWorldHeight = this.options.chunkHeight * this.options.cellHeight

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

    this.overpaint = new PIXI.Point(
      this.options.cellWidth * this.options.chunkWidth,
      this.options.cellHeight * this.options.chunkHeight,
    );
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

  get chunkCount() {
    return this.chunkColumns * this.chunkRows;
  }


  private renderChunk(chunkX: number, chunkY: number) {
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
    chunk.x = chunkX * this.chunkWorldWidth;
    chunk.y = chunkY * this.chunkWorldHeight;
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
      mapModeSprite.cacheAsBitmap = true;
      chunk.addChild(mapModeSprite);

      mapModeLayers[mapMode] = mapModeSprite;
    }

    const gridSprite = drawGridLines(
      this.chunkWorldWidth,
      this.chunkWorldHeight,
      this.options.cellWidth,
      this.options.cellHeight,
    );
    gridSprite.cacheAsBitmap = true;
    chunk.addChild(gridSprite);

    this.renderedChunks.set(chunkX, chunkY, {
      container: chunk,
      position: chunkPosition,
      mapModes: mapModeLayers as Record<EMapMode, Sprite>,
      grid: gridSprite,
    });
  }

  private renderVisibleChunks(): void {
    const { chunkX: x1, chunkY: y1 } = this.getChunkAtPoint(
      Math.max(0, this.viewport.left - this.overpaint.x),
      Math.max(0, this.viewport.top - this.overpaint.y),
    );
    const { chunkX: x2, chunkY: y2 } = this.getChunkAtPoint(
      Math.min(this.viewport.right + this.overpaint.x, this.viewport.worldWidth - 1),
      Math.min(this.viewport.bottom + this.overpaint.y, this.viewport.worldHeight - 1),
    );

    this.visibleChunks = 0;
    for (let x = x1; x < x2; x++) {
      for (let y = y1; y < y2; y++) {
        this.visibleChunks++;
        if (this.renderedChunks.has(x, y)) {
          this.renderedChunks.get(x, y).container.visible = true;
        } else {
          this.renderChunk(x, y);
        }
      }
    }
  }

  private hideAllChunks() {
    for (let x = 0; x < this.chunkRows; x++) {
      for (let y = 0; y < this.chunkColumns; y++) {
        this.renderedChunks.get(x, y).container.visible = false;
      }
    }
  }

  public render(): void {
    this.hideAllChunks();
    this.renderVisibleChunks();
  }
}

function drawGridLines(
  width: number,
  height: number,
  cellWidth: number,
  cellHeight: number,
): PIXI.Sprite {
  const g = new PIXI.Graphics(true);
  g.lineColor = 0x000000;
  g.lineWidth = 1;
  for (let x = 0; x < width; x += cellWidth) {
    g.moveTo(x, 0);
    g.lineTo(x, height);
    for (let y = 0; y < height; y += cellHeight) {
      g.moveTo(0, y);
      g.lineTo(width, y);
    }
  }
  return new PIXI.Sprite(g.generateCanvasTexture());
}
