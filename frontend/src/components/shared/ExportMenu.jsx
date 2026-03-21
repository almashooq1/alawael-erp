import { useState } from 'react';



/**
 * ExportMenu — Dropdown for exporting data in various formats.
 *
 * @param {function} [onExportPDF]   — Handler for PDF export
 * @param {function} [onExportExcel] — Handler for Excel export
 * @param {function} [onExportCSV]   — Handler for CSV export
 * @param {function} [onPrint]       — Handler for print
 * @param {function} [onExportImage] — Handler for image export
 * @param {boolean}  [loading]       — Show loading spinner
 * @param {boolean}  [disabled]      — Disable the button
 * @param {string}   [size]          — Button size
 * @param {string}   [variant]       — Button variant
 * @param {string}   [label]         — Button label
 */
const ExportMenu = ({
  onExportPDF,
  onExportExcel,
  onExportCSV,
  onPrint,
  onExportImage,
  loading = false,
  disabled = false,
  size = 'small',
  variant = 'outlined',
  label = 'تصدير',
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (handler) => {
    setAnchorEl(null);
    handler?.();
  };

  const items = [
    { key: 'pdf', icon: <PdfIcon sx={{ color: '#E53935' }} />, label: 'PDF', handler: onExportPDF },
    { key: 'excel', icon: <ExcelIcon sx={{ color: '#43A047' }} />, label: 'Excel', handler: onExportExcel },
    { key: 'csv', icon: <CsvIcon sx={{ color: '#1E88E5' }} />, label: 'CSV', handler: onExportCSV },
    { key: 'divider' },
    { key: 'image', icon: <ImageIcon sx={{ color: '#FF9800' }} />, label: 'صورة', handler: onExportImage },
    { key: 'print', icon: <PrintIcon sx={{ color: '#546E7A' }} />, label: 'طباعة', handler: onPrint },
  ].filter(item => item.key === 'divider' || item.handler);

  if (items.length === 0) return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        startIcon={loading ? <CircularProgress size={16} /> : <ExportIcon />}
        onClick={e => setAnchorEl(e.currentTarget)}
        disabled={disabled || loading}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { minWidth: 160 } }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {items.map(item =>
          item.key === 'divider' ? (
            <Divider key="divider" />
          ) : (
            <MenuItem key={item.key} onClick={() => handleClick(item.handler)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
          )
        )}
      </Menu>
    </>
  );
};

export default ExportMenu;
