import { useState, useCallback, useRef } from 'react';

/**
 * Hook for paginated infinite scroll list.
 * @param {Function} fetcher  async (filter, page) => { items, hasMore }
 */
export function useInfiniteList(fetcher) {
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilterState] = useState('');
  const pageRef = useRef(1);
  const filterRef = useRef('');

  const load = useCallback(async (reset = false, newFilter = null) => {
    if (loading) return;
    setLoading(true);

    const currentFilter = newFilter !== null ? newFilter : filterRef.current;
    const page = reset ? 1 : pageRef.current;

    try {
      const data = await fetcher(currentFilter, page);
      setItems(prev => (reset ? data.items : [...prev, ...data.items]));
      setHasMore(data.hasMore);
      pageRef.current = page + 1;
    } catch (e) {
      console.error('Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }, [fetcher, loading]);

  const setFilter = useCallback((value) => {
    filterRef.current = value;
    setFilterState(value);
    pageRef.current = 1;
    // Trigger a fresh load
    setLoading(false); // reset loading state so load() proceeds
    setItems([]);
    setHasMore(true);
  }, []);

  const refresh = useCallback(() => {
    pageRef.current = 1;
    setItems([]);
    setHasMore(true);
    setLoading(false);
  }, []);

  return { items, setItems, hasMore, loading, filter, setFilter, load, refresh };
}
