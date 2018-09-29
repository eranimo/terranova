import React, { Component } from 'react';
import { Simulation } from '../../simulation';
import { Link } from 'react-router-dom';
import { RouteComponentProps } from 'react-router'

import {
  Classes,
  Card,
  Button,
  Icon,
} from '@blueprintjs/core';
import styled from 'styled-components';

const Container = styled.div`
  width: 60%;
  margin: 0 auto;
  margin-top: 2rem;
`;

export class SelectWorldView extends Component<RouteComponentProps<{}>, {
  saves: string[],
}> {
  simulation: Simulation;

  state = {
    saves: [],
  }

  constructor(props) {
    super(props);

    this.simulation = new Simulation();
    this.simulation.getWorldSaves()
      .then(saves => this.setState({ saves }))
  }

  render() {
    return (
      <Container>
        <h1>Terra Nova</h1>
        <Card>
          <Link
            to={`/editor`}
            className={[Classes.BUTTON, Classes.INTENT_PRIMARY].join(' ')}
          >
            <Icon icon="new-object" />
            <span className={Classes.BUTTON_TEXT}>New World</span>
          </Link>
          <br />
          <br />
          <h4 className={Classes.HEADING}>Load Saved World</h4>
          <ul className={Classes.LIST}>
            {this.state.saves.map(saveName => (
              <li key={saveName}>
                <Link
                  to={`/world/${saveName}`}
                >
                  {saveName}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </Container>
    )
  }
}
