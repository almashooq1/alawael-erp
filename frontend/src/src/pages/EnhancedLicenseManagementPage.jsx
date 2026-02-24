/**
 * Enhanced License Management Page - Saudi Arabia Edition 🇸🇦
 * صفحة إدارة الرخص والتصاريح المحسّنة - النسخة السعودية
 * 
 * Features:
 * ✅ Complete license management system
 * ✅ Advanced analytics dashboard
 * ✅ Smart alerts and notifications
 * ✅ Government integration portal
 * ✅ Saudi-specific features
 * ✅ Multi-channel notifications
 * ✅ Automatic renewal reminders
 * ✅ Cost calculations with late fees
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stack,
  Tabs,
  Tab,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Badge,
  Fab,
  Zoom,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  GetApp as GetAppIcon,
  Notifications as NotificationsIcon,
  Language as LanguageIcon,
  Assessment as AssessmentIcon,
  ListAlt as ListAltIcon,
} from '@mui/icons-material';
import LicenseManagementSystem from '../../components/licenses/LicenseManagementSystem';
import LicenseAnalyticsDashboard from '../../components/licenses/LicenseAnalyticsDashboard';
import LicenseAlertsSystem from '../../components/licenses/LicenseAlertsSystem';
import SaudiGovernmentIntegration from '../../components/licenses/SaudiGovernmentIntegration';
import licenseService from '../../services/licenseService';
import { getAllLicenseTypes } from '../../config/saudiLicenseTypes';

const EnhancedLicenseManagementPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // New License Form
  const [newLicense, setNewLicense] = useState({
    license_number: '',
    license_type: '',
    entity_name: '',
    entity_type: '',
    issuing_authority: '',
    issue_date: '',
    expiry_date: '',
    cost: '',
    notes: '',
  });

  // Load licenses on mount
  useEffect(() => {
    loadLicenses();
    loadAlerts();
  }, []);

  const loadLicenses = async () => {
    try {
      setLoading(true);
      const data = await licenseService.getAllLicenses();
      setLicenses(data);
    } catch (err) {
      setError('خطأ في تحميل الرخص: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const alertsData = await licenseService.getExpiringLicensesAlerts(60);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  };

  const handleAddLicense = async () => {
    try {
      setLoading(true);
      await licenseService.createLicense(newLicense);
      setSuccess('✅ تمت إضافة الرخصة بنجاح');
      setAddDialogOpen(false);
      setNewLicense({
        license_number: '',
        license_type: '',
        entity_name: '',
        entity_type: '',
        issuing_authority: '',
        issue_date: '',
        expiry_date: '',
        cost: '',
        notes: '',
      });
      loadLicenses();
      loadAlerts();
    } catch (err) {
      setError('خطأ في إضافة الرخصة: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const selectedIds = licenses.map(l => l.id || l._id);
      await licenseService.exportLicenses(selectedIds, 'excel');
      setSuccess('✅ تم التصدير بنجاح');
    } catch (err) {
      setError('خطأ في التصدير: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const report = await licenseService.generateSaudiReport();
      console.log('Saudi Report:', report);
      setSuccess('✅ تم إنشاء التقرير بنجاح');
    } catch (err) {
      setError('خطأ في إنشاء التقرير: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const criticalAlertsCount = alerts.filter(a => a.severity === 'error').length;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 2,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              🇸🇦 نظام إدارة الرخص والتصاريح
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              النظام الشامل لإدارة جميع الرخص والتصاريح السعودية
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="تحديث">
              <Button
                variant="contained"
                onClick={loadLicenses}
                startIcon={<RefreshIcon />}
                disabled={loading}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                تحديث
              </Button>
            </Tooltip>
            <Tooltip title="إضافة رخصة جديدة">
              <Button
                variant="contained"
                onClick={() => setAddDialogOpen(true)}
                startIcon={<AddIcon />}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                إضافة رخصة
              </Button>
            </Tooltip>
            <Tooltip title="تصدير Excel">
              <Button
                variant="contained"
                onClick={handleExport}
                startIcon={<GetAppIcon />}
                disabled={loading || licenses.length === 0}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                تصدير
              </Button>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Quick Stats */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.15)' }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {licenses.length}
              </Typography>
              <Typography variant="caption">إجمالي الرخص</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(244,67,54,0.3)' }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {criticalAlertsCount}
              </Typography>
              <Typography variant="caption">🚨 تنبيهات حرجة</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.15)' }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {getAllLicenseTypes().length}
              </Typography>
              <Typography variant="caption">أنواع الرخص</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(76,175,80,0.3)' }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                ✅
              </Typography>
              <Typography variant="caption">نظام متكامل</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Tabs Navigation */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: '1rem',
            },
          }}
        >
          <Tab
            icon={<ListAltIcon />}
            label="قائمة الرخص"
            iconPosition="start"
            sx={{ fontWeight: activeTab === 0 ? 700 : 400 }}
          />
          <Tab
            icon={<AssessmentIcon />}
            label="التحليلات والتقارير"
            iconPosition="start"
            sx={{ fontWeight: activeTab === 1 ? 700 : 400 }}
          />
          <Tab
            icon={
              <Badge badgeContent={criticalAlertsCount} color="error">
                <NotificationsIcon />
              </Badge>
            }
            label="التنبيهات الذكية"
            iconPosition="start"
            sx={{ fontWeight: activeTab === 2 ? 700 : 400 }}
          />
          <Tab
            icon={<LanguageIcon />}
            label="بوابة الخدمات الحكومية"
            iconPosition="start"
            sx={{ fontWeight: activeTab === 3 ? 700 : 400 }}
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && (
          <LicenseManagementSystem
            licenses={licenses}
            onRefresh={() => {
              loadLicenses();
              loadAlerts();
            }}
          />
        )}

        {activeTab === 1 && (
          <LicenseAnalyticsDashboard
            licenses={licenses}
            onRefresh={() => {
              loadLicenses();
              loadAlerts();
            }}
            onGenerateReport={handleGenerateReport}
          />
        )}

        {activeTab === 2 && (
          <LicenseAlertsSystem
            licenses={licenses}
            onRefresh={() => {
              loadLicenses();
              loadAlerts();
            }}
          />
        )}

        {activeTab === 3 && <SaudiGovernmentIntegration />}
      </Box>

      {/* Add License Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <AddIcon />
          إضافة رخصة جديدة
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="رقم الرخصة *"
                value={newLicense.license_number}
                onChange={e => setNewLicense({ ...newLicense, license_number: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="نوع الرخصة *"
                value={newLicense.license_type}
                onChange={e => setNewLicense({ ...newLicense, license_type: e.target.value })}
                fullWidth
                required
              >
                {getAllLicenseTypes().map(type => (
                  <MenuItem key={type.id} value={type.name}>
                    {type.icon} {type.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="اسم الكيان *"
                value={newLicense.entity_name}
                onChange={e => setNewLicense({ ...newLicense, entity_name: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="نوع الكيان *"
                value={newLicense.entity_type}
                onChange={e => setNewLicense({ ...newLicense, entity_type: e.target.value })}
                fullWidth
                required
              >
                {licenseService.getEntityTypes().map(type => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="الجهة المصدرة *"
                value={newLicense.issuing_authority}
                onChange={e => setNewLicense({ ...newLicense, issuing_authority: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="تاريخ الإصدار"
                type="date"
                value={newLicense.issue_date}
                onChange={e => setNewLicense({ ...newLicense, issue_date: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="تاريخ الانتهاء *"
                type="date"
                value={newLicense.expiry_date}
                onChange={e => setNewLicense({ ...newLicense, expiry_date: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="التكلفة (ريال)"
                type="number"
                value={newLicense.cost}
                onChange={e => setNewLicense({ ...newLicense, cost: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="ملاحظات"
                value={newLicense.notes}
                onChange={e => setNewLicense({ ...newLicense, notes: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setAddDialogOpen(false)} variant="outlined">
            إلغاء
          </Button>
          <Button
            onClick={handleAddLicense}
            variant="contained"
            disabled={
              !newLicense.license_number ||
              !newLicense.license_type ||
              !newLicense.entity_name ||
              !newLicense.expiry_date ||
              loading
            }
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button - Alerts */}
      {criticalAlertsCount > 0 && (
        <Zoom in={true}>
          <Fab
            color="error"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' },
              },
            }}
            onClick={() => setActiveTab(2)}
          >
            <Badge badgeContent={criticalAlertsCount} color="warning">
              <NotificationsIcon />
            </Badge>
          </Fab>
        </Zoom>
      )}
    </Container>
  );
};

export default EnhancedLicenseManagementPage;
