import { groupDistinct } from '../utils';
import { range } from 'lodash';
import ndarray from 'ndarray';

function testMap<T>(
  map: string,
  mapping: Record<string, T>,
): T[][] {
  return map.trim().split('\n').map(line => line.trim().split('').map(char => {
    for (const [key, value] of Object.entries(mapping)) {
      if (char === key) {
        return value;
      }
    }
    throw Error(`Unreocgnized char '${char}'`);
  }));
}

describe('groupDistinct', () => {
  test('run', () => {
    const map = testMap<boolean>(`
      --X--------
      --XXX------
      ---------X-
      --XXX----X-
      --XX-----X-
      -----------
      --XX---X---
      -----------
    `, {
      '-': false,
      'X': true,
    });

    // console.log(map);

    const groups = groupDistinct(
      (x: number, y: number) => {
        try {
          return map[x][y];
        } catch (error) {
          throw new Error(`Unknown coordinate: ${x}, ${y}`);
        }
      },
      8,
      11,
      true,
    );

    expect(groups).toHaveLength(5);
    expect(groups[0]).toHaveLength(5);
    expect(groups[1]).toHaveLength(4);
    expect(groups[2]).toHaveLength(3);
    expect(groups[3]).toHaveLength(2);
    expect(groups[4]).toHaveLength(1);
  });
});
