import { IRegionWorkerOutput, IRegionGenInput } from './../types';
import { WorkerPool } from './../../utils/workers';
import World from "../World";
import Region from '../Region';
const RegionWorker = require('worker-loader!./region.worker');


interface IRegionGenOptions {
  scale: number,
  regionSize: { width: number, height: number },
}

export class RegionGenerator {
  world: World;
  options: IRegionGenOptions;
  worker: WorkerPool<typeof RegionWorker>;
  currentWorkerIndex: number;

  constructor(world: World, options: IRegionGenOptions) {
    this.options = options
    this.world = world;
    this.worker = new WorkerPool(RegionWorker);
  }

  async generateRegion(x, y) {
    const localOptions: IRegionGenInput = {
      location: { x, y },
      ...this.options,
    };
    const data = (await this.worker.run({
      worldOptions: this.world.params.options,
      localOptions,
    })) as IRegionWorkerOutput;
    // console.log('region generator output', x, y, data);
    return new Region(this.world, localOptions, data);
  }
}
