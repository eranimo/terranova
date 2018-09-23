import React, { Component } from 'react';
import { Simulation } from '../../simulation';
import World from '../../simulation/world';
import { RouteComponentProps } from 'react-router'
import {
  Spinner,
} from '@blueprintjs/core';
import { WorldViewerContainer } from '../components/WorldViewerContainer';


export class LoadWorldView extends Component<RouteComponentProps<{
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
      <WorldViewerContainer world={this.state.world} />
    );
  }
}
