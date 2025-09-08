// src/pages/CartPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bus } from "@/lib/eventBus";
import { cart } from "@/core/CartManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CartProduct } from "./CartProduct/";

const fmt = (paisa) => `₹ ${(paisa / 100).toFixed(2)}`;

export default function CartPage() {
  const [state, setState] = useState(cart.snapshot());
  const navigate = useNavigate();

  useEffect(() => {
    const off = bus.on("cart:updated", setState);
    setState(cart.snapshot());
    return off;
  }, []);

  const handlePlaceOrder = async () => {
    // if (!state.lines.length) return;
    // const order = await orders.placeOrderFromCart(state);
    // await cart.clear();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Cart</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Items</CardTitle>
          <div className="text-sm text-muted-foreground">
            {state.count} item(s)
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-3">
          {state.lines.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Your cart is empty.
            </div>
          )}

          {state.lines.map((l) => {
            const lineTotal =
              l.qty * l.priceEach +
              (l.addOns?.reduce((a, x) => a + x.price, 0) || 0) * l.qty;
            return (
              <CartProduct
                l={l}
                key={l.productId}
                fmt={fmt}
                lineTotal={lineTotal}
              />
            );
          })}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Subtotal</div>
            <div className="text-base font-semibold">{fmt(state.total)}</div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => cart.clear()}
              disabled={!state.lines.length}
            >
              Clear
            </Button>
            <Button onClick={handlePlaceOrder} disabled={!state.lines.length}>
              Place order
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
