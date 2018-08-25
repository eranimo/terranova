import React from 'react';
import { Navbar, NavbarGroup, NavbarDivider, Button, NavbarHeading, Alignment } from '@blueprintjs/core';


export default function App() {
  return (
    <Navbar>
      <NavbarGroup align={Alignment.LEFT}>
        <NavbarHeading>Terra Nova</NavbarHeading>
        <NavbarDivider />
        <Button className="pt-minimal" icon="home" text="Home" />
        <Button className="pt-minimal" icon="document" text="Files" />
      </NavbarGroup>
    </Navbar>
  )
}
