import React, { ReactElement } from 'react';
import * as PIXI from 'pixi.js';
import World, { Cell, ETerrainType, EDirection, biomeLabelColors, EBiome } from '../simulation/world';
import Viewport from 'pixi-viewport';
import boxboxIntersection from 'intersects/box-box';
import colormap from 'colormap';
import * as _ from 'lodash';


const CELL_WIDTH = 10;
const CELL_HEIGHT = 10;

const terrainTextureColors = {
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
  overlay: makeCellOverlay,
  drainage: makeDrainageBasins,
  biomes: drawBiomes,
};

interface IMapMode {
  title: string;
  renderFunc: keyof typeof mapModeRenderFunctions;
  options?: Record<string, any>;
}

export const mapModes: Record<string, IMapMode> = {
  height: {
    title: 'Height',
    renderFunc: 'overlay',
    options: {
      datapoint: 'height',
      colormap: 'bathymetry'
    }
  },
  temperature: {
    title: 'Temperature',
    renderFunc: 'overlay',
    options: {
      datapoint: 'temperature',
      colormap: 'jet',
    },
  },
  moisture: {
    title: 'Moisture',
    renderFunc: 'overlay',
    options: {
      datapoint: 'moisture',
      colormap: 'cool',
    },
  },
  upstreamCount: {
    title: 'Upstream Cell Count',
    renderFunc: 'overlay',
    options: {
      datapoint: 'upstreamCount',
      colormap: 'velocity-blue',
    },
  },
  drainageBasins: {
    title: 'Drainage Basins',
    renderFunc: 'drainage'
  },
  biomes: {
    title: 'Biomes',
    renderFunc: 'biomes'
  }
}

export interface IViewOptions {
  showFlowArrows: boolean;
  mapMode: string;
  drawCoastline: boolean;
  drawGrid: boolean;
}

interface IViewState {
  app: PIXI.Application;
  terrainLayer: PIXI.Container;
  textLayer: PIXI.Container;
  arrowLayer: PIXI.Container;
  mapModeSprites: Record<string, PIXI.Sprite>;
  coastlineBorder: PIXI.Sprite;
  gridLines: PIXI.Sprite;
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
  const data = [];
  let item;
  let min = Infinity;
  let max = -Infinity;
  for (const cell of world.cells) {
    item = cell[options.datapoint];
    data.push(item);
    if (item < min) {
      min = item;
    } else if (item > max) {
      max = item;
    }
  }
  let index: number;
  let color: number[];
  let colorNum: number;
  for (const cell of world.cells) {
    index = Math.round(((cell[options.datapoint] - min) / (max - min)) * 100);
    color = colors[index];
    if (!color) {
      throw new Error(`No color for index ${index}`);
    }
    colorNum = rgbToNumber(color[0], color[1], color[2]);
    g.beginFill(colorNum);
    g.drawRect(
      cell.x * CELL_WIDTH,
      cell.y * CELL_HEIGHT,
      CELL_WIDTH,
      CELL_HEIGHT
    );
    g.endFill();
  }

