import { pick } from 'lodash';
import { fromEvent, Observable, Subject, isObservable, observable, ReplaySubject } from "rxjs";
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
  channel?: string;
  channelEnabled?: boolean;
}

export class ReactiveWorkerClient {
  workerEvents$: Observable<IWorkerMessage>;
  constructor(public worker: Worker, debug: boolean = false) {
    this.workerEvents$ = fromEvent<MessageEvent>(this.worker, 'message')
      .pipe(map(event => event.data as IWorkerMessage));

    if (debug) {
      this.workerEvents$.subscribe(msg => console.log('[worker client: in]', msg));
    }
  }

  /**
   * Observes an event of a given type being sent to
   * @param type event type
   */
  on<T = any>(type: string): Observable<T> {
    return this.workerEvents$
      .pipe(filter(x => x.type === type))
      .pipe(map(msg => msg.payload));
  }

  channel(name: string, handler: (payload) => void) {
    this.worker.postMessage({
      channel: name,
      channelEnabled: true,
    });
    this.workerEvents$.pipe(
      filter(x => x.channel === name),
      map(msg => msg.payload)
    ).subscribe(handler);

    return () => {
      this.worker.postMessage({
        channel: name,
        channelEnabled: false,
      });
    }
  }

  /**
   * Creates an action, which you can send to the worker and optionally observe its result
   * @param type event type
   */
  action(
    type: string
  ) {
    const dispatch = (expectResults, payload) => {
      let msg: IWorkerMessage = { type, payload };

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
            } else {
              observer.next(msg.payload);
              observer.complete();
            }
          });

        this.worker.postMessage(msg);
      });
    }

    return {
      /**
       * Sends an event to a worker, ignoring its results
       * @param payload payload object
       */
      send(payload?): void {
        return dispatch(false, payload)
      },
      /**
       * Sends an event to a worker, observing its results
       * @param payload payload object
       */
      observe(payload?): Observable<IWorkerMessage> {
        return dispatch(true, payload);
      }
    };
  }
}

export class ReactiveWorker {
  incomingMessages$: Subject<IWorkerMessage>;
  channels: Record<string, Channel<unknown>>;

  constructor(public ctx: Worker, debug: boolean = false) {
    this.incomingMessages$ = new Subject();
    fromEvent<MessageEvent>(this.ctx, 'message')
      .pipe(map(event => event.data))
      .subscribe((msg: IWorkerMessage) => this.incomingMessages$.next(msg));


    if (debug) {
      this.incomingMessages$.subscribe(msg => console.log('[worker: in]', msg));
    }

    // channel logic
    this.channels = {};
    this.incomingMessages$.pipe(filter(msg => msg.channel !== undefined))
      .subscribe(msg => {
        // console.log('channel msg', msg);
        if (!(msg.channel in this.channels)) {
          throw new Error(`Unknown channel ${msg.channel}`);
        }
        if (msg.channelEnabled) {
          this.channels[msg.channel].enabled = msg.channelEnabled;
        }
      })
  }

  addChannel<T = unknown>(
    name: string,
    createFunc: () => Observable<T>
  ) {
    const observable = createFunc();
    const channel = new Channel(observable);
    this.channels[name] = channel;
    // console.log('new channel', name, channel);

    channel.subject.subscribe(value => {
      if (channel.enabled) {
        // console.log('channel new value', name, value);
        this.ctx.postMessage({
          channel: name,
          payload: value,
        })
      }
    })
  }

  hasChannel(name): boolean {
    return name in this.channels;
  }

  private msgOfType(type: string): Observable<IWorkerMessage> {
    return this.incomingMessages$.pipe(filter((msg => msg.type === type)));
  }

  private sendResult = (id: string) => (response, streaming = false, streamComplete = false) => {
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

  private sendError = (id: string) => (errorMsg: string) => this.ctx.postMessage({
    id,
    error: true,
    reason: errorMsg,
  });

  private processMessage(
    func: (payload: any) => any,
    shouldRespond: boolean
  ) {
    return (msg: IWorkerMessage) => {
      const { payload } = msg;

      let OK = this.sendResult(msg.id);
      let FAIL = this.sendError(msg.id);

      try {
        let response = func(payload);

        if (shouldRespond) {
          if (response instanceof Promise) {
            response
              .then(res => OK(res))
              .catch(err => FAIL(err.message));
          } else if (isObservable(response)) {
            response.subscribe(
              next => OK(next, true),
              err => FAIL(err.message),
              () => OK(undefined, true, true),
            );
          }
        }
      } catch (err) {
        FAIL(err.message)
      }
    };
  }

  /**
   * Observes an event and optionally send a response
   * @param type event type
   * @param func callback func (can return Promise or Observable)
   * @param shouldRespond if the client should get a response (return value of func)
   */
  public on(
    type: string,
    func: (payload: any) => any,
    shouldRespond: boolean = false
  ): this {
    const handler = this.processMessage(func, shouldRespond);
    this.msgOfType(type).subscribe(handler);
    return this;
  }

  /**
   * Sends an event to the client, no response
   * @param type event type
   * @param payload payload object
   */
  public send(
    type: string,
    payload?: any,
  ): this {
    this.ctx.postMessage({
      type,
      payload,
    });
    return this;
  }
}


class Channel<T> {
  public enabled: boolean;
  subject: ReplaySubject<T>;

  constructor(
    public observable: Observable<T>
  ) {
    this.enabled = false;
    this.subject = new ReplaySubject<T>(1);
    this.observable.subscribe(value => {
      this.subject.next(value);
    })
  }
}
