import React, { Component } from 'react';
import { Simulation } from '../../simulation';
import World from '../../simulation/world';
import { RouteComponentProps } from 'react-router'
import { IWorldgenOptions, EWorldShape } from '../../simulation/simulation';
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
  Switch,
  TabId,
  Label,
  NavbarHeading,
  NavbarDivider,
} from '@blueprintjs/core';
import { WorldViewerContainer } from '../components/WorldViewerContainer';
import { set, capitalize, cloneDeep } from 'lodash';
import styled from 'styled-components';
import { clamp } from '@blueprintjs/core/lib/esm/common/utils';
import BackButton from '../components/BackButton';

const Row = styled.div`
  display: flex;
  flex-direction: row;
`;

const Column = styled.div`
  flex: 0 0 50%;
`;

const initialOptions: IWorldgenOptions = {
  seed: 'fuck',
  sealevel: 102,
  size: {
    width: 250,
    height: 200,
  },
  worldShape: EWorldShape.RECTANGLE,
  worldShapePower: 2,
  riverThreshold: 0.9,
  temperature: { min: -50, max: 29 },
  elevationCoolingAmount: 30,
};
Object.freeze(initialOptions);


class WorldConfigModal extends Component<{
  options: IWorldgenOptions,
  handleOptionChange: (optionName: string, value: any) => void,
  resetOptions: () => void,
  generate: () => void,
  closeModal: () => void,
}, { activeTab: TabId }> {
  state = {
    activeTab: 't1',
  };

  renderTerrainOptions() {
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
              min={0}
              value={this.props.options.size.width}
              onValueChange={value => this.props.handleOptionChange('size.width', value)}
            />
          </FormGroup>
          <FormGroup label="Height">
            <NumericInput
              min={0}
              value={this.props.options.size.height}
              onValueChange={value => this.props.handleOptionChange('size.height', value)}
            />
          </FormGroup>
        </Column>
        <Column>
          <FormGroup label="Sea level">
            <NumericInput
              fill
              min={1}
              max={255}
              value={this.props.options.sealevel}
              onValueChange={value => {
                this.props.handleOptionChange('sealevel', clamp(value, 1, 255));
              }}
            />
          </FormGroup>
          <FormGroup label="World shape" inline>
            <div className={Classes.SELECT}>
              <select
                onChange={event => this.props.handleOptionChange('worldShape', event.target.value)}
              >
                {Object.entries(EWorldShape).map(([key, value]) => (
                  <option
                    value={key}
                    selected={this.props.options.worldShape == value}
                  >
                    {capitalize(value)}
                  </option>
                ))}
              </select>
            </div>
          </FormGroup>
          {/*
          Lower means a smaller world with a more natural shape. Higher means a larger world with a more regular shape.
          */}
          <FormGroup
            label="World shape power"
            inline
          >
            <NumericInput
              style={{ width: '50px' }}
              fill
              min={1}
              max={5}
              stepSize={0.1}
              majorStepSize={1}
              value={this.props.options.worldShapePower}
              onValueChange={value => {
                this.props.handleOptionChange('worldShapePower', clamp(value, 1, 5));
              }}
            />
          </FormGroup>
        </Column>
      </Row>
    );
  }

  renderClimateOptions() {
    return (
      <Row>
        <Column>
          <FormGroup
            label="River threshold"
            helperText="Higher value will generate less rivers"
          >
            <NumericInput
              min={0}
              max={1}
              minorStepSize={0.01}
              stepSize={0.05}
              majorStepSize={0.1}
              value={this.props.options.riverThreshold}
              onValueChange={value => {
                this.props.handleOptionChange('riverThreshold', clamp(value, 0, 1));
              }}
            />
          </FormGroup>
        </Column>
        <Column>
          <Label>Temperature</Label>
          <FormGroup label="Min" inline>
            <NumericInput
              style={{ width: '50px' }}
              value={this.props.options.temperature.min}
              onValueChange={value => this.props.handleOptionChange('temperature.min', value)}
            />
          </FormGroup>
          <FormGroup label="Max" inline>
            <NumericInput
              style={{ width: '50px' }}
              value={this.props.options.temperature.max}
              onValueChange={value => this.props.handleOptionChange('temperature.max', value)}
            />
          </FormGroup>
          <FormGroup
            label="Elevation cooling amount"
            helperText="The amount of temperature lost due to elevation at highest peak"
          >
            <NumericInput
              value={this.props.options.elevationCoolingAmount}
              min={0}
              onValueChange={value => this.props.handleOptionChange('elevationCoolingAmount', Math.max(0, value))}
            />
          </FormGroup>
        </Column>
      </Row>
    )
  }

  render() {
    return (
      <form
        onSubmit={(event) => {
          this.props.generate();
          event.preventDefault();
          return false;
        }}
      >
        <div className={Classes.DIALOG_BODY}>
          <Tabs
            id="world-config-tabs"
            onChange={tabID => this.setState({ activeTab: tabID })}
            selectedTabId={this.state.activeTab}
          >
            <Tab id="t1" title="Terrain" panel={this.renderTerrainOptions()} />
            <Tab id="t2" title="Climate" panel={this.renderClimateOptions()} />
          </Tabs>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button
                text="Reset"
                onClick={() => this.props.resetOptions()}
              />
              <Button
                type="submit"
                intent={Intent.PRIMARY}
                text="Generate"
              />
            </div>
          </div>
      </form>
    );
  }
}

export class WorldEditorView extends Component<RouteComponentProps<{}>, {
  options: IWorldgenOptions,
  world?: World,
  isLoading: boolean,
  saveName: string,
  saveDialogOpen: boolean,
  configDialogOpen: boolean,
}> {
  simulation: Simulation;

  state = {
    options: cloneDeep(initialOptions),
    world: null,
    isLoading: true,
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
    this.setState({ isLoading: true });
    await this.simulation.generate(this.state.options);
    const world = this.simulation.world;
    this.setState({ world, isLoading: false });
  }

  saveWorld = async () => {
    if (this.state.saveName === '') return;

    await this.simulation.saveWorld(this.state.saveName);
    console.log('world saved');
  }

  renderControls = () => {
    return (
      <NavbarGroup align={Alignment.LEFT}>
        <BackButton />
        <NavbarDivider />
        <NavbarHeading>World Editor</NavbarHeading>
        <NavbarDivider />
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
    );
  }

  render() {
    if (this.state.world === null) {
      return <Spinner />;
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
            resetOptions={() => {
              this.setState({
                options: cloneDeep(initialOptions),
              });
            }}
            handleOptionChange={(optionName, value) => {
              this.setState({
                options: set(this.state.options, optionName, value),
              });
            }}
          />
        </Dialog>
        <WorldViewerContainer
          isLoading={this.state.isLoading}
          renderControls={this.renderControls}
          world={this.state.world}
        />
      </div>
    )
  }
}
