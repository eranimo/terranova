import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';


export default function createApp() {
  ReactDOM.render(<App />, document.querySelector('#root'));
}
