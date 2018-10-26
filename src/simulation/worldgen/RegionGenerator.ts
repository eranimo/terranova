import World from "../World";
const CellHeightWorker = require('worker-loader!./cellHeight.worker');


export class RegionGenerator {
  world: World;

  constructor(world: World) {
    this.world = world;
  }

  async generateLocal() {
    const workers = new Array<Worker>();
    for (let i = 0; i < 30; i++) {
      workers.push(new CellHeightWorker());
    }
    const promises = [];

    const width = this.world.params.options.size.width;
    const height = this.world.params.options.size.height;
    let finishedWorkers = 0;
    let cursor = 0;
    console.time('local maps');
    function runTask(x, y): Promise<any> {
      return new Promise((resolve, reject) => {
        const localWorker = workers[cursor % workers.length];
        cursor++;
        localWorker.postMessage({
          worldOptions: this.world.options,
          localOptions: {
            offset: { x, y },
            size: { width: 10, height: 10 },
          },
        });
        localWorker.onmessage = (event) => {
          finishedWorkers++;
          if (finishedWorkers === width * height) {
            console.log('DONE!');
            console.timeEnd('local maps');
          }
          resolve(event.data);
        };
        localWorker.onerror = error => {
          reject(error);
        };
      });
    }
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        promises.push(runTask(x, y));
      }
    }
    await Promise.all(promises)
  }
}
