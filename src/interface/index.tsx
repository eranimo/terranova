import React from 'react';
import { render } from 'react-dom';
import { Application } from './App';
import './style.css';

export function setupInterface () {
  const root = document.createElement('div');
  document.body.classList.add('bp3-dark');
  root.id = 'root';
  document.body.appendChild(root);
  render(<Application />, root);
}
