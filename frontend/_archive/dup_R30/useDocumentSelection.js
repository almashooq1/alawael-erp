/**
 * Custom Hook: useDocumentSelection
 * إدارة اختيار وتحديد المستندات
 */

import { useState, useCallback } from 'react';

export const useDocumentSelection = () => {
  const [selected, setSelected] = useState([]);
  const [selectionMenuAnchor, setSelectionMenuAnchor] = useState(null);

  const selectOne = useCallback(docId => {
    setSelected(prev => (prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]));
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
    [selected.length],
  );

  const isSelected = useCallback(docId => selected.includes(docId), [selected]);

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
