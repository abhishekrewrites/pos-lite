import { useEffect, useState } from "react";
import { store } from "@/core/store";
import { bus } from "@/lib/eventBus";
import { seedIfEmpty } from "@/seed/seedDummy";
import HomePage from "./HomPage/";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await store.init();
      await seedIfEmpty({ expandTo1000: true });
      setReady(true);
    })();
  }, []);

  if (!ready) return <div className="p-6">Booting local DB…</div>;

  return (
    <div className="p-2">
      <HomePage />
    </div>
  );
}
