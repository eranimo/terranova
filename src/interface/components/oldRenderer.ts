import Viewport from 'pixi-viewport';
import boxboxIntersection from 'intersects/box-box';
import colormap from 'colormap';
import { groupBy } from 'lodash';
import World, { Cell, ETerrainType, EDirection, climateColors } from '../../simulation/world';


const CELL_WIDTH = 10;
const CELL_HEIGHT = 10;

const PIXELLATED_MOVEMENT = false;

interface IViewState {
  arrowLayer: PIXI.Container;
  mapModeSprites: Record<string, PIXI.Sprite>;
  coastlineBorder: PIXI.Sprite;
  gridLines: PIXI.Sprite;
  hoverCursor: PIXI.Sprite;
  selectedCursor: PIXI.Sprite;
}

const terrainColors = {
  [ETerrainType.OCEAN]: 0x215b77,
  [ETerrainType.LAND]: 0x809973, // replace with Low and High land
  [ETerrainType.RIVER]: 0x5292B5,
  [ETerrainType.LAKE]: 0x4a749b,
  [ETerrainType.COAST]: 0x367593,
  [ETerrainType.MOUNTAIN]: 0x705e55,
}

const directionAngles = {
  [EDirection.NONE]: 0,
  [EDirection.RIGHT]: 90,
  [EDirection.DOWN]: 180,
  [EDirection.LEFT]: 270,
  [EDirection.UP]: 0,
}

const mapModeRenderFunctions = {
  climate: drawClimate,
  terrain: drawTerrain,
  overlay: makeCellOverlay,
  drainage: makeDrainageBasins,
};

interface IMapMode {
  title: string;
  renderFunc: keyof typeof mapModeRenderFunctions;
  options?: Record<string, any>;
}

export enum EMapMode {
  CLIMATE = "climate",
  TERRAIN = "terrain",
  HEIGHT = "height",
  TEMPERATURE = "temperature",
  MOISTURE = "moisture",
  UPSTREAMCOUNT = "upstream_count",
  DRAINAGEBASINS = "drainage_basins",
}

export const mapModes: Record<EMapMode, IMapMode> = {
  [EMapMode.CLIMATE]: {
    title: 'Climate',
    renderFunc: 'climate',
  },
  [EMapMode.TERRAIN]: {
    title: 'Terrain',
    renderFunc: 'terrain',
  },
  [EMapMode.HEIGHT]: {
    title: 'Height',
    renderFunc: 'overlay',
    options: {
      datapoint: 'height',
      colormap: 'bathymetry'
    }
  },
  [EMapMode.TEMPERATURE]: {
    title: 'Temperature',
    renderFunc: 'overlay',
    options: {
      datapoint: 'temperature',
      colormap: 'jet',
    },
  },
  [EMapMode.MOISTURE]: {
    title: 'Moisture',
    renderFunc: 'overlay',
    options: {
      datapoint: 'moisture',
      colormap: 'cool',
    },
  },
  [EMapMode.UPSTREAMCOUNT]: {
    title: 'Upstream Cell Count',
    renderFunc: 'overlay',
    options: {
      datapoint: 'upstreamCount',
      colormap: 'velocity-blue',
    },
  },
  [EMapMode.DRAINAGEBASINS]: {
    title: 'Drainage Basins',
    renderFunc: 'drainage'
  }
}

function rgbToNumber(r: number, g: number, b: number): number {
  return 0x1000000 + b + 0x100 * g + 0x10000 * r;
}

function makeArrowTexture(width: number, height: number): PIXI.Texture {
  const g = new PIXI.Graphics(true);
  g.lineColor = 0x000000;
  g.lineWidth = 1.4;
  g.moveTo(width / 2, height);
  g.lineTo(width / 2, 0);
  g.lineTo(0, height / 2);
  g.moveTo(width / 2, 0);
  g.lineTo(width, height / 2);
  return g.generateCanvasTexture();
}

type TextureMap = { [name: string]: PIXI.Texture };

function makeTerrainTexture(width: number, height: number, color: number): PIXI.Texture {
  const g = new PIXI.Graphics(true);
  g.beginFill(color);
  g.drawRect(0, 0, width, height);
  g.endFill();
  return g.generateCanvasTexture();
}

