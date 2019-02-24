import { BehaviorSubject, Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { ReactiveWorker } from '../utils/workers';
import Game from './Game';
import GameCell from './GameCell';
import { EGameEvent } from './gameTypes';
import { ObservableSet } from './ObservableSet';
import { WorldRegion } from './WorldRegion';
import { IWorldCell } from './worldTypes';
import ndarray from 'ndarray';

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
  mappingFunc?: (value: V) => any,
) {
  const createChannel = (item: T) => {
    worker.addChannel(nameFunc(item), () => {
      if (mappingFunc) {
        return createFunc(item).pipe(map(mappingFunc));
      }
      return createFunc(item);
    });
  }
  set.value.forEach(createChannel);
  set.add$.subscribe(createChannel);

  set.remove$.subscribe(item => {
    worker.removeChannel(nameFunc(item));
  });
}

function gameInit() {
  const { width, height } = game.world.size;
  game.date$.subscribe(date => worker.send(EGameEvent.DATE, date));
  for (const [key, subject] of Object.entries(game.state)) {
    worker.send(EGameEvent.STATE_CHANGE, { key, value: subject.value });
    subject.subscribe(value => worker.send(EGameEvent.STATE_CHANGE, { key, value }));
  }
  console.log('game init', game);

  const populationData = new SharedArrayBuffer(width * height * Uint32Array.BYTES_PER_ELEMENT);
  const populationArray = ndarray(new Uint32Array(populationData), [width, height]);

  worker.send('population', { population: populationData });

  game.gameCells.add$.subscribe((gameCell) => {
    gameCell.gameCellState$.subscribe(() => {
      populationArray.set(gameCell.worldCell.x, gameCell.worldCell.y, Math.round(gameCell.populationSize));
    });
  });

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
  channelFromObservableSet(
    game.gameCells,
    'gamecells',
    gameCells => gameCells.map(gameCell => gameCell.getReference())
  );

  channelFromObservableSetItems(
    game.gameCells,
    (gameCell: GameCell) => `gamecell/${gameCell.id}`,
    (gameCell: GameCell) => gameCell.gameCellState$.asObservable()
  );
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
    game.testData();

    const timeEnd = performance.now();
    return timeEnd - timeStart;
  }, true)
  .on(EGameEvent.PLAY, () => game.start())
  .on(EGameEvent.PAUSE, () => game.stop())
  .on(EGameEvent.SLOWER, () => game.slower())
  .on(EGameEvent.FASTER, () => game.faster());
