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

import { WorldEditorView } from './views/WorldEditorView';
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
            component={SelectWorldView}
          />
          <Route
            path="/editor"
            component={WorldEditorView}
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
