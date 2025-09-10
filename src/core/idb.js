const DB_NAME = "POS_DB";
const DB_VERSION = 5;

let dbPromise;

export function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // ✅ Simplified: Extract store creation logic
      createStoreIfNeeded(db, "products", { keyPath: "id" }, [
        "category",
        "name_lc",
        "price",
        "updatedAt",
      ]);

      createStoreIfNeeded(db, "meta", { keyPath: "key" });
      createStoreIfNeeded(db, "cart", { keyPath: "key" });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// ✅ Simplified: Better error handling, cleaner promise chain
export function runTx(db, stores, mode, fn) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, mode);

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error("Transaction aborted"));

    Promise.resolve(fn(transaction))
      .then((result) => {
        transaction.oncomplete = () => resolve(result);
      })
      .catch(reject);
  });
}

// ✅ Simplified: Direct promise wrapper
export function getAll(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ✅ Helper: Extracted store creation logic
function createStoreIfNeeded(db, storeName, options, indexes = []) {
  if (!db.objectStoreNames.contains(storeName)) {
    const store = db.createObjectStore(storeName, options);
    indexes.forEach((indexName) => store.createIndex(indexName, indexName));
  }
}
