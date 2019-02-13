import { Subject, BehaviorSubject, combineLatest, ObjectUnsubscribedError, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';


export class ObservableDict<T extends object> extends BehaviorSubject<T> {
  data: Record<keyof T, BehaviorSubject<unknown>>;

  constructor(initialData: T) {
    super(initialData);
    const data = {};
    for (const [key, value] of Object.entries(initialData)) {
      data[key] = new BehaviorSubject(value);
    }
    this.data = data as Record<keyof T, BehaviorSubject<unknown>>;

    combineLatest(
      Object.values(this.data),
      ((...values) => {
        const result = {};
        const keys = Object.keys(this.data);
        for (let i = 0; i < keys.length; i++) {
          result[keys[i]] = values[i];
        }
        return result;
      })
    )
    .pipe(distinctUntilChanged((x: T, y: T) => {
      for (const [key, value] of Object.entries(x)) {
        if (value !== y[key]) {
          return false;
        }
      }
      return true;
    }))
    .subscribe((latest: T) => this.next(latest));
  }

  ofKey<K extends keyof T>(key: K): Observable<T[K]> {
    return this.data[key].asObservable() as Observable<T[K]>;
  }

  set<K extends keyof T>(key: K, value: T[K]) {
    this.data[key].next(value);
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.data[key].value as T[K];
  }

  *values() {
    for (const key of Object.keys(this.data)) {
      yield this.data[key].value;
    }
  }

  *keys() {
    for (const key of Object.keys(this.data)) {
      yield key;
    }
  }

  *[Symbol.iterator]() {
    for (const [key, value] of Object.entries(this.data)) {
      yield [key, (value as BehaviorSubject<unknown>).value]
    }
  }
}
