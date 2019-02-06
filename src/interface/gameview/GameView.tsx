import React, { Component, Fragment, ReactElement, ReactNode } from 'react';
import { RouteComponentProps } from 'react-router'
import {
  Spinner, Alert, Classes
} from '@blueprintjs/core';
import GameViewer from './GameViewer';
import GameManager from '../../simulation/GameManager';
import { DevConsole, DevConsoleManager } from './DevConsole';
import classnames from 'classnames';


type GameViewProps = RouteComponentProps<{
  name: string
}>

type GameViewState = {
  game?: GameManager;
  isLoading: boolean;
  warning?: {
    title: string;
    content: ReactNode;
  };
  warningOpen: boolean;
  error?: {
    title: string;
    content: ReactNode;
  };
  errorOpen: boolean;
  isCrashError: boolean;
}

export class GameView extends Component<GameViewProps, GameViewState> {
  consoleManager: DevConsoleManager;
  gameManager: GameManager;

  state = {
    game: null,
    isLoading: true,
    warning: null,
    warningOpen: false,
    error: null,
    errorOpen: false,
    isCrashError: false,
  }

  constructor(props) {
    super(props);
    this.load().catch(error => {
      console.error('Caught init() error:', error);
      this.setState({
        isLoading: false,
        errorOpen: true,
        isCrashError: true,
        error: {
          title: 'Error initializing game',
          content: error.toString(),
        }
      })
    });
  }

  async load() {
    const { name } = this.props.match.params;

    const gameManager = new GameManager(name);
    await gameManager.init();


    if (gameManager.world.params.buildVersion !== VERSION) {
      this.setState({
        warningOpen: true,
        warning: {
          title: 'Outdated World',
          content: (
            <Fragment>
              This map was saved in version <b>{gameManager.world.params.buildVersion || '(no version)'}</b>{' '}
              but you are running version <b>{VERSION}</b>. This might cause errors. Please make a new world.
            </Fragment>
          ),
        },
      });
    }

    this.gameManager = gameManager;

    this.gameManager.worker.workerErrors$.subscribe(error => {
      this.gameManager.pause();
      this.setState({
        errorOpen: true,
        error: {
          title: 'Game worker error',
          content: error,
        },
      })
    });

    console.log('Game loaded', gameManager);

    this.setState({
      game: gameManager,
      isLoading: false
    });
    (window as any).game = gameManager;
  }

  onConsoleInit = (consoleManager: DevConsoleManager) => {
    if (this.gameManager) {
      console.log('consoleManager', consoleManager);
      this.gameManager.state.ticks.subscribe(consoleManager.ticks);
      this.gameManager.state.delta.subscribe(consoleManager.delta);
    }
  }

  componentDidCatch(error: Error, info) {
    this.setState({
      errorOpen: true,
      isCrashError: true,
      error: {
        title: 'React Error',
        content: (
          <div>
            An error happened rendering child components under GameView.
            <pre className={Classes.CODE_BLOCK}>
              {error.toString()}
              {info.componentStack}
            </pre>
          </div>
        ),
      },
    });
  }

  render() {
    if (this.state.isLoading) {
      return <Spinner/>;
    }

    return (
      <Fragment>
        <Alert
          isOpen={this.state.warningOpen}
          intent="warning"
          onClose={() => this.setState({ warningOpen: false })}
          icon="warning-sign"
        >
          {this.state.warning && (
            <div className="word-break">
              <div className={classnames(Classes.HEADING, Classes.INTENT_WARNING)}>
                {this.state.warning.title}
              </div>
              {this.state.warning.content}
            </div>
          )}
        </Alert>
        <Alert
          isOpen={this.state.errorOpen}
          intent="danger"
          icon="error"
          className="alert-fit"
          onClose={() => this.setState({ errorOpen: false })}
        >
          {this.state.error && (
            <div className="word-break">
              <div className={classnames(Classes.HEADING, Classes.INTENT_DANGER)}>
                {this.state.error.title}
              </div>
              {this.state.error.content}
            </div>
          )}
        </Alert>
        <DevConsole
          onInit={this.onConsoleInit}
        />
        {!this.state.isCrashError && <GameViewer
          game={this.state.game}
          isLoading={this.state.isLoading}
        />}
      </Fragment>
    );
  }
}
