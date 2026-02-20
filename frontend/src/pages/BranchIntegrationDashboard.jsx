/**
 * Admin Dashboard Page
 * Main dashboard for managing branch-ERP integration
 * Displays KPIs, inventory, reports, forecasts, and sync management
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Button,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Settings,
  Refresh,
  Close,
  Download,
  Share,
  Search,
} from '@mui/icons-material';

import branchIntegrationService from '../services/branchIntegrationService';
import BranchCard from '../components/dashboard/BranchCard';
import KPIMetrics from '../components/dashboard/KPIMetrics';
import InventoryTable from '../components/dashboard/InventoryTable';
import ReportsViewer from '../components/dashboard/ReportsViewer';
import ForecastChart from '../components/dashboard/ForecastChart';
import SyncManager from '../components/dashboard/SyncManager';

const AdminDashboard = () => {
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchData, setBranchData] = useState({});
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [openBranchDialog, setOpenBranchDialog] = useState(false);
  const [serviceHealth, setServiceHealth] = useState(null);

  // Fetch initial data
  useEffect(() => {
    initializeDashboard();
    const interval = setInterval(() => {
      checkServiceHealth();
      if (syncStatus?.enabled) {
        fetchSyncStatus();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Check service health
  const checkServiceHealth = async () => {
    try {
      const health = await branchIntegrationService.checkHealth();
      setServiceHealth(health);
    } catch (err) {
      console.error('Health check failed:', err);
      setServiceHealth({ success: false });
    }
  };

  // Initialize dashboard
  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check health first
      await checkServiceHealth();

      // Fetch sync status
      const syncData = await branchIntegrationService.getSyncStatus();
      setSyncStatus(syncData?.syncStatus || {});

      // Fetch initial branch list (simulated with sample data)
      const mockBranches = [
        { id: 'BR001', name: 'فرع الرياض', location: 'مركز المملكة', status: 'ACTIVE' },
        { id: 'BR002', name: 'فرع جدة', location: 'المنطقة الغربية', status: 'ACTIVE' },
        { id: 'BR003', name: 'فرع الدمّام', location: 'المنطقة الشرقية', status: 'ACTIVE' },
      ];

      setBranches(mockBranches);
      setSelectedBranch(mockBranches[0]?.id);

      // Fetch data for first branch
      if (mockBranches.length > 0) {
        await fetchBranchData(mockBranches[0].id);
      }
    } catch (err) {
      console.error('Dashboard initialization failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data for a specific branch
  const fetchBranchData = async (branchId) => {
    try {
      setLoading(true);

      // Fetch dashboard data (aggregated)
      const dashboard = await branchIntegrationService.getBranchDashboard(branchId);

      // Fetch individual sections for detailed views
      const [kpis, inventory, forecasts] = await Promise.all([
        branchIntegrationService.getBranchKPIs(branchId),
        branchIntegrationService.getBranchInventory(branchId),
        branchIntegrationService.getBranchForecasts(branchId),
      ]);

      // Fetch all report types
      const reports = await branchIntegrationService.getAllBranchReports(branchId);

      setBranchData({
        [branchId]: {
          dashboard,
          kpis,
          inventory,
          forecasts,
          reports,
        },
      });
    } catch (err) {
      console.error(`Failed to fetch data for branch ${branchId}:`, err);
      setError(`فشل في تحميل البيانات: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      const status = await branchIntegrationService.getSyncStatus();
      setSyncStatus(status?.syncStatus || {});
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    }
  };

  // Handle branch selection
  const handleBranchSelect = async (branchId) => {
    setSelectedBranch(branchId);
    setActiveTab(0);
    await fetchBranchData(branchId);
  };

  // Handle manual sync
  const handleManualSync = async () => {
    try {
      setLoading(true);
      await branchIntegrationService.syncBranches();
      await initializeDashboard();
    } catch (err) {
      setError(`خطأ في المزامنة: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle start sync
  const handleStartSync = async () => {
    try {
      await branchIntegrationService.startContinuousSync();
      await fetchSyncStatus();
    } catch (err) {
      setError(`خطأ في بدء المزامنة: ${err.message}`);
    }
  };

  // Handle stop sync
  const handleStopSync = async () => {
    try {
      await branchIntegrationService.stopContinuousSync();
      await fetchSyncStatus();
    } catch (err) {
      setError(`خطأ في إيقاف المزامنة: ${err.message}`);
    }
  };

  // Get current branch data
  const currentData = selectedBranch ? branchData[selectedBranch] : null;
  const currentBranch = branches.find((b) => b.id === selectedBranch);

  // Filter branches
  const filteredBranches = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(filterText.toLowerCase()) ||
      b.id.toLowerCase().includes(filterText.toLowerCase())
  );

  // TabPanel component
  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} role="tabpanel">
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              لوحة تحكم التكامل بين الفروع والنظام الموحد
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              إدارة مزامنة البيانات والمؤشرات الرئيسية
            </Typography>
          </Box>

          {/* Service Health Indicator */}
          <Chip
            label={serviceHealth?.success ? 'الخدمة نشطة' : 'الخدمة معطلة'}
            color={serviceHealth?.success ? 'success' : 'error'}
            variant="outlined"
            sx={{ mr: 2 }}
          />

          <Button
            color="inherit"
            startIcon={<Refresh />}
            onClick={initializeDashboard}
            disabled={loading}
          >
            تحديث
          </Button>

          <Button color="inherit" startIcon={<Settings />} sx={{ ml: 1 }}>
            الإعدادات
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ flex: 1, py: 3 }}>
        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {/* Branch Selector */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="ابحث عن فرع"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, opacity: 0.5 }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>اختر الفرع</InputLabel>
                <Select
                  value={selectedBranch || ''}
                  onChange={(e) => handleBranchSelect(e.target.value)}
                  label="اختر الفرع"
                >
                  {filteredBranches.map((branch) => (
                    <MenuItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  fullWidth
                >
                  تحميل
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Share />}
                  fullWidth
                >
                  مشاركة
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Branch Cards Overview */}
        {activeTab === 0 && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {filteredBranches.map((branch) => (
              <Grid item xs={12} sm={6} md={4} key={branch.id}>
                <BranchCard
                  branch={branch}
                  kpis={branchData[branch.id]?.kpis}
                  onSelect={handleBranchSelect}
                  onSync={handleManualSync}
                  loading={loading && selectedBranch === branch.id}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Detailed View */}
        {selectedBranch && !loading && (
          <>
            <Paper sx={{ mb: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(e, v) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="النظرة العامة" />
                <Tab label="مؤشرات الأداء" />
                <Tab label="المخزون" />
                <Tab label="التقارير" />
                <Tab label="التنبؤات" />
                <Tab label="المزامنة" />
              </Tabs>
            </Paper>

            {/* Overview Tab */}
            <TabPanel value={activeTab} index={0}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <BranchCard
                    branch={currentBranch}
                    kpis={currentData?.kpis}
                    onSelect={handleBranchSelect}
                    onSync={handleManualSync}
                    loading={false}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            {/* KPI Metrics Tab */}
            <TabPanel value={activeTab} index={1}>
              <KPIMetrics
                branchId={selectedBranch}
                kpis={currentData?.kpis}
                loading={loading}
              />
            </TabPanel>

            {/* Inventory Tab */}
            <TabPanel value={activeTab} index={2}>
              <InventoryTable
                branchId={selectedBranch}
                inventory={currentData?.inventory}
                loading={loading}
                onRefresh={() => fetchBranchData(selectedBranch)}
              />
            </TabPanel>

            {/* Reports Tab */}
            <TabPanel value={activeTab} index={3}>
              <ReportsViewer
                branchId={selectedBranch}
                reports={currentData?.reports}
                loading={loading}
                onRefresh={() => fetchBranchData(selectedBranch)}
              />
            </TabPanel>

            {/* Forecasts Tab */}
            <TabPanel value={activeTab} index={4}>
              <ForecastChart
                branchId={selectedBranch}
                forecasts={currentData?.forecasts}
                loading={loading}
              />
            </TabPanel>

            {/* Sync Management Tab */}
            <TabPanel value={activeTab} index={5}>
              <SyncManager
                syncStatus={syncStatus}
                onStartSync={handleStartSync}
                onStopSync={handleStopSync}
                onManualSync={handleManualSync}
                loading={loading}
              />
            </TabPanel>
          </>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress />
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default AdminDashboard;
