import World from './World';
import Game, { IGameParams } from './Game';
import SaveStore from './SaveStore';

export { WorldGenerator, RegionGenerator } from './worldgen';

export const worldStore = new SaveStore<World>({
  name: 'world',
  load: ({ data }) => new World(data),
  createEntry: (world: World) => ({
    options: world.params.options,
    worldString: world.exportString,
  }),
  createRecord: (world: World) => world.params,
});

export const gameStore = new SaveStore<Game>({
  name: 'game',
  load: ({ data }) => new Game(data as IGameParams),
  createEntry: (game: Game) => ({
    name: game.name,
  }),
  createRecord: (game: Game) => game.params,
});

export async function gameFactory(params: IGameParams): Promise<Game> {
  const game = new Game(params);
  await gameStore.save(game, params.name);
  return game;
}
