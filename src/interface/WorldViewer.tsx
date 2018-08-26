import React, { ReactElement } from 'react';
import * as PIXI from 'pixi.js';
import World, { ETerrainType, EDirection } from '../simulation/world';
import Viewport from 'pixi-viewport';
import boxboxIntersection from 'intersects/box-box';

const CELL_WIDTH = 10;
const CELL_HEIGHT = 10;

const terrainTextureColors = {
  [ETerrainType.OCEAN]: 0x4783A0,
  [ETerrainType.LAND]: 0x809973,
  [ETerrainType.RIVER]: 0x5292B5,
  [ETerrainType.STREAM]: 0x379ea8,
  [ETerrainType.LAKE]: 0xB5FADE,
}

const directionAngles = {
  [EDirection.NONE]: 0,
  [EDirection.RIGHT]: 90,
  [EDirection.DOWN]: 180,
  [EDirection.LEFT]: 270,
  [EDirection.UP]: 0,
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

function makeTerrainTexture(width: number, height: number, color: number): PIXI.Texture {
  const g = new PIXI.Graphics();
  g.beginFill(color);
  g.drawRect(0, 0, width, height);
  g.endFill();
  return g.generateCanvasTexture();
}

function createWorldViewer(
  world: World,
  textures: {
    terrainTextures: TextureMap
    arrowTexture: PIXI.Texture,
  },
): PIXI.Application {
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
    worldHeight: world.size.height * CELL_HEIGHT
  });
  app.stage.addChild(viewport);
  viewport
    .drag()
    .wheel();

  const terrainLayer = new PIXI.Container();
  const textLayer = new PIXI.Container();
  const arrowLayer = new PIXI.Container();
  viewport.addChild(terrainLayer);
  viewport.addChild(textLayer);
  viewport.addChild(arrowLayer);

  const cellSpriteMap = new Map();
  for (const cell of world.cells) {
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

  return app;
}


export default class WorldViewer extends React.Component<{
  world: World,
}> {
  app: PIXI.Application;
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
    this.app = createWorldViewer(this.props.world, {
      terrainTextures: this.textures,
      arrowTexture: this.arrowTexture,
    })
    this.root.current.appendChild(this.app.view);
  }

  componentWillUnmount() {
    this.app.destroy();
  }

  render() {
    return <div ref={this.root} />;
  }
}
