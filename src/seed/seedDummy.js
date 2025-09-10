import { store } from "@/core/store";

// ✅ Simplified: Cleaner async flow, extracted transformation
async function fetchDummyProducts(limit = 100) {
  const response = await fetch(`https://dummyjson.com/products?limit=${limit}`);
  if (!response.ok) throw new Error("Failed to fetch dummy data");

  const { products } = await response.json();
  return products.map(transformProduct);
}

// ✅ Extracted: Clear data transformation
function transformProduct(product) {
  return {
    id: `p${product.id}`,
    name: product.title,
    description: product.description,
    name_lc: product.title.toLowerCase(),
    category: product.category,
    price: Math.round(product.price * 100),
    tags: product.tags || [],
    updatedAt: Date.now(),
    lamport: 1,
    lastWriter: "seed",
    thumbnail: product.thumbnail,
  };
}

// ✅ Simplified: Cleaner expansion logic
function expandProducts(products, multiplier = 10) {
  return products.flatMap((product) =>
    Array.from({ length: multiplier }, (_, index) => ({
      ...product,
      id: `${product.id}-${index}`,
    }))
  );
}

export async function seedIfEmpty({ expandTo1000 = false } = {}) {
  const hasData = await store.hasAnyProduct();
  if (hasData) return;

  const baseProducts = await fetchDummyProducts(100);
  const finalProducts = expandTo1000
    ? expandProducts(baseProducts, 10)
    : baseProducts;

  await store.upsertProducts(finalProducts);
  console.log(`✅ Seeded ${finalProducts.length} products into IndexedDB`);
}
