export class MapSet<K, V> {
  private data: Map<K, Set<V>>;

  constructor(initialData: [K, V[]][] = []) {
    this.data = new Map();
    for (const [key, values] of initialData){
      this.data.set(key, new Set(values));
    }
  }

  add(key: K, value: V) {
    if (this.data.has(key)) {
      this.data.get(key).add(value);
    } else {
      this.data.set(key, new Set([value]));
    }
  }


  /**
   * Remove a value from a MapSet's key
   * @param key Key in Map to find Set
   * @param value Value in set to remove
   */
  delete(key: K, value: V): boolean {
    if (this.data.has(key)) {
      const isDeleted = this.data.get(key).delete(value);
      if (isDeleted && this.data.get(key).size === 0) {
        this.data.delete(key);
      }
      return isDeleted;
    }
    return false;
  }

  /**
   *
   * @param key Gets the set at the current key, undefiend if not in MapSet
   */
  get(key: K) {
    if (this.data.has(key)) {
      return this.data.get(key);
    }
  }

  hasKey(key: K) {
    return this.data.has(key);
  }

  get size() {
    return this.data.size;
  }

  sizeOf(key: K) {
    if (this.data.has(key)) {
      return this.data.get(key).size;
    }
    return 0;
  }
}
