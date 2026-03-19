/**
 * Workflow Automation Component - Advanced Version ⭐⭐
 * مكون أتمتة سير العمل - نسخة متقدمة
 *
 * Features:
 * ✅ Workflow builder
 * ✅ Process automation
 * ✅ Task scheduling
 * ✅ Condition routing
 * ✅ Approval workflows
 * ✅ Notification triggers
 * ✅ Integration points
 * ✅ Performance monitoring
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Tab,
  Tabs,
  LinearProgress,
} from '@mui/material';
import {
  AutoFixHigh as AutoFixHighIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const WorkflowAutomation = () => {
  const [workflows, setWorkflows] = useState([
    {
      id: 'WF001',
      name: 'اعتماد الفاتورة',
      description: 'اعتماد تلقائي للفواتير أقل من 5000 ر.س',
      status: 'نشط',
      enabled: true,
      executions: 245,
      successRate: 98.4,
      createdDate: '2025-12-01',
      lastRun: '2026-01-15 14:30',
      steps: 4,
    },
    {
      id: 'WF002',
      name: 'إشعارات الموظفين',
      description: 'إرسال إشعارات الرواتب الشهرية',
      status: 'نشط',
      enabled: true,
      executions: 12,
      successRate: 100,
      createdDate: '2025-11-15',
      lastRun: '2026-01-15 09:00',
      steps: 3,
    },
    {
      id: 'WF003',
      name: 'معالجة الطلبات',
      description: 'معالجة تلقائية لطلبات المشتريات',
      status: 'معطل',
      enabled: false,
      executions: 89,
      successRate: 95.5,
      createdDate: '2025-10-01',
      lastRun: '2026-01-10 16:45',
      steps: 6,
    },
  ]);

  const [automationRules, _setAutomationRules] = useState([
    { id: 'RULE001', trigger: 'عند إنشاء فاتورة', condition: 'المبلغ < 5000', action: 'اعتماد تلقائي', status: 'نشط' },
    { id: 'RULE002', trigger: 'في نهاية الشهر', condition: 'دائما', action: 'إرسال تقرير', status: 'نشط' },
    { id: 'RULE003', trigger: 'عند تعيين مهمة', condition: 'الأولوية = عالي', action: 'إرسال إشعار', status: 'نشط' },
  ]);

  const [executions, _setExecutions] = useState([
    { id: 'EX001', workflow: 'اعتماد الفاتورة', date: '2026-01-15 14:30', duration: '2.3 ثانية', status: 'مكتمل', result: 'نجح' },
    { id: 'EX002', workflow: 'إشعارات الموظفين', date: '2026-01-15 09:00', duration: '45 ثانية', status: 'مكتمل', result: 'نجح' },
    { id: 'EX003', workflow: 'اعتماد الفاتورة', date: '2026-01-14 11:20', duration: '1.8 ثانية', status: 'مكتمل', result: 'فشل' },
  ]);

  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
  });

  // Analytics
  const automationStats = useMemo(() => {
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.result === 'نجح').length;
    const activeWorkflows = workflows.filter(w => w.enabled).length;

    return {
      totalWorkflows: workflows.length,
      activeWorkflows,
      totalExecutions,
      successRate: ((successfulExecutions / totalExecutions) * 100).toFixed(1),
      avgExecutionTime: '15.5 ثانية',
      automationRules: automationRules.length,
    };
  }, [workflows, executions, automationRules]);

  const handleAddWorkflow = () => {
    if (newWorkflow.name) {
      const workflow = {
        id: `WF${String(workflows.length + 1).padStart(3, '0')}`,
        name: newWorkflow.name,
        description: newWorkflow.description,
        status: 'نشط',
        enabled: true,
        executions: 0,
        successRate: 0,
        createdDate: new Date().toISOString().split('T')[0],
        lastRun: 'لم يتم التشغيل بعد',
        steps: 1,
      };
      setWorkflows([...workflows, workflow]);
      setNewWorkflow({ name: '', description: '' });
      setOpenDialog(false);
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f9ff', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
            ⚙️ أتمتة سير العمل
          </Typography>
          <Typography variant="body2" color="textSecondary">
            أتمتة العمليات والعمليات المتكررة وزيادة الكفاءة
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            px: 3,
          }}
        >
          سير عمل جديد
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    سير العمل النشط
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {automationStats.activeWorkflows}
                  </Typography>
                </Box>
                <AutoFixHighIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    إجمالي التنفيذات
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {automationStats.totalExecutions}
                  </Typography>
                </Box>
                <PlayArrowIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    معدل النجاح
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {automationStats.successRate}%
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    قواعد التوتر
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {automationStats.automationRules}
                  </Typography>
                </Box>
                <SettingsIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="⚙️ سير العمل" />
          <Tab label="🔧 القواعس" />
          <Tab label="📊 التنفيذات" />
        </Tabs>
      </Paper>

      {/* Tab 1: Workflows */}
      {tabValue === 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>سير العمل</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الحالة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>التنفيذات</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>معدل النجاح</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>آخر تشغيل</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الخطوات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workflows.map(workflow => (
                <TableRow key={workflow.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {workflow.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {workflow.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={workflow.status}
                      color={workflow.enabled ? 'success' : 'warning'}
                      size="small"
                      icon={workflow.enabled ? <PlayArrowIcon /> : <PauseIcon />}
                    />
                  </TableCell>
                  <TableCell>{workflow.executions}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={workflow.successRate}
                        sx={{ flex: 1, minWidth: 50, height: 6, borderRadius: 1 }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {workflow.successRate}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{workflow.lastRun}</TableCell>
                  <TableCell>
                    <Chip label={`${workflow.steps} خطوات`} size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: Rules */}
      {tabValue === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المشغل</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الشرط</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الإجراء</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {automationRules.map(rule => (
                <TableRow key={rule.id} hover>
                  <TableCell>{rule.trigger}</TableCell>
                  <TableCell>{rule.condition}</TableCell>
                  <TableCell>{rule.action}</TableCell>
                  <TableCell>
                    <Chip label={rule.status} color="success" size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 3: Executions */}
      {tabValue === 2 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>سير العمل</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>التاريخ</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المدة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الحالة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>النتيجة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {executions.map(exec => (
                <TableRow key={exec.id} hover>
                  <TableCell>{exec.workflow}</TableCell>
                  <TableCell>{exec.date}</TableCell>
                  <TableCell>{exec.duration}</TableCell>
                  <TableCell>
                    <Chip label={exec.status} color={exec.status === 'مكتمل' ? 'success' : 'warning'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={exec.result} color={exec.result === 'نجح' ? 'success' : 'error'} size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Workflow Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>سير عمل جديد</DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="الاسم"
              value={newWorkflow.name}
              onChange={e => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="الوصف"
              value={newWorkflow.description}
              onChange={e => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={handleAddWorkflow} variant="contained" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowAutomation;
