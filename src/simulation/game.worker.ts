import { EGameEvent, IGameWorkerEventData, EventHandler } from './gameTypes';
import Game from './Game';


const ctx: Worker = self as any;

//// INTERNAL STATE
let game: Game;
////

const handlers: Partial<Record<EGameEvent, EventHandler>> = {
  [EGameEvent.INIT]: async ({ params }) => {
    game = new Game(params);
    console.log('game params', params);
    await game.init();

    game.date$.subscribe(date => ctx.postMessage({
      type: EGameEvent.DATE,
      payload: date,
    }));

    for (const [key, subject] of Object.entries(game.state)) {
      ctx.postMessage({
        type: EGameEvent.STATE_CHANGE,
        payload: { key, value: subject.value },
      });
      subject.subscribe(value => ctx.postMessage({
        type: EGameEvent.STATE_CHANGE,
        payload: { key, value },
      }));
    }

    console.log('game init', game);

    ctx.postMessage({
      type: EGameEvent.LOADED,
    })
  },
  [EGameEvent.PLAY]: async () => game.start(),
  [EGameEvent.PAUSE]: async () => game.stop(),
  [EGameEvent.SLOWER]: async () => game.slower(),
  [EGameEvent.FASTER]: async () => game.faster(),
}

ctx.onmessage = async (event: MessageEvent) => {
  const { type, id, payload }: IGameWorkerEventData = event.data;
  if (type in handlers) {
    handlers[type](payload);
  }
};
