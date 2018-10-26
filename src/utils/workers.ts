import { Queue } from 'typescript-collections';


export interface IWorkerEventData<T> {
  taskID: number;
  input: T,
}

interface IWorkerPoolTask<O> {
  options: O;
  startDate: number;
  endDate?: number;
  executionTime?: number;
}

export class WorkerPool<T extends Worker, O extends object> {
  numWorkers: number;

  // workers not doing anything
  idleWorkers: Queue<T>;

  // workers actively working on tasks
  activeWorkers: Queue<T>;

  // tasks yet to be executed
  pendingTasks: Queue<IWorkerPoolTask<O>>;

  // tasks being executed by a worker
  activeTasks: Queue<IWorkerPoolTask<O>>;

  // tasks finished executing
  finishedTasks: Queue<IWorkerPoolTask<O>>;

  workers: Map<number, T>;

  constructor(worker: Constructor<T>, numWorkers?: number) {
    const defaultNumWorkers = typeof window === 'object'
      ? window.navigator.hardwareConcurrency
      : 8;
    this.numWorkers = numWorkers || defaultNumWorkers;

    this.idleWorkers = new Queue();
    this.activeWorkers = new Queue();

    this.pendingTasks = new Queue();
    this.activeTasks = new Queue();
    this.finishedTasks = new Queue();

    this.workers = new Map();

    for (let i = 0; i < this.numWorkers; i++) {
      const workerInstance = new worker();
      workerInstance.onmessage = event => this.onWorkerMessage(i, event);
      workerInstance.onerror = error => this.onWorkerError(i, error);
      workerInstance.onerror = this.onWorkerError.bind(this);
      this.workers.set(i, workerInstance);
      this.idleWorkers.add(workerInstance);
    }
  }

  private onWorkerMessage(workerID: number, event: MessageEvent) {

  }

  private onWorkerError(workerID: number, error: ErrorEvent) {

  }

  /**
   * EXAMPLE
   * 10 workers
   * 100 tasks added to worker
   * first 10 tasks get sent to 10 workers
   *
   *
   */
  add(options: O) {
    this.pendingTasks.add({
      options,
      startDate: performance.now()
    });
  }

  run() {
    if (this.pendingTasks.size() > 0) {
      // tasks available
      while (this.pendingTasks.size() > 0) {
        const task = this.pendingTasks.dequeue();
        this.activeTasks.add(task);

        if (this.idleWorkers.size() > 0) {
          // we have workers available
          const idleWorker = this.idleWorkers.dequeue();
          this.activeWorkers.add(idleWorker);
          idleWorker.postMessage(task.options);
        } else {
          // no workers
        }
      }
    } else {
      // wait
    }
  }
}
