/**
 * DocumentListMenus — Context, selection, and columns menus
 * القوائم المنسدلة: السياق، التحديد، والأعمدة
 */



import { COLUMN_DEFINITIONS } from './documentListConstants';
import { statusColors, surfaceColors, leaveColors } from 'theme/palette';

/* ─── Context Menu ──────────────────────────────── */
export const ContextMenu = ({ anchorEl, onClose, doc, actions, dialogs, onShare }) => {
  const handleAction = (action) => {
    onClose();
    action(doc);
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{
        elevation: 8,
        sx: { minWidth: 220, borderRadius: 2, mt: 1 },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <MenuItem
        onClick={() => handleAction(dialogs.openPreview)}
        sx={{ py: 1.5, '&:hover': { backgroundColor: surfaceColors.infoLight } }}
      >
        <VisibilityIcon sx={{ mr: 1.5, color: statusColors.primaryBlue }} />
        <Typography>معاينة سريعة</Typography>
      </MenuItem>
      <MenuItem
        onClick={() => handleAction(dialogs.openEdit)}
        sx={{ py: 1.5, '&:hover': { backgroundColor: surfaceColors.purpleLight } }}
      >
        <EditIcon sx={{ mr: 1.5, color: statusColors.purple }} />
        <Typography>تحرير</Typography>
      </MenuItem>
      <Divider sx={{ my: 0.5 }} />
      <MenuItem
        onClick={() => handleAction(actions.handleDownload)}
        sx={{ py: 1.5, '&:hover': { backgroundColor: surfaceColors.successLight } }}
      >
        <DownloadIcon sx={{ mr: 1.5, color: statusColors.successDark }} />
        <Typography>تنزيل</Typography>
      </MenuItem>
      <MenuItem
        onClick={() => onShare && handleAction(onShare)}
        sx={{ py: 1.5, '&:hover': { backgroundColor: surfaceColors.warningLight } }}
      >
        <ShareIcon sx={{ mr: 1.5, color: statusColors.warningDark }} />
        <Typography>مشاركة</Typography>
      </MenuItem>
      <MenuItem
        onClick={() => handleAction(dialogs.openDetails)}
        sx={{ py: 1.5, '&:hover': { backgroundColor: surfaceColors.pinkLight } }}
      >
        <InfoIcon sx={{ mr: 1.5, color: leaveColors.maternity }} />
        <Typography>التفاصيل الكاملة</Typography>
      </MenuItem>
      <Divider sx={{ my: 0.5 }} />
      <MenuItem
        onClick={() => handleAction(actions.handleDelete)}
        sx={{ py: 1.5, color: 'error.main', '&:hover': { backgroundColor: surfaceColors.errorLight } }}
      >
        <DeleteIcon sx={{ mr: 1.5 }} />
        <Typography>حذف</Typography>
      </MenuItem>
    </Menu>
  );
};

/* ─── Selection Menu ────────────────────────────── */
export const SelectionMenu = ({ anchorEl, onClose, selectAllPage, selectAllFiltered, clearSelection }) => (
  <Menu
    anchorEl={anchorEl}
    open={Boolean(anchorEl)}
    onClose={onClose}
  >
    <MenuItem onClick={selectAllPage}>
      <Typography>تحديد صفحة الحالية</Typography>
    </MenuItem>
    <MenuItem onClick={selectAllFiltered}>
      <Typography>تحديد كل النتائج</Typography>
    </MenuItem>
    <Divider />
    <MenuItem onClick={clearSelection}>
      <Typography color="error">مسح التحديد</Typography>
    </MenuItem>
  </Menu>
);

/* ─── Columns Menu ──────────────────────────────── */
export const ColumnsMenu = ({ anchorEl, onClose, visibleCols, toggleColumn }) => (
  <Menu
    anchorEl={anchorEl}
    open={Boolean(anchorEl)}
    onClose={onClose}
  >
    {COLUMN_DEFINITIONS.map(item => (
      <MenuItem key={item.key} onClick={() => toggleColumn(item.key)}>
        <Checkbox checked={visibleCols[item.key]} />
        <Typography>{item.label}</Typography>
      </MenuItem>
    ))}
  </Menu>
);
