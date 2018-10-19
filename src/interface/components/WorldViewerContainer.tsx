import React, { Component, Fragment } from 'react';
import { WorldViewer, IViewOptions } from './WorldViewer';
import { mapModes, EMapMode, mapModeDesc } from '../renderer/mapModes';
import World, { Cell, biomeTitles, directionLabels, cellFeatureLabels, temperatureZoneTitles, moistureZoneTitles } from '../../simulation/world';
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
  ControlGroup,
  InputGroup,
  FormGroup,
  ButtonGroup,
  Classes,
} from '@blueprintjs/core';
import styled from 'styled-components';
import WorldStats from '../components/WorldStats';
import copy from 'clipboard-copy';


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
          <ButtonGroup minimal>
            <Popover
              position={Position.BOTTOM}
              interactionKind={PopoverInteractionKind.CLICK}
            >
              <Button
                text="Export"
                icon="export"
                rightIcon={'caret-down'}
                disabled={world === null}
              />
              <div className='tn-popover'>
                <FormGroup
                  label="Export world config"
                  helperText={<span>The above string can be used to<br />replicate this world</span>}
                >
                  <ControlGroup>
                    <InputGroup value={world.exportString} />
                    <Button
                      icon="clipboard"
                      style={{ width: 50 }}
                      onClick={() => copy(world.exportString)}
                    />
                  </ControlGroup>
                </FormGroup>
              </div>
            </Popover>
            <Popover
              position={Position.BOTTOM}
              interactionKind={PopoverInteractionKind.CLICK}
            >
              <Button
                text='World Stats'
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
                icon={'settings'}
                rightIcon={'caret-down'}
              />
              <div className='tn-popover'>
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
            <Popover
              position={Position.BOTTOM_RIGHT}
              interactionKind={PopoverInteractionKind.CLICK}
            >
              <Button
                icon={'map'}
                rightIcon={'caret-down'}
              >
                Map Mode: <b>{mapModeDesc[viewOptions.mapMode]}</b>
              </Button>
              <div className='tn-popover'>
                <RadioGroup
                  label="Map Modes"
                  onChange={onChangeMapMode}
                  selectedValue={viewOptions.mapMode}
                >
                  {Object.entries(mapModeDesc).map(([name, title]) => (
                    <Radio
                      key={name}
                      label={title}
                      value={name}
                    />
                  ))}
                </RadioGroup>
              </div>
            </Popover>
          </ButtonGroup>
        </NavbarGroup>
      </Navbar>
    )
  }
}

const CellDetailContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  background-color: rgba(57, 75, 89, 0.90);
  border-top: 1px solid ${Colors.DARK_GRAY3};
  border-right: 1px solid ${Colors.DARK_GRAY3};
  border-top-right-radius: 5px;
  padding: 1rem;
  width: 320px;
  height: 220px;
  box-shadow: 0 0 4px 2px rgba(16, 22, 26, 0.2);
  z-index: 100;
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
              <td>Terrain features</td>
              <td>{cellFeatureLabels[cell.feature]}</td>
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
            <tr>
              <td>Temperature Zone</td>
              <td>{temperatureZoneTitles[cell.temperatureZone]}</td>
            </tr>
            <tr>
              <td>Moisture Zone</td>
              <td>{moistureZoneTitles[cell.moistureZone]}</td>
            </tr>
          </tbody>
        </table>
      </CellDetailContainer>
    )
  }
}

const initialViewOptions: IViewOptions = {
  showFlowArrows: false,
  drawCoastline: true,
  drawGrid: false,
  mapMode: EMapMode.CLIMATE,
  showCursor: true,
};

@HotkeysTarget
export class WorldViewerContainer extends Component<{
  world: World,
  isLoading: boolean,
  renderControls?: () => React.ReactNode,
}, {
  viewOptions: IViewOptions;
  selectedCell: Cell | null;
}> {
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

  shouldComponentUpdate(nextProps) {
    if (this.props.world != nextProps.world) {
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
    const { world, isLoading, renderControls } = this.props;

    let viewer = null;
    if (world !== null) {
      viewer = (
        <Fragment>
          {isLoading && (
            <LoadingWorld>
              <Spinner />
            </LoadingWorld>
          )}
          <WorldViewer
            key={world.exportString}
            world={world}
            viewOptions={this.state.viewOptions}
            selectedCell={this.state.selectedCell}
            onCellClick={this.onCellClick}
          />
        </Fragment>
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
          key={world.exportString}
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
