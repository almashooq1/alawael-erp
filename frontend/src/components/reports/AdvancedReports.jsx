/**
 * Advanced Reports — التقارير المتقدمة
 */

import { useState } from 'react';
import {
  Paper,
} from '@mui/material';

import logger from 'utils/logger';
import { statusColors } from '../../theme/palette';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FilterIcon from '@mui/icons-material/Filter';
import DateRangeIcon from '@mui/icons-material/DateRange';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import { ExcelIcon, PdfIcon } from 'utils/iconAliases';

const reportCategories = [
  { id: 'financial', label: 'التقارير المالية', count: 12, color: statusColors.primaryBlue },
  { id: 'hr', label: 'تقارير الموارد البشرية', count: 8, color: statusColors.successDark },
  { id: 'operational', label: 'التقارير التشغيلية', count: 15, color: statusColors.warningDark },
  { id: 'beneficiary', label: 'تقارير المستفيدين', count: 10, color: statusColors.purpleDark },
  { id: 'performance', label: 'تقارير الأداء', count: 6, color: statusColors.errorDeep },
];

const sampleReports = [
  { id: 1, name: 'تقرير الإيرادات الشهري', category: 'financial', date: '2026-03-01', status: 'ready' },
  { id: 2, name: 'تقرير الحضور الأسبوعي', category: 'hr', date: '2026-03-05', status: 'ready' },
  { id: 3, name: 'تقرير تقدم المستفيدين', category: 'beneficiary', date: '2026-03-08', status: 'generating' },
  { id: 4, name: 'تقرير المصروفات الربعي', category: 'financial', date: '2026-02-28', status: 'ready' },
  { id: 5, name: 'تقرير KPI الشهري', category: 'performance', date: '2026-03-01', status: 'ready' },
  { id: 6, name: 'تقرير الصيانة', category: 'operational', date: '2026-03-07', status: 'ready' },
];

const AdvancedReports = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filteredReports = sampleReports.filter(r => {
    if (selectedCategory && r.category !== selectedCategory) return false;
    if (searchQuery && !r.name.includes(searchQuery)) return false;
    return true;
  });

  const handleExport = (reportId, format) => {
    logger.info(`Exporting report ${reportId} as ${format}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            التقارير المتقدمة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إنشاء وتصدير التقارير التفصيلية
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<RefreshIcon />}>
          تحديث البيانات
        </Button>
      </Box>

      {/* Categories */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {reportCategories.map(cat => (
          <Grid item xs={12} sm={6} md={2.4} key={cat.id}>
            <Card
              sx={{
                cursor: 'pointer',
                border: selectedCategory === cat.id ? 2 : 0,
                borderColor: cat.color,
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
              }}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            >
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: cat.color }}>
                  {cat.count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {cat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search & Filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="بحث في التقارير..."
          size="small"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button variant="outlined" startIcon={<FilterIcon />}>
          فلترة
        </Button>
        <Button variant="outlined" startIcon={<DateRangeIcon />}>
          نطاق التاريخ
        </Button>
      </Box>

      {/* Reports Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 600 }}>اسم التقرير</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>التصنيف</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>التاريخ</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReports.map(report => (
              <TableRow key={report.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssessmentIcon color="primary" fontSize="small" />
                    {report.name}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={reportCategories.find(c => c.id === report.category)?.label}
                    size="small"
                    sx={{
                      backgroundColor: reportCategories.find(c => c.id === report.category)?.color + '20',
                      color: reportCategories.find(c => c.id === report.category)?.color,
                    }}
                  />
                </TableCell>
                <TableCell>{report.date}</TableCell>
                <TableCell>
                  {report.status === 'ready' ? (
                    <Chip label="جاهز" color="success" size="small" />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress sx={{ flex: 1, maxWidth: 80 }} />
                      <Typography variant="caption">جاري الإنشاء</Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="تصدير PDF">
                    <IconButton size="small" onClick={() => handleExport(report.id, 'pdf')}>
                      <PdfIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تصدير Excel">
                    <IconButton size="small" onClick={() => handleExport(report.id, 'excel')}>
                      <ExcelIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تنزيل">
                    <IconButton size="small" onClick={() => handleExport(report.id, 'download')}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdvancedReports;
