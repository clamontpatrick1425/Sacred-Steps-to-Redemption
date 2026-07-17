const DB_NAME = 'WeeklyPodcastDB';
const STORE_NAME = 'podcasts';
const DB_VERSION = 1;

// In-memory fallback dictionary
const memoryStorage: { [week: number]: string } = {};
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
      };
    } catch (e) {
      useMemoryFallback = true;
      reject(e);
    }
  });
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
  if (useMemoryFallback) {
    return;
  }
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear podcasts store'));
      };
    });
  } catch (err) {
    console.warn("Failed to clear IndexedDB, cleared memory storage instead:", err);
  }
};
