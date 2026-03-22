/**
 * CRMProPage — إدارة العلاقات المتقدمة
 *
 * Modern CRM: contacts, pipeline board, deals, activities, dashboard
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tab,
  Tabs,
  Avatar,
  InputAdornment,
  alpha,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  People as CRMIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  MonetizationOn as DealIcon,
  ArrowForward as MoveIcon,
  ViewKanban as KanbanIcon,
  Timeline as ActivityIcon,
  Dashboard as DashIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import enterpriseProService from '../../services/enterprisePro.service';

const CONTACT_TYPES = { individual: 'فرد', company: 'شركة', lead: 'عميل محتمل', partner: 'شريك' };
const _DEAL_STATUSES = {
  open: { label: 'مفتوح', color: '#1565C0' },
  won: { label: 'ناجح', color: '#2E7D32' },
  lost: { label: 'خاسر', color: '#C62828' },
  stalled: { label: 'متوقف', color: '#F57F17' },
};
const _ACTIVITY_TYPES = {
  call: 'مكالمة',
  email: 'بريد',
  meeting: 'اجتماع',
  note: 'ملاحظة',
  task: 'مهمة',
};
const SOURCE_COLORS = {
  website: '#1565C0',
  referral: '#7B1FA2',
  social_media: '#E65100',
  exhibition: '#00695C',
  cold_call: '#455A64',
  advertisement: '#C62828',
};

const emptyContact = {
  name: '',
  nameAr: '',
  email: '',
  phone: '',
  mobile: '',
  company: '',
  jobTitle: '',
  type: 'individual',
  source: 'website',
  tags: [],
};
const emptyDeal = {
  title: '',
  titleAr: '',
  pipeline: '',
  stage: '',
  value: '',
  currency: 'SAR',
  probability: 50,
  contact: '',
  expectedCloseDate: '',
  notes: '',
};
const emptyPipeline = {
  name: '',
  nameAr: '',
  stages: [
    { name: 'جديد', order: 0, probability: 10 },
    { name: 'مؤهل', order: 1, probability: 30 },
    { name: 'عرض', order: 2, probability: 60 },
    { name: 'تفاوض', order: 3, probability: 80 },
    { name: 'إغلاق', order: 4, probability: 100 },
  ],
};

export default function CRMProPage() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [contacts, setContacts] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [boardData, setBoardData] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [search, setSearch] = useState('');

  const [dlg, setDlg] = useState({ type: null, open: false, editId: null });
  const [contactForm, setContactForm] = useState({ ...emptyContact });
  const [dealForm, setDealForm] = useState({ ...emptyDeal });
  const [pipelineForm, setPipelineForm] = useState({ ...emptyPipeline });
  const [selectedPipeline, setSelectedPipeline] = useState('');

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await enterpriseProService.getCRMContacts({ search });
      setContacts(res.data.contacts || res.data || []);
    } catch {
      showSnackbar('خطأ في تحميل جهات الاتصال', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showSnackbar]);

  const fetchPipelines = useCallback(async () => {
    try {
      const res = await enterpriseProService.getCRMPipelines();
      const list = res.data || [];
      setPipelines(list);
      if (list.length > 0 && !selectedPipeline) setSelectedPipeline(list[0]._id);
    } catch {
      showSnackbar('خطأ', 'error');
    }
  }, [showSnackbar, selectedPipeline]);

  const fetchBoard = useCallback(async () => {
    if (!selectedPipeline) return;
    try {
      setLoading(true);
      const res = await enterpriseProService.getCRMPipelineBoard(selectedPipeline);
      setBoardData(res.data);
    } catch {
      showSnackbar('خطأ في التحميل', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedPipeline, showSnackbar]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await enterpriseProService.getCRMDashboard();
      setDashboard(res.data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);
  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);
  useEffect(() => {
    if (tab === 1) fetchBoard();
  }, [tab, fetchBoard]);
  useEffect(() => {
    if (tab === 3) fetchDashboard();
  }, [tab, fetchDashboard]);

  /* ── Dialog Helpers ── */
  const openContactDlg = c => {
    if (c) {
      setDlg({ type: 'contact', open: true, editId: c._id });
      setContactForm({
        name: c.name || '',
        nameAr: c.nameAr || '',
        email: c.email || '',
        phone: c.phone || '',
        mobile: c.mobile || '',
        company: c.company || '',
        jobTitle: c.jobTitle || '',
        type: c.type || 'individual',
        source: c.source || 'website',
        tags: c.tags || [],
      });
    } else {
      setDlg({ type: 'contact', open: true, editId: null });
      setContactForm({ ...emptyContact });
    }
  };

  const openDealDlg = d => {
    if (d) {
      setDlg({ type: 'deal', open: true, editId: d._id });
      setDealForm({
        title: d.title || '',
        titleAr: d.titleAr || '',
        pipeline: d.pipeline?._id || d.pipeline || '',
        stage: d.stage || '',
        value: d.value || '',
        currency: d.currency || 'SAR',
        probability: d.probability || 50,
        contact: d.contact?._id || d.contact || '',
        expectedCloseDate: d.expectedCloseDate?.slice(0, 10) || '',
        notes: d.notes || '',
      });
    } else {
      setDlg({ type: 'deal', open: true, editId: null });
      setDealForm({ ...emptyDeal, pipeline: selectedPipeline });
    }
  };

  const openPipelineDlg = () => {
    setDlg({ type: 'pipeline', open: true, editId: null });
    setPipelineForm({ ...emptyPipeline });
  };

  const closeDlg = () => setDlg({ type: null, open: false, editId: null });

  const saveContact = async () => {
    try {
      if (!contactForm.name) {
        showSnackbar('الاسم مطلوب', 'warning');
        return;
      }
      if (dlg.editId) await enterpriseProService.updateCRMContact(dlg.editId, contactForm);
      else await enterpriseProService.createCRMContact(contactForm);
      showSnackbar(dlg.editId ? 'تم التحديث' : 'تمت الإضافة', 'success');
      closeDlg();
      fetchContacts();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const saveDeal = async () => {
    try {
      if (!dealForm.title) {
        showSnackbar('العنوان مطلوب', 'warning');
        return;
      }
      if (dlg.editId) await enterpriseProService.updateCRMDeal(dlg.editId, dealForm);
      else await enterpriseProService.createCRMDeal(dealForm);
      showSnackbar(dlg.editId ? 'تم التحديث' : 'تمت الإضافة', 'success');
      closeDlg();
      fetchBoard();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const savePipeline = async () => {
    try {
      if (!pipelineForm.name) {
        showSnackbar('الاسم مطلوب', 'warning');
        return;
      }
      await enterpriseProService.createCRMPipeline(pipelineForm);
      showSnackbar('تم إنشاء القناة', 'success');
      closeDlg();
      fetchPipelines();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const deleteContact = async id => {
    try {
      await enterpriseProService.deleteCRMContact(id);
      showSnackbar('تم الحذف', 'success');
      fetchContacts();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const moveDeal = async (dealId, newStage) => {
    try {
      await enterpriseProService.moveCRMDeal(dealId, { stage: newStage });
      showSnackbar('تم نقل الصفقة', 'success');
      fetchBoard();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CRMIcon sx={{ fontSize: 36, color: '#6A1B9A' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              إدارة العلاقات المتقدمة
            </Typography>
            <Typography variant="body2" color="text.secondary">
              CRM Pro — Pipeline & Deals
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            color="secondary"
            onClick={() => (tab === 0 ? openContactDlg() : openDealDlg())}
          >
            {tab === 0 ? 'جهة اتصال' : 'صفقة'}
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={() => {
              fetchContacts();
              fetchBoard();
            }}
          >
            تحديث
          </Button>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="جهات الاتصال" icon={<CRMIcon />} iconPosition="start" />
        <Tab label="خط الأنابيب" icon={<KanbanIcon />} iconPosition="start" />
        <Tab label="النشاطات" icon={<ActivityIcon />} iconPosition="start" />
        <Tab label="لوحة المعلومات" icon={<DashIcon />} iconPosition="start" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Tab 0: Contacts ── */}
      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="بحث جهات الاتصال..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#6A1B9A', 0.05) }}>
                  <TableCell>الاسم</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الشركة</TableCell>
                  <TableCell>البريد</TableCell>
                  <TableCell>الهاتف</TableCell>
                  <TableCell>المصدر</TableCell>
                  <TableCell>التصنيفات</TableCell>
                  <TableCell>إجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map(c => (
                  <TableRow key={c._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{ width: 30, height: 30, fontSize: '0.8rem', bgcolor: '#6A1B9A' }}
                        >
                          {(c.nameAr || c.name || '?').charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {c.nameAr || c.name}
                          </Typography>
                          {c.jobTitle && (
                            <Typography variant="caption" color="text.secondary">
                              {c.jobTitle}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={CONTACT_TYPES[c.type] || c.type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{c.company || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{c.email || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{c.phone || c.mobile || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={c.source}
                        size="small"
                        sx={{ bgcolor: alpha(SOURCE_COLORS[c.source] || '#666', 0.1) }}
                      />
                    </TableCell>
                    <TableCell>
                      {c.tags?.slice(0, 2).map((t, i) => (
                        <Chip key={i} label={t} size="small" sx={{ mr: 0.3 }} />
                      ))}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openContactDlg(c)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteContact(c._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {contacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      لا توجد جهات اتصال
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── Tab 1: Pipeline Board ── */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={selectedPipeline}
                onChange={e => setSelectedPipeline(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">اختر قناة البيع</MenuItem>
                {pipelines.map(p => (
                  <MenuItem key={p._id} value={p._id}>
                    {p.nameAr || p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button size="small" variant="outlined" onClick={openPipelineDlg}>
              + قناة جديدة
            </Button>
            <Button
              size="small"
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => openDealDlg()}
            >
              صفقة جديدة
            </Button>
          </Box>
          {boardData && boardData.stages ? (
            <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
              {boardData.stages.map((stage, si) => (
                <Paper
                  key={si}
                  sx={{
                    minWidth: 260,
                    maxWidth: 300,
                    flexShrink: 0,
                    p: 1.5,
                    bgcolor: alpha('#6A1B9A', 0.02),
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      {stage.name}
                    </Typography>
                    <Chip label={stage.deals?.length || 0} size="small" color="secondary" />
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1, display: 'block' }}
                  >
                    {(stage.deals || []).reduce((s, d) => s + (d.value || 0), 0).toLocaleString()}{' '}
                    SAR
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {(stage.deals || []).map(deal => (
                      <Card
                        key={deal._id}
                        sx={{ '&:hover': { boxShadow: 3 }, cursor: 'pointer' }}
                        onClick={() => openDealDlg(deal)}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="body2" fontWeight={600}>
                            {deal.titleAr || deal.title}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="caption" color="primary" fontWeight={600}>
                              {(deal.value || 0).toLocaleString()} {deal.currency}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {deal.probability}%
                            </Typography>
                          </Box>
                          {deal.contact?.name && (
                            <Typography variant="caption" color="text.secondary">
                              {deal.contact.nameAr || deal.contact.name}
                            </Typography>
                          )}
                          {/* Quick move buttons */}
                          <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                            {boardData.stages
                              .filter((_, idx) => idx !== si)
                              .slice(0, 2)
                              .map(ts => (
                                <Chip
                                  key={ts.name}
                                  label={ts.name}
                                  size="small"
                                  variant="outlined"
                                  icon={<MoveIcon sx={{ fontSize: 12 }} />}
                                  onClick={e => {
                                    e.stopPropagation();
                                    moveDeal(deal._id, ts.name);
                                  }}
                                  sx={{ fontSize: '0.65rem' }}
                                />
                              ))}
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">اختر قناة بيع أو أنشئ واحدة جديدة</Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* ── Tab 2: Activities ── */}
      {tab === 2 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <ActivityIcon sx={{ fontSize: 48, color: alpha('#6A1B9A', 0.3), mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            سجل النشاطات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            يتم تسجيل جميع التفاعلات مع العملاء (مكالمات، بريد، اجتماعات) تلقائياً
          </Typography>
        </Paper>
      )}

      {/* ── Tab 3: Dashboard ── */}
      {tab === 3 && dashboard && (
        <Grid container spacing={2}>
          {[
            {
              label: 'إجمالي جهات الاتصال',
              value: dashboard.totalContacts,
              color: '#6A1B9A',
              icon: <CRMIcon />,
            },
            {
              label: 'إجمالي الصفقات',
              value: dashboard.totalDeals,
              color: '#1565C0',
              icon: <DealIcon />,
            },
            {
              label: 'قيمة خط الأنابيب',
              value: `${(dashboard.pipelineValue || 0).toLocaleString()} SAR`,
              color: '#2E7D32',
              icon: <DealIcon />,
            },
            {
              label: 'معدل التحويل',
              value:
                dashboard.totalDeals > 0
                  ? `${Math.round((dashboard.wonDeals / dashboard.totalDeals) * 100)}%`
                  : '0%',
              color: '#E65100',
              icon: <ActivityIcon />,
            },
          ].map((s, i) => (
            <Grid item xs={3} key={i}>
              <Card
                sx={{ background: `linear-gradient(135deg, ${alpha(s.color, 0.1)}, transparent)` }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                  <Typography variant="h4" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {dashboard.bySource && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  المصادر
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {dashboard.bySource.map((s, i) => (
                    <Chip
                      key={i}
                      label={`${s._id}: ${s.count}`}
                      sx={{ bgcolor: alpha(SOURCE_COLORS[s._id] || '#666', 0.1) }}
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── DIALOGS ── */}
      {/* Contact Dialog */}
      <Dialog open={dlg.open && dlg.type === 'contact'} onClose={closeDlg} maxWidth="sm" fullWidth>
        <DialogTitle>{dlg.editId ? 'تعديل جهة الاتصال' : 'إضافة جهة اتصال'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (EN)"
                value={contactForm.name}
                onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (عربي)"
                value={contactForm.nameAr}
                onChange={e => setContactForm(f => ({ ...f, nameAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="البريد"
                value={contactForm.email}
                onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الهاتف"
                value={contactForm.phone}
                onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الشركة"
                value={contactForm.company}
                onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المسمى الوظيفي"
                value={contactForm.jobTitle}
                onChange={e => setContactForm(f => ({ ...f, jobTitle: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <Select
                  value={contactForm.type}
                  onChange={e => setContactForm(f => ({ ...f, type: e.target.value }))}
                >
                  {Object.entries(CONTACT_TYPES).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <Select
                  value={contactForm.source}
                  onChange={e => setContactForm(f => ({ ...f, source: e.target.value }))}
                >
                  {Object.keys(SOURCE_COLORS).map(k => (
                    <MenuItem key={k} value={k}>
                      {k}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDlg}>إلغاء</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveContact}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deal Dialog */}
      <Dialog open={dlg.open && dlg.type === 'deal'} onClose={closeDlg} maxWidth="sm" fullWidth>
        <DialogTitle>{dlg.editId ? 'تعديل الصفقة' : 'صفقة جديدة'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="العنوان (EN)"
                value={dealForm.title}
                onChange={e => setDealForm(f => ({ ...f, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="العنوان (عربي)"
                value={dealForm.titleAr}
                onChange={e => setDealForm(f => ({ ...f, titleAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="القيمة"
                type="number"
                value={dealForm.value}
                onChange={e => setDealForm(f => ({ ...f, value: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">SAR</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاحتمال %"
                type="number"
                value={dealForm.probability}
                onChange={e => setDealForm(f => ({ ...f, probability: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <Select
                  value={dealForm.pipeline}
                  onChange={e => setDealForm(f => ({ ...f, pipeline: e.target.value }))}
                >
                  {pipelines.map(p => (
                    <MenuItem key={p._id} value={p._id}>
                      {p.nameAr || p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المرحلة"
                value={dealForm.stage}
                onChange={e => setDealForm(f => ({ ...f, stage: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="الإغلاق المتوقع"
                value={dealForm.expectedCloseDate}
                onChange={e => setDealForm(f => ({ ...f, expectedCloseDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                value={dealForm.notes}
                onChange={e => setDealForm(f => ({ ...f, notes: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDlg}>إلغاء</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveDeal}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pipeline Dialog */}
      <Dialog open={dlg.open && dlg.type === 'pipeline'} onClose={closeDlg} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء قناة بيع جديدة</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (EN)"
                value={pipelineForm.name}
                onChange={e => setPipelineForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (عربي)"
                value={pipelineForm.nameAr}
                onChange={e => setPipelineForm(f => ({ ...f, nameAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                المراحل الافتراضية:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {pipelineForm.stages.map((s, i) => (
                  <Chip key={i} label={`${s.name} (${s.probability}%)`} />
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDlg}>إلغاء</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={savePipeline}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
