/**
 * لوحة تحكم تقييمات ICF — ICF Assessment Dashboard
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress,
} from '@mui/material';
import {
  Assessment as AssessIcon,
  Analytics as StatsIcon,
  CompareArrows as CompareIcon,
  AccountTree as TreeIcon,
} from '@mui/icons-material';
import { assessmentsService, reportsService } from '../../services/icfAssessmentService';

const statusLabels = { draft: 'مسودة', in_progress: 'قيد التقييم', completed: 'مكتمل', reviewed: 'مراجع' };
const statusColors = { draft: 'default', in_progress: 'warning', completed: 'success', reviewed: 'info' };

export default function ICFAssessmentDashboard() {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    Promise.all([
      assessmentsService.getAll().catch(() => ({ data: [] })),
      reportsService.getStatistics().catch(() => ({ data: {} })),
    ]).then(([aResp, sResp]) => {
      setAssessments(Array.isArray(aResp.data) ? aResp.data : Array.isArray(aResp) ? aResp : []);
      setStats(sResp.data || sResp || {});
      setLoading(false);
    });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;

  const kpis = [
    { label: 'إجمالي التقييمات', value: stats.totalAssessments || assessments.length, icon: <AssessIcon />, bg: '#e3f2fd' },
    { label: 'مكتملة', value: stats.completedAssessments || assessments.filter(a => a.status === 'completed').length, icon: <StatsIcon />, bg: '#e8f5e9' },
    { label: 'قيد التقييم', value: stats.inProgressAssessments || assessments.filter(a => a.status === 'in_progress').length, icon: <CompareIcon />, bg: '#fff3e0' },
    { label: 'المجالات المقاسة', value: stats.totalDomains || 0, icon: <TreeIcon />, bg: '#f3e5f5' },
  ];

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>تقييمات ICF الوظيفية</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        التصنيف الدولي للأداء الوظيفي والإعاقة والصحة — تقييم شامل وفق معايير منظمة الصحة العالمية
      </Typography>

      <Grid container spacing={2} mb={3}>
        {kpis.map((k) => (
          <Grid item xs={12} sm={6} md={3} key={k.label}>
            <Card sx={{ bgcolor: k.bg }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {k.icon}
                <Box>
                  <Typography variant="h5" fontWeight="bold">{k.value ?? 0}</Typography>
                  <Typography variant="body2">{k.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>آخر التقييمات</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>المستفيد</TableCell>
              <TableCell>المقيّم</TableCell>
              <TableCell>المجال</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>الدرجة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assessments.slice(0, 10).map((a, i) => (
              <TableRow key={a._id || i}>
                <TableCell>{a.beneficiaryName || a.beneficiary?.name || '-'}</TableCell>
                <TableCell>{a.assessorName || a.assessor?.name || '-'}</TableCell>
                <TableCell>{a.domain || a.component || '-'}</TableCell>
                <TableCell>
                  <Chip label={statusLabels[a.status] || a.status || '-'} color={statusColors[a.status] || 'default'} size="small" />
                </TableCell>
                <TableCell>{a.assessmentDate ? new Date(a.assessmentDate).toLocaleDateString('ar') : '-'}</TableCell>
                <TableCell>{a.totalScore ?? a.overallScore ?? '-'}</TableCell>
              </TableRow>
            ))}
            {assessments.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">لا توجد تقييمات بعد</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
