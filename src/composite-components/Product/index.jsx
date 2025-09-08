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
  const fmt = (paisa) => `₹ ${(paisa / 100).toFixed(2)}`;

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
    <Card className="h-full">
      <CardHeader className="p-3">
        <img
          src={thumbnail}
          alt={name}
          className="w-full h-24 sm:h-28 md:h-36 object-contain rounded bg-muted"
          loading="lazy"
        />
      </CardHeader>

      <CardContent className="px-3 pb-2">
        <CardTitle className="text-sm sm:text-base line-clamp-2">
          {name}
        </CardTitle>

        <div className="mt-1 flex items-center gap-1">
          <IndianRupee className="h-3 w-3 opacity-70" />
          <div className="font-semibold text-sm sm:text-base">{fmt(price)}</div>
        </div>

        <div className="mt-1 text-xs text-muted-foreground">{category}</div>

        <div className="mt-2">
          <ExpandableText text={description} lines={2} />
        </div>
      </CardContent>

      <CardFooter
        className="
          gap-2 p-3
          flex flex-col md:flex-row
          md:items-center md:justify-between
        "
      >
        <div className="flex items-center justify-between md:justify-end w-full md:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={onMinus}
            aria-label="Decrease"
          >
            <ChevronLeft />
          </Button>
          <span className="mx-3 text-sm text-muted-foreground min-w-[1.5rem] text-center">
            {count}
          </span>
          <Button size="icon" onClick={onAdd} aria-label="Increase">
            <ChevronRight />
          </Button>
        </div>
        <Button className="w-full md:w-auto" onClick={onAdd}>
          Add to cart
        </Button>
      </CardFooter>
    </Card>
  );
}

export default Product;
