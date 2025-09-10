import { Link } from "react-router-dom";
import { Search, ShoppingCart, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cart } from "@/core/CartManager";
import { bus } from "@/lib/eventBus";
import { SearchBar } from "../Search/";
import { CART_UPDATED } from "../../constants/events";

function NavBar() {
  const [count, setCount] = useState(0);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    console.log("🎧 Setting up cart listener...");
    const initialCount = cart.snapshot().count;
    console.log("📊 Initial cart count:", initialCount);
    setCount(initialCount);

    const off = bus.on(CART_UPDATED, (s) => {
      setCount(s?.count || 0);
    });

    return off;
  }, []);

  const handleSearchChange = (value) => {
    setSearchValue(value);
    clearTimeout(handleSearchChange.timeoutId);
    handleSearchChange.timeoutId = setTimeout(() => {
      bus.emit("search:changed", { query: value });
    }, 300);
  };

  const handleLogoClick = () => {
    if (searchValue) {
      setSearchValue("");
      bus.emit("search:changed", { query: "" });
    }
  };

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2"
          onClick={handleLogoClick}
        >
          <Store className="h-5 w-5" />
          <span className="font-semibold">POS Lite</span>
        </Link>
        <SearchBar
          value={searchValue}
          onChange={handleSearchChange}
          placeholder="Search products..."
        />
        <Link to="/cart" className="relative">
          <Button variant="ghost" size="icon" className="cursor-pointer">
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
