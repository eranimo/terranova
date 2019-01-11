import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { RouteComponentProps } from 'react-router'

import {
  Classes,
  Card,
  Menu,
} from '@blueprintjs/core';
import styled from 'styled-components';
import { ISaveStoreEntry } from '../../simulation/SaveStore';
import { IconNames } from '@blueprintjs/icons';
import classnames from 'classnames';


const Container = styled.div`
  width: 400px;
  margin: 0 auto;
  margin-top: 2rem;
`;

export class MainMenu extends Component<RouteComponentProps<{}>, {}> {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Container>
        <h1>Terra Nova</h1>
        <Card style={{ padding: 0 }}>
            <Menu large>
            <Link
              className={classnames(Classes.MENU_ITEM, Classes.iconClass('new-object'))}
              to="/game/new"
            >
              New Game
            </Link>
            <Link
              className={classnames(Classes.MENU_ITEM, Classes.iconClass('play'))}
              to="/game/load"
            >
              Load Game
            </Link>
            <Link
              className={classnames(Classes.MENU_ITEM, Classes.iconClass('map'))}
              to="/world/load"
            >
              Load World
            </Link>
            <Link
              className={classnames(Classes.MENU_ITEM, Classes.iconClass('map-create'))}
              to="/world/editor"
            >
              New World
            </Link>
          </Menu>
        </Card>
      </Container>
    )
  }
}
