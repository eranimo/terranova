import React, { Component } from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import { MainMenu } from './views/MainMenu';
import { WorldEditorView } from './views/WorldEditorView';
import { LoadWorldView } from './views/LoadWorldView';
import { WorldView } from './worldview';
import { LoadGameView } from './views/LoadGameView';
import { GameView } from './gameview';
import { NewGameView } from './views/NewGameView';

import * as URLS from './urls';
import { GlobeView } from './globe/GlobeView';

(window as any).VERSION = VERSION;

export class Application extends Component {
  render() {
    return (
      <BrowserRouter>
        <Switch>
        <Route
            exact
            path={URLS.MAIN_MENU_URL}
            component={MainMenu}
          />
          <Route
            exact
            path={URLS.LOAD_WORLD_VIEW_URL}
            component={LoadWorldView}
          />
          <Route
            path={URLS.WORLD_VIEW_URL}
            component={WorldView}
          />
          <Route
            path={URLS.NEW_WORLD_VIEW_URL}
            component={WorldEditorView}
          />
          <Route
            path={URLS.NEW_GAME_VIEW_URL}
            component={NewGameView}
          />
          <Route
            exact
            path={URLS.LOAD_GAME_VIEW_URL}
            component={LoadGameView}
          />
          <Route
            path={URLS.GAME_VIEW_URL}
            component={GameView}
          />
          <Route
            path="/globe"
            component={GlobeView}
          />
        </Switch>
      </BrowserRouter>
    )
  }
}
