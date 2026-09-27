import type { WeeklyPodcastData } from '../types';

const DB_NAME = 'WeeklyPodcastDB';
const STORE_NAME = 'podcasts';
const METADATA_STORE_NAME = 'podcast_metadata';
const DB_VERSION = 2;

// In-memory fallback dictionary
const memoryStorage: { [week: number]: string } = {};
const memoryMetadata: { [week: number]: WeeklyPodcastData } = {};
let useMemoryFallback = typeof indexedDB === 'undefined';

export const openDB = (): Promise<IDBDatabase> => {
  if (useMemoryFallback) {
    return Promise.reject(new Error('IndexedDB not supported, using memory fallback'));
  }
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        useMemoryFallback = true;
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
          db.createObjectStore(METADATA_STORE_NAME);
        }
      };
    } catch (e) {
      useMemoryFallback = true;
      reject(e);
    }
  });
};

export const isDummyToneAudio = (
  audioBase64?: string | null,
  duration?: number,
  provider?: string
): boolean => {
  if (!audioBase64 || audioBase64.length < 50) return false;
  if (provider === 'speech_synthesis') return true;
  // Synthetic devotional chord loops are <= 25 seconds
  if (duration !== undefined && duration > 0 && duration <= 25) return true;
  return false;
};

export const deletePodcast = async (week: number): Promise<void> => {
  delete memoryStorage[week];
  delete memoryMetadata[week];
  try {
    localStorage.removeItem(`sacred_podcast_meta_${week}`);
  } catch {
    // ignore
  }

  if (useMemoryFallback) {
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME, METADATA_STORE_NAME], 'readwrite');
      transaction.objectStore(STORE_NAME).delete(week);
      transaction.objectStore(METADATA_STORE_NAME).delete(week);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  } catch (err) {
    console.warn("Failed to delete podcast from IndexedDB:", err);
  }
};

export const savePodcast = async (week: number, base64Audio: string): Promise<void> => {
  if (useMemoryFallback) {
    memoryStorage[week] = base64Audio;
    return;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(base64Audio, week);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to save podcast for week ${week}`));
      };
    });
  } catch (err) {
    console.warn("Falling back to in-memory podcast storage for savePodcast:", err);
    useMemoryFallback = true;
    memoryStorage[week] = base64Audio;
  }
};

export const getPodcast = async (week: number): Promise<string | null> => {
  if (useMemoryFallback) {
    return memoryStorage[week] || null;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(week);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get podcast for week ${week}`));
      };
    });
  } catch (err) {
    console.warn("Falling back to in-memory podcast storage for getPodcast:", err);
    useMemoryFallback = true;
    return memoryStorage[week] || null;
  }
};

export const getAllPodcasts = async (): Promise<{ [week: number]: string }> => {
  if (useMemoryFallback) {
    return { ...memoryStorage };
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      const result: { [week: number]: string } = {};

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          result[cursor.key as number] = cursor.value;
          cursor.continue();
        } else {
          resolve(result);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to load all podcasts'));
      };
    });
  } catch (err) {
    console.warn("Falling back to in-memory podcast storage for getAllPodcasts:", err);
    useMemoryFallback = true;
    return { ...memoryStorage };
  }
};

export const clearAllPodcasts = async (): Promise<void> => {
  memoryStorage[0] = ''; // clear dictionary
  for (const key in memoryStorage) {
    delete memoryStorage[key];
  }
  for (const key in memoryMetadata) {
    delete memoryMetadata[key];
  }
  if (useMemoryFallback) {
    return;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME, METADATA_STORE_NAME], 'readwrite');
      transaction.objectStore(STORE_NAME).clear();
      transaction.objectStore(METADATA_STORE_NAME).clear();

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(new Error('Failed to clear podcasts store'));
      };
    });
  } catch (err) {
    console.warn("Failed to clear IndexedDB, cleared memory storage instead:", err);
  }
};

export const savePodcastMetadata = async (week: number, metadata: WeeklyPodcastData): Promise<void> => {
  try {
    localStorage.setItem(`sacred_podcast_meta_${week}`, JSON.stringify(metadata));
  } catch {
    // Ignore localStorage quota errors
  }

  if (useMemoryFallback) {
    memoryMetadata[week] = metadata;
    return;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(METADATA_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(METADATA_STORE_NAME);
      const request = store.put(metadata, week);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save podcast metadata for week ${week}`));
    });
  } catch (err) {
    console.warn("Falling back to memory/localStorage for savePodcastMetadata:", err);
    memoryMetadata[week] = metadata;
  }
};

export const getPodcastMetadata = async (week: number): Promise<WeeklyPodcastData | null> => {
  // Check memory
  if (memoryMetadata[week]) {
    return memoryMetadata[week];
  }

  // Check localStorage backup
  try {
    const local = localStorage.getItem(`sacred_podcast_meta_${week}`);
    if (local) {
      const parsed = JSON.parse(local);
      memoryMetadata[week] = parsed;
      return parsed;
    }
  } catch {
    // Ignore JSON parse errors
  }

  if (useMemoryFallback) {
    return null;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(METADATA_STORE_NAME, 'readonly');
      const store = transaction.objectStore(METADATA_STORE_NAME);
      const request = store.get(week);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get podcast metadata for week ${week}`));
      };
    });
  } catch (err) {
    console.warn("Failed to read podcast metadata from IndexedDB:", err);
    return null;
  }
};

export const getAllPodcastMetadata = async (): Promise<{ [week: number]: WeeklyPodcastData }> => {
  const result: { [week: number]: WeeklyPodcastData } = { ...memoryMetadata };

  // Read all from localStorage backup
  try {
    for (let i = 1; i <= 52; i++) {
      if (!result[i]) {
        const item = localStorage.getItem(`sacred_podcast_meta_${i}`);
        if (item) {
          result[i] = JSON.parse(item);
        }
      }
    }
  } catch {
    // Ignore storage errors
  }

  if (useMemoryFallback) {
    return result;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(METADATA_STORE_NAME, 'readonly');
      const store = transaction.objectStore(METADATA_STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          result[cursor.key as number] = cursor.value;
          cursor.continue();
        } else {
          resolve(result);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to load all podcast metadata'));
      };
    });
  } catch (err) {
    console.warn("Failed to load all podcast metadata from IndexedDB:", err);
    return result;
  }
};
