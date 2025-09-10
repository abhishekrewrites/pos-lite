import { useEffect, useState } from "react";
import { store } from "@/core/store";
import { cart } from "@/core/CartManager";
import { bus } from "@/lib/eventBus";
import { seedIfEmpty } from "@/seed/seedDummy";
import HomePage from "./HomPage/";

export default function App() {
  const [ready, setReady] = useState(false);

  return (
    <div className="p-2">
      <HomePage />
    </div>
  );
}
