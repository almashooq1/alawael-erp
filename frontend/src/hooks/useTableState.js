import { useState, useCallback, useMemo, useRef } from 'react';

/**
 * useTableState — Combined table state management (search, sort, filter, pagination).
 *
 * @param {object}  options
 * @param {Array}   options.data           — Raw data array
 * @param {string}  [options.defaultSort]  — Default sort field
 * @param {string}  [options.defaultOrder] — 'asc' | 'desc'
 * @param {number}  [options.defaultPageSize] — Rows per page
 * @param {Array}   [options.searchFields] — Fields to search in
 *
 * @returns {object} {
 *   filteredData, paginatedData,
 *   search, setSearch,
 *   sortField, sortOrder, handleSort,
 *   page, pageSize, setPage, setPageSize, totalPages,
 *   filters, setFilter, clearFilters,
 *   selected, setSelected, toggleSelect, selectAll, clearSelection,
 *   totalCount, filteredCount
 * }
 */
const useTableState = ({
  data = [],
  defaultSort = '',
  defaultOrder = 'asc',
  defaultPageSize = 10,
  searchFields = [],
} = {}) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState(defaultSort);
  const [sortOrder, setSortOrder] = useState(defaultOrder);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState([]);

  // Sort handler
  const handleSort = useCallback(
    field => {
      setSortOrder(prev => (sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
      setSortField(field);
      setPage(0);
    },
    [sortField]
  );

  // Filter setter
  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearch('');
    setPage(0);
  }, []);

  // Selection
  const toggleSelect = useCallback(id => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }, []);

  const selectAll = useCallback(ids => {
    setSelected(ids);
  }, []);

  const clearSelection = useCallback(() => setSelected([]), []);

  // Filtered & sorted data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (search && searchFields.length > 0) {
      const q = search.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const val = field.split('.').reduce((obj, key) => obj?.[key], item);
          return String(val || '')
            .toLowerCase()
            .includes(q);
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      )
        return;
      result = result.filter(item => {
        const itemVal = key.split('.').reduce((obj, k) => obj?.[k], item);
        if (Array.isArray(value)) return value.includes(itemVal);
        return itemVal === value;
      });
    });

    // Apply sort
    if (sortField) {
      result.sort((a, b) => {
        const aVal = sortField.split('.').reduce((obj, key) => obj?.[key], a) ?? '';
        const bVal = sortField.split('.').reduce((obj, key) => obj?.[key], b) ?? '';
        const cmp =
          typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal), 'ar');
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, searchFields, filters, sortField, sortOrder]);

  // Paginated data
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(
    () => filteredData.slice(page * pageSize, (page + 1) * pageSize),
    [filteredData, page, pageSize]
  );

  return {
    // Data
    filteredData,
    paginatedData,
    totalCount: data.length,
    filteredCount: filteredData.length,
    // Search
    search,
    setSearch: useCallback(val => {
      setSearch(val);
      setPage(0);
    }, []),
    // Sort
    sortField,
    sortOrder,
    handleSort,
    // Pagination
    page,
    pageSize,
    setPage,
    setPageSize: useCallback(val => {
      setPageSize(val);
      setPage(0);
    }, []),
    totalPages,
    // Filters
    filters,
    setFilter,
    clearFilters,
    // Selection
    selected,
    setSelected,
    toggleSelect,
    selectAll,
    clearSelection,
  };
};

export default useTableState;
