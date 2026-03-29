import { useState, useMemo, useRef, useEffect } from 'react';

/**
 * useSearch — Debounced search with multi-field filtering.
 *
 * @param {Array}  data         — Source data array
 * @param {Array}  fields       — Field paths to search in (supports dot notation)
 * @param {number} [delay=300]  — Debounce delay in ms
 *
 * @returns {object} { query, setQuery, results, isSearching, resultCount }
 */
const useSearch = (data = [], fields = [], delay = 300) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, delay]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return data;
    const q = debouncedQuery.toLowerCase();
    return data.filter(item =>
      fields.some(field => {
        const val = field.split('.').reduce((obj, key) => obj?.[key], item);
        return String(val || '')
          .toLowerCase()
          .includes(q);
      })
    );
  }, [data, debouncedQuery, fields]);

  return {
    query,
    setQuery,
    results,
    isSearching: query !== debouncedQuery,
    resultCount: results.length,
  };
};

export default useSearch;
