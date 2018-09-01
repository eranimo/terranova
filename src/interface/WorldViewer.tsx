import React, { ReactElement } from 'react';
import * as PIXI from 'pixi.js';
import World, { ETerrainType, EDirection } from '../simulation/world';
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

export interface IViewOptions {
  showFlowArrows: boolean;
  showDrainageBasinLabels: boolean;
  showTemperatures: boolean;
}

interface IViewState {
  app: PIXI.Application;
  terrainLayer: PIXI.Container;
  textLayer: PIXI.Container;
  arrowLayer: PIXI.Container;
  overlayLayer: PIXI.Container;
  temperatureOverlay: PIXI.Sprite;
}

function rgbToNumber(r: number, g: number, b: number): number {
  return 0x1000000 + b + 0x100 * g + 0x10000 * r;
}

function makeArrowTexture(width: number, height: number): PIXI.Texture {
  const g = new PIXI.Graphics();
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
  const g = new PIXI.Graphics();
  g.beginFill(color);
  g.drawRect(0, 0, width, height);
  g.endFill();
  return g.generateCanvasTexture();
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
  const screenHeight = window.innerHeight - 50;
  const app = new PIXI.Application({
    width: screenWidth,
    height: screenHeight,
    antialias: false,
    roundPixels: true,
  });

  const viewport = new Viewport({
    screenWidth,
    screenHeight,
    worldWidth: world.size.width * CELL_WIDTH,
    worldHeight: world.size.height * CELL_HEIGHT,
    divWheel: element
  });
  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight - 50);
    (viewport.resize as any)(window.innerWidth, window.innerHeight - 50);
  }, true);
  app.stage.addChild(viewport);
  viewport
    .drag()
    .wheel();
  // viewport.fitWorld();

  const terrainLayer = new PIXI.Container();
  const textLayer = new PIXI.Container();
  const arrowLayer = new PIXI.Container();
  const overlayLayer = new PIXI.Container();
  viewport.addChild(terrainLayer);
  viewport.addChild(textLayer);
  viewport.addChild(overlayLayer);
  viewport.addChild(arrowLayer);

  // temperature overlays
  const temperatureG = new PIXI.Graphics();
  const temperatureColors: [number, number, number, number][] = colormap({ nshades: 101, format: 'rba' });
  const temps = Array.from(world.cells).map(cell => cell.temperature);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  for (const cell of world.cells) {
    const index = Math.round(((cell.temperature - minTemp) / (maxTemp - minTemp)) * 100);
    const color = temperatureColors[index];
    if (!color) {
      throw new Error(`No color for index ${index}`);
    }
    const colorNum = rgbToNumber(color[0], color[1], color[2]);
    temperatureG.beginFill(colorNum);
    temperatureG.drawRect(
      cell.x * CELL_WIDTH,
      cell.y * CELL_HEIGHT,
      CELL_WIDTH,
      CELL_HEIGHT
    );
    temperatureG.endFill();
  }

  const temperatureOverlay = new PIXI.Sprite(temperatureG.generateCanvasTexture());
  // temperatureOverlay.alpha = 0.5;
  viewport.addChild(temperatureOverlay);

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
    arrowSprite.width = CELL_WIDTH;
    arrowSprite.height = CELL_HEIGHT;
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

    // drainage basin overlay
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
    overlayLayer.addChild(overlay);


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
    overlayLayer,
    temperatureOverlay,
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
    this.viewState.overlayLayer.visible = props.viewOptions.showDrainageBasinLabels;
    this.viewState.temperatureOverlay.visible = props.viewOptions.showTemperatures;
  }

  componentWillUnmount() {
    this.viewState.app.destroy();
  }

  render() {
    return <div ref={this.root} />;
  }
}
