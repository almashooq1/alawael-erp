import { useState } from 'react';
import { triggerBlobDownload } from 'utils/downloadHelper';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from '@mui/material';
import {
  FileDownload,
  FileUpload,
  Description,
  TableChart,
  CheckCircle,
  Error,
  Info,
  Close,
} from '@mui/icons-material';
import { getToken } from 'utils/tokenStorage';

const ExportImportManager = () => {
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [importResults, setImportResults] = useState(null);

  // Export filters
  const [exportFilters, setExportFilters] = useState({
    status: '',
    disabilityType: '',
    dateFrom: '',
    dateTo: '',
  });

  // Upload file state
  const [selectedFile, setSelectedFile] = useState(null);

  // Handle export to Excel
  const handleExportExcel = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Build query string
      const params = new URLSearchParams();
      if (exportFilters.status) params.append('status', exportFilters.status);
      if (exportFilters.disabilityType)
        params.append('disabilityType', exportFilters.disabilityType);
      if (exportFilters.dateFrom) params.append('dateFrom', exportFilters.dateFrom);
      if (exportFilters.dateTo) params.append('dateTo', exportFilters.dateTo);

      const response = await fetch(`/api/export-import/export/excel?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('فشل في تصدير الملف');
      }

      // Download file
      const blob = await response.blob();
      triggerBlobDownload(
        blob,
        `rehabilitation-programs-${new Date().toISOString().split('T')[0]}.xlsx`
      );

      setMessage({
        type: 'success',
        text: '✅ تم تصدير البيانات بنجاح إلى Excel',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ خطأ في التصدير: ${'حدث خطأ، يرجى المحاولة لاحقاً'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle export program to PDF
  const _handleExportPDF = async programId => {
    try {
      setLoading(true);
      setMessage(null);

      const response = await fetch(`/api/export-import/export/pdf/${programId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('فشل في تصدير الملف');
      }

      // Download file
      const blob = await response.blob();
      triggerBlobDownload(
        blob,
        `program-${programId}-${new Date().toISOString().split('T')[0]}.pdf`
      );

      setMessage({
        type: 'success',
        text: '✅ تم تصدير البرنامج بنجاح إلى PDF',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ خطأ في التصدير: ${'حدث خطأ، يرجى المحاولة لاحقاً'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle download import template
  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const response = await fetch('/api/export-import/import/template', {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('فشل في تحميل النموذج');
      }

      // Download file
      const blob = await response.blob();
      triggerBlobDownload(blob, 'import-template.xlsx');

      setMessage({
        type: 'success',
        text: '✅ تم تحميل نموذج الاستيراد بنجاح',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ خطأ في التحميل: ${'حدث خطأ، يرجى المحاولة لاحقاً'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = event => {
    const file = event.target.files[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
        setMessage(null);
      } else {
        setMessage({
          type: 'error',
          text: '❌ يرجى اختيار ملف Excel (.xlsx أو .xls)',
        });
        setSelectedFile(null);
      }
    }
  };

  // Handle import from Excel
  const handleImportExcel = async () => {
    if (!selectedFile) {
      setMessage({
        type: 'error',
        text: '❌ يرجى اختيار ملف للاستيراد',
      });
      return;
    }

    try {
      setUploadLoading(true);
      setMessage(null);
      setImportResults(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/export-import/import/excel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'فشل في استيراد البيانات');
      }

      setImportResults(data);
      setMessage({
        type: 'success',
        text: `✅ تم استيراد ${data.successCount} برامج بنجاح`,
      });
      setSelectedFile(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ خطأ في الاستيراد: ${'حدث خطأ، يرجى المحاولة لاحقاً'}`,
      });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        📦 إدارة التصدير والاستيراد
      </Typography>

      {/* Message Alert */}
      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 3 }}
          action={
            <IconButton
              aria-label="إغلاق"
              color="inherit"
              size="small"
              onClick={() => setMessage(null)}
            >
              <Close fontSize="inherit" />
            </IconButton>
          }
        >
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Export Section */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FileDownload sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
                <Typography variant="h5">تصدير البيانات</Typography>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Export Filters */}
              <Typography variant="subtitle1" gutterBottom>
                فلترة البيانات (اختياري):
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={exportFilters.status}
                  label="الحالة"
                  onChange={e => setExportFilters({ ...exportFilters, status: e.target.value })}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="active">نشط</MenuItem>
                  <MenuItem value="completed">مكتمل</MenuItem>
                  <MenuItem value="on_hold">معلق</MenuItem>
                  <MenuItem value="cancelled">ملغي</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>نوع الإعاقة</InputLabel>
                <Select
                  value={exportFilters.disabilityType}
                  label="نوع الإعاقة"
                  onChange={e =>
                    setExportFilters({ ...exportFilters, disabilityType: e.target.value })
                  }
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="mobility">حركية</MenuItem>
                  <MenuItem value="visual">بصرية</MenuItem>
                  <MenuItem value="hearing">سمعية</MenuItem>
                  <MenuItem value="cognitive">ذهنية</MenuItem>
                  <MenuItem value="speech">نطقية</MenuItem>
                  <MenuItem value="multiple">متعددة</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                type="date"
                label="من تاريخ"
                value={exportFilters.dateFrom}
                onChange={e => setExportFilters({ ...exportFilters, dateFrom: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                type="date"
                label="إلى تاريخ"
                value={exportFilters.dateTo}
                onChange={e => setExportFilters({ ...exportFilters, dateTo: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 3 }}
              />

              {/* Export Buttons */}
              <Box display="flex" gap={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={<TableChart />}
                  onClick={handleExportExcel}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'تصدير إلى Excel'}
                </Button>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Alert severity="info" icon={<Info />}>
                <Typography variant="body2">
                  سيتم تصدير البيانات إلى ملف Excel يحتوي على 4 صفحات:
                  <List dense>
                    <ListItem>
                      <ListItemText primary="1. نظرة عامة على البرامج" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="2. تفاصيل الأهداف" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="3. ملخص الجلسات" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="4. الإحصائيات" />
                    </ListItem>
                  </List>
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Import Section */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FileUpload sx={{ fontSize: 40, color: '#2e7d32', mr: 2 }} />
                <Typography variant="h5">استيراد البيانات</Typography>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Step 1: Download Template */}
              <Typography variant="subtitle1" gutterBottom>
                الخطوة 1: تحميل النموذج
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={<Description />}
                onClick={handleDownloadTemplate}
                disabled={loading}
                sx={{ mb: 3 }}
              >
                {loading ? <CircularProgress size={24} /> : 'تحميل نموذج الاستيراد'}
              </Button>

              {/* Step 2: Upload File */}
              <Typography variant="subtitle1" gutterBottom>
                الخطوة 2: رفع الملف
              </Typography>
              <input
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                id="raised-button-file"
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="raised-button-file">
                <Button
                  fullWidth
                  variant="outlined"
                  component="span"
                  startIcon={<FileUpload />}
                  sx={{ mb: 2 }}
                >
                  اختيار ملف Excel
                </Button>
              </label>

              {selectedFile && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">الملف المحدد: {selectedFile.name}</Typography>
                </Alert>
              )}

              {/* Step 3: Import */}
              <Typography variant="subtitle1" gutterBottom>
                الخطوة 3: بدء الاستيراد
              </Typography>
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<FileUpload />}
                onClick={handleImportExcel}
                disabled={!selectedFile || uploadLoading}
                sx={{ mb: 3 }}
              >
                {uploadLoading ? <CircularProgress size={24} /> : 'استيراد البيانات'}
              </Button>

              {/* Import Results */}
              {importResults && (
                <Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    نتائج الاستيراد:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`تم استيراد ${importResults.successCount} برامج بنجاح`}
                      />
                    </ListItem>
                    {importResults.errors.length > 0 && (
                      <ListItem>
                        <ListItemIcon>
                          <Error color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${importResults.errors.length} أخطاء`}
                          secondary={importResults.errors.slice(0, 3).map((err, idx) => (
                            <Typography key={idx} variant="caption" display="block">
                              • سطر {err.row}: {err.error}
                            </Typography>
                          ))}
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              <Alert severity="warning">
                <Typography variant="body2">
                  ⚠️ ملاحظات هامة:
                  <List dense>
                    <ListItem>
                      <ListItemText primary="• استخدم النموذج المقدم لضمان التوافق" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="• تحقق من صحة البيانات قبل الاستيراد" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="• سيتم تجاهل الصفوف التي تحتوي على أخطاء" />
                    </ListItem>
                  </List>
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ExportImportManager;
