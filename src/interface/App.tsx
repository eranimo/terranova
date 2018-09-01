import React from 'react';
import {
  Navbar,
  NavbarGroup,
  NavbarDivider,
  Button,
  NavbarHeading,
  Alignment,
  Checkbox,
  Popover,
  PopoverInteractionKind,
  Position
} from '@blueprintjs/core';
import { Simulation } from '../simulation';
import WorldViewer, { IViewOptions } from './WorldViewer';


export default class App extends React.Component<{
  simulation: Simulation
}, {
  viewOptions: IViewOptions;
  isGenerating: boolean;
}> {
  state = {
    viewOptions: {
      showFlowArrows: false,
      showDrainageBasinLabels: false,
      showTemperatures: false,
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

  async onClickRegen() {
    this.setState({ isGenerating: true });
    await this.props.simulation.generate();
    this.setState({ isGenerating: false });
  }

  render() {
    const { simulation } = this.props;

    return (
      <div>
        <Navbar>
          <NavbarGroup align={Alignment.LEFT}>
            <NavbarHeading>Terra Nova</NavbarHeading>
            <NavbarDivider />
            <Button
              icon={'refresh'}
              text='Regen'
              minimal
              loading={this.state.isGenerating}
              onClick={this.onClickRegen.bind(this)}
            />
            <Popover
              position={Position.BOTTOM}
              interactionKind={PopoverInteractionKind.CLICK}
            >
              <Button
                text='View Options'
                minimal
                icon={'settings'}
              />
              <div className='tn-popover'>
                <ul className="pt-list-unstyled">
                  <li>
                    <Checkbox
                      inline
                      checked={this.state.viewOptions.showFlowArrows}
                      onChange={this.onChangeField('showFlowArrows')}
                      label='Show flow arrows'
                    />
                  </li>
                  <li>
                    <Checkbox
                      inline
                      checked={this.state.viewOptions.showDrainageBasinLabels}
                      onChange={this.onChangeField('showDrainageBasinLabels')}
                      label='Show drainage basin overlays'
                    />
                  </li>
                  <li>
                    <Checkbox
                      inline
                      checked={this.state.viewOptions.showTemperatures}
                      onChange={this.onChangeField('showTemperatures')}
                      label='Show temperatures'
                    />
                  </li>
                </ul>
              </div>
            </Popover>
          </NavbarGroup>
        </Navbar>
        <main>
          <WorldViewer world={simulation.world} viewOptions={this.state.viewOptions} />
        </main>
      </div>
    )
  }
}
