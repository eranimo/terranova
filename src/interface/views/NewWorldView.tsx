import React, { Component } from 'react';
import { Simulation } from '../../simulation';
import World from '../../simulation/world';
import { RouteComponentProps } from 'react-router'
import { IWorldgenOptions } from '../../simulation/simulation';
import {
  NavbarGroup,
  Button,
  Alignment,
  Popover,
  PopoverInteractionKind,
  Position,
  FormGroup,
  InputGroup,
  ControlGroup,
  Spinner,
  Dialog,
  Classes,
  Intent,
  NumericInput,
  Navbar,
} from '@blueprintjs/core';
import { WorldViewerContainer } from '../components/WorldViewerContainer';
import styled from 'styled-components';
import { WorldViewer } from '../components/WorldViewer';


const AppView = styled.div`
  display: 'flex',
`;
const Column = styled.div`
  display: 'flex',
`;

export class NewWorldView extends Component<RouteComponentProps<{}>, {
  options: IWorldgenOptions,
  world?: World,
  saveName: string,
  saveDialogOpen: boolean,
}> {
  simulation: Simulation;

  state = {
    options: {
      seed: 'fuck',
      size: {
        width: 250,
        height: 200,
      },
    },
    world: null,
    saveName: '',
    saveDialogOpen: false,
  }

  constructor(props) {
    super(props);

    this.simulation = new Simulation();
    this.load();
  }

  async load() {
    this.setState({ world: null });
    await this.simulation.generate(this.state.options);
    const world = this.simulation.world;
    this.setState({ world });
  }

  saveWorld = async () => {
    if (this.state.saveName === '') return;

    await this.simulation.saveWorld(this.state.saveName);
    console.log('world saved');
  }

  renderControls = () => {
    return (
      <NavbarGroup align={Alignment.LEFT}>
        <Popover
          position={Position.BOTTOM}
          interactionKind={PopoverInteractionKind.CLICK}
        >
          <Button
            text='World Options'
            minimal
            icon={'cog'}
            rightIcon={'caret-down'}
          />
          <div className='tn-popover'>
            <FormGroup
              label="Seed"
              labelFor="control-seed"
            >
              <ControlGroup
                fill
              >
                <InputGroup
                  value={this.state.options.seed}
                  onChange={event => this.setState({
                    options: {
                      ...this.state.options,
                      seed: event.target.value
                    },
                  })}
                />
                <Button
                  icon={'random'}
                  onClick={() => this.setState({
                    options: {
                      ...this.state.options,
                      seed: Math.random().toString(),
                    }
                  })}
                />
              </ControlGroup>
            </FormGroup>
            <FormGroup
              label="Width"
            >
              <NumericInput
                value={this.state.options.size.width}
                onValueChange={value => this.setState({
                  options: {
                    ...this.state.options,
                    size: {
                      ...this.state.options.size,
                      width: value,
                    }
                  },
                })}
              />
            </FormGroup>
            <FormGroup
              label="Height"
            >
              <NumericInput
                value={this.state.options.size.height}
                onValueChange={value => this.setState({
                  options: {
                    ...this.state.options,
                    size: {
                      ...this.state.options.size,
                      height: value,
                    }
                  },
                })}
              />
            </FormGroup>
          </div>
        </Popover>

        <Button
          text="Generate"
          icon={'refresh'}
          onClick={this.load.bind(this)}
          minimal
        />
        <Button
          text="Save World"
          icon={'floppy-disk'}
          onClick={() => this.setState({ saveDialogOpen: true })}
          minimal
        />
      </NavbarGroup>
    )
  }

  render() {
    if (this.state.world === null) {
      return <Spinner/>;
    }
    return (
      <div>
        <Dialog
          title="Save World"
          isOpen={this.state.saveDialogOpen}
          onClose={() => this.setState({ saveDialogOpen: false })}
        >
          <div className={Classes.DIALOG_BODY}>
            <FormGroup
              label="World name"
            >
              <InputGroup
                value={this.state.saveName}
                onChange={(event) => this.setState({ saveName: event.target.value })}
              />
            </FormGroup>
          </div>
          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                intent={Intent.PRIMARY}
                text="Save"
                onClick={() => this.saveWorld()}
              />
            </div>
          </div>
        </Dialog>
        <WorldViewerContainer renderControls={this.renderControls} world={this.state.world} />
      </div>
    )
  }
}
