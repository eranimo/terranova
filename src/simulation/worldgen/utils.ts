import ndarray from 'ndarray';
import { groupBy, mapValues, memoize } from 'lodash';
import fill from 'ndarray-fill';
import ops from 'ndarray-ops';
import * as Stats from 'simple-statistics';

import { EDirection } from '../world';


const rowNeighbors: number[] = [-1, -1, -1,  0, 0,  1, 1, 1];
const colNeighbors: number[] = [-1,  0,  1, -1, 1, -1, 0, 1];

export function BFS(
  visited,
  searchFunc: (x: number, y: number) => boolean,
  x: number,
  y: number
): number[][] {
  const queue: [number, number][] = [];
  queue.unshift([x, y]);
  let output = [];
  while(queue.length) {
    const [cx, cy] = queue.shift();

    // set cell to visited
    if (visited.get(cx, cy) === 0) {
      visited.set(cx, cy, 1);
      output.push([cx, cy]);
    }

    for (let i = 0; i < 8; i++) {
      const nx = cx + rowNeighbors[i];
      const ny = cy + colNeighbors[i];
      if (searchFunc(nx, ny) && visited.get(nx, ny) === 0) {
        visited.set(nx, ny, 1);
        queue.unshift([nx, ny]);
        output.push([nx, ny]);
      }
    }
  }
  return output;
}

export function groupDistinct(
  heuristic: (x: number, y: number) => boolean,
  width: number,
  height: number,
) {
  const visited = ndarray(new Uint8ClampedArray(width * height), [width, height]);

  // determine landFeatures
  const result = [];
  fill(visited, () => 0);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (heuristic(x, y) && visited.get(x, y) === 0) {
        result.push(BFS(visited, heuristic, x, y));
      }
    }
  }
  return result;
}

export function ndarrayStats(ndarray: ndarray) {
  const data = Array.from(ndarray.data);
  const quantiles = {};
  for (let q = 0; q <= 100; q += 1) {
    quantiles[q] = Stats.quantile(data, q / 100);
  }
  return {
    array: ndarray,
    avg: ops.sum(ndarray) / (ndarray.shape[0] * ndarray.shape[0]),
    max: ops.sup(ndarray),
    min: ops.inf(ndarray),
    quantiles
  };
}

export function countUnique(ndarray: ndarray) {
  const data = Array.from(ndarray.data);
  return mapValues(groupBy(data, i => i), i => i.length);
}

const _getNeighborsLabelled = (x: number, y: number): number[][] => [
  [x - 1, y, EDirection.LEFT],
  [x + 1, y, EDirection.RIGHT],
  [x, y - 1, EDirection.UP],
  [x, y + 1, EDirection.DOWN],
];

export const getNeighborsLabelled = memoize(_getNeighborsLabelled, (x: number, y: number) => `${x},${y}`);


export const neighborForDirection = {
  [EDirection.UP]: (x: number, y: number) => [x, y - 1],
  [EDirection.DOWN]: (x: number, y: number) => [x, y + 1],
  [EDirection.LEFT]: (x: number, y: number) => [x - 1, y],
  [EDirection.RIGHT]: (x: number, y: number) =>  [x + 1, y],
}

export const oppositeDirections = {
  [EDirection.NONE]: EDirection.NONE,
  [EDirection.UP]: EDirection.DOWN,
  [EDirection.DOWN]: EDirection.UP,
  [EDirection.LEFT]: EDirection.RIGHT,
  [EDirection.RIGHT]: EDirection.LEFT,
}

export const isValidCell = (x: number, y: number, width: number, height: number): boolean => {
  return x >= 0 && y >= 0 && x < width && y < height;
};

export const getValidNeighborsLabelled = (
  x: number,
  y: number,
  width: number,
  height: number
): number[][] => (
  getNeighborsLabelled(x, y)
    .filter(([x, y]) => x >= 0 && y >= 0 && x < width && y < height)
);

export function shuffle<T>(rng, a: Array<T>): Array<T> {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(rng() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
  }
  return a;
}


export function loopGridCircle(x, y, radius) {
  let cells = [];
  for (let cx = x - radius; cx < x + radius; cx++) {
    for (let cy = y - radius; cy < y + radius; cy++) {
      const distance = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
      if (distance <= radius) {
        cells.push([cx, cy]);
      }
    }
  }
  return cells;
}
