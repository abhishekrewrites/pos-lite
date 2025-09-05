import { Link } from "react-router-dom";
import { ShoppingCart, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NavBar() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          <span className="font-semibold">POS Lite</span>
        </Link>

        <Link to="/cart">
          <Button variant="ghost" size="icon">
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </header>
  );
}
