import ndarray from 'ndarray';
import World from './world';


export interface IWorldgenOptions {
  seed: string | number,
  size: {
    width: number,
    height: number,
  }
}

export interface IWorldgenWorkerOutput {
  options: IWorldgenOptions,
  sealevel: number,
  heightmap: ndarray.Data<number>,
  terrainTypes: ndarray.Data<number>,
}

export class Simulation {
  ticks: number;
  options: IWorldgenOptions;
  world?: World;

  constructor(options: IWorldgenOptions) {
    this.ticks = 0;
    this.options = options;
    this.world = null;
  }

  async init() {
    // make a new World
    return new Promise(resolve => {
      const worker = new Worker('./worldgen.worker.ts');
      worker.postMessage(this.options);
      worker.onmessage = (message: MessageEvent) => {
        console.log('[worker]', message.data);
        this.world = new World(message.data as IWorldgenWorkerOutput);
        console.log('World init', this.world);
        resolve();
      }
    });
  }
}

export async function createSimulation(): Promise<Simulation> {
  const sim = new Simulation({
    seed: 'fuck',
    size: {
      width: 250,
      height: 200,
    },
  });
  await sim.init();
  return sim;
}
