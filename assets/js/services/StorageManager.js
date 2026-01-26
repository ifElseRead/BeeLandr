/**
 * StorageManager
 */

export default class StorageManager {
  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  load(key) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  remove(key) {
    localStorage.removeItem(key);
  }
}
