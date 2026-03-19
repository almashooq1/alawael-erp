/**
 * License Management Page
 * صفحة إدارة الرخص والتصاريح المهنية الشاملة
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Tabs,
  Tab,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  FileUpload as FileUploadIcon,
  Assessment as AssessmentIcon,
  ListAlt as ListAltIcon,
} from '@mui/icons-material';
import LicenseManagementSystem from '../components/licenses/LicenseManagementSystem';
import LicenseAnalyticsDashboard from '../components/licenses/LicenseAnalyticsDashboard';
import licenseService from '../services/licenseService';

const LicenseManagementPage = () => {
  // ==================== State ====================
  const [activeTab, setActiveTab] = useState(0);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [newLicense, setNewLicense] = useState({
    license_number: '',
    license_type: '',
    entity_name: '',
    entity_type: 'individual',
    issuing_authority: '',
    issue_date: '',
    expiry_date: '',
    cost: '',
    notes: '',
  });

  const licenseTypes = licenseService.getLicenseTypes();
  const entityTypes = licenseService.getEntityTypes();

  // ==================== Load Data ====================
  const loadLicenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await licenseService.getAllLicenses();
      setLicenses(data);
    } catch (err) {
      setError('خطأ في تحميل البيانات');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, []);

  // ==================== Add License ====================
  const handleAddLicense = async () => {
    try {
      if (!newLicense.license_number || !newLicense.license_type || !newLicense.expiry_date) {
        setError('الرجاء ملء جميع الحقول المطلوبة');
        return;
      }

      setLoading(true);
      await licenseService.createLicense(newLicense);
      
      setSuccess('✅ تم إضافة الرخصة بنجاح');
      setAddDialogOpen(false);
      setNewLicense({
        license_number: '',
        license_type: '',
        entity_name: '',
        entity_type: 'individual',
        issuing_authority: '',
        issue_date: '',
        expiry_date: '',
        cost: '',
        notes: '',
      });
      
      await loadLicenses();
    } catch (err) {
      setError('❌ خطأ في إضافة الرخصة: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (selectedLicenses, format) => {
    try {
      await licenseService.exportLicenses(
        selectedLicenses.map((l) => l.id),
        format
      );
      setSuccess('✅ تم تصدير البيانات بنجاح');
    } catch (err) {
      setError('❌ خطأ في التصدير: ' + err.message);
    }
  };

  // ==================== Render ====================
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
          }}
        >
          🏛️ نظام إدارة الرخص والتصاريح المهنية
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          إدارة شاملة لجميع الرخص والتصاريح المهنية للمنشأة مع تتبع التجديدات والانتهاء
        </Typography>

        {/* Action Buttons */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            إضافة رخصة جديدة
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            color="primary"
          >
            استيراد من ملف
          </Button>
        </Stack>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess(null)}
          sx={{ mb: 3 }}
        >
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Card sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            backgroundColor: '#f5f5f5',
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '1rem',
              padding: '16px 24px',
            },
          }}
        >
          <Tab label="📋 قائمة الرخص" icon={<ListAltIcon />} iconPosition="start" />
          <Tab label="📊 التحليلات والتقارير" icon={<AssessmentIcon />} iconPosition="start" />
        </Tabs>
      </Card>

      {/* Content */}
      <Box sx={{ position: 'relative', minHeight: '500px' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && activeTab === 0 && (
          <LicenseManagementSystem
            licenses={licenses}
            onRefresh={loadLicenses}
            onExport={handleExport}
          />
        )}

        {!loading && activeTab === 1 && (
          <LicenseAnalyticsDashboard
            licenses={licenses}
            onRefresh={loadLicenses}
          />
        )}
      </Box>

      {/* Add License Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 700,
            fontSize: '1.2rem',
          }}
        >
          ➕ إضافة رخصة جديدة
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Stack spacing={3}>
            {/* License Number */}
            <TextField
              label="رقم الرخصة"
              value={newLicense.license_number}
              onChange={(e) => setNewLicense({ ...newLicense, license_number: e.target.value })}
              fullWidth
              required
              placeholder="مثال: COM-2024-001"
              helperText="رقم فريد للرخصة"
            />

            {/* License Type */}
            <FormControl fullWidth required>
              <InputLabel>نوع الرخصة</InputLabel>
              <Select
                value={newLicense.license_type}
                onChange={(e) => setNewLicense({ ...newLicense, license_type: e.target.value })}
                label="نوع الرخصة"
              >
                {licenseTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Entity Name */}
            <TextField
              label="اسم الكيان"
              value={newLicense.entity_name}
              onChange={(e) => setNewLicense({ ...newLicense, entity_name: e.target.value })}
              fullWidth
              required
              placeholder="اسم الموظف / المركبة / الشركة"
            />

            {/* Entity Type */}
            <FormControl fullWidth required>
              <InputLabel>نوع الكيان</InputLabel>
              <Select
                value={newLicense.entity_type}
                onChange={(e) => setNewLicense({ ...newLicense, entity_type: e.target.value })}
                label="نوع الكيان"
              >
                {entityTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Issuing Authority */}
            <TextField
              label="الجهة المصدرة"
              value={newLicense.issuing_authority}
              onChange={(e) => setNewLicense({ ...newLicense, issuing_authority: e.target.value })}
              fullWidth
              placeholder="مثال: وزارة التجارة، البلدية"
            />

            {/* Issue Date */}
            <TextField
              label="تاريخ الإصدار"
              type="date"
              value={newLicense.issue_date}
              onChange={(e) => setNewLicense({ ...newLicense, issue_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            {/* Expiry Date */}
            <TextField
              label="تاريخ الانتهاء"
              type="date"
              value={newLicense.expiry_date}
              onChange={(e) => setNewLicense({ ...newLicense, expiry_date: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              helperText="التاريخ الذي تنتهي فيه صلاحية الرخصة"
            />

            {/* Cost */}
            <TextField
              label="تكلفة الرخصة"
              type="number"
              value={newLicense.cost}
              onChange={(e) => setNewLicense({ ...newLicense, cost: e.target.value })}
              fullWidth
              InputProps={{ endAdornment: <InputAdornment position="end">ريال</InputAdornment> }}
            />

            {/* Notes */}
            <TextField
              label="ملاحظات إضافية"
              value={newLicense.notes}
              onChange={(e) => setNewLicense({ ...newLicense, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="أي معلومات إضافية عن الرخصة"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={() => setAddDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleAddLicense}
            variant="contained"
            disabled={loading}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'إضافة الرخصة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LicenseManagementPage;
