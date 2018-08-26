import React, { ReactElement } from 'react';
import * as PIXI from 'pixi.js';
import World, { ETerrainType } from '../simulation/world';
import Viewport from 'pixi-viewport';
import boxboxIntersection from 'intersects/box-box';

const CELL_WIDTH = 10;
const CELL_HEIGHT = 10;

const terrainTextureColors = {
  [ETerrainType.OCEAN]: 0x4783A0,
  [ETerrainType.LAND]: 0x809973,
  [ETerrainType.RIVER]: 0x5292B5,
  [ETerrainType.LAKE]: 0xB5FADE,
}

type TextureMap = { [name: string]: PIXI.Texture };

function makeTerrainTexture(width: number, height: number, color: number): PIXI.Texture {
  const g = new PIXI.Graphics();
  g.beginFill(color);
  g.drawRect(0, 0, width, height);
  g.endFill();
  return g.generateCanvasTexture();
}

function createWorldViewer(world: World, textures: TextureMap): PIXI.Application {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight - 50;
  const app = new PIXI.Application({
    width: screenWidth,
    height: screenHeight
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
  viewport.addChild(terrainLayer);
  const sprites = new Set();

  const cellSpriteMap = new Map();
  for (const cell of world.cells) {
    const terrainTexture = textures[cell.terrainType];
    const terrainSprite = new PIXI.Sprite(terrainTexture);
    terrainSprite.width = CELL_WIDTH;
    terrainSprite.height = CELL_HEIGHT;
    terrainSprite.interactive = false;
    terrainSprite.position.set(
      cell.x * CELL_WIDTH,
      cell.y * CELL_HEIGHT,
    );
    cellSpriteMap.set(cell, terrainSprite);
    terrainLayer.addChild(terrainSprite);
  }

  // viewport culling
  function cullOffscreenCells() {
    for (const [cell, sprite ] of cellSpriteMap.entries()) {
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

  constructor(props) {
    super(props);
    this.root = React.createRef();
    this.textures = {};
    for (const [terrainType, color] of Object.entries(terrainTextureColors)) {
      this.textures[terrainType] = makeTerrainTexture(CELL_WIDTH, CELL_HEIGHT, color);
    }
  }

  componentDidMount() {
    this.app = createWorldViewer(this.props.world, this.textures)
    this.root.current.appendChild(this.app.view);
  }

  componentWillUnmount() {
    this.app.destroy();
  }

  render() {
    return <div ref={this.root} />;
  }
}
