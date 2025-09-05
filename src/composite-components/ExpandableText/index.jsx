import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";

export function ExpandableText({ text, lines = 1 }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-1">
      <CardDescription className={expanded ? "" : `line-clamp-${lines}`}>
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
