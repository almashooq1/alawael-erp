import { useQuery } from '@tanstack/react-query';
import { searchAPI } from '../services/api';

const SEARCH_KEYS = {
  fullText: (query) => ['search', 'full-text', query],
  fuzzy: (query) => ['search', 'fuzzy', query],
  suggestions: (query) => ['search', 'suggestions', query],
};

/**
 * useSearchFullText
 * بحث نصي كامل
 * @param {string} query — نص البحث
 * @param {object} options — إضافية (enabled, etc.)
 */
export function useSearchFullText(query, options = {}) {
  return useQuery({
    queryKey: SEARCH_KEYS.fullText(query),
    queryFn: () => searchAPI.fullText(query),
    enabled: !!query && query.length >= 2, // Only search if query >= 2 chars
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * useSearchFuzzy
 * بحث تقريب (fuzzy)
 * @param {string} query — نص البحث
 * @param {object} options — إضافية
 */
export function useSearchFuzzy(query, options = {}) {
  return useQuery({
    queryKey: SEARCH_KEYS.fuzzy(query),
    queryFn: () => searchAPI.fuzzy(query),
    enabled: !!query && query.length >= 2,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * useSearchSuggestions
 * اقتراحات البحث (لـ autocomplete)
 * @param {string} query — نص البحث
 * @param {object} options — إضافية
 */
export function useSearchSuggestions(query, options = {}) {
  return useQuery({
    queryKey: SEARCH_KEYS.suggestions(query),
    queryFn: () => searchAPI.suggestions(query),
    enabled: !!query && query.length >= 1, // Suggestions work with 1 char
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
}

// Default export
export default {
  useSearchFullText,
  useSearchFuzzy,
  useSearchSuggestions,
};
