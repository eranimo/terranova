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
  state: IWorldViewerProps;
  textures: Record<string, PIXI.Texture>;

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
    this.viewport.zoomPercent(1/3);
    element.style.cursor = 'default';

    // create chunk renderer
    this.chunkRenderer = new ChunkRenderer(world, this.viewport, options);
    this.viewport.addChild(this.chunkRenderer.chunkContainer);

    // create UI
    this.worldUI = new WorldUI(this, eventCallbacks);
    this.viewport.addChild(this.worldUI.uiContainer);

    this.setupEvents();

    console.time('initial chunk render time');
    this.chunkRenderer.render();
    console.timeEnd('initial chunk render time');
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
      .on('moved', () => {
        this.chunkRenderer.render();
        this.update();
      });
  }

  public onStateChange(mapViewerProps: IWorldViewerProps) {
    this.state = mapViewerProps;
    this.update();
  }

  public update() {
    for (const chunk of this.chunkRenderer.mapChunks()) {
      if (chunk) {
        chunk.grid.visible = this.state.viewOptions.drawGrid;
        chunk.arrows.visible = this.state.viewOptions.showFlowArrows;
      }
    }
    // this.viewState.arrowLayer.visible = mapViewerProps.viewOptions.showFlowArrows;
    // this.viewState.coastlineBorder.visible = mapViewerProps.viewOptions.drawCoastline;
    // this.viewState.gridLines.visible = mapViewerProps.viewOptions.drawGrid;
    // this.viewState.hoverCursor.visible = mapViewerProps.viewOptions.showCursor;
    // for (const name of Object.keys(mapModes)) {
    //   this.viewState.mapModeSprites[name].visible = mapViewerProps.viewOptions.mapMode === name;
    // }
  }
}
