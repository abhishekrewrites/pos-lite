import { useEffect, useRef, useState, useCallback } from "react";
import { store } from "@/core/store";
import Product from "../composite-components/Product/";
import { Spinner } from "../composite-components/Spinner/";
import { bus } from "@/lib/eventBus";

const PAGE_SIZE = 20;

function HomePage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false);

  const fetchPage = useCallback(
    async (p, search = searchQuery) => {
      if (fetchingRef.current || !hasMore) return;
      fetchingRef.current = true;
      setLoading(true);
      try {
        const resp = await store.getProducts({
          search,
          limit: PAGE_SIZE,
          offset: p * PAGE_SIZE,
        });

        if (p === 0) {
          setItems(resp);
        } else {
          setItems((prev) => [...prev, ...resp]);
        }

        if (resp.length < PAGE_SIZE) setHasMore(false);
        setPage(p);
      } catch (e) {
        console.error("fetch page error", e);
        setHasMore(false);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    },
    [hasMore, searchQuery]
  );

  useEffect(() => {
    const off = bus.on("search:changed", ({ query }) => {
      setSearchQuery(query);
      setPage(0);
      setHasMore(true);
      fetchingRef.current = false;
      fetchPage(0, query);
    });
    return off;
  }, [fetchPage]);

  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loading) {
          fetchPage(page + 1);
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0,
      }
    );

    obs.observe(node);
    return () => obs.disconnect();
  }, [page, loading, hasMore, fetchPage]);

  return (
    <div className="container max-w-screen-2xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
      {searchQuery && (
        <div className="mb-4 text-sm text-muted-foreground">
          {items.length > 0
            ? `Showing results for "${searchQuery}"`
            : loading
            ? `Searching for "${searchQuery}"...`
            : `No results found for "${searchQuery}"`}
        </div>
      )}

      <div
        className="grid 
        grid-cols-2           /* Mobile: 2 columns */
        sm:grid-cols-2        /* Small tablets: 3 columns */  
        md:grid-cols-3        /* Medium tablets: 4 columns */
        lg:grid-cols-3        /* Large screens: 5 columns */
        xl:grid-cols-4        /* Extra large: 6 columns */
        2xl:grid-cols-4       /* Ultra wide: 7 columns */
        gap-3 sm:gap-4        /* Responsive gap */
      "
      >
        {items.map((pro) => (
          <Product product={pro} key={pro.id} />
        ))}
      </div>

      {hasMore && <div ref={sentinelRef} className="h-10" />}

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {!hasMore && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          {searchQuery ? "No more search results." : "You've reached the end."}
        </div>
      )}

      {!loading && !hasMore && items.length === 0 && searchQuery && (
        <div className="py-8 text-center text-muted-foreground">
          <p className="text-lg mb-2">No products found</p>
          <p className="text-sm">Try searching with different keywords</p>
        </div>
      )}
    </div>
  );
}

export default HomePage;
