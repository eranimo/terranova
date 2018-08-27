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
      showFlowArrows: false
    },
    isGenerating: false,
  }

  onChangeFlowArrows = (event) => {
    this.setState({
      viewOptions: {
        ...this.state.viewOptions,
        showFlowArrows: !this.state.viewOptions.showFlowArrows,
      }
    })
  }

  async onClickRegen() {
    this.setState({ isGenerating: true });
    await this.props.simulation.init();
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
                <Checkbox
                  inline
                  checked={this.state.viewOptions.showFlowArrows}
                  onChange={this.onChangeFlowArrows}
                  label='Show flow arrows'
                />
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
