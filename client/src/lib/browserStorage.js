const memoryStorage = new Map();

export function getLocalValue(key) {
  return getStorageValue("localStorage", key);
}

export function setLocalValue(key, value) {
  setStorageValue("localStorage", key, value);
}

export function removeSessionValue(key) {
  removeStorageValue("sessionStorage", key);
}

function getStorageValue(storageName, key) {
  const storage = getStorage(storageName);
  const memoryKey = toMemoryKey(storageName, key);

  try {
    return storage?.getItem(key) ?? memoryStorage.get(memoryKey) ?? null;
  } catch {
    return memoryStorage.get(memoryKey) ?? null;
  }
}

function setStorageValue(storageName, key, value) {
  const nextValue = String(value);
  memoryStorage.set(toMemoryKey(storageName, key), nextValue);

  try {
    getStorage(storageName)?.setItem(key, nextValue);
  } catch {
    // Memory fallback keeps the app usable when browser storage is blocked.
  }
}

function removeStorageValue(storageName, key) {
  memoryStorage.delete(toMemoryKey(storageName, key));

  try {
    getStorage(storageName)?.removeItem(key);
  } catch {
    // Best effort only.
  }
}

function getStorage(storageName) {
  try {
    return globalThis?.[storageName] ?? null;
  } catch {
    return null;
  }
}

function toMemoryKey(storageName, key) {
  return `${storageName}:${key}`;
}
