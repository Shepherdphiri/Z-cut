/**
 * IndexedDB helper for storing and retrieving local movie video files.
 * Zero external servers, 100% local browser storage.
 */

const DB_NAME = 'zcut_local_storage_db';
const STORE_NAME = 'local_movies';
const DB_VERSION = 1;

export interface StoredLocalVideoRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  blob: Blob;
  duration: number;
  durationFormatted: string;
  thumbnailUrl: string;
  lastModified: number;
  createdAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalVideoToStorage(record: StoredLocalVideoRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getLocalVideoFromStorage(id: string): Promise<StoredLocalVideoRecord | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getLatestLocalVideo(): Promise<StoredLocalVideoRecord | null> {
  const all = await listLocalStoredVideos();
  if (all.length === 0) return null;
  // Sort descending by last modified / created
  all.sort((a, b) => b.createdAt - a.createdAt);
  return getLocalVideoFromStorage(all[0].id);
}

export async function listLocalStoredVideos(): Promise<Array<Omit<StoredLocalVideoRecord, 'blob'>>> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const req = store.openCursor();
    const list: Array<Omit<StoredLocalVideoRecord, 'blob'>> = [];

    req.onsuccess = (e: any) => {
      const cursor = e.target.result;
      if (cursor) {
        const { blob, ...metadata } = cursor.value;
        list.push(metadata);
        cursor.continue();
      } else {
        resolve(list);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteLocalStoredVideo(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
