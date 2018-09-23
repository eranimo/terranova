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
  Tabs,
  Tab,
  Tooltip,
} from '@blueprintjs/core';
import { WorldViewerContainer } from '../components/WorldViewerContainer';
import { set } from 'lodash';
import styled from 'styled-components';

const Row = styled.div`
  display: flex;
  flex-direction: row;
`;

const Column = styled.div`
  flex: 0 0 50%;
`;


class WorldConfigModal extends Component<{
  options: IWorldgenOptions,
  handleOptionChange: (optionName: string, value: any) => void,
  generate: () => void,
  closeModal: () => void,
}> {
  renderCoreTab() {
    return (
      <Row>
        <Column>
          <FormGroup
            label="Seed"
            labelFor="control-seed"
          >
            <ControlGroup>
              <InputGroup
                value={this.props.options.seed.toString()}
                onChange={event => this.props.handleOptionChange('seed', event.target.value)}
              />
              <Tooltip content="Click to randomize seed">
                <Button
                  icon={'random'}

                  onClick={() => this.props.handleOptionChange('seed', Math.random().toString())}
                />
              </Tooltip>
            </ControlGroup>
          </FormGroup>
          <FormGroup label="Width">
            <NumericInput
              value={this.props.options.size.width}
              onValueChange={value => this.props.handleOptionChange('size.width', value)}
            />
          </FormGroup>
          <FormGroup label="Height">
            <NumericInput
              value={this.props.options.size.height}
              onValueChange={value => this.props.handleOptionChange('size.height', value)}
            />
          </FormGroup>
        </Column>
        <Column>
          <FormGroup label="Sea level">
            <NumericInput
              value={this.props.options.sealevel}
              onValueChange={value => this.props.handleOptionChange('sealevel', value)}
            />
          </FormGroup>
        </Column>
      </Row>
    );
  }
  render() {
    return (
      <div>
        <div className={Classes.DIALOG_BODY}>
          <Tabs id="world-config-tabs">
            <Tab id="t1" title="Core" panel={this.renderCoreTab()} />
          </Tabs>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                text="Close"
                onClick={() => this.props.closeModal()}
              />
              <Button
                intent={Intent.PRIMARY}
                text="Generate"
                onClick={() => this.props.generate()}
              />
            </div>
          </div>
      </div>
    );
  }
}

const initialOptions: IWorldgenOptions = {
  seed: 'fuck',
  sealevel: 102,
  size: {
    width: 250,
    height: 200,
  },
};

export class NewWorldView extends Component<RouteComponentProps<{}>, {
  options: IWorldgenOptions,
  world?: World,
  saveName: string,
  saveDialogOpen: boolean,
  configDialogOpen: boolean,
}> {
  simulation: Simulation;

  state = {
    options: initialOptions,
    world: null,
    saveName: '',
    saveDialogOpen: false,
    configDialogOpen: false,
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
        <Button
          text='World Config'
          minimal
          icon={'cog'}
          rightIcon={'caret-down'}
          onClick={() => this.setState({ configDialogOpen: true })}
        />
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
        <Dialog
          title="World Config"
          isOpen={this.state.configDialogOpen}
          onClose={() => this.setState({ configDialogOpen: false })}
        >
          <WorldConfigModal
            options={this.state.options}
            closeModal={() => this.setState({ configDialogOpen: false })}
            generate={() => this.load()}
            handleOptionChange={(optionName, value) => {
              this.setState({
                options: set(this.state.options, optionName, value),
              });
            }}
          />
        </Dialog>
        <WorldViewerContainer renderControls={this.renderControls} world={this.state.world} />
      </div>
    )
  }
}
