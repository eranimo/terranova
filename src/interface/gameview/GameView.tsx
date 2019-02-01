import React, { Component, Fragment } from 'react';
import { RouteComponentProps } from 'react-router'
import {
  Spinner
} from '@blueprintjs/core';
import GameViewer from './GameViewer';
import GameManager from '../../simulation/GameManager';
import { DevConsole, DevConsoleManager } from './DevConsole';


type GameViewProps = RouteComponentProps<{
  name: string
}>

type GameViewState = {
  game?: GameManager,
  isLoading: boolean
}

export class GameView extends Component<GameViewProps, GameViewState> {
  consoleManager: DevConsoleManager;
  gameManager: GameManager;

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
    this.gameManager = gameManager;

    console.log('Game loaded', gameManager);

    this.setState({
      game: gameManager,
      isLoading: false
    });
    (window as any).game = gameManager;
  }

  onConsoleInit = (consoleManager: DevConsoleManager) => {
    console.log('consoleManager', consoleManager);
    this.gameManager.state.ticks.subscribe(consoleManager.ticks);
    this.gameManager.state.delta.subscribe(consoleManager.delta);
  }

  render() {
    if (this.state.isLoading) {
      return <Spinner/>;
    }

    console.log(this.state.game.world);
    return (
      <Fragment>
        <DevConsole
          onInit={this.onConsoleInit}
        />
        <GameViewer
          game={this.state.game}
          isLoading={this.state.isLoading}
        />
      </Fragment>
    );
  }
}
