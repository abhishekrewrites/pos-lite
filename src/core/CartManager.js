import { getDB, runTx } from "./idb";
import { bus } from "@/lib/eventBus";
import { CART_UPDATED } from "@/constants/events";

const CART_KEY = "current";

class CartManager {
  static _i;
  db;
  ready = false;
  lines = new Map();
  total = 0;
  count = 0;

  // ✅ Sync properties
  isOnline = navigator.onLine;
  syncQueue = [];
  syncing = false;

  static get instance() {
    return (this._i ||= new CartManager());
  }

  async init() {
    this.db = await getDB();
    await this._ensureOrderStore();
    await this._loadCart();
    this._initSync();
    this.ready = true;
    bus.emit(CART_UPDATED, this.snapshot());
  }

  // ✅ Ensure orders table exists
  async _ensureOrderStore() {
    // This would be handled in your DB upgrade, but for runtime safety:
    try {
      await runTx(this.db, ["orders"], "readonly", () => {});
    } catch (error) {
      console.warn("Orders store may not exist - handle in DB upgrade");
    }
  }

  // ✅ Initialize sync capabilities
  _initSync() {
    // Listen for online/offline events
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

  snapshot() {
    return {
      count: this.count,
      total: this.total,
      lines: Array.from(this.lines.values()),
    };
  }

  async _loadCart() {
    const cartData = await runTx(this.db, ["cart"], "readonly", async (t) => {
      const store = t.objectStore("cart");
      const result = await this._promiseRequest(store.get(CART_KEY));
      return result;
    });

    this.lines.clear();
    if (cartData?.lines?.length) {
      console.log(`🔄 Restoring ${cartData.lines.length} cart items`);
      cartData.lines.forEach((line) =>
        this.lines.set(line.productId, { ...line })
      );
    } else {
      console.log("📭 No cart data found in IndexedDB");
    }

    this._updateTotals();
    console.log("✅ Cart loaded with totals:", {
      total: this.total,
      count: this.count,
    });
  }

  _updateTotals() {
    const totals = Array.from(this.lines.values()).reduce(
      (acc, line) => ({
        total: acc.total + this._calculateLineTotal(line),
        count: acc.count + line.qty,
      }),
      { total: 0, count: 0 }
    );

    this.total = totals.total;
    this.count = totals.count;
  }

  _calculateLineTotal(line) {
    const addOnsTotal =
      line.addOns?.reduce((sum, addon) => sum + addon.price, 0) || 0;
    return line.qty * line.priceEach + addOnsTotal * line.qty;
  }

  async _saveAndEmit() {
    const payload = {
      key: CART_KEY,
      lines: Array.from(this.lines.values()),
      total: this.total,
      count: this.count,
      updatedAt: Date.now(),
    };

    await runTx(this.db, ["cart"], "readwrite", (t) =>
      t.objectStore("cart").put(payload)
    );

    bus.emit(CART_UPDATED, this.snapshot());
  }

  // ✅ Cart operations (unchanged)
  async increment({ productId, name, priceEach, addOns, notes }) {
    const existingLine = this.lines.get(productId);

    if (existingLine) {
      existingLine.qty += 1;
    } else {
      this.lines.set(productId, {
        productId,
        name,
        priceEach,
        addOns,
        notes,
        qty: 1,
      });
    }

    this._updateTotals();
    await this._saveAndEmit();
  }

  async decrement(productId) {
    const line = this.lines.get(productId);
    if (!line) return;

    line.qty -= 1;
    if (line.qty <= 0) {
      this.lines.delete(productId);
    }

    this._updateTotals();
    await this._saveAndEmit();
  }

  async clear() {
    this.lines.clear();
    this._updateTotals();
    await this._saveAndEmit();
  }

  // ✅ NEW: Checkout with sync capability
  async checkout(customerInfo, paymentInfo) {
    if (this.lines.size === 0) {
      throw new Error("Cart is empty");
    }

    const order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      items: Array.from(this.lines.values()),
      customer: customerInfo,
      payment: paymentInfo,
      total: this.total,
      subtotal: this.total / 1.1, // Assuming 10% tax
      tax: this.total - this.total / 1.1,
      taxRate: 10,
      status: "pending",
      type: customerInfo.orderType || "dine-in",
      table: customerInfo.table || null,
      createdAt: Date.now(),
      needsSync: true, // Mark for sync
      syncStatus: "pending",
    };

    try {
      // Save order locally first
      await this._saveOrder(order);

      // Queue for sync
      this._queueSync("orders", [order]);

      // Clear cart after successful order creation
      await this.clear();

      // Emit order created event
      bus.emit("order:created", order);

      return order;
    } catch (error) {
      console.error("Checkout failed:", error);
      throw new Error("Failed to create order");
    }
  }

