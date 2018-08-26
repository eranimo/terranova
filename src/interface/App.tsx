import React from 'react';
import { Navbar, NavbarGroup, NavbarDivider, Button, NavbarHeading, Alignment } from '@blueprintjs/core';
import { Simulation } from '../simulation';
import WorldViewer from './WorldViewer';


export default class App extends React.Component<{
  simulation: Simulation
}> {
  render() {
    const { simulation } = this.props;

    return (
      <div>
        <Navbar>
          <NavbarGroup align={Alignment.LEFT}>
            <NavbarHeading>Terra Nova</NavbarHeading>
            <NavbarDivider />
            <Button className="pt-minimal" icon="home" text="Home" />
            <Button className="pt-minimal" icon="document" text="Files" />
          </NavbarGroup>
        </Navbar>
        <main>
          <WorldViewer world={simulation.world} />
        </main>
      </div>
    )
  }
}
