import World from "../World";
import localforage from 'localforage';
const WorldgenWorker = require('worker-loader!./main.worker');
import { IWorldgenOptions, IWorldgenWorkerOutput } from '../types';
import { omit } from 'lodash';


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

export class WorldGenerator {
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
    const worker = new WorldgenWorker();
    worker.postMessage(options);
    return new Promise((resolve, reject) => {
      worker.onmessage = (message: MessageEvent) => {
        console.log('worldgen.worker result:', message.data);
        const world: World = new World(message.data as IWorldgenWorkerOutput);
        console.log('World object:', world);
        console.timeEnd('worldgen.worker execution time');
        console.groupEnd();
        Object.values(message.data);
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
    console.log('Save world', saveData, save);

    try {
      await this.saveDataStore.setItem(name, saveData);
    } catch (error) {
      console.error('Error saving world data');
      throw error;
    }

    try {
      await this.saveStore.setItem(name, save);
    } catch (error) {
      console.error('Error saving world');
      throw error;
    }
  }

  async loadWorld(name: string): Promise<World> {
    const data = await this.saveDataStore.getItem(name) as IWorldSaveData;
    if (data === null) {
      throw new Error(`Save '${name}' not found`);
    }
    return new World(data.worldData as IWorldgenWorkerOutput);
  }

  async removeSave(name: string): Promise<void> {
    await this.saveStore.removeItem(name);
    await this.saveDataStore.removeItem(name);
  }
}
