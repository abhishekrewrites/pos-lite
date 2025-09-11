import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bus } from "@/lib/eventBus";
import { cart } from "@/core/CartManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CartProduct } from "./CartProduct/";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const fmt = (paisa) => `₹ ${(paisa / 100).toFixed(2)}`;

export default function CartPage() {
  const [state, setState] = useState(cart.snapshot());
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const off = bus.on("cart:updated", (newState) => {
      setState(newState);
    });

    setState(cart.snapshot());
    return off;
  }, []);

  const handlePlaceOrder = async () => {
    if (!state.lines.length) {
      toast.error("Cart is empty!");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🛒 Starting checkout process...");

      const customerInfo = {
        name: "Walk-in Customer",
        email: "",
        phone: "",
        table: Math.floor(Math.random() * 20) + 1,
        orderType: "dine-in",
        cashier: "POS System",
      };

      const paymentInfo = {
        method: "card", // or "cash"
        amount: state.total,
        tendered: state.total,
        change: 0,
      };

      const order = await cart.checkout(customerInfo, paymentInfo);

      console.log("✅ Order placed successfully:", order.order.id);

      toast.success(`Order #${order.order.id} placed successfully!`, {
        description: `Table ${customerInfo.table} • Receipt is printing...`,
        duration: 5000,
      });

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("❌ Checkout failed:", error.message);

      toast.error("Order placement failed!", {
        description: error.message,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCart = async () => {
    if (!state.lines.length) return;

    try {
      await cart.clear();
      toast.success("Cart cleared");
    } catch (error) {
      toast.error("Failed to clear cart");
    }
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
            <div className="text-center py-8">
              <div className="text-sm text-muted-foreground mb-4">
                Your cart is empty.
              </div>
              <Button variant="outline" onClick={() => navigate("/")}>
                Continue Shopping
              </Button>
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

          {state.lines.length > 0 && (
            <>
              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmt(Math.round(state.total / 1.1))}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax (10%)</span>
                  <span>
                    {fmt(state.total - Math.round(state.total / 1.1))}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{fmt(state.total)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleClearCart}
                  disabled={isLoading}
                  className="min-w-20"
                >
                  Clear
                </Button>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={isLoading}
                  className="min-w-32"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Place Order • ${fmt(state.total)}`
                  )}
                </Button>
              </div>

              {isLoading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <div className="text-sm">
                      <div className="font-medium">
                        Processing your order...
                      </div>
                      <div className="text-xs text-blue-600">
                        Saving order → Syncing with server → Starting print jobs
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
