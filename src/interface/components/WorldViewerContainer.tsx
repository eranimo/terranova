import React, { Component, ReactNode } from 'react';
import { WorldViewer, IViewOptions, mapModes, EMapMode } from './WorldViewer';
import World from '../../simulation/world';
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
} from '@blueprintjs/core';
import styled from 'styled-components';

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
  viewOptions: IViewOptions,
  onChangeMapMode: (event: any) => any,
  onChangeField: (field: string) => any,
  renderControls?: () => React.ReactNode,
}> {
  render() {
    const { renderControls, viewOptions, onChangeMapMode, onChangeField } = this.props;
    return (
      <Navbar>
        {renderControls ? renderControls() : null}
        <NavbarGroup align={Alignment.RIGHT}>
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
              <Label text="View Options" />
              <ul className="pt-list-unstyled">
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
              </ul>
            </div>
          </Popover>
        </NavbarGroup>
      </Navbar>
    )
  }
}


export class WorldViewerContainer extends Component<{
  world: World,
  isLoading: boolean,
  renderControls?: () => React.ReactNode,
}, {
  viewOptions: IViewOptions;
}> {
  state = {
    viewOptions: {
      showFlowArrows: false,
      drawCoastline: true,
      drawGrid: false,
      mapMode: EMapMode.CLIMATE,
    },
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
          viewOptions={this.state.viewOptions}
          onChangeField={this.onChangeField}
          onChangeMapMode={this.onChangeMapMode}
          renderControls={renderControls}
        />
        {viewer}
      </div>
    )
  }
}
