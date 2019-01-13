import React, { Component } from 'react';
import { WorldGenerator } from '../../simulation';
import { worldStore } from "../../simulation/stores";
import World from "../../simulation/World";
import { RouteComponentProps } from 'react-router'
import {
  Spinner, NavbarGroup, Alignment, NavbarHeading, NavbarDivider
} from '@blueprintjs/core';
import WorldViewer from '../worldview/WorldViewer';
import BackButton from '../components/BackButton';
import { WorldMap } from '../../common/WorldMap';


export class WorldView extends Component<RouteComponentProps<{
  saveName: string
}>, { worldMap?: WorldMap }> {
  worldgen: WorldGenerator;

  state = {
    worldMap: null,
  }

  constructor(props) {
    super(props);

    this.worldgen = new WorldGenerator();
    this.load();
  }

  async load() {
    const { saveName } = this.props.match.params;
    const world: World = await worldStore.load(saveName);
    console.log('World loaded', world);
    const worldMap = new WorldMap(world);
    this.setState({ worldMap });
  }

  render() {
    if (this.state.worldMap === null) {
      return <Spinner/>;
    }
    return (
      <WorldViewer
        renderControls={() => [
          <NavbarGroup align={Alignment.LEFT}>
            <BackButton />
            <NavbarDivider />
            <NavbarHeading>World Viewer</NavbarHeading>
          </NavbarGroup>
        ]}
        worldMap={this.state.worldMap}
        isLoading={this.state.worldMap === null}
      />
    );
  }
}
