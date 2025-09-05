// Single source of truth for DB name, version, and schema.
const DB_NAME = "POS_DB";
const DB_VERSION = 2; // bump when you add new stores

let dbPromise;

/** Open (or reuse) the IndexedDB connection with proper schema. */
export function getDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;

      // Create stores if missing (safe to re-run checks).
      if (!db.objectStoreNames.contains("products")) {
        const s = db.createObjectStore("products", { keyPath: "id" });
        s.createIndex("category", "category");
        s.createIndex("name_lc", "name_lc");
        s.createIndex("price", "price");
        s.createIndex("updatedAt", "updatedAt");
      }

      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains("cart")) {
        db.createObjectStore("cart", { keyPath: "key" }); // { key: 'current', lines: [...] }
      }

      // add other stores here (orders, printJobs, changesQueue) as you build them
      // if (!db.objectStoreNames.contains("orders")) { ... }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/** Helper to run a transaction cleanly. */
export function runTx(db, stores, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    Promise.resolve(fn(t)).then(
      (val) => (t.oncomplete = () => resolve(val)),
      reject
    );
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export function getAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
