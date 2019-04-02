import { MapSet } from './../../utils/collections';
import { ObservableDict } from './../ObservableDict';
import { ObservableSet } from '../ObservableSet';
import { Subject } from 'rxjs';


export class Entity<T extends object> {
  data: ObservableDict<T>;

  constructor(
    public id: number,
    public type: string,
    initialData: T,
  ) {
    this.data = new ObservableDict<T>(initialData);
  }
}

export interface IEntityReducer<T extends object = any> {
  match?: {
    id?: number,
    type?: string,
  };
  mutate: (entity: Entity<T>) => void;
}

/**
 * Describes a change to an Entity of a given type
 */
interface IAction<T> {
  id: number;
  entityType: string;
  entityID?: number;
  payload: T;
}

export class EntityStore {
  private store: Record<number, Entity<any>>;
  public entities: ObservableSet<Entity<any>>;
  private entityByType: MapSet<string, Entity<any>>;
  private entityByID: Record<number, Entity<any>>;
  private currentEntityID: number;

  constructor() {
    this.entities = new ObservableSet();
    this.store = {};
    this.entityByType = new MapSet();
    this.entityByID = {};
    this.currentEntityID = 1;
  }

  addEntity<T extends object>(entityType: string, data: T) {
    const entity: Entity<T> = new Entity(
      this.currentEntityID,
      entityType,
      data,
    );
    this.entityByType.add(entityType, entity);
    this.entityByID[this.currentEntityID] = entity;
    this.store[entity.id] = entity;
    this.currentEntityID++;
    this.entities.add(entity);
    return entity;
  }

  removeEntityByID(id: number) {
    const entity = this.store[id];
    delete this.store[id];
    this.entityByType.delete(entity.type, entity);
    delete this.entityByID[entity.id];
    return this.entities.remove(entity);
  }

  getEntity(id: number) {
    return this.entityByID[id];
  }

  getEntitiesOf(type: string) {
    return this.entityByType.get(type);
  }
}

export class EntityManager {
  store: EntityStore;
  public actionQueue$: Subject<IAction<unknown>>;
  private reducers: Set<IEntityReducer<any>>;

  constructor() {
    this.store = new EntityStore();
    this.actionQueue$ = new Subject();
    this.reducers = new Set();
  }

  dispatch<T>(action: IAction<T>) {
    this.actionQueue$.next(action);
  }

  addReducer<T extends object = any>(reducer: IEntityReducer<T>) {
    this.reducers.add(reducer);
  }

  update() {
    for (const reducer of this.reducers) {
      if (reducer.match) {
        if (reducer.match.id) {
          const entity = this.store.getEntity(reducer.match.id);
          reducer.mutate(entity);
        } else if (reducer.match.type) {
          const entities = this.store.getEntitiesOf(reducer.match.type);
          for (const entity of entities) {
            reducer.mutate(entity);
          }
        }
      } else {
        for (const entity of this.store.entities) {
          reducer.mutate(entity);
        }
      }
    }
  }
}
