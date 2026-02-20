/**
 * Report Generator Component
 * مكون توليد التقارير
 * 
 * Features:
 * - Select report template
 * - Apply filters
 * - Export multiple formats
 * - View report history
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Code as JsonIcon,
  Description as CsvIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  PlayArrow as GenerateIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

const FORMAT_ICONS = {
  pdf: <PdfIcon />,
  excel: <ExcelIcon />,
  csv: <CsvIcon />,
  json: <JsonIcon />
};

const FORMAT_LABELS = {
  pdf: 'PDF',
  excel: 'Excel',
  csv: 'CSV',
  json: 'JSON'
};

const CATEGORY_LABELS = {
  financial: 'مالي',
  operational: 'تشغيلي',
  academic: 'أكاديمي',
  hr: 'موارد بشرية',
  student: 'طلاب',
  custom: 'مخصص'
};

function ReportGenerator() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [filters, setFilters] = useState({});
  const [format, setFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  // Load templates and reports
  useEffect(() => {
    loadTemplates();
    loadReports();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/analytics/report-templates');
      setTemplates(response.data.data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('خطأ في تحميل قوالب التقارير');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const response = await axios.get('/api/analytics/reports');
      setGeneratedReports(response.data.data || []);
    } catch (err) {
      console.error('Error loading reports:', err);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate) {
      setError('الرجاء اختيار قالب تقرير');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const response = await axios.post('/api/analytics/reports/generate', {
        templateId: selectedTemplate._id,
        filters: filters,
        format: format
      });

      // Reload reports
      await loadReports();

      // Reset form
      setSelectedTemplate(null);
      setFilters({});
      setFormat('pdf');

      alert('تم توليد التقرير بنجاح');
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.error || 'خطأ في توليد التقرير');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId) => {
    try {
      window.open(`/api/analytics/reports/${reportId}/download`, '_blank');
    } catch (err) {
      console.error('Error downloading report:', err);
      alert('خطأ في تحميل التقرير');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التقرير؟')) {
      return;
    }

    try {
      await axios.delete(`/api/analytics/reports/${reportId}`);
      await loadReports();
    } catch (err) {
      console.error('Error deleting report:', err);
      alert('خطأ في حذف التقرير');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            مولد التقارير
          </Typography>
          
          <Button
            variant="outlined"
            onClick={() => setShowHistoryDialog(true)}
            startIcon={<ViewIcon />}
          >
            سجل التقارير ({generatedReports.length})
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Report Template Selection */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                اختر قالب التقرير
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {templates.map((template) => (
                  <Grid item xs={12} sm={6} md={4} key={template._id}>
                    <TemplateCard
                      template={template}
                      selected={selectedTemplate?._id === template._id}
                      onSelect={() => setSelectedTemplate(template)}
                    />
                  </Grid>
                ))}
                
                {templates.length === 0 && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      لا توجد قوالب تقارير متاحة
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>

          {/* Configuration Panel */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
              <Typography variant="h6" gutterBottom>
                إعدادات التقرير
              </Typography>

              {selectedTemplate ? (
                <>
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      القالب المختار
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTemplate.nameAr}
                    </Typography>
                    <Chip 
                      label={CATEGORY_LABELS[selectedTemplate.category]} 
                      size="small" 
                      sx={{ mt: 1 }} 
                    />
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {/* Filters */}
                  {selectedTemplate.filters && selectedTemplate.filters.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<FilterIcon />}
                        onClick={() => setShowFilterDialog(true)}
                      >
                        تطبيق الفلاتر
                      </Button>
                      {Object.keys(filters).length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          {Object.keys(filters).length} فلتر مطبق
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Format Selection */}
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>صيغة التقرير</InputLabel>
                    <Select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      label="صيغة التقرير"
                    >
                      <MenuItem value="pdf">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PdfIcon fontSize="small" />
                          PDF
                        </Box>
                      </MenuItem>
                      <MenuItem value="excel">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ExcelIcon fontSize="small" />
                          Excel
                        </Box>
                      </MenuItem>
                      <MenuItem value="csv">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CsvIcon fontSize="small" />
                          CSV
                        </Box>
                      </MenuItem>
                      <MenuItem value="json">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <JsonIcon fontSize="small" />
                          JSON
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  {/* Generate Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleGenerateReport}
                    disabled={generating}
                    startIcon={generating ? <CircularProgress size={20} /> : <GenerateIcon />}
                  >
                    {generating ? 'جاري التوليد...' : 'توليد التقرير'}
                  </Button>

                  {generating && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                        يرجى الانتظار...
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  الرجاء اختيار قالب تقرير أولاً
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Filters Dialog */}
        {selectedTemplate && (
          <FilterDialog
            open={showFilterDialog}
            onClose={() => setShowFilterDialog(false)}
            template={selectedTemplate}
            filters={filters}
            onApply={(newFilters) => {
              setFilters(newFilters);
              setShowFilterDialog(false);
            }}
          />
        )}

        {/* History Dialog */}
        <HistoryDialog
          open={showHistoryDialog}
          onClose={() => setShowHistoryDialog(false)}
          reports={generatedReports}
          onDownload={handleDownloadReport}
          onDelete={handleDeleteReport}
        />
      </Container>
    </LocalizationProvider>
  );
}

/**
 * Template Card Component
 */
function TemplateCard({ template, selected, onSelect }) {
  return (
    <Card 
      sx={{ 
        height: '100%',
        cursor: 'pointer',
        border: selected ? 2 : 1,
        borderColor: selected ? 'primary.main' : 'divider',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 2
        }
      }}
      onClick={onSelect}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom noWrap>
          {template.nameAr}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
          {template.description || template.descriptionAr || 'لا يوجد وصف'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={CATEGORY_LABELS[template.category]} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
          {template.structure.kpis && template.structure.kpis.length > 0 && (
            <Chip 
              label={`${template.structure.kpis.length} مؤشر`} 
              size="small" 
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Filter Dialog Component
 */
function FilterDialog({ open, onClose, template, filters, onApply }) {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleFilterChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>تطبيق الفلاتر</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {template.filters && template.filters.map((filter) => (
            <Box key={filter.field} sx={{ mb: 3 }}>
              {filter.type === 'date' && (
                <DatePicker
                  label={filter.labelAr || filter.label}
                  value={localFilters[filter.field] || null}
                  onChange={(date) => handleFilterChange(filter.field, date)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              )}
              
              {filter.type === 'select' && (
                <FormControl fullWidth>
                  <InputLabel>{filter.labelAr || filter.label}</InputLabel>
                  <Select
                    value={localFilters[filter.field] || ''}
                    onChange={(e) => handleFilterChange(filter.field, e.target.value)}
                    label={filter.labelAr || filter.label}
                  >
                    {filter.options && filter.options.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.labelAr || option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              {filter.type === 'text' && (
                <TextField
                  fullWidth
                  label={filter.labelAr || filter.label}
                  value={localFilters[filter.field] || ''}
                  onChange={(e) => handleFilterChange(filter.field, e.target.value)}
                />
              )}
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button onClick={handleApply} variant="contained">
          تطبيق
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * History Dialog Component
 */
function HistoryDialog({ open, onClose, reports, onDownload, onDelete }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>سجل التقارير</DialogTitle>
      <DialogContent>
        <List>
          {reports.map((report) => (
            <React.Fragment key={report._id}>
              <ListItem>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {FORMAT_ICONS[report.file.format]}
                      <Typography>
                        {report.titleAr || report.title}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" display="block">
                        تاريخ الإنشاء: {new Date(report.generatedAt).toLocaleString('ar-SA')}
                      </Typography>
                      <Typography variant="caption" display="block">
                        الحجم: {(report.file.size / 1024).toFixed(2)} KB
                      </Typography>
                      {report.status === 'completed' && (
                        <Chip 
                          label="مكتمل" 
                          size="small" 
                          color="success" 
                          sx={{ mt: 1 }} 
                        />
                      )}
                      {report.status === 'generating' && (
                        <Chip 
                          label="جاري التوليد..." 
                          size="small" 
                          color="info" 
                          sx={{ mt: 1 }} 
                        />
                      )}
                      {report.status === 'failed' && (
                        <Chip 
                          label="فشل" 
                          size="small" 
                          color="error" 
                          sx={{ mt: 1 }} 
                        />
                      )}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  {report.status === 'completed' && (
                    <>
                      <IconButton 
                        edge="end" 
                        onClick={() => onDownload(report._id)}
                        sx={{ mr: 1 }}
                      >
                        <DownloadIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        onClick={() => onDelete(report._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
          
          {reports.length === 0 && (
            <ListItem>
              <ListItemText primary="لا توجد تقارير" />
            </ListItem>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ReportGenerator;