function makeDrainageBasins(world: World, options: any): PIXI.Sprite {
  const g = new PIXI.Graphics(true);

  g.beginFill(0x000000);
  g.drawRect(0, 0, world.size.width, world.size.height);
  g.endFill();

  for (const basin of world.drainageBasins) {
    g.beginFill(basin.color);
    for (const cell of basin.cells) {
      g.drawRect(
        cell.x * CELL_WIDTH,
        cell.y * CELL_HEIGHT,
        CELL_WIDTH,
        CELL_HEIGHT
      );
    }
    g.endFill();
  }
  return new PIXI.Sprite(g.generateCanvasTexture());
}

function makeCellOverlay(world: World, options: any): PIXI.Sprite {
  const g = new PIXI.Graphics(true);
  const colors: [number, number, number, number][] = colormap({
    nshades: 101,
    format: 'rba',
    colormap: options.colormap
  });
  let item;
  let min = Infinity;
  let max = -Infinity;
  for (const cell of world.cells) {
    item = cell[options.datapoint];
    if (item < min) {
      min = item;
    } else if (item > max) {
      max = item;
    }
  }
  let index: number;
  let color: number[];
  const cellsByColor: Record<number, Cell[]> = {};
  for (const cell of world.cells) {
    index = Math.round(((cell[options.datapoint] - min) / (max - min)) * 100);
    color = colors[index];
    if (!color) {
      throw new Error(`No color for index ${index}`);
    }

    if (index in cellsByColor) {
      cellsByColor[index].push(cell);
    } else {
      cellsByColor[index] = [cell];
    }
  }
  for (const [index, cells] of Object.entries(cellsByColor)) {
    color = colors[index];
    g.beginFill(rgbToNumber(color[0], color[1], color[2]));
    for (const cell of cells) {
      g.drawRect(cell.x, cell.y, 1, 1);
    }
    g.endFill();
  }
  const texture = g.generateCanvasTexture();
  const sprite = new PIXI.Sprite(texture);
  sprite.scale.x = CELL_WIDTH;
  sprite.scale.y = CELL_HEIGHT;
  return sprite;
}

function drawCoastlineBorder(
  world: World,
  shouldDraw: (a: Cell, b: Cell) => boolean,
): PIXI.Sprite {
  const g = new PIXI.Graphics(true);
  g.lineColor = 0x000000;
  g.lineWidth = 1;
  g.lineAlignment = 0.5;
  g.drawRect(0, 0, 1, 1);
  for (const cell of world.cells) {
    const cx = cell.x * CELL_WIDTH;
    const cy = cell.y * CELL_HEIGHT;
    const cellUp = world.getCell(cell.x, cell.y - 1);
    const cellDown = world.getCell(cell.x, cell.y + 1);
    const cellLeft = world.getCell(cell.x - 1, cell.y);
    const cellRight = world.getCell(cell.x + 1, cell.y);

    if (cellUp !== null && shouldDraw(cell, cellUp)) {
      g.moveTo(cx, cy);
      g.lineTo(cx + CELL_WIDTH, cy);
    }
    if (cellDown !== null && shouldDraw(cell, cellDown)) {
      g.moveTo(cx, cy + CELL_HEIGHT);
      g.lineTo(cx + CELL_WIDTH, cy + CELL_HEIGHT);
    }
    if (cellLeft !== null && shouldDraw(cell, cellLeft)) {
      g.moveTo(cx, cy);
      g.lineTo(cx, cy + CELL_HEIGHT);
    }
    if (cellRight !== null && shouldDraw(cell, cellRight)) {
      g.moveTo(cx + CELL_WIDTH, cy);
      g.lineTo(cx + CELL_WIDTH, cy + CELL_HEIGHT);
    }
  }
  return new PIXI.Sprite(g.generateCanvasTexture());
}

function drawGridLines(world: World): PIXI.Sprite {
  const g = new PIXI.Graphics(true);
  g.lineColor = 0x000000;
  g.lineWidth = 1;
  for (let x = 0; x < world.size.width * CELL_WIDTH; x += CELL_WIDTH) {
    g.moveTo(x, 0);
    g.lineTo(x, world.size.height * CELL_HEIGHT);
    for (let y = 0; y < world.size.height * CELL_HEIGHT; y += CELL_HEIGHT) {
      g.moveTo(0, y);
      g.lineTo(world.size.width * CELL_WIDTH, y);
    }
  }
  return new PIXI.Sprite(g.generateCanvasTexture());
}

