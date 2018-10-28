import React, { Component } from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import { WorldEditorView } from './views/WorldEditorView';
import { SelectWorldView } from './views/SelectWorldView';
import { LoadWorldView } from './views/LoadWorldView';
import { GameView } from './views/GameView';

export class Application extends Component {
  render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route
            exact
            path="/"
            component={SelectWorldView}
          />
          <Route
            path="/editor"
            component={WorldEditorView}
          />
          <Route
            path="/world/:saveName"
            component={LoadWorldView}
          />
          <Route
            path="/game/:name"
            component={GameView}
          />
        </Switch>
      </BrowserRouter>
    )
  }
}
