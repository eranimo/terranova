import { WorldMap } from './../../common/WorldMap';
import { EDirection, ECellFeature, ECellType } from '../../simulation/worldTypes';
import { Sprite, Container, Point, Graphics } from 'pixi.js';
import { IWorldCell } from '../../simulation/worldTypes';
import World from "../../simulation/World";
import { IWorldRendererOptions } from './WorldRenderer';
import { EMapMode, MapMode, MapModeMap } from './mapModes';
import { isFunction } from 'lodash';
import Array2D from '../../utils/Array2D';
import { makeArrow } from './textures';
import Viewport from 'pixi-viewport';
import { Subject, concat } from 'rxjs';
import { IViewOptions } from './WorldRendererContainer';
import { IWorldRegionView } from '../../simulation/WorldRegion';
import hash from 'hash.js';
import { measure } from '../../utils/timing';

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
  location: Point,
  mapModeSprite: Sprite;
  mapMode: EMapMode;
  grid: Sprite;
  flowArrows: Container;
  regions: Container;
  coastlineBorder: Sprite;
  chunkGrid: Sprite;
}

interface IChunkRef {
  chunkX: number;
  chunkY: number;
}

/**
 * ChunkRenderer does two things:
 * - Renders a grid of cells in square chunks as they become visible on screen
 * - Renders MapModes which are separate layers which can only be viewed once at a time
 */
export class ChunkRenderer {
  private viewport: Viewport;
  private options: IWorldRendererOptions;
  private renderedChunks: Array2D<IChunkData>;
  private chunkColumns: number;
  private chunkRows: number;
  private overpaint: Point;
  private chunkWorldWidth: number;
  private chunkWorldHeight: number;
  private viewOptions: IViewOptions;

  public world: World;
  public worldMap: WorldMap;
  public mapModes: Partial<Record<EMapMode, MapMode>>;
  public chunkContainer: Container;
  chunkCellsMap: Array2D<IWorldCell[]>;

  constructor(
    worldMap: WorldMap,
    viewport: Viewport,
    options: IWorldRendererOptions,
    mapModes: MapModeMap,
  ) {
    this.world = worldMap.world;
    this.worldMap = worldMap;
    this.viewport = viewport;
    this.options = options;
    this.viewOptions = null;

    this.chunkColumns = this.world.size.width / this.options.chunkWidth;
    this.chunkRows = this.world.size.height / this.options.chunkHeight;
    this.renderedChunks = new Array2D<IChunkData>(this.chunkColumns, this.chunkRows);
    this.chunkWorldWidth = this.options.chunkWidth * this.options.cellWidth
    this.chunkWorldHeight = this.options.chunkHeight * this.options.cellHeight

    this.mapModes = {};
    console.log('[ChunkRenderer] init map modes');
    for (const [name, factory] of Object.entries(mapModes)) {
      const mapMode = factory(worldMap, this.options);

      // map mode data update
      if (mapMode.update$) {
        mapMode.update$.subscribe(() => {
          this.updateMapMode(name as EMapMode);
        });
      }
      this.mapModes[name] = mapMode;
    }

    this.chunkContainer = new Container();
    this.chunkContainer.width = this.world.size.width * this.options.cellWidth;
    this.chunkContainer.height = this.world.size.height * this.options.cellHeight;

    this.overpaint = new PIXI.Point(
      this.options.cellWidth * this.options.chunkWidth,
      this.options.cellHeight * this.options.chunkHeight,
    );

    console.log('[ChunkRenderer] draw regions');
    this.chunkCellsMap = new Array2D(this.world.size.width, this.world.size.height);
    for (let x = 0; x < this.chunkColumns; x++) {
      for (let y = 0; y < this.chunkRows; y++) {
        const cells = Array.from(this.mapCellsInChunk(x, y));
        this.chunkCellsMap.set(x, y, cells);
        for (const cell of cells) {
          const cellUpdates$ = this.worldMap.cellRegionUpdate$.get(cell.x, cell.y);
          cellUpdates$.subscribe(region => {
            // cell's region updated
            // console.log(`Cell: ${cell.x}, ${cell.y} Region: `, region);
            this.drawRegion(region);
          });
        }
      }
    }
  }

  private drawRegion(regionID: string) {
    const region = this.worldMap.regionMap.get(regionID);
    let chunksInRegion = {};
    for (const cell of region.cells) {
      const { chunkX, chunkY } = this.getChunkAtCell(cell);
      chunksInRegion[`${chunkX},${chunkY}`] = true;
    }
    for (const chunk of Object.keys(chunksInRegion)) {
      const [chunkX, chunkY] = chunk.split(',');
      this.renderChunkRegions(parseInt(chunkX, 10), parseInt(chunkY, 10));
    }
  }

