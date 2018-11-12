import React, { Component } from 'react';
import { gameStore } from '../../simulation';
import Game from "../../simulation/Game";
import { RouteComponentProps } from 'react-router'
import {
  Spinner, NavbarGroup, Alignment, NavbarHeading, NavbarDivider
} from '@blueprintjs/core';
import { WorldViewerContainer } from '../worldview/WorldViewerContainer';
import BackButton from '../components/BackButton';
import GameScreen from './GameScreen';


export class GameView extends Component<RouteComponentProps<{
  name: string
}>, {
  game?: Game,
  isLoading: boolean
}> {

  state = {
    game: null,
    isLoading: true,
  }

  constructor(props) {
    super(props);
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
      <GameScreen
        game={this.state.game}
      />
    );
  }
}
