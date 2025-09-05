import { store } from "@/core/store";

async function fetchDummy(limit = 100) {
  const res = await fetch(`https://dummyjson.com/products?limit=${limit}`);
  if (!res.ok) throw new Error("DummyJSON fetch failed");
  const { products } = await res.json();
  return products.map((p) => ({
    id: `p${p.id}`,
    name: p.title,
    description: p.description,
    name_lc: p.title.toLowerCase(),
    category: p.category,
    price: Math.round(p.price * 100),
    tags: p.tags || [],
    updatedAt: Date.now(),
    lamport: 1,
    lastWriter: "seed",
    thumbnail: p.thumbnail,
  }));
}

function expand(products, times = 10) {
  const out = [];
  for (let i = 0; i < times; i++) {
    for (const p of products) {
      out.push({
        ...p,
        id: `${p.id}-${i}`,
        name: `${p.name}`,
        name_lc: `${p.name_lc}`,
      });
    }
  }
  return out;
}

export async function seedIfEmpty({ expandTo1000 = false } = {}) {
  const hasData = await store.hasAnyProduct();
  if (hasData) return;

  const base = await fetchDummy(100);
  const data = expandTo1000 ? expand(base, 10) : base;
  await store.upsertProducts(data);
  console.log(`Seeded ${data.length} products into IndexedDB`);
}
