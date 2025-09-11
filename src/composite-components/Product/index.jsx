// Product.jsx - Fixed responsive layout and reduced vertical stretching
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cart } from "@/core/CartManager";
import { useState } from "react";
import { IndianRupee, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExpandableText } from "../ExpandableText/";

function Product({ product }) {
  const [count, setCount] = useState(0);

  const { name, category, description, thumbnail, price } = product;
  const fmt = (paisa) => `${(paisa / 100).toFixed(2)}`;

  function onAdd() {
    cart.increment({
      productId: product.id,
      name: product.name,
      priceEach: product.price,
    });
    toast.success("Product added to cart");
    setCount((prev) => prev + 1);
  }

  function onMinus() {
    cart.decrement(product.id);
    setCount((prev) => (prev > 0 ? prev - 1 : 0));
  }

  return (
    // ✅ Fixed: Use flexbox for better height control
    <Card className="h-full flex flex-col">
      {/* ✅ Reduced padding and image height */}
      <CardHeader className="p-2 pb-0">
        <img
          src={thumbnail}
          alt={name}
          className="w-full h-20 sm:h-24 md:h-28 object-contain rounded bg-muted"
          loading="lazy"
        />
      </CardHeader>

      <CardContent className="flex-grow px-2 py-2">
        <CardTitle className="text-xs sm:text-sm md:text-base line-clamp-2 mb-1">
          {name}
        </CardTitle>

        <div className="flex items-center gap-1 mb-1">
          <IndianRupee className="h-3 w-3 opacity-70" />
          <div className="font-semibold text-xs sm:text-sm">{fmt(price)}</div>
        </div>

        <div className="text-xs text-muted-foreground mb-1">{category}</div>

        <div className="text-xs">
          <ExpandableText text={description} lines={1} />
        </div>
      </CardContent>

      <CardFooter className="p-2 pt-1">
        {/* Container with responsive flex direction */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-2">
          {/* Quantity controls - always visible, left button disabled when count is 0 */}
          <div className="flex items-center justify-between md:justify-start gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 border-gray-300"
              onClick={onMinus}
              disabled={count === 0} // ✅ Disabled when count is 0
              aria-label="Decrease quantity"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>

            {/* ✅ Always show count, even when 0 */}
            <span className="text-xs font-medium min-w-[1.5rem] text-center px-1">
              {count}
            </span>

            <Button
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onAdd}
              aria-label="Add to cart"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          {/* ✅ Add to Cart button - responsive width and text */}
          <Button
            size="sm"
            className="w-full md:w-auto text-xs px-4 h-7"
            onClick={onAdd}
          >
            Add to Cart
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default Product;
