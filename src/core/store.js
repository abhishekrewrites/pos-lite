// Store.js - Updated with dummyApiPost integration for syncing
import { getDB, runTx } from "./idb";
import { bus } from "@/lib/eventBus";
import { dummyApiPost } from "@/apis/dummyPostApi"; // ✅ Import dummy API
import { printScheduler } from "@/core/PrintScheduler"; // ✅ Import print scheduler

class Store {
  static _i;
  db;

  // ✅ Sync properties
  isOnline = navigator.onLine;
  syncQueue = [];
  syncing = false;
  retryDelays = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff
  maxRetries = 5;

  static get instance() {
    return (this._i ||= new Store());
  }

  async init() {
    this.db = await getDB();
    this._initSync();
  }

  // ✅ Initialize sync capabilities
  _initSync() {
    // Listen for online/offline events
    window.addEventListener("online", () => {
      console.log("🟢 Store: Connection restored");
      this.isOnline = true;
      this._syncPendingChanges();
    });

    window.addEventListener("offline", () => {
      console.log("🔴 Store: Connection lost");
      this.isOnline = false;
    });

    // Load any pending sync operations
    this._loadSyncQueue();

    // Try to sync immediately if online
    if (this.isOnline) {
      this._syncPendingChanges();
    }

    // Periodic sync every 2 minutes
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this._syncPendingChanges();
      }
    }, 2 * 60 * 1000);
  }

  // ✅ Enhanced upsert with sync tracking
  async upsertProducts(products, source = "local") {
    // Add sync metadata to products
    const productsWithMeta = products.map((product) => ({
      ...product,
      lastModified: Date.now(),
      needsSync: source === "local", // Only local changes need sync
      syncStatus: source === "local" ? "pending" : "synced",
    }));

    await runTx(this.db, ["products"], "readwrite", (t) => {
      const store = t.objectStore("products");
      productsWithMeta.forEach((product) => store.put(product));
    });

    bus.emit("product:changed", { count: products.length, source });

    // ✅ Queue for sync if local change
    if (source === "local") {
      this._queueSync("products", productsWithMeta);
    }
  }

  // ✅ Enhanced hasAnyProduct (simplified name)
  async hasAnyProduct() {
    return runTx(this.db, ["products"], "readonly", async (t) => {
      const store = t.objectStore("products");
      const cursor = await this._promiseRequest(store.openCursor());
      return !!cursor;
    });
  }

  // ✅ Enhanced getProducts (matches your existing interface)
  async getProducts(options = {}) {
    const { search = "", category, limit = 100, offset = 0 } = options;

    return runTx(this.db, ["products"], "readonly", async (t) => {
      const allProducts = await this._getAllProducts(t);
      const filtered = this._applyFilters(allProducts, { search, category });
      return filtered.slice(offset, offset + limit);
    });
  }

  // ✅ Helper methods for data access
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

  // ✅ Queue sync operations
  _queueSync(type, data, priority = 5) {
    const syncItem = {
      id: `sync_${type}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 6)}`,
      type,
      data,
      timestamp: Date.now(),
      priority, // 1 = highest, 10 = lowest
      retries: 0,
      status: "pending",
    };

    // Insert by priority (lower number = higher priority)
    const insertIndex = this.syncQueue.findIndex(
      (item) => item.priority > syncItem.priority
    );
    if (insertIndex === -1) {
      this.syncQueue.push(syncItem);
    } else {
      this.syncQueue.splice(insertIndex, 0, syncItem);
    }

    this._saveSyncQueue();
    console.log(`📋 Store: Queued ${type} for sync (${data.length} items)`);

    // Try immediate sync if online
    if (this.isOnline && !this.syncing) {
      this._syncPendingChanges();
    }
  }

  // ✅ Core sync logic
  async _syncPendingChanges() {
    if (this.syncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.syncing = true;
    console.log(`🔄 Store: Syncing ${this.syncQueue.length} pending changes`);

    bus.emit("sync:started", {
      source: "store",
      queueLength: this.syncQueue.length,
    });

    const toRemove = [];

    for (const item of this.syncQueue) {
      if (item.status !== "pending") continue;

      try {
        await this._syncItem(item);
        toRemove.push(item);
        console.log(
          `✅ Store: Synced ${item.type} (${item.data.length} items)`
        );
      } catch (error) {
        console.error(`❌ Store: Sync failed for ${item.type}:`, error.message);
        await this._handleSyncError(item, error);
      }
    }

    // Remove completed items
    this.syncQueue = this.syncQueue.filter((item) => !toRemove.includes(item));
    this._saveSyncQueue();

    this.syncing = false;

    // Update last sync timestamp
    localStorage.setItem("store_last_sync", Date.now().toString());

    // Emit completion event
    bus.emit("sync:completed", {
      source: "store",
      remaining: this.syncQueue.length,
      processed: toRemove.length,
    });
  }

  // ✅ Sync individual items
  async _syncItem(item) {
    const endpoint = this._getSyncEndpoint(item.type);

    const response = await dummyApiPost(endpoint, {
      type: item.type,
      data: item.data,
      timestamp: item.timestamp,
      deviceId: this._getDeviceId(),
    });

    if (response.status !== "success") {
      throw new Error(`API returned status: ${response.status}`);
    }

    // ✅ Special handling for different data types
    if (item.type === "orders") {
      console.log(
        "🖨️ Store: Order synced successfully - triggering print jobs"
      );

      // Trigger print jobs for each order
      for (const orderData of item.data) {
        try {
          const printJobs = await printScheduler.addPrintJob(orderData, [
            "receipt",
            "kitchen",
            "bar",
          ]);
          console.log(
            `📋 Store: Triggered ${printJobs.length} print jobs for order ${orderData.order.id}`
          );
        } catch (printError) {
          console.error("❌ Store: Print job failed:", printError.message);
          // Don't fail sync if printing fails
        }
      }
    }

    // Mark items as synced in local DB
    await this._markAsSynced(item.type, item.data);

    return response;
  }

  // ✅ Handle sync errors with retry logic
  async _handleSyncError(item, error) {
    item.retries++;
    item.lastError = error.message;
    item.lastAttempt = Date.now();

    if (item.retries >= this.maxRetries) {
      item.status = "failed";
      console.error(
        `💀 Store: ${item.type} failed permanently after ${this.maxRetries} attempts`
      );

      bus.emit("sync:failed", {
        source: "store",
        item: item.type,
        error: error.message,
      });

      return;
    }

    // Schedule retry with exponential backoff
    item.status = "retry";
    const delay =
      this.retryDelays[Math.min(item.retries - 1, this.retryDelays.length - 1)];
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    const totalDelay = delay + jitter;

    console.log(
      `⏰ Store: Retrying ${item.type} in ${Math.round(
        totalDelay
      )}ms (attempt ${item.retries + 1})`
    );

    setTimeout(() => {
      if (item.status === "retry") {
        item.status = "pending";
      }
    }, totalDelay);
  }

  // ✅ Mark local records as synced
  async _markAsSynced(type, data) {
    if (type === "products") {
      await runTx(this.db, ["products"], "readwrite", (t) => {
        const store = t.objectStore("products");
        data.forEach((product) => {
          const updated = {
            ...product,
            needsSync: false,
            syncStatus: "synced",
            syncedAt: Date.now(),
          };
          store.put(updated);
        });
      });
    } else if (type === "orders") {
      // Handle order sync marking if needed
      // This would depend on your order storage structure
    }
  }

  // ✅ API endpoint mapping
  _getSyncEndpoint(type) {
    const endpoints = {
      products: "/api/products/sync",
      orders: "/api/orders/sync",
      inventory: "/api/inventory/sync",
      sales: "/api/sales/sync",
    };
    return endpoints[type] || "/api/sync";
  }

  // ✅ Sync persistence
  _saveSyncQueue() {
    try {
      localStorage.setItem("store_sync_queue", JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error("Store: Failed to save sync queue:", error);
    }
  }

  _loadSyncQueue() {
    try {
      const stored = localStorage.getItem("store_sync_queue");
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        console.log(
          `📂 Store: Restored ${this.syncQueue.length} sync items from storage`
        );
      }
    } catch (error) {
      console.error("Store: Failed to load sync queue:", error);
      this.syncQueue = [];
    }
  }

  // ✅ Device identification
  _getDeviceId() {
    let deviceId = localStorage.getItem("pos_device_id");
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      localStorage.setItem("pos_device_id", deviceId);
    }
    return deviceId;
  }

  // ✅ Public API methods
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncing: this.syncing,
      pendingItems: this.syncQueue.length,
      lastSync: localStorage.getItem("store_last_sync") || "Never",
      queueSummary: this.syncQueue.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  async forceSync() {
    if (this.isOnline) {
      await this._syncPendingChanges();
    } else {
      throw new Error("Cannot sync while offline");
    }
  }

  // ✅ Get all dirty (unsynced) records
  async getDirtyProducts() {
    return runTx(this.db, ["products"], "readonly", async (t) => {
      const store = t.objectStore("products");
      const arr = await this._promiseRequest(store.getAll());
      return arr.filter((p) => p.needsSync === true);
    });
  }

  // ✅ Manual sync trigger for specific data types
  async syncProducts() {
    const dirtyProducts = await this.getDirtyProducts();
    if (dirtyProducts.length > 0) {
      this._queueSync("products", dirtyProducts, 3);
    }
  }

  // ✅ Helper method
  _promiseRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const store = Store.instance;
