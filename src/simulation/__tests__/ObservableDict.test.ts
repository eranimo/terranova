import { ObservableDict } from "../ObservableDict";

interface Foo {
  str: string;
  num: number;
}
describe('ObservableDict', () => {
  let dict: ObservableDict<Foo>;

  beforeEach(() => {
    dict = new ObservableDict({
      str: 'foobar',
      num: 1,
    });
  });

  test('set and get', () => {
    dict.set('num', 2);
    expect(dict.get('num')).toBe(2);
  });

  test('subscribe gets initial value', () => {
    const observer = jest.fn();
    dict.subscribe(observer);
    expect(observer).toBeCalledTimes(1);
    expect(observer).toBeCalledWith({
      str: 'foobar',
      num: 1,
    });
  });

  test('observe changes', () => {
    const observer = jest.fn();
    dict.subscribe(observer);
    dict.set('str', 'barbaz');

    expect(observer).toBeCalledTimes(2);
    expect(observer).toBeCalledWith({
      str: 'barbaz',
      num: 1,
    });
  });

  test('observe does not get duplicates', () => {
    const observer = jest.fn();
    dict.subscribe(observer);
    dict.set('str', 'barbaz');
    dict.set('str', 'barbaz');

    expect(observer).toBeCalledTimes(2);
    expect(observer).toBeCalledWith({
      str: 'barbaz',
      num: 1,
    });
  });

  test('iteration', () => {
    const results = [];
    for (const [key, value] of dict) {
      results.push([key, value]);
    }
    expect(results[0][0]).toBe('str');
    expect(results[0][1]).toBe('foobar');
    expect(results[1][0]).toBe('num');
    expect(results[1][1]).toBe(1);
  });

  test('keys()', () => {
    const keys = Array.from(dict.keys());
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe('str');
    expect(keys[1]).toBe('num');
  });

  test('values()', () => {
    const keys = Array.from(dict.values());
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe('foobar');
    expect(keys[1]).toBe(1);
  });
});
