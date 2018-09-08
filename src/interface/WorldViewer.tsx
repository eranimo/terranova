import React, { ReactElement } from 'react';
import * as PIXI from 'pixi.js';
import World, { Cell, ETerrainType, EDirection, biomeColors, EBiome } from '../simulation/world';
import Viewport from 'pixi-viewport';
import boxboxIntersection from 'intersects/box-box';
import colormap from 'colormap';


const CELL_WIDTH = 10;
const CELL_HEIGHT = 10;

const terrainTextureColors = {
  [ETerrainType.OCEAN]: 0x4783A0,
  [ETerrainType.LAND]: 0x809973,
  [ETerrainType.RIVER]: 0x5292B5,
  [ETerrainType.LAKE]: 0xB5FADE,
}

const directionAngles = {
  [EDirection.NONE]: 0,
  [EDirection.RIGHT]: 90,
  [EDirection.DOWN]: 180,
  [EDirection.LEFT]: 270,
  [EDirection.UP]: 0,
}

export interface ICellOverlay {
  title: string;
  datapoint: string;
  colormap: string;
}

export const cellOverlays: { [name: string]: ICellOverlay } = {
  height: {
    title: 'Height',
    datapoint: 'height',
    colormap: 'bathymetry',
  },
  temperature: {
    title: 'Temperature',
    datapoint: 'temperature',
    colormap: 'jet',
  },
  moisture: {
    title: 'Moisture',
    datapoint: 'moisture',
    colormap: 'cool',
  },
  upstreamCount: {
    title: 'Upstream Cell Count',
    datapoint: 'upstreamCount',
    colormap: 'velocity-blue',
  }
}

export interface IViewOptions {
  showFlowArrows: boolean;
  showDrainageBasinLabels: boolean;
  overlay: string;
  drawCoastline: boolean;
  drawGrid: boolean;
  showBiomes: boolean;
}

interface IViewState {
  app: PIXI.Application;
  terrainLayer: PIXI.Container;
  textLayer: PIXI.Container;
  arrowLayer: PIXI.Container;
  drainageBasinLayer: PIXI.Container;
  overlays: {
    [name: string]: PIXI.Sprite;
  };
  coastlineBorder: PIXI.Sprite;
  gridLines: PIXI.Sprite;
  biomeSprite: PIXI.Sprite;
}

function rgbToNumber(r: number, g: number, b: number): number {
  return 0x1000000 + b + 0x100 * g + 0x10000 * r;
}

function makeArrowTexture(width: number, height: number): PIXI.Texture {
  const g = new PIXI.Graphics(true);
  g.lineColor = 0x000000;
  g.lineWidth = 1;
  g.moveTo(width / 2, height);
  g.lineTo(width / 2, 0);
  g.lineTo(0, height / 2);
  g.moveTo(width / 2, 0);
  g.lineTo(width, height / 2);
  return g.generateCanvasTexture();
}

type TextureMap = { [name: string]: PIXI.Texture };
let drainageTextureCache = {};

function makeTerrainTexture(width: number, height: number, color: number): PIXI.Texture {
  const g = new PIXI.Graphics(true);
  g.beginFill(color);
  g.drawRect(0, 0, width, height);
  g.endFill();
  return g.generateCanvasTexture();
}

