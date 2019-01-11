import React, { Component, FormEvent } from 'react';
import { RouteComponentProps } from 'react-router'

import {
  Card,
  Button,
  InputGroup,
  FormGroup,
  Breadcrumb,
  Classes,
  MenuItem,
} from '@blueprintjs/core';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import classnames from 'classnames';
import { gameStore, worldStore, gameFactory } from "../../simulation/stores";
import { Select } from '@blueprintjs/select';
import { ISaveStoreEntry } from '../../simulation/SaveStore';


const WorldSelectInput = Select.ofType<ISaveStoreEntry>();

class WorldSelect extends Component<{
  onSelect: (worldSave: ISaveStoreEntry) => void
}, {
  items: ISaveStoreEntry[],
  value: ISaveStoreEntry | null,
}> {
  state = {
    items: [],
    value: null,
  };

  constructor(props) {
    super(props);

    worldStore.getSaves()
      .then(items => this.setState({ items }));
  }

  renderItem = (worldSave: ISaveStoreEntry, { handleClick, modifiers }) => {
    return (
      <MenuItem
        key={worldSave.name}
        active={modifiers.active}
        text={worldSave.name}
        onClick={handleClick}
        label={new Date(worldSave.createdAt).toLocaleDateString()}
      />
    )
  }

  handleSelect = (item: ISaveStoreEntry) => {
    this.setState({ value: item });
    this.props.onSelect(item);
  }

  render() {
    return (
      <WorldSelectInput
        items={this.state.items}
        itemRenderer={this.renderItem}
        itemPredicate={(query, item) => item.name.toLowerCase().includes(query.toLowerCase())}
        onItemSelect={item => this.handleSelect(item)}
        noResults={<MenuItem disabled={true} text="No results." />}
      >
        <Button
          text={this.state.value
            ? <span>World: <b>{this.state.value.name}</b></span>
            : 'Select a world'}
          rightIcon="double-caret-vertical"
        />
      </WorldSelectInput>
    );
  }
}

const Container = styled.div`
  width: 50%;
  margin: 0 auto;
  margin-top: 2rem;
`;

export class NewGameView extends Component<RouteComponentProps<{}>, {
  worldSave: ISaveStoreEntry,
  name: string,
}> {
  state = {
    worldSave: null,
    name: '',
  };

  onSubmit = (event: FormEvent) => {
    console.log('new game', this.state);
    gameFactory({
      worldSaveName: this.state.worldSave.name,
      name: this.state.name,
    }).then(() => {
      this.props.history.push(`/game/load/${this.state.name}`);
    });
    event.preventDefault();
    return false;
  }

  isInvalid = () => (
    this.state.name.length === 0 || this.state.worldSave === null
  )

  render() {
    return (
      <Container>
        <h1>Terra Nova</h1>
        <ul className={Classes.BREADCRUMBS} style={{ margin: '1rem 0' }}>
          <li>
            <Link to={'/'} className={Classes.BREADCRUMB}>
              Main Menu
            </Link>
          </li>
          <li>
            <span className={classnames(Classes.BREADCRUMB, Classes.BREADCRUMB_CURRENT)}>
              New Game
            </span>
          </li>
        </ul>
        <Card>
          <form onSubmit={this.onSubmit}>
            <FormGroup
              label="Select world"
            >
              <WorldSelect
                onSelect={(worldSave) => this.setState({ worldSave })}
              />
            </FormGroup>
            <FormGroup
              label="Game Name"
              helperText="Enter a name for this game. Terra Nova automatically saves your game periodically."
            >
              <InputGroup
                placeholder="Enter a name..."
                autoFocus
                value={this.state.name}
                onChange={event => this.setState({ name: event.target.value })}
              />
            </FormGroup>
            <Button
              type="submit"
              intent="primary"
              disabled={this.isInvalid()}
            >
              Start Game
            </Button>
          </form>
        </Card>
      </Container>
    )
  }
}
