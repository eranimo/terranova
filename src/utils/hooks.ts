import { useState, useEffect } from "react";
import { Observable } from "rxjs";

export function useObservable<T>(
  observable: Observable<T>,
  defaultValue: T,
) {
  const [value, setValue] = useState(defaultValue);

  useEffect(
    () => {
      const subscription = observable.subscribe(setValue);
      return () => subscription.unsubscribe();
    },
    [observable]
  );

  return value;
};
