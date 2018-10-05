import * as PIXI from 'pixi.js';
import World from '../../simulation/world';
import Viewport from 'pixi-viewport';
import { ChunkRenderer } from './ChunkRenderer';
import WorldUI, { UIEvent } from './WorldUI';
import boxboxIntersection from 'intersects/box-box';
import { IWorldViewerProps } from '../components/WorldViewer';


export interface IWorldRendererOptions {
  cellWidth: number,
  cellHeight: number,
  chunkWidth: number,
  chunkHeight: number,
}

const defaultRendererOptions: IWorldRendererOptions = {
  cellWidth: 10,
  cellHeight: 10,
  chunkWidth: 10,
  chunkHeight: 10,
};

export default class WorldRenderer {
  app: PIXI.Application;
  world: World;
  viewport: Viewport;
  element: HTMLElement;
  options: IWorldRendererOptions;
  worldWidth: number;
  worldHeight: number;

  chunkRenderer: ChunkRenderer;
  worldUI: WorldUI;

  constructor({
    world,
    element,
    options = defaultRendererOptions,
    eventCallbacks
  }: {
    world: World,
    element: HTMLElement,
    options?: IWorldRendererOptions,
    eventCallbacks: Record<string, UIEvent>,
  }) {
    this.world = world;
    this.element = element;
    this.options = options;

    const screenWidth = window.innerWidth;
    const screenHeight = (window.innerHeight - 50);
    this.app = new PIXI.Application({
      width: screenWidth,
      height: screenHeight,
      antialias: false,
      roundPixels: true,
      forceCanvas: false,
      legacy: true,
    });
    (window as any).pixi = this.app;
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    this.worldWidth = world.size.width * options.cellWidth;
    this.worldHeight = world.size.height * options.cellHeight;

    // create viewport
    this.viewport = new Viewport({
      screenWidth,
      screenHeight,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      divWheel: element,
    });
    this.app.stage.addChild(this.viewport);
    this.viewport.moveCenter(this.worldWidth / 2, this.worldHeight / 2);
    this.viewport.zoomPercent(1);
    element.style.cursor = 'default';

    // create chunk renderer
    this.chunkRenderer = new ChunkRenderer(world, options);
    this.viewport.addChild(this.chunkRenderer.chunkContainer);

    // create UI
    this.worldUI = new WorldUI(this, eventCallbacks);
    this.viewport.addChild(this.worldUI.uiContainer);

    console.log(this.viewport);

    this.setupEvents();
    this.renderVisibleChunks();
  }

  private setupEvents() {
    // resize the viewport on window size change
    window.addEventListener('resize', () => {
      this.app.renderer.resize(
        window.innerWidth,
        window.innerHeight - 50
      );
      (this.viewport.resize as any)(
        window.innerWidth,
        window.innerHeight - 50
      );
    }, true);

    this.viewport
      .drag()
      .pinch()
      .wheel()
      .on('drag-end', () => {
        this.element.style.cursor = 'default';
      })
      .on('drag-start', () => {
        this.element.style.cursor = 'grabbing';
      })
      .clampZoom({
        minWidth: this.worldWidth / 15,
        minHeight: this.worldHeight / 15,
        maxWidth: this.worldWidth * 5,
        maxHeight: this.worldHeight * 5,
      })
      // .on('moved', this.renderVisibleChunks.bind(this));
  }

  private renderVisibleChunks() {
    const { chunkX: x1, chunkY: y1 } = this.chunkRenderer.getChunkAtPoint(
      this.viewport.left,
      this.viewport.top,
    );
    const { chunkX: x2, chunkY: y2 } = this.chunkRenderer.getChunkAtPoint(
      this.viewport.right,
      this.viewport.bottom,
    );

    let visibleChunks = 0;
    for (let x = x1; x < x2; x++) {
      for (let y = y1; y < y2; y++) {
        // console.log(`Chunk (${x},${y}) is visible`);
        visibleChunks++;
        this.chunkRenderer.renderChunk(x, y);
      }
    }
    console.log('visible chunks', visibleChunks, this.chunkRenderer.chunkColumns * this.chunkRenderer.chunkRows);
  }

  public update(props: IWorldViewerProps) {

  }
}
