import { useState, useEffect, useCallback } from 'react';
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
  Grid,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  AccountTree,
  Refresh,
  Add,
  CheckCircle,
  Cancel,
  PlayArrow,
  HourglassEmpty,
  Assignment,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const workflowTypeMap = {
  invoice_approval: 'اعتماد الفواتير',
  payment_approval: 'اعتماد المدفوعات',
  budget_approval: 'اعتماد الميزانية',
  expense_approval: 'اعتماد المصروفات',
  journal_approval: 'اعتماد القيود',
  purchase_approval: 'اعتماد المشتريات',
  credit_approval: 'اعتماد الائتمان',
  contract_approval: 'اعتماد العقود',
  general: 'عام',
};

const instanceStatusMap = {
  pending: { label: 'معلق', color: '#FF9800', icon: <HourglassEmpty fontSize="small" /> },
  in_progress: { label: 'قيد التنفيذ', color: '#2196F3', icon: <PlayArrow fontSize="small" /> },
  approved: { label: 'معتمد', color: '#4CAF50', icon: <CheckCircle fontSize="small" /> },
  rejected: { label: 'مرفوض', color: '#D32F2F', icon: <Cancel fontSize="small" /> },
  escalated: { label: 'تصعيد', color: '#FF5722', icon: <Assignment fontSize="small" /> },
  cancelled: { label: 'ملغي', color: '#9E9E9E', icon: <Cancel fontSize="small" /> },
};

const FinancialWorkflow = () => {
  const [tab, setTab] = useState(0);
  const [workflows, setWorkflows] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({ name: '', workflowType: 'general', description: '' });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const [wfRes, instRes] = await Promise.all([
        fetch(`${API}/finance/elite/workflows`, { headers }),
        fetch(`${API}/finance/elite/workflow-instances`, { headers }),
      ]);
      const wfJson = await wfRes.json();
      const instJson = await instRes.json();
      if (wfJson.success) setWorkflows(wfJson.data);
      if (instJson.success) setInstances(instJson.data);
    } catch (e) {
      setError('خطأ في تحميل سير العمل');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/finance/elite/workflows`, {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setOpenDialog(false);
        fetchWorkflows();
      }
    } catch (e) {
      setError('خطأ في إنشاء سير العمل');
    }
  };

  const handleAction = async (instanceId, action) => {
    try {
      await fetch(`${API}/finance/elite/workflow-instances/${instanceId}/action`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, comments: '' }),
      });
      fetchWorkflows();
    } catch (e) {
      setError('خطأ في تنفيذ الإجراء');
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );

  const pendingCount = instances.filter(
    i => i.status === 'pending' || i.status === 'in_progress'
  ).length;
  const approvedCount = instances.filter(i => i.status === 'approved').length;
  const rejectedCount = instances.filter(i => i.status === 'rejected').length;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${surfaceColors.background} 0%, #f0f4f8 100%)`,
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AccountTree sx={{ fontSize: 40, color: brandColors.primary }} />
            <Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: neutralColors.textPrimary, textAlign: 'right' }}
              >
                سير العمل المالي
              </Typography>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                Financial Workflow — قوالب الاعتماد، سلاسل الموافقة، التصعيد
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchWorkflows}>
              تحديث
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              sx={{ bgcolor: brandColors.primary }}
            >
              سير عمل جديد
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${brandColors.primary} 0%, #1565C0 100%)`,
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <AccountTree sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {workflows.length}
                </Typography>
                <Typography variant="body2">قوالب سير العمل</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #FF9800 0%, #E65100 100%)',
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <HourglassEmpty sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {pendingCount}
                </Typography>
                <Typography variant="body2">طلبات معلقة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {approvedCount}
                </Typography>
                <Typography variant="body2">معتمدة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)',
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <Cancel sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {rejectedCount}
                </Typography>
                <Typography variant="body2">مرفوضة</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="قوالب سير العمل" />
          <Tab label="الطلبات" />
        </Tabs>

        {tab === 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: surfaceColors.sectionBg }}>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الرقم</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الاسم</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                      خطوات الاعتماد
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الإصدار</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workflows.map(wf => (
                    <TableRow key={wf._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {wf.workflowNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>{wf.name}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {workflowTypeMap[wf.workflowType] || wf.workflowType}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {wf.approvalChain?.length || 0} خطوة
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={wf.status === 'active' ? 'نشط' : 'مسودة'}
                          sx={{
                            bgcolor: wf.status === 'active' ? '#4CAF50' : '#9E9E9E',
                            color: '#fff',
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>v{wf.version || 1}</TableCell>
                    </TableRow>
                  ))}
                  {workflows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                        لا توجد قوالب سير عمل
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {tab === 1 && (
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: surfaceColors.sectionBg }}>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الرقم</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>سير العمل</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                      الخطوة الحالية
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>التقدم</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الأولوية</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {instances.map(inst => {
                    const st = instanceStatusMap[inst.status] || {};
                    const progressPct = inst.totalSteps
                      ? Math.round((inst.currentStep / inst.totalSteps) * 100)
                      : 0;
                    return (
                      <TableRow key={inst._id} hover>
                        <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {inst.instanceNumber}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                          {inst.workflow?.name || '-'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          خطوة {inst.currentStep || 1}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', minWidth: 140 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={progressPct}
                              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="caption">{progressPct}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Chip
                            label={
                              inst.priority === 'urgent'
                                ? 'عاجل'
                                : inst.priority === 'high'
                                  ? 'عالي'
                                  : 'عادي'
                            }
                            sx={{
                              bgcolor:
                                inst.priority === 'urgent'
                                  ? '#D32F2F'
                                  : inst.priority === 'high'
                                    ? '#FF9800'
                                    : '#4CAF50',
                              color: '#fff',
                            }}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Chip
                            icon={st.icon}
                            label={st.label || inst.status}
                            sx={{ bgcolor: st.color, color: '#fff' }}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {(inst.status === 'pending' || inst.status === 'in_progress') && (
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => handleAction(inst._id, 'approve')}
                              >
                                اعتماد
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleAction(inst._id, 'reject')}
                              >
                                رفض
                              </Button>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {instances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                        لا توجد طلبات
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ textAlign: 'right', fontWeight: 700 }}>سير عمل جديد</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="اسم سير العمل"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              select
              label="نوع سير العمل"
              value={form.workflowType}
              onChange={e => setForm({ ...form, workflowType: e.target.value })}
              sx={{ mb: 2 }}
            >
              {Object.entries(workflowTypeMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="الوصف"
              value={form.description}
              multiline
              rows={3}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              sx={{ bgcolor: brandColors.primary }}
            >
              حفظ
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default FinancialWorkflow;
