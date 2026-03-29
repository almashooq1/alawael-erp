/**
 * RehabProgressTracking — تتبع تقدم التأهيل
 * Rehabilitation Progress Tracking Dashboard
 */
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';

const METRICS = [
  { label: 'التقدم العام', value: 72, color: 'primary' },
  { label: 'الحركة والتنقل', value: 80, color: 'success' },
  { label: 'الأنشطة اليومية', value: 65, color: 'warning' },
  { label: 'التواصل الاجتماعي', value: 58, color: 'info' },
];

const GOALS = [
  { id: 1, goal: 'المشي لمسافة 100 متر بدون مساعدة', progress: 85, status: 'in_progress', week: 8 },
  { id: 2, goal: 'تناول الطعام باستقلالية', progress: 100, status: 'achieved', week: 4 },
  { id: 3, goal: 'الصعود والنزول على الدرج', progress: 40, status: 'in_progress', week: 12 },
  { id: 4, goal: 'تقليل مستوى الألم إلى 3/10', progress: 70, status: 'in_progress', week: 6 },
  { id: 5, goal: 'تحسين قوة العضلات 20%', progress: 0, status: 'not_started', week: 10 },
];

const STATUS_CONFIG = {
  achieved: { label: 'محقق', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  in_progress: { label: 'جاري', color: 'primary', icon: <PendingIcon fontSize="small" /> },
  not_started: { label: 'لم يبدأ', color: 'default', icon: null },
};

export default function RehabProgressTracking() {
  const [view, setView] = useState('overview');

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <TrendingUpIcon color="primary" sx={{ fontSize: 36 }} />
          <Typography variant="h4" fontWeight="bold">
            تتبع تقدم التأهيل
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, v) => v && setView(v)}
          size="small"
        >
          <ToggleButton value="overview">نظرة عامة</ToggleButton>
          <ToggleButton value="goals">الأهداف</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {view === 'overview' && (
        <Grid container spacing={3}>
          {METRICS.map(metric => (
            <Grid item xs={12} sm={6} md={3} key={metric.label}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {metric.label}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color={`${metric.color}.main`}>
                    {metric.value}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={metric.value}
                    color={metric.color}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {view === 'goals' && (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الهدف</TableCell>
                <TableCell align="center">الأسبوع المستهدف</TableCell>
                <TableCell>نسبة التقدم</TableCell>
                <TableCell align="center">الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {GOALS.map(goal => {
                const config = STATUS_CONFIG[goal.status];
                return (
                  <TableRow key={goal.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: 13 }}>
                          {goal.id}
                        </Avatar>
                        {goal.goal}
                      </Box>
                    </TableCell>
                    <TableCell align="center">الأسبوع {goal.week}</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={goal.progress}
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="body2" minWidth={40}>
                          {goal.progress}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={config.label}
                        color={config.color}
                        size="small"
                        icon={config.icon}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
