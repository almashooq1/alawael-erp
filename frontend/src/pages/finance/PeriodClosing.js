/* eslint-disable no-console */
import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../../utils/tokenStorage';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  LinearProgress,  Checkbox,  Alert,
  Grid,
} from '@mui/material';
import {
  Lock,
  LockOpen,
  PlayArrow,
  Refresh,
  Add,  CalendarToday,  Replay,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const statusMap = {
  not_started: { label: 'لم يبدأ', color: '#9E9E9E' },
  in_progress: { label: 'جاري التنفيذ', color: '#2196F3' },
  pending_review: { label: 'بانتظار المراجعة', color: '#FF9800' },
  completed: { label: 'مكتمل', color: '#4CAF50' },
  reopened: { label: 'معاد فتحه', color: '#F44336' },
};
const lockMap = {
  open: { label: 'مفتوح', color: '#4CAF50', icon: <LockOpen fontSize="small" /> },
  soft_locked: { label: 'قفل مبدئي', color: '#FF9800', icon: <Lock fontSize="small" /> },
  hard_locked: { label: 'قفل نهائي', color: '#F44336', icon: <Lock fontSize="small" /> },
  closed: { label: 'مقفل', color: '#9E9E9E', icon: <Lock fontSize="small" /> },
};
const periodTypeMap = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  annual: 'سنوي',
};

const PeriodClosing = () => {
  const [checklists, setChecklists] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    periodType: 'monthly',
    periodName: '',
    fiscalYear: new Date().getFullYear(),
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [checkRes, sumRes] = await Promise.all([
        fetch(`${API}/finance/enterprise/period-closing`, { headers }),
        fetch(`${API}/finance/enterprise/period-closing/summary`, { headers }),
      ]);
      const checkData = await checkRes.json();
      const sumData = await sumRes.json();
      if (checkData.success) setChecklists(checkData.data);
      if (sumData.success) setSummary(sumData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/finance/enterprise/period-closing`, {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTaskToggle = async (checklistId, taskId, newStatus) => {
    try {
      await fetch(`${API}/finance/enterprise/period-closing/${checklistId}/task/${taskId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
      if (selected) {
        const res = await fetch(`${API}/finance/enterprise/period-closing`, { headers });
        const data = await res.json();
        if (data.success) {
          const updated = data.data.find(c => c._id === checklistId);
          if (updated) setSelected(updated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = async id => {
    try {
      await fetch(`${API}/finance/enterprise/period-closing/${id}/close`, {
        method: 'POST',
        headers,
      });
      fetchData();
      setDetailOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReopen = async id => {
    try {
      await fetch(`${API}/finance/enterprise/period-closing/${id}/reopen`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: 'تعديل مطلوب' }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700} color={neutralColors.textPrimary}>
          <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
          إقفال الفترات المالية
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchData}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{ bgcolor: brandColors.primary, '&:hover': { bgcolor: brandColors.primaryDark } }}
          >
            فترة جديدة
          </Button>
        </Box>
      </Box>

      {/* Summary */}
      {summary && (
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'إجمالي الفترات',
              value: summary.total,
              color: '#2196F3',
              icon: <CalendarToday />,
            },
            { label: 'مقفلة', value: summary.closed, color: '#4CAF50', icon: <Lock /> },
            { label: 'مفتوحة', value: summary.open, color: '#FF9800', icon: <LockOpen /> },
            {
              label: 'جاري التنفيذ',
              value: summary.inProgress,
              color: '#9C27B0',
              icon: <PlayArrow />,
            },
          ].map((s, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card sx={{ bgcolor: surfaceColors.card, border: `2px solid ${s.color}20` }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{ color: s.color, mb: 1 }}>{s.icon}</Box>
                  <Typography variant="h4" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="body2" color={neutralColors.textSecondary}>
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Table */}
      <Card sx={{ bgcolor: surfaceColors.card }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                {['الفترة', 'النوع', 'الحالة', 'القفل', 'التقدم', 'إجراءات'].map(h => (
                  <TableCell
                    key={h}
                    sx={{ fontWeight: 700, color: neutralColors.textPrimary, textAlign: 'right' }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {checklists.map(c => {
                const tasks = c.tasks || [];
                const done = tasks.filter(
                  t => t.status === 'completed' || t.status === 'skipped'
                ).length;
                const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
                const st = statusMap[c.status] || statusMap.not_started;
                const lk = lockMap[c.lockStatus] || lockMap.open;
                return (
                  <TableRow
                    key={c._id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelected(c);
                      setDetailOpen(true);
                    }}
                  >
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                      {c.periodName || c.fiscalYear || '-'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      {periodTypeMap[c.periodType] || c.periodType}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Chip
                        label={st.label}
                        size="small"
                        sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Chip
                        icon={lk.icon}
                        label={lk.label}
                        size="small"
                        sx={{ bgcolor: `${lk.color}20`, color: lk.color, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', minWidth: 150 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" fontWeight={600}>
                          {progress}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      {c.status !== 'completed' && (
                        <Tooltip title="إقفال الفترة">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={e => {
                              e.stopPropagation();
                              handleClose(c._id);
                            }}
                          >
                            <Lock fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {c.status === 'completed' && (
                        <Tooltip title="إعادة فتح">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={e => {
                              e.stopPropagation();
                              handleReopen(c._id);
                            }}
                          >
                            <Replay fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {checklists.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                  >
                    لا توجد فترات مالية
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إنشاء فترة إقفال جديدة</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="اسم الفترة"
              value={form.periodName}
              onChange={e => setForm({ ...form, periodName: e.target.value })}
              fullWidth
            />
            <TextField
              label="نوع الفترة"
              value={form.periodType}
              onChange={e => setForm({ ...form, periodType: e.target.value })}
              select
              fullWidth
            >
              <MenuItem value="monthly">شهري</MenuItem>
              <MenuItem value="quarterly">ربع سنوي</MenuItem>
              <MenuItem value="annual">سنوي</MenuItem>
            </TextField>
            <TextField
              label="السنة المالية"
              type="number"
              value={form.fiscalYear}
              onChange={e => setForm({ ...form, fiscalYear: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: brandColors.primary }}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          قائمة مهام الإقفال - {selected?.periodName || ''}
        </DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Alert severity={selected.status === 'completed' ? 'success' : 'info'} sx={{ mb: 2 }}>
                الحالة: {statusMap[selected.status]?.label || selected.status} | القفل:{' '}
                {lockMap[selected.lockStatus]?.label || selected.lockStatus}
              </Alert>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>المهمة</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>التصنيف</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>مكتمل</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selected.tasks || []).map(t => (
                    <TableRow key={t._id}>
                      <TableCell sx={{ textAlign: 'right' }}>{t.taskName}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip label={t.category} size="small" />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Checkbox
                          checked={t.status === 'completed'}
                          onChange={() =>
                            handleTaskToggle(
                              selected._id,
                              t._id,
                              t.status === 'completed' ? 'pending' : 'completed'
                            )
                          }
                          disabled={selected.lockStatus === 'closed'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>إغلاق</Button>
          {selected && selected.status !== 'completed' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<Lock />}
              onClick={() => handleClose(selected._id)}
            >
              إقفال الفترة
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PeriodClosing;
