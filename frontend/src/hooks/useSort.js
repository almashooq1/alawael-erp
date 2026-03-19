import { useState, useCallback, useMemo } from 'react';

/**
 * useSort — Column sorting for tables/lists.
 *
 * @param {Array}  data              — Source data array
 * @param {string} [defaultField=''] — Initial sort field
 * @param {string} [defaultOrder='asc'] — 'asc' | 'desc'
 *
 * @returns {object} { sortedData, field, order, handleSort, resetSort }
 */
const useSort = (data = [], defaultField = '', defaultOrder = 'asc') => {
  const [field, setField] = useState(defaultField);
  const [order, setOrder] = useState(defaultOrder);

  const handleSort = useCallback(
    newField => {
      if (field === newField) {
        setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setField(newField);
        setOrder('asc');
      }
    },
    [field]
  );

  const resetSort = useCallback(() => {
    setField(defaultField);
    setOrder(defaultOrder);
  }, [defaultField, defaultOrder]);

  const sortedData = useMemo(() => {
    if (!field) return data;
    return [...data].sort((a, b) => {
      const aVal = field.split('.').reduce((obj, key) => obj?.[key], a) ?? '';
      const bVal = field.split('.').reduce((obj, key) => obj?.[key], b) ?? '';
      let cmp;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        cmp = aVal.getTime() - bVal.getTime();
      } else {
        cmp = String(aVal).localeCompare(String(bVal), 'ar');
      }
      return order === 'asc' ? cmp : -cmp;
    });
  }, [data, field, order]);

  return { sortedData, field, order, handleSort, resetSort };
};

export default useSort;
