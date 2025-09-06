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

  static get instance() {
    return (this._i ||= new CartManager());
  }

  async init() {
    this.db = await getDB();
    await this._rehydrate();
    this.ready = true;
    bus.emit(CART_UPDATED, this.snapshot());
  }

  snapshot() {
    return {
      count: this.count,
      total: this.total,
      lines: Array.from(this.lines.values()),
    };
  }

  async _rehydrate() {
    await runTx(this.db, ["cart"], "readonly", async (t) => {
      const s = t.objectStore("cart");
      const doc = await new Promise((res, rej) => {
        const r = s.get(CART_KEY);
        r.onsuccess = () => res(r.result || null);
        r.onerror = () => rej(r.error);
      });
      this.lines.clear();
      if (doc?.lines?.length) {
        for (const l of doc.lines) this.lines.set(l.productId, { ...l });
      }
      this._recompute();
    });
  }

  _recompute() {
    let total = 0,
      count = 0;
    this.lines.forEach((l) => {
      total +=
        l.qty * l.priceEach +
        (l.addOns?.reduce((a, x) => a + x.price, 0) || 0) * l.qty;
      count += l.qty;
    });
    this.total = total;
    this.count = count;
  }

  async _persistAndEmit() {
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

  async increment({ productId, name, priceEach, addOns, notes }) {
    const cur = this.lines.get(productId) || {
      productId,
      qty: 0,
      priceEach,
      name,
      addOns,
      notes,
    };
    cur.qty += 1;
    this.lines.set(productId, cur);
    this._recompute();
    await this._persistAndEmit();
  }

  async decrement(productId) {
    const cur = this.lines.get(productId);
    if (!cur) return;
    cur.qty = Math.max(0, cur.qty - 1);
    if (cur.qty === 0) this.lines.delete(productId);
    else this.lines.set(productId, cur);
    this._recompute();
    await this._persistAndEmit();
  }

  async clear() {
    this.lines.clear();
    this._recompute();
    await this._persistAndEmit();
  }
}
export const cart = CartManager.instance;
