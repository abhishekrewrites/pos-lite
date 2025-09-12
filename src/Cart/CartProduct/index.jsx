import { cart } from "@/core/CartManager";
import { Button } from "@/components/ui/button";
import { Minus, Plus, X } from "lucide-react";

export function CartProduct({ l, fmt, lineTotal }) {
  return (
    <div
      className="
        flex flex-col gap-3 border rounded p-3
        sm:flex-row sm:items-center sm:justify-between sm:gap-3
      "
      role="group"
      aria-labelledby={`product-${l.productId}-name`}
    >
      <div className="min-w-0">
        <div
          id={`product-${l.productId}-name`}
          className="font-medium truncate"
        >
          {l.name || l.productId}
        </div>
        <div
          className="text-xs text-muted-foreground"
          aria-label={`Price per item: ${fmt(l.priceEach)}${
            l.addOns?.length
              ? `, Add-ons: ${fmt(l.addOns.reduce((a, x) => a + x.price, 0))}`
              : ""
          }`}
        >
          {fmt(l.priceEach)} each
          {l.addOns?.length
            ? ` • add-ons ${fmt(l.addOns.reduce((a, x) => a + x.price, 0))}`
            : ""}
        </div>
      </div>

      <div
        className="
          flex flex-col gap-2
          sm:flex-row sm:items-center sm:gap-2 sm:justify-end sm:flex-wrap
        "
        role="group"
        aria-label={`Quantity controls for ${l.name || l.productId}`}
      >
        <div
          className="flex items-center justify-between sm:justify-end gap-2"
          role="group"
          aria-label="Quantity adjustment"
        >
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-9 sm:h-8 sm:w-8"
            onClick={() => cart.decrement(l.productId)}
            disabled={l.qty <= 1}
            aria-label={`Decrease quantity of ${
              l.name || l.productId
            }. Current quantity: ${l.qty}`}
            aria-describedby={`qty-${l.productId}`}
          >
            <Minus className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Decrease</span>
          </Button>

          <div
            id={`qty-${l.productId}`}
            className="w-8 text-center text-sm font-medium"
            role="status"
            aria-live="polite"
            aria-label={`Quantity: ${l.qty}`}
          >
            {l.qty}
          </div>

          <Button
            size="sm"
            className="h-9 w-9 sm:h-8 sm:w-8"
            onClick={() =>
              cart.increment({
                productId: l.productId,
                name: l.name,
                priceEach: l.priceEach,
              })
            }
            aria-label={`Increase quantity of ${
              l.name || l.productId
            }. Current quantity: ${l.qty}`}
            aria-describedby={`qty-${l.productId}`}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Increase</span>
          </Button>
          <div>
            <Button
              size="sm"
              variant="destructive"
              className="sm:w-auto hover:text-red-700 hover:bg-red-50"
              onClick={() => cart.remove(l.productId)}
              aria-label={`Remove ${l.name || l.productId} from cart`}
            >
              <X className="h-3 w-3 mr-1 sm:hidden" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>

        <div>
          <div
            className="sm:w-24 sm:text-right font-medium"
            role="status"
            aria-label={`Line total for ${l.name || l.productId}: ${fmt(
              lineTotal
            )}`}
          >
            <span aria-hidden="true">{fmt(lineTotal)}</span>
          </div>
        </div>
      </div>

      <div className="sr-only">
        Product: {l.name || l.productId}. Quantity: {l.qty}. Price per item:{" "}
        {fmt(l.priceEach)}.
        {l.addOns?.length > 0 &&
          ` Add-ons total: ${fmt(l.addOns.reduce((a, x) => a + x.price, 0))}.`}
        Line total: {fmt(lineTotal)}.
      </div>
    </div>
  );
}
