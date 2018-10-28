import World from "../World";
const WorldgenWorker = require('worker-loader!./world.worker');
import { IWorldMapGenOptions, IWorldWorkerOutput } from '../types';


export class WorldGenerator {
  generate(options: IWorldMapGenOptions): Promise<World> {
    console.group('WorldGenerator worker');
    console.time('worldgen.worker execution time');
    // make a new World
    const worker = new WorldgenWorker();
    worker.postMessage(options);
    return new Promise((resolve, reject) => {
      worker.onmessage = (message: MessageEvent) => {
        console.log('worldgen.worker result:', message.data);
        const world: World = new World(message.data as IWorldWorkerOutput);
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

  async loadFromString(worldString: string): Promise<World> {
    const options: IWorldMapGenOptions = JSON.parse(atob(decodeURIComponent(worldString)));
    return await this.generate(options);
  }
}
