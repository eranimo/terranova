import { BehaviorSubject, Subject } from 'rxjs';


export class ObservableSet<T> extends BehaviorSubject<T[]> {
  public data: Set<T>;
  updates$: Subject<number>;

  constructor(initialData: T[] = []) {
    super(initialData);
    this.data = new Set(initialData);
    this.updates$ = new Subject<number>();
    this.updates$.next(this.size);
  }

  public add(...data: T[]) {
    for (const value of data) {
      this.data.add(value);
    }
    if (data.length > 0) {
      this.next(Array.from(this.data));
    }
    this.updates$.next(this.size);
  }

  public remove(...data: T[]) {
    for (const value of data) {
      this.data.delete(value);
    }
    if (data.length > 0) {
      this.next(Array.from(this.data));
    }
    this.updates$.next(this.size);
  }

  get size() {
    return this.data.size;
  }

  *[Symbol.iterator]() {
    for (const item of this.data) {
      yield item;
    }
  }
}