  return new PIXI.Sprite(g.generateCanvasTexture());
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

function drawBiomes(world: World, options: any): PIXI.Sprite {
  const g = new PIXI.Graphics(true);

  g.beginFill(0x000000);
  g.drawRect(0, 0, world.size.width, world.size.height);
  g.endFill();

  for (const [biome, color] of Object.entries(biomeLabelColors)) {
    g.beginFill(color);
    for (const cell of world.cells) {
      if (cell.biome === parseInt(biome, 10)) {
        g.drawRect(
          cell.x * CELL_WIDTH,
          cell.y * CELL_HEIGHT,
          CELL_WIDTH,
          CELL_HEIGHT
        );
      }
    }
    g.endFill();
  }
  return new PIXI.Sprite(g.generateCanvasTexture());
}

function createWorldViewer({
  world, textures, element,
}: {
  world: World,
  element: HTMLElement,
  textures: {
    terrainTextures: TextureMap
    arrowTexture: PIXI.Texture,
  },
}): IViewState {
  console.group('World viewer');
  console.time('total time');
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
  window.addEventListener('resize', () => {
    app.renderer.resize(
      window.innerWidth,
      window.innerHeight - 50
    );
    (viewport.resize as any)(
      window.innerWidth,
      window.innerHeight - 50
    );
  }, true);
  app.stage.addChild(viewport);
  viewport
    .drag()
    .wheel()
    .on('drag-end', () => {
      viewport.moveCorner(
        Math.round(viewport.left),
        Math.round(viewport.top),
      );
    })
    // .clampZoom({
    //   minWidth: worldWidth / 4,
    //   minHeight: worldHeight / 4,
    //   maxWidth: worldWidth * 20,
    //   maxHeight: worldHeight * 20,
    // });
  viewport.moveCenter(worldWidth / 2, worldHeight / 2);
  viewport.zoom(4);

  (window as any).viewport = viewport;

  const terrainLayer = new PIXI.Container();
  const textLayer = new PIXI.Container();
  const arrowLayer = new PIXI.Container();
  const mapModesLayer = new PIXI.Container();
  viewport.addChild(terrainLayer);
  viewport.addChild(textLayer);
  viewport.addChild(mapModesLayer);
  viewport.addChild(arrowLayer);
  const mapModeSprites: Record<string, PIXI.Sprite> = {};

  // draw map modes
  console.time('building map modes')
  for (const [name, mapMode] of Object.entries(mapModes)) {
    if (!(mapMode.renderFunc in mapModeRenderFunctions)) {
      throw new Error(`Map mode render function "${mapMode.renderFunc}" not found`);
    }
    const func = mapModeRenderFunctions[mapMode.renderFunc];
    const mapModeSprite = func(world, mapMode.options);
    mapModeSprite.name = name;
    mapModeSprites[name] = mapModeSprite;
    mapModesLayer.addChild(mapModeSprite);
  }
  console.timeEnd('building map modes')

  console.time('building coastline borders')
  const coastlineBorder = drawCoastlineBorder(world, (a: Cell, b: Cell) => (
    a.isLand && !b.isLand
  ));
  viewport.addChild(coastlineBorder);
  console.timeEnd('building coastline borders')

  console.time('building grid lines')
  const gridLines = drawGridLines(world);
  gridLines.alpha = 0.5;
  viewport.addChild(gridLines);
  console.timeEnd('building grid lines')

  const cellSpriteMap = new Map();
  console.time('building cells')
  for (const cell of world.cells) {
    // terrain
    const terrainTexture = textures.terrainTextures[cell.terrainType];
    const terrainSprite = new PIXI.Sprite(terrainTexture);
    terrainSprite.width = CELL_WIDTH;
    terrainSprite.height = CELL_HEIGHT;
    terrainSprite.interactive = false;
    terrainSprite.position.set(
      cell.x * CELL_WIDTH,
      cell.y * CELL_HEIGHT,
    );
    terrainLayer.addChild(terrainSprite);

    // arrows
    const arrowTexture = cell.terrainType === ETerrainType.OCEAN || cell.flowDir === EDirection.NONE
      ? PIXI.Texture.EMPTY
      : textures.arrowTexture;
    const arrowSprite = new PIXI.Sprite(arrowTexture);
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
    arrowLayer.addChild(arrowSprite);

    cellSpriteMap.set(cell, [terrainSprite, arrowSprite]);
  }
  console.timeEnd('building cells')

  terrainLayer.cacheAsBitmap = true;
  arrowLayer.cacheAsBitmap = true;

  // viewport culling
  function cullOffscreenCells() {
    for (const [cell, sprites ] of cellSpriteMap.entries()) {
      for (const sprite of sprites) {
        sprite.visible = boxboxIntersection(
          viewport.left,
          viewport.top,
          viewport.worldScreenWidth,
          viewport.worldScreenHeight,
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

  console.timeEnd('total time');
  console.groupEnd();

  return {
    app,
    terrainLayer,
    textLayer,
    arrowLayer,
    mapModeSprites,
    coastlineBorder,
    gridLines,
  };
}


interface IWorldViewerProps {
  world: World,
  viewOptions: IViewOptions;
}
export default class WorldViewer extends React.Component<IWorldViewerProps> {
  viewState: IViewState;
  root: React.RefObject<HTMLDivElement>;
  textures: TextureMap;
  arrowTexture: PIXI.Texture;

  constructor(props) {
    super(props);
    this.root = React.createRef();
    this.textures = {};
    for (const [terrainType, color] of Object.entries(terrainTextureColors)) {
      this.textures[terrainType] = makeTerrainTexture(CELL_WIDTH, CELL_HEIGHT, color);
    }
    this.arrowTexture = makeArrowTexture(CELL_WIDTH, CELL_HEIGHT);
  }

  componentDidMount() {
    this.viewState = createWorldViewer({
      world: this.props.world,
      element: this.root.current,
      textures: {
        terrainTextures: this.textures,
        arrowTexture: this.arrowTexture,
      },
    });
    this.root.current.appendChild(this.viewState.app.view);
    this.handleViewChanges(this.props);
  }

  componentWillReceiveProps(nextProps: IWorldViewerProps) {
    this.handleViewChanges(nextProps);
  }

  handleViewChanges(props: IWorldViewerProps) {
    this.viewState.arrowLayer.visible = props.viewOptions.showFlowArrows;
    this.viewState.coastlineBorder.visible = props.viewOptions.drawCoastline;
    this.viewState.gridLines.visible = props.viewOptions.drawGrid;
    if (props.viewOptions.mapMode === 'none') {
      for (const name of Object.keys(mapModes)) {
        this.viewState.mapModeSprites[name].visible = false;
      }
    } else {
      for (const name of Object.keys(mapModes)) {
        this.viewState.mapModeSprites[name].visible = props.viewOptions.mapMode === name;
      }
    }
  }

  componentWillUnmount() {
    this.viewState.app.destroy();
  }

  render() {
    return <div ref={this.root} />;
  }
}
