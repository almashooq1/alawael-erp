import React from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import {
  FileDownload as FileDownloadIcon,
  Description as ExcelIcon,
  Picture as PdfIcon,
  Code as JsonIcon
} from '@mui/icons-material';

function BeneficiariesExport() {
  const { beneficiaries } = useSelector(state => state.beneficiaries);
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // Export to Excel
  const exportToExcel = () => {
    const headers = ['رقم الملف', 'الاسم الأول', 'الاسم الأخير', 'البريد الإلكتروني', 'الهاتف', 'جهة التأمين', 'تاريخ الإضافة'];
    
    const rows = beneficiaries.map(b => [
      b.fileNumber,
      b.firstName,
      b.lastName,
      b.email,
      b.phone,
      b.insuranceProvider,
      new Date(b.createdAt).toLocaleDateString('ar-SA')
    ]);

    let content = 'sep=,\n';
    content += headers.map(h => `"${h}"`).join(',') + '\n';
    rows.forEach(row => {
      content += row.map(cell => `"${cell || ''}"`).join(',') + '\n';
    });

    downloadFile(content, 'المستفيدين.csv', 'text/csv');
    handleCloseMenu();
  };

  // Export to JSON
  const exportToJSON = () => {
    const data = JSON.stringify(beneficiaries, null, 2);
    downloadFile(data, 'المستفيدين.json', 'application/json');
    handleCloseMenu();
  };

  // Export to PDF
  const exportToPDF = () => {
    // This would require a PDF library like jsPDF or pdfkit
    // For now, we'll just create a simple HTML table
    let content = '<h1>تقرير المستفيدين</h1>';
    content += '<table border="1" cellpadding="10">';
    content += '<thead><tr>';
    content += '<th>رقم الملف</th><th>الاسم</th><th>البريد</th><th>الهاتف</th><th>التأمين</th>';
    content += '</tr></thead>';
    content += '<tbody>';
    
    beneficiaries.forEach(b => {
      content += '<tr>';
      content += `<td>${b.fileNumber}</td>`;
      content += `<td>${b.firstName} ${b.lastName}</td>`;
      content += `<td>${b.email}</td>`;
      content += `<td>${b.phone}</td>`;
      content += `<td>${b.insuranceProvider}</td>`;
      content += '</tr>';
    });
    
    content += '</tbody></table>';
    downloadFile(content, 'المستفيدين.html', 'text/html');
    handleCloseMenu();
  };

  const downloadFile = (content, filename, type) => {
    const element = document.createElement('a');
    element.setAttribute('href', `data:${type};charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Box>
      <Tooltip title="تصدير البيانات">
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleOpenMenu}
          disabled={!beneficiaries || beneficiaries.length === 0}
        >
          تصدير
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={exportToExcel}>
          <ListItemIcon>
            <ExcelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>تصدير كـ CSV</ListItemText>
        </MenuItem>
        <MenuItem onClick={exportToJSON}>
          <ListItemIcon>
            <JsonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>تصدير كـ JSON</ListItemText>
        </MenuItem>
        <MenuItem onClick={exportToPDF}>
          <ListItemIcon>
            <PdfIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>تصدير كـ PDF</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default BeneficiariesExport;
