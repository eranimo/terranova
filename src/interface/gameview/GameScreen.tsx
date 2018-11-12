import React, { Component } from "react";
import Game from "../../simulation/Game";
import GameRenderer from "./GameRenderer";

export default class GameScreen extends Component<{
  game: Game,
}> {
  root: React.RefObject<HTMLDivElement>;
  renderer: GameRenderer;

  constructor(props) {
    super(props);
    this.root = React.createRef();
  }

  componentDidMount() {
    this.renderer = new GameRenderer();
  }

  render() {
    return (
      <div ref={this.root} />
    );
  }
}
