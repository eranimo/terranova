import React, { Component, Fragment, ReactNode } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { Hotkeys, Hotkey, HotkeysTarget } from "@blueprintjs/core";
import { Subject, Subscribable, Subscription, Observable, ReplaySubject } from "rxjs";
import { round } from 'lodash';
import { take, bufferCount, map } from "rxjs/operators";
import { average } from "simple-statistics";


const Container = styled.div`
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  text-align: right;
  top: 0;
  right: 0;
  padding: 1rem;
  user-select: none;
  pointer-events: none;
`;

export class DevConsoleManager {
  delta: ReplaySubject<number>;
  avgDelta: Observable<number>;
  ticks: ReplaySubject<number>;

  constructor() {
    this.delta = new ReplaySubject(1);
    this.ticks = new ReplaySubject(1);
    this.avgDelta = this.delta.pipe(
      bufferCount(30),
      map(deltas => average(deltas))
    );
  }
}

class Connect<T> extends Component<{
  to: Observable<T>,
  initialState: T,
  children: (value: T) => ReactNode
}, {
  value: T
}> {
  subscription: Subscription;

  constructor(props) {
    super(props);
    this.state = {
      value: this.props.initialState
    };
  }

  componentDidMount() {
    this.subscription = this.props.to.subscribe(value => this.setState({ value }));
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  render() {
    return this.props.children(this.state.value);
  }
}

@HotkeysTarget
class DevConsoleContainer extends Component<{
  open: boolean,
  manager: DevConsoleManager,
  toggleOpen: (e: KeyboardEvent) => any
}> {
  renderHotkeys() {
    return (
      <Hotkeys>
        <Hotkey
          global
          combo="shift + d"
          label="Toggle dev console"
          onKeyDown={this.props.toggleOpen}
        />
      </Hotkeys>
    );
  }

  render() {
    if (!this.props.open) {
      return <div />;
    }

    return (
      <Container>
        <b>tick #</b>: <span style={{ width: 50, display: 'inline-block' }}>
          <Connect<number> to={this.props.manager.ticks} initialState={0}>
            {value => value.toLocaleString()}
          </Connect>
        </span>
        <br />
        <b>ms/frame</b>: <span style={{ width: 50, display: 'inline-block' }}>
          <Connect<number> to={this.props.manager.delta} initialState={0}>
            {value => round(value, 2)}
          </Connect>
        </span>
        <br />
        <b>avg. ms/frame</b>: <span style={{ width: 50, display: 'inline-block' }}>
          <Connect<number> to={this.props.manager.avgDelta} initialState={0}>
            {value => round(value, 2)}
          </Connect>
        </span>
      </Container>
    )
  }
}


export class DevConsole extends Component<{
  onInit: (console: DevConsoleManager) => any
}, {
  open: boolean;
}> {
  elem: HTMLDivElement;
  manager: DevConsoleManager;
  state = {
    open: false,
  };

  constructor(props) {
    super(props);
    this.elem = document.createElement('div');
    this.manager = new DevConsoleManager();
    this.props.onInit(this.manager);
  }

  componentDidMount() {
    document.body.appendChild(this.elem);
  }

  componentWillUnmount() {
    document.body.removeChild(this.elem);
  }

  toggleOpen = () => this.setState({ open: !this.state.open })

  render() {
    return createPortal((
      <DevConsoleContainer
        open={this.state.open}
        manager={this.manager}
        toggleOpen={this.toggleOpen}
      />
    ), this.elem);
  }
}
