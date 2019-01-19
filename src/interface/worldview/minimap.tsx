import { WorldMap } from "../../common/WorldMap";
import React, { createRef, Component, RefObject } from "react";
import { EMapMode, mapModes } from "./mapModes";
import { getHexColor } from "../../utils/color";


interface IMinimapProps {
  worldMap: WorldMap;
  mapMode: EMapMode;
}
export class Minimap extends Component<IMinimapProps> {
  root: RefObject<HTMLCanvasElement>;

  constructor(props) {
    super(props);
    this.root = createRef();
  }

  draw() {
    const { worldMap, mapMode } = this.props;
    console.log('draw', worldMap, mapMode);
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
  }

  componentWillReceiveProps(nextProps) {
    this.draw();
  }

  componentDidMount() {
    this.draw();
  }

  render() {
    return <canvas ref={this.root} />;
  }
}
