/**
 * مكون لوحات التقارير المخصصة
 * Custom Reports Dashboard Component
 *
 * تطبيق يسمح بإنشاء لوحات تقارير مخصصة
 * Application for creating custom report dashboards
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  DragIndicatorIcon,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  Stack,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  Save,
  Settings,
  Dashboard,
  DragIndicator,
  Close
} from '@mui/icons-material';
import { motion, Reorder } from 'framer-motion';
import smartReportsService from '../../services/smartReportsService';
import exportService from '../../services/exportService';
import AdvancedChartsComponent from './AdvancedChartsComponent';

const CustomReportsDashboard = () => {
  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newDashboard, setNewDashboard] = useState({
    name: '',
    description: '',
    widgets: [],
    refreshInterval: 5,
    isPublic: false
  });
  const [availableWidgets] = useState([
    { id: 'chart-line', name: 'رسم بياني خطي', component: 'AdvancedChart' },
    { id: 'chart-bar', name: 'رسم بياني عمودي', component: 'AdvancedChart' },
    { id: 'stat-card', name: 'بطاقة إحصائية', component: 'StatCard' },
    { id: 'table', name: 'جدول بيانات', component: 'Table' },
    { id: 'kpis', name: 'مؤشرات الأداء الرئيسية', component: 'KPIs' },
    { id: 'trend', name: 'تحليل الاتجاهات', component: 'TrendAnalysis' }
  ]);

  // Load dashboards on mount
  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      // محاكاة تحميل البيانات
      const defaultDashboards = [
        {
          id: 'dashboard_1',
          name: 'لوحة الأداء الرئيسية',
          description: 'عرض شامل لمؤشرات الأداء الرئيسية',
          widgets: [
            { id: 'widget_1', type: 'stat-card', title: 'إجمالي المستفيدين', config: {} },
            { id: 'widget_2', type: 'chart-line', title: 'الاتجاهات الشهرية', config: {} }
          ],
          refreshInterval: 5,
          isPublic: true,
          createdAt: new Date().toISOString()
        }
      ];

      setDashboards(defaultDashboards);
      if (defaultDashboards.length > 0) {
        setSelectedDashboard(defaultDashboards[0]);
      }
    } catch (error) {
      console.error('Error loading dashboards:', error);
    }
  };

  const handleCreateDashboard = () => {
    const dashboard = {
      id: `dashboard_${Date.now()}`,
      ...newDashboard,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDashboards([...dashboards, dashboard]);
    setSelectedDashboard(dashboard);
    setOpenDialog(false);
    setNewDashboard({
      name: '',
      description: '',
      widgets: [],
      refreshInterval: 5,
      isPublic: false
    });
  };

  const handleAddWidget = (widget) => {
    const newWidget = {
      id: `widget_${Date.now()}`,
      ...widget,
      config: {}
    };

    const updatedDashboard = {
      ...selectedDashboard,
      widgets: [...(selectedDashboard?.widgets || []), newWidget]
    };

    setSelectedDashboard(updatedDashboard);
  };

  const handleRemoveWidget = (widgetId) => {
    const updatedDashboard = {
      ...selectedDashboard,
      widgets: selectedDashboard.widgets.filter(w => w.id !== widgetId)
    };

    setSelectedDashboard(updatedDashboard);
  };

  const handleSaveDashboard = () => {
    setDashboards(dashboards.map(d => 
      d.id === selectedDashboard.id 
        ? { ...selectedDashboard, updatedAt: new Date().toISOString() }
        : d
    ));
    setIsEditMode(false);
  };

  const handleExportDashboard = () => {
    try {
      exportService.toJSON(
        [selectedDashboard],
        `${selectedDashboard.name}-dashboard`
      );
    } catch (error) {
      console.error('Error exporting dashboard:', error);
    }
  };

  const handleDeleteDashboard = (dashboardId) => {
    const updated = dashboards.filter(d => d.id !== dashboardId);
    setDashboards(updated);
    if (updated.length > 0) {
      setSelectedDashboard(updated[0]);
    } else {
      setSelectedDashboard(null);
    }
  };

  const WidgetRenderer = ({ widget }) => {
    switch (widget.type) {
      case 'chart-line':
      case 'chart-bar':
        return <AdvancedChartsComponent data={[]} type={widget.type} />;
      case 'stat-card':
        return (
          <Paper sx={{ p: 2, bgcolor: 'primary.light' }}>
            <Typography variant="body2" color="text.secondary">
              {widget.title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              2,847
            </Typography>
          </Paper>
        );
      case 'table':
        return (
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2">
              جدول: {widget.title}
            </Typography>
          </Paper>
        );
      case 'kpis':
        return (
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2">
              KPIs: {widget.title}
            </Typography>
          </Paper>
        );
      default:
        return <Paper sx={{ p: 2 }}>غير معروف</Paper>;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Box mb={4}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            📊 لوحات التقارير المخصصة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إنشاء وإدارة لوحات تقارير مخصصة حسب احتياجاتك
          </Typography>
        </Box>
      </motion.div>

      <Grid container spacing={3}>
        {/* Dashboards List */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box mb={2}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Add />}
                  onClick={() => setOpenDialog(true)}
                >
                  لوحة جديدة
                </Button>
              </Box>

              <Typography variant="h6" fontWeight="bold" mb={2}>
                اللوحات المتاحة
              </Typography>

              <Stack spacing={1}>
                {dashboards.map(dashboard => (
                  <motion.div key={dashboard.id} whileHover={{ scale: 1.05 }}>
                    <Paper
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        bgcolor: selectedDashboard?.id === dashboard.id 
                          ? 'primary.light' 
                          : 'background.paper',
                        border: selectedDashboard?.id === dashboard.id
                          ? '2px solid'
                          : '1px solid',
                        borderColor: 'divider'
                      }}
                      onClick={() => setSelectedDashboard(dashboard)}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box flex={1}>
                          <Typography variant="body2" fontWeight="bold">
                            {dashboard.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dashboard.widgets.length} widgets
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDashboard(dashboard.id);
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Paper>
                  </motion.div>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Dashboard View */}
        <Grid item xs={12} md={9}>
          {selectedDashboard ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent>
                  {/* Dashboard Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {isEditMode ? (
                          <TextField
                            size="small"
                            value={selectedDashboard.name}
                            onChange={(e) => setSelectedDashboard({
                              ...selectedDashboard,
                              name: e.target.value
                            })}
                          />
                        ) : (
                          selectedDashboard.name
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedDashboard.description}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {isEditMode ? (
                        <>
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<Save />}
                            onClick={handleSaveDashboard}
                          >
                            حفظ
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => setIsEditMode(false)}
                          >
                            إلغاء
                          </Button>
                        </>
                      ) : (
                        <>
                          <Tooltip title="تحرير">
                            <IconButton
                              onClick={() => setIsEditMode(true)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="تصدير">
                            <IconButton
                              onClick={handleExportDashboard}
                            >
                              <Settings />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </Box>

                  {/* Dashboard Settings */}
                  {isEditMode && (
                    <Paper sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="وصف اللوحة"
                            value={selectedDashboard.description}
                            onChange={(e) => setSelectedDashboard({
                              ...selectedDashboard,
                              description: e.target.value
                            })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>مدة التحديث</InputLabel>
                            <Select
                              value={selectedDashboard.refreshInterval}
                              label="مدة التحديث"
                              onChange={(e) => setSelectedDashboard({
                                ...selectedDashboard,
                                refreshInterval: e.target.value
                              })}
                            >
                              <MenuItem value={1}>1 دقيقة</MenuItem>
                              <MenuItem value={5}>5 دقائق</MenuItem>
                              <MenuItem value={15}>15 دقيقة</MenuItem>
                              <MenuItem value={60}>ساعة واحدة</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={selectedDashboard.isPublic}
                                onChange={(e) => setSelectedDashboard({
                                  ...selectedDashboard,
                                  isPublic: e.target.checked
                                })}
                              />
                            }
                            label="لوحة عامة"
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  )}

                  {/* Widgets */}
                  <Typography variant="h6" fontWeight="bold" mb={2}>
                    الـ Widgets
                  </Typography>

                  {isEditMode && (
                    <Box mb={2}>
                      <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                        <Typography variant="body2" fontWeight="bold" mb={1}>
                          أضف Widget:
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                          {availableWidgets.map(widget => (
                            <Chip
                              key={widget.id}
                              label={widget.name}
                              onClick={() => handleAddWidget(widget)}
                              icon={<Add />}
                            />
                          ))}
                        </Stack>
                      </Paper>
                    </Box>
                  )}

                  <Grid container spacing={2}>
                    {selectedDashboard.widgets?.map((widget) => (
                      <Grid item xs={12} md={6} key={widget.id}>
                        <Card>
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                              <Typography variant="body2" fontWeight="bold">
                                {widget.title || widget.type}
                              </Typography>
                              {isEditMode && (
                                <Tooltip title="حذف">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemoveWidget(widget.id)}
                                  >
                                    <Close fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                            <WidgetRenderer widget={widget} />
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Dashboard sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                لا توجد لوحة مختارة
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Create Dashboard Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء لوحة تقارير جديدة</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="اسم اللوحة"
            value={newDashboard.name}
            onChange={(e) => setNewDashboard({ ...newDashboard, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="الوصف"
            value={newDashboard.description}
            onChange={(e) => setNewDashboard({ ...newDashboard, description: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={handleCreateDashboard} variant="contained" color="primary">
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CustomReportsDashboard;
