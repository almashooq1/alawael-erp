/**
 * Document List Component - Advanced Version ⭐
 * مكون قائمة المستندات - نسخة متقدمة
 *
 * Features:
 * ✅ Interactive table with hover effects
 * ✅ Context menu for actions
 * ✅ Detailed document preview
 * ✅ Color-coded categories
 * ✅ Responsive design
 * ✅ Loading states
 * ✅ Better error handling
 * 🆕 Advanced search and filtering
 * 🆕 Column sorting
 * 🆕 Bulk selection and actions
 * 🆕 Pagination
 * 🆕 Document editing
 * 🆕 Quick preview
 * 🆕 Export capabilities
 * 🆕 Advanced filters panel
 * 🆕 Stats and analytics
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Stack,
  TextField,
  InputAdornment,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  TablePagination,
  Collapse,
  Badge,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  FolderOpen as FolderOpenIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  GetApp as GetAppIcon,
  DeleteSweep as DeleteSweepIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  FileDownload as FileDownloadIcon,
  ViewColumn as ViewColumnIcon,
  DataObject as DataObjectIcon,
  SelectAll as SelectAllIcon,
  LocalOffer as LocalOfferIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import documentService from '../services/documentService';
import { useDocumentFilters } from '../hooks/useDocumentFilters';
import { useDocumentDialogs } from '../hooks/useDocumentDialogs';
import { useDocumentSelection } from '../hooks/useDocumentSelection';
import { useDocumentActions } from '../hooks/useDocumentActions';

const DocumentList = ({ documents, onRefresh, onShare }) => {
  // Initialize custom hooks
  const filters = useDocumentFilters();
  const dialogs = useDocumentDialogs();
  const selection = useDocumentSelection();
  const actions = useDocumentActions(onRefresh);

  // Local state for pagination, column visibility, and columns menu
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState(null);
  const [visibleCols, setVisibleCols] = useState({
    type: true,
    title: true,
    category: true,
    size: true,
    date: true,
    actions: true,
  });

  // Persist column preferences
  useEffect(() => {
    try {
      const raw = localStorage.getItem('documentListPrefs');
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs.visibleCols) setVisibleCols(prev => ({ ...prev, ...prefs.visibleCols }));
        if (prefs.rowsPerPage) setRowsPerPage(Number(prefs.rowsPerPage));
      }
    } catch (e) {
      console.error('Failed to load column preferences:', e);
    }
  }, []);

  useEffect(() => {
    try {
      const prefs = {
        visibleCols,
        rowsPerPage,
      };
      const raw = localStorage.getItem('documentListPrefs');
      const existing = raw ? JSON.parse(raw) : {};
      localStorage.setItem('documentListPrefs', JSON.stringify({ ...existing, ...prefs }));
    } catch (e) {
      console.error('Failed to save column preferences:', e);
    }
  }, [visibleCols, rowsPerPage]);

  const searchRef = useRef(null);

  // Keyboard shortcuts
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

  const handleOpenColumnsMenu = useCallback(event => setColumnsMenuAnchor(event.currentTarget), []);
  const handleCloseColumnsMenu = useCallback(() => setColumnsMenuAnchor(null), []);
  const toggleColumn = useCallback(
    key => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] })),
    []
  );

  const selectAllPage = useCallback(() => {
    // Will use closure to get latest paginatedDocs
    // This is safe because it's called from user interaction
    const pageDocs = documents
      .filter(doc => {
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
      })
      .sort((a, b) => {
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
      })
      .slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    selection.selectMultiple(pageDocs.map(doc => doc._id));
  }, [selection, documents, filters, page, rowsPerPage]);

  const selectAllFiltered = useCallback(() => {
    // Will use closure to get latest filteredAndSortedDocs
    const filteredDocs = documents
      .filter(doc => {
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
      })
      .sort((a, b) => {
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

    const total = filteredDocs.length;
    if (total > 100) {
      const ok = window.confirm(`سيتم تحديد ${total} عنصرًا. هل تريد المتابعة؟`);
      if (!ok) {
        return;
      }
    }
    selection.selectMultiple(filteredDocs.map(doc => doc._id));
  }, [selection, documents, filters]);

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

  const getCategoryColor = category => {
    const colors = {
      تقارير: 'info',
      عقود: 'warning',
      سياسات: 'success',
      تدريب: 'primary',
      مالي: 'error',
      أخرى: 'default',
    };
    return colors[category] || 'default';
  };

  // Filter and Sort Documents
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

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback(event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

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

  const categories = ['الكل', 'تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'أخرى'];

  return (
    <>
      {/* Search and Filters Bar */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2, boxShadow: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="🔍 البحث في المستندات..."
              value={filters.searchQuery}
              onChange={e => filters.setSearchQuery(e.target.value)}
              sx={{ flex: 1, minWidth: 250 }}
              size="small"
              inputRef={searchRef}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={filters.categoryFilter}
                onChange={e => filters.setCategoryFilter(e.target.value)}
                label="الفئة"
              >
                {categories.map(cat => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>الترتيب</InputLabel>
              <Select
                value={filters.sortBy}
                onChange={e => filters.setSortBy(e.target.value)}
                label="الترتيب"
              >
                <MenuItem value="date">التاريخ</MenuItem>
                <MenuItem value="title">العنوان</MenuItem>
                <MenuItem value="category">الفئة</MenuItem>
                <MenuItem value="size">الحجم</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="عكس الترتيب">
              <IconButton
                onClick={() => filters.setSortOrder(filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                color="primary"
                sx={{
                  transform: filters.sortOrder === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)',
                  transition: 'transform 0.3s',
                }}
                aria-label="toggle-sort-order"
              >
                <KeyboardArrowUpIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="المرشحات المتقدمة">
              <IconButton
                onClick={() => filters.setShowFilters(!filters.showFilters)}
                color="primary"
                aria-label="toggle-filters"
              >
                <Badge badgeContent={filters.categoryFilter !== 'الكل' ? 1 : 0} color="error">
                  <FilterListIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>

          {/* Advanced Filters Panel */}
          <Collapse in={filters.showFilters}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8f9ff', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                📊 المرشحات المتقدمة
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    label="من تاريخ"
                    type="date"
                    size="small"
                    sx={{ flex: 1, minWidth: 200 }}
                    InputLabelProps={{ shrink: true }}
                    value={filters.fromDate}
                    onChange={e => filters.setFromDate(e.target.value)}
                  />
                  <TextField
                    label="إلى تاريخ"
                    type="date"
                    size="small"
                    sx={{ flex: 1, minWidth: 200 }}
                    InputLabelProps={{ shrink: true }}
                    value={filters.toDate}
                    onChange={e => filters.setToDate(e.target.value)}
                  />
                  <TextField
                    label="الحد الأدنى للحجم (KB)"
                    type="number"
                    size="small"
                    sx={{ flex: 1, minWidth: 200 }}
                    value={filters.minSizeKB}
                    onChange={e => filters.setMinSizeKB(e.target.value)}
                  />
                  <TextField
                    label="الحد الأقصى للحجم (KB)"
                    type="number"
                    size="small"
                    sx={{ flex: 1, minWidth: 200 }}
                    value={filters.maxSizeKB}
                    onChange={e => filters.setMaxSizeKB(e.target.value)}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => filters.setShowFilters(false)}
                  >
                    إغلاق
                  </Button>
                  <Button variant="contained" size="small" onClick={filters.handleResetFilters}>
                    إعادة تعيين
                  </Button>
                </Box>
                {uniqueTags.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      🏷️ تصفية بالوسوم
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {uniqueTags.map(tag => {
                        const active = filters.tagFilter.includes(tag);
                        return (
                          <Chip
                            key={tag}
                            label={tag}
                            clickable
                            color={active ? 'success' : 'default'}
                            variant={active ? 'filled' : 'outlined'}
                            onClick={() => filters.handleToggleTag(tag)}
                          />
                        );
                      })}
                      {filters.tagFilter.length > 0 && (
                        <Button
                          size="small"
                          onClick={() => filters.setTagFilter([])}
                          sx={{ ml: 1 }}
                        >
                          مسح الوسوم
                        </Button>
                      )}
                    </Box>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Collapse>

          {/* Stats & Selection Info */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              📁 إجمالي: {filteredAndSortedDocs.length} مستند
              {filters.searchQuery && ` | 🔍 نتائج البحث: ${filteredAndSortedDocs.length}`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {selection.selected.length > 0 && (
                <Chip
                  label={`✓ محدد: ${selection.selected.length}`}
                  color="primary"
                  size="small"
                  onDelete={() => selection.clearSelection()}
                  sx={{ fontWeight: 600 }}
                />
              )}
              {filteredAndSortedDocs.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() =>
                    actions.handleExportList(
                      'filtered',
                      selection.selected,
                      filteredAndSortedDocs,
                      documents
                    )
                  }
                  sx={{ borderRadius: 2 }}
                >
                  تصدير النتائج
                </Button>
              )}
              {filteredAndSortedDocs.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() =>
                    actions.handleExportJSON(
                      'filtered',
                      selection.selected,
                      filteredAndSortedDocs,
                      documents
                    )
                  }
                  sx={{ borderRadius: 2 }}
                  startIcon={<DataObjectIcon />}
                >
                  تصدير JSON
                </Button>
              )}
              <Tooltip title="عرض/إخفاء الأعمدة">
                <IconButton size="small" onClick={handleOpenColumnsMenu} aria-label="columns-menu">
                  <ViewColumnIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Stack>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{
          boxShadow: 2,
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {actions.loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <Table>
          <TableHead
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            <TableRow>
              <TableCell padding="checkbox" sx={{ color: 'white' }}>
                <Checkbox
                  indeterminate={
                    selection.selected.length > 0 &&
                    selection.selected.length < paginatedDocs.length
                  }
                  checked={
                    paginatedDocs.length > 0 && selection.selected.length === paginatedDocs.length
                  }
                  onChange={handleSelectAll}
                  sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }}
                />
                <Tooltip title="خيارات التحديد">
                  <IconButton
                    size="small"
                    onClick={selection.openSelectionMenu}
                    sx={{ ml: 0.5, color: 'white' }}
                    aria-label="selection-options"
                  >
                    <SelectAllIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
              {visibleCols.type && (
                <TableCell align="center" sx={{ fontWeight: 'bold', color: 'white' }}>
                  النوع
                </TableCell>
              )}
              {visibleCols.title && (
                <TableCell
                  sx={{ fontWeight: 'bold', color: 'white', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => filters.handleSort('title')}
                >
                  العنوان {filters.sortBy === 'title' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </TableCell>
              )}
              {visibleCols.category && (
                <TableCell
                  sx={{ fontWeight: 'bold', color: 'white', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => filters.handleSort('category')}
                >
                  الفئة {filters.sortBy === 'category' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </TableCell>
              )}
              {visibleCols.size && (
                <TableCell
                  sx={{ fontWeight: 'bold', color: 'white', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => filters.handleSort('size')}
                >
                  الحجم {filters.sortBy === 'size' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </TableCell>
              )}
              {visibleCols.date && (
                <TableCell
                  sx={{ fontWeight: 'bold', color: 'white', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => filters.handleSort('date')}
                >
                  التاريخ {filters.sortBy === 'date' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                </TableCell>
              )}
              {visibleCols.actions && (
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }} align="center">
                  الإجراءات
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedDocs && paginatedDocs.length > 0 ? (
              paginatedDocs.map((doc, index) => {
                const isSelected = selection.isSelected(doc._id);
                return (
                  <TableRow
                    key={doc._id}
                    hover
                    selected={isSelected}
                    sx={{
                      transition: 'all 0.3s ease',
                      bgcolor: isSelected ? 'action.selected' : 'inherit',
                      '&:hover': {
                        backgroundColor: isSelected ? 'action.selected' : '#f8f9ff',
                        transform: 'scale(1.005)',
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
                      },
                      animation: `fadeIn 0.5s ease ${index * 0.05}s both`,
                      '@keyframes fadeIn': {
                        from: { opacity: 0, transform: 'translateY(10px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                      },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox checked={isSelected} onChange={() => handleSelectOne(doc._id)} />
                    </TableCell>
                    {visibleCols.type && (
                      <TableCell align="center" sx={{ fontSize: '24px' }}>
                        {documentService.getFileIcon(doc.fileType)}
                      </TableCell>
                    )}
                    {visibleCols.title && (
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {doc.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          📎 {doc.originalFileName}
                        </Typography>
                      </TableCell>
                    )}
                    {visibleCols.category && (
                      <TableCell>
                        <Chip
                          label={doc.category}
                          size="small"
                          color={getCategoryColor(doc.category)}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                    )}
                    {visibleCols.size && (
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {documentService.formatFileSize(doc.fileSize)}
                        </Typography>
                      </TableCell>
                    )}
                    {visibleCols.date && (
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(doc.createdAt).toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Typography>
                      </TableCell>
                    )}
                    {visibleCols.actions && (
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="معاينة" arrow>
                            <IconButton
                              size="small"
                              onClick={() => dialogs.openDetails(doc)}
                              color="info"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="تحرير" arrow>
                            <IconButton
                              size="small"
                              onClick={() => dialogs.openEdit(doc)}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="المزيد" arrow>
                            <IconButton
                              size="small"
                              onClick={e => actions.openMenu(e)}
                              sx={{
                                transition: 'all 0.2s',
                                '&:hover': {
                                  backgroundColor: '#667eea',
                                  color: 'white',
                                  transform: 'rotate(90deg)',
                                },
                              }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <FolderOpenIcon sx={{ fontSize: 80, color: '#ccc', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      {filters.searchQuery || filters.categoryFilter !== 'الكل'
                        ? '🔍 لا توجد نتائج'
                        : 'لا توجد مستندات'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {filters.searchQuery || filters.categoryFilter !== 'الكل'
                        ? 'جرب تغيير معايير البحث'
                        : 'ابدأ برفع أول مستند لك'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {filteredAndSortedDocs.length > 0 && (
        <TablePagination
          component={Paper}
          count={filteredAndSortedDocs.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
          sx={{ borderRadius: 2, mt: 2, boxShadow: 1 }}
        />
      )}

      {/* Bulk Actions Speed Dial */}
      {selection.selected.length > 0 && (
        <SpeedDial
          ariaLabel="الإجراءات الجماعية"
          sx={{ position: 'fixed', bottom: 24, left: 24 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<GetAppIcon />}
            tooltipTitle={`تنزيل ${selection.selected.length}`}
            onClick={() => actions.handleBulkDownload(selection.selected, documents)}
          />
          <SpeedDialAction
            icon={<DeleteSweepIcon />}
            tooltipTitle={`حذف ${selection.selected.length}`}
            onClick={() => actions.handleBulkDelete(selection.selected, documents)}
          />
          <SpeedDialAction
            icon={<FileDownloadIcon />}
            tooltipTitle="تصدير القائمة"
            onClick={() =>
              actions.handleExportList(
                'selected',
                selection.selected,
                filteredAndSortedDocs,
                documents
              )
            }
          />
          <SpeedDialAction
            icon={<DataObjectIcon />}
            tooltipTitle="تصدير JSON"
            onClick={() =>
              actions.handleExportJSON(
                'selected',
                selection.selected,
                filteredAndSortedDocs,
                documents
              )
            }
          />
          <SpeedDialAction
            icon={<ShareIcon />}
            tooltipTitle={`مشاركة ${selection.selected.length}`}
            onClick={handleBulkShare}
          />
          <SpeedDialAction
            icon={<LocalOfferIcon />}
            tooltipTitle="تحرير الوسوم"
            onClick={() => handleBulkEdit('tags')}
          />
          <SpeedDialAction
            icon={<CategoryIcon />}
            tooltipTitle="تغيير الفئة"
            onClick={() => handleBulkEdit('category')}
          />
        </SpeedDial>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={actions.anchorEl}
        open={Boolean(actions.anchorEl)}
        onClose={actions.closeMenu}
        PaperProps={{
          elevation: 8,
          sx: {
            minWidth: 220,
            borderRadius: 2,
            mt: 1,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => dialogs.openPreview(dialogs.selectedDoc)}
          sx={{ py: 1.5, '&:hover': { backgroundColor: '#e3f2fd' } }}
        >
          <VisibilityIcon sx={{ mr: 1.5, color: '#1976d2' }} />
          <Typography>معاينة سريعة</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => dialogs.openEdit(dialogs.selectedDoc)}
          sx={{ py: 1.5, '&:hover': { backgroundColor: '#f3e5f5' } }}
        >
          <EditIcon sx={{ mr: 1.5, color: '#9c27b0' }} />
          <Typography>تحرير</Typography>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => actions.handleDownload(dialogs.selectedDoc)}
          sx={{ py: 1.5, '&:hover': { backgroundColor: '#e8f5e9' } }}
        >
          <DownloadIcon sx={{ mr: 1.5, color: '#388e3c' }} />
          <Typography>تنزيل</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => onShare && onShare(dialogs.selectedDoc)}
          sx={{ py: 1.5, '&:hover': { backgroundColor: '#fff3e0' } }}
        >
          <ShareIcon sx={{ mr: 1.5, color: '#f57c00' }} />
          <Typography>مشاركة</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => dialogs.openDetails(dialogs.selectedDoc)}
          sx={{ py: 1.5, '&:hover': { backgroundColor: '#fce4ec' } }}
        >
          <InfoIcon sx={{ mr: 1.5, color: '#e91e63' }} />
          <Typography>التفاصيل الكاملة</Typography>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => actions.handleDelete(dialogs.selectedDoc)}
          sx={{ py: 1.5, color: 'error.main', '&:hover': { backgroundColor: '#ffebee' } }}
        >
          <DeleteIcon sx={{ mr: 1.5 }} />
          <Typography>حذف</Typography>
        </MenuItem>
      </Menu>

      {/* قائمة خيارات التحديد */}
      <Menu
        anchorEl={selection.selectionMenuAnchor}
        open={Boolean(selection.selectionMenuAnchor)}
        onClose={selection.closeSelectionMenu}
      >
        <MenuItem onClick={selectAllPage}>
          <Typography>تحديد صفحة الحالية</Typography>
        </MenuItem>
        <MenuItem onClick={selectAllFiltered}>
          <Typography>تحديد كل النتائج</Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={selection.clearSelection}>
          <Typography color="error">مسح التحديد</Typography>
        </MenuItem>
      </Menu>

      {/* قائمة الأعمدة */}
      <Menu
        anchorEl={columnsMenuAnchor}
        open={Boolean(columnsMenuAnchor)}
        onClose={handleCloseColumnsMenu}
      >
        {[
          { key: 'type', label: 'النوع' },
          { key: 'title', label: 'العنوان' },
          { key: 'category', label: 'الفئة' },
          { key: 'size', label: 'الحجم' },
          { key: 'date', label: 'التاريخ' },
          { key: 'actions', label: 'الإجراءات' },
        ].map(item => (
          <MenuItem key={item.key} onClick={() => toggleColumn(item.key)}>
            <Checkbox checked={visibleCols[item.key]} />
            <Typography>{item.label}</Typography>
          </MenuItem>
        ))}
      </Menu>

      {/* نافذة التحرير الجماعي */}
      <Dialog
        open={dialogs.bulkEditOpen}
        onClose={dialogs.closeBulkEdit}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {dialogs.bulkEditType === 'tags' ? <LocalOfferIcon /> : <CategoryIcon />}
          تحرير جماعي
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          {dialogs.bulkEditType === 'tags' ? (
            <TextField
              label="الوسوم الجديدة (مفصولة بفواصل)"
              value={dialogs.bulkEditTagsInput}
              onChange={e => dialogs.setBulkEditTagsInput(e.target.value)}
              fullWidth
              placeholder="وسم1, وسم2, وسم3"
            />
          ) : (
            <FormControl fullWidth>
              <InputLabel>الفئة الجديدة</InputLabel>
              <Select
                value={dialogs.bulkEditCategory}
                onChange={e => dialogs.setBulkEditCategory(e.target.value)}
                label="الفئة الجديدة"
              >
                {['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'أخرى'].map(cat => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            سيتم تطبيق التغييرات على العناصر المحددة ({selection.selected.length}).
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={dialogs.closeBulkEdit} variant="outlined" sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            onClick={applyBulkEdit}
            variant="contained"
            disabled={
              (dialogs.bulkEditType === 'tags' && !dialogs.bulkEditTagsInput.trim()) ||
              (dialogs.bulkEditType === 'category' && !dialogs.bulkEditCategory)
            }
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            تطبيق
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة المعاينة السريعة */}
      <Dialog
        open={dialogs.previewOpen}
        onClose={dialogs.closePreview}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <VisibilityIcon />
          معاينة سريعة
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {dialogs.selectedDoc ? (
            (() => {
              const previewUrl = documentService.getPreviewUrl
                ? documentService.getPreviewUrl(dialogs.selectedDoc._id)
                : null;
              const isImage = (dialogs.selectedDoc.fileType || '').startsWith('image');
              const isPdf = (dialogs.selectedDoc.fileType || '').toLowerCase().includes('pdf');
              if (previewUrl) {
                if (isImage) {
                  return (
                    <Box sx={{ textAlign: 'center' }}>
                      <img
                        src={previewUrl}
                        alt={dialogs.selectedDoc.title || dialogs.selectedDoc.originalFileName}
                        style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8 }}
                      />
                    </Box>
                  );
                }
                if (isPdf) {
                  return (
                    <Box sx={{ height: '70vh' }}>
                      <iframe
                        title="document-preview"
                        src={previewUrl}
                        style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                      />
                    </Box>
                  );
                }
                return (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    لا تتوفر معاينة مدمجة لهذا النوع. يمكنك تنزيل الملف لعرضه.
                  </Alert>
                );
              }
              return (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  المعاينة غير متاحة. حاول فتح التفاصيل أو تنزيل الملف.
                </Alert>
              );
            })()
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              اختر مستنداً للمعاينة.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={dialogs.closePreview} variant="outlined" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
          {dialogs.selectedDoc && (
            <Button
              onClick={() => {
                actions.handleDownload(dialogs.selectedDoc);
                dialogs.closePreview();
              }}
              variant="contained"
              startIcon={<DownloadIcon />}
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              تنزيل المستند
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* نافذة التحرير */}
      <Dialog
        open={dialogs.editOpen}
        onClose={dialogs.closeEdit}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <EditIcon />
          تحرير المستند
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Stack spacing={3}>
            <TextField
              label="العنوان"
              value={dialogs.editForm.title}
              onChange={e => dialogs.setEditForm({ ...dialogs.editForm, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="الوصف"
              value={dialogs.editForm.description}
              onChange={e =>
                dialogs.setEditForm({ ...dialogs.editForm, description: e.target.value })
              }
              fullWidth
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={dialogs.editForm.category}
                onChange={e =>
                  dialogs.setEditForm({ ...dialogs.editForm, category: e.target.value })
                }
                label="الفئة"
              >
                {categories
                  .filter(c => c !== 'الكل')
                  .map(cat => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              label="الوسوم (مفصولة بفواصل)"
              value={dialogs.editForm.tags.join(', ')}
              onChange={e =>
                dialogs.setEditForm({
                  ...dialogs.editForm,
                  tags: e.target.value.split(',').map(t => t.trim()),
                })
              }
              fullWidth
              placeholder="وسم1, وسم2, وسم3"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={dialogs.closeEdit} variant="outlined" sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            onClick={async () => {
              try {
                actions.setLoading(true);
                if (!dialogs.selectedDoc?._id) throw new Error('معرّف المستند غير متوفر');
                await documentService.updateDocument(dialogs.selectedDoc._id, {
                  title: dialogs.editForm.title,
                  description: dialogs.editForm.description,
                  category: dialogs.editForm.category,
                  tags: dialogs.editForm.tags,
                });
                actions.showMessage('✅ تم تحديث المستند بنجاح');
                dialogs.closeEdit();
                if (onRefresh) onRefresh();
              } catch (error) {
                actions.showMessage('❌ خطأ في تحديث المستند: ' + error.message, 'error');
              } finally {
                actions.setLoading(false);
              }
            }}
            variant="contained"
            disabled={!dialogs.editForm.title}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            حفظ التغييرات
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة التفاصيل المحسّنة */}
      <Dialog
        open={dialogs.detailsOpen}
        onClose={dialogs.closeDetails}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: 24,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <InfoIcon />
          تفاصيل المستند
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          {dialogs.selectedDoc && (
            <Stack spacing={3}>
              {/* معلومات أساسية */}
              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8f9ff', borderRadius: 2 }}>
                <Typography variant="overline" color="primary" sx={{ fontWeight: 600 }}>
                  المعلومات الأساسية
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={2}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      📌 العنوان
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {dialogs.selectedDoc.title}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      📝 الوصف
                    </Typography>
                    <Typography variant="body2">
                      {dialogs.selectedDoc.description || 'لا يوجد وصف'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        📁 الفئة
                      </Typography>
                      <Chip
                        label={dialogs.selectedDoc.category}
                        color={getCategoryColor(dialogs.selectedDoc.category)}
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        💾 الحجم
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {documentService.formatFileSize(dialogs.selectedDoc.fileSize)}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Paper>

              {/* معلومات الملف */}
              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#fff9f0', borderRadius: 2 }}>
                <Typography variant="overline" color="warning.main" sx={{ fontWeight: 600 }}>
                  معلومات الملف
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        📎 اسم الملف
                      </Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {dialogs.selectedDoc.originalFileName}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        📅 تاريخ التحميل
                      </Typography>
                      <Typography variant="body2">
                        {new Date(dialogs.selectedDoc.createdAt).toLocaleString('ar-SA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Paper>

              {/* معلومات المستخدم */}
              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f0f7ff', borderRadius: 2 }}>
                <Typography variant="overline" color="info.main" sx={{ fontWeight: 600 }}>
                  معلومات المستخدم
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      fontSize: '20px',
                      fontWeight: 600,
                    }}
                  >
                    {dialogs.selectedDoc.uploadedByName?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {dialogs.selectedDoc.uploadedByName}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {dialogs.selectedDoc.uploadedByEmail || 'محمّل المستند'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* الوسوم */}
              {dialogs.selectedDoc.tags && dialogs.selectedDoc.tags.length > 0 && (
                <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f0fff4', borderRadius: 2 }}>
                  <Typography variant="overline" color="success.main" sx={{ fontWeight: 600 }}>
                    🏷️ الوسوم
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {dialogs.selectedDoc.tags.map((tag, idx) => (
                      <Chip key={idx} label={tag} size="small" variant="outlined" color="success" />
                    ))}
                  </Box>
                </Paper>
              )}

              {/* الإحصائيات */}
              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#fff0f6', borderRadius: 2 }}>
                <Typography variant="overline" color="error.main" sx={{ fontWeight: 600 }}>
                  📊 الإحصائيات
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                      {dialogs.selectedDoc.viewCount || 0}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      👁️ مشاهدة
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                      {dialogs.selectedDoc.downloadCount || 0}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      📥 تنزيل
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={dialogs.closeDetails} variant="outlined" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
          <Button
            onClick={() => {
              actions.handleDownload(dialogs.selectedDoc);
              dialogs.closeDetails();
            }}
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            تنزيل المستند
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar للإشعارات */}
      <Snackbar
        open={actions.snackbar.open}
        autoHideDuration={4000}
        onClose={actions.closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={actions.closeSnackbar}
          severity={actions.snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 2, minWidth: 300 }}
        >
          {actions.snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DocumentList;
