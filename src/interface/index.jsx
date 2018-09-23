import React from 'react';
import { render } from 'react-dom';
import { Application } from './App';

export function setupInterface () {
  render(<Application />, window.document.querySelector('#root'));
}
