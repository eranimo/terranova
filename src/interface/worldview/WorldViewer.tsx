import React, { Component, Fragment, ChangeEvent } from 'react';
import { WorldRendererContainer, IViewOptions } from './WorldRendererContainer';
import { mapModes, EMapMode, mapModeDesc } from './mapModes';
import { IWorldCell } from '../../simulation/worldTypes';
import { biomeTitles, directionLabels, cellFeatureLabels, temperatureZoneTitles, moistureZoneTitles, terrainTypeLabels } from "../../simulation/labels";
import World from "../../simulation/World";
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
  Colors,
  ControlGroup,
  InputGroup,
  FormGroup,
  ButtonGroup,
} from '@blueprintjs/core';
import styled from 'styled-components';
import WorldStats from '../components/WorldStats';
import copy from 'clipboard-copy';
import WorldMapContainer from './WorldMapContainer';
import { FullSizeBlock } from '../components/layout';
import { WorldMap } from '../../common/WorldMap';
import { Minimap } from './minimap';


class WorldViewerHeader extends Component <{
  worldMap: WorldMap,
  viewOptions: IViewOptions,
  onChangeMapMode: (event: any) => any,
  onChangeField: (field: string) => any,
  renderControls?: () => React.ReactNode,
}> {
  render() {
    const { renderControls, viewOptions, onChangeMapMode, onChangeField, worldMap } = this.props;
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
                text="Minimap"
                icon="map"
                rightIcon={'caret-down'}
                disabled={worldMap === null}
              />
              <div className='tn-popover'>
                <Minimap worldMap={worldMap} mapMode={viewOptions.mapMode} />
              </div>
            </Popover>
            <Popover
              position={Position.BOTTOM}
              interactionKind={PopoverInteractionKind.CLICK}
            >
              <Button
                text="Export"
                icon="export"
                rightIcon={'caret-down'}
                disabled={worldMap === null}
              />
              <div className='tn-popover'>
                <FormGroup
                  label="Export world config"
                  helperText={<span>The above string can be used to<br />replicate this world</span>}
                >
                  <ControlGroup>
                    <InputGroup value={worldMap.world.exportString} readOnly />
                    <Button
                      icon="clipboard"
                      style={{ width: 50 }}
                      onClick={() => copy(worldMap.world.exportString)}
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
                disabled={worldMap === null}
              />
              {worldMap ? <WorldStats world={worldMap.world} /> : null}
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
                  onChange={(event: any) => onChangeMapMode(event.target.value)}
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
  height: 290px;
  box-shadow: 0 0 4px 2px rgba(16, 22, 26, 0.2);
  z-index: 100;
  overflow-y: auto;
`;

class CellDetail extends Component<{
  cell: IWorldCell,
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
              <td>Height</td>
              <td>{cell.height}</td>
            </tr>
            <tr>
              <td>Feature</td>
              <td>{cellFeatureLabels[cell.feature]}</td>
            </tr>
            {cell.terrainType !== 0 && <tr>
              <td>Terrain type</td>
              <td>{terrainTypeLabels[cell.terrainType]}</td>
            </tr>}
            <tr>
              <td>Is River?</td>
              <td>{cell.riverType > 0 ? 'Yes' : 'No'}</td>
            </tr>
            {cell.biome !== 0 && <tr>
              <td>Biome</td>
              <td>{biomeTitles[cell.biome]}</td>
            </tr>}
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


interface IWorldViewerProps {
  worldMap: WorldMap,
  isLoading: boolean,
  renderControls?: () => React.ReactNode,
}
export default class WorldViewer extends Component<IWorldViewerProps> {
  render() {
    const { worldMap, renderControls, isLoading } = this.props;

    return (
      <FullSizeBlock>
        <WorldMapContainer
          worldMap={worldMap}
          isLoading={isLoading}
          mapModes={mapModes}
        >
          {({ viewOptions, selectedCell, onChangeField, onChangeMapMode, deselect }) => (
            <Fragment>
              <WorldViewerHeader
                key={worldMap.world.hash}
                worldMap={worldMap}
                viewOptions={viewOptions}
                onChangeField={onChangeField}
                onChangeMapMode={onChangeMapMode}
                renderControls={renderControls}
              />
              {selectedCell !== null
                ? <CellDetail
                    cell={selectedCell}
                    handleClose={deselect}
                  />
                : null}
            </Fragment>
          )}
        </WorldMapContainer>
      </FullSizeBlock>
    )
  }
}
