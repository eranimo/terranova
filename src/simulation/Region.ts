import ndarray from 'ndarray';
import { IRegionWorkerOutput, IRegionGenInput } from './types';
import World from './World';
import Array2D from '../utils/Array2D';


export interface ILocalCell {
  height: number;
}

export default class Region {
  world: World;
  options: IRegionGenInput;
  cells: Array2D<ILocalCell>;

  constructor(world, options: IRegionGenInput, params: IRegionWorkerOutput) {
    this.world = world;
    this.options = options;
    const width = options.regionSize.width * options.scale;
    const height = options.regionSize.height * options.scale;
    this.cells = new Array2D<ILocalCell>(width, height);
    const heightmap = ndarray(params.heightmap, [width, height]);
    this.cells.fill((x, y) => ({
      height: heightmap.get(x, y),
    }));
  }
}
