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
  world?: World;
  saveStore: LocalForage;

  constructor() {
    this.ticks = 0;
    this.world = null;
    this.saveStore = localforage.createInstance({
      name: 'world-saves'
    });
  }

  async generate(options: IWorldgenOptions) {
    // make a new World
    return new Promise((resolve, reject) => {
      const worker = new Worker('./worldgen.worker.ts');
      worker.postMessage(options);
      worker.onmessage = (message: MessageEvent) => {
        console.log('[worker]', message.data);
        const world = new World(message.data as IWorldgenWorkerOutput);
        console.log('World init', world);
        this.world = world;
        resolve();
      }
      worker.onerror = error => reject(error);
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
  const sim = new Simulation();
  (window as any).simulation = sim;
  return sim;
}