  // ✅ Save order to local database
  async _saveOrder(order) {
    await runTx(this.db, ["orders"], "readwrite", (t) => {
      t.objectStore("orders").put(order);
    });
  }

  // ✅ Get order history (with sync status)
  async getOrders(limit = 50) {
    return runTx(this.db, ["orders"], "readonly", async (t) => {
      const store = t.objectStore("orders");
      const orders = await this._promiseRequest(store.getAll());

      // Sort by creation date (newest first) and limit
      return orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    });
  }

  // ✅ Update order status (e.g., from kitchen system)
  async updateOrderStatus(orderId, status, source = "local") {
    const updatedOrder = await runTx(
      this.db,
      ["orders"],
      "readwrite",
      async (t) => {
        const store = t.objectStore("orders");
        const order = await this._promiseRequest(store.get(orderId));

        if (!order) throw new Error("Order not found");

        const updated = {
          ...order,
          status,
          lastModified: Date.now(),
          needsSync: source === "local", // Only sync local updates
        };

        store.put(updated);
        return updated;
      }
    );

    bus.emit("order:updated", updatedOrder);

    // Queue for sync if local change
    if (source === "local") {
      this._queueSync("order-updates", [updatedOrder]);
    }

    return updatedOrder;
  }

  // ✅ Sync queue management
  _queueSync(type, data) {
    const syncItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      priority: this._getSyncPriority(type),
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

    console.log(`📋 Queued for sync: ${type} (${data.length} items)`);

    // Try immediate sync if online
    if (this.isOnline && !this.syncing) {
      this._syncPendingChanges();
    }
  }

  _getSyncPriority(type) {
    const priorities = {
      orders: 1, // Highest priority
      "order-updates": 2, // High priority
      "cart-backups": 5, // Lower priority
    };
    return priorities[type] || 5;
  }

  // ✅ Core sync logic
  async _syncPendingChanges() {
    if (this.syncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.syncing = true;
    console.log(`🔄 Syncing ${this.syncQueue.length} pending changes`);

    bus.emit("sync:started", {
      source: "cart",
      queueLength: this.syncQueue.length,
    });

    const toRemove = [];

    for (const item of this.syncQueue) {
      try {
        await this._syncItem(item);
        toRemove.push(item);
        console.log(`✅ Synced: ${item.type} (${item.data.length} items)`);
      } catch (error) {
        console.log(`❌ Sync failed: ${item.type}`, error.message);

        item.retries++;
        item.lastError = error.message;
        item.lastAttempt = Date.now();

        if (item.retries >= 3) {
          console.log(`💀 Giving up on: ${item.type} after 3 retries`);
          toRemove.push(item);

          // Emit failure event for UI
          bus.emit("sync:failed", {
            item: item.type,
            error: error.message,
          });
        }
      }
    }

    // Remove completed/failed items
    this.syncQueue = this.syncQueue.filter((item) => !toRemove.includes(item));
    this._saveSyncQueue();

    this.syncing = false;

    // Update last sync timestamp
    localStorage.setItem("cart_last_sync", Date.now().toString());

    // Emit completion event
    bus.emit("sync:completed", {
      source: "cart",
      remaining: this.syncQueue.length,
      processed: toRemove.length,
    });
  }

  // ✅ Sync individual items
  async _syncItem(item) {
    const endpoint = this._getSyncEndpoint(item.type);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": this._getDeviceId(),
      },
      body: JSON.stringify({
        type: item.type,
        data: item.data,
        timestamp: item.timestamp,
      }),
      timeout: 10000, // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Mark items as synced in local DB
    await this._markAsSynced(item.type, item.data);

    return result;
  }

  // ✅ Mark local records as synced
  async _markAsSynced(type, data) {
    if (type === "orders" || type === "order-updates") {
      await runTx(this.db, ["orders"], "readwrite", (t) => {
        const store = t.objectStore("orders");
        data.forEach((order) => {
          const updated = {
            ...order,
            needsSync: false,
            syncStatus: "synced",
            syncedAt: Date.now(),
          };
          store.put(updated);
        });
      });
    }
  }

  // ✅ API endpoint mapping
  _getSyncEndpoint(type) {
    const endpoints = {
      orders: "/api/orders/sync",
      "order-updates": "/api/orders/update-status",
      "cart-backups": "/api/cart/backup",
    };
    return endpoints[type] || "/api/sync";
  }

  // ✅ Sync persistence
  _saveSyncQueue() {
    try {
      localStorage.setItem("cart_sync_queue", JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error("Failed to save cart sync queue:", error);
    }
  }

  _loadSyncQueue() {
    try {
      const stored = localStorage.getItem("cart_sync_queue");
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load cart sync queue:", error);
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
      lastSync: localStorage.getItem("cart_last_sync") || "Never",
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

  // ✅ Helper methods
  _promiseRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
}

export const cart = CartManager.instance;
