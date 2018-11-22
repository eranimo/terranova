import React, { Component, Fragment } from 'react';
import styled from 'styled-components';
import WorldMapContainer, { IWorldMapContainerChildProps } from '../worldview/WorldMapContainer';
import { FullSizeBlock } from '../components/layout';
import { Button, Colors, ButtonGroup, Tooltip, Position, Intent, Popover, Menu, Classes, Divider, Icon } from '@blueprintjs/core';
import { mapModeDesc, EMapMode } from '../worldview/mapModes';
import { Link } from 'react-router-dom';
import classnames from 'classnames';
import Game from '../../simulation/Game';
import { EGameSpeed, gameSpeedTitles, EMonth, IGameDate } from '../../simulation/GameLoop';


const GameViewContainer = styled.div`
  display: flex;
  position: fixed;
  background-color: rgba(47,65,79,0.9);
  border: 1px solid rgba(47,65,79,1);
  padding: 0.5rem;
  box-shadow: 1px 1px 20px 0px rgba(0, 0, 0, 0.5);
  margin: -1px;
  border-radius: 3px;
`;

const GameMenuContainer = styled(GameViewContainer)`
  top: 0;
  left: 0;
`;

const monthTitles = {
  [EMonth.JANUARY]: 'January',
  [EMonth.FEBRUARY]: 'February',
  [EMonth.MARCH]: 'March',
  [EMonth.APRIL]: 'April',
  [EMonth.MAY]: 'May',
  [EMonth.JUNE]: 'June',
  [EMonth.JULY]: 'July',
  [EMonth.AUGUST]: 'August',
  [EMonth.SEPTEMBER]: 'September',
  [EMonth.OCTOBER]: 'October',
  [EMonth.NOVEMBER]: 'November',
  [EMonth.DECEMBER]: 'December',
}

class TimeDisplay extends Component<{ game: Game }, { date: IGameDate }> {
  state = {
    date: {
      dayOfMonth: 0,
      month: 0,
      year: 0,
    },
  }

  componentWillMount() {
    this.props.game.date$.subscribe(date => this.setState({ date }));
  }

  render() {
    const { dayOfMonth, month, year } = this.state.date;
    const monthName = monthTitles[month];
    const yearNum = year.toLocaleString();

    return `${monthName} ${dayOfMonth}, Y${yearNum}`;
  }
}

class PlayButton extends Component<{ game: Game }, { running: boolean }> {
  state = {
    running: false,
  }

  componentWillMount() {
    this.props.game.state.running.subscribe(running => this.setState({ running }));
  }

  render() {
    return (
      <Button
        minimal
        icon={this.state.running ? 'pause' : 'play'}
        onClick={() => this.props.game.togglePlay()}
      />
    );
  }
}

class GameSpeedControls extends Component<{ game: Game }, { speed: EGameSpeed, speedIndex: number }> {
  state = {
    speed: 0,
    speedIndex: 0,
  }

  componentWillMount() {
    this.props.game.state.speed.subscribe(speed => this.setState({ speed }));
    this.props.game.state.speedIndex.subscribe(speedIndex => this.setState({ speedIndex }));
  }

  render() {
    const { game } = this.props;
    const { speed, speedIndex } = this.state;

    return (
      <ButtonGroup minimal>
        <Button
          icon="double-chevron-left"
          disabled={speedIndex === 0}
          onClick={() => game.slower()}
        />
        <Button style={{ width: 134 }}>
          Speed: <b>{gameSpeedTitles[speed.toString()]}</b>
        </Button>
        <Button
          icon="double-chevron-right"
          disabled={speedIndex === (game.MAX_SPEED - 1)}
          onClick={() => game.faster()}
        />
      </ButtonGroup>
    )
  }
}

export class GameMenu extends Component<{ game: Game }> {
  render() {
    const { game } = this.props;
    const menu = (
      <Menu>
        <Link to="/" className={classnames(Classes.MENU_ITEM, Classes.iconClass('log-out'))}>
          Exit game
        </Link>
      </Menu>
    );

    return (
      <GameMenuContainer>
        <Popover content={menu} position={Position.BOTTOM}>
          <Button icon="menu" minimal />
        </Popover>
        <Divider />
        <PlayButton game={game} />
        <Button
          minimal
          style={{ width: 140 }}
        >
          <TimeDisplay game={game} />
        </Button>
        <GameSpeedControls game={game} />
      </GameMenuContainer>
    )
  }
}

const GameControlsContainer = styled(GameViewContainer)`
  bottom: 0;
  right: 0;
`;

export class GameControls extends Component<IWorldMapContainerChildProps> {
  render() {
    const { viewOptions, selectedCell, onChangeField, onChangeMapMode, deselect } = this.props;
    const menu = (
      <Menu>
        {Object.entries(mapModeDesc).map(([name, title]) => (
          <Menu.Item
            key={name}
            text={title}
            active={viewOptions.mapMode === name}
            onClick={() => onChangeMapMode(name as EMapMode)}
          />
        ))}
      </Menu>
    );
    return (
      <GameControlsContainer>
        <Popover content={menu}>
          <Button minimal small rightIcon="chevron-up">
            Map Mode: <b>{mapModeDesc[viewOptions.mapMode]}</b>
          </Button>
        </Popover>
        <Divider />
        <ButtonGroup minimal>
          <Tooltip content="Toggle grid" hoverOpenDelay={1000} position={Position.TOP}>
            <Button
              small
              icon="grid"
              onClick={onChangeField('drawGrid')}
              intent={viewOptions.drawGrid ? Intent.PRIMARY : null}
            />
          </Tooltip>
          <Tooltip content="Toggle developer mode" hoverOpenDelay={1000} position={Position.TOP}>
            <Button
              small
              icon="info-sign"
              onClick={onChangeField('showFlowArrows')}
              intent={viewOptions.showFlowArrows ? Intent.PRIMARY : null}
            />
          </Tooltip>
          <Tooltip content="Toggle coastal borders" hoverOpenDelay={1000} position={Position.TOP}>
            <Button
              small
              icon="horizontal-distribution"
              onClick={onChangeField('drawCoastline')}
              intent={viewOptions.drawCoastline ? Intent.PRIMARY : null}
            />
          </Tooltip>
        </ButtonGroup>
      </GameControlsContainer>
    )
  }
}

interface IGameViewerProps {
  game: Game,
  isLoading: boolean,
}
export default class GameViewer extends Component<IGameViewerProps> {
  render() {
    const { game, isLoading } = this.props;

    return (
      <FullSizeBlock>
        <WorldMapContainer
          world={game.world}
          isLoading={isLoading}
          style={{ top: 0 }}
        >
          {(props: IWorldMapContainerChildProps) => (
            <Fragment>
              <GameMenu game={game} />
              <GameControls {...props} />
            </Fragment>
          )}
        </WorldMapContainer>
      </FullSizeBlock>
    )
  }
}
