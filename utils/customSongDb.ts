const DB_NAME = 'SacredStepsCustomSongsDB';
const STORE_NAME = 'custom_songs';
const DB_VERSION = 1;

interface CustomSongRecord {
  week: number;
  blob: Blob;
  filename: string;
  updatedAt: number;
}

const memoryStorage: { [week: number]: CustomSongRecord } = {};
let useMemoryFallback = typeof indexedDB === 'undefined';

const openDB = (): Promise<IDBDatabase> => {
  if (useMemoryFallback) {
    return Promise.reject(new Error('IndexedDB not supported, using memory fallback'));
  }
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        useMemoryFallback = true;
        reject(new Error('Failed to open custom songs database'));
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'week' });
        }
      };
    } catch (e) {
      useMemoryFallback = true;
      reject(e);
    }
  });
};

export const saveCustomSong = async (week: number, blob: Blob, filename: string): Promise<void> => {
  const record: CustomSongRecord = {
    week,
    blob,
    filename,
    updatedAt: Date.now(),
  };

  if (useMemoryFallback) {
    memoryStorage[week] = record;
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save custom song for week ${week}`));
    });
  } catch (err) {
    console.warn('Falling back to memory storage for custom song:', err);
    memoryStorage[week] = record;
  }
};

export const getCustomSong = async (week: number): Promise<{ blob: Blob; filename: string } | null> => {
  if (useMemoryFallback) {
    return memoryStorage[week] ? { blob: memoryStorage[week].blob, filename: memoryStorage[week].filename } : null;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(week);

      request.onsuccess = (event) => {
        const res = (event.target as IDBRequest).result as CustomSongRecord | undefined;
        if (res) {
          resolve({ blob: res.blob, filename: res.filename });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(new Error(`Failed to retrieve custom song for week ${week}`));
    });
  } catch (err) {
    console.warn('Memory fallback for getCustomSong:', err);
    return memoryStorage[week] ? { blob: memoryStorage[week].blob, filename: memoryStorage[week].filename } : null;
  }
};

export const deleteCustomSong = async (week: number): Promise<void> => {
  delete memoryStorage[week];
  if (useMemoryFallback) return;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(week);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete custom song for week ${week}`));
    });
  } catch (err) {
    console.warn('Failed to delete custom song from IndexedDB:', err);
  }
};
