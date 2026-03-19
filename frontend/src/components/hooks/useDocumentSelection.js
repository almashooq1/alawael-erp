/**
 * Custom Hook: useDocumentSelection
 * إدارة اختيار وتحديد المستندات
 */

import { useState, useCallback, useMemo } from 'react';

export const useDocumentSelection = () => {
  const [selected, setSelected] = useState([]);
  const [selectionMenuAnchor, setSelectionMenuAnchor] = useState(null);

  // O(1) lookup Set
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const selectOne = useCallback(docId => {
    setSelected(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  }, []);

  const selectMultiple = useCallback(docIds => {
    setSelected(docIds);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  const toggleAllPage = useCallback(
    docIds => {
      if (docIds.length > 0 && selected.length === docIds.length) {
        setSelected([]);
      } else {
        setSelected(docIds);
      }
    },
    [selected.length]
  );

  const isSelected = useCallback(docId => selectedSet.has(docId), [selectedSet]);

  const openSelectionMenu = useCallback(event => {
    setSelectionMenuAnchor(event.currentTarget);
  }, []);

  const closeSelectionMenu = useCallback(() => {
    setSelectionMenuAnchor(null);
  }, []);

  return {
    selected,
    setSelected,
    selectionMenuAnchor,
    setSelectionMenuAnchor,
    selectOne,
    selectMultiple,
    clearSelection,
    toggleAllPage,
    isSelected,
    openSelectionMenu,
    closeSelectionMenu,
  };
};
