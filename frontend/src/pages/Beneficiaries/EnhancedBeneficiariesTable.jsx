/**
 * جدول المستفيدين المحسّن مع البحث المتقدم
 * Enhanced Beneficiaries Table with Advanced Search
 *
 * Features:
 * - Advanced filtering and search
 * - Sortable columns
 * - Bulk actions
 * - Export to Excel/PDF
 * - Column customization
 * - Inline editing
 * - Pagination
 * - Real-time updates
 */

import { Box } from '@mui/material';
import useBeneficiariesTable from './useBeneficiariesTable';
import BeneficiariesToolbar from './BeneficiariesToolbar';
import BeneficiariesBulkBar from './BeneficiariesBulkBar';
import BeneficiariesTableBody from './BeneficiariesTableBody';
import {
  FilterDialog,
  ExportDialog,
  RowActionMenu,
  BeneficiariesSnackbar,
  BeneficiariesConfirmDialog,
} from './BeneficiariesDialogs';

const EnhancedBeneficiariesTable = () => {
  const state = useBeneficiariesTable();

  return (
    <Box sx={{ p: 3 }}>
      {/* Toolbar: header banner + search / filter card */}
      <BeneficiariesToolbar
        searchQuery={state.searchQuery}
        setSearchQuery={state.setSearchQuery}
        filters={state.filters}
        setFilters={state.setFilters}
        setFilterDialog={state.setFilterDialog}
        setExportDialog={state.setExportDialog}
        navigate={state.navigate}
      />

      {/* Bulk Actions Bar */}
      <BeneficiariesBulkBar
        selected={state.selected}
        handleBulkAction={state.handleBulkAction}
      />

      {/* Table with head, body, expandable rows, pagination */}
      <BeneficiariesTableBody
        sortedData={state.sortedData}
        filteredData={state.filteredData}
        loading={state.loading}
        page={state.page}
        rowsPerPage={state.rowsPerPage}
        order={state.order}
        orderBy={state.orderBy}
        selected={state.selected}
        openRow={state.openRow}
        handleRequestSort={state.handleRequestSort}
        handleSelectAll={state.handleSelectAll}
        handleSelectOne={state.handleSelectOne}
        isSelected={state.isSelected}
        setOpenRow={state.setOpenRow}
        setRowActionMenu={state.setRowActionMenu}
        setSelectedRowAction={state.setSelectedRowAction}
        handleChangePage={state.handleChangePage}
        handleChangeRowsPerPage={state.handleChangeRowsPerPage}
      />

      {/* Row Action Menu */}
      <RowActionMenu
        anchorEl={state.rowActionMenu}
        onClose={() => state.setRowActionMenu(null)}
        handleRowAction={state.handleRowAction}
        selectedRowAction={state.selectedRowAction}
      />

      {/* Filter Dialog */}
      <FilterDialog
        open={state.filterDialog}
        onClose={() => state.setFilterDialog(false)}
        filters={state.filters}
        setFilters={state.setFilters}
        applyFilters={state.applyFilters}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={state.exportDialog}
        onClose={() => state.setExportDialog(false)}
        handleExport={state.handleExport}
      />

      {/* Snackbar */}
      <BeneficiariesSnackbar
        snackbar={state.snackbar}
        setSnackbar={state.setSnackbar}
      />

      {/* Confirm Dialog */}
      <BeneficiariesConfirmDialog confirmState={state.confirmState} />
    </Box>
  );
};

export default EnhancedBeneficiariesTable;
