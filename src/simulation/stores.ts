import World from './World';
import Game, { IGameParams } from './Game';
import SaveStore from './SaveStore';


export const worldStore = new SaveStore<World>({
  name: 'world',
  load: ({ data }) => new World(data),
  createEntry: (world: World) => ({
    options: world.params.options,
    worldString: world.exportString,
  }),
  createRecord: (world: World) => world.params,
});

export const gameStore = new SaveStore<IGameParams>({
  name: 'game',
  load: ({ data }) => data,
  createEntry: (game: IGameParams) => ({
    name: game.name,
  }),
  createRecord: (game: IGameParams) => game,
});

export async function gameFactory(params: IGameParams): Promise<Game> {
  const game = new Game(params);
  await gameStore.save(game.params, params.name);
  return game;
}
