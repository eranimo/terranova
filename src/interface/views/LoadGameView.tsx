import React, { Component } from 'react';
import { WorldGenerator, gameStore } from '../../simulation';
import { Link } from 'react-router-dom';
import { RouteComponentProps } from 'react-router'

import {
  Classes,
  Card,
  Button,
  Icon,
  Spinner,
  Alert,
  Tooltip,
} from '@blueprintjs/core';
import styled from 'styled-components';
import { ISaveStoreEntry } from '../../simulation/SaveStore';

const Container = styled.div`
  width: 60%;
  margin: 0 auto;
  margin-top: 2rem;
`;

export class LoadGameView extends Component<RouteComponentProps<{}>, {
  saves: ISaveStoreEntry[],
  isLoading: boolean,
  deleteModalSaveName: string | null,
}> {
  simulation: WorldGenerator;

  state = {
    isLoading: true,
    saves: [],
    deleteModalSaveName: null,
  }

  constructor(props) {
    super(props);

    this.simulation = new WorldGenerator();
    this.loadSaves();
  }

  loadSaves() {
    gameStore.getSaves()
      .then(saves => this.setState({ isLoading: false, saves }))
  }

  deleteSave() {
    this.setState({ isLoading: true });
    gameStore.removeSave(this.state.deleteModalSaveName)
    this.loadSaves();
    this.setState({ deleteModalSaveName: null });
  }

  renderSaves() {
    if (this.state.isLoading) {
      return (
        <Spinner />
      );
    }
    if (this.state.saves.length === 0) {
      return (
        <div>
          No game saves
        </div>
      );
    }
    return (
      <table className={[Classes.HTML_TABLE].join(' ')}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {this.state.saves.map((save: ISaveStoreEntry) => (
            <tr key={save.name}>
              <td>
                <Link
                  to={`/game/load/${save.name}`}
                  className={Classes.TEXT_LARGE}
                >
                  {save.name}
                </Link>
              </td>
              <td>
                {new Date(save.createdAt).toLocaleDateString()}
              </td>
              <td>
                <Tooltip
                  content="Delete save"
                  intent="danger"
                >
                  <Button
                    minimal
                    small
                    style={{ minHeight: 17 }}
                    className={Classes.INTENT_DANGER}
                    onClick={() => this.setState({ deleteModalSaveName: save.name })}
                  >
                    <Icon icon="delete" iconSize={12} />
                  </Button>
                </Tooltip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  render() {
    return (
      <Container>
        <h1>Terra Nova</h1>
        <Card>
          <h4 className={Classes.HEADING}>Load Saved Game</h4>
          {this.renderSaves()}
        </Card>
        <Alert
          isOpen={this.state.deleteModalSaveName !== null}
          onCancel={() => this.setState({ deleteModalSaveName: null })}
          onConfirm={() => this.deleteSave()}
          icon="trash"
          intent="danger"
          confirmButtonText="Delete"
          cancelButtonText="Cancel"
        >
          <p>Are you sure you want to delete world save <b>{this.state.deleteModalSaveName}</b>?</p>
        </Alert>
      </Container>
    )
  }
}
