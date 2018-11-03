import React, { Component } from 'react';
import { WorldGenerator, worldStore } from '../../simulation';
import World from "../../simulation/World";
import { RouteComponentProps } from 'react-router'
import { IWorldMapGenOptions, EWorldShape } from '../../simulation/types';
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
  ButtonGroup,
  Slider,
  RangeSlider,
} from '@blueprintjs/core';
import { WorldViewerContainer } from '../worldview/WorldViewerContainer';
import { set, capitalize, cloneDeep } from 'lodash';
import styled from 'styled-components';
import { clamp } from '@blueprintjs/core/lib/esm/common/utils';
import BackButton from '../components/BackButton';
import { parse } from 'query-string';
import { AppNotifications } from '../notifications';


const Row = styled.div`
  display: flex;
  flex-direction: row;
  width: 600px;
  margin: 1rem;
`;

const Column = styled.div`
  flex: 0 0 50%;
  &:first-child {
    padding-right: 3rem;
  }
`;

const FormGroupContainer = styled.div`
  &:not(:last-child) {
    margin-bottom: 2rem;
  }
`;

const initialOptions: IWorldMapGenOptions = {
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
  depressionFillPercent: 0.5,
};
Object.freeze(initialOptions);


class WorldConfigEditor extends Component<{
  options: IWorldMapGenOptions,
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
          <FormGroupContainer>
            <FormGroup
              label="Seed"
              labelFor="control-seed"
            >
              <ControlGroup fill>
                <InputGroup
                  value={this.props.options.seed.toString()}
                  onChange={event => this.props.handleOptionChange('seed', event.target.value)}
                />
                <Button
                  style={{ flex: 0 }}
                  icon={'random'}
                  onClick={() => this.props.handleOptionChange('seed', Math.random().toString())}
                />
              </ControlGroup>
            </FormGroup>
          </FormGroupContainer>
          <FormGroupContainer>
            <FormGroup label="Width">
              <NumericInput
                min={0}
                fill
                value={this.props.options.size.width}
                onValueChange={value => this.props.handleOptionChange('size.width', value)}
              />
            </FormGroup>
          </FormGroupContainer>
          <FormGroupContainer>
            <FormGroup label="Height">
              <NumericInput
                min={0}
                fill
                value={this.props.options.size.height}
                onValueChange={value => this.props.handleOptionChange('size.height', value)}
              />
            </FormGroup>
          </FormGroupContainer>
        </Column>
        <Column>
          <FormGroupContainer>
            <FormGroup label="Sea level">
              <Slider
                min={1}
                max={255}
                labelStepSize={50}
                value={this.props.options.sealevel}
                onChange={value => {
                  this.props.handleOptionChange('sealevel', clamp(value, 1, 255));
                }}
              />
            </FormGroup>
          </FormGroupContainer>
          <FormGroupContainer>
            <FormGroup label="World shape" inline>
              <div className={Classes.SELECT}>
                <select
                  onChange={event => this.props.handleOptionChange('worldShape', event.target.value)}
                >
                  {Object.entries(EWorldShape).map(([key, value]) => (
                    <option
                      value={value}
                      selected={this.props.options.worldShape == value}
                    >
                      {capitalize(value)}
                    </option>
                  ))}
                </select>
              </div>
            </FormGroup>
          </FormGroupContainer>
          <FormGroupContainer>
            <FormGroup
              label="World shape power"
              helperText="Lower means a smaller world with a more natural shape. Higher means a larger world with a more regular shape."
            >
              <Slider
                min={1}
                max={5}
                stepSize={0.1}
                value={this.props.options.worldShapePower}
                onChange={value => {
                  this.props.handleOptionChange('worldShapePower', clamp(value, 1, 5));
                }}
              />
            </FormGroup>
          </FormGroupContainer>
        </Column>
      </Row>
    );
  }

  renderClimateOptions() {
    return (
      <Row>
        <Column>
          <FormGroupContainer>
            <FormGroup
              label="River threshold"
              helperText="Higher value will generate less rivers"
            >
              <Slider
                min={0}
                max={1}
                stepSize={0.01}
                labelStepSize={.25}
                value={this.props.options.riverThreshold}
                onChange={value => {
                  this.props.handleOptionChange('riverThreshold', clamp(value, 0, 1));
                }}
              />
            </FormGroup>
          </FormGroupContainer>
          <FormGroupContainer>
            <FormGroup
              label="Depression Filling Percent"
              helperText="% of depressions which are filled, the rest become lakes"
            >
              <Slider
                min={0}
                max={1}
                stepSize={0.01}
                labelStepSize={.25}
                value={this.props.options.depressionFillPercent}
                onChange={value => {
                  this.props.handleOptionChange('depressionFillPercent', clamp(value, 0, 1));
                }}
              />
            </FormGroup>
          </FormGroupContainer>
        </Column>
        <Column>
          <FormGroupContainer>
            <FormGroup
              label="Temperature Range"
              helperText="Approximate range of temperatures allowed"
            >
              <RangeSlider
                min={-50}
                max={50}
                labelStepSize={10}
                value={[this.props.options.temperature.min, this.props.options.temperature.max]}
                onChange={(value: [number, number]) => {
                  this.props.handleOptionChange('temperature.min', value[0]);
                  this.props.handleOptionChange('temperature.max', value[1]);
                }}
              />
            </FormGroup>
          </FormGroupContainer>
          <FormGroupContainer>
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
          </FormGroupContainer>
        </Column>
      </Row>
    )
  }

  render() {
    return (
      <form
        className={Classes.POPOVER_CONTENT_SIZING}
        onSubmit={(event) => {
          this.props.generate();
          event.preventDefault();
          return false;
        }}
        style={{ padding: '1rem', margin: 0 }}
      >
        <div>
          <Tabs
            id="world-config-tabs"
            onChange={tabID => this.setState({ activeTab: tabID })}
            selectedTabId={this.state.activeTab}
          >
            <Tab id="t1" title="Terrain" panel={this.renderTerrainOptions()} />
            <Tab id="t2" title="Climate" panel={this.renderClimateOptions()} />
          </Tabs>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 15 }}>
          <Button
            text="Reset"
            minimal
            onClick={() => this.props.resetOptions()}
          />
          <Button
            type="submit"
            intent={Intent.PRIMARY}
            text="Generate"
          />
        </div>
      </form>
    );
  }
}

