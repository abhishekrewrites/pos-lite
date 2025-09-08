import { useEffect, useRef, useState, useCallback } from "react";
import { store } from "@/core/store";
import Product from "../composite-components/Product/";
import { Spinner } from "../composite-components/Spinner/";

const PAGE_SIZE = 20;

function HomePage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false);

  const fetchPage = useCallback(
    async (p) => {
      if (fetchingRef.current || !hasMore) return;
      fetchingRef.current = true;
      setLoading(true);
      try {
        const resp = await store.getProducts({
          limit: PAGE_SIZE,
          offset: p * PAGE_SIZE,
        });
        setItems((prev) => [...prev, ...resp]);
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
    [hasMore]
  );

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
    <div className="p-3">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((pro) => (
          <Product product={pro} key={pro.id} />
        ))}
      </div>

      {hasMore && <div ref={sentinelRef} className="h-10" />}

      {loading && <Spinner />}

      {!hasMore && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          You’ve reached the end.
        </div>
      )}
    </div>
  );
}

export default HomePage;
