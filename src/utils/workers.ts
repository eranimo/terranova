export class WorkerPool<T extends Worker> {
  workers: T[];
  private lastCalledWorkerIndex: number;

  constructor(worker: Constructor<T>) {
    this.workers = new Array<T>();
    for (let i = 0; i < 30; i++) {
      this.workers.push(new worker());
    }
    this.lastCalledWorkerIndex = 0;
  }

  run(message?: any, transfer?: any[]) {
    return new Promise((resolve, reject) => {
      const localWorker = this.workers[this.lastCalledWorkerIndex % this.workers.length];
      this.lastCalledWorkerIndex++;
      localWorker.postMessage(message, transfer);
      localWorker.onmessage = (event: MessageEvent) => {
        resolve(event.data);
      };
      localWorker.onerror = error => {
        reject(error);
      };
    });
  }
}
