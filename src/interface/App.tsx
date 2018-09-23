import React, { Component } from 'react';
import {
  Navbar,
  NavbarGroup,
  NavbarDivider,
  Button,
  NavbarHeading,
  Alignment,
  Checkbox,
  RadioGroup,
  Radio,
  Popover,
  PopoverInteractionKind,
  Position,
  Label,
  FormGroup,
  InputGroup,
  ControlGroup,
  Spinner,
  Dialog,
  Classes,
  AnchorButton,
  Intent,
  NumericInput,
} from '@blueprintjs/core';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import { NewWorldView } from './views/NewWorldView';
import { SelectWorldView } from './views/SelectWorldView';
import { LoadWorldView } from './views/LoadWorldView';

export class Application extends Component {
  render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route
            exact
            path="/"
            component={NewWorldView}
          />
          <Route
            path="/worldSelect"
            component={SelectWorldView}
          />
          <Route
            path="/world/:saveName"
            component={LoadWorldView}
          />
        </Switch>
      </BrowserRouter>
    )
  }
}
