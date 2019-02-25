import { ReactiveWorkerClient } from './../utils/workers';
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
import { IGameCellView } from './GameCell'
import { ObservableDict } from './ObservableDict';


const GameWorker = require('./game.worker');

interface IGameLoopState {
  started: boolean;
  running: boolean;
  ticks: number;
  dayCount: number;
  speed: number;
  speedIndex: number;
  delta: number;
}

/**
 * Interface between the UI & Renderer and the Game Worker
 * - Sends events to the Game Worker
 * - Receives events from the Game Worker
 */
export default class GameManager {
  worker: ReactiveWorkerClient;
  world: World;
  worldMap: WorldMap;
  saveName: string;
  params: IGameParams;
  date$: Subject<IGameDate>;
  loading$: BehaviorSubject<boolean>;
  running$: BehaviorSubject<boolean>;
  state: ObservableDict<IGameLoopState>;

  constructor(saveName: string) {
    this.saveName = saveName;
  }

  async init() {
    // load game data from DB
    this.params = await gameStore.load(this.saveName);

    // start game worker
    this.worker = new ReactiveWorkerClient(new GameWorker(), false);

    this.date$ = new Subject();
    this.worker.on<IGameDate>(EGameEvent.DATE)
      .subscribe((date) => this.date$.next(date));

    this.state = new ObservableDict({
      started: undefined,
      running: undefined,
      ticks: undefined,
      dayCount: undefined,
      speed: undefined,
      speedIndex: undefined,
      delta: undefined,
    });

    // load world data
    this.world = await worldStore.load(this.params.worldSaveName);

    // world map events
    this.worldMap = new WorldMap(this.world)

    // send INIT event to worker
    this.loading$ = new BehaviorSubject(true);
    this.worker.action(EGameEvent.INIT)
      .observe({ params: this.params })
      .subscribe((startupTime) => {
        console.log(`Startup time: ${startupTime}`);
        this.loading$.next(true);

        this.worker.channel('regions');

        this.worker.channel$<IWorldRegionView[]>('regions')
          .subscribe((regions) => {
            console.log('region channel', regions);
            for (const region of regions) {
              this.worldMap.addRegion(region);
            }
          });

        this.worker.channel('region/Alpha', (cells) => {
          console.log('alpha cells', cells);
        });

        this.worker.channel('gamecells', (gameCell) => {
          console.log('gamecells channel', gameCell);
        });

        this.worker.channel('gamecell/0');
        this.worker.channel$('gamecell/0').subscribe((gamecell) => {
          console.log('gamecell channel', gamecell);
        });
      });

    // listen for state change events
    this.worker.on(EGameEvent.STATE_CHANGE)
      .subscribe(({ key, value }) => {
        this.state.set(key, value);
      });


    this.worker.on('population').subscribe((payload) => {
      this.worldMap.setPopulation(payload.population as SharedArrayBuffer)
    });
  }

  pause() {
    this.worker.action(EGameEvent.PAUSE).send();
  }

  play() {
    this.worker.action(EGameEvent.PLAY).send();
  }

  togglePlay() {
    if (this.state.get('running')) {
      this.pause();
    } else {
      this.play();
    }
  }

  faster() {
    this.worker.action(EGameEvent.FASTER).send();
  }

  slower() {
    this.worker.action(EGameEvent.SLOWER).send();
  }
}
