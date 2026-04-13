/**
 * Document List Component - Advanced Version ⭐
 * مكون قائمة المستندات - نسخة متقدمة (Orchestrator)
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

import { Paper } from '@mui/material';
import { useDocumentFilters } from 'components/hooks/useDocumentFilters';
import { useDocumentDialogs } from 'components/hooks/useDocumentDialogs';
import { useDocumentSelection } from 'components/hooks/useDocumentSelection';
import { useDocumentActions } from 'components/hooks/useDocumentActions';
import { useConfirmDialog } from 'components/common/ConfirmDialog';
import useDocumentListLocal from './useDocumentListLocal';

const DocumentList = ({ documents, onRefresh, onShare }) => {
  const filters = useDocumentFilters();
  const dialogs = useDocumentDialogs();
  const selection = useDocumentSelection();
  const actions = useDocumentActions(onRefresh);
  const [confirmState, showConfirm] = useConfirmDialog();

  const local = useDocumentListLocal({
    documents,
    filters,
    dialogs,
    selection,
    actions,
    onRefresh,
    onShare,
    showConfirm,
  });

  return (
    <>
      {/* ─── Search & Filters ─── */}
      <DocumentListToolbar
        filters={filters}
        searchRef={local.searchRef}
        uniqueTags={local.uniqueTags}
        selection={selection}
        actions={actions}
        filteredCount={local.filteredAndSortedDocs.length}
        documents={documents}
        filteredAndSortedDocs={local.filteredAndSortedDocs}
        onOpenColumnsMenu={local.handleOpenColumnsMenu}
      />

      {/* ─── Document Table ─── */}
      <DocumentListTable
        paginatedDocs={local.paginatedDocs}
        visibleCols={local.visibleCols}
        filters={filters}
        selection={selection}
        dialogs={dialogs}
        actions={actions}
        loading={actions.loading}
        onSelectAll={local.handleSelectAll}
        onSelectOne={local.handleSelectOne}
      />

      {/* ─── Pagination ─── */}
      {local.filteredAndSortedDocs.length > 0 && (
        <TablePagination
          component={Paper}
          count={local.filteredAndSortedDocs.length}
          page={local.page}
          onPageChange={local.handleChangePage}
          rowsPerPage={local.rowsPerPage}
          onRowsPerPageChange={local.handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
          sx={{ borderRadius: 2, mt: 2, boxShadow: 1 }}
        />
      )}

      {/* ─── Bulk Actions SpeedDial ─── */}
      {selection.selected.length > 0 && (
        <DocumentListBulkActions
          selectedCount={selection.selected.length}
          selection={selection}
          actions={actions}
          documents={documents}
          filteredAndSortedDocs={local.filteredAndSortedDocs}
          onBulkShare={local.handleBulkShare}
          onBulkEdit={local.handleBulkEdit}
        />
      )}

      {/* ─── Menus ─── */}
      <ContextMenu
        anchorEl={actions.anchorEl}
        onClose={actions.closeMenu}
        doc={actions.contextDoc}
        dialogs={dialogs}
        actions={actions}
        onShare={onShare}
      />
      <SelectionMenu
        anchorEl={selection.selectionMenuAnchor}
        onClose={selection.closeSelectionMenu}
        selectAllPage={local.selectAllPage}
        selectAllFiltered={local.selectAllFiltered}
        clearSelection={selection.clearSelection}
      />
      <ColumnsMenu
        anchorEl={local.columnsMenuAnchor}
        onClose={local.handleCloseColumnsMenu}
        visibleCols={local.visibleCols}
        toggleColumn={local.toggleColumn}
      />

      {/* ─── Dialogs ─── */}
      <BulkEditDialog dialogs={dialogs} selection={selection} onApply={local.applyBulkEdit} />
      <PreviewDialog dialogs={dialogs} actions={actions} />
      <EditDialog dialogs={dialogs} actions={actions} onRefresh={onRefresh} />
      <DetailsDialog dialogs={dialogs} actions={actions} />

      {/* ─── Snackbar ─── */}
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
      <ConfirmDialog {...confirmState} />
      <ConfirmDialog {...actions.confirmState} />
    </>
  );
};

export default DocumentList;
