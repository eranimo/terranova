import { ObservableDict } from './../ObservableDict';
export class Entity<T extends object> {
  data$: ObservableDict<T>;

  constructor(
    public id: number,
    data: T
  ) {
    this.data$ = new ObservableDict(data);
  }

}
