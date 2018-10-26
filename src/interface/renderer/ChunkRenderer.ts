import { EDirection, ECellFeature } from './../../simulation/world';
import { Sprite, Container, Point } from 'pixi.js';
import World, { Cell } from '../../simulation/world';
import { IWorldRendererOptions } from './WorldRenderer';
import { EMapMode, mapModes, IMapMode } from './mapModes';
import { isFunction } from 'lodash';
import Array2D from '../../utils/Array2D';
import { makeArrow } from './textures';
import Viewport from 'pixi-viewport';


const directionAngles = {
  [EDirection.NONE]: 0,
  [EDirection.RIGHT]: 90,
  [EDirection.DOWN]: 180,
  [EDirection.LEFT]: 270,
  [EDirection.UP]: 0,
}

export interface IChunkData {
  container: Container;
  position: Point,
  mapModes: Record<EMapMode, Sprite>;
  grid: Sprite;
  flowArrows: Container;
  coastlineBorder: Sprite;
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
  mapModes: Partial<Record<EMapMode, IMapMode>>;
  chunkContainer: Container;
  overpaint: Point;
  visibleChunks: IChunkData[];
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

    this.mapModes = {};
    for (const [name, factory] of Object.entries(mapModes)) {
      this.mapModes[name] = factory(this);
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

  *mapChunks(): IterableIterator<IChunkData> {
    for (let x = 0; x < this.chunkColumns; x++) {
      for (let y = 0; y < this.chunkRows; y++) {
        yield this.renderedChunks.get(x, y);
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
    const { cellWidth, cellHeight, chunkWidth, chunkHeight } = this.options;

    const chunkPosition = new Point(
      chunkX * chunkWidth * cellWidth,
      chunkY * chunkHeight * cellHeight,
    );
    const chunkCells = this.getCellsInChunk(chunkX, chunkY);

    const chunk = new Container();
    chunk.width = chunkWidth;
    chunk.height = chunkHeight;
    chunk.x = chunkX * this.chunkWorldWidth;
    chunk.y = chunkY * this.chunkWorldHeight;
    this.chunkContainer.addChild(chunk);

    // render map modes
    const mapModeLayers = {};
    for (const [name, mapMode] of Object.entries(this.mapModes)) {
      const mapModeSprite: Sprite = mapMode.renderChunk(
        this.options,
        chunkCells,
        chunkPosition,
      );
      mapModeSprite.interactive = false;
      mapModeSprite.cacheAsBitmap = true;
      chunk.addChild(mapModeSprite);

      mapModeLayers[name] = mapModeSprite;
    }

    const gridSprite: Sprite = drawGridLines(
      this.chunkWorldWidth,
      this.chunkWorldHeight,
      cellWidth,
      cellHeight,
    );
    gridSprite.alpha = 0.25;
    gridSprite.interactive = false;
    gridSprite.cacheAsBitmap = true;
    chunk.addChild(gridSprite);

    const flowArrows = new Container();
    const PADDING = 2;
    for (const cell of chunkCells) {
      if (cell.riverType === 0) continue;
      const arrowSprite = new Sprite(makeArrow(
        cellWidth - PADDING,
        cellHeight - PADDING,
      ));
      arrowSprite.position.set(
        (cell.x * cellWidth) - chunkPosition.x + (cellWidth / 2),
        (cell.y * cellHeight) - chunkPosition.y + (cellWidth / 2),
      );
      arrowSprite.anchor.set(
        0.5, 0.5
      );
      arrowSprite.rotation = directionAngles[cell.flowDir] * (Math.PI / 180);
      arrowSprite.interactive = false;
      flowArrows.addChild(arrowSprite);
    }
    flowArrows.cacheAsBitmap = true;
    flowArrows.interactive = false;
    chunk.addChild(flowArrows);

    const coastlineBorder: Sprite = drawCellBorders(
      chunkCells,
      chunkPosition,
      this.world,
      cellWidth,
      cellHeight,
      this.chunkWorldWidth,
      this.chunkWorldHeight,
      (a: Cell, b: Cell) => a.isLand && !b.isLand,
    );
    coastlineBorder.cacheAsBitmap = true;
    coastlineBorder.interactive = false;
    chunk.addChild(coastlineBorder);

    this.renderedChunks.set(chunkX, chunkY, {
      container: chunk,
      position: chunkPosition,
      mapModes: mapModeLayers as Record<EMapMode, Sprite>,
      grid: gridSprite,
      flowArrows,
      coastlineBorder,
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

    this.visibleChunks = [];
    for (let x = x1; x <= x2; x++) {
      for (let y = y1; y <= y2; y++) {
        if (this.renderedChunks.has(x, y)) {
          this.renderedChunks.get(x, y).container.visible = true;
        } else {
          this.renderChunk(x, y);
        }
        this.visibleChunks.push(this.renderedChunks.get(x, y));
      }
    }
  }

  private hideAllChunks() {
    for (let x = 0; x < this.chunkColumns; x++) {
      for (let y = 0; y < this.chunkRows; y++) {
        if (this.renderedChunks.has(x, y)) {
          this.renderedChunks.get(x, y).container.visible = false;
        }
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

function drawCellBorders(
  chunkCells: Cell[],
  chunkPosition: Point,
  world: World,
  cellWidth: number,
  cellHeight: number,
  chunkWidth : number,
  chunkHeight: number,
  shouldDraw: (a: Cell, b: Cell) => boolean,
): PIXI.Sprite {
  const g = new PIXI.Graphics(true);

  g.beginFill(0x000000, 0);
  g.drawRect(0, 0, 1, 1);
  g.endFill();

  g.beginFill(0x000000, 1);
  g.lineColor = 0x000000;
  g.lineWidth = 1.5;
  g.lineAlignment = 1;

  // g.hitArea = new PIXI.Rectangle(0, 0, chunkWidth, chunkHeight);

  for (const cell of chunkCells) {
    const cx = Math.round((cell.x * cellWidth) - chunkPosition.x);
    const cy = Math.round((cell.y * cellHeight) - chunkPosition.y);
    const cellUp = world.getCell(cell.x, cell.y - 1);
    const cellDown = world.getCell(cell.x, cell.y + 1);
    const cellLeft = world.getCell(cell.x - 1, cell.y);
    const cellRight = world.getCell(cell.x + 1, cell.y);
    const cellDownRight = world.getCell(cell.x + 1, cell.y + 1);
    const cellDownLeft = world.getCell(cell.x - 1, cell.y + 1);
    const cellUpRight = world.getCell(cell.x + 1, cell.y - 1);
    const cellUpLeft = world.getCell(cell.x - 1, cell.y - 1);

    g.lineWidth = 2;
    if (cellUp !== null && shouldDraw(cell, cellUp)) {
      g.moveTo(cx, cy + 1);
      g.lineTo(cx + cellWidth, cy + 1);
    }
    if (cellDown !== null && shouldDraw(cell, cellDown)) {
      g.moveTo(cx, cy + cellHeight - 1);
      g.lineTo(cx + cellWidth, cy + cellHeight - 1);
    }
    if (cellLeft !== null && shouldDraw(cell, cellLeft)) {
      g.moveTo(cx + 1, cy);
      g.lineTo(cx + 1, cy + cellHeight);
    }
    if (cellRight !== null && shouldDraw(cell, cellRight)) {
      g.moveTo(cx + cellWidth - 1, cy);
      g.lineTo(cx + cellWidth - 1, cy + cellHeight);
    }
    g.lineWidth = 0;
    if (cellDownRight !== null && shouldDraw(cell, cellDownRight)) {
      g.beginFill(0x000000);
      g.drawRect(
        (cx + cellWidth - 2),
        (cy + cellHeight - 2),
        2,
        2,
      );
      g.endFill();
    }
    if (cellDownLeft !== null && shouldDraw(cell, cellDownLeft)) {
      g.beginFill(0x000000);
      g.drawRect(
        (cx),
        (cy + cellHeight - 2),
        2,
        2,
      );
      g.endFill();
    }
    if (cellUpLeft !== null && shouldDraw(cell, cellUpLeft)) {
      g.beginFill(0x000000);
      g.drawRect(
        (cx),
        (cy),
        2,
        2,
      );
      g.endFill();
    }
    if (cellUpRight !== null && shouldDraw(cell, cellUpRight)) {
      g.beginFill(0x000000);
      g.drawRect(
        (cx + cellWidth - 2),
        (cy),
        2,
        2,
      );
      g.endFill();
    }
  }
  g.endFill();

  const t = g.generateCanvasTexture();
  const s = new PIXI.Sprite(t);
  return s;
}
