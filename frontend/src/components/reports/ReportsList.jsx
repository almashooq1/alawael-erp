import React, { useEffect } from 'react';
import exportService, { setBrandingForExport } from '../../../frontend/src/utils/exportService';
import { useOrgBranding } from '../../../frontend/src/components/OrgBrandingContext';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { fetchReports, deleteReport } from '../../store/slices/reportsSlice';

const ReportsList = () => {
  const { branding } = useOrgBranding();
  const dispatch = useDispatch();
  const { reports, loading, error } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchReports());
  }, [dispatch]);

  const handleDelete = (reportId) => {
    if (window.confirm('هل تريد حذف هذا التقرير؟')) {
      dispatch(deleteReport(reportId));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  // دالة تصدير وهمية (تجريبية)
  const handleExport = (report) => {
    // مثال: تصدير بيانات التقرير الحالي (يمكن تخصيصها حسب نوع التقرير)
    const data = [
      { عنوان: report.title, النوع: report.type, التاريخ: new Date(report.createdAt).toLocaleDateString('ar-SA'), الحالة: report.status },
    ];
    setBrandingForExport(branding);
    exportService.exportToPDF(data, `تقرير_${report.title}`, { branding });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        التقارير
      </Typography>

      {error && <Typography color="error">{error}</Typography>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>عنوان التقرير</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell>{report.title}</TableCell>
                <TableCell>{report.type}</TableCell>
                <TableCell>
                  {new Date(report.createdAt).toLocaleDateString('ar-SA')}
                </TableCell>
                <TableCell>
                  <Chip
                    label={report.status}
                    color={report.status === 'completed' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    sx={{ mr: 1 }}
                  >
                    عرض
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    sx={{ mr: 1 }}
                    onClick={() => handleExport(report)}
                  >
                    تحميل
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(report.id)}
                  >
                    حذف
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ReportsList;