  private getChunkAtCell(cell: { x: number, y: number }): IChunkRef {
    return {
      chunkX: Math.floor(cell.x / this.options.chunkWidth),
      chunkY: Math.floor(cell.y / this.options.chunkHeight),
    };
  }

  private getCellAtPoint(x: number, y: number) {
    return {
      cellX: Math.floor(x / this.options.cellWidth),
      cellY: Math.floor(y / this.options.cellHeight),
    };
  }

  private getChunkAtPoint(x: number, y: number): IChunkRef {
    const { cellX, cellY } = this.getCellAtPoint(x, y);
    const cell = this.world.getCell(cellX, cellY);
    if (cell === null) {
      throw new Error(`No cell at (${cellX}, ${cellY}) for point (${x}, ${y})`);
    }
    return this.getChunkAtCell(cell);
  }

  private getCellsInChunk(chunkX: number, chunkY: number): IWorldCell[] {
    return this.chunkCellsMap.get(chunkX, chunkY);
  }

  private *mapCellsInChunk(chunkX: number, chunkY: number): IterableIterator<IWorldCell> {
    const { chunkWidth, chunkHeight } = this.options;
    for (let x = chunkX * chunkWidth; x < (chunkX + 1) * chunkWidth; x++) {
      for (let y = chunkY * chunkHeight; y < (chunkY + 1) * chunkHeight; y++) {
        yield this.world.getCell(x, y)
      }
    }
  }

  *mapChunks(): IterableIterator<[number, number, IChunkData]> {
    for (let x = 0; x < this.chunkColumns; x++) {
      for (let y = 0; y < this.chunkRows; y++) {
        yield [x, y, this.renderedChunks.get(x, y)];
      }
    }
  }

  getChunkPosition(chunkX: number, chunkY: number) {
    const { cellWidth, cellHeight, chunkWidth, chunkHeight } = this.options;
    return new Point(
      chunkX * chunkWidth * cellWidth,
      chunkY * chunkHeight * cellHeight,
    );
  }

  @measure('ChunkRenderer.updateMapMode')
  updateMapMode(mapMode: EMapMode) {
    const mapModeInst = this.mapModes[mapMode];
    for (const [x, y, chunk] of this.mapRenderedChunks()) {
      const chunkCells = this.getCellsInChunk(x, y);
      mapModeInst.updateChunk(x, y, chunkCells, this.getChunkPosition(x, y));
      chunk.mapModeSprite.texture.update();
    }
  }

  @measure('ChunkRenderer.updateChunkMapMode')
  updateChunkMapMode(chunkX: number, chunkY: number) {
    const chunk = this.renderedChunks.get(chunkX, chunkY);
    this.renderChunkMapMode(chunkX, chunkY);
    const mapMode = this.mapModes[this.viewOptions.mapMode];
    chunk.mapModeSprite.texture = mapMode.chunkTextures.get(chunkX, chunkY);
  }

  /**
   * Renders the current map mode for the given chunk
   */
  @measure('ChunkRenderer.renderChunkMapMode')
  private renderChunkMapMode(chunkX: number, chunkY: number) {
    const mapMode = this.mapModes[this.viewOptions.mapMode];
    const chunkCells = this.getCellsInChunk(chunkX, chunkY);
    const { cellWidth, cellHeight, chunkWidth, chunkHeight } = this.options;
    const chunkPosition = new Point(
      chunkX * chunkWidth * cellWidth,
      chunkY * chunkHeight * cellHeight,
    );
    mapMode.updateChunk(
      chunkX, chunkY,
      chunkCells,
      chunkPosition,
    );
  }

