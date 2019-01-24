import { ObservableSet } from "../ObservableSet";

class Foo {
  constructor(public bar: string){}
}
describe('ObservableSet', () => {
  const f1 = new Foo('one');
  const f2 = new Foo('two');
  let set: ObservableSet<Foo>;

  beforeEach(() => {
    set = new ObservableSet();
  });

  test('add', () => {
    set.add(f1);
    set.add(f1);
    set.add(f2);

    expect(set.size).toBe(2);
  });

  test('remove', () => {
    set.add(f1);
    set.remove(f1);

    expect(set.size).toBe(0);
  });

  test('observe', () => {
    const observer = jest.fn();
    set.subscribe(observer);
    set.add(f1);

    expect(observer).toBeCalled();
    expect(observer).toBeCalledWith([f1]);
  });
});
