import Alea from 'alea';
import React, { Component, createRef, RefObject } from 'react';
import { RouteComponentProps } from 'react-router';
import SimplexNoise from 'simplex-noise';
import Stats from 'stats.js';
import * as THREE from 'three';
const OrbitControls = require('three-orbit-controls')(THREE);
import { geoDelaunay } from 'd3-geo-voronoi';
import * as Coordinate from 'coordinate-systems';


function getFibonacciSpherePoints(samples, radius, randomize = false) {
  samples = samples || 1;
  radius = radius || 1;
  randomize = randomize || true;
  var random = 1;
  if (randomize === true) {
      random = Math.random() * samples;
  }
  var points = []
  var offset = 2 / samples
  var increment = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < samples; i++) {
      var y = ((i * offset) - 1) + (offset / 2);
      var distance = Math.sqrt(1 - Math.pow(y, 2));
      var phi = ((i + random) % samples) * increment;
      var x = Math.cos(phi) * distance;
      var z = Math.sin(phi) * distance;
      x = x * radius;
      y = y * radius;
      z = z * radius;
      var point = {
          'x': x,
          'y': y,
          'z': z
      }
      points.push(point);
  }
  return points;
}

function cartesianToSpherical(radius, x, y, z): [number, number] {
  return [
    Math.acos(z / radius),
    Math.atan(y / x),
  ];
}

function sphericalToCartesian(radius: number, inclination: number, azimuth: number): [number, number, number] {
  return [
    radius * Math.sin(inclination) * Math.cos(azimuth),
    radius * Math.sin(inclination) * Math.sin(azimuth),
    radius * Math.cos(inclination),
  ];
}

function convertCartesian(point, radius = 1) {
  const lambda = point[0] * (Math.PI / 180);
  const phi = point[1] * (Math.PI / 180);
  const cosPhi = Math.cos(phi);
  return new THREE.Vector3(
    radius * cosPhi * Math.cos(lambda),
    radius * cosPhi * Math.sin(lambda),
    radius * Math.sin(phi)
  )
}


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
    ///
    const radius = 5;
    const points = 1500;
    const fibonacciSpherePoints = getFibonacciSpherePoints(points, radius);

    for (var i = 0; i < fibonacciSpherePoints.length; i++) {
      const point = fibonacciSpherePoints[i];
      const geometry = new THREE.SphereGeometry(0.02);
      const material = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.x = point.x;
      sphere.position.y = point.y;
      sphere.position.z = point.z;
      this.scene.add(sphere);
    }

    const pointsLatLong = fibonacciSpherePoints.map(({ x, y, z }) => Coordinate.cart([x, y, z]).spherical());
    const voronoi = geoDelaunay(pointsLatLong);
    console.log(voronoi);

    const landMaterial = new THREE.MeshBasicMaterial({ color: 0x7cfc00, transparent: true });
    const oceanMaterial = new THREE.MeshBasicMaterial({ color: 0x0f2342, transparent: true });

    const materials = [landMaterial, oceanMaterial];

    // const tileMeshes: { mesh: THREE.Mesh, materialIndex: number }[] = [];
    // const totalGeometry = new THREE.Geometry();


    const centerGeometry = new THREE.BufferGeometry();
    const centerMaterial = new THREE.PointsMaterial({ size: .05, color: 0x0000FF });
    const centerPositions = [];
    for (const center of voronoi.centers) {
      const centerPoint = Coordinate.spherical([radius, center[0], center[1]]).cartesian();
      centerPositions.push(centerPoint[0], centerPoint[1], centerPoint[2]);
    }
    centerGeometry.addAttribute('position', new THREE.Float32BufferAttribute(centerPositions, 3));
    centerGeometry.computeBoundingSphere();
    const centers = new THREE.Points(centerGeometry, centerMaterial);
    this.scene.add(centers);

    ////
    const light = new THREE.AmbientLight( 0xffffff );
    light.position.set( 1, 1, 1 ).normalize();
    this.scene.add(light);

    // var object = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    // var box = new THREE.BoxHelper( object, 0xffff00 as any);
    // this.scene.add( box );


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
