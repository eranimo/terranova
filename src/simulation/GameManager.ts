import { IWorldRegionView } from './WorldRegion';
import { Subject, BehaviorSubject } from 'rxjs';
import { IGameDate } from './GameLoop';
import { EGameEvent, IGameWorkerEventData } from './gameTypes';
import { IGameParams } from './Game';
import World from './World';
import { worldStore, gameStore } from "./stores";
import Array2D from '../utils/Array2D';
import { WorldMap } from '../common/WorldMap';
import { IGameCellView } from './GameCell'


const GameWorker = require('./game.worker');

/**
 * Interface between the UI & Renderer and the Game Worker
 * - Sends events to the Game Worker
 * - Receives events from the Game Worker
 */
export default class GameManager {
  worker: Worker;
  world: World;
  worldMap: WorldMap;
  saveName: string;
  params: IGameParams;
  date$: Subject<IGameDate>;
  loading$: BehaviorSubject<boolean>;
  running$: BehaviorSubject<boolean>;
  state: any;

  constructor(saveName: string) {
    this.saveName = saveName;
  }

  async init() {
    // load game data from DB
    this.params = await gameStore.load(this.saveName);

    // start game worker
    this.worker = new GameWorker();

    this.date$ = new Subject();
    this.onEvent(EGameEvent.DATE, (date: IGameDate) => this.date$.next(date));

    this.state = {
      started: new BehaviorSubject(undefined),
      running: new BehaviorSubject(undefined),
      ticks: new BehaviorSubject(undefined),
      dayCount: new BehaviorSubject(undefined),
      speed: new BehaviorSubject(undefined),
      speedIndex: new BehaviorSubject(undefined),
    }

    // load world data
    this.world = await worldStore.load(this.params.worldSaveName);

    // send INIT event to worker
    this.sendEvent(EGameEvent.INIT, {
      params: this.params
    });

    // listen for state change events
    this.onEvent(EGameEvent.STATE_CHANGE, (change) => {
      this.state[change.key].next(change.value);
    });

    // loading state
    this.loading$ = new BehaviorSubject(true);
    this.onEvent(EGameEvent.LOADED, () => this.loading$.next(true));

    // world map
    this.worldMap = new WorldMap(this.world)
    this.onEvent(EGameEvent.NEW_REGION, (region: IWorldRegionView) => {
      console.log('new region', region);
      this.worldMap.addRegion(region);
    });
    this.onEvent(EGameEvent.NEW_GAME_CELL, (gameCell: IGameCellView) => {
      this.worldMap.addGameCell(gameCell);
    })
  }

  sendEvent(eventName: EGameEvent, params?: any) {
    const eventData: IGameWorkerEventData = {
      type: eventName,
      id: +new Date(),
      payload: params,
    };
    this.worker.postMessage(eventData)
  }

  onEvent(type: EGameEvent, callback: (payload) => void) {
    this.worker.addEventListener('message', (event: MessageEvent) => {
      const data = event.data as IGameWorkerEventData;
      if (data.type === type) {
        callback(data.payload);
      }
    });
  }

  togglePlay() {
    if (this.state.running.value) {
      this.sendEvent(EGameEvent.PAUSE);
    } else {
      this.sendEvent(EGameEvent.PLAY);
    }
  }

  faster() {
    this.sendEvent(EGameEvent.FASTER);
  }

  slower() {
    this.sendEvent(EGameEvent.SLOWER);
  }
}
