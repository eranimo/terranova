import { clamp } from '@blueprintjs/core/lib/esm/common/utils';
import { RegionGenerator } from './worldgen/RegionGenerator';
import { worldStore } from './index';
import World from "./world";
import Array2D from '../utils/Array2D';
import Region from './Region';
import { BehaviorSubject, Subject } from 'rxjs';


export interface IGameData {
  entities: any[];
}

export interface IGameParams {
  worldSaveName: string;
  name: string;
  gameData?: IGameData
}

const initialGameData: IGameData = {
  entities: [],
};

class Value<T> extends BehaviorSubject<T> {
  private data: T;

  constructor(initialValue: T) {
    super(initialValue);
    this.data = initialValue;
  }

  set(value: T) {
    if (value !== this.data) {
      this.data = value;
    }
    this.next(value);
  }

  get(): T {
    return this.data;
  }
}

interface IGameState {
  started: Value<boolean>;
  running: Value<boolean>;
  ticks: Value<number>;
  days: Value<number>;
  speed: Value<EGameSpeed>;
  speedIndex: Value<number>;
}

export enum EGameSpeed {
  SLOW = 0.5,
  NORMAL = 2,
  FAST = 10,
  VERY_FAST = 20,
}

const speeds = [
  EGameSpeed.SLOW,
  EGameSpeed.NORMAL,
  EGameSpeed.FAST,
  EGameSpeed.VERY_FAST,
];

export const gameSpeedTitles = {
  [EGameSpeed.SLOW]: 'Slow',
  [EGameSpeed.NORMAL]: 'Normal',
  [EGameSpeed.FAST]: 'Fast',
  [EGameSpeed.VERY_FAST]: 'Very Fast',
}

// https://isaacsukin.com/news/2015/01/detailed-explanation-javascript-game-loops-and-timing#starting-stopping
class GameLoop {
  state: IGameState;
  lastFrameTimeMs: number;
  lastFPSUpdate: number;
  framesThisSecond: number;
  frameID: number;
  fps: number;
  maxFPS: number;
  delta: number;
  timestep: number;
  ticksPerDay: number;

  MAX_SPEED = speeds.length;

  constructor(
    maxFPS: number = 60,
    ticksPerDay: number = 120,
  ) {
    this.state = {
      started: new Value<boolean>(false),
      running: new Value<boolean>(false),
      ticks: new Value<number>(0),
      days: new Value<number>(0),
      speed: new Value<EGameSpeed>(EGameSpeed.NORMAL),
      speedIndex: new Value<EGameSpeed>(1),
    };
    this.lastFrameTimeMs = 0;
    this.lastFPSUpdate = 0;
    this.framesThisSecond = 0;
    this.maxFPS = maxFPS;
    this.fps = 0;
    this.delta = 0;
    this.ticksPerDay = ticksPerDay;
    this.timestep = 1000 / (this.maxFPS * this.state.speed.get());
  }

  public start() {
    if (this.state.started.get()) return;
    this.state.started.set(true);
    this.frameID = requestAnimationFrame(timestamp => {
      this.state.running.set(true);
      this.lastFrameTimeMs = timestamp;
      this.lastFPSUpdate = timestamp;
      this.framesThisSecond = 0;
      this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
    })
  }

  public stop() {
    this.state.running.set(false);
    this.state.started.set(false);
    cancelAnimationFrame(this.frameID);
  }

  public togglePlay() {
    if (this.state.running.get()) {
      this.stop();
    } else {
      this.start();
    }
  }

  public slower() {
    const newIndex = clamp(this.state.speedIndex.get() - 1, 0, speeds.length);
    this.state.speedIndex.set(newIndex);
    this.state.speed.set(speeds[newIndex]);
  }

  public faster() {
    const newIndex = clamp(this.state.speedIndex.get() + 1, 0, speeds.length);
    this.state.speedIndex.set(newIndex);
    this.state.speed.set(speeds[newIndex]);
  }

  private mainLoop(timestamp: number) {
    // throttle frame rate
    if (timestamp < this.lastFrameTimeMs + (1000 / this.maxFPS)) {
      this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
      return;
    }

    this.delta += timestamp - this.lastFrameTimeMs;
    this.lastFrameTimeMs = timestamp;

    if (timestamp > this.lastFPSUpdate + 1000) {
      this.fps = 0.25 * this.framesThisSecond + 0.75 * this.fps;
      this.lastFPSUpdate = timestamp;
      this.framesThisSecond = 0;
    }
    this.framesThisSecond++;

    let numUpdateSteps = 0;
    while (this.delta >= this.timestep) {
      this.state.ticks.set(this.state.ticks.get() + this.state.speed.get());
      this.state.days.set(Math.floor(this.state.ticks.get() / this.ticksPerDay));
      this.update(this.timestep);
      this.delta -= this.timestep;
      if (++numUpdateSteps >= 240) {
        this.panic();
        break;
      }
    }

    this.draw(this.delta / this.timestep);
    this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
  }

  // application was deprioritized, usually due to being in a background tab
  // or the app is running on a slow computer
  private panic() {
    this.delta = 0;
  }

  update(delta: number) {

  }
  draw(delta: number) {

  }
}

export default class Game extends GameLoop {
  name: string;
  world: World | null;
  regions: Array2D<Region>;
  gameData: IGameData;
  params: IGameParams;
  regionGenerator: RegionGenerator;

  constructor(params: IGameParams) {
    super();
    this.name = params.name;
    this.gameData = params.gameData || Object.assign({}, initialGameData);
    this.params = params;
    this.world = null;
  }

  async init() {
    this.start();
    this.world = await worldStore.load(this.params.worldSaveName);
    const scale = 10;
    const regionSize = { width: 10, height: 10 };
    // number of regions along the X,Y axis
    const regionX = this.world.size.width / regionSize.width;
    const regionY = this.world.size.height / regionSize.height;
    this.regions = new Array2D(regionX, regionY);
    const worldLocalWidth = this.world.size.width * scale;
    const worldLocalHeight = this.world.size.height * scale;
    console.log('worldLocalWidth', worldLocalWidth);
    console.log('worldLocalHeight', worldLocalHeight);

    this.regionGenerator = new RegionGenerator(this.world, {
      scale,
      regionSize,
    });

    const promises = []
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        promises.push(this.regionGenerator.generateRegion(x, y));
      }
    }
    Promise.all(promises)
      .then(regions => {
        console.log(regions);
      });
  }
}
