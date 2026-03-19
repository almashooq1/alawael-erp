/**
 * هوك إدارة حالة جدول المستفيدين
 * useBeneficiariesTable – state management hook
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import beneficiaryService from 'services/beneficiaryService';
import exportService from 'services/exportService';
import { useConfirmDialog } from 'components/common/ConfirmDialog';
import { sampleData, DEFAULT_FILTERS } from './beneficiariesTableConstants';
import { getStatusLabel, getCategoryLabel } from './beneficiariesLabelHelpers';

const useBeneficiariesTable = () => {
  const navigate = useNavigate();

  // Core state
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openRow, setOpenRow] = useState(null);

  // Filters
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Dialogs
  const [filterDialog, setFilterDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [_deleteDialog, setDeleteDialog] = useState(false);
  const [_bulkActionMenu, setBulkActionMenu] = useState(null);
  const [rowActionMenu, setRowActionMenu] = useState(null);
  const [selectedRowAction, setSelectedRowAction] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [confirmState, showConfirm] = useConfirmDialog();

  // ─── Data Loading ───────────────────────────────────────
  const loadBeneficiaries = async () => {
    setLoading(true);
    try {
      const res = await beneficiaryService.getAll();
      const data = res?.data || res?.beneficiaries || res || [];
      if (Array.isArray(data) && data.length > 0) {
        setBeneficiaries(data);
      } else {
        setBeneficiaries(sampleData);
      }
    } catch {
      setBeneficiaries(sampleData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBeneficiaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Filtering ──────────────────────────────────────────
  const applyFilters = useCallback(() => {
    let filtered = [...beneficiaries];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        b =>
          (b.name || '').toLowerCase().includes(q) ||
          (b.nameEn || '').toLowerCase().includes(q) ||
          (b.nationalId || '').includes(searchQuery) ||
          (b.phone || '').includes(searchQuery)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(b => b.status === filters.status);
    }
    if (filters.category !== 'all') {
      filtered = filtered.filter(b => b.category === filters.category);
    }
    if (filters.gender !== 'all') {
      filtered = filtered.filter(b => b.gender === filters.gender);
    }
    if (filters.ageRange !== 'all') {
      const [min, max] = filters.ageRange.split('-').map(Number);
      filtered = filtered.filter(b => b.age >= min && b.age <= max);
    }

    setFilteredData(filtered);
  }, [searchQuery, filters, beneficiaries]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ─── Sorting ────────────────────────────────────────────
  const handleRequestSort = property => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedData = useMemo(() => {
    const comparator = (a, b) => {
      if (b[orderBy] < a[orderBy]) return order === 'asc' ? 1 : -1;
      if (b[orderBy] > a[orderBy]) return order === 'asc' ? -1 : 1;
      return 0;
    };
    return [...filteredData].sort(comparator);
  }, [filteredData, order, orderBy]);

  // ─── Selection ──────────────────────────────────────────
  const handleSelectAll = event => {
    if (event.target.checked) {
      setSelected(filteredData.map(b => b.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = id => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];
    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(s => s !== id);
    }
    setSelected(newSelected);
  };

  const isSelected = id => selected.indexOf(id) !== -1;

  // ─── Bulk Actions ───────────────────────────────────────
  const handleBulkAction = async action => {
    try {
      if (action === 'delete') {
        showConfirm({
          title: 'حذف المستفيدين',
          message: `هل تريد حذف ${selected.length} مستفيد؟`,
          confirmText: 'حذف',
          confirmColor: 'error',
          onConfirm: async () => {
            for (const id of selected) {
              await beneficiaryService.updateProfile({ id, status: 'inactive' });
            }
            setSnackbar({
              open: true,
              message: `تم تنفيذ حذف على ${selected.length} مستفيد`,
              severity: 'success',
            });
            setBulkActionMenu(null);
            setSelected([]);
          },
        });
        return;
      } else if (action === 'export') {
        const exportData = beneficiaries.filter(b => selected.includes(b.id));
        exportService.toExcel(
          exportData.map(b => ({
            الاسم: b.name,
            الحالة: getStatusLabel(b.status),
            الفئة: getCategoryLabel(b.category),
            الهاتف: b.phone,
          })),
          `beneficiaries_${new Date().toISOString().slice(0, 10)}`
        );
      }
      setSnackbar({
        open: true,
        message: `تم تنفيذ ${action} على ${selected.length} مستفيد`,
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: 'حدث خطأ أثناء تنفيذ العملية',
        severity: 'error',
      });
    }
    setBulkActionMenu(null);
    setSelected([]);
  };

  // ─── Row Actions ────────────────────────────────────────
  const handleRowAction = (action, id) => {
    switch (action) {
      case 'view':
        navigate('/beneficiaries/manage', { state: { viewId: id } });
        break;
      case 'edit':
        navigate('/beneficiaries/manage', { state: { editId: id } });
        break;
      case 'delete':
        setSelectedRowAction(id);
        setDeleteDialog(true);
        break;
      case 'favorite':
        toggleFavorite(id);
        break;
      default:
        break;
    }
    setRowActionMenu(null);
  };

  const toggleFavorite = id => {
    setBeneficiaries(prev => prev.map(b => (b.id === id ? { ...b, favorite: !b.favorite } : b)));
    setSnackbar({ open: true, message: 'تم تحديث المفضلة', severity: 'success' });
  };

  // ─── Export ─────────────────────────────────────────────
  const handleExport = format => {
    try {
      const data = filteredData.map(b => ({
        الاسم: b.name,
        'الاسم بالإنجليزية': b.nameEn,
        'رقم الهوية': b.nationalId,
        الهاتف: b.phone,
        الحالة: getStatusLabel(b.status),
        الفئة: getCategoryLabel(b.category),
      }));
      const fileName = `beneficiaries_${new Date().toISOString().slice(0, 10)}`;
      if (format === 'Excel') exportService.toExcel(data, fileName);
      else if (format === 'CSV') exportService.toCSV(data, fileName);
      else if (format === 'PDF')
        exportService
          .toPDF('beneficiaries-table', fileName)
          .catch(() => exportService.toExcel(data, fileName));
      setSnackbar({
        open: true,
        message: `تم التصدير بصيغة ${format} بنجاح`,
        severity: 'success',
      });
    } catch {
      setSnackbar({ open: true, message: 'حدث خطأ أثناء التصدير', severity: 'error' });
    }
    setExportDialog(false);
  };

  // ─── Pagination ─────────────────────────────────────────
  const handleChangePage = (_e, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = e => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  return {
    // Data
    filteredData,
    sortedData,
    loading,
    beneficiaries,
    // Pagination
    page,
    rowsPerPage,
    handleChangePage,
    handleChangeRowsPerPage,
    // Sorting
    order,
    orderBy,
    handleRequestSort,
    // Selection
    selected,
    handleSelectAll,
    handleSelectOne,
    isSelected,
    // Search & filters
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    // Row expand
    openRow,
    setOpenRow,
    // Dialogs
    filterDialog,
    setFilterDialog,
    exportDialog,
    setExportDialog,
    rowActionMenu,
    setRowActionMenu,
    selectedRowAction,
    setSelectedRowAction,
    // Bulk / row actions
    handleBulkAction,
    handleRowAction,
    handleExport,
    applyFilters,
    // Snackbar
    snackbar,
    setSnackbar,
    // Confirm dialog
    confirmState,
    // Navigation
    navigate,
  };
};

export default useBeneficiariesTable;