function makeCellOverlay(world: World, overlay: ICellOverlay): PIXI.Sprite {
  const g = new PIXI.Graphics(true);
  const colors: [number, number, number, number][] = colormap({
    nshades: 101,
    format: 'rba',
    colormap: overlay.colormap
  });
  const data = Array.from(world.cells).map(cell => cell[overlay.datapoint]);
  const min = Math.min(...data);
  const max = Math.max(...data);
  for (const cell of world.cells) {
    const index = Math.round(((cell[overlay.datapoint] - min) / (max - min)) * 100);
    const color = colors[index];
    if (!color) {
      throw new Error(`No color for index ${index}`);
    }
    const colorNum = rgbToNumber(color[0], color[1], color[2]);
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

function drawBiomes(world: World) {
  const g = new PIXI.Graphics(true);
  g.drawRect(0, 0, 1, 1);
  for (const [biome, color] of Object.entries(biomeColors)) {
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
  const drainageBasinLayer = new PIXI.Container();
  const overlayLayer = new PIXI.Container();
  viewport.addChild(terrainLayer);
  viewport.addChild(textLayer);
  viewport.addChild(drainageBasinLayer);
  viewport.addChild(overlayLayer);
  viewport.addChild(arrowLayer);
  const overlays: { [name: string]: PIXI.Sprite } = {};

  // draw cell overlays
  for (const [name, overlay] of Object.entries(cellOverlays)) {
    const overlaySprite = makeCellOverlay(world, overlay);
    overlaySprite.name = name;
    overlays[name] = overlaySprite;
    overlayLayer.addChild(overlaySprite);
  }

  const coastlineBorder = drawCoastlineBorder(world, (a: Cell, b: Cell) => (
    a.isLand && !b.isLand
  ));
  viewport.addChild(coastlineBorder);


  const biomeSprite = drawBiomes(world);
  viewport.addChild(biomeSprite);

  const gridLines = drawGridLines(world);
  gridLines.alpha = 0.5;
  viewport.addChild(gridLines);

  const cellSpriteMap = new Map();
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
    arrowSprite.width = CELL_WIDTH - 5;
    arrowSprite.height = CELL_HEIGHT - 5;
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

    // drainage basin labels
    let overlayT;
    if (cell.drainageBasin) {
      if (cell.drainageBasin.id in drainageTextureCache) {
        overlayT = drainageTextureCache[cell.drainageBasin.id];
      } else {
        const overlayG = new PIXI.Graphics();
        overlayG.beginFill(cell.drainageBasin.color);
        overlayG.drawRect(0, 0, CELL_WIDTH, CELL_HEIGHT);
        overlayG.endFill();
        overlayT = overlayG.generateCanvasTexture();
        drainageTextureCache[cell.drainageBasin.id] = overlayT;
      }
    } else {
      overlayT = PIXI.Texture.EMPTY;
    }
    const overlay = new PIXI.Sprite(overlayT);
    overlay.width = CELL_WIDTH;
    overlay.height = CELL_HEIGHT;
    overlay.interactive = false;
    overlay.position.set(
      cell.x * CELL_WIDTH,
      cell.y * CELL_HEIGHT,
    );
    drainageBasinLayer.addChild(overlay);


    cellSpriteMap.set(cell, [terrainSprite, arrowSprite]);

    // if (cell.terrainType != ETerrainType.OCEAN) {
    //   const text = new PIXI.Text(cell.height.toString(), { fontSize: 8 });
    //   text.x = cell.x * CELL_WIDTH;
    //   text.y = cell.y * CELL_HEIGHT;
    //   text.width = CELL_WIDTH;
    //   text.height = CELL_HEIGHT;
    //   text.cacheAsBitmap = true;
    //   text.interactiveChildren = false;
    //   text.interactive = false;
    //   textLayer.addChild(text);

    //   cellSpriteMap.set(cell, [terrainSprite, text]);
    // } else {
    //   cellSpriteMap.set(cell, [terrainSprite]);
    // }
  }

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
  viewport.on('moved', cullOffscreenCells);
  // viewport.zoomPercent(0.25);
  cullOffscreenCells();

  return {
    app,
    terrainLayer,
    textLayer,
    arrowLayer,
    drainageBasinLayer,
    overlays,
    coastlineBorder,
    gridLines,
    biomeSprite,
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
    this.viewState.drainageBasinLayer.visible = props.viewOptions.showDrainageBasinLabels;
    this.viewState.coastlineBorder.visible = props.viewOptions.drawCoastline;
    this.viewState.gridLines.visible = props.viewOptions.drawGrid;
    this.viewState.biomeSprite.visible = props.viewOptions.showBiomes;
    if (props.viewOptions.overlay === 'none') {
      for (const name of Object.keys(cellOverlays)) {
        this.viewState.overlays[name].visible = false;
      }
    } else {
      for (const name of Object.keys(cellOverlays)) {
        this.viewState.overlays[name].visible = props.viewOptions.overlay === name;
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
