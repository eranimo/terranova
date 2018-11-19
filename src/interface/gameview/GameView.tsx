import React, { Component } from 'react';
import { gameStore } from '../../simulation';
import Game from "../../simulation/Game";
import { RouteComponentProps } from 'react-router'
import {
  Spinner
} from '@blueprintjs/core';
import GameViewer from './GameViewer';
import { EMapMode } from '../worldview/mapModes';


type GameViewProps = RouteComponentProps<{
  name: string
}>

type GameViewState = {
  game?: Game,
  isLoading: boolean
}

export class GameView extends Component<GameViewProps, GameViewState> {
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
    (window as any).game = game;
  }

  render() {
    if (this.state.isLoading) {
      return <Spinner/>;
    }

    console.log(this.state.game.world);
    return (
      <GameViewer
        game={this.state.game}
        isLoading={this.state.isLoading}
      />
    );
  }
}
