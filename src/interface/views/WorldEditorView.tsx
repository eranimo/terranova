import * as Blueprint from '@blueprintjs/core';
import BackButton from '../components/BackButton';
import React, { Component, Fragment } from 'react';
import styled from 'styled-components';
import World from '../../simulation/World';
import WorldViewer from '../worldview/WorldViewer';
import { AppNotifications } from '../notifications';
import { capitalize, cloneDeep, set } from 'lodash';
import { clamp } from '@blueprintjs/core/lib/esm/common/utils';
import { EWorldShape, IWorldMapGenOptions } from '../../simulation/types';
import { parse } from 'query-string';
import { RouteComponentProps } from 'react-router';
import { WorldGenerator } from '../../simulation';
import { WorldMap } from '../../common/WorldMap';
import { worldStore } from '../../simulation/stores';
import { FullOverlay } from '../components/layout';


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
}, { activeTab: Blueprint.TabId }> {
  state = {
    activeTab: 't1',
  };

  renderTerrainOptions() {
    return (
      <Row>
        <Column>
          <FormGroupContainer>
            <Blueprint.FormGroup
              label="Seed"
              labelFor="control-seed"
            >
              <Blueprint.ControlGroup fill>
                <Blueprint.InputGroup
                  value={this.props.options.seed.toString()}
                  onChange={event => this.props.handleOptionChange('seed', event.target.value)}
                />
                <Blueprint.Button
                  style={{ flex: 0 }}
                  icon={'random'}
                  onClick={() => this.props.handleOptionChange('seed', Math.random().toString())}
                />
              </Blueprint.ControlGroup>
            </Blueprint.FormGroup>
          </FormGroupContainer>
          <FormGroupContainer>
            <Blueprint.FormGroup label="Width">
              <Blueprint.NumericInput
                min={0}
                fill
                value={this.props.options.size.width}
                onValueChange={value => this.props.handleOptionChange('size.width', value)}
              />
            </Blueprint.FormGroup>
          </FormGroupContainer>
          <FormGroupContainer>
            <Blueprint.FormGroup label="Height">
              <Blueprint.NumericInput
                min={0}
                fill
                value={this.props.options.size.height}
                onValueChange={value => this.props.handleOptionChange('size.height', value)}
              />
            </Blueprint.FormGroup>
          </FormGroupContainer>
        </Column>
        <Column>
          <FormGroupContainer>
            <Blueprint.FormGroup label="Sea level">
              <Blueprint.Slider
                min={1}
                max={255}
                labelStepSize={50}
                value={this.props.options.sealevel}
                onChange={value => {
                  this.props.handleOptionChange('sealevel', clamp(value, 1, 255));
                }}
              />
            </Blueprint.FormGroup>
          </FormGroupContainer>
          <FormGroupContainer>
            <Blueprint.FormGroup label="World shape" inline>
              <div className={Blueprint.Classes.SELECT}>
                <select
                  onChange={event => this.props.handleOptionChange('worldShape', event.target.value)}
                  defaultValue={this.props.options.worldShape}
                >
                  {Object.entries(EWorldShape).map(([key, value]) => (
                    <option
                      value={value}
                      key={key}
                    >
                      {capitalize(value)}
                    </option>
                  ))}
                </select>
              </div>
            </Blueprint.FormGroup>
          </FormGroupContainer>
          <FormGroupContainer>
            <Blueprint.FormGroup
              label="World shape power"
              helperText="Lower means a smaller world with a more natural shape. Higher means a larger world with a more regular shape."
            >
              <Blueprint.Slider
                min={1}
                max={5}
                stepSize={0.1}
                value={this.props.options.worldShapePower}
                onChange={value => {
                  this.props.handleOptionChange('worldShapePower', clamp(value, 1, 5));
                }}
              />
            </Blueprint.FormGroup>
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
            <Blueprint.FormGroup
              label="River threshold"
              helperText="Higher value will generate less rivers"
            >
              <Blueprint.Slider
                min={0.75}
                max={1}
                stepSize={0.01}
                labelStepSize={.05}
                value={this.props.options.riverThreshold}
                onChange={value => {
                  this.props.handleOptionChange('riverThreshold', clamp(value, 0, 1));
                }}
              />
            </Blueprint.FormGroup>
          </FormGroupContainer>
          <FormGroupContainer>
            <Blueprint.FormGroup
              label="Depression Filling Percent"
              helperText="% of depressions which are filled, the rest become lakes"
            >
              <Blueprint.Slider
                min={0}
                max={1}
                stepSize={0.01}
                labelStepSize={.25}
                value={this.props.options.depressionFillPercent}
                onChange={value => {
                  this.props.handleOptionChange('depressionFillPercent', clamp(value, 0, 1));
                }}
              />
            </Blueprint.FormGroup>
          </FormGroupContainer>
        </Column>
        <Column>
          <FormGroupContainer>
            <Blueprint.FormGroup
              label="Temperature Range"
              helperText="Approximate range of temperatures allowed"
            >
              <Blueprint.RangeSlider
                min={-50}
                max={50}
                labelStepSize={10}
                value={[this.props.options.temperature.min, this.props.options.temperature.max]}
                onChange={(value: [number, number]) => {
                  this.props.handleOptionChange('temperature.min', value[0]);
                  this.props.handleOptionChange('temperature.max', value[1]);
                }}
              />
            </Blueprint.FormGroup>
          </FormGroupContainer>
          <FormGroupContainer>
            <Blueprint.FormGroup
              label="Elevation cooling amount"
              helperText="The amount of temperature lost due to elevation at highest peak"
            >
              <Blueprint.NumericInput
                value={this.props.options.elevationCoolingAmount}
                min={0}
                onValueChange={value => this.props.handleOptionChange('elevationCoolingAmount', Math.max(0, value))}
              />
            </Blueprint.FormGroup>
          </FormGroupContainer>
        </Column>
      </Row>
    )
  }

  render() {
    return (
      <form
        className={Blueprint.Classes.POPOVER_CONTENT_SIZING}
        onSubmit={(event) => {
          this.props.generate();
          event.preventDefault();
          return false;
        }}
        style={{ padding: '1rem', margin: 0 }}
      >
        <div>
          <Blueprint.Tabs
            id="world-config-tabs"
            onChange={tabID => this.setState({ activeTab: tabID })}
            selectedTabId={this.state.activeTab}
          >
            <Blueprint.Tab id="t1" title="Terrain" panel={this.renderTerrainOptions()} />
            <Blueprint.Tab id="t2" title="Climate" panel={this.renderClimateOptions()} />
          </Blueprint.Tabs>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 15 }}>
          <Blueprint.Button
            text="Reset"
            minimal
            onClick={() => this.props.resetOptions()}
          />
          <Blueprint.Button
            type="submit"
            intent={Blueprint.Intent.PRIMARY}
            text="Generate"
          />
        </div>
      </form>
    );
  }
}

