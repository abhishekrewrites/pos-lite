// src/core/store.js
import { getDB, runTx } from "./idb";
import { bus } from "@/lib/eventBus";

class Store {
  static _i;
  db;
  static get instance() {
    return (this._i ||= new Store());
  }

  async init() {
    this.db = await getDB(); // <- centralized
  }

  async upsertProducts(products) {
    await runTx(this.db, ["products"], "readwrite", (t) => {
      const s = t.objectStore("products");
      for (const p of products) s.put(p);
    });
    bus.emit("product:changed", { count: products.length });
  }

  async hasAnyProduct() {
    return runTx(this.db, ["products"], "readonly", async (t) => {
      const s = t.objectStore("products");
      const exists = await new Promise((res, rej) => {
        const req = s.openCursor();
        req.onsuccess = () => res(!!req.result);
        req.onerror = () => rej(req.error);
      });
      return exists;
    });
  }

  async getProducts({ search = "", category, limit = 100, offset = 0 } = {}) {
    return runTx(this.db, ["products"], "readonly", async (t) => {
      const s = t.objectStore("products");
      const arr = await new Promise((res, rej) => {
        const req = s.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });
      let list = arr;
      if (category) list = list.filter((p) => p.category === category);
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          (p) =>
            p.name_lc.includes(q) ||
            (p.tags || []).some((tg) => tg.toLowerCase().includes(q))
        );
      }
      return list.slice(offset, offset + limit);
    });
  }
}
export const store = Store.instance;
