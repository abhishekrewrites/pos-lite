import { cart } from "@/core/CartManager";
import { Button } from "@/components/ui/button";

export function CartProduct({ l, fmt, lineTotal }) {
  return (
    <div
      className="
        flex flex-col gap-3 border rounded p-3
        sm:flex-row sm:items-center sm:justify-between sm:gap-3
      "
    >
      <div className="min-w-0">
        <div className="font-medium truncate">{l.name || l.productId}</div>
        <div className="text-xs text-muted-foreground">
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
      >
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-9 sm:h-8 sm:w-8"
            onClick={() => cart.decrement(l.productId)}
            aria-label="Decrease quantity"
          >
            -
          </Button>

          <span className="w-8 text-center text-sm">{l.qty}</span>

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
            aria-label="Increase quantity"
          >
            +
          </Button>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="sm:w-auto w-full"
          onClick={() => cart.setQty({ productId: l.productId, qty: 0 })}
        >
          Remove
        </Button>

        <div className="sm:w-24 sm:text-right font-medium">
          {fmt(lineTotal)}
        </div>
      </div>
    </div>
  );
}
