/**
 * WorkflowApprovalChains — سلاسل الموافقات
 *
 * Manage multi-level approval chains, start approval processes,
 * review and decide on pending approvals, and view approval timeline.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  alpha,
} from '@mui/material';

import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import PendingIcon from '@mui/icons-material/Pending';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import TimelineIcon from '@mui/icons-material/Timeline';
import SaveIcon from '@mui/icons-material/Save';

const STATUS_CONFIG = {
  pending: { label: 'في الانتظار', color: '#FF9800', icon: <PendingIcon /> },
  approved: { label: 'موافق عليه', color: '#4CAF50', icon: <ApproveIcon /> },
  rejected: { label: 'مرفوض', color: '#F44336', icon: <RejectIcon /> },
  cancelled: { label: 'ملغي', color: '#9E9E9E', icon: <RejectIcon /> },
};

const APPROVAL_TYPE_MAP = {
  sequential: 'تسلسلي',
  parallel: 'متوازي',
  any: 'أي موافق',
  majority: 'الأغلبية',
};

export default function WorkflowApprovalChains() {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const [chains, setChains] = useState([]);
  const [stats, setStats] = useState(null);
  const [instances, setInstances] = useState([]);
  const [pending, setPending] = useState([]);

  // Chain dialog
  const [chainDialog, setChainDialog] = useState(false);
  const [editingChain, setEditingChain] = useState(null);
  const [chainData, setChainData] = useState({
    name: '',
    nameAr: '',
    description: '',
    type: 'sequential',
    isActive: true,
    steps: [
      {
        order: 1,
        name: 'الموافقة الأولى',
        approverRole: 'manager',
        approvalType: 'single',
        required: true,
      },
    ],
  });

  // Decision dialog
  const [decisionDialog, setDecisionDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [decision, setDecision] = useState({ action: 'approve', comment: '' });

  // Timeline dialog
  const [timelineDialog, setTimelineDialog] = useState(false);
  const [timeline, setTimeline] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [chainsRes, statsRes, instancesRes, pendingRes] = await Promise.all([
        workflowService.getApprovalChains(),
        workflowService.getApprovalChainStats(),
        workflowService.getApprovalInstances({ limit: 20 }),
        workflowService.getMyPendingApprovals(),
      ]);
      setChains(chainsRes.data?.data || []);
      setStats(statsRes.data?.data || null);
      setInstances(instancesRes.data?.data || []);
      setPending(pendingRes.data?.data || []);
    } catch (err) {
      showSnackbar('خطأ في تحميل بيانات الموافقات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveChain = async () => {
    try {
      if (editingChain) {
        await workflowService.updateApprovalChain(editingChain._id, chainData);
        showSnackbar('تم تحديث سلسلة الموافقات', 'success');
      } else {
        await workflowService.createApprovalChain(chainData);
        showSnackbar('تم إنشاء سلسلة الموافقات', 'success');
      }
      setChainDialog(false);
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في حفظ سلسلة الموافقات', 'error');
    }
  };

  const handleDeleteChain = async id => {
    if (!window.confirm('هل تريد حذف هذه السلسلة؟')) return;
    try {
      await workflowService.deleteApprovalChain(id);
      showSnackbar('تم حذف السلسلة', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في حذف السلسلة', 'error');
    }
  };

  const handleCloneChain = async id => {
    try {
      await workflowService.cloneApprovalChain(id);
      showSnackbar('تم نسخ السلسلة', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في النسخ', 'error');
    }
  };

  const handleDecision = async () => {
    if (!selectedInstance) return;
    try {
      await workflowService.decideApproval(selectedInstance._id, decision);
      showSnackbar(decision.action === 'approve' ? 'تمت الموافقة بنجاح' : 'تم الرفض', 'success');
      setDecisionDialog(false);
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في تسجيل القرار', 'error');
    }
  };

  const viewTimeline = async instanceId => {
    try {
      const res = await workflowService.getApprovalTimeline(instanceId);
      setTimeline(res.data?.data || []);
      setTimelineDialog(true);
    } catch (err) {
      showSnackbar('خطأ في تحميل التسلسل الزمني', 'error');
    }
  };

  const openNewChain = () => {
    setEditingChain(null);
    setChainData({
      name: '',
      nameAr: '',
      description: '',
      type: 'sequential',
      isActive: true,
      steps: [
        {
          order: 1,
          name: 'الموافقة الأولى',
          approverRole: 'manager',
          approvalType: 'single',
          required: true,
        },
      ],
    });
    setChainDialog(true);
  };

  const openEditChain = chain => {
    setEditingChain(chain);
    setChainData({
      name: chain.name,
      nameAr: chain.nameAr,
      description: chain.description || '',
      type: chain.type || 'sequential',
      isActive: chain.isActive,
      steps: chain.steps || [],
    });
    setChainDialog(true);
  };

  const addStep = () => {
    setChainData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          order: prev.steps.length + 1,
          name: `الموافقة ${prev.steps.length + 1}`,
          approverRole: 'manager',
          approvalType: 'single',
          required: true,
        },
      ],
    }));
  };

  const updateStep = (idx, field, value) => {
    const updated = [...chainData.steps];
    updated[idx] = { ...updated[idx], [field]: value };
    setChainData(prev => ({ ...prev, steps: updated }));
  };

  const removeStep = idx => {
    setChainData(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== idx) }));
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={6} sm={3} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/workflow')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={700}>
            سلاسل الموافقات
          </Typography>
          <Chip icon={<ChainIcon />} label="Approvals" size="small" color="secondary" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData}>
            تحديث
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNewChain}>
            سلسلة جديدة
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'سلاسل الموافقات', value: stats.totalChains || 0, color: '#2196F3' },
            { label: 'في الانتظار', value: stats.pendingApprovals || 0, color: '#FF9800' },
            { label: 'تمت الموافقة', value: stats.approvedCount || 0, color: '#4CAF50' },
            { label: 'مرفوض', value: stats.rejectedCount || 0, color: '#F44336' },
          ].map((s, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Card sx={{ borderTop: `4px solid ${s.color}` }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="السلاسل" />
        <Tab
          label={
            <Badge badgeContent={pending.length} color="error">
              موافقاتي المعلقة
            </Badge>
          }
        />
        <Tab label="سجل الموافقات" />
      </Tabs>

      {/* Chains Tab */}
      {tab === 0 && (
        <Grid container spacing={2}>
          {chains.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>
                  لا توجد سلاسل موافقات
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openNewChain}>
                  إنشاء أول سلسلة
                </Button>
              </Paper>
            </Grid>
          ) : (
            chains.map(chain => (
              <Grid item xs={12} sm={6} md={4} key={chain._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={600}>
                        {chain.nameAr || chain.name}
                      </Typography>
                      <Chip
                        label={chain.isActive ? 'نشطة' : 'معطلة'}
                        color={chain.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    {chain.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {chain.description}
                      </Typography>
                    )}
                    <Chip
                      label={APPROVAL_TYPE_MAP[chain.type] || chain.type}
                      size="small"
                      variant="outlined"
                      color="info"
                      sx={{ mb: 1 }}
                    />
                    {/* Steps mini view */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        flexWrap: 'wrap',
                        mt: 1,
                      }}
                    >
                      {(chain.steps || []).map((step, idx) => (
                        <React.Fragment key={idx}>
                          <Chip
                            label={step.name || `خطوة ${step.order}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                          {idx < (chain.steps || []).length - 1 && (
                            <Typography variant="caption" color="text.secondary">
                              →
                            </Typography>
                          )}
                        </React.Fragment>
                      ))}
                    </Box>
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => openEditChain(chain)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="نسخ">
                      <IconButton size="small" onClick={() => handleCloneChain(chain._id)}>
                        <CloneIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteChain(chain._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* My Pending Approvals Tab */}
      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>المهمة</TableCell>
                <TableCell>السلسلة</TableCell>
                <TableCell>الخطوة الحالية</TableCell>
                <TableCell>تاريخ الطلب</TableCell>
                <TableCell>إجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pending.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      لا توجد موافقات معلقة
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pending.map(p => (
                  <TableRow key={p._id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>
                        {p.taskTitle || p.workflowId?.title || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{p.chainId?.nameAr || p.chainId?.name || '—'}</TableCell>
                    <TableCell>
                      <Chip label={`الخطوة ${p.currentStep || 1}`} size="small" color="warning" />
                    </TableCell>
                    <TableCell>
                      {p.createdAt ? new Date(p.createdAt).toLocaleString('ar-SA') : '—'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<ThumbUpIcon />}
                          onClick={() => {
                            setSelectedInstance(p);
                            setDecision({ action: 'approve', comment: '' });
                            setDecisionDialog(true);
                          }}
                        >
                          موافقة
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<ThumbDownIcon />}
                          onClick={() => {
                            setSelectedInstance(p);
                            setDecision({ action: 'reject', comment: '' });
                            setDecisionDialog(true);
                          }}
                        >
                          رفض
                        </Button>
                        <Tooltip title="التسلسل الزمني">
                          <IconButton size="small" onClick={() => viewTimeline(p._id)}>
                            <TimelineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Instances Log Tab */}
      {tab === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الحالة</TableCell>
                <TableCell>السلسلة</TableCell>
                <TableCell>الخطوة الحالية</TableCell>
                <TableCell>تاريخ البدء</TableCell>
                <TableCell>آخر تحديث</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {instances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      لا توجد سجلات
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                instances.map(inst => {
                  const st = STATUS_CONFIG[inst.status] || STATUS_CONFIG.pending;
                  return (
                    <TableRow key={inst._id} hover>
                      <TableCell>
                        <Chip
                          icon={st.icon}
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: alpha(st.color, 0.12), color: st.color }}
                        />
                      </TableCell>
                      <TableCell>{inst.chainId?.nameAr || inst.chainId?.name || '—'}</TableCell>
                      <TableCell>الخطوة {inst.currentStep || '—'}</TableCell>
                      <TableCell>
                        {inst.createdAt ? new Date(inst.createdAt).toLocaleString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell>
                        {inst.updatedAt ? new Date(inst.updatedAt).toLocaleString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="التسلسل الزمني">
                          <IconButton size="small" onClick={() => viewTimeline(inst._id)}>
                            <TimelineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Chain Dialog */}
      <Dialog open={chainDialog} onClose={() => setChainDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingChain ? 'تعديل سلسلة الموافقات' : 'إنشاء سلسلة موافقات'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (عربي)"
                value={chainData.nameAr}
                onChange={e => setChainData(p => ({ ...p, nameAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (إنجليزي)"
                value={chainData.name}
                onChange={e => setChainData(p => ({ ...p, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="الوصف"
                value={chainData.description}
                onChange={e => setChainData(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>نوع السلسلة</InputLabel>
                <Select
                  value={chainData.type}
                  label="نوع السلسلة"
                  onChange={e => setChainData(p => ({ ...p, type: e.target.value }))}
                >
                  <MenuItem value="sequential">تسلسلي — خطوة بخطوة</MenuItem>
                  <MenuItem value="parallel">متوازي — الكل في نفس الوقت</MenuItem>
                  <MenuItem value="any">أي موافق — واحد يكفي</MenuItem>
                  <MenuItem value="majority">الأغلبية</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={chainData.isActive}
                    onChange={e => setChainData(p => ({ ...p, isActive: e.target.checked }))}
                  />
                }
                label="نشطة"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              خطوات الموافقة ({chainData.steps.length})
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addStep}>
              إضافة خطوة
            </Button>
          </Box>

          {chainData.steps.map((step, idx) => (
            <Paper
              key={idx}
              sx={{
                p: 2,
                mb: 1,
                bgcolor: alpha('#9C27B0', 0.04),
                border: '1px solid',
                borderColor: alpha('#9C27B0', 0.2),
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={1}>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#9C27B0', fontSize: '0.8rem' }}>
                    {step.order || idx + 1}
                  </Avatar>
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="اسم الخطوة"
                    value={step.name}
                    onChange={e => updateStep(idx, 'name', e.target.value)}
                  />
                </Grid>
                <Grid item xs={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>دور الموافق</InputLabel>
                    <Select
                      value={step.approverRole}
                      label="دور الموافق"
                      onChange={e => updateStep(idx, 'approverRole', e.target.value)}
                    >
                      <MenuItem value="manager">المدير</MenuItem>
                      <MenuItem value="admin">المشرف</MenuItem>
                      <MenuItem value="department_head">رئيس القسم</MenuItem>
                      <MenuItem value="ceo">المدير العام</MenuItem>
                      <MenuItem value="finance">المالية</MenuItem>
                      <MenuItem value="hr">الموارد البشرية</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>نوع الموافقة</InputLabel>
                    <Select
                      value={step.approvalType}
                      label="نوع الموافقة"
                      onChange={e => updateStep(idx, 'approvalType', e.target.value)}
                    >
                      <MenuItem value="single">فرد واحد</MenuItem>
                      <MenuItem value="all">الجميع</MenuItem>
                      <MenuItem value="majority">الأغلبية</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={2}>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={step.required}
                          size="small"
                          onChange={e => updateStep(idx, 'required', e.target.checked)}
                        />
                      }
                      label="مطلوب"
                    />
                    <IconButton size="small" color="error" onClick={() => removeStep(idx)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChainDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveChain}
            disabled={!chainData.nameAr}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Decision Dialog */}
      <Dialog
        open={decisionDialog}
        onClose={() => setDecisionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {decision.action === 'approve' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="تعليق (اختياري)"
            value={decision.comment}
            onChange={e => setDecision(p => ({ ...p, comment: e.target.value }))}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecisionDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color={decision.action === 'approve' ? 'success' : 'error'}
            startIcon={decision.action === 'approve' ? <ThumbUpIcon /> : <ThumbDownIcon />}
            onClick={handleDecision}
          >
            {decision.action === 'approve' ? 'موافقة' : 'رفض'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Timeline Dialog */}
      <Dialog
        open={timelineDialog}
        onClose={() => setTimelineDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>التسلسل الزمني للموافقات</DialogTitle>
        <DialogContent>
          {timeline.length === 0 ? (
            <Alert severity="info">لا يوجد تسلسل زمني متاح</Alert>
          ) : (
            <Stepper orientation="vertical" activeStep={timeline.length - 1}>
              {timeline.map((event, i) => {
                const st = STATUS_CONFIG[event.status] || STATUS_CONFIG.pending;
                return (
                  <Step key={i} completed={event.status === 'approved'}>
                    <StepLabel
                      error={event.status === 'rejected'}
                      icon={
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            bgcolor: alpha(st.color, 0.12),
                            color: st.color,
                          }}
                        >
                          {st.icon}
                        </Avatar>
                      }
                    >
                      <Typography fontWeight={600}>
                        {event.stepName || `الخطوة ${i + 1}`}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {event.approverName || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.decidedAt
                          ? new Date(event.decidedAt).toLocaleString('ar-SA')
                          : 'في الانتظار'}
                      </Typography>
                      {event.comment && (
                        <Typography
                          variant="body2"
                          sx={{ mt: 0.5, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}
                        >
                          {event.comment}
                        </Typography>
                      )}
                    </StepContent>
                  </Step>
                );
              })}
            </Stepper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimelineDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
