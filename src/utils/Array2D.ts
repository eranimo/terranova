/**
 * 2D array of type T, initialized to undefined
 */
export default class Array2D<T> {
  data: T[][];

  constructor(width: number, height: number) {
    this.data = [];
    for (let x = 0; x < width; x++) {
      this.data[x] = [];
      for (let y = 0; y < height; y++) {
        this.data[x][y] = undefined;
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
}
