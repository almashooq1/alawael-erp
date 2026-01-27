// وحدة التخزين المؤقت (Cache)
export class Cache {
  private store: Map<string, any> = new Map();

  set(key: string, value: any) {
    this.store.set(key, value);
  }

  get(key: string) {
    return this.store.get(key);
  }

  has(key: string) {
    return this.store.has(key);
  }

  clear() {
    this.store.clear();
  }
}
