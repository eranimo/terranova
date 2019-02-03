import React, { Component, createRef, RefObject } from "react";
import { RouteComponentProps } from "react-router";
import * as THREE from 'three';
const OrbitControls = require('three-orbit-controls')(THREE);
import Hexasphere from 'hexasphere.js';
import { materialize } from "rxjs/operators";
import Stats from 'stats.js';
import SimplexNoise from 'simplex-noise';
import Alea from 'alea';


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

    this.camera.position.set(0, 5, 5);

    console.time('hexasphere generation');
    const hexasphere = new Hexasphere(5, 50, 0.98);
    console.log(hexasphere);
    console.timeEnd('hexasphere generation');
    const landMaterial = new THREE.MeshBasicMaterial({ color: 0x7cfc00, transparent: true });
    const oceanMaterial = new THREE.MeshBasicMaterial({ color: 0x0f2342, transparent: true });

    const materials = [landMaterial, oceanMaterial];

    const tileMeshes: { mesh: THREE.Mesh, materialIndex: number }[] = [];
    const totalGeometry = new THREE.Geometry();
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

      var x = (latLong.lon + 180) / 360;
      var y = (latLong.lat + 90) / 180;
      const height = (noise.noise2D(3 * x, 3 * y) + 1) / 2;
      const materialIndex = (height < 0.5) ? 0 : 1;
      const mesh = new THREE.Mesh(geometry, materials[materialIndex]);
      mesh.matrixAutoUpdate = false;
      tileMeshes.push({ mesh, materialIndex })
    }
    for (const tileMesh of tileMeshes) {
      tileMesh.mesh.updateMatrix();
      totalGeometry.merge(tileMesh.mesh.geometry as any, tileMesh.mesh.matrix, tileMesh.materialIndex)
    }
    const combinedMesh = new THREE.Mesh(totalGeometry, new THREE.MeshFaceMaterial(materials));
    this.scene.add(combinedMesh);

    const light = new THREE.AmbientLight( 0x111111 );
    this.scene.add(light);

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
