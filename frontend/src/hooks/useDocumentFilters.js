/**
 * Custom Hook: useDocumentFilters
 * إدارة حالة البحث والتصفية والفرز
 */

import { useState, useCallback, useEffect } from 'react';

export const useDocumentFilters = () => {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minSizeKB, setMinSizeKB] = useState('');
  const [maxSizeKB, setMaxSizeKB] = useState('');
  const [tagFilter, setTagFilter] = useState([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('documentListPrefs');
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs.categoryFilter) setCategoryFilter(prefs.categoryFilter);
        if (prefs.sortBy) setSortBy(prefs.sortBy);
        if (prefs.sortOrder) setSortOrder(prefs.sortOrder);
        if (prefs.fromDate) setFromDate(prefs.fromDate);
        if (prefs.toDate) setToDate(prefs.toDate);
        if (prefs.minSizeKB !== undefined) setMinSizeKB(String(prefs.minSizeKB));
        if (prefs.maxSizeKB !== undefined) setMaxSizeKB(String(prefs.maxSizeKB));
        if (Array.isArray(prefs.tagFilter)) setTagFilter(prefs.tagFilter);
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    try {
      const prefs = {
        categoryFilter,
        sortBy,
        sortOrder,
        fromDate,
        toDate,
        minSizeKB,
        maxSizeKB,
        tagFilter,
      };
      localStorage.setItem('documentListPrefs', JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  }, [categoryFilter, sortBy, sortOrder, fromDate, toDate, minSizeKB, maxSizeKB, tagFilter]);

  // Callbacks for filter changes
  const handleToggleTag = useCallback(tag => {
    setTagFilter(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('الكل');
    setFromDate('');
    setToDate('');
    setMinSizeKB('');
    setMaxSizeKB('');
    setTagFilter([]);
  }, []);

  const handleSort = useCallback(
    column => {
      if (sortBy === column) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(column);
        setSortOrder('desc');
      }
    },
    [sortBy, sortOrder],
  );

  return {
    // Search
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    // Filter states
    categoryFilter,
    setCategoryFilter,
    showFilters,
    setShowFilters,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    minSizeKB,
    setMinSizeKB,
    maxSizeKB,
    setMaxSizeKB,
    tagFilter,
    setTagFilter,
    // Sort
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    // Actions
    handleToggleTag,
    handleResetFilters,
    handleSort,
  };
};
