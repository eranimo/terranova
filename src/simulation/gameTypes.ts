export enum EGameEvent {
  INIT = 'INIT',
  LOADED = 'LOADED',
  DATE = 'DATE',
  STATE_CHANGE = 'STATE_CHANGE',
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  FASTER = 'FASTER',
  SLOWER = 'SLOWER',
}

export interface IGameWorkerEventData {
  type: string;
  id?: number;
  payload?: any;
}


export type EventHandler = (params: any) => void;
