export enum EGameEvent {
  INIT = 'INIT',
  LOADED = 'LOADED',
  DATE = 'DATE',
  STATE_CHANGE = 'STATE_CHANGE',
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  FASTER = 'FASTER',
  SLOWER = 'SLOWER',

  NEW_REGION = 'NEW_REGION',
  CHANNEL_UPDATE = 'CHANNEL_UPDATE',
  CHANNEL_SUBSCRIBE = 'CHANNEL_SUBSCRIBE',
  CHANNEL_UNSUBSCRIBE = 'CHANNEL_UNSUBSCRIBE',
}

export interface IGameWorkerEventData {
  type: string;
  id?: number;
  payload?: any;
}


export type EventHandler = (params: any) => void;
