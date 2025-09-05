import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpandableText } from "../ExpandableText";

function Product({ product }) {
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
      <CardFooter>
        <Button className="w-full">Add to cart</Button>
      </CardFooter>
    </Card>
  );
}

export default Product;
