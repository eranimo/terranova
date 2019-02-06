<<<<<<< HEAD
import { IWorldCell } from './worldTypes';
import { BehaviorSubject, Observable } from 'rxjs';
=======
import { BehaviorSubject, ReplaySubject } from 'rxjs';
>>>>>>> 0a3483f2aa964fefd5eb9c0345995ebc15c6e16d
import { EGameEvent } from './gameTypes';
import Game, { IGameParams } from './Game';
import { ReactiveWorker } from '../utils/workers';
import { IGameCellView, IPopView } from './GameCell'
import { map, switchMap, merge, mergeMap } from 'rxjs/operators';
import { WorldRegion } from './WorldRegion';
import GameCell from './GameCell';
import { ObservableSet } from './ObservableSet';

const ctx: Worker = self as any;

//// INTERNAL STATE
let game: Game;
////

function channelFromObservableSet<T>(
  set: ObservableSet<T>,
  name: string,
  mappingFunc: (value: T[]) => any,
) {
  worker.addChannel(name, () => {
    return set.asObservable().pipe(map(mappingFunc));
  });
}

function channelFromObservableSetItems<T, V = T>(
  set: ObservableSet<T>,
  nameFunc: (value: T) => string,
  createFunc: (value: T) => Observable<V>,
  mappingFunc: (value: V) => any,
) {
  const createChannel = (item: T) => {
    worker.addChannel(nameFunc(item), () => {
      return createFunc(item).pipe(map(mappingFunc));
    });
  }
  set.value.forEach(createChannel);
  set.add$.subscribe(createChannel);

  set.remove$.subscribe(item => {
    worker.removeChannel(nameFunc(item));
  });
}

function gameInit() {
  game.date$.subscribe(date => worker.send(EGameEvent.DATE, date));

  // emits on every region update (new regions, region changed)
  channelFromObservableSet(
    game.world.regions,
    'regions',
    regions => regions.map(region => region.export())
  );

  channelFromObservableSetItems(
    game.world.regions,
    (region: WorldRegion) => `region/${region.name}`,
    (region: WorldRegion) => region.cells$.asObservable(),
    (cells: IWorldCell[]) => cells.map(cell => ({
      x: cell.x,
      y: cell.y,
    }))
  );

  // //Emits a cell when the cell changes
  worker.addChannel('gamecell', () => {
    return game.gameCell$.pipe(
      mergeMap(gameCell => gameCell.gameCellState$));
  });        

  worker.addChannel('gamecells', () => {
    const updates$ = new BehaviorSubject<GameCell[]>(game.gameCells.value);
    updates$.next(game.gameCells.value);
    game.gameCells.subscribe(updates$);
    game.gameCells.subscribe(gameCells => {
      for (const gameCell of gameCells) {
        gameCell.newPop$.subscribe(() => {
          updates$.next(game.gameCells.value);
        });

        gameCell.pops.subscribe(pop => {
          pop.forEach(pop => pop.popGrowth$.subscribe(() => {
            updates$.next(game.gameCells.value)
          }));
        });
      }
    });
    return updates$.pipe(
      map(gamecells => gamecells.map(gamecell => gamecell.export()))
    );
  })

  for (const [key, subject] of Object.entries(game.state)) {
    worker.send(EGameEvent.STATE_CHANGE, { key, value: subject.value });
    subject.subscribe(value => worker.send(EGameEvent.STATE_CHANGE, { key, value }));
  }

  console.log('game init', game);
}

const worker = new ReactiveWorker(ctx, true)
  .on(EGameEvent.INIT, async ({ params }) => {
    const timeStart = performance.now();
    console.log('game params', params);

    game = new Game(params, (error) => {
      console.error('error', error);
      worker.reportError(error);
    });

    await game.init();
    gameInit();

    const timeEnd = performance.now();
    return timeEnd - timeStart;
  }, true)
  .on(EGameEvent.PLAY, () => game.start())
  .on(EGameEvent.PAUSE, () => game.stop())
  .on(EGameEvent.SLOWER, () => game.slower())
  .on(EGameEvent.FASTER, () => game.faster());
