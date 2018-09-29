import React from 'react';
import { Link } from 'react-router-dom';
import {
  Classes, Icon
} from '@blueprintjs/core';


export default function BackButton() {
  return (
    <Link
      to={`/`}
      className={[Classes.BUTTON, Classes.MINIMAL].join(' ')}
    >
      <Icon icon="arrow-left" />
      <span className={Classes.BUTTON_TEXT}>Back</span>
    </Link>
  );
}
