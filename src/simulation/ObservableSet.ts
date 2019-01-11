import { BehaviorSubject } from 'rxjs';


export class ObservableSet<T> extends BehaviorSubject<T[]> {
  public data: Set<T>;

  constructor(initialData: T[] = []) {
    super(initialData);
    this.data = new Set(initialData);
  }

  public add(...data: T[]) {
    for (const value of data) {
      this.data.add(value);
    }
    if (data.length > 0) {
      this.next(Array.from(this.data));
    }
  }

  public remove(...data: T[]) {
    for (const value of data) {
      this.data.delete(value);
    }
    if (data.length > 0) {
      this.next(Array.from(this.data));
    }
  }

  get size() {
    return this.data.size;
  }
}
