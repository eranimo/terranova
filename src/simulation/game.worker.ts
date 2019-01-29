import { of, Observable, race, combineLatest, concat, ReplaySubject, Subject, BehaviorSubject, merge } from 'rxjs';
import { EGameEvent } from './gameTypes';
import Game from './Game';
import { ReactiveWorker } from '../utils/workers';

import { map, mapTo, mergeMap, mergeAll, switchMap, multicast, combineAll, withLatestFrom } from 'rxjs/operators';
import { IWorldRegionView, WorldRegion } from './WorldRegion';


const ctx: Worker = self as any;

//// INTERNAL STATE
let game: Game;
////


const worker = new ReactiveWorker(ctx, false)
  .on(EGameEvent.INIT, async ({ params }) => {
    const timeStart = performance.now();
    console.log('game params', params);
    game = new Game(params);
    await game.init();

    game.date$.subscribe(date => worker.send(EGameEvent.DATE, date));

    // emits on every region update (new regions, region changed)
    worker.addChannel('regions', () => {
      const updates$ = new BehaviorSubject<WorldRegion[]>(game.world.regions.value);
      game.world.regions.subscribe(updates$);
      game.world.regions.subscribe(regions => {
        regions.forEach(region =>
          region.cells$.updates$.subscribe(() => {
            updates$.next(game.world.regions.value);
          }))
      });
      return updates$.pipe(
        map(regions => regions.map(region => region.export()))
      );
    });

    game.newRegion$.subscribe(region => {
      // worker.addChannel(`channel-${region.name}`)
      // console.log('game.worker: NEW REGION', region)
      // worker.send(EGameEvent.NEW_REGION, region.export());
    });

    for (const [key, subject] of Object.entries(game.state)) {
      worker.send(EGameEvent.STATE_CHANGE, { key, value: subject.value });
      subject.subscribe(value => worker.send(EGameEvent.STATE_CHANGE, { key, value }));
    }

    console.log('game init', game);

    const timeEnd = performance.now();
    return timeEnd - timeStart;
  }, true)
  .on(EGameEvent.PLAY, () => game.start())
  .on(EGameEvent.PAUSE, () => game.stop())
  .on(EGameEvent.SLOWER, () => game.slower())
  .on(EGameEvent.FASTER, () => game.faster());
