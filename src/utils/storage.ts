/**
 * Safe local storage utilities with defensive JSON handling.
 * Provides fallback in restricted environments (e.g. private mode, iframes).
 */

const STORAGE_PREFIX = 'agrismart_v1_';

export function getStoredItem<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultValue;
    }
    const item = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`[storage] Unable to read key "${key}":`, error);
    return defaultValue;
  }
}

export function setStoredItem<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[storage] Unable to write key "${key}":`, error);
  }
}

export function removeStoredItem(key: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (error) {
    console.warn(`[storage] Unable to remove key "${key}":`, error);
  }
}

export function clearAllStoredData(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch (error) {
    console.warn('[storage] Unable to clear stored demo data:', error);
  }
}