  @measure('ChunkRenderer.renderChunk')
  private renderChunk(chunkX: number, chunkY: number): IChunkData {
    if (this.renderedChunks.has(chunkX, chunkY)) {
      return this.renderedChunks.get(chunkX, chunkY);
    }
    const { cellWidth, cellHeight, chunkWidth, chunkHeight } = this.options;

    const chunkPosition = new Point(
      chunkX * chunkWidth * cellWidth,
      chunkY * chunkHeight * cellHeight,
    );
    const chunkCells = this.getCellsInChunk(chunkX, chunkY);

    // console.log(`Render Chunk: (${chunkX}, ${chunkY})`);

    const chunk = new Container();
    chunk.width = chunkWidth * cellWidth;
    chunk.height = chunkHeight * cellHeight;
    chunk.x = chunkX * this.chunkWorldWidth;
    chunk.y = chunkY * this.chunkWorldHeight;
    this.chunkContainer.addChild(chunk);

    // render map modes
    const mapModeSprite = new Sprite();

    this.renderChunkMapMode(chunkX, chunkY);
    const mapMode = this.mapModes[this.viewOptions.mapMode];
    mapModeSprite.texture = mapMode.chunkTextures.get(chunkX, chunkY);
    mapModeSprite.texture.update();

    mapModeSprite.interactive = false;
    chunk.addChild(mapModeSprite);

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

    // coastline borders
    const coastlineBorder: Sprite = drawCellBorders(
      chunkCells,
      chunkPosition,
      this.world,
      cellWidth,
      cellHeight,
      this.chunkWorldWidth,
      this.chunkWorldHeight,
      (a: IWorldCell, b: IWorldCell) => a.type === ECellType.LAND && b.type !== ECellType.LAND,
    );
    coastlineBorder.cacheAsBitmap = true;
    coastlineBorder.interactive = false;
    chunk.addChild(coastlineBorder);

    // CHUNK BORDERS

    const rectG = new PIXI.Graphics(true)
    rectG.lineWidth = 1;
    rectG.moveTo(0, 0);
    rectG.lineColor = 0x000;
    rectG.lineTo(this.chunkWorldWidth, 0);
    rectG.lineTo(this.chunkWorldWidth, this.chunkWorldHeight);
    rectG.lineTo(0, this.chunkWorldHeight);
    rectG.lineTo(0, 0);
    const chunkGrid = new Sprite(rectG.generateCanvasTexture());
    chunkGrid.width = this.chunkWorldWidth;
    chunkGrid.height = this.chunkWorldHeight;
    chunk.addChild(chunkGrid);

    // regions
    const chunkRegions = new Container();
    chunk.addChild(chunkRegions);
    const chunkData: IChunkData = {
      container: chunk,
      regions: chunkRegions,
      position: chunkPosition,
      location: new Point(chunkX, chunkY),
      mapModeSprite,
      mapMode: this.viewOptions.mapMode,
      grid: gridSprite,
      flowArrows,
      coastlineBorder,
      chunkGrid,
    };
    this.renderedChunks.set(chunkX, chunkY, chunkData);
    this.renderChunkRegions(chunkX, chunkY);
    return chunkData;
  }

  @measure('ChunkRenderer.renderChunkRegions')
  private renderChunkRegions(chunkX: number, chunkY: number) {
    const chunkCells = this.getCellsInChunk(chunkX, chunkY);
    const { cellWidth, cellHeight } = this.options;
    const chunk = this.renderedChunks.get(chunkX, chunkY);

    if (!chunk) {
      // not drawn yet
      return;
    }
    chunk.regions.removeChildren();
    const chunkRegions = new Set<IWorldRegionView>();
    for (const cell of chunkCells) {
      const regionID = this.worldMap.cellRegionMap.get(cell.x, cell.y);
      if (regionID !== undefined) {
        const region = this.worldMap.regionMap.get(regionID);
        chunkRegions.add(region);
        const g = new Graphics();
        g.alpha = 0.5;
        g.beginFill(region.color);
        g.drawRect(0, 0, cellWidth, cellHeight);
        g.endFill();
        const cellRegionBG = new Sprite(g.generateCanvasTexture());
        cellRegionBG.position.set(
          (cell.x * cellWidth) - chunk.position.x,
          (cell.y * cellHeight) - chunk.position.y,
        );
        chunk.regions.addChild(cellRegionBG);
      }
    }

    for (const region of chunkRegions) {
      const border = drawCellBorders(
        chunkCells,
        chunk.position,
        this.world,
        cellWidth,
        cellHeight,
        this.chunkWorldWidth,
        this.chunkWorldHeight,
        (a: IWorldCell, b: IWorldCell) => {
          const regionA = this.worldMap.cellRegionMap.get(a.x, a.y);
          const regionB = this.worldMap.cellRegionMap.get(b.x, b.y);
          return regionA === region.name && regionB !== region.name;
        },
        region.color,
      );
      border.cacheAsBitmap = true;
      border.interactive = false;
      chunk.regions.addChild(border);
    }
  }

  @measure('ChunkRenderer.renderVisibleChunks')
  private renderVisibleChunks(): void {
    const { chunkX: x1, chunkY: y1 } = this.getChunkAtPoint(
      Math.max(0, this.viewport.left - this.overpaint.x),
      Math.max(0, this.viewport.top - this.overpaint.y),
    );
    const { chunkX: x2, chunkY: y2 } = this.getChunkAtPoint(
      Math.min(this.viewport.right + this.overpaint.x, this.viewport.worldWidth - 1),
      Math.min(this.viewport.bottom + this.overpaint.y, this.viewport.worldHeight - 1),
    );

    for (let x = x1; x <= x2; x++) {
      for (let y = y1; y <= y2; y++) {
        if (this.renderedChunks.has(x, y)) {
          this.renderedChunks.get(x, y).container.visible = true;
        } else {
          window.requestAnimationFrame(() => {
            const chunk = this.renderChunk(x, y);
            this.updateChunk(chunk);
          });
        }
      }
    }
  }

