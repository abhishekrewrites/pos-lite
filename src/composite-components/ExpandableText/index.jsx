import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";

const lineClampClasses = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
};

export function ExpandableText({ text, lines = 1 }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-1">
      <CardDescription
        className={expanded ? "" : lineClampClasses[lines] || "line-clamp-1"}
      >
        {text}
      </CardDescription>
      {text?.length > 10 && (
        <Button
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
    </div>
  );
}
