/**
 * Professional Data Table — AlAwael ERP
 * جدول بيانات احترافي متعدد المزايا
 *
 * Features:
 * - Server-side & client-side pagination
 * - Column sorting (multi-column)
 * - Global search + column filters
 * - Row selection (single/multi)
 * - Bulk actions toolbar
 * - Empty / loading / error states
 * - Responsive design with horizontal scroll
 * - Export (CSV / Print)
 * - Customizable row actions
 * - RTL-compatible
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Checkbox,
  IconButton,
  Typography,
  InputBase,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Skeleton,
  useTheme,
  alpha,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  InboxRounded as EmptyIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';

// ─── DATA TABLE ──────────────────────────────────────────────────────────────
const ProDataTable = ({
  columns = [],           // [{ id, label, minWidth, align, sortable, render, hidden }]
  data = [],
  title,
  subtitle,
  loading = false,
  error = null,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  // Pagination
  totalCount,             // Server-side total
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  // Sorting
  sortBy,
  sortOrder = 'asc',
  onSortChange,
  // Search
  searchable = true,
  searchPlaceholder = 'بحث...',
  onSearch,
  // Actions
  actions,                // ReactNode: custom toolbar actions
  rowActions = [],        // [{ icon, label, onClick, color, show }]
  bulkActions = [],       // [{ icon, label, onClick, color }]
  onRefresh,
  onExport,
  // Empty state
  emptyTitle = 'لا توجد بيانات',
  emptySubtitle = 'لم يتم العثور على نتائج',
}) => {
  const theme = useTheme();
  const [localSearch, setLocalSearch] = useState('');
  const [localPage, setLocalPage] = useState(0);
  const [localRowsPerPage, setLocalRowsPerPage] = useState(10);
  const [localSortBy, setLocalSortBy] = useState(null);
  const [localSortOrder, setLocalSortOrder] = useState('asc');
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [actionMenuRow, setActionMenuRow] = useState(null);

  // Determine controlled vs uncontrolled
  const isServerSide = typeof totalCount === 'number';
  const currentPage = isServerSide ? page : localPage;
  const currentRowsPerPage = isServerSide ? rowsPerPage : localRowsPerPage;
  const currentSortBy = sortBy !== undefined ? sortBy : localSortBy;
  const currentSortOrder = sortBy !== undefined ? sortOrder : localSortOrder;

  // Visible columns
  const visibleColumns = useMemo(() => columns.filter((c) => !c.hidden), [columns]);

  // Client-side filtering + sorting + pagination
  const processedData = useMemo(() => {
    if (isServerSide) return data;

    let result = [...data];

    // Search
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      result = result.filter((row) =>
        visibleColumns.some((col) => {
          const val = row[col.id];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }

    // Sort
    if (currentSortBy) {
      result.sort((a, b) => {
        const valA = a[currentSortBy] ?? '';
        const valB = b[currentSortBy] ?? '';
        const cmp = String(valA).localeCompare(String(valB), 'ar', { numeric: true });
        return currentSortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, localSearch, currentSortBy, currentSortOrder, visibleColumns, isServerSide]);

  const paginatedData = useMemo(() => {
    if (isServerSide) return processedData;
    const start = currentPage * currentRowsPerPage;
    return processedData.slice(start, start + currentRowsPerPage);
  }, [processedData, currentPage, currentRowsPerPage, isServerSide]);

  const total = isServerSide ? totalCount : processedData.length;

  // Handlers
  const handleSort = useCallback((colId) => {
    if (onSortChange) {
      onSortChange(colId, currentSortBy === colId && currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setLocalSortOrder(currentSortBy === colId && localSortOrder === 'asc' ? 'desc' : 'asc');
      setLocalSortBy(colId);
    }
  }, [currentSortBy, currentSortOrder, localSortOrder, onSortChange]);

  const handlePageChange = (e, newPage) => {
    if (onPageChange) onPageChange(newPage);
    else setLocalPage(newPage);
  };

  const handleRowsPerPageChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (onRowsPerPageChange) onRowsPerPageChange(val);
    else { setLocalRowsPerPage(val); setLocalPage(0); }
  };

  const handleSelectAll = (e) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(paginatedData.map((r) => r.id || r._id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id) => {
    if (!onSelectionChange) return;
    const idx = selectedRows.indexOf(id);
    if (idx === -1) {
      onSelectionChange([...selectedRows, id]);
    } else {
      onSelectionChange(selectedRows.filter((i) => i !== id));
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setLocalSearch(val);
    setLocalPage(0);
    onSearch?.(val);
  };

  const allSelected = paginatedData.length > 0 && paginatedData.every((r) => selectedRows.includes(r.id || r._id));
  const someSelected = paginatedData.some((r) => selectedRows.includes(r.id || r._id));
  const hasSelection = selectedRows.length > 0;

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <Card sx={{ borderRadius: '16px', overflow: 'hidden' }}>
      {/* Toolbar */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          ...(hasSelection && {
            backgroundColor: alpha(theme.palette.primary.main, 0.06),
          }),
        }}
      >
        {/* Left: Title or selection info */}
        <Box>
          {hasSelection ? (
            <Typography variant="subtitle1" fontWeight={700} color="primary">
              {selectedRows.length} عنصر محدد
            </Typography>
          ) : (
            <>
              {title && <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>}
              {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
            </>
          )}
        </Box>

        {/* Right: Actions */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {/* Bulk Actions */}
          {hasSelection && bulkActions.map((action, i) => (
            <Button
              key={i}
              size="small"
              startIcon={action.icon}
              color={action.color || 'primary'}
              variant="outlined"
              onClick={() => action.onClick(selectedRows)}
              sx={{ borderRadius: '8px' }}
            >
              {action.label}
            </Button>
          ))}

          {/* Search */}
          {searchable && !hasSelection && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
                backgroundColor: theme.palette.action.hover,
                minWidth: 200,
              }}
            >
              <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <InputBase
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={handleSearch}
                sx={{ flex: 1, fontSize: '0.8125rem' }}
              />
            </Box>
          )}

          {/* Custom actions */}
          {actions}

          {/* Refresh */}
          {onRefresh && (
            <Tooltip title="تحديث">
              <IconButton size="small" aria-label="تحديث" onClick={onRefresh}><RefreshIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}

          {/* Export */}
          {onExport && (
            <Tooltip title="تصدير">
              <IconButton size="small" aria-label="تصدير" onClick={onExport}><ExportIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* Table */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="medium">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox" sx={{ backgroundColor: theme.palette.background.paper }}>
                  <Checkbox
                    indeterminate={someSelected && !allSelected}
                    checked={allSelected}
                    onChange={handleSelectAll}
                    size="small"
                  />
                </TableCell>
              )}
              {visibleColumns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align || 'right'}
                  sx={{
                    minWidth: col.minWidth || 120,
                    fontWeight: 700,
                    backgroundColor: theme.palette.background.paper,
                    whiteSpace: 'nowrap',
                  }}
                  sortDirection={currentSortBy === col.id ? currentSortOrder : false}
                >
                  {col.sortable !== false ? (
                    <TableSortLabel
                      active={currentSortBy === col.id}
                      direction={currentSortBy === col.id ? currentSortOrder : 'asc'}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
              {rowActions.length > 0 && (
                <TableCell align="center" sx={{ width: 60, fontWeight: 700, backgroundColor: theme.palette.background.paper }}>
                  إجراءات
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Loading */}
            {loading &&
              Array.from({ length: currentRowsPerPage }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {selectable && <TableCell padding="checkbox"><Skeleton variant="rectangular" width={18} height={18} /></TableCell>}
                  {visibleColumns.map((col) => (
                    <TableCell key={col.id}><Skeleton variant="text" width="80%" /></TableCell>
                  ))}
                  {rowActions.length > 0 && <TableCell><Skeleton variant="circular" width={24} height={24} /></TableCell>}
                </TableRow>
              ))}

            {/* Data Rows */}
            {!loading &&
              paginatedData.map((row, rowIdx) => {
                const rowId = row.id || row._id || rowIdx;
                const isSelected = selectedRows.includes(rowId);
                return (
                  <TableRow
                    key={rowId}
                    hover
                    selected={isSelected}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.06),
                      },
                    }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox checked={isSelected} onChange={() => handleSelectRow(rowId)} size="small" />
                      </TableCell>
                    )}
                    {visibleColumns.map((col) => (
                      <TableCell key={col.id} align={col.align || 'right'}>
                        {col.render ? col.render(row[col.id], row) : row[col.id]}
                      </TableCell>
                    ))}
                    {rowActions.length > 0 && (
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          aria-label="المزيد من الخيارات"
                          onClick={(e) => { setActionMenuAnchor(e.currentTarget); setActionMenuRow(row); }}
                        >
                          <MoreIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Empty State */}
      {!loading && paginatedData.length === 0 && !error && (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <EmptyIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {emptyTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {emptySubtitle}
          </Typography>
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 1.5 }} />
          <Typography variant="subtitle1" fontWeight={600} gutterBottom color="error">
            حدث خطأ
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {typeof error === 'string' ? error : 'تعذر تحميل البيانات'}
          </Typography>
          {onRefresh && (
            <Button variant="outlined" color="error" startIcon={<RefreshIcon />} onClick={onRefresh}>
              إعادة المحاولة
            </Button>
          )}
        </Box>
      )}

      {/* Pagination */}
      {!error && total > 0 && (
        <TablePagination
          component="div"
          count={total}
          page={currentPage}
          onPageChange={handlePageChange}
          rowsPerPage={currentRowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            '& .MuiTablePagination-actions': { direction: 'ltr' },
          }}
        />
      )}

      {/* Row Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => { setActionMenuAnchor(null); setActionMenuRow(null); }}
        PaperProps={{ sx: { borderRadius: '10px', minWidth: 160, boxShadow: theme.shadows[6] } }}
      >
        {rowActions
          .filter((a) => !a.show || a.show(actionMenuRow))
          .map((action, i) => (
            <MenuItem
              key={i}
              onClick={() => {
                action.onClick(actionMenuRow);
                setActionMenuAnchor(null);
                setActionMenuRow(null);
              }}
              sx={{ color: action.color ? `${action.color}.main` : undefined }}
            >
              {action.icon && <ListItemIcon sx={{ color: 'inherit' }}>{action.icon}</ListItemIcon>}
              <ListItemText>{action.label}</ListItemText>
            </MenuItem>
          ))}
      </Menu>
    </Card>
  );
};

export default ProDataTable;
