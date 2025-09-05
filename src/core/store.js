import { openDB, runTx, getAll } from "./idb.js";
import { bus } from "@/lib/eventBus";

class Store {
  static _i;
  db;
  clientId = `dev-${Math.random().toString(36).slice(2)}`;
  lamport = 1;
  static get instance() {
    return (this._i ||= new Store());
  }

  async init() {
    this.db = await openDB("POS_DB", 1, (db) => {
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
    });
  }

  // products
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
      const one = await new Promise((res, rej) => {
        const req = s.openCursor();
        req.onsuccess = () => res(!!req.result);
        req.onerror = () => rej(req.error);
      });
      return one;
    });
  }

  async getProducts({ search = "", category, limit = 100, offset = 0 } = {}) {
    return runTx(this.db, ["products"], "readonly", async (t) => {
      const s = t.objectStore("products");
      let list = await getAll(s);
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
