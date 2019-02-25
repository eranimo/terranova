import React, { Component, Fragment, SFC, useContext, useState } from 'react';
import styled from 'styled-components';
import WorldMapContainer, { IWorldMapContainerChildProps } from '../worldview/WorldMapContainer';
import { FullSizeBlock } from '../components/layout';
import { Button, Colors, ButtonGroup, Tooltip, Position, Intent, Popover, Menu, Classes, Divider, Icon, HTMLTable } from '@blueprintjs/core';
import { mapModeDesc, EMapMode, mapModes, MapModeMap } from '../worldview/mapModes';
import { Link } from 'react-router-dom';
import classnames from 'classnames';
import GameManager from '../../simulation/GameManager';
import { EGameSpeed, gameSpeedTitles, EMonth, IGameDate } from '../../simulation/GameLoop';
import { gameMapModes } from './gameMapModes';
import { useObservable } from '../../utils/hooks';
import { GameStateContainer } from './GameView';
import { IWorldRegionView } from '../../simulation/WorldRegion';
import Game from '../../simulation/Game';
import { Minimap } from '../worldview/minimap';
import { IGameCellView, IGameCellDetail } from '../../simulation/GameCell';


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

const GameViewPos = {
  Top: {
    Left: styled(GameViewContainer)`
      top: 0;
      left: 0;
    `,
    Right: styled(GameViewContainer)`
      top: 0;
      right: 0;
    `,
  },
  Bottom: {
    Left: styled(GameViewContainer)`
      bottom: 0;
      left: 0;
    `,
    Right: styled(GameViewContainer)`
      bottom: 0;
      right: 0;
    `,
  }
}

const Flex = styled.div<{ direction?: string }>`
  display: flex;
  flex-direction: ${props => props.direction || 'row'}
`;

const MinimapContainer = styled.div`
  display: flex;
  flex-direction: row;
  margin-bottom: 0.5rem;
  align-self: flex-end;
  outline: 1px solid #000000;
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

const TimeDisplay = () => {
  const { date$ } = useContext(GameStateContainer.Context);
  const date = useObservable(date$, null);
  if (!date) return null;
  const { dayOfMonth, month, year } = date;
  const monthName = monthTitles[month];
  const yearNum = year.toLocaleString();

  return <Fragment>{monthName} {dayOfMonth}, Y{yearNum}</Fragment>;
}

const PlayButton = () => {
  const game = useContext(GameStateContainer.Context);
  const running = useObservable(game.state.ofKey('running'), null);
  return (
    <Button
      minimal
      icon={running ? 'pause' : 'play'}
      onClick={() => game.togglePlay()}
    />
  );
}

const SpeedControls = () => {
  const game = useContext(GameStateContainer.Context);
  const speed = useObservable(game.state.ofKey('speed'), null);
  const speedIndex = useObservable(game.state.ofKey('speedIndex'), null);

  return (
    <ButtonGroup minimal>
      <Button
        icon="double-chevron-left"
        disabled={speedIndex === 0}
        onClick={() => game.slower()}
      />
      {speed && <Button style={{ width: 134 }}>
        Speed: <b>{gameSpeedTitles[speed.toString()]}</b>
      </Button>}
      <Button
        icon="double-chevron-right"
        disabled={speedIndex === 3}
        onClick={() => game.faster()}
      />
    </ButtonGroup>
  )
}

const GameMenu = () => {
  const menu = (
    <Menu>
      <Link to="/" className={classnames(Classes.MENU_ITEM, Classes.iconClass('log-out'))}>
        Exit game
      </Link>
    </Menu>
  );

  return (
    <GameViewPos.Top.Left>
      <Popover content={menu} position={Position.BOTTOM}>
        <Button icon="menu" minimal />
      </Popover>
      <Divider />
      <PlayButton />
      <Button
        minimal
        style={{ width: 140 }}
      >
        <TimeDisplay />
      </Button>
      <SpeedControls />
    </GameViewPos.Top.Left>
  )
}

const GameCellView = ({ id }: { id: number }) => {
  const game = useContext(GameStateContainer.Context);
  const gamecell: IGameCellDetail = useObservable(game.worker.channel$<IGameCellDetail>(`gamecell/${id}`), null);

  if (!gamecell) {
    return <div>Game Cell not known</div>;
  }

  return (
    <div>
      Population: {gamecell.populationSize}
    </div>
  );
}

const MapCellsView = (props: IWorldMapContainerChildProps) => {
  const { selectedCell } = props;
  const game = useContext(GameStateContainer.Context);
  const gamecells = useObservable(game.worker.channel$<IGameCellView[]>('gamecells'), []);
  const [selected, setSelected] = useState<number>(null);

  const gameCellList = (
    <HTMLTable interactive condensed>
      <thead>
        <th>ID</th>
        <th>Location</th>
        <th>Actions</th>
      </thead>
      <tbody>
        {gamecells.map(gamecell => (
          <tr key={gamecell.id}>
            <td>
              {gamecell.id}
            </td>
            <td>({gamecell.xCoord}, {gamecell.yCoord})</td>
            <td>
              <a onClick={() => setSelected(gamecell.id)}>
                View
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </HTMLTable>
  );

  if (selectedCell === null) {
    return (
      <GameViewPos.Bottom.Left>
        <div style={{
          width: 300,
          height: 200,
          overflowY: 'auto',
        }}>
          <div>
            {selected === null ? gameCellList : (
              <div>
                <div>
                  <Button
                    icon="arrow-left"
                    onClick={() => setSelected(null)}
                  >
                    Back
                  </Button>
                  {selected}
                </div>
                <br />
                <GameCellView id={selected} />
              </div>
            )}
          </div>
        </div>
      </GameViewPos.Bottom.Left>
    )
  }

  return (
    <GameViewPos.Bottom.Left>
      {selectedCell.x} {selectedCell.y}
    </GameViewPos.Bottom.Left>
  )
}

export class MapControls extends Component<IWorldMapContainerChildProps & { game: GameManager }> {
  render() {
    const { viewOptions, onChangeField, onChangeMapMode, game } = this.props;
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
      <GameViewPos.Bottom.Right>
        <Flex direction="column">
          <MinimapContainer>
            <Minimap
              worldMap={this.props.game.worldMap}
              mapMode={viewOptions.mapMode}
            />
          </MinimapContainer>
          <Flex>
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
              <Tooltip content="Toggle regions" hoverOpenDelay={1000} position={Position.TOP}>
                <Button
                  small
                  icon="vertical-distribution"
                  onClick={onChangeField('showRegions')}
                  intent={viewOptions.showRegions ? Intent.PRIMARY : null}
                />
              </Tooltip>
            </ButtonGroup>
          </Flex>
        </Flex>
      </GameViewPos.Bottom.Right>
    )
  }
}

interface IGameViewerProps {
  game: GameManager,
  isLoading: boolean,
}
export default class GameViewer extends Component<IGameViewerProps> {
  render() {
    const { game, isLoading } = this.props;

    return (
      <FullSizeBlock>
        <WorldMapContainer
          worldMap={game.worldMap}
          isLoading={isLoading}
          mapModes={gameMapModes}
          style={{ top: 0 }}
        >
          {(props: IWorldMapContainerChildProps) => (
            <Fragment>
              <GameMenu />
              <MapControls {...props} game={game} />
              <MapCellsView {...props} />
            </Fragment>
          )}
        </WorldMapContainer>
      </FullSizeBlock>
    )
  }
}