export class WorldEditorView extends Component<RouteComponentProps<{}>, {
  options: IWorldMapGenOptions,
  world?: World,
  isLoading: boolean,
  currentSaveName: string | null,
  saveNameInput: string,
  saveDialogOpen: boolean,
  configDialogOpen: boolean,
}> {
  worldgen: WorldGenerator;

  state = {
    options: cloneDeep(initialOptions),
    world: null,
    isLoading: true,
    currentSaveName: null,
    saveNameInput: '',
    saveDialogOpen: false,
    configDialogOpen: false,
  }

  constructor(props) {
    super(props);
    this.worldgen = new WorldGenerator();
    this.start();
  }

  async start() {
    this.setState({ isLoading: true });
    const { ws, saveName } = parse(this.props.location.search);
    let world;
    if (ws) {
      world = await this.worldgen.loadFromString(ws);
    } else if (saveName) {
      world = await worldStore.load(saveName);
      const optionsFromSave = world.params.options;
      this.setState({
        options: optionsFromSave,
        currentSaveName: saveName,
      });
    } else {
      world = await this.worldgen.generate(this.state.options);
    }
    console.log('start', world);
    this.setState({ world, isLoading: false });
  }

  async generate() {
    this.setState({ isLoading: true });
    const world = await this.worldgen.generate(this.state.options);
    console.log('generate', world);
    localStorage.removeItem('viewportState');
    this.setState({ world, isLoading: false });
  }

  saveWorld = async () => {
    if (this.state.saveNameInput === '') return;
    AppNotifications.show({
      message: `World "${this.state.saveNameInput}" saved`,
      intent: 'primary',
    });
    await worldStore.save(this.state.world, this.state.saveNameInput);
    this.setState({
      currentSaveName: this.state.saveNameInput,
      saveNameInput: '',
    });
    console.log('world saved');
  }

  renderControls = () => {
    return (
      <NavbarGroup align={Alignment.LEFT}>
        <BackButton />
        <NavbarDivider />
        <NavbarHeading>World Editor</NavbarHeading>
        <NavbarDivider />
        <ButtonGroup minimal>
          <Popover
            isOpen={this.state.configDialogOpen}
            onClose={() => this.setState({ configDialogOpen: false })}
            position={Position.BOTTOM_LEFT}
          >
            <Button
              text='World Config'
              icon={'cog'}
              onClick={() => this.setState({ configDialogOpen: true })}
            />
            <WorldConfigEditor
              options={this.state.options}
              closeModal={() => this.setState({ configDialogOpen: false })}
              generate={() => this.generate()}
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
          </Popover>
          <Button
            text="Generate"
            icon={'refresh'}
            onClick={this.generate.bind(this)}
          />
          <Button
            text="Randomize"
            icon={'random'}
            onClick={() => {
              this.setState({
                options: {
                  ...this.state.options,
                  seed: Math.random(),
                },
              }, this.generate)
            }}
          />
          <Button
            text="Save World"
            icon={'floppy-disk'}
            onClick={() => this.setState({ saveDialogOpen: true })}
          />
        </ButtonGroup>
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
          <form
            onSubmit={(event) => {
              this.saveWorld()
                .then(() => console.log('saved!'))
                .catch(error => console.error('save error:', error));
              this.setState({ saveDialogOpen: false });
              event.preventDefault();
            }}
          >
            <div className={Classes.DIALOG_BODY}>
              <FormGroup
                label="World name"
              >
                <InputGroup
                  value={this.state.saveNameInput}
                  autoFocus
                  onChange={(event) => this.setState({
                    saveNameInput: event.target.value
                  })}
                />
              </FormGroup>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
              <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                <Button
                  intent={
                    this.state.currentSaveName === this.state.saveNameInput
                      ? Intent.DANGER
                      : Intent.PRIMARY
                  }
                  text={
                    this.state.currentSaveName === this.state.saveNameInput
                      ? 'Overwrite world'
                      : 'Save world'
                  }
                  type="submit"
                />
              </div>
            </div>
          </form>
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
