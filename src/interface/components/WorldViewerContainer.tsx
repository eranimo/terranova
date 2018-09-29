import React, { Component } from 'react';
import { WorldViewer, IViewOptions, mapModes, EMapMode } from './WorldViewer';
import World, { Cell, biomeTitles, directionLabels, terrainTypeLabels } from '../../simulation/world';
import {
  Navbar,
  NavbarGroup,
  Button,
  Alignment,
  Checkbox,
  RadioGroup,
  Radio,
  Popover,
  PopoverInteractionKind,
  Position,
  Label,
  Spinner,
  Colors,
  HotkeysTarget,
  Hotkeys,
  Hotkey,
} from '@blueprintjs/core';
import styled from 'styled-components';
import WorldStats from '../components/WorldStats';


const LoadingWorld = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(39, 52, 61, 0.5);
`;

class WorldViewerHeader extends Component <{
  world: World,
  viewOptions: IViewOptions,
  onChangeMapMode: (event: any) => any,
  onChangeField: (field: string) => any,
  renderControls?: () => React.ReactNode,
}> {
  render() {
    const { renderControls, viewOptions, onChangeMapMode, onChangeField, world } = this.props;
    return (
      <Navbar>
        {renderControls ? renderControls() : null}
        <NavbarGroup align={Alignment.RIGHT}>
          <Popover
            position={Position.BOTTOM}
            interactionKind={PopoverInteractionKind.CLICK}
          >
            <Button
              text='World Stats'
              minimal
              icon={'panel-stats'}
              rightIcon={'caret-down'}
              disabled={world === null}
            />
            {world ? <WorldStats world={world} /> : null}
          </Popover>
          <Popover
            position={Position.BOTTOM}
            interactionKind={PopoverInteractionKind.CLICK}
          >
            <Button
              text='View Options'
              minimal
              icon={'settings'}
              rightIcon={'caret-down'}
            />
            <div className='tn-popover'>
              <RadioGroup
                label="Map Modes"
                onChange={onChangeMapMode}
                selectedValue={viewOptions.mapMode}
              >
                {Object.entries(mapModes).map(([name, mapMode]) => (
                  <Radio
                    key={name}
                    label={mapMode.title}
                    value={name}
                  />
                ))}
              </RadioGroup>
              <Label>View Options</Label>
              <ul className="bp3-list-unstyled">
                <li>
                  <Checkbox
                    inline
                    checked={viewOptions.showFlowArrows}
                    onChange={onChangeField('showFlowArrows')}
                    label='Flow direction arrows'
                  />
                </li>
                <li>
                  <Checkbox
                    inline
                    checked={viewOptions.drawCoastline}
                    onChange={onChangeField('drawCoastline')}
                    label='Coastline borders'
                  />
                </li>
                <li>
                  <Checkbox
                    inline
                    checked={viewOptions.drawGrid}
                    onChange={onChangeField('drawGrid')}
                    label='Grid Lines'
                  />
                </li>
                <li>
                  <Checkbox
                    inline
                    checked={viewOptions.showCursor}
                    onChange={onChangeField('showCursor')}
                    label='Show cursor'
                  />
                </li>
              </ul>
            </div>
          </Popover>
        </NavbarGroup>
      </Navbar>
    )
  }
}

const CellDetailContainer = styled.div`
  position: absolute;
  bottom: 0;
  background-color: rgba(57, 75, 89, 0.90);
  border-top: 1px solid ${Colors.DARK_GRAY3};
  border-right: 1px solid ${Colors.DARK_GRAY3};
  border-top-right-radius: 5px;
  padding: 1rem;
  width: 320px;
  height: 180px;
  overflow-y: auto;
  box-shadow: 0 0 4px 2px rgba(16, 22, 26, 0.2);
`;

class CellDetail extends Component<{
  cell: Cell,
  handleClose: () => void,
}> {
  render() {
    const { cell, handleClose } = this.props;

    return (
      <CellDetailContainer>
        <h3 className="bp3-heading">
          Cell ({cell.x}, {cell.y})
          <Button
            icon="cross"
            style={{ float: 'right' }}
            minimal
            onClick={handleClose}
          />
        </h3>
        <table className="detail-table">
          <tbody>
            <tr>
              <td>Terrain type</td>
              <td>{terrainTypeLabels[cell.terrainType]}</td>
            </tr>
            <tr>
              <td>Biome</td>
              <td>{biomeTitles[cell.biome]}</td>
            </tr>
            <tr>
              <td>Temperature</td>
              <td>{cell.temperature} &deg;C</td>
            </tr>
            <tr>
              <td>Moisture</td>
              <td>{cell.moisture.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Upstream count</td>
              <td>{cell.upstreamCount.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Flow Direction</td>
              <td>{directionLabels[cell.flowDir]}</td>
            </tr>
          </tbody>
        </table>
      </CellDetailContainer>
    )
  }
}

@HotkeysTarget
export class WorldViewerContainer extends Component<{
  world: World,
  isLoading: boolean,
  renderControls?: () => React.ReactNode,
}, {
  viewOptions: IViewOptions;
  selectedCell: Cell | null;
}> {
  state = {
    viewOptions: {
      showFlowArrows: false,
      drawCoastline: true,
      drawGrid: false,
      mapMode: EMapMode.CLIMATE,
      showCursor: true,
    },
    selectedCell: null,
    isGenerating: false,
  }

  onChangeField = (fieldName: keyof IViewOptions) => (event) => {
    this.setState({
      viewOptions: {
        ...this.state.viewOptions,
        [fieldName]: !this.state.viewOptions[fieldName],
      }
    })
  }

  onChangeMapMode = event => {
    this.setState({
      viewOptions: {
        ...this.state.viewOptions,
        mapMode: event.target.value
      },
    });
  }
  onCellClick = (cell: Cell) => {
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
    const { world, isLoading, renderControls } = this.props;

    let viewer = null;
    if (world !== null) {
      viewer = (
        <div>
          {isLoading && (
            <LoadingWorld>
              <Spinner />
            </LoadingWorld>
          )}
          <WorldViewer
            world={world}
            viewOptions={this.state.viewOptions}
            selectedCell={this.state.selectedCell}
            onCellClick={this.onCellClick}
          />
        </div>
      );
    } else {
      viewer = (
        <LoadingWorld>
          <Spinner />
        </LoadingWorld>
      );
    }

    return (
      <div style={{ position: 'relative' }}>
        <WorldViewerHeader
          world={world}
          viewOptions={this.state.viewOptions}
          onChangeField={this.onChangeField}
          onChangeMapMode={this.onChangeMapMode}
          renderControls={renderControls}
        />
        {viewer}
        {this.state.selectedCell !== null
          ? <CellDetail
              cell={this.state.selectedCell}
              handleClose={this.deselect}
            />
          : null}
      </div>
    )
  }
}
