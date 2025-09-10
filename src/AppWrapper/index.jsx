import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { store } from "@/core/store";
import { cart } from "@/core/CartManager";
import { seedIfEmpty } from "@/seed/seedDummy";
import { Toaster } from "@/components/ui/sonner";
import { Spinner } from "@/composite-components/Spinner/";
import App from "@/App";
import NavBar from "@/composite-components/NavBar/";
import Cart from "@/Cart/";

function AppWrapper() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await store.init();
      await seedIfEmpty({ expandTo1000: true });
      await cart.init();
      setReady(true);
    })();
  }, []);

  if (!ready) return <Spinner size={72} />;

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
        <Toaster richColors />
      </main>
    </div>
  );
}

export default AppWrapper;
