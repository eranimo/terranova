import { BehaviorSubject, Subject } from 'rxjs';
import { clamp } from '@blueprintjs/core/lib/esm/common/utils';


export enum EMonth {
  JANUARY,
  FEBRUARY,
  MARCH,
  APRIL,
  MAY,
  JUNE,
  JULY,
  AUGUST,
  SEPTEMBER,
  OCTOBER,
  NOVEMBER,
  DECEMBER,
}

const MONTHS_IN_YEAR = 12;
const DAYS_IN_MONTH = 30;

function dateFormat(dayCount: number): IGameDate {
  const years = dayCount / (MONTHS_IN_YEAR * DAYS_IN_MONTH);
  const monthF = (years - Math.floor(years)) * MONTHS_IN_YEAR;
  const month = Math.floor(monthF);
  const dayOfMonth = Math.round((monthF - Math.floor(monthF)) * DAYS_IN_MONTH) + 1;
  const year = Math.floor(years + 1);

  return { dayOfMonth, month, year };
}

export interface IGameDate {
  dayOfMonth: number;
  month: EMonth;
  year: number;
}

interface IGameState {
  started: BehaviorSubject<boolean>;
  running: BehaviorSubject<boolean>;
  ticks: BehaviorSubject<number>;
  dayCount: BehaviorSubject<number>;
  speed: BehaviorSubject<EGameSpeed>;
  speedIndex: BehaviorSubject<number>;
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
export default class GameLoop {
  state: IGameState;
  lastFrameTimeMs: number;
  lastFPSUpdate: number;
  framesThisSecond: number;
  frameID: number;
  fps: number;
  maxFPS: number;
  delta: number;
  timestep: number;
  date$: Subject<IGameDate>;

  MAX_SPEED = speeds.length;

  constructor(
    maxFPS: number = 60,
  ) {
    this.state = {
      started: new BehaviorSubject<boolean>(false),
      running: new BehaviorSubject<boolean>(false),
      ticks: new BehaviorSubject<number>(0),
      dayCount: new BehaviorSubject<number>(0),
      speed: new BehaviorSubject<EGameSpeed>(EGameSpeed.NORMAL),
      speedIndex: new BehaviorSubject<EGameSpeed>(1),
    };
    this.lastFrameTimeMs = 0;
    this.lastFPSUpdate = 0;
    this.framesThisSecond = 0;
    this.maxFPS = maxFPS;
    this.fps = 0;
    this.delta = 0;
    this.timestep = 1000 / (this.maxFPS * this.state.speed.value);
    this.date$ = new BehaviorSubject<IGameDate>({
      dayOfMonth: 1,
      month: 0,
      year: 1,
    });

    // update date when dayCount changes
    this.state.dayCount.subscribe(dayCount => this.date$.next(dateFormat(dayCount)));
    this.state.speed.subscribe(speed => {
      this.timestep = 1000 / (this.maxFPS * this.state.speed.value);
    });
  }

  public start() {
    if (this.state.started.value) return;
    this.state.started.next(true);
    this.frameID = requestAnimationFrame(timestamp => {
      this.state.running.next(true);
      this.lastFrameTimeMs = timestamp;
      this.lastFPSUpdate = timestamp;
      this.framesThisSecond = 0;
      this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
    });
  }

  public stop() {
    this.state.running.next(false);
    this.state.started.next(false);
    cancelAnimationFrame(this.frameID);
  }

  public togglePlay() {
    if (this.state.running.value) {
      this.stop();
    } else {
      this.start();
    }
  }

  public slower() {
    const newIndex = clamp(this.state.speedIndex.value - 1, 0, speeds.length);
    this.state.speedIndex.next(newIndex);
    this.state.speed.next(speeds[newIndex]);
  }

  public faster() {
    const newIndex = clamp(this.state.speedIndex.value + 1, 0, speeds.length);
    this.state.speedIndex.next(newIndex);
    this.state.speed.next(speeds[newIndex]);
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
      this.state.ticks.next(this.state.ticks.value + 1);
      this.state.dayCount.next(
        Math.floor(this.state.ticks.value / 60)
      );
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
