import { EGameEvent, IGameWorkerEventData, EventHandler } from './gameTypes';
import Game from './Game';
import { ReactiveWorker } from '../utils/workers';


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

    game.newRegion$.subscribe(region => {
      console.log('game.worker: NEW REGION', region)
      worker.send(EGameEvent.NEW_REGION, region.export());
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