function drawHoverCursor(width: number, height: number): PIXI.Sprite {
  const g = new PIXI.Graphics(true);
  g.lineColor = 0xFFFFFF;
  g.lineWidth = 1;
  const thirdWidth = width / 3;
  const thirdHeight = height / 3;
  // top left corner
  g.moveTo(0, thirdHeight);
  g.lineTo(0, 0);
  g.lineTo(thirdWidth, 0);

  // top right
  g.moveTo(width - thirdWidth, 0);
  g.lineTo(width, 0);
  g.lineTo(width, thirdHeight);

  // bottom right
  g.moveTo(width, height - thirdHeight);
  g.lineTo(width, height);
  g.lineTo(width - thirdWidth, height);

  // bottom left
  g.moveTo(thirdWidth, height);
  g.lineTo(0, height);
  g.lineTo(0, height - thirdHeight);

  return new PIXI.Sprite(g.generateCanvasTexture());
}

function drawSelectCursor(width: number, height: number): PIXI.Sprite {
  const g = new PIXI.Graphics(true);
  g.lineColor = 0xFFFFFF;
  g.lineWidth = 1;
  g.moveTo(0, 0);
  g.lineTo(0, height - 1);
  g.lineTo(width - 1, height - 1)
  g.lineTo(width - 1, 0);
  g.lineTo(0, 0);
  return new PIXI.Sprite(g.generateCanvasTexture());
}

function drawTerrain(world: World, options: any): PIXI.Sprite {
  const g = new PIXI.Graphics(true);

  g.beginFill(0x000000);
  g.drawRect(0, 0, world.size.width, world.size.height);
  g.endFill();
  const cellsByTerrainType = groupBy(Array.from(world.cells), (cell: Cell) => cell.terrainType);

  for (const [terrain, cells] of Object.entries(cellsByTerrainType)) {
    g.beginFill(terrainColors[terrain]);
    for (const cell of cells) {
      g.drawRect(
        cell.x * CELL_WIDTH,
        cell.y * CELL_HEIGHT,
        CELL_WIDTH,
        CELL_HEIGHT
      );
    }
    g.endFill();
  }

  return new PIXI.Sprite(g.generateCanvasTexture());
}

function drawClimate(world: World, options: any): PIXI.Sprite {
  const g = new PIXI.Graphics(true);

  g.beginFill(0x000000);
  g.drawRect(0, 0, world.size.width, world.size.height);
  g.endFill();

  const deepOceanCells: Cell[] = [];
  const coastalOceanCells: Cell[] = [];
  const landCells: Record<number, Cell[]> = {};

  for (const cell of world.cells) {
    if (
      cell.terrainType === ETerrainType.COAST ||
      cell.terrainType === ETerrainType.LAKE ||
      cell.terrainType === ETerrainType.RIVER
    ) {
      coastalOceanCells.push(cell);
    } else if (cell.terrainType === ETerrainType.OCEAN) {
      deepOceanCells.push(cell);
    } else {
      if (cell.biome in landCells) {
        landCells[cell.biome].push(cell);
      } else {
        landCells[cell.biome] = [cell];
      }
    }
  }

  // draw deep ocean
  g.beginFill(climateColors.ocean.deep);
  for (const cell of deepOceanCells) {
    g.drawRect(cell.x, cell.y, 1, 1);
  }
  g.endFill();

  // draw coast, rivers, lakes
  g.beginFill(climateColors.ocean.coast);
  for (const cell of coastalOceanCells) {
    g.drawRect(cell.x, cell.y, 1, 1);
  }
  g.endFill();

  // draw each biome
  for (const [biome, cells] of Object.entries(landCells)) {
    g.beginFill(climateColors.biomes[biome]);
    for (const cell of cells) {
      g.drawRect(cell.x, cell.y, 1, 1);
    }
    g.endFill();
  }

  const texture = g.generateCanvasTexture();
  const sprite = new PIXI.Sprite(texture);
  sprite.scale.x = CELL_WIDTH;
  sprite.scale.y = CELL_HEIGHT;
  return sprite;
}

class WorldViewRenderer {
  app: PIXI.Application;
  viewport: Viewport;
  layers: Record<string, PIXI.Container>;
  textures: Record<string, PIXI.Texture>;
  cellEvents: Record<string, (cell: Cell) => void>;
  hoverCursor: PIXI.Sprite;
  selectedCursor: PIXI.Sprite;

