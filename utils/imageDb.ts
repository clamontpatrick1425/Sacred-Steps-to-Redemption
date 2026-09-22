const DB_NAME = 'WeeklyImageDB';
const STORE_NAME = 'generatedImages';
const DB_VERSION = 1;

// In-memory fallback dictionary
const memoryStorage: { [week: number]: string } = {};
let useMemoryFallback = typeof indexedDB === 'undefined';

export const openImageDB = (): Promise<IDBDatabase> => {
  if (useMemoryFallback) {
    return Promise.reject(new Error('IndexedDB not supported, using memory fallback'));
  }
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        useMemoryFallback = true;
        reject(new Error('Failed to open image database'));
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

export const saveGeneratedImage = async (week: number, base64Image: string): Promise<void> => {
  if (useMemoryFallback) {
    memoryStorage[week] = base64Image;
    return;
  }
  try {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(base64Image, week);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to save image for week ${week}`));
      };
    });
  } catch (err) {
    console.warn("Falling back to in-memory image storage for saveGeneratedImage:", err);
    useMemoryFallback = true;
    memoryStorage[week] = base64Image;
  }
};

export const getGeneratedImage = async (week: number): Promise<string | null> => {
  if (useMemoryFallback) {
    return memoryStorage[week] || null;
  }
  try {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(week);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get image for week ${week}`));
      };
    });
  } catch (err) {
    console.warn("Falling back to in-memory image storage for getGeneratedImage:", err);
    useMemoryFallback = true;
    return memoryStorage[week] || null;
  }
};

export const getAllGeneratedImages = async (): Promise<{ [week: number]: string }> => {
  if (useMemoryFallback) {
    return { ...memoryStorage };
  }
  try {
    const db = await openImageDB();
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
        reject(new Error('Failed to load all generated images'));
      };
    });
  } catch (err) {
    console.warn("Falling back to in-memory image storage for getAllGeneratedImages:", err);
    useMemoryFallback = true;
    return { ...memoryStorage };
  }
};

export const deleteGeneratedImage = async (week: number): Promise<void> => {
  delete memoryStorage[week];
  if (useMemoryFallback) return;
  try {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(week);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete image for week ${week}`));
    });
  } catch (err) {
    console.warn("Failed to delete image in IndexedDB:", err);
  }
};

export const clearAllGeneratedImages = async (): Promise<void> => {
  for (const key in memoryStorage) {
    delete memoryStorage[key];
  }
  if (useMemoryFallback) return;
  try {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear images store'));
    });
  } catch (err) {
    console.warn("Failed to clear IndexedDB images store:", err);
  }
};
