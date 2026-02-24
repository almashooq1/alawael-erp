// قائمة التقارير - Reports List

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  FormControl,
  Select,
  InputLabel
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  GetApp,
  Share,
  FilterList
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const ReportsList = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    loadReports();
  }, [page, search, filterType, filterStatus]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports', {
        params: {
          page: page + 1,
          per_page: 20,
          search: search,
          type: filterType,
          status: filterStatus
        }
      });

      if (response.data.success) {
        setReports(response.data.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading reports:', error);
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, report) => {
    setAnchorEl(event.currentTarget);
    setSelectedReport(report);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReport(null);
  };

  const handleView = () => {
    navigate(`/reports/${selectedReport.id}`);
    handleMenuClose();
  };

  const handleEdit = () => {
    navigate(`/reports/${selectedReport.id}/edit`);
    handleMenuClose();
  };

  const handleDownload = async () => {
    try {
      await api.get(`/reports/${selectedReport.id}/download`);
      // Handle PDF download
    } catch (error) {
      console.error('Error downloading report:', error);
    }
    handleMenuClose();
  };

  const handleShare = () => {
    navigate(`/reports/${selectedReport.id}/share`);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (window.confirm('هل أنت متأكد من حذف هذا التقرير؟')) {
      try {
        await api.delete(`/reports/${selectedReport.id}`);
        loadReports();
      } catch (error) {
        console.error('Error deleting report:', error);
      }
    }
    handleMenuClose();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'default';
      case 'pending_review':
        return 'warning';
      case 'approved':
        return 'info';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      'individual': 'تقرير فردي',
      'progress': 'تقرير تقدم',
      'group': 'تقرير جماعي',
      'institutional': 'تقرير مؤسسي',
      'program': 'تقرير برنامج',
      'statistical': 'تقرير إحصائي',
      'family': 'تقرير أسري',
      'insurance': 'تقرير تأميني',
      'qol': 'تقرير جودة الحياة',
      'abas': 'تقرير ABAS',
      'integration': 'تقرير دمج',
      'recommendations': 'تقرير توصيات'
    };
    return types[type] || type;
  };

  const ReportCard = ({ report }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {report.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              {report.report_number}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => handleMenuOpen(e, report)}
          >
            <MoreVert />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary" mb={2} noWrap>
          {report.description}
        </Typography>

        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          <Chip
            label={getTypeLabel(report.report_type)}
            size="small"
            variant="outlined"
          />
          <Chip
            label={report.status}
            size="small"
            color={getStatusColor(report.status)}
          />
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {report.beneficiary?.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {report.created_at}
          </Typography>
        </Box>

        <Box display="flex" gap={1} mt={2}>
          <Button
            size="small"
            variant="outlined"
            fullWidth
            onClick={() => navigate(`/reports/${report.id}`)}
          >
            عرض
          </Button>
          <Button
            size="small"
            variant="contained"
            fullWidth
            onClick={() => navigate(`/reports/${report.id}/edit`)}
          >
            تعديل
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          التقارير
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/reports/new')}
        >
          إنشاء تقرير
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="البحث عن تقرير..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>نوع التقرير</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="نوع التقرير"
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="individual">تقرير فردي</MenuItem>
                  <MenuItem value="progress">تقرير تقدم</MenuItem>
                  <MenuItem value="group">تقرير جماعي</MenuItem>
                  <MenuItem value="institutional">تقرير مؤسسي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="الحالة"
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="draft">مسودة</MenuItem>
                  <MenuItem value="pending_review">قيد المراجعة</MenuItem>
                  <MenuItem value="approved">معتمد</MenuItem>
                  <MenuItem value="published">منشور</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <Grid container spacing={3}>
        {reports.map((report) => (
          <Grid item xs={12} sm={6} md={4} key={report.id}>
            <ReportCard report={report} />
          </Grid>
        ))}
      </Grid>

      {reports.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary">
            لا توجد تقارير
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/reports/new')}
            sx={{ mt: 2 }}
          >
            إنشاء تقرير جديد
          </Button>
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          عرض التفاصيل
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          تعديل
        </MenuItem>
        <MenuItem onClick={handleDownload}>
          <GetApp fontSize="small" sx={{ mr: 1 }} />
          تحميل PDF
        </MenuItem>
        <MenuItem onClick={handleShare}>
          <Share fontSize="small" sx={{ mr: 1 }} />
          مشاركة
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          حذف
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ReportsList;
