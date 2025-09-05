import { Link } from "react-router-dom";
import { Search, ShoppingCart, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { bus } from "@/lib/eventBus";
import { SearchBar } from "../Search/";

function NavBar() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // const off = bus.on("cart:updated", (s) => setCount(s?.count || 0));
    // return off;
  }, []);

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          <span className="font-semibold">POS Lite</span>
        </Link>
        <SearchBar onChange={(e) => {}} />
        <Link to="/cart" className="relative">
          <Button variant="ghost" size="icon">
            <ShoppingCart className="h-5 w-5" />
          </Button>
          {count > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

export default NavBar;
