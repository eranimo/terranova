import { Observable, merge } from "rxjs";

class State<T, V extends keyof T> {
  state$: Observable<T>;
  props: Record<V, Observable<T[V]>>;

  constructor(state: T) {
    const props = {};
    for (const [key, value] of Object.entries(state)) {
      props[key] = new Observable(value);
    }

    this.state$ = merge(
      ...Object.entries(state).map(([key, value]) => (
        props[key].map(value => state => Object.assign(state, { [key]: value })))
      )
    )
  }
}
