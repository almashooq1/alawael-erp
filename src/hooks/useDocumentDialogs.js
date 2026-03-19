/**
 * Custom Hook: useDocumentDialogs
 * إدارة حالة جميع النوافذ والحوارات
 */

import { useState, useCallback } from 'react';

export const useDocumentDialogs = () => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditType, setBulkEditType] = useState(null); // 'tags' | 'category'

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: [],
  });

  // Bulk edit inputs
  const [bulkEditTagsInput, setBulkEditTagsInput] = useState('');
  const [bulkEditCategory, setBulkEditCategory] = useState('');

  const openDetails = useCallback(doc => {
    setSelectedDoc(doc);
    setDetailsOpen(true);
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
  }, []);

  const openEdit = useCallback(doc => {
    setSelectedDoc(doc);
    setEditForm({
      title: doc.title || '',
      description: doc.description || '',
      category: doc.category || '',
      tags: doc.tags || [],
    });
    setEditOpen(true);
  }, []);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
  }, []);

  const openPreview = useCallback(doc => {
    setSelectedDoc(doc);
    setPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  const openBulkEdit = useCallback(type => {
    setBulkEditType(type);
    setBulkEditTagsInput('');
    setBulkEditCategory('');
    setBulkEditOpen(true);
  }, []);

  const closeBulkEdit = useCallback(() => {
    setBulkEditOpen(false);
  }, []);

  const closeAllDialogs = useCallback(() => {
    setDetailsOpen(false);
    setEditOpen(false);
    setPreviewOpen(false);
    setBulkEditOpen(false);
  }, []);

  return {
    // Dialog states
    selectedDoc,
    setSelectedDoc,
    detailsOpen,
    editOpen,
    previewOpen,
    bulkEditOpen,
    bulkEditType,
    // Edit form
    editForm,
    setEditForm,
    // Bulk edit inputs
    bulkEditTagsInput,
    setBulkEditTagsInput,
    bulkEditCategory,
    setBulkEditCategory,
    // Open/close actions
    openDetails,
    closeDetails,
    openEdit,
    closeEdit,
    openPreview,
    closePreview,
    openBulkEdit,
    closeBulkEdit,
    closeAllDialogs,
  };
};
