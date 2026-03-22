import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const LEAVE_TYPE_LABELS = {
  annual: 'سنوية',
  sick: 'مرضية',
  emergency: 'طارئة',
  personal: 'شخصية',
};

const LEAVE_COLORS = {
  annual: '#1976d2',
  sick: '#d32f2f',
  emergency: '#ed6c02',
  personal: '#7b1fa2',
};

const STATUS_MAP = {
  approved: { label: 'موافق عليها', color: 'success' },
  pending: { label: 'معلّقة', color: 'warning' },
  rejected: { label: 'مرفوضة', color: 'error' },
};

/**
 * LeavesTab – Leave balance cards + leave history table.
 */
export default function LeavesTab({
  leaveBalances = {},
  leaveHistory = [],
  onOpenLeaveDialog,
}) {
  const balanceEntries = Object.entries(leaveBalances);

  return (
    <Box>
      {/* ─── Action Row ─── */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onOpenLeaveDialog}
        >
          طلب إجازة جديدة
        </Button>
      </Box>

      {/* ─── Balance Cards ─── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {balanceEntries.map(([type, bal]) => {
          const pct = bal.total ? (bal.used / bal.total) * 100 : 0;
          const color = LEAVE_COLORS[type] || '#757575';
          return (
            <Grid item xs={6} sm={3} key={type}>
              <Card variant="outlined" sx={{ borderColor: color, borderWidth: 1.5 }}>
                <CardContent sx={{ textAlign: 'center', pb: '12px !important' }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ color, fontWeight: 700, mb: 1 }}
                  >
                    {LEAVE_TYPE_LABELS[type] || type}
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {bal.remaining}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    متبقي من {bal.total}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      mt: 1,
                      height: 8,
                      borderRadius: 4,
                      bgcolor: `${color}22`,
                      '& .MuiLinearProgress-bar': { bgcolor: color },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {bal.used} مستخدمة
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* ─── Leave History Table ─── */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        سجل الإجازات
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>النوع</TableCell>
              <TableCell>من</TableCell>
              <TableCell>إلى</TableCell>
              <TableCell align="center">الأيام</TableCell>
              <TableCell>السبب</TableCell>
              <TableCell align="center">الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaveHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    لا توجد إجازات مسجّلة
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              leaveHistory.map((lv) => {
                const st = STATUS_MAP[lv.status] || {
                  label: lv.status,
                  color: 'default',
                };
                return (
                  <TableRow key={lv._id} hover>
                    <TableCell>
                      <Chip
                        label={LEAVE_TYPE_LABELS[lv.type] || lv.type}
                        size="small"
                        sx={{
                          bgcolor: LEAVE_COLORS[lv.type] || '#9e9e9e',
                          color: '#fff',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(lv.startDate).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      {new Date(lv.endDate).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell align="center">{lv.days}</TableCell>
                    <TableCell>{lv.reason}</TableCell>
                    <TableCell align="center">
                      <Chip label={st.label} color={st.color} size="small" />
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
