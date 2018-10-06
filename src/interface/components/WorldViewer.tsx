import React from 'react';
import * as PIXI from 'pixi.js';
import World, { Cell } from '../../simulation/world';
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
  selectedCell: Cell | null;
  onCellClick: (cell: Cell) => void;
}

export class WorldViewer extends React.Component<IWorldViewerProps> {
  // viewState: IViewState;
  root: React.RefObject<HTMLDivElement>;
  // textures: TextureMap;
  arrowTexture: PIXI.Texture;
  renderer: WorldRenderer;

  constructor(props) {
    super(props);
    this.root = React.createRef();
    // this.textures = {};
    // this.arrowTexture = makeArrowTexture(CELL_WIDTH, CELL_HEIGHT);
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
    // this.viewState = this.renderer.render(this.props.world);

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
      // this.viewState = this.renderer.render(this.props.world);
      this.updateView(this.props);
    }
    this.updateView(nextProps);
    return false;
  }

  updateView(props: IWorldViewerProps) {
    this.renderer.onStateChange(props);
  }

  componentWillUnmount() {
    this.renderer.app.destroy();
  }

  selectCell(cell: Cell) {
    // if (cell === null) {
    //   this.viewState.selectedCursor.alpha = 0;
    // } else {
    //   this.viewState.selectedCursor.alpha = 1;
    //   this.viewState.selectedCursor.position.set(
    //     cell.x * CELL_WIDTH,
    //     cell.y * CELL_HEIGHT
    //   );
    // }
  }

  render() {
    return <div ref={this.root} />;
  }
}
