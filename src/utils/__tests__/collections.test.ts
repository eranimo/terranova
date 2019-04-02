import { MapSet } from '../collections';

class Foobar {
  constructor(public value: string) {}
}

describe('MapSet', () => {
  let mapset;

  beforeEach(() => {
    mapset = new MapSet<string, Foobar>();
  });

  test('add() and size', () => {
    mapset.add('one', new Foobar('1'));
    mapset.add('one', new Foobar('2'));
    mapset.add('one', new Foobar('3'));

    expect(mapset.size).toBe(1);

    mapset.add('two', new Foobar('1'));
    mapset.add('two', new Foobar('1'));

    expect(mapset.size).toBe(2);
  });

  test('delete()', () => {
    const f1 = new Foobar('asd');
    mapset.add('one', f1);
    mapset.delete('one', f1);

    expect(mapset.size).toBe(0);
    expect(mapset.sizeOf('one')).toBe(0);
  });

  test('sizeOf()', () => {
    mapset.add('one', new Foobar('1'));
    mapset.add('one', new Foobar('2'));
    mapset.add('one', new Foobar('3'));

    expect(mapset.sizeOf('two')).toBe(0);
    expect(mapset.sizeOf('one')).toBe(3);

    const f1 = new Foobar('1');
    mapset.add('two', f1);
    mapset.add('two', f1);

    expect(mapset.sizeOf('two')).toBe(1);
  });
})
