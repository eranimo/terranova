import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { EGameEvent } from './gameTypes';
import Game, { IGameParams } from './Game';
import { ReactiveWorker } from '../utils/workers';
import { IGameCellView, IPopView } from './GameCell'
import { map, switchMap, merge, mergeMap } from 'rxjs/operators';
import { WorldRegion } from './WorldRegion';
import GameCell from './GameCell';

const ctx: Worker = self as any;

//// INTERNAL STATE
let game: Game;
////


function gameInit() {
  game.date$.subscribe(date => worker.send(EGameEvent.DATE, date));

  // emits on every region update (new regions, region changed)
  worker.addChannel('regions', () => {
    const updates$ = new BehaviorSubject<WorldRegion[]>(game.world.regions.value);
    updates$.next(game.world.regions.value);
    game.world.regions.subscribe(updates$);
    game.world.regions.subscribe(regions => {
      for (const region of regions) {
        region.cells$.updates$.subscribe(() => {
          updates$.next(game.world.regions.value);
        });
      }
    });
    return updates$.pipe(
      map(regions => regions.map(region => region.export()))
    );
  });

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

const worker = new ReactiveWorker(ctx, false)
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
