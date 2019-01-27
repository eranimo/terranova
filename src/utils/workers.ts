import { pick } from 'lodash';
import { fromEvent, Observable, Subject } from "rxjs";
import { map, filter } from "rxjs/operators";
import { v4 as uuid } from 'uuid';


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


export interface IWorkerMessage {
  type?: string;
  id?: string;
  payload?: any;
  error?: boolean;
  reason?: string;
  streaming?: boolean;
  complete?: boolean;
}

export class ReactiveWorkerClient {
  workerEvents$: Observable<IWorkerMessage>;
  constructor(public worker: Worker) {
    this.workerEvents$ = fromEvent<MessageEvent>(this.worker, 'message')
      .pipe(map(event => event.data as IWorkerMessage));
  }

  action(type: string) {
    const dispatch = (expectResults, ...args) => {
      let msg: IWorkerMessage = { type, payload: args };

      if (!expectResults) {
        return this.worker.postMessage(msg);
      }

      msg.id = uuid();

      return Observable.create(observer => {

        this.workerEvents$
          .pipe(filter(x => x.id === msg.id))
          .subscribe(msg => {
            if (msg.error) {
              // error happened
              observer.error(msg.reason);
            } else if (msg.streaming && msg.complete) {
              // stream ended
              observer.complete();
            } else if (msg.streaming && msg.complete) {
              // stream continuing
              observer.next(msg.payload);
            }
          });
      })

    }

    return {
      send: (...args) => dispatch(false, ...args),
      asObservable: () => (...args) => dispatch(true, ...args),
    };
  }
}

const hasFunction = <T>(value: T) => (name: keyof T) => typeof value[name] === 'function';
const isPromiseLike = hasFunction('then');
const isObservableLike = hasFunction('subscribe');

export class ReactiveWorker {
  incomingMessages$: Subject<IWorkerMessage>;

  constructor(public ctx: Worker) {
    this.incomingMessages$ = new Subject();
    fromEvent<MessageEvent>(this.ctx, 'message')
      .pipe(map(event => event.data))
      .subscribe((msg: IWorkerMessage) => this.incomingMessages$.next(msg));
  }

  private msgOfType(type: string): Observable<IWorkerMessage> {
    return this.incomingMessages$.pipe(filter((msg => msg.type === type)));
  }

  sendResult = (id: string) => (response, streaming = false, streamComplete = false) => {
    let msg: IWorkerMessage = {
      id,
      payload: response,
    };

    if (streaming) {
      msg.streaming = true;

      if (streamComplete) {
        msg.complete = true;
      }
    }
    this.ctx.postMessage(msg);
  };

  sendError = (id: string) => (errorMsg: string) => this.ctx.postMessage({
    id,
    error: true,
    reason: errorMsg,
  });

  private processMessage(func: Function, shouldRespond: boolean) {
    return (msg: IWorkerMessage) => {
      const { payload } = msg;

      let OK = this.sendResult(msg.id);
      let FAIL = this.sendError(msg.id);

      try {
        let response = func(payload);

        if (shouldRespond) {
          if (isPromiseLike(response)) {
            response
              .then(res => OK(res))
              .catch(err => FAIL(err.message));
          } else if (isObservableLike(response)) {
            response.subscribe(
              next => OK(next, true),
              err => FAIL(err.message),
              complete => OK(complete, true, true),
            );
          }
        }
      } catch (err) {
        FAIL(err.message)
      }
    };
  }

  public on(type: string, func: Function, shouldRespond: boolean = false) {
    const handler = this.processMessage(func, shouldRespond);
    this.msgOfType(type).subscribe(handler);
  }
}
