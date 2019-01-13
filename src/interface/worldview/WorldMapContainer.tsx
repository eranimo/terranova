import React, { Component, Fragment } from 'react';
import { WorldRendererContainer, IViewOptions } from './WorldRendererContainer';
import { EMapMode, MapModeMap } from './mapModes';
import { IWorldCell } from '../../simulation/worldTypes';
import World from "../../simulation/World";
import {
  Spinner,
  HotkeysTarget,
  Hotkeys,
  Hotkey,
} from '@blueprintjs/core';
import styled from 'styled-components';
import { WorldMap } from '../../common/WorldMap';


const LoadingWorld = styled.div`
  position: fixed;
  z-index: 100;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(39, 52, 61, 0.5);
`;

const initialViewOptions: IViewOptions = {
  showFlowArrows: false,
  drawCoastline: true,
  drawGrid: false,
  mapMode: EMapMode.CLIMATE,
  showCursor: true,
};

export interface IWorldMapContainerChildProps {
  viewOptions: IViewOptions,
  selectedCell: IWorldCell,
  onChangeField: (fieldName: keyof IViewOptions) => (event: any) => void,
  onChangeMapMode: (mapMode: EMapMode) => void,
  deselect: () => void,
}

interface IWorldMapContainerProps {
  worldMap: WorldMap;
  isLoading: boolean;
  mapModes: MapModeMap;
  children: ({
    viewOptions,
    selectedCell,
    onChangeField,
    onChangeMapMode,
    deselect,
  }: IWorldMapContainerChildProps) => React.ReactChild;
  style?: any;
}

interface IWorldMapContainerState {
  viewOptions: IViewOptions;
  selectedCell: IWorldCell | null;
}

@HotkeysTarget
export default class WorldMapContainer extends Component<IWorldMapContainerProps, IWorldMapContainerState> {
  constructor(props) {
    super(props);
    let loadedViewOptions = JSON.parse(localStorage.getItem('viewOptions'));
    if (initialViewOptions) {
      for (const key in Object.keys(initialViewOptions)) {
        if (!(key in Object.keys(initialViewOptions))) {
          console.warn('View options from local storage incompatible');
          loadedViewOptions = null;
        }
      }
    }

    this.state = {
      viewOptions: loadedViewOptions || initialViewOptions,
      selectedCell: null,
    }
  }

  componentDidUpdate() {
    localStorage.setItem('viewOptions', JSON.stringify(this.state.viewOptions));
  }

  onChangeField = (fieldName: keyof IViewOptions) => (event) => {
    this.setState({
      viewOptions: {
        ...this.state.viewOptions,
        [fieldName]: !this.state.viewOptions[fieldName],
      }
    })
  }

  onChangeMapMode = mapMode => {
    this.setState({
      viewOptions: {
        ...this.state.viewOptions,
        mapMode,
      },
    });
  }
  onCellClick = (cell: IWorldCell) => {
    const index = this.props.worldMap.world.getTileIndex(cell.x, cell.y);
    console.log('tile index:', index);
    if (this.state.selectedCell == cell) {
      // deselect
      this.setState({ selectedCell: null });
    } else {
      // select
      this.setState({ selectedCell: cell });
    }
  }

  deselect = () => {
    this.setState({ selectedCell: null })
  }

  shouldComponentUpdate(nextProps) {
    if (this.props.worldMap != nextProps.worldMap) {
      this.setState({ selectedCell: null });
    }
    return true;
  }

  renderHotkeys() {
    return (
      <Hotkeys>
        <Hotkey
          global
          combo="esc"
          label="Deselect current cell"
          onKeyDown={this.deselect}
        />
        <Hotkey
          global
          combo="shift + g"
          label="Toggle grid"
          onKeyDown={this.onChangeField('drawGrid')}
        />
        <Hotkey
          global
          combo="shift + c"
          label="Toggle cursor"
          onKeyDown={this.onChangeField('showCursor')}
        />
        <Hotkey
          global
          combo="shift + f"
          label="Toggle flow directions"
          onKeyDown={this.onChangeField('showFlowArrows')}
        />
        <Hotkey
          global
          combo="shift + o"
          label="Toggle coastline border"
          onKeyDown={this.onChangeField('drawCoastline')}
        />
      </Hotkeys>
    )
  }

  render() {
    const { worldMap, isLoading, children, mapModes } = this.props;

    if (worldMap !== null) {
      return (
        <Fragment>
          {isLoading && (
            <LoadingWorld>
              <Spinner />
            </LoadingWorld>
          )}
          {children({
            viewOptions: this.state.viewOptions,
            selectedCell: this.state.selectedCell,
            onChangeField: this.onChangeField,
            onChangeMapMode: this.onChangeMapMode,
            deselect: this.deselect,
          })}
          <WorldRendererContainer
            key={worldMap.world.hash}
            worldMap={worldMap}
            viewOptions={this.state.viewOptions}
            selectedCell={this.state.selectedCell}
            onCellClick={this.onCellClick}
            mapModes={mapModes}
            {...this.props}
          />
        </Fragment>
      );
    }
    return (
      <LoadingWorld>
        <Spinner />
      </LoadingWorld>
    );
  }
}
