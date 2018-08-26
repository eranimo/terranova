import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { Simulation } from '../simulation';


export default function createApp(simulation: Simulation) {
  ReactDOM.render((
    <App simulation={simulation} />
  ), window.document.querySelector('#root'));
}
