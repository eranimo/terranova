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


const GameWorker = require('./game.worker');

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
  state: any;

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

    this.state = {
      started: new BehaviorSubject<boolean>(undefined),
      running: new BehaviorSubject<boolean>(undefined),
      ticks: new BehaviorSubject<number>(undefined),
      dayCount: new BehaviorSubject<number>(undefined),
      speed: new BehaviorSubject<number>(undefined),
      speedIndex: new BehaviorSubject<number>(undefined),
      delta: new BehaviorSubject<number>(undefined),
    };

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

        this.worker.channel('regions', (regions) => {
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
          // if (gameCell) {
          //   console.log('Pop Info', gameCell.pops.reduce((prev, next) => prev + next.population, 0));
          //   this.worldMap.addGameCell(gameCell);
          // }
        });

        this.worker.channel('gamecell/0', (gamecell) => {
          console.log('gamecell channel', gamecell);
        });
      });

    // listen for state change events
    this.worker.on(EGameEvent.STATE_CHANGE)
      .subscribe(({ key, value }) => {
        this.state[key].next(value);
      });
  }

  pause() {
    this.worker.action(EGameEvent.PAUSE).send();
  }

  play() {
    this.worker.action(EGameEvent.PLAY).send();
  }

  togglePlay() {
    if (this.state.running.value) {
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
