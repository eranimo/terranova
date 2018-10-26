import React from 'react';
import * as PIXI from 'pixi.js';
import { ICell } from '../../simulation/worldTypes';
import World from "../../simulation/World";
import { EMapMode } from '../renderer/mapModes';
import WorldRenderer from '../renderer/WorldRenderer';


export interface IViewOptions {
  showFlowArrows: boolean;
  mapMode: EMapMode;
  drawCoastline: boolean;
  drawGrid: boolean;
  showCursor: boolean;
}

export interface IWorldViewerProps {
  world: World,
  viewOptions: IViewOptions;
  selectedCell: ICell | null;
  onCellClick: (cell: ICell) => void;
}

export class WorldViewer extends React.Component<IWorldViewerProps> {
  root: React.RefObject<HTMLDivElement>;
  arrowTexture: PIXI.Texture;
  renderer: WorldRenderer;

  constructor(props) {
    super(props);
    this.root = React.createRef();
  }

  componentDidMount() {
    this.renderer = new WorldRenderer({
      world: this.props.world,
      element: this.root.current,
      eventCallbacks: {
        onCellClick: this.props.onCellClick,
      }
    });
    console.log(this.renderer);

    // add pixi to the DOM
    this.root.current.appendChild(this.renderer.app.view);

    // directly manipulate the PIXI objects when state changes
    this.updateView(this.props);
  }

  shouldComponentUpdate(nextProps) {
    if (nextProps.selectedCell !== this.props.selectedCell) {
      console.log('select', nextProps.selectedCell);
      this.selectCell(nextProps.selectedCell);
    }
    if (nextProps.world != this.props.world) {
      console.log('update WorldViewer', this.props.world);
      this.renderer = new WorldRenderer({
        world: nextProps.world,
        element: this.root.current,
        eventCallbacks: {
          onCellClick: this.props.onCellClick,
        }
      });
      this.updateView(this.props);
    }
    this.updateView(nextProps);
    return false;
  }

  updateView(props: IWorldViewerProps) {
    this.renderer.onStateChange(props);
  }

  componentWillUnmount() {
    this.renderer.destroy();
  }

  selectCell(cell: ICell) {
    if (cell === null) {
      this.renderer.worldUI.children.selectedCursor.alpha = 0;
    } else {
      this.renderer.worldUI.children.selectedCursor.alpha = 1;
      this.renderer.worldUI.children.selectedCursor.position.set(
        cell.x * this.renderer.options.cellWidth,
        cell.y * this.renderer.options.cellHeight,
      );
    }
  }

  render() {
    return <div id="worldviewer" ref={this.root} />;
  }
}