  constructor({
    world,
    element,
    textures,
    cellEvents,
  }: {
    world: World,
    element: HTMLElement,
    textures: Record<string, PIXI.Texture>,
    cellEvents: {
      onCellClick: (cell: Cell) => void,
    },
  }) {
    console.group('World viewer init');
    console.time('init time');
    this.cellEvents = cellEvents;
    const screenWidth = window.innerWidth;
    const screenHeight = (window.innerHeight - 50);
    const app = new PIXI.Application({
      width: screenWidth,
      height: screenHeight,
      antialias: false,
      roundPixels: true,
      forceCanvas: false,
      legacy: true,
    });
    (window as any).pixi = app;
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    const worldWidth = world.size.width * CELL_WIDTH;
    const worldHeight = world.size.height * CELL_HEIGHT;
    const viewport = new Viewport({
      screenWidth,
      screenHeight,
      worldWidth,
      worldHeight,
      divWheel: element,
    });
    window.addEventListener('resize', this.onResize, true);
    app.stage.addChild(viewport);
    element.style.cursor = 'default';

    const arrowLayer = new PIXI.Container();
    const mapModesLayer = new PIXI.Container();
    arrowLayer.cacheAsBitmap = true;

    const cursors = new PIXI.Container();
    viewport.addChild(cursors);
    const hoverCursor = drawHoverCursor(CELL_WIDTH, CELL_HEIGHT);
    hoverCursor.width = CELL_WIDTH;
    hoverCursor.height = CELL_HEIGHT;
    hoverCursor.position.set(0, 0);
    hoverCursor.interactive = false;
    hoverCursor.alpha = 0;
    cursors.addChild(hoverCursor);

    const selectedCursor = drawSelectCursor(CELL_WIDTH, CELL_HEIGHT);
    selectedCursor.width = CELL_WIDTH;
    selectedCursor.height = CELL_HEIGHT;
    selectedCursor.position.set(0, 0);
    selectedCursor.interactive = false;
    selectedCursor.alpha = 0;
    cursors.addChild(selectedCursor);
    this.hoverCursor = hoverCursor;
    this.selectedCursor = selectedCursor;

    viewport.on('mouseout', () => {
      hoverCursor.alpha = 0;
    });
    viewport.on('mouseover', () => {
      hoverCursor.alpha = 1;
    });
    viewport.on('mousemove', (event: PIXI.interaction.InteractionEvent) => {
      const { offsetX, offsetY } = event.data.originalEvent as MouseEvent;
      const worldPos = viewport.toWorld(new PIXI.Point(offsetX, offsetY));
      const cx = Math.floor(worldPos.x / CELL_WIDTH);
      const cy = Math.floor(worldPos.y / CELL_HEIGHT);
      hoverCursor.position.set(
        cx * CELL_WIDTH,
        cy * CELL_HEIGHT,
      );
    });

    viewport
      .drag()
      .pinch()
      .wheel()
      .on('drag-end', () => {
        element.style.cursor = 'default';
        hoverCursor.alpha = 1;
      })
      .on('drag-start', () => {
        element.style.cursor = 'grabbing';
        hoverCursor.alpha = 0;
      })
      .on('clicked', event => {
        console.log('[viewport event] click', event);
        const cx = Math.floor(event.world.x / CELL_WIDTH);
        const cy = Math.floor(event.world.y / CELL_HEIGHT);
        const cell = world.getCell(cx, cy);
        this.cellEvents.onCellClick(cell);
      })
      .clampZoom({
        minWidth: worldWidth / 15,
        minHeight: worldHeight / 15,
        maxWidth: worldWidth * 5,
        maxHeight: worldHeight * 5,
      });

    if (PIXELLATED_MOVEMENT) {
      viewport
        .on('drag-end', () => {
          viewport.moveCorner(
            Math.round(viewport.left),
            Math.round(viewport.top),
          );
        })
        .on('moved', () => {
          viewport.moveCorner(
            Math.round(viewport.left),
            Math.round(viewport.top),
          );
      });
    }
    viewport.moveCenter(worldWidth / 2, worldHeight / 2);
    viewport.zoom(4);
    (window as any).viewport = viewport;

    this.app = app;
    this.viewport = viewport;
    this.textures = textures;
    this.layers = {
      arrows: arrowLayer,
      mapModes: mapModesLayer,
      cursors: cursors,
    };
    console.timeEnd('init time');
    console.groupEnd();
  }

