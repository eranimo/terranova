import React, { Component } from 'react';
import { WorldGenerator, RegionGenerator, worldStore, gameStore } from '../../simulation';
import Game from "../../simulation/Game";
import { RouteComponentProps } from 'react-router'
import {
  Spinner, NavbarGroup, Alignment, NavbarHeading, NavbarDivider
} from '@blueprintjs/core';
import { WorldViewerContainer } from '../components/WorldViewerContainer';
import BackButton from '../components/BackButton';


export class GameView extends Component<RouteComponentProps<{
  name: string
}>, {
  game?: Game,
  isLoading: boolean
}> {
  worldGenerator: WorldGenerator;
  regionGenerator: RegionGenerator;

  state = {
    game: null,
    isLoading: true,
  }

  constructor(props) {
    super(props);

    this.worldGenerator = new WorldGenerator();
    this.load();
  }

  async load() {
    const { name } = this.props.match.params;
    const game = await gameStore.load(name);
    await game.init();
    console.log('Game loaded', game);
    this.setState({
      game,
      isLoading: false
    });
  }

  render() {
    if (this.state.isLoading) {
      return <Spinner/>;
    }
    console.log(this.state.game.world);
    return (
      <WorldViewerContainer
        renderControls={() => [
          <NavbarGroup align={Alignment.LEFT}>
            <BackButton />
            <NavbarDivider />
            <NavbarHeading>
              Game <b>{this.state.game.name}</b>
            </NavbarHeading>
          </NavbarGroup>
        ]}
        world={this.state.game.world}
        isLoading={this.state.isLoading}
      />
    );
  }
}
