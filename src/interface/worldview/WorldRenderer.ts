import * as PIXI from 'pixi.js';
import World from "../../simulation/World";
import Viewport from 'pixi-viewport';
import { ChunkRenderer } from './ChunkRenderer';
import WorldUI, { UIEvent } from './WorldUI';
import { IWorldMapProps } from './WorldMap';
import { debounce, pick } from 'lodash';
import { EMapMode, MapModeMap } from './mapModes';


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

interface IViewportState {
  corner: {
    x: number,
    y: number,
  };
  scale: {
    x: number,
    y: number,
  };
}


/**
 * WorldRenderer
 * - container for PIXI
 * - controls Viewport
 * - handles renderer state
 * - renders UI elements
 *   - legend
 *   - selected cell indicator
 *   - hovered cell indicator
 */
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
  state: IWorldMapProps;
  textures: Record<string, PIXI.Texture>;
  legends: Partial<Record<EMapMode, PIXI.Sprite>>;

  constructor({
    world,
    element,
    options = defaultRendererOptions,
    mapModes,
    eventCallbacks
  }: {
    world: World,
    element: HTMLElement,
    options?: IWorldRendererOptions,
    mapModes: MapModeMap,
    eventCallbacks: Record<string, UIEvent>,
  }) {
    this.world = world;
    this.element = element;
    this.options = options;
    this.worldWidth = world.size.width * options.cellWidth;
    this.worldHeight = world.size.height * options.cellHeight;

    // setup PIXI
    this.app = new PIXI.Application({
      autoResize: true,
      antialias: false,
      roundPixels: true,
      forceCanvas: false,
      legacy: true,
      resolution: devicePixelRatio,
    });
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    element.style.cursor = 'default';
    element.appendChild(this.app.view);

    // create viewport
    this.viewport = new Viewport({
      screenWidth: this.app.screen.width,
      screenHeight: this.app.screen.height,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      divWheel: element,
    });
    this.app.stage.addChild(this.viewport);
    this.viewport.moveCenter(this.worldWidth / 2, this.worldHeight / 2);
    this.viewport.zoomPercent(1/3);

    // create chunk renderer
    this.chunkRenderer = new ChunkRenderer(world, this.viewport, this.options, mapModes);
    this.viewport.addChild(this.chunkRenderer.chunkContainer);

    // create UI
    this.worldUI = new WorldUI(this, eventCallbacks);
    this.viewport.addChild(this.worldUI.uiContainer);

    // create map mode legends
    this.legends = {};
    const legendContainer = new PIXI.Container();
    this.app.stage.addChild(legendContainer);
    for (const [name, mapMode] of Object.entries(this.chunkRenderer.mapModes)) {
      if (mapMode.renderLegend && mapMode.showLegend) {
        const legend = mapMode.renderLegend();
        legend.interactive = false;
        legend.interactiveChildren = false;
        this.legends[name] = legend;
        legendContainer.addChild(legend);
      }
    }

    // load viewport state from localStorage
    const loadedState: IViewportState = JSON.parse(localStorage.getItem('viewportState'));
    if (loadedState) {
      try {
        this.viewport.scale.set(loadedState.scale.x, loadedState.scale.y);
        this.viewport.moveCorner(loadedState.corner.x, loadedState.corner.y);
      } catch (error) {
        console.warn('Removing obsolete viewport state');
        localStorage.removeItem('viewportState');
      }
    }

    (window as any).renderer = this;

    this.setupEvents();
    this.resize();

    console.time('initial chunk render time');
    this.chunkRenderer.render();
    console.timeEnd('initial chunk render time');
  }

  resize() {
    this.app.renderer.resize(
      this.element.clientWidth,
      this.element.clientHeight,
    );
    (this.viewport.resize as any)(
      this.app.renderer.screen.width,
      this.app.renderer.screen.height,
      this.worldWidth,
      this.worldHeight
    );
    Object.values(this.legends).forEach(legend => {
      const legendBounds = legend.getBounds();
      legend.position.set(
        this.app.renderer.screen.width - legendBounds.width,
        this.app.renderer.screen.height - legendBounds.height,
      );
    });
  }

  updateViewportState = debounce(() => {
    localStorage.setItem('viewportState', JSON.stringify({
      corner: pick(this.viewport.corner, ['x', 'y']),
      scale: pick(this.viewport.scale, ['x', 'y']),
    }));
  }, 1000);

  onResize = () => {
    if (this.app.renderer === null) return;
    this.resize();
    this.chunkRenderer.render();
    this.update();
  }

  public destroy() {
    window.removeEventListener('resize', this.onResize);
    this.app.destroy();
  }

  private setupEvents() {
    // resize the viewport on window size change
    window.addEventListener('resize', this.onResize, true);

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
        this.updateViewportState();
      })
      // .on('drag-end', () => {
      //   this.viewport.moveCorner(
      //     Math.round(this.viewport.left),
      //     Math.round(this.viewport.top),
      //   );
      // })
      // .on('moved', () => {
      //   this.viewport.moveCorner(
      //     Math.round(this.viewport.left),
      //     Math.round(this.viewport.top),
      //   );
      // });
  }

  public onStateChange(mapViewerProps: IWorldMapProps) {
    this.state = mapViewerProps;
    this.update();
  }

  public update() {
    if (!this.state) {
      throw new Error('Must call onStateChange() before update()');
    }
    for (const chunk of this.chunkRenderer.mapChunks()) {
      if (chunk) {
        chunk.grid.visible = this.state.viewOptions.drawGrid;
        chunk.flowArrows.visible = this.state.viewOptions.showFlowArrows;
        chunk.coastlineBorder.visible = this.state.viewOptions.drawCoastline;

        for (const [mapMode, sprite] of Object.entries(chunk.mapModes)) {
          const visible = this.state.viewOptions.mapMode === mapMode;
          if (mapMode in this.legends) {
            (this.legends[mapMode] as PIXI.Sprite).visible = visible;
          }
          sprite.visible = visible;
        }
      }
    }
    this.worldUI.children.hoverCursor.visible = this.state.viewOptions.showCursor
  }
}
