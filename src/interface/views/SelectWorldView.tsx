import React, { Component } from 'react';
import { Simulation } from '../../simulation';
import { Link } from 'react-router-dom';
import { RouteComponentProps } from 'react-router'

import {
  Classes,
} from '@blueprintjs/core';

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
      <div>
        <h1>Load saved world</h1>
        <ul className={Classes.LIST}>
          {this.state.saves.map(saveName => (
            <li>
              <Link
                to={`/world/${saveName}`}
              >
                {saveName}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }
}
