import { getDB, runTx } from "./idb";
import { bus } from "@/lib/eventBus";
import { CART_UPDATED } from "@/constants/events";
import { dummyApiPost } from "@/apis/dummyPostApi"; // ✅ Import dummy API
import { printScheduler } from "@/core/PrintScheduler"; // ✅ Import print scheduler

const CART_KEY = "current";

class CartManager {
  static _i;
  db;
  ready = false;
  lines = new Map();
  total = 0;
  count = 0;

  // Sync properties (existing)
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

  // ✅ Existing methods (unchanged)
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
      return this._promiseRequest(store.get(CART_KEY));
    });

    this.lines.clear();
    if (cartData?.lines?.length) {
      cartData.lines.forEach((line) =>
        this.lines.set(line.productId, { ...line })
      );
    }
    this._updateTotals();
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

  // ✅ UPDATED: Checkout with Dummy API + Print Integration
  async checkout(customerInfo, paymentInfo) {
    if (this.lines.size === 0) {
      throw new Error("Cart is empty");
    }

    // Create complete order data
    const orderData = {
      order: {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        table: customerInfo.table || null,
        type: customerInfo.orderType || "dine-in",
        cashier: customerInfo.cashier || "POS System",
        createdAt: Date.now(),
        status: "pending",
      },
      customer: customerInfo,
      payment: paymentInfo,
      items: Array.from(this.lines.values()),
      totals: {
        subtotal: this.total / 1.1, // Assuming 10% tax
        tax: this.total - this.total / 1.1,
        total: this.total,
        taxRate: 10,
      },
      restaurant: {
        name: "Demo Restaurant",
        address: "123 Main Street",
        phone: "(555) 123-4567",
        website: "www.demorestaurant.com",
      },
    };

    try {
      // 1. Save order locally first (for offline capability)
      console.log("💾 Saving order to local database...");
      await this._saveOrder(orderData);

      // 2. ✅ Call dummy API for order placement
      console.log("📡 Placing order with server via dummy API...");

      const apiResponse = await dummyApiPost("/api/orders/place", {
        order: orderData,
        deviceId: this._getDeviceId(),
        timestamp: Date.now(),
      });

      if (apiResponse.status === "success") {
        console.log("🎉 Order placed successfully with server!");
        console.log("API Response:", apiResponse.message);

        // ✅ API success - start print jobs immediately
        console.log("🖨️ Starting print jobs...");
        const printJobs = await printScheduler.addPrintJob(orderData, [
          "receipt",
          "kitchen",
          "bar",
        ]);
        console.log(`📋 Scheduled ${printJobs.length} print jobs`);

        // Mark order as synced
        orderData.syncStatus = "synced";
        orderData.syncedAt = Date.now();
        orderData.apiResponse = apiResponse;

        // Update local order with sync status
        await this._updateOrderStatus(orderData.order.id, "confirmed");
      } else {
        throw new Error(
          "API returned unexpected status: " + apiResponse.status
        );
      }
    } catch (apiError) {
      console.log("⚠️ API call failed, handling gracefully...");
      console.error("API Error:", apiError.message);

      // ✅ API failed - still print locally and queue for retry
      console.log("🖨️ API failed but printing locally...");

      try {
        const printJobs = await printScheduler.addPrintJob(orderData, [
          "receipt",
          "kitchen",
          "bar",
        ]);
        console.log(`📋 Started ${printJobs.length} local print jobs`);
      } catch (printError) {
        console.error("❌ Local printing also failed:", printError.message);
      }

      // Queue for retry when connection improves
      this._queueSync("orders", [orderData]);

      // Mark as needs retry
      orderData.syncStatus = "pending";
      orderData.syncError = apiError.message;

      // Note: We don't throw the error - order is saved locally
      console.log("📝 Order saved locally and queued for retry");
    }

    // 3. Clear cart and emit events (always happens)
    await this.clear();
    bus.emit("order:created", orderData);

    console.log("✅ Checkout completed:", orderData.order.id);
    return orderData;
  }

  // ✅ Helper method: Save order to local database
  async _saveOrder(orderData) {
    await runTx(this.db, ["orders"], "readwrite", (t) => {
      const store = t.objectStore("orders");
      store.put({
        ...orderData,
        id: orderData.order.id, // Use order ID as the key
        createdAt: orderData.order.createdAt,
        updatedAt: Date.now(),
      });
    });
  }

  // ✅ Helper method: Update order status
  async _updateOrderStatus(orderId, status) {
    await runTx(this.db, ["orders"], "readwrite", async (t) => {
      const store = t.objectStore("orders");
      const order = await this._promiseRequest(store.get(orderId));

      if (order) {
        order.order.status = status;
        order.updatedAt = Date.now();
        store.put(order);
      }
    });

    bus.emit("order:updated", { orderId, status });
  }

  // ✅ Get order history
  async getOrders(limit = 50) {
    return runTx(this.db, ["orders"], "readonly", async (t) => {
      const store = t.objectStore("orders");
      const orders = await this._promiseRequest(store.getAll());

      return orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    });
  }

  // ✅ Existing sync methods (unchanged)
  _initSync() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this._syncPendingChanges();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });

    this._loadSyncQueue();

    if (this.isOnline) {
      this._syncPendingChanges();
    }
  }

  _queueSync(type, data) {
    const syncItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      priority: type === "orders" ? 1 : 5, // High priority for orders
    };

    this.syncQueue.push(syncItem);
    this._saveSyncQueue();

    console.log(`📋 Queued for sync: ${type}`);

    if (this.isOnline && !this.syncing) {
      this._syncPendingChanges();
    }
  }

  async _syncPendingChanges() {
    if (this.syncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.syncing = true;
    console.log(`🔄 Syncing ${this.syncQueue.length} pending items...`);

    const toRemove = [];

    for (const item of this.syncQueue) {
      try {
        const response = await dummyApiPost(`/api/${item.type}/sync`, {
          data: item.data,
          timestamp: item.timestamp,
        });

        console.log(`✅ Synced: ${item.type}`);
        toRemove.push(item);
      } catch (error) {
        console.log(`❌ Sync failed: ${item.type}`, error.message);

        item.retries++;
        if (item.retries >= 3) {
          console.log(`💀 Giving up on: ${item.type}`);
          toRemove.push(item);
        }
      }
    }

    this.syncQueue = this.syncQueue.filter((item) => !toRemove.includes(item));
    this._saveSyncQueue();

    this.syncing = false;

    bus.emit("sync:completed", {
      source: "cart",
      remaining: this.syncQueue.length,
      processed: toRemove.length,
    });
  }

  // ✅ Helper methods
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

  _promiseRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async _ensureOrderStore() {
    // This would be handled in your DB upgrade, but for runtime safety:
    try {
      await runTx(this.db, ["orders"], "readonly", () => {});
    } catch (error) {
      console.warn("Orders store may not exist - handle in DB upgrade");
    }
  }

  async remove(productId) {
    if (!this.lines.has(productId)) return;

    this.lines.delete(productId);
    this._updateTotals();
    await this._saveAndEmit(); // persist + notify UI
  }

  // ✅ Public API methods
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncing: this.syncing,
      pendingItems: this.syncQueue.length,
      lastSync: localStorage.getItem("cart_last_sync") || "Never",
    };
  }

  async forceSync() {
    if (this.isOnline) {
      await this._syncPendingChanges();
    } else {
      throw new Error("Cannot sync while offline");
    }
  }
}

export const cart = CartManager.instance;
