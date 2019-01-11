import React, { Component } from 'react';
import { RouteComponentProps } from 'react-router'
import {
  Spinner
} from '@blueprintjs/core';
import GameViewer from './GameViewer';
import GameManager from '../../simulation/GameManager';


type GameViewProps = RouteComponentProps<{
  name: string
}>

type GameViewState = {
  game?: GameManager,
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

    const gameManager = new GameManager(name);
    await gameManager.init();

    console.log('Game loaded', gameManager);

    this.setState({
      game: gameManager,
      isLoading: false
    });
    (window as any).game = gameManager;
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
