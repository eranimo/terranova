import ndarray from 'ndarray';
import World from './world';
import localforage from 'localforage';


export interface IWorldgenOptions {
  seed: string | number,
  sealevel: number,
  size: {
    width: number,
    height: number,
  },
  worldShape: EWorldShape,
  worldShapePower: number,
  riverThreshold: number,
  temperature: {
    min: number,
    max: number,
  }
  elevationCoolingAmount: number,
}

export enum EWorldShape {
  FREEFORM = 'freeform',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
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

export interface IWorldSave {
  name: string;
  date: number;
  options: IWorldgenOptions;
  worldString: string;
}

export class Simulation {
  ticks: number;
  saveStore: LocalForage;
  saveDataStore: LocalForage;

  constructor() {
    this.ticks = 0;
    this.saveStore = localforage.createInstance({
      name: 'world-saves'
    });
    this.saveDataStore = localforage.createInstance({
      name: 'worlds'
    });
  }

  generate(options: IWorldgenOptions): Promise<World> {
    console.group('WorldGenerator worker');
    console.time('worldgen.worker execution time');
    // make a new World
    return new Promise((resolve, reject) => {
      const worker = new Worker('./worldgen.worker.ts');
      worker.postMessage(options);
      worker.onmessage = (message: MessageEvent) => {
        console.log('worldgen.worker result:', message.data);
        const world: World = new World(message.data as IWorldgenWorkerOutput);
        console.log('World object:', world);
        console.timeEnd('worldgen.worker execution time');
        console.groupEnd();
        resolve(world);
      }
      worker.onerror = error => {
        console.error('worldgen.worker error:', error);
        console.timeEnd('worldgen.worker execution time');
        console.groupEnd();
        reject(error);
      }
    });
  }

  async importFromString(worldString: string): Promise<World> {
    const options: IWorldgenOptions = JSON.parse(atob(decodeURIComponent(worldString)));
    return await this.generate(options);
  }

  async importFromSave(saveName: string): Promise<IWorldgenOptions> {
    const world: World = await this.loadWorld(saveName);
    return world.params.options;
  }

  async getWorldSaves(): Promise<IWorldSave[]> {
    const saves = [];
    const saveNames = await this.saveStore.keys();
    for (const key of saveNames) {
      const save = await this.saveStore.getItem(key);
      saves.push(save);
    }
    return saves;
  }

  async saveWorld(world: World, name: string): Promise<void> {
    const saveData: IWorldSaveData = {
      name,
      saveDate: Date.now(),
      worldData: world.params,
    };
    const save: IWorldSave = {
      name,
      date: Date.now(),
      options: world.params.options,
      worldString: world.exportString,
    };
    await this.saveStore.setItem(name, save);
    await this.saveDataStore.setItem(name, saveData);
  }

  async loadWorld(name: string): Promise<World> {
    const data = await this.saveDataStore.getItem(name) as IWorldSaveData;
    return new World(data.worldData as IWorldgenWorkerOutput);
  }

  async removeSave(name: string): Promise<void> {
    await this.saveStore.removeItem(name);
    await this.saveDataStore.removeItem(name);
  }
}
