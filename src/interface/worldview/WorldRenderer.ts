import { WorldMap } from './../../common/WorldMap';
import * as PIXI from 'pixi.js';
import World from "../../simulation/World";
import Viewport from 'pixi-viewport';
import { ChunkRenderer } from './ChunkRenderer';
import WorldUI, { UIEvent } from './WorldUI';
import { IWorldMapProps, IViewOptions } from './WorldRendererContainer';
import { debounce, pick, meanBy } from 'lodash';
import { EMapMode, MapModeMap } from './mapModes';
import { IWorldRegionView } from '../../simulation/WorldRegion';


export interface IWorldRendererOptions {
  cellWidth: number,
  cellHeight: number,
  chunkWidth: number,
  chunkHeight: number,
}

const defaultRendererOptions: IWorldRendererOptions = {
  cellWidth: 10,
  cellHeight: 10,
  chunkWidth: 25,
  chunkHeight: 25,
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

interface IWorldRendererState {
  viewOptions: IViewOptions;
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
  worldMap: WorldMap;
  viewport: Viewport;
  element: HTMLElement;
  options: IWorldRendererOptions;
  worldWidth: number;
  worldHeight: number;

  chunkRenderer: ChunkRenderer;
  worldUI: WorldUI;
  state: IWorldRendererState;
  textures: Record<string, PIXI.Texture>;
  legends: Partial<Record<EMapMode, PIXI.Sprite>>;
  labelContainer: PIXI.Container;
  labels: Record<string, PIXI.Text>;

  constructor({
    worldMap,
    element,
    options = defaultRendererOptions,
    mapModes,
    eventCallbacks
  }: {
    worldMap: WorldMap,
    element: HTMLElement,
    options?: IWorldRendererOptions,
    mapModes: MapModeMap,
    eventCallbacks: Record<string, UIEvent>,
  }) {
    this.world = worldMap.world;
    this.worldMap = worldMap;
    this.element = element;
    this.options = options;
    this.worldWidth = this.world.size.width * options.cellWidth;
    this.worldHeight = this.world.size.height * options.cellHeight;

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
    (window as any).WORLD_RENDER_VIEWPORT = this.viewport;
    (window as any).WORLD_RENDER_OPTIONS = options;
    this.app.stage.addChild(this.viewport);
    this.viewport.moveCenter(this.worldWidth / 2, this.worldHeight / 2);
    this.viewport.zoomPercent(1/3);

    // create chunk renderer
    this.chunkRenderer = new ChunkRenderer(worldMap, this.viewport, this.options, mapModes);
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

    // region labels
    this.labelContainer = new PIXI.Container();
    this.viewport.addChild(this.labelContainer);
    this.labels = {};
    worldMap.regionUpdate$.subscribe(this.drawLabel.bind(this));

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

  private drawLabel(region: IWorldRegionView) {
    const labelX = meanBy(region.cells, i => i.x * this.options.cellWidth);
    const labelY = meanBy(region.cells, i => i.y * this.options.cellHeight);

    let label: PIXI.Text;
    if (region.name in this.labels) {
      label = this.labels[region.name];
    } else {
      label = new PIXI.Text(region.name, {
        fontSize: 10,
        dropShadow: true,
        fontFamily: 'Helvetica',
        dropShadowDistance: 0,
        dropShadowColor: 'white',
        dropShadowBlur: 5,
      });
      this.labels[region.name] = label;
      this.labelContainer.addChild(label);
    }
    console.log(label);

    label.position.set(labelX, labelY);
    label.anchor.set(0.5, 0.5);
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
      });
  }

  public onStateChange(mapViewerProps: IWorldMapProps) {
    this.state = mapViewerProps;
    this.update();
  }

  public update() {
    if (!this.state) {
      throw new Error('Must call onStateChange() before update()');
    }
    this.chunkRenderer.update(this.state.viewOptions);
    for (const [mapMode, sprite] of Object.entries(this.chunkRenderer.mapModes)) {
      const visible = this.state.viewOptions.mapMode === mapMode;
      if (mapMode in this.legends) {
        (this.legends[mapMode] as PIXI.Sprite).visible = visible;
      }
    }
    this.worldUI.children.hoverCursor.visible = this.state.viewOptions.showCursor
  }
}
