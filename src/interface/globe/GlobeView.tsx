import React, { Component, createRef, RefObject } from "react";
import { RouteComponentProps } from "react-router";
import * as THREE from 'three';
const OrbitControls = require('three-orbit-controls')(THREE);
import Hexasphere from 'hexasphere.js';
import { materialize } from "rxjs/operators";
import Stats from 'stats.js';
import SimplexNoise from 'simplex-noise';
import Alea from 'alea';
import { colorToNumber, getHexColor } from "../../utils/color";


class GlobeViewer {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  stats: Stats;

  constructor(element: HTMLDivElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    element.appendChild(this.renderer.domElement);

    this.stats = new Stats();
    this.stats.showPanel(1);
    document.body.appendChild(this.stats.dom);

    const rng = new (Alea as any)(Math.random());
    const noise = new SimplexNoise(rng);

    this.camera.position.set(0, 6, 6);

    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      // color: 0xffff00,
    });
    const sphere = new THREE.Mesh( geometry, material );
    this.scene.add( sphere );

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = 5 * 360;
    const height = 5 * 180;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const nx = x / width - 0.5;
        const ny = y / height - 0.5;
        const value = ((noise.noise2D(30 * nx, 30 * ny) + 1) / 2) * 255;
        const heightColor = colorToNumber(value, value, value);
        // const heightColor = value < 100 ? 0xC0C0C0 : 0xDEDEDE;
        ctx.fillStyle = `#${getHexColor(heightColor)}`;
        ctx.fillRect(x, y, 1, 1,);
      }
    }

    const heightTexture = new THREE.CanvasTexture(
      canvas,
      THREE.EquirectangularReflectionMapping,
      THREE.ClampToEdgeWrapping,
      THREE.ClampToEdgeWrapping,
      THREE.NearestFilter,
      THREE.NearestFilter,
    );
    material.map = heightTexture;

    const light = new THREE.AmbientLight( 0xffffff );
    light.position.set( 1, 1, 1 ).normalize();
    this.scene.add(light);

    var object = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    var box = new THREE.BoxHelper( object, 0xffff00 as any);
    this.scene.add( box );


    new OrbitControls(this.camera, this.renderer.domElement);

    console.time('draw');
    this.draw();
    console.timeEnd('draw');
  }

  draw() {
    requestAnimationFrame(this.draw.bind(this));
    this.stats.begin();
    this.renderer.render(this.scene, this.camera);
    this.stats.end();
  }
}

export class GlobeView extends Component<RouteComponentProps<{}>> {
  _scene: RefObject<HTMLDivElement>;
  viewer: GlobeViewer;

  constructor(props) {
    super(props);
    this._scene = createRef();
  }

  componentDidMount() {
    console.time('init');
    this.viewer = new GlobeViewer(this._scene.current);
    console.timeEnd('init');
  }

  render() {
    return (
      <div>
        <div
          ref={this._scene}
          style={{
            border: '1px solid black',
          }}
        />
      </div>
    )
  }
}