  onResize = () => {
    this.app.renderer.resize(
      window.innerWidth,
      window.innerHeight - 50
    );
    (this.viewport.resize as any)(
      window.innerWidth,
      window.innerHeight - 50
    );
  }

  private clean(container) {
    while (container.children[0]) {
      container.removeChild(container.children[0]);
    }
  }

  private setup() {
    this.clean(this.viewport);
    this.clean(this.layers.arrows);
    this.clean(this.layers.mapModes);
    this.viewport.addChild(this.layers.mapModes);
    this.viewport.addChild(this.layers.arrows);
    this.viewport.addChild(this.layers.cursors);
  }

  render(world: World): IViewState {
    const mapModeSprites: Record<string, PIXI.Sprite> = {};
    this.setup();
    this.viewport.worldWidth = world.size.width * CELL_WIDTH;
    this.viewport.worldHeight = world.size.height * CELL_HEIGHT;

    console.group('World viewer render');
    console.time('render time');

    // draw map modes
    console.time('building map modes')
    for (const [name, mapMode] of Object.entries(mapModes)) {
      if (!(mapMode.renderFunc in mapModeRenderFunctions)) {
        throw new Error(`Map mode render function "${mapMode.renderFunc}" not found`);
      }
      const func = mapModeRenderFunctions[mapMode.renderFunc];
      console.time(`rendering map mode "${name}"`);
      const mapModeSprite = func(world, mapMode.options);
      console.timeEnd(`rendering map mode "${name}"`);
      mapModeSprite.name = name;
      mapModeSprites[name] = mapModeSprite;
      this.layers.mapModes.addChild(mapModeSprite);
    }
    console.timeEnd('building map modes')

    console.time('building coastline borders')
    const coastlineBorder = drawCoastlineBorder(world, (a: Cell, b: Cell) => (
      a.isLand && !b.isLand
    ));
    this.viewport.addChild(coastlineBorder);
    console.timeEnd('building coastline borders')

    console.time('building grid lines')
    const gridLines = drawGridLines(world);
    gridLines.alpha = 0.75;
    gridLines.interactive = false;
    gridLines.cacheAsBitmap = true;
    this.viewport.addChild(gridLines);
    console.timeEnd('building grid lines')

    const cellSpriteMap = new Map();
    console.time('building cells')
    for (const cell of world.cells) {
      // arrows
      if (cell.terrainType !== ETerrainType.RIVER) continue;
      const arrowSprite = new PIXI.Sprite(this.textures.arrowTexture);
      const PADDING = 3;
      arrowSprite.width = CELL_WIDTH - PADDING;
      arrowSprite.height = CELL_HEIGHT - PADDING;
      arrowSprite.interactive = false;
      arrowSprite.position.set(
        cell.x * CELL_WIDTH + (CELL_WIDTH / 2),
        cell.y * CELL_HEIGHT + (CELL_HEIGHT / 2),
      );
      arrowSprite.anchor.set(
        0.5, 0.5
      )
      arrowSprite.rotation = directionAngles[cell.flowDir] * (Math.PI / 180);
      this.layers.arrows.addChild(arrowSprite);

      cellSpriteMap.set(cell, [arrowSprite]);
    }
    console.timeEnd('building cells')

    // viewport culling
    function cullOffscreenCells() {
      for (const [cell, sprites ] of cellSpriteMap.entries()) {
        for (const sprite of sprites) {
          sprite.visible = boxboxIntersection(
            this.viewport.left,
            this.viewport.top,
            this.viewport.worldScreenWidth,
            this.viewport.worldScreenHeight,
            cell.x * CELL_WIDTH,
            cell.y * CELL_HEIGHT,
            CELL_WIDTH,
            CELL_HEIGHT,
          );
        }
      }
    }
    // viewport.on('moved', cullOffscreenCells);
    // // viewport.zoomPercent(0.25);
    // cullOffscreenCells();

    console.timeEnd('render time');
    console.groupEnd();

    return {
      arrowLayer: this.layers.arrows,
      mapModeSprites,
      coastlineBorder,
      gridLines,
      hoverCursor: this.hoverCursor,
      selectedCursor: this.selectedCursor,
    };
  }
}
