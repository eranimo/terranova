import { WorldMap } from "../../common/WorldMap";
import React, { createRef, Component, RefObject } from "react";
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
  root: RefObject<HTMLCanvasElement>;
  isPanning: boolean;
  draw: Function;

  constructor(props) {
    super(props);
    this.root = createRef();
    this.draw = throttle(this._draw.bind(this));

    if (this.viewport) {
      this.viewport.on('moved', () => this.draw());
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
      this.viewport.moveCenter(x, y);
      this.draw();
    }
  }

  _draw() {
    const { worldMap, mapMode } = this.props;
    const mapModeInst = mapModes[mapMode](worldMap);
    const { width, height } = worldMap.world.size;

    const element = this.root.current;
    if (element === null) return;
    element.width = width;
    element.height = height;
    const ctx = element.getContext('2d');

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const cell = worldMap.world.getCell(x, y);
        ctx.fillStyle = `#${getHexColor(mapModeInst.getCellColor(cell))}`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

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
  }

  componentDidMount() {
    this.draw();
  }

  render() {
    return (
      <canvas
        ref={this.root}
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
    );
  }
}
