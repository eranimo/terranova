declare module "*.worker" {
  export default class WebpackWorker extends Worker {
    constructor();
  }
}

declare var  __webpack_public_path__: string;

interface Constructor<T> {
  new (...args: any[]): T;
  prototype: T;
}
