import { BehaviorSubject, ReplaySubject, merge } from 'rxjs';
import { EGameEvent } from './gameTypes';
import Game from './Game';
import { ReactiveWorker } from '../utils/workers';
import { IGameCellView, IPopView } from './GameCell'
import { map, switchMap } from 'rxjs/operators';
import { WorldRegion } from './WorldRegion';
import GameCell from './GameCell';

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
    //Emits a cell when the cell changes
    worker.addChannel('Populations', () => {
      const updates$ = new ReplaySubject<GameCell>();
      game.gameCell$.subscribe(updates$);
      game.gameCell$.subscribe(gameCell =>
        gameCell.newPop$.subscribe(pop =>
          {
            console.log(pop.class);
            pop.popGrowth$.subscribe(_ => {
              updates$.next(gameCell)
            });
          }
        )
      );
      return updates$.pipe<IGameCellView>(
        map(cell => {
          const popViews = new Array<IPopView>();
          for (const pop of cell.pops) {
            popViews.push({population: pop.totalPopulation, socialClass: pop.class})
          }
          return ({
            pops: popViews,
            buildingByType: cell.buildingByType,
            xCoord: cell.worldCell.x,
            yCoord: cell.worldCell.y
          } as IGameCellView)
        })
      );
      // return updates$.pipe(
      //   map(regions => regions.map(region => region.export()))
      // );
    });

    game.newRegion$.subscribe(region => {
      // worker.addChannel(`channel-${region.name}`)
      // console.log('game.worker: NEW REGION', region)
      // worker.send(EGameEvent.NEW_REGION, region.export());
    });

    game.newRegion$.subscribe(gameCell => {
      console.log('game.worker: NEW GAME CELL', gameCell)
      worker.send(EGameEvent.NEW_GAME_CELL, gameCell);
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
