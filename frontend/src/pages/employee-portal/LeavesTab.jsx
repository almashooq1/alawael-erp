/**
 * LeavesTab — بوابة الموظف: تبويب الإجازات
 */
import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Paper,
  LinearProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { LEAVE_TYPES, STATUS_MAP } from './employeePortalData';

export default function LeavesTab({ leaveBalances, leaveHistory, onOpenLeaveDialog }) {
  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(leaveBalances)
          .filter(([, data]) => data.total > 0)
          .map(([type, data]) => {
            const lt = LEAVE_TYPES[type];
            if (!lt) return null;
            const usedPct = data.total ? (data.used / data.total) * 100 : 0;
            return (
              <Grid item xs={12} sm={6} md={3} key={type}>
                <Card sx={{ borderRadius: 3, borderTop: `4px solid ${lt.color}` }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box sx={{ color: lt.color }}>{lt.icon}</Box>
                      <Typography variant="body2" fontWeight="bold">
                        {lt.label}
                      </Typography>
                    </Box>
                    <Typography variant="h4" fontWeight="bold">
                      {data.remaining}
                      <Typography component="span" variant="body2" color="text.secondary">
                        {' '}
                        / {data.total}
                      </Typography>
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(usedPct, 100)}
                      sx={{
                        mt: 1,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: `${lt.color}20`,
                        '& .MuiLinearProgress-bar': { bgcolor: lt.color, borderRadius: 4 },
                      }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        مستخدم: {data.used}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        متبقي: {data.remaining}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          سجل الإجازات
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onOpenLeaveDialog}
          sx={{ borderRadius: 2 }}
        >
          طلب إجازة
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              {['النوع', 'من', 'إلى', 'الأيام', 'السبب', 'الحالة'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 'bold' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {leaveHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد إجازات مسجلة
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              leaveHistory.map(l => {
                const lt = LEAVE_TYPES[l.type];
                const st = STATUS_MAP[l.status];
                return (
                  <TableRow key={l._id} hover>
                    <TableCell>
                      <Chip
                        icon={lt?.icon}
                        label={lt?.label || l.type}
                        size="small"
                        sx={{
                          bgcolor: `${lt?.color || '#999'}15`,
                          color: lt?.color || '#999',
                          fontWeight: 'bold',
                          '& .MuiChip-icon': { color: lt?.color },
                        }}
                      />
                    </TableCell>
                    <TableCell>{l.startDate}</TableCell>
                    <TableCell>{l.endDate}</TableCell>
                    <TableCell>
                      <Typography fontWeight="bold">{l.days}</Typography>
                    </TableCell>
                    <TableCell>{l.reason}</TableCell>
                    <TableCell>
                      <Chip
                        icon={st?.icon}
                        label={st?.label || l.status}
                        size="small"
                        color={st?.color || 'default'}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
