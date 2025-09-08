import { Loader2 } from "lucide-react";

export function Spinner({ size = 16, className = "" }) {
  return (
    <div className="flex justify-center items-center h-[100vh]">
      <Loader2
        className={`animate-spin  text-muted-foreground ${className}`}
        size={size}
        aria-hidden="true"
      />
    </div>
  );
}
