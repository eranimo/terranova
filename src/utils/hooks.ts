import { useState, useEffect } from "react";
import { Observable } from "rxjs";
import { ReactiveWorkerClient } from "./workers";

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


export function useChannel<T>(
  worker: ReactiveWorkerClient,
  channelName: string,
) {
  // const [isLoading, setLoading] = useState(true);
  worker.channelSetActive(channelName, true);
  useEffect(
    () => {
      return () => worker.channelSetActive(channelName, false);
    }
  );
  return false;
}