export class WorldEditorView extends Component<RouteComponentProps<{}>, {
  options: IWorldMapGenOptions,
  worldMap?: WorldMap,
  isLoading: boolean,
  currentSaveName: string | null,
  saveNameInput: string,
  saveDialogOpen: boolean,
  configDialogOpen: boolean,
}> {
  worldgen: WorldGenerator;

  state = {
    options: cloneDeep(initialOptions),
    worldMap: null,
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
    const worldMap = new WorldMap(world);
    this.setState({ worldMap, isLoading: false });
  }

  async generate() {
    this.setState({ isLoading: true });
    const world = await this.worldgen.generate(this.state.options);
    console.log('generate', world);
    localStorage.removeItem('viewportState');
    const worldMap = new WorldMap(world);
    this.setState({ worldMap, isLoading: false });
  }

  saveWorld = async () => {
    if (this.state.saveNameInput === '') return;
    AppNotifications.show({
      message: `World "${this.state.saveNameInput}" saved`,
      intent: 'primary',
    });
    await worldStore.save(this.state.worldMap.world, this.state.saveNameInput);
    this.setState({
      currentSaveName: this.state.saveNameInput,
      saveNameInput: '',
    });
    console.log('world saved');
  }

  renderControls = () => {
    return (
      <Blueprint.NavbarGroup align={Blueprint.Alignment.LEFT}>
        <BackButton />
        <Blueprint.NavbarDivider />
        <Blueprint.NavbarHeading>World Editor</Blueprint.NavbarHeading>
        <Blueprint.NavbarDivider />
        <Blueprint.ButtonGroup minimal>
          <Blueprint.Popover
            isOpen={this.state.configDialogOpen}
            onClose={() => this.setState({ configDialogOpen: false })}
            position={Blueprint.Position.BOTTOM_LEFT}
          >
            <Blueprint.Button
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
          </Blueprint.Popover>
          <Blueprint.Button
            text="Generate"
            icon={'refresh'}
            onClick={this.generate.bind(this)}
          />
          <Blueprint.Button
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
          <Blueprint.Button
            text="Save World"
            icon={'floppy-disk'}
            onClick={() => this.setState({ saveDialogOpen: true })}
          />
        </Blueprint.ButtonGroup>
      </Blueprint.NavbarGroup>
    );
  }

  render() {
    if (this.state.worldMap === null) {
      return (
        <FullOverlay>
          <Blueprint.Spinner />
        </FullOverlay>
      );
    }
    return (
      <Fragment>
        <Blueprint.Dialog
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
            <div className={Blueprint.Classes.DIALOG_BODY}>
              <Blueprint.FormGroup
                label="World name"
              >
                <Blueprint.InputGroup
                  value={this.state.saveNameInput}
                  autoFocus
                  onChange={(event) => this.setState({
                    saveNameInput: event.target.value
                  })}
                />
              </Blueprint.FormGroup>
            </div>
            <div className={Blueprint.Classes.DIALOG_FOOTER}>
              <div className={Blueprint.Classes.DIALOG_FOOTER_ACTIONS}>
                <Blueprint.Button
                  intent={
                    this.state.currentSaveName === this.state.saveNameInput
                      ? Blueprint.Intent.DANGER
                      : Blueprint.Intent.PRIMARY
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
        </Blueprint.Dialog>
        <WorldViewer
          isLoading={this.state.isLoading}
          renderControls={this.renderControls}
          worldMap={this.state.worldMap}
        />
      </Fragment>
    )
  }
}