  getVisibleChunks(): IChunkData[] {
    const { chunkX: x1, chunkY: y1 } = this.getChunkAtPoint(
      Math.max(0, this.viewport.left - this.overpaint.x),
      Math.max(0, this.viewport.top - this.overpaint.y),
    );
    const { chunkX: x2, chunkY: y2 } = this.getChunkAtPoint(
      Math.min(this.viewport.right + this.overpaint.x, this.viewport.worldWidth - 1),
      Math.min(this.viewport.bottom + this.overpaint.y, this.viewport.worldHeight - 1),
    );

    const chunks = [];
    for (let x = x1; x <= x2; x++) {
      for (let y = y1; y <= y2; y++) {
        if (this.renderedChunks.has(x, y)) {
          chunks.push(this.renderedChunks.get(x, y));
        }
      }
    }
    return chunks;
  }

  *mapRenderedChunks(): IterableIterator<[number, number, IChunkData]> {
    for (let x = 0; x < this.chunkColumns; x++) {
      for (let y = 0; y < this.chunkRows; y++) {
        if (this.renderedChunks.has(x, y)) {
          yield [x, y, this.renderedChunks.get(x, y)];
        }
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

  @measure('ChunkRenderer.updateChunk')
  updateChunk(chunk: IChunkData) {
    chunk.grid.visible = this.viewOptions.drawGrid;
    chunk.flowArrows.visible = this.viewOptions.showFlowArrows;
    chunk.coastlineBorder.visible = this.viewOptions.drawCoastline;
    chunk.regions.visible = this.viewOptions.showRegions;
    chunk.chunkGrid.visible = this.viewOptions.showFlowArrows;
    if (chunk.mapMode !== this.viewOptions.mapMode) {
      chunk.mapMode = this.viewOptions.mapMode;
      this.updateChunkMapMode(chunk.location.x, chunk.location.y);
    }
  }

  @measure('ChunkRenderer.update')
  public update(viewOptions?: IViewOptions) {
    if (viewOptions) {
      this.viewOptions = viewOptions;
    }
    for (const [x, y, chunk] of this.mapRenderedChunks()) {
      this.updateChunk(chunk);
    }
  }

  @measure('ChunkRenderer.render')
  public render() {
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
  chunkCells: IWorldCell[],
  chunkPosition: Point,
  world: World,
  cellWidth: number,
  cellHeight: number,
  chunkWidth : number,
  chunkHeight: number,
  shouldDraw: (a: IWorldCell, b: IWorldCell) => boolean,
  color: number = 0x000000,
  lineWidth: number = 2,
): PIXI.Sprite {
  const g = new PIXI.Graphics(true);
  g.width = chunkWidth * cellWidth;
  g.height = chunkHeight * cellHeight;

  g.beginFill(color, 0);
  g.drawRect(0, 0, 1, 1);
  g.endFill();

  g.beginFill(color, 1);
  g.lineColor = color;
  g.lineWidth = lineWidth * 0.75;

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

    g.lineWidth = lineWidth * 1;
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
      g.beginFill(color);
      g.drawRect(
        (cx + cellWidth - lineWidth),
        (cy + cellHeight - lineWidth),
        lineWidth,
        lineWidth,
      );
      g.endFill();
    }
    if (cellDownLeft !== null && shouldDraw(cell, cellDownLeft)) {
      g.beginFill(color);
      g.drawRect(
        (cx),
        (cy + cellHeight - lineWidth),
        lineWidth,
        lineWidth,
      );
      g.endFill();
    }
    if (cellUpLeft !== null && shouldDraw(cell, cellUpLeft)) {
      g.beginFill(color);
      g.drawRect(
        (cx),
        (cy),
        lineWidth,
        lineWidth,
      );
      g.endFill();
    }
    if (cellUpRight !== null && shouldDraw(cell, cellUpRight)) {
      g.beginFill(color);
      g.drawRect(
        (cx + cellWidth - lineWidth),
        (cy),
        lineWidth,
        lineWidth,
      );
      g.endFill();
    }
  }
  g.endFill();

  const t = g.generateCanvasTexture();
  const s = new PIXI.Sprite(t);
  return s;
}
