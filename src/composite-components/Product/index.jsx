import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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

  function onAdd() {
    cart.increment({
      productId: product.id,
      name: product.name,
      priceEach: product.price,
    });
    toast.success("Product is added to the cart");
    setCount((prev) => prev + 1);
  }

  function onMinus() {
    cart.decrement(product.id);
    setCount((prev) => {
      if (prev > 0) {
        return prev - 1;
      }
      return 0;
    });
  }

  const { name, category, description, thumbnail, price } = product;

  return (
    <Card>
      <CardHeader>
        <img src={thumbnail} className="flex w-full h-[100px] object-contain" />
      </CardHeader>
      <CardContent>
        <CardTitle className="">{name}</CardTitle>
        <div className="flex relative gap-2">
          <IndianRupee className="absolute top-1/2 -translate-y-1/2 h-2 w-2" />
          <div className="font-medium ml-2">{price}</div>
        </div>
        <ExpandableText text={description} lines={1} />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button className="flex cursor-pointer" onClick={onAdd}>
          Add to cart
        </Button>
        <div className="flex items-center">
          <Button onClick={onMinus} className="flex cursor-pointer">
            <ChevronLeft />
          </Button>
          <span className="mx-3 text-gray-500">{count}</span>
          <Button onClick={onAdd} className="flex cursor-pointer">
            <ChevronRight />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default Product;
