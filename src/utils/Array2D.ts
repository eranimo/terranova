import { isFunction } from 'lodash';
import { isUndefined } from 'typescript-collections/dist/lib/util';
/**
 * 2D array of type T, initialized to undefined
 */
export default class Array2D<T> {
  data: T[][];
  width: number;
  height: number;

  constructor(
    width: number,
    height: number,
    setter?: T | ((x: number, y: number) => T)
  ) {
    this.width = width;
    this.height = height;
    this.data = [];
    for (let x = 0; x < width; x++) {
      this.data[x] = [];
      for (let y = 0; y < height; y++) {
        if (isFunction(setter)) {
          this.data[x][y] = setter(x, y);
        } else if (isUndefined(setter)) {
          this.data[x][y] = undefined;
        } else {
          this.data[x][y] = setter;
        }
      }
    }
  }

  /**
   * Get element at coordinate (X, Y)
   */
  get(x: number, y: number): T {
    return this.data[x][y];
  }

  /**
   * Sets element at (X, Y) to value
   */
  set(x: number, y: number, value: T) {
    this.data[x][y] = value;
  }

  /**
   * Does Array2D have an element at this position?
   */
  has(x: number, y: number): boolean {
    return typeof this.get(x, y) !== 'undefined';
  }

  unset(x: number, y: number) {
    this.set(x, y, undefined);
  }

  fill(
    func: (x: number, y: number) => T
  ) {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.set(x, y, func(x, y));
      }
    }
  }
}
