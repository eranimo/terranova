import { IWorldRegionView } from './WorldRegion';
import { Subject, BehaviorSubject, fromEvent, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { IGameDate } from './GameLoop';
import { EGameEvent, IGameWorkerEventData } from './gameTypes';
import { IGameParams } from './Game';
import World from './World';
import { worldStore, gameStore } from "./stores";
import Array2D from '../utils/Array2D';
import { WorldMap } from '../common/WorldMap';


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
  workerEvents$: Observable<IGameWorkerEventData>;

  constructor(saveName: string) {
    this.saveName = saveName;
  }

  async init() {
    // load game data from DB
    this.params = await gameStore.load(this.saveName);

    // start game worker
    this.worker = new GameWorker();
    this.workerEvents$ = fromEvent<MessageEvent>(this.worker, 'message')
      .pipe(map(event => ({
        type: event.data.type,
        id: event.data.id,
        payload: event.data.payload
      })));

    this.date$ = new Subject();
    this.observeEvent(EGameEvent.DATE)
      .subscribe(({ payload }) => this.date$.next(payload as IGameDate));

    this.state = {
      started: new BehaviorSubject(undefined),
      running: new BehaviorSubject(undefined),
      ticks: new BehaviorSubject(undefined),
      dayCount: new BehaviorSubject(undefined),
      speed: new BehaviorSubject(undefined),
      speedIndex: new BehaviorSubject(undefined),
    };

    // load world data
    this.world = await worldStore.load(this.params.worldSaveName);

    // send INIT event to worker
    this.sendEvent(EGameEvent.INIT, { params: this.params });

    // listen for state change events
    this.observeEvent(EGameEvent.STATE_CHANGE)
      .subscribe(({ payload }) => {
        const { key, value } = payload;
        this.state[key].next(value);
      });

    // loading state
    this.loading$ = new BehaviorSubject(true);
    this.observeEvent(EGameEvent.LOADED).subscribe(() => this.loading$.next(true));

    // world map events
    this.worldMap = new WorldMap(this.world)
    this.observeEvent(EGameEvent.NEW_REGION).subscribe(({ payload }) => {
      const region: IWorldRegionView = payload;
      this.worldMap.addRegion(region);
    });
  }

  observeEvent(type: EGameEvent) {
    return this.workerEvents$.pipe(filter((event) => event.type === type ));
  }

  sendEvent(eventName: EGameEvent, params?: any) {
    const eventData: IGameWorkerEventData = {
      type: eventName,
      id: +new Date(),
      payload: params,
    };
    this.worker.postMessage(eventData)
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
