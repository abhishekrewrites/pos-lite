import { getDB, runTx } from "./idb";
import { bus } from "@/lib/eventBus";

class Store {
  static _i;
  db;

  isOnline = navigator.onLine;
  syncQueue = [];
  syncing = false;

  static get instance() {
    return (this._i ||= new Store());
  }

  async init() {
    this.db = await getDB();
    this._initSync();
  }

  _initSync() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this._syncPendingChanges();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });

    // Load any pending sync operations
    this._loadSyncQueue();

    // Try to sync immediately if online
    if (this.isOnline) {
      this._syncPendingChanges();
    }
  }

  // ✅ Enhanced upsert with sync tracking
  async upsertProducts(products, source = "local") {
    // Add sync metadata to products
    const productsWithMeta = products.map((product) => ({
      ...product,
      lastModified: Date.now(),
      needsSync: source === "local", // Only local changes need sync
    }));

    await runTx(this.db, ["products"], "readwrite", (t) => {
      const store = t.objectStore("products");
      productsWithMeta.forEach((product) => store.put(product));
    });

    bus.emit("product:changed", { count: products.length });

    // Queue for sync if local change
    if (source === "local") {
      this._queueSync("products", productsWithMeta);
    }
  }

  // ✅ Simple sync queue management
  _queueSync(type, data) {
    const syncItem = {
      id: Date.now(),
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.syncQueue.push(syncItem);
    this._saveSyncQueue();

    // Try immediate sync if online
    if (this.isOnline && !this.syncing) {
      this._syncPendingChanges();
    }
  }

  // ✅ Core sync logic - simple and focused
  async _syncPendingChanges() {
    if (this.syncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.syncing = true;
    console.log(`🔄 Syncing ${this.syncQueue.length} pending changes`);

    // Process queue
    const toRemove = [];

    for (const item of this.syncQueue) {
      try {
        await this._syncItem(item);
        toRemove.push(item);
        console.log(`✅ Synced: ${item.type}`);
      } catch (error) {
        console.log(`❌ Sync failed: ${item.type}`, error.message);

        item.retries++;
        if (item.retries >= 3) {
          console.log(`💀 Giving up on: ${item.type}`);
          toRemove.push(item); // Remove after 3 retries
        }
      }
    }

    // Remove completed/failed items
    this.syncQueue = this.syncQueue.filter((item) => !toRemove.includes(item));
    this._saveSyncQueue();

    this.syncing = false;

    // Emit sync status for UI updates
    bus.emit("sync:completed", {
      remaining: this.syncQueue.length,
      processed: toRemove.length,
    });
  }

  // ✅ Simple API call for syncing
  async _syncItem(item) {
    const endpoint = this._getSyncEndpoint(item.type);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: item.type,
        data: item.data,
        timestamp: item.timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Mark items as synced in local DB
    await this._markAsSynced(item.type, item.data);

    return response.json();
  }

  // ✅ Mark local records as synced
  async _markAsSynced(type, data) {
    if (type === "products") {
      await runTx(this.db, ["products"], "readwrite", (t) => {
        const store = t.objectStore("products");
        data.forEach((product) => {
          const updated = { ...product, needsSync: false };
          store.put(updated);
        });
      });
    }
  }

  // ✅ Simple endpoint mapping
  _getSyncEndpoint(type) {
    const endpoints = {
      products: "/api/products/sync",
      orders: "/api/orders/sync",
      inventory: "/api/inventory/sync",
    };
    return endpoints[type] || "/api/sync";
  }

  // ✅ Persistence helpers
  _saveSyncQueue() {
    try {
      localStorage.setItem("pos_sync_queue", JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error("Failed to save sync queue:", error);
    }
  }

  _loadSyncQueue() {
    try {
      const stored = localStorage.getItem("pos_sync_queue");
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load sync queue:", error);
      this.syncQueue = [];
    }
  }

  // ✅ Public API for checking sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncing: this.syncing,
      pendingItems: this.syncQueue.length,
      lastSync: localStorage.getItem("pos_last_sync") || "Never",
    };
  }

  // ✅ Force sync (for manual triggers)
  async forcSync() {
    if (this.isOnline) {
      await this._syncPendingChanges();
    }
  }

  // ✅ Existing methods remain unchanged
  async hasAnyProduct() {
    return runTx(this.db, ["products"], "readonly", async (t) => {
      const store = t.objectStore("products");
      const cursor = await this._promiseRequest(store.openCursor());
      return !!cursor;
    });
  }

  async getProducts(options = {}) {
    const { search = "", category, limit = 100, offset = 0 } = options;

    return runTx(this.db, ["products"], "readonly", async (t) => {
      const allProducts = await this._getAllProducts(t);
      const filtered = this._applyFilters(allProducts, { search, category });
      return filtered.slice(offset, offset + limit);
    });
  }

  async _getAllProducts(transaction) {
    const store = transaction.objectStore("products");
    return this._promiseRequest(store.getAll()).then((result) => result || []);
  }

  _applyFilters(products, { search, category }) {
    let filtered = products;

    if (category) {
      filtered = filtered.filter((product) => product.category === category);
    }

    if (search) {
      const searchTerm = search.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name_lc.includes(searchTerm) ||
          (product.tags || []).some((tag) =>
            tag.toLowerCase().includes(searchTerm)
          )
      );
    }

    return filtered;
  }

  _promiseRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const store = Store.instance;
