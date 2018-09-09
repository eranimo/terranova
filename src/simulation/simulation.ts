import ndarray from 'ndarray';
import World from './world';
import localforage from 'localforage';


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
  flowDirections: ndarray.Data<number>,
  terrainTypes: ndarray.Data<number>,
  drainageBasins: {
    [id: number]: {
      color: number,
      cells: [number, number][],
    }
  },
  upstreamCells: ndarray.Data<number>;
  temperatures: ndarray.Data<number>;
  moistureMap: ndarray.Data<number>;
  biomes: ndarray.Data<number>;
}

export interface IWorldSaveData {
  name: string;
  saveDate: number;
  worldData: IWorldgenWorkerOutput;
}

export class Simulation {
  ticks: number;
  options: IWorldgenOptions;
  world?: World;
  saveStore: LocalForage;

  constructor(options: IWorldgenOptions) {
    this.ticks = 0;
    this.options = options;
    this.world = null;
    this.saveStore = localforage.createInstance({
      name: 'world-saves'
    });
  }

  async generate() {
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

  async getWorldSaves(): Promise<string[]> {
    return await this.saveStore.keys();
  }

  async saveWorld(name: string): Promise<void> {
    const data: IWorldSaveData = {
      name,
      saveDate: Date.now(),
      worldData: this.world.params,
    };
    await this.saveStore.setItem(name, data);
  }

  async loadWorld(name: string): Promise<void> {
    const data = await this.saveStore.getItem(name) as IWorldSaveData;
    this.world = new World(data.worldData as IWorldgenWorkerOutput);
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
  await sim.generate();
  (window as any).simulation = sim;
  return sim;
}
