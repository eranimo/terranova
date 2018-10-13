declare module "worker-loader!*" {
  export default class WebpackWorker extends Worker {
    constructor();
  }
}

declare var  __webpack_public_path__: string;
