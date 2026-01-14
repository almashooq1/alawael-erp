/**
 * Custom Hook: useDocumentActions
 * إدارة الإجراءات (تنزيل، حذف، تصدير، إلخ)
 */

import { useState, useCallback } from 'react';
import documentService from '../../services/documentService';

export const useDocumentActions = onRefresh => {
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [anchorEl, setAnchorEl] = useState(null);

  const showMessage = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const openMenu = useCallback(event => {
    setAnchorEl(event.currentTarget);
  }, []);

  const closeMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleDownload = useCallback(
    async doc => {
      try {
        setLoading(true);
        await documentService.downloadDocument(doc._id, doc.originalFileName);
        showMessage('✅ تم تنزيل المستند بنجاح');
      } catch (error) {
        showMessage('❌ خطأ في تنزيل المستند: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    },
    [showMessage],
  );

  const handleDelete = useCallback(
    async doc => {
      if (!window.confirm('هل أنت متأكد من حذف هذا المستند؟\n\n⚠️ يمكنك استرجاعه لاحقاً من سلة المحذوفات.')) {
        return;
      }
      try {
        setLoading(true);
        await documentService.deleteDocument(doc._id);
        showMessage('🗑️ تم حذف المستند بنجاح');
        if (onRefresh) onRefresh();
      } catch (error) {
        showMessage('❌ خطأ في حذف المستند: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    },
    [onRefresh, showMessage],
  );

  const handleBulkDelete = useCallback(
    async (selectedIds, documents) => {
      if (!window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} مستند؟`)) {
        return;
      }
      try {
        setLoading(true);
        await Promise.all(selectedIds.map(id => documentService.deleteDocument(id)));
        showMessage(`✅ تم حذف ${selectedIds.length} مستند بنجاح`, 'success');
        if (onRefresh) onRefresh();
      } catch (error) {
        showMessage('❌ خطأ في الحذف الجماعي', 'error');
      } finally {
        setLoading(false);
      }
    },
    [onRefresh, showMessage],
  );

  const handleBulkDownload = useCallback(
    async (selectedIds, documents) => {
      try {
        setLoading(true);
        const selectedDocs = documents.filter(doc => selectedIds.includes(doc._id));
        await Promise.all(selectedDocs.map(doc => documentService.downloadDocument(doc._id, doc.originalFileName)));
        showMessage(`✅ تم تنزيل ${selectedIds.length} مستند بنجاح`, 'success');
      } catch (error) {
        showMessage('❌ خطأ في التنزيل الجماعي', 'error');
      } finally {
        setLoading(false);
      }
    },
    [showMessage],
  );

  const exportToCSV = useCallback(docs => {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['العنوان', 'اسم الملف', 'الفئة', 'الحجم (KB)', 'تاريخ الإنشاء', 'المحمّل', 'الوسوم'];
    const rows = docs.map(d => [
      d.title || '',
      d.originalFileName || '',
      d.category || '',
      Math.round(((d.fileSize || 0) / 1024) * 100) / 100,
      d.createdAt ? new Date(d.createdAt).toISOString() : '',
      d.uploadedByName || '',
      (d.tags || []).join('|'),
    ]);
    const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documents_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportList = useCallback(
    (scope, selectedIds, filteredDocs, allDocs) => {
      const docs = scope === 'selected' ? allDocs.filter(d => selectedIds.includes(d._id)) : filteredDocs;
      if (!docs.length) {
        showMessage('ℹ️ لا توجد عناصر للتصدير', 'info');
        return;
      }
      exportToCSV(docs);
      showMessage(`✅ تم تصدير ${docs.length} عنصر`, 'success');
    },
    [exportToCSV, showMessage],
  );

  const exportToJSON = useCallback(docs => {
    const json = JSON.stringify(docs, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documents_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportJSON = useCallback(
    (scope, selectedIds, filteredDocs, allDocs) => {
      const docs = scope === 'selected' ? allDocs.filter(d => selectedIds.includes(d._id)) : filteredDocs;
      if (!docs.length) {
        showMessage('ℹ️ لا توجد عناصر للتصدير', 'info');
        return;
      }
      exportToJSON(docs);
      showMessage(`✅ تم تصدير JSON لـ ${docs.length} عنصر`, 'success');
    },
    [exportToJSON, showMessage],
  );

  return {
    loading,
    setLoading,
    snackbar,
    showMessage,
    closeSnackbar,
    anchorEl,
    openMenu,
    closeMenu,
    handleDownload,
    handleDelete,
    handleBulkDelete,
    handleBulkDownload,
    handleExportList,
    handleExportJSON,
  };
};
