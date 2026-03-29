/**
 * useDocumentListLocal — local state, effects, and callbacks for DocumentList
 * الحالة المحلية والتأثيرات لمكون قائمة المستندات
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import documentService from 'services/documentService';
import logger from 'utils/logger';
import { getDocumentListPrefs, mergeDocumentListPrefs } from 'utils/storageService';
import { DEFAULT_VISIBLE_COLS } from './documentListConstants';

const useDocumentListLocal = ({
  documents,
  filters,
  dialogs,
  selection,
  actions,
  onRefresh,
  onShare,
  showConfirm,
}) => {
  // ─── Local state ─────────────────────────────────
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState(null);
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE_COLS);
  const searchRef = useRef(null);

  // ─── Persist column preferences ──────────────────
  useEffect(() => {
    try {
      const prefs = getDocumentListPrefs();
      if (prefs) {
        if (prefs.visibleCols) setVisibleCols(prev => ({ ...prev, ...prefs.visibleCols }));
        if (prefs.rowsPerPage) setRowsPerPage(Number(prefs.rowsPerPage));
      }
    } catch (e) {
      logger.error('Failed to load column preferences:', e);
    }
  }, []);

  useEffect(() => {
    try {
      mergeDocumentListPrefs({ visibleCols, rowsPerPage });
    } catch (e) {
      logger.error('Failed to save column preferences:', e);
    }
  }, [visibleCols, rowsPerPage]);

  // ─── Keyboard shortcuts ──────────────────────────
  useEffect(() => {
    const handler = e => {
      const key = e.key?.toLowerCase();
      if (e.ctrlKey && key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (key === 'escape') {
        selection.clearSelection();
        dialogs.closeAllDialogs();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selection, dialogs]);

  // ─── Columns menu handlers ───────────────────────
  const handleOpenColumnsMenu = useCallback(event => setColumnsMenuAnchor(event.currentTarget), []);
  const handleCloseColumnsMenu = useCallback(() => setColumnsMenuAnchor(null), []);
  const toggleColumn = useCallback(
    key => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] })),
    []
  );

  // ─── Bulk edit apply ─────────────────────────────
  const applyBulkEdit = useCallback(async () => {
    try {
      actions.setLoading(true);
      const ops = [];
      if (dialogs.bulkEditType === 'tags') {
        const tags = dialogs.bulkEditTagsInput
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);
        for (const id of selection.selected) {
          ops.push(documentService.updateDocument(id, { tags }));
        }
      } else if (dialogs.bulkEditType === 'category') {
        for (const id of selection.selected) {
          ops.push(documentService.updateDocument(id, { category: dialogs.bulkEditCategory }));
        }
      }
      await Promise.all(ops);
      dialogs.closeBulkEdit();
      actions.showMessage('✅ تم تطبيق التحرير الجماعي بنجاح');
      if (onRefresh) onRefresh();
    } catch (e) {
      actions.showMessage('❌ فشل التحرير الجماعي: ' + e.message, 'error');
    } finally {
      actions.setLoading(false);
    }
  }, [dialogs, selection, actions, onRefresh]);

  // ─── Filter, sort, paginate ──────────────────────
  const filteredAndSortedDocs = useMemo(() => {
    if (!documents) return [];

    const filtered = documents.filter(doc => {
      const q = filters.debouncedQuery.toLowerCase();
      const matchesSearch =
        doc.title?.toLowerCase().includes(q) ||
        doc.originalFileName?.toLowerCase().includes(q) ||
        doc.description?.toLowerCase().includes(q);

      const matchesCategory =
        filters.categoryFilter === 'الكل' || doc.category === filters.categoryFilter;

      const createdAt = doc.createdAt ? new Date(doc.createdAt) : null;
      const withinDate =
        (!filters.fromDate || (createdAt && createdAt >= new Date(filters.fromDate))) &&
        (!filters.toDate || (createdAt && createdAt <= new Date(filters.toDate)));

      const sizeKB = (doc.fileSize || 0) / 1024;
      const withinSize =
        (!filters.minSizeKB || sizeKB >= Number(filters.minSizeKB)) &&
        (!filters.maxSizeKB || sizeKB <= Number(filters.maxSizeKB));

      const matchesTags =
        !filters.tagFilter.length ||
        (Array.isArray(doc.tags) && doc.tags.some(t => filters.tagFilter.includes(t)));

      return matchesSearch && matchesCategory && withinDate && withinSize && matchesTags;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'title':
          comparison = a.title?.localeCompare(b.title || '', 'ar');
          break;
        case 'category':
          comparison = a.category?.localeCompare(b.category || '', 'ar');
          break;
        case 'size':
          comparison = (a.fileSize || 0) - (b.fileSize || 0);
          break;
        case 'date':
        default:
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [
    documents,
    filters.debouncedQuery,
    filters.categoryFilter,
    filters.sortBy,
    filters.sortOrder,
    filters.fromDate,
    filters.toDate,
    filters.minSizeKB,
    filters.maxSizeKB,
    filters.tagFilter,
  ]);

  const uniqueTags = useMemo(() => {
    const set = new Set();
    (documents || []).forEach(d => (d.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [documents]);

  const paginatedDocs = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredAndSortedDocs.slice(start, start + rowsPerPage);
  }, [filteredAndSortedDocs, page, rowsPerPage]);

  // ─── Selection helpers ───────────────────────────
  const selectAllPage = useCallback(() => {
    selection.selectMultiple(paginatedDocs.map(doc => doc._id));
  }, [selection, paginatedDocs]);

  const selectAllFiltered = useCallback(() => {
    const total = filteredAndSortedDocs.length;
    if (total > 100) {
      showConfirm({
        title: 'تحديد عناصر كثيرة',
        message: `سيتم تحديد ${total} عنصرًا. هل تريد المتابعة؟`,
        confirmText: 'متابعة',
        confirmColor: 'primary',
        onConfirm: () => selection.selectMultiple(filteredAndSortedDocs.map(doc => doc._id)),
      });
      return;
    }
    selection.selectMultiple(filteredAndSortedDocs.map(doc => doc._id));
  }, [selection, filteredAndSortedDocs, showConfirm]);

  const handleSelectAll = useCallback(
    event => {
      if (event.target.checked) {
        selection.selectMultiple(paginatedDocs.map(doc => doc._id));
      } else {
        selection.clearSelection();
      }
    },
    [selection, paginatedDocs]
  );

  const handleSelectOne = useCallback(
    docId => {
      selection.selectOne(docId);
    },
    [selection]
  );

  // ─── Pagination handlers ─────────────────────────
  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback(event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // ─── Bulk share ──────────────────────────────────
  const handleBulkShare = useCallback(() => {
    const selectedDocs = documents.filter(d => selection.selected.includes(d._id));
    if (!selectedDocs.length) {
      actions.showMessage('ℹ️ لا توجد عناصر للمشاركة', 'info');
      return;
    }
    if (!onShare) {
      actions.showMessage('ℹ️ لم يتم تمرير دالة المشاركة', 'info');
      return;
    }
    try {
      onShare(selectedDocs);
      actions.showMessage(`✅ تم تجهيز المشاركة لـ ${selectedDocs.length} عنصر`, 'success');
    } catch (e) {
      try {
        selectedDocs.forEach(doc => onShare(doc));
        actions.showMessage(`✅ تم فتح المشاركة لكل عنصر (${selectedDocs.length})`, 'success');
      } catch (err) {
        actions.showMessage('❌ تعذر المشاركة الجماعية', 'error');
      }
    }
  }, [documents, selection.selected, actions, onShare]);

  // ─── Bulk edit ───────────────────────────────────
  const handleBulkEdit = useCallback(
    type => {
      if (!selection.selected.length) {
        actions.showMessage('ℹ️ لا توجد عناصر محددة للتحرير', 'info');
        return;
      }
      dialogs.openBulkEdit(type);
    },
    [selection.selected, actions, dialogs]
  );

  return {
    // State
    page,
    rowsPerPage,
    visibleCols,
    columnsMenuAnchor,
    searchRef,
    // Derived data
    filteredAndSortedDocs,
    uniqueTags,
    paginatedDocs,
    // Columns menu
    handleOpenColumnsMenu,
    handleCloseColumnsMenu,
    toggleColumn,
    // Selection
    handleSelectAll,
    handleSelectOne,
    selectAllPage,
    selectAllFiltered,
    // Pagination
    handleChangePage,
    handleChangeRowsPerPage,
    // Bulk actions
    applyBulkEdit,
    handleBulkShare,
    handleBulkEdit,
  };
};

export default useDocumentListLocal;
