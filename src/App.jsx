import { useEffect, useState } from "react";
import { store } from "@/core/store";
import { cart } from "@/core/CartManager";
import { bus } from "@/lib/eventBus";
import { seedIfEmpty } from "@/seed/seedDummy";
import HomePage from "./HomPage/";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await store.init();
      await seedIfEmpty({ expandTo1000: true });
      await cart.init();
      setReady(true);
    })();
  }, []);

  if (!ready) return <div className="p-6">Booting local DB…</div>;

  return (
    <div className="p-2">
      <HomePage />
      <Toaster richColors />
    </div>
  );
}
