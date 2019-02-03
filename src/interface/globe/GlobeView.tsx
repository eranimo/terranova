import React, { Component, createRef, RefObject } from "react";
import { RouteComponentProps } from "react-router";
import * as THREE from 'three';
const OrbitControls = require('three-orbit-controls')(THREE);
import Hexasphere from 'hexasphere.js';
import { materialize } from "rxjs/operators";


class GlobeViewer {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera

  constructor(element: HTMLDivElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    element.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 5, 5);

    const hexasphere = new Hexasphere(5, 55, 0.98);
    console.time('hexasphere generation');
    console.log(hexasphere);
    console.timeEnd('hexasphere generation');
    const landMaterial = new THREE.MeshBasicMaterial({ color: 0x7cfc00, transparent: true });
    const oceanMaterial = new THREE.MeshBasicMaterial({ color: 0x0f2342, transparent: true });

    for (const tile of hexasphere.tiles) {
      const latLong = tile.getLatLon(hexasphere.radius);

      const geometry = new THREE.Geometry();

      for (const bp of tile.boundary) {
        geometry.vertices.push(new THREE.Vector3(bp.x, bp.y, bp.z))
      }

      geometry.faces.push(new THREE.Face3(0,1,2));
      geometry.faces.push(new THREE.Face3(0,2,3));
      geometry.faces.push(new THREE.Face3(0,3,4));

      if(geometry.vertices.length > 5){
        geometry.faces.push(new THREE.Face3(0,4,5));
      }

      const material = (Math.random() < 0.5) ? landMaterial : oceanMaterial;
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
    }

    const light = new THREE.AmbientLight( 0x111111 );
    this.scene.add(light);

    new OrbitControls(this.camera, this.renderer.domElement);

    console.time('initial draw');
    this.draw();
    console.timeEnd('initial draw');
  }

  draw() {
    // requestAnimationFrame(this.draw.bind(this));

    this.renderer.render(this.scene, this.camera);
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
    this.viewer = new GlobeViewer(this._scene.current);
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
