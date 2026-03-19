/**
 * Enhanced Workflow Dashboard Component
 * لوحة تحكم محسنة لسير العمل مع تحليلات متقدمة
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Warning,
  TrendingUp,
  CheckCircle,
  Info,
  Lightbulb,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const EnhancedWorkflowDashboard = ({ workflows = [] }) => {
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [systemReport, setSystemReport] = useState(null);

  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const analyzeWorkflows = useCallback(() => {
    // تحليل الأداء
    const completed = workflows.filter(w => w.status === 'completed').length;
    const rejected = workflows.filter(w => w.status === 'rejected').length;
    const active = workflows.filter(w => w.status === 'in-progress').length;

    setPerformanceMetrics({
      totalWorkflows: workflows.length,
      completed,
      rejected,
      active,
      completionRate: workflows.length ? Math.round((completed / workflows.length) * 100) : 0,
      rejectionRate: workflows.length ? Math.round((rejected / workflows.length) * 100) : 0,
      averageTime: '24 ساعة',
    });
  }, [workflows]);

  useEffect(() => {
    if (workflows.length > 0) {
      analyzeWorkflows();
    }
  }, [workflows, analyzeWorkflows]);

  // Calculate metrics
  const completed = workflows.filter(w => w.status === 'completed').length;
  const rejected = workflows.filter(w => w.status === 'rejected').length;
  const inProgress = workflows.filter(w => w.status === 'in-progress').length;
  const breached = workflows.filter(w => w.sla && w.sla.breached).length;

  useEffect(() => {
    setPerformanceMetrics({
      total: workflows.length,
      completed,
      rejected,
      inProgress,
      breached,
      completionRate: (completed / workflows.length) * 100,
      successRate: ((workflows.length - rejected) / workflows.length) * 100,
      slaComplianceRate: ((workflows.length - breached) / workflows.length) * 100,
    });

    // إنشاء التقرير
    const completedWorkflows = workflows.filter(w => w.completedAt);
    const avgTime = completedWorkflows.length > 0
      ? completedWorkflows.reduce((sum, w) => sum + (w.completedAt - w.createdAt), 0) / completedWorkflows.length
      : 0;

    setSystemReport({
      totalWorkflows: workflows.length,
      completedWorkflows: completed,
      averageCompletionHours: Math.round(avgTime / (1000 * 60 * 60) * 10) / 10,
      slaBreaches: breached,
      performanceScore: calculatePerformanceScore(workflows),
    });
  }, [workflows, completed, rejected, inProgress, breached]);

  const calculatePerformanceScore = (workflows) => {
    let score = 100;
    
    const breached = workflows.filter(w => w.sla && w.sla.breached).length;
    const rejected = workflows.filter(w => w.status === 'rejected').length;
    const revised = workflows.filter(w => w.status === 'revision-required').length;

    score -= (breached / workflows.length) * 30;
    score -= (rejected / workflows.length) * 30;
    score -= (revised / workflows.length) * 20;

    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#4caf50'; // أخضر
    if (score >= 60) return '#ff9800'; // برتقالي
    return '#f44336'; // أحمر
  };

  const getStatusDistributionData = () => {
    if (!performanceMetrics) return [];
    return [
      { name: 'مكتمل', value: performanceMetrics.completed, color: '#4caf50' },
      { name: 'قيد المعالجة', value: performanceMetrics.inProgress, color: '#2196f3' },
      { name: 'مرفوض', value: performanceMetrics.rejected, color: '#f44336' },
    ].filter(item => item.value > 0);
  };

  const getMetricsData = () => {
    if (!performanceMetrics) return [];
    return [
      { name: 'معدل الإنجاز', value: performanceMetrics.completionRate },
      { name: 'معدل النجاح', value: performanceMetrics.successRate },
      { name: 'امتثال SLA', value: performanceMetrics.slaComplianceRate },
    ];
  };

  if (!performanceMetrics || !systemReport) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>جاري تحميل البيانات...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* رأس الصفحة */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          لوحة تحكم سير العمل المحسنة
        </Typography>
        <Typography variant="body2" color="textSecondary">
          تحليل شامل لأداء نظام سير العمل والمصادقات
        </Typography>
      </Box>

      {/* تنبيهات */}
      {systemReport.slaBreaches > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          ⚠️ هناك {systemReport.slaBreaches} سير عمل متأخر عن جدول التسليم
        </Alert>
      )}

      {/* بطاقات الملخص */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* بطاقة درجة الأداء */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    bgcolor: getScoreColor(systemReport.performanceScore),
                    color: 'white',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    mb: 1,
                  }}
                >
                  {systemReport.performanceScore}
                </Box>
                <Typography variant="h6">درجة الأداء</Typography>
                <Typography variant="body2" color="textSecondary">
                  من 100
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* بطاقة الإجمالي */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {systemReport.totalWorkflows}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    إجمالي سير العمل
                  </Typography>
                </Box>
                <Info sx={{ fontSize: 40, color: '#2196f3' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* بطاقة المكتملة */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                    {systemReport.completedWorkflows}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    مكتملة
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* بطاقة SLA */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                    {systemReport.slaBreaches}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    انتهاك SLA
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 40, color: '#f44336' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* الرسوم البيانية */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* توزيع الحالات */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                توزيع حالات سير العمل
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getStatusDistributionData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getStatusDistributionData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* مقاييس الأداء */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                مقاييس الأداء
              </Typography>
              <Box>
                {getMetricsData().map((metric, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{metric.name}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {metric.value.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={metric.value}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: metric.value >= 80 ? '#4caf50' : metric.value >= 60 ? '#ff9800' : '#f44336',
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* معلومات إضافية */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ mr: 1, color: '#2196f3' }} />
                <Typography variant="h6">متوسط وقت الإنجاز</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {systemReport.averageCompletionHours}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ساعة
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Button
                variant="contained"
                startIcon={<Lightbulb />}
                onClick={() => setReportDialogOpen(true)}
                fullWidth
              >
                عرض التقرير الشامل
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* نافذة التقرير الشامل */}
      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>التقرير الشامل لأداء النظام</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Info sx={{ color: '#2196f3' }} />
                </ListItemIcon>
                <ListItemText
                  primary="إجمالي سير العمل"
                  secondary={systemReport.totalWorkflows}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle sx={{ color: '#4caf50' }} />
                </ListItemIcon>
                <ListItemText
                  primary="المكتملة بنجاح"
                  secondary={`${systemReport.completedWorkflows} (${((systemReport.completedWorkflows / systemReport.totalWorkflows) * 100).toFixed(1)}%)`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Warning sx={{ color: '#f44336' }} />
                </ListItemIcon>
                <ListItemText
                  primary="انتهاكات SLA"
                  secondary={`${systemReport.slaBreaches} (${((systemReport.slaBreaches / systemReport.totalWorkflows) * 100).toFixed(1)}%)`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <TrendingUp sx={{ color: '#ff9800' }} />
                </ListItemIcon>
                <ListItemText
                  primary="متوسط وقت الإنجاز"
                  secondary={`${systemReport.averageCompletionHours} ساعة`}
                />
              </ListItem>
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedWorkflowDashboard;
