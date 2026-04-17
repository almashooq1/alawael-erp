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
  IconButton,
  Tooltip,
  Grid,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  Badge,
} from '@mui/material';
import {
  Approval,
  Refresh,
  CheckCircle,
  Cancel,
  Send,
  HourglassEmpty,
  Forward,
  Speed,
  AssignmentTurnedIn,
  History,
  Warning,
} from '@mui/icons-material';
import { surfaceColors, neutralColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const overallStatusMap = {
  pending: { label: 'معلق', color: '#FF9800', icon: <HourglassEmpty fontSize="small" /> },
  in_progress: { label: 'جاري', color: '#2196F3', icon: <Send fontSize="small" /> },
  approved: { label: 'معتمد', color: '#4CAF50', icon: <CheckCircle fontSize="small" /> },
  rejected: { label: 'مرفوض', color: '#F44336', icon: <Cancel fontSize="small" /> },
  cancelled: { label: 'ملغي', color: '#9E9E9E', icon: <Cancel fontSize="small" /> },
};
const stepStatusMap = {
  pending: { label: 'معلق', color: '#FF9800' },
  approved: { label: 'معتمد', color: '#4CAF50' },
  rejected: { label: 'مرفوض', color: '#F44336' },
  delegated: { label: 'مفوض', color: '#9C27B0' },
  skipped: { label: 'تخطي', color: '#9E9E9E' },
  timed_out: { label: 'منتهي', color: '#F44336' },
};
const priorityMap = {
  low: { label: 'منخفض', color: '#9E9E9E' },
  normal: { label: 'عادي', color: '#2196F3' },
  high: { label: 'عالي', color: '#FF9800' },
  urgent: { label: 'عاجل', color: '#F44336' },
};

const FinancialApprovals = () => {
  const [tab, setTab] = useState(0);
  const [pending, setPending] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [slaReport, setSlaReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailDialog, setDetailDialog] = useState(false);
  const [decideDialog, setDecideDialog] = useState(false);
  const [delegateDialog, setDelegateDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [delegateTo, setDelegateTo] = useState('');

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, hRes, wRes, sRes] = await Promise.all([
        fetch(`${API}/finance/enterprise/approvals/pending`, { headers }),
        fetch(`${API}/finance/enterprise/approvals/history`, { headers }),
        fetch(`${API}/finance/enterprise/approvals/workflows`, { headers }),
        fetch(`${API}/finance/enterprise/approvals/sla-report`, { headers }),
      ]);
      const pData = await pRes.json();
      const hData = await hRes.json();
      const wData = await wRes.json();
      const sData = await sRes.json();
      if (pData.success) setPending(pData.data);
      if (hData.success) setAllHistory(hData.data);
      if (wData.success) setWorkflows(wData.data);
      if (sData.success) setSlaReport(sData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDecide = async action => {
    if (!selected) return;
    try {
      const res = await fetch(`${API}/finance/enterprise/approvals/${selected._id}/decide`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action, comment }),
      });
      const data = await res.json();
      if (data.success) {
        setDecideDialog(false);
        setComment('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelegate = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`${API}/finance/enterprise/approvals/${selected._id}/delegate`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ delegateTo }),
      });
      const data = await res.json();
      if (data.success) {
        setDelegateDialog(false);
        setDelegateTo('');
        fetchData();
      }
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
          <Approval sx={{ mr: 1, verticalAlign: 'middle' }} />
          سير عمل الاعتمادات المالية
        </Typography>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchData}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* SLA Dashboard */}
      {slaReport && (
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'معلقة',
              value: slaReport.pending,
              color: '#FF9800',
              icon: <HourglassEmpty />,
            },
            { label: 'معتمدة', value: slaReport.approved, color: '#4CAF50', icon: <CheckCircle /> },
            { label: 'مرفوضة', value: slaReport.rejected, color: '#F44336', icon: <Cancel /> },
            {
              label: 'انتهاكات SLA',
              value: slaReport.slaBreaches,
              color: '#F44336',
              icon: <Warning />,
            },
            {
              label: 'متوسط الاعتماد (ساعة)',
              value: slaReport.avgApprovalHours,
              color: '#2196F3',
              icon: <Speed />,
            },
            {
              label: 'إجمالي الطلبات',
              value: slaReport.total,
              color: '#9C27B0',
              icon: <AssignmentTurnedIn />,
            },
          ].map((s, i) => (
            <Grid item xs={6} md={2} key={i}>
              <Card sx={{ bgcolor: surfaceColors.card, border: `2px solid ${s.color}20` }}>
                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                  <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                  <Typography variant="h5" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" color={neutralColors.textSecondary}>
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab
          label={
            <Badge badgeContent={pending.length} color="error">
              طلبات معلقة
            </Badge>
          }
          icon={<HourglassEmpty />}
          iconPosition="start"
        />
        <Tab label="جميع الطلبات" icon={<History />} iconPosition="start" />
        <Tab label="مسارات الاعتماد" icon={<AssignmentTurnedIn />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم الطلب',
                    'نوع المستند',
                    'المرجع',
                    'المبلغ',
                    'الأولوية',
                    'الخطوة',
                    'إجراءات',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pending.map(p => {
                  const pr = priorityMap[p.priority] || priorityMap.normal;
                  return (
                    <TableRow key={p._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {p.requestNumber || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{p.documentType || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{p.documentRef || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>
                        {fmt(p.documentAmount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={pr.label}
                          size="small"
                          sx={{ bgcolor: `${pr.color}20`, color: pr.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {p.currentStep}/{p.totalSteps}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="اعتماد">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                setSelected(p);
                                setDecideDialog(true);
                              }}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="رفض">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelected(p);
                                handleDecide('rejected');
                              }}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="تفويض">
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => {
                                setSelected(p);
                                setDelegateDialog(true);
                              }}
                            >
                              <Forward fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pending.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد طلبات معلقة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {tab === 1 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم الطلب',
                    'نوع المستند',
                    'المبلغ',
                    'الأولوية',
                    'الحالة',
                    'التقدم',
                    'التاريخ',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {allHistory.map(a => {
                  const st = overallStatusMap[a.overallStatus] || overallStatusMap.pending;
                  const pr = priorityMap[a.priority] || priorityMap.normal;
                  return (
                    <TableRow
                      key={a._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelected(a);
                        setDetailDialog(true);
                      }}
                    >
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {a.requestNumber || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{a.documentType || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>
                        {fmt(a.documentAmount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={pr.label}
                          size="small"
                          sx={{ bgcolor: `${pr.color}20`, color: pr.color }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          icon={st.icon}
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {a.currentStep}/{a.totalSteps}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString('ar-SA') : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {allHistory.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد طلبات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {tab === 2 && (
        <Grid container spacing={2}>
          {workflows.map(w => (
            <Grid item xs={12} md={6} key={w._id}>
              <Card sx={{ bgcolor: surfaceColors.card }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={1}>
                    {w.name}
                  </Typography>
                  <Chip label={w.documentType} size="small" sx={{ mb: 2 }} />
                  <Stepper orientation="vertical">
                    {(w.rules || []).map((r, i) => (
                      <Step key={i} active>
                        <StepLabel>
                          <Typography fontWeight={600}>{r.stepName}</Typography>
                          <Typography variant="caption" color={neutralColors.textSecondary}>
                            {r.approverRoles?.join(', ') || 'معتمدين محددين'} | SLA:{' '}
                            {r.slaHours || '-'} ساعة
                          </Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {workflows.length === 0 && (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: surfaceColors.card }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color={neutralColors.textSecondary}>
                    لا توجد مسارات اعتماد معرّفة
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Decide Dialog */}
      <Dialog open={decideDialog} onClose={() => setDecideDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>اعتماد الطلب</DialogTitle>
        <DialogContent>
          {selected && (
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <Typography>
                <strong>رقم الطلب:</strong> {selected.requestNumber}
              </Typography>
              <Typography>
                <strong>المبلغ:</strong> {fmt(selected.documentAmount)}
              </Typography>
              <TextField
                label="ملاحظات"
                value={comment}
                onChange={e => setComment(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecideDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<Cancel />}
            onClick={() => handleDecide('rejected')}
          >
            رفض
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            onClick={() => handleDecide('approved')}
          >
            اعتماد
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delegate Dialog */}
      <Dialog
        open={delegateDialog}
        onClose={() => setDelegateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>تفويض الاعتماد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="معرف المفوض إليه"
              value={delegateTo}
              onChange={e => setDelegateTo(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelegateDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Forward />}
            onClick={handleDelegate}
          >
            تفويض
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل الطلب - {selected?.requestNumber}</DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Grid container spacing={2} mb={2}>
                <Grid item xs={6}>
                  <Typography>
                    <strong>نوع المستند:</strong> {selected.documentType}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>المبلغ:</strong> {fmt(selected.documentAmount)}
                  </Typography>
                </Grid>
              </Grid>
              <Typography variant="h6" fontWeight={700} mb={1}>
                خطوات الاعتماد
              </Typography>
              <Stepper activeStep={selected.currentStep - 1} orientation="vertical">
                {(selected.steps || []).map((s, i) => {
                  const sst = stepStatusMap[s.status] || stepStatusMap.pending;
                  return (
                    <Step key={i} completed={s.status === 'approved'}>
                      <StepLabel error={s.status === 'rejected'}>
                        <Typography fontWeight={600}>{s.stepName}</Typography>
                        <Chip
                          label={sst.label}
                          size="small"
                          sx={{ bgcolor: `${sst.color}20`, color: sst.color }}
                        />
                        {s.comment && (
                          <Typography variant="caption" display="block">
                            ملاحظة: {s.comment}
                          </Typography>
                        )}
                      </StepLabel>
                    </Step>
                  );
                })}
              </Stepper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FinancialApprovals;
