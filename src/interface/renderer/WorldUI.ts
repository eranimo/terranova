import { Sprite, Container } from 'pixi.js';
import Viewport from 'pixi-viewport';
import WorldRenderer from './WorldRenderer';
import { ICell } from '../../simulation/worldTypes';
import { isFunction } from 'lodash';
import { drawHoverCursor, drawSelectCursor } from './textures';


export type UIEvent = (cell: ICell) => void | Function;

export default class WorldUI {
  renderer: WorldRenderer;
  viewport: Viewport;
  uiContainer: Container;
  children: Record<string, Sprite>;
  eventCallbacks: Record<string, UIEvent>;

  constructor(
    renderer: WorldRenderer,
    eventCallbacks: Record<string, UIEvent> = {}
  ) {
    this.renderer = renderer;
    this.viewport = renderer.viewport;

    this.uiContainer = new Container();
    this.uiContainer.width = renderer.worldWidth;
    this.uiContainer.height = renderer.worldHeight;

    this.eventCallbacks = eventCallbacks;
    this.children = {};
    this.render();
    this.setupEvents();
  }

  render() {
    const { cellWidth, cellHeight } = this.renderer.options;

    const hoverCursor = new Sprite(drawHoverCursor(cellWidth + 1, cellHeight + 1));
    hoverCursor.width = cellWidth + 1;
    hoverCursor.height = cellHeight + 1;
    hoverCursor.position.set(0, 0);
    hoverCursor.interactive = false;
    hoverCursor.alpha = 0;
    this.uiContainer.addChild(hoverCursor);

    const selectedCursor = new Sprite(drawSelectCursor(cellWidth + 1, cellHeight + 1));
    selectedCursor.width = cellWidth + 1;
    selectedCursor.height = cellHeight + 1;
    selectedCursor.position.set(0, 0);
    selectedCursor.interactive = false;
    selectedCursor.alpha = 0;
    this.uiContainer.addChild(selectedCursor);

    this.children = { hoverCursor, selectedCursor };
  }

  setupEvents() {
    const { cellWidth, cellHeight } = this.renderer.options;
    const { width, height } = this.renderer.world.size;
    let isOffscreen = true;

    this.viewport
      .on('mouseout', () => {
        this.children.hoverCursor.alpha = 0;
        isOffscreen = true;
      })
      .on('mouseover', () => {
        this.children.hoverCursor.alpha = 1;
        isOffscreen = false;
      })
      .on('mousemove', (event: PIXI.interaction.InteractionEvent) => {
        const { offsetX, offsetY } = event.data.originalEvent as MouseEvent;
        const worldPos = this.viewport.toWorld(new PIXI.Point(offsetX, offsetY));
        const cx = Math.floor(worldPos.x / cellWidth);
        const cy = Math.floor(worldPos.y / cellHeight);
        if (cx < 0 || cy < 0 || cx > width - 1 || cy > height - 1) {
          this.children.hoverCursor.alpha = 0;
          return;
        } else if (!isOffscreen) {
          this.children.hoverCursor.alpha = 1;
        }
        this.children.hoverCursor.position.set(
          cx * cellWidth,
          cy * cellHeight,
        );
      })
      .on('drag-end', () => {
        this.children.hoverCursor.alpha = 1;
      })
      .on('drag-start', () => {
        this.children.hoverCursor.alpha = 0;
      })
      .on('clicked', event => {
        console.log('[viewport event] click', event);
        const cx = Math.floor(event.world.x / cellWidth);
        const cy = Math.floor(event.world.y / cellHeight);
        const cell = this.renderer.world.getCell(cx, cy);
        if (isFunction(this.eventCallbacks.onCellClick)) {
          this.eventCallbacks.onCellClick(cell);
        }
      });
  }
}
