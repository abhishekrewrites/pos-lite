import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function Product({ product }) {
  const { name, category, description, thumbnail } = product;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <img src={thumbnail} className="flex w-full h-[100px] object-contain" />
        <CardDescription>{description}</CardDescription>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Add to cart</Button>
      </CardFooter>
    </Card>
  );
}

export default Product;
