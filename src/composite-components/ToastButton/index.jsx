"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ToastButton({
  buttonLabel,
  toastLabel,
  onClick,
  desc = "",
  action = {},
}) {
  return (
    <Button
      variant="outline"
      onClick={() => {
        toast(`${toastLabel}`, {
          closeButton: true,
          description: `${desc}`,
        });
        if (onClick) {
          onClick();
        }
      }}
    >
      {buttonLabel}
    </Button>
  );
}
