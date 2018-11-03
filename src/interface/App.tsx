import React, { Component } from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import { MainMenu } from './views/MainMenu';
import { WorldEditorView } from './views/WorldEditorView';
import { SelectWorldView } from './views/SelectWorldView';
import { LoadWorldView } from './views/LoadWorldView';
import { LoadGameView } from './views/LoadGameView';
import { GameView } from './views/GameView';
import { NewGameView } from './views/NewGameView';

export class Application extends Component {
  render() {
    return (
      <BrowserRouter>
        <Switch>
        <Route
            exact
            path="/"
            component={MainMenu}
          />
          <Route
            exact
            path="/world/load"
            component={SelectWorldView}
          />
          <Route
            path="/world/load/:saveName"
            component={LoadWorldView}
          />
          <Route
            path="/world/editor"
            component={WorldEditorView}
          />
          <Route
            path="/game/new"
            component={NewGameView}
          />
          <Route
            exact
            path="/game/load"
            component={LoadGameView}
          />
          <Route
            path="/game/load/:name"
            component={GameView}
          />
        </Switch>
      </BrowserRouter>
    )
  }
}
