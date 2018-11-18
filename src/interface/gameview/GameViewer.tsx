import React, { Component, Fragment } from 'react';
import World from "../../simulation/world";
import styled from 'styled-components';
import WorldMapContainer, { IWorldMapContainerChildProps } from '../worldview/WorldMapContainer';
import { FullSizeBlock } from '../components/layout';
import { Button, Colors, ButtonGroup, Tooltip, Position, Intent, Popover, Menu, Classes, Divider } from '@blueprintjs/core';
import { mapModeDesc, EMapMode } from '../worldview/mapModes';
import { Link } from 'react-router-dom';
import classnames from 'classnames';


const GameViewContainer = styled.div`
  display: flex;
  position: fixed;
  background-color: rgba(47,65,79,0.8);
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

export class GameMenu extends Component {
  render() {
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
  world: World,
  isLoading: boolean,
}
export default class GameViewer extends Component<IGameViewerProps> {
  render() {
    const { world, isLoading } = this.props;

    return (
      <FullSizeBlock>
        <WorldMapContainer
          world={world}
          isLoading={isLoading}
          style={{ top: 0 }}
        >
          {(props: IWorldMapContainerChildProps) => (
            <Fragment>
              <GameMenu />
              <GameControls {...props} />
            </Fragment>
          )}
        </WorldMapContainer>
      </FullSizeBlock>
    )
  }
}
