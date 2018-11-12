export class WorkerPool<T extends Worker> {
  workers: T[];
  private lastCalledWorkerIndex: number;
  tasks: {
    [taskID: number]: {
      resolve: (value?: any) => void,
      reject: (reason?: any) => void,
    }
  };
  workerTasks: {
    [workerID: number]: number | null
  };
  currentTaskID: number;

  constructor(worker: Constructor<T>, numWorkers: number = 8) {
    this.workers = new Array<T>();
    this.workerTasks = {};
    for (let i = 0; i < numWorkers; i++) {
      this.workerTasks[i] = null;
      const instance = new worker();
      instance.onmessage = this.onMessage(i);
      instance.onerror = this.onError(i);
      this.workers.push(instance);
    }
    this.lastCalledWorkerIndex = 0;
    this.currentTaskID = 0;
    this.tasks = {};
  }

  onMessage = (workerID: number) => (event: MessageEvent) => {
    const { taskID, payload, error } = event.data;
    if (error) {
      this.tasks[taskID].reject(error);
    } else {
      this.tasks[taskID].resolve(payload);
    }
  }

  onError = (workerID: number) => (error: ErrorEvent) => {
    throw new Error(`Worker ${workerID} had error: ${error}`);
  }

  run(message?: any, transfer?: any[]) {
    return new Promise((resolve, reject) => {
      this.tasks[this.currentTaskID] = { resolve, reject };
      const workerID = this.lastCalledWorkerIndex % this.workers.length;
      this.workerTasks[workerID] = this.currentTaskID;
      const localWorker = this.workers[workerID];
      this.lastCalledWorkerIndex++;
      localWorker.postMessage({
        taskID: this.currentTaskID,
        payload: message
      }, transfer);
      this.currentTaskID++;
    });
  }
}


export function buildWorker(
  ctx: Worker,
  onMessage: (payload: any) => {
    payload: any,
    transfer?: any[],
  }
) {
  ctx.onmessage = (event: MessageEvent) => {
    const timeStart = performance.now();
    const { taskID, payload: inputPayload } = event.data;

    try {
      const timeEnd = performance.now();
      const { payload, transfer } = onMessage(inputPayload);
      ctx.postMessage({
        taskID,
        executionTime: timeEnd - timeStart,
        payload,
      }, transfer);
    } catch (error) {
      const timeEnd = performance.now();
      ctx.postMessage({
        taskID,
        executionTime: timeEnd - timeStart,
        error,
      });
    }
  }
}
