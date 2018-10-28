import localforage from 'localforage';


export interface ISaveStoreEntry {
  name: string;
  createdAt: number;
  data: any;
}

export interface ISaveStoreRecord {
  name: string;
  modifiedAt: number;
  data: any;
}

interface ISaveStoreOptions<T> {
  name: string,
  load(data: any): T,
  createEntry(entity: T): any,
  createRecord(entity: T): any,
}

export default class SaveStore<T> {
  options: ISaveStoreOptions<T>;
  private entries: LocalForage;
  private records: LocalForage;

  constructor(options: ISaveStoreOptions<T>) {
    this.options = options;
    this.entries = localforage.createInstance({
      name: `${options.name}-entries`
    });
    this.records = localforage.createInstance({
      name: `${options.name}-records`
    });
  }

  async load(name: string): Promise<T> {
    const data = await this.records.getItem(name) as ISaveStoreRecord;
    if (data === null) {
      throw new Error(`Save '${name}' not found`);
    }
    return this.options.load(data);
  }

  async save(entity: T, name: string) {
    const record: ISaveStoreRecord = {
      name,
      modifiedAt: Date.now(),
      data: this.options.createRecord(entity),
    };

    const entry: ISaveStoreEntry = {
      name,
      createdAt: Date.now(),
      data: this.options.createRecord(entity),
    };
    console.log('Save', record, entry);

    try {
      await this.records.setItem(name, record);
    } catch (error) {
      console.error('Error saving record');
      throw error;
    }

    try {
      await this.entries.setItem(name, entry);
    } catch (error) {
      console.error('Error saving entry');
      throw error;
    }
  }

  async removeSave(name: string): Promise<void> {
    await this.records.removeItem(name);
    await this.entries.removeItem(name);
  }

  async getSaves(): Promise<ISaveStoreEntry[]> {
    const saves = [];
    const saveNames = await this.entries.keys();
    for (const key of saveNames) {
      const save = await this.entries.getItem(key);
      saves.push(save);
    }
    return saves;
  }
}
