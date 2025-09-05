import { useState, useEffect } from "react";
import { store } from "@/core/store";
import Product from "../composite-components/Product/";

function HomePage() {
  const [productsData, setProductsData] = useState([]);

  async function fetchProducts() {
    const resp = await store.getProducts({ limit: 20 });
    setProductsData(resp);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="grid grid-cols-4 gap-2">
      {productsData.map((pro) => (
        <Product product={pro} key={pro.id} />
      ))}
    </div>
  );
}

export default HomePage;
