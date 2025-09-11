import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

export function SearchBar({
  value,
  onChange,
  placeholder = "Search products…",
  onSubmit,
}) {
  const inputRef = useRef(null);
  const inputId = "search-input";
  const clearButtonId = "clear-search";

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit && value.trim()) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e) => {
    // ESC key clears the search
    if (e.key === "Escape" && value) {
      handleClear();
    }
  };

  return (
    <form
      role="search"
      aria-label="Product search"
      className="relative w-full ml-2 max-w-md"
      onSubmit={handleSubmit}
    >
      <label htmlFor={inputId} className="sr-only">
        Search products
      </label>

      <Search
        className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />

      <Input
        ref={inputRef}
        id={inputId}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-8 pr-8"
        autoComplete="off"
        aria-describedby={value ? clearButtonId : undefined}
        aria-expanded="false"
        aria-haspopup="false"
      />

      {value && (
        <Button
          id={clearButtonId}
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-muted focus:ring-2 focus:ring-primary focus:ring-offset-1"
          aria-label={`Clear search input. Current search: "${value}"`}
          tabIndex={0}
        >
          <X className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">Clear</span>
        </Button>
      )}

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {value && `Searching for: ${value}`}
      </div>
    </form>
  );
}
