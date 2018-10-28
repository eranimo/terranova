import World from './World';
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
