import React, { Component } from 'react';
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
  FormGroup,
  InputGroup,
  ControlGroup,
  Spinner,
  Dialog,
  Classes,
  AnchorButton,
  Intent,
  NumericInput,
} from '@blueprintjs/core';
import { Simulation } from '../simulation';
import WorldViewer, { IViewOptions, cellOverlays } from './WorldViewer';
import { BrowserRouter, Route, Switch, Link } from 'react-router-dom';
import World from '../simulation/world';
import { RouteComponentProps } from 'react-router'
import { IWorldgenOptions } from '../simulation/simulation';


class WorldViewerControls extends React.Component<{
  world: World,
  renderControls?: () => React.ReactNode
}, {
  viewOptions: IViewOptions;
}> {
  state = {
    viewOptions: {
      showFlowArrows: false,
      showDrainageBasinLabels: false,
      drawCoastline: true,
      drawGrid: false,
      overlay: 'none',
      showBiomes: false,
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

  onChangeOverlay = event => {
    this.setState({
      viewOptions: {
        ...this.state.viewOptions,
        overlay: event.target.value
      },
    });
  }

  render() {
    const { world, renderControls } = this.props;

    return (
      <div>
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
                      checked={this.state.viewOptions.drawCoastline}
                      onChange={this.onChangeField('drawCoastline')}
                      label='Show coastline border'
                    />
                  </li>
                  <li>
                    <Checkbox
                      inline
                      checked={this.state.viewOptions.drawGrid}
                      onChange={this.onChangeField('drawGrid')}
                      label='Show grid'
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
                      checked={this.state.viewOptions.showBiomes}
                      onChange={this.onChangeField('showBiomes')}
                      label='Show biomes'
                    />
                  </li>
                </ul>
                <RadioGroup
                  label="Overlay"
                  onChange={this.onChangeOverlay}
                  selectedValue={this.state.viewOptions.overlay}
                >
                  <Radio
                    label="None"
                    value={'none'}
                  />
                  {Object.entries(cellOverlays).map(([name, overlay]) => (
                    <Radio
                      key={name}
                      label={overlay.title}
                      value={name}
                    />
                  ))}
                </RadioGroup>
              </div>
            </Popover>
          </NavbarGroup>
          {renderControls
              ? renderControls()
              : null}
        </Navbar>
        <main>
          <WorldViewer world={world} viewOptions={this.state.viewOptions} />
        </main>
      </div>
    )
  }
}

class SelectWorldView extends Component<RouteComponentProps<{}>, {
  saves: string[],
}> {
  simulation: Simulation;

  state = {
    saves: [],
  }

  constructor(props) {
    super(props);

    this.simulation = new Simulation();
    this.simulation.getWorldSaves()
      .then(saves => this.setState({ saves }))
  }

  render() {
    return (
      <div>
        <h1>Load saved world</h1>
        <ul className={Classes.LIST}>
          {this.state.saves.map(saveName => (
            <li>
              <Link
                to={`/world/${saveName}`}
              >
                {saveName}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }
}

class NewWorldView extends Component<RouteComponentProps<{}>, {
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
        <WorldViewerControls
          world={this.state.world}
          renderControls={this.renderControls}
        />
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
      </div>
    )
  }
}

class LoadWorldView extends Component<RouteComponentProps<{
  saveName: string
}>, { world?: World }> {
  simulation: Simulation;

  state = {
    world: null,
  }

  constructor(props) {
    super(props);

    this.simulation = new Simulation();
    this.load();
  }

  async load() {
    const { saveName } = this.props.match.params;
    await this.simulation.loadWorld(saveName);
    const world = this.simulation.world;
    console.log('World loaded', world);
    this.setState({ world });
  }

  render() {
    if (this.state.world === null) {
      return <Spinner/>;
    }
    return (
      <WorldViewerControls world={this.state.world} />
    );
  }
}


export default class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route
            exact
            path="/"
            component={NewWorldView}
          />
          <Route
            path="/worldSelect"
            component={SelectWorldView}
          />
          <Route
            path="/world/:saveName"
            component={LoadWorldView}
          />
        </Switch>
      </BrowserRouter>
    )
  }
}
