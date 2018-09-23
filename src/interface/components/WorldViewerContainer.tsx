import React, { Component } from 'react';
import { WorldViewer, IViewOptions, mapModes, EMapMode } from './WorldViewer';
import World from '../../simulation/world';
import {
  Navbar,
  NavbarGroup,
  NavbarDivider,
  Button,
  NavbarHeading,
  Alignment,
  Checkbox,
  RadioGroup,
  Radio,
  Popover,
  PopoverInteractionKind,
  Position,
  Label,
} from '@blueprintjs/core';
import styled from 'styled-components';

const WorldViewerWrapper = styled.div`
  display: block;
`;


export class WorldViewerContainer extends React.Component<{
  world: World,
  renderControls?: () => React.ReactNode
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
    const { world, renderControls } = this.props;

    return (
      <WorldViewerWrapper>
        <Navbar>
          <NavbarGroup align={Alignment.LEFT}>
            <NavbarHeading>Terra Nova</NavbarHeading>
            <NavbarDivider />
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
                  onChange={this.onChangeMapMode}
                  selectedValue={this.state.viewOptions.mapMode}
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
                      checked={this.state.viewOptions.showFlowArrows}
                      onChange={this.onChangeField('showFlowArrows')}
                      label='Flow direction arrows'
                    />
                  </li>
                  <li>
                    <Checkbox
                      inline
                      checked={this.state.viewOptions.drawCoastline}
                      onChange={this.onChangeField('drawCoastline')}
                      label='Coastline borders'
                    />
                  </li>
                  <li>
                    <Checkbox
                      inline
                      checked={this.state.viewOptions.drawGrid}
                      onChange={this.onChangeField('drawGrid')}
                      label='Grid Lines'
                    />
                  </li>
                </ul>
              </div>
            </Popover>
            <NavbarDivider />
          </NavbarGroup>
          {renderControls
              ? renderControls()
              : null}
        </Navbar>
        <div>
          <WorldViewer world={world} viewOptions={this.state.viewOptions} />
        </div>
      </WorldViewerWrapper>
    )
  }
}
