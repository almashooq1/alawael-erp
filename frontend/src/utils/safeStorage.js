/**
 * Safe localStorage wrapper — avoids throws in incognito/disabled-cookies browsers.
 * Falls back to in-memory store when localStorage is unavailable.
 */

const memoryStore = new Map();

const isAvailable = (() => {
  try {
    const key = '__storage_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
})();

const safeStorage = {
  getItem(key) {
    try {
      return isAvailable ? localStorage.getItem(key) : (memoryStore.get(key) ?? null);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },

  setItem(key, value) {
    try {
      if (isAvailable) localStorage.setItem(key, value);
      else memoryStore.set(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },

  removeItem(key) {
    try {
      if (isAvailable) localStorage.removeItem(key);
      else memoryStore.delete(key);
    } catch {
      memoryStore.delete(key);
    }
  },

  clear() {
    try {
      if (isAvailable) localStorage.clear();
      else memoryStore.clear();
    } catch {
      memoryStore.clear();
    }
  },
};

export default safeStorage;
