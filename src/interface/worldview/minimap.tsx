import { WorldMap } from "../../common/WorldMap";
import React, { createRef, Component, RefObject, Fragment } from "react";
import { EMapMode, mapModes } from "./mapModes";
import { getHexColor } from "../../utils/color";
import Viewport from 'pixi-viewport';
import { throttle } from "@blueprintjs/core/lib/esm/common/utils";
import { IWorldRendererOptions } from "./WorldRenderer";


interface IMinimapProps {
  worldMap: WorldMap;
  mapMode: EMapMode;
}
export class Minimap extends Component<IMinimapProps> {
  _container: RefObject<HTMLDivElement>;
  _map: RefObject<HTMLCanvasElement>;
  _frame: RefObject<HTMLCanvasElement>;
  isPanning: boolean;
  draw: Function;
  drawFrame: Function;
  widthRatio: number;
  heightRatio: number;

  constructor(props) {
    super(props);
    this._container = createRef();
    this._map = createRef();
    this._frame = createRef();
    this.draw = throttle(this._draw.bind(this));
    this.drawFrame = throttle(this._drawFrame.bind(this));

    if (this.viewport) {
      this.viewport.on('moved', () => {
        this.drawFrame();
      });
    }
  }

  get viewport(): Viewport {
    return ((window as any).WORLD_RENDER_VIEWPORT as Viewport);
  }

  get options(): IWorldRendererOptions {
    return (window as any).WORLD_RENDER_OPTIONS;
  }

  move = (event) => {
    if (this.viewport) {
      const x = event.nativeEvent.offsetX * this.options.cellWidth;
      const y = event.nativeEvent.offsetY * this.options.cellHeight;
      this.viewport.moveCenter(x * this.widthRatio, y * this.heightRatio);
      this.drawFrame();
      (window as any).WORLD_RENDER_DRAW();
    }
  }

  _draw() {
    const { worldMap, mapMode } = this.props;
    const mapModeInst = mapModes[mapMode](worldMap);
    const { width, height } = worldMap.world.size;
    const containerElement = this._container.current;
    const mapElement = this._map.current;
    const frameElement = this._frame.current;
    const imgWidth = 200 * (width / height);
    const imgHeight = 200 * (height / width);
    if (mapElement === null) return;
    mapElement.width = width;
    mapElement.height = height;
    frameElement.width = width;
    frameElement.height = height;
    this.widthRatio = width / imgWidth;
    this.heightRatio = height / imgHeight;
    containerElement.style.width = `${imgWidth}px`;
    containerElement.style.height = `${imgHeight}px`;
    mapElement.style.width = `${imgWidth}px`;
    mapElement.style.height = `${imgHeight}px`;
    frameElement.style.width = `${imgWidth}px`;
    frameElement.style.height = `${imgHeight}px`;
    const ctx = mapElement.getContext('2d');

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const cell = worldMap.world.getCell(x, y);
        ctx.fillStyle = `#${getHexColor(mapModeInst.getCellColor(cell))}`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  _drawFrame() {
    const element = this._frame.current;
    if (element === null) return;
    const { width, height } = this.props.worldMap.world.size;
    const ctx = element.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    if (this.viewport) {
      ctx.strokeStyle = 'white';
      ctx.strokeRect(
        this.viewport.left / this.options.cellWidth,
        this.viewport.top / this.options.cellHeight,
        this.viewport.worldScreenWidth / this.options.cellWidth,
        this.viewport.worldScreenHeight / this.options.cellHeight,
      );
    }
  }

  componentWillReceiveProps(nextProps) {
    this.draw();
    this.drawFrame();
  }

  componentDidMount() {
    this.draw();
    this.drawFrame();
  }

  render() {
    return (
      <div
        style={{ position: 'relative', display: 'table', width: 200, height: 200 }}
        ref={this._container}
      >
        <canvas
          style={{ position: 'absolute' }}
          ref={this._map}
        />
        <canvas
          style={{ position: 'absolute' }}
          ref={this._frame}
          onMouseDown={event => {
            this.isPanning = true;
            this.move(event);
          }}
          onMouseUp={event => {
            this.isPanning = false;
          }}
          onMouseMove={event => {
            if (this.isPanning) {
              this.move(event);
            }
          }}
        />
      </div>
    );
  }
}
