import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Paper, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, Chip,
  Alert, CircularProgress, Tooltip, InputAdornment, Badge, Rating, Divider, Avatar, Stack, Snackbar,
} from '@mui/material';
import {
  MenuBook, Healing, School, VideoLibrary, Accessibility,
  SportsEsports, Article, Description, Add, Edit, Delete,
  Search, QrCode, Assignment, Person, Refresh,
  Category, LocalLibrary, TrendingUp, Warning,
  CheckCircle, Schedule, Star,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import libraryService from '../../services/libraryService';

// ── Icon Map ──
const TYPE_ICONS = {
  book: <MenuBook />,
  therapeutic_tool: <Healing />,
  educational: <School />,
  media: <VideoLibrary />,
  assistive_device: <Accessibility />,
  game: <SportsEsports />,
  periodical: <Article />,
  template: <Description />,
};
const TYPE_LABELS = {
  book: 'كتاب',
  therapeutic_tool: 'أداة علاجية',
  educational: 'مورد تعليمي',
  media: 'وسائط',
  assistive_device: 'جهاز مساعد',
  game: 'لعبة تطويرية',
  periodical: 'مجلة/دورية',
  template: 'نموذج',
};
const STATUS_COLORS = {
  available: 'success',
  unavailable: 'error',
  active: 'primary',
  returned: 'success',
  returned_late: 'warning',
  pending: 'info',
  new: 'success',
  good: 'primary',
  fair: 'warning',
  poor: 'error',
};
const LOAN_STATUS = {
  active: 'نشطة',
  returned: 'تم الإرجاع',
  returned_late: 'إرجاع متأخر',
};

// ── KPI Card ──
function KPICard({ title, value, icon, color = '#1976d2', subtitle }) {
  return (
    <Card sx={{ height: '100%', borderTop: `4px solid ${color}` }}>
      <CardContent sx={{ textAlign: 'center', py: 2 }}>
        <Avatar sx={{ bgcolor: `${color}20`, color, mx: 'auto', mb: 1, width: 48, height: 48 }}>
          {icon}
        </Avatar>
        <Typography variant="h4" fontWeight="bold">{value}</Typography>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.disabled">{subtitle}</Typography>}
      </CardContent>
    </Card>
  );
}

export default function LibraryDashboard() {
  // ── State ──
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loans, setLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Dialogs
  const [resourceDialog, setResourceDialog] = useState(false);
  const [loanDialog, setLoanDialog] = useState(false);
  const [memberDialog, setMemberDialog] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [resourceForm, setResourceForm] = useState({ name: '', categoryId: '', type: 'book', quantity: 1, cost: 0, description: '', author: '', isbn: '' });
  const [loanForm, setLoanForm] = useState({ resourceId: '', memberId: '', loanDays: 14 });
  const [memberForm, setMemberForm] = useState({ name: '', email: '', role: 'staff', department: '' });

  // ── Load Data ──
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, resRes, catRes, loanRes, memRes, supRes] = await Promise.all([
        libraryService.getDashboard(),
        libraryService.getResources({ limit: 50 }),
        libraryService.getCategories(),
        libraryService.getLoans({ limit: 50 }),
        libraryService.getMembers(),
        libraryService.getSuppliers(),
      ]);
      setDashboard(dashRes.data?.data || dashRes.data);
      setResources(resRes.data?.data || []);
      setCategories(catRes.data?.data || []);
      setLoans(loanRes.data?.data || []);
      setMembers(memRes.data?.data || []);
      setSuppliers(supRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Handlers ──
  const showMsg = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const handleCreateResource = async () => {
    try {
      await libraryService.createResource(resourceForm);
      showMsg('تم إضافة المورد بنجاح');
      setResourceDialog(false);
      setResourceForm({ name: '', categoryId: '', type: 'book', quantity: 1, cost: 0, description: '', author: '', isbn: '' });
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ في إضافة المورد', 'error');
    }
  };

  const handleUpdateResource = async () => {
    try {
      await libraryService.updateResource(editingResource.id, resourceForm);
      showMsg('تم تحديث المورد بنجاح');
      setResourceDialog(false);
      setEditingResource(null);
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ في تحديث المورد', 'error');
    }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
    try {
      await libraryService.deleteResource(id);
      showMsg('تم حذف المورد بنجاح');
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ في حذف المورد', 'error');
    }
  };

  const handleCheckout = async () => {
    try {
      await libraryService.checkoutResource(loanForm);
      showMsg('تمت الإعارة بنجاح');
      setLoanDialog(false);
      setLoanForm({ resourceId: '', memberId: '', loanDays: 14 });
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ في الإعارة', 'error');
    }
  };

  const handleReturn = async (loanId) => {
    try {
      await libraryService.returnResource(loanId);
      showMsg('تم الإرجاع بنجاح');
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ في الإرجاع', 'error');
    }
  };

  const handleRenew = async (loanId) => {
    try {
      await libraryService.renewLoan(loanId);
      showMsg('تم التجديد بنجاح');
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ في التجديد', 'error');
    }
  };

  const handleCreateMember = async () => {
    try {
      await libraryService.createMember(memberForm);
      showMsg('تم إضافة العضو بنجاح');
      setMemberDialog(false);
      setMemberForm({ name: '', email: '', role: 'staff', department: '' });
      loadData();
    } catch (err) {
      showMsg(err.response?.data?.error || 'خطأ في إضافة العضو', 'error');
    }
  };

  const openEditResource = (r) => {
    setEditingResource(r);
    setResourceForm({
      name: r.name, categoryId: r.categoryId, type: r.type,
      quantity: r.quantity, cost: r.cost, description: r.description || '',
      author: r.author || '', isbn: r.isbn || '',
    });
    setResourceDialog(true);
  };

  // ── Filtered Data ──
  const filteredResources = resources.filter(r => {
    if (typeFilter && r.type !== typeFilter) return false;
    if (categoryFilter && r.categoryId !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || (r.author && r.author.toLowerCase().includes(q));
    }
    return true;
  });

  // ── Loading & Error ──
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} />
        <Typography sx={{ mr: 2 }}>جاري تحميل بيانات المكتبة...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        <Alert severity="error" action={<Button onClick={loadData}>إعادة المحاولة</Button>}>{error}</Alert>
      </Box>
    );
  }

  const kpis = dashboard?.kpis || {};

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalLibrary fontSize="large" color="primary" />
            نظام المكتبة والموارد
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة الكتب والأدوات العلاجية والموارد التعليمية والإعارة
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingResource(null); setResourceForm({ name: '', categoryId: '', type: 'book', quantity: 1, cost: 0, description: '', author: '', isbn: '' }); setResourceDialog(true); }}>
            إضافة مورد
          </Button>
          <Button variant="outlined" startIcon={<Assignment />} onClick={() => setLoanDialog(true)}>
            إعارة جديدة
          </Button>
          <IconButton onClick={loadData}><Refresh /></IconButton>
        </Box>
      </Box>

      {/* ── KPI Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="إجمالي الموارد" value={kpis.totalResources || 0} icon={<MenuBook />} color="#1976d2" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="الكمية الكلية" value={kpis.totalQuantity || 0} icon={<Category />} color="#7b1fa2" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="المتاح" value={kpis.availableQuantity || 0} icon={<CheckCircle />} color="#2e7d32" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="الإعارات النشطة" value={kpis.activeLoans || 0} icon={<Assignment />} color="#ed6c02" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="متأخرة" value={kpis.overdueLoans || 0} icon={<Warning />} color="#d32f2f" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="الأعضاء" value={kpis.totalMembers || 0} icon={<Person />} color="#0288d1" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="التقييم" value={kpis.averageRating || '—'} icon={<Star />} color="#f9a825" />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <KPICard title="القيمة الإجمالية" value={`${(kpis.totalValue || 0).toLocaleString()} ر.س`} icon={<TrendingUp />} color="#00897b" subtitle="ريال سعودي" />
        </Grid>
      </Grid>

      {/* ── Tabs ── */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label={<Badge badgeContent={resources.length} color="primary"><Typography>الموارد</Typography></Badge>} />
          <Tab label={<Badge badgeContent={loans.filter(l => l.status === 'active').length} color="warning"><Typography>الإعارات</Typography></Badge>} />
          <Tab label={<Badge badgeContent={categories.length} color="info"><Typography>الفئات</Typography></Badge>} />
          <Tab label={<Badge badgeContent={members.length} color="success"><Typography>الأعضاء</Typography></Badge>} />
          <Tab label="الموردون" />
          <Tab label="الأكثر استعارة" />
        </Tabs>
      </Paper>

      {/* ═══ TAB 0: Resources ═══ */}
      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="بحث عن مورد..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ minWidth: 250 }} />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>النوع</InputLabel>
              <Select value={typeFilter} label="النوع" onChange={e => setTypeFilter(e.target.value)}>
                <MenuItem value="">الكل</MenuItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>الفئة</InputLabel>
              <Select value={categoryFilter} label="الفئة" onChange={e => setCategoryFilter(e.target.value)}>
                <MenuItem value="">الكل</MenuItem>
                {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>النوع</TableCell>
                  <TableCell>الاسم</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell>المؤلف</TableCell>
                  <TableCell align="center">الكمية</TableCell>
                  <TableCell align="center">المتاح</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                  <TableCell align="center">التقييم</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredResources.map(r => {
                  const cat = categories.find(c => c.id === r.categoryId);
                  return (
                    <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/library/resource/${r.id}`)}>
                      <TableCell><Tooltip title={TYPE_LABELS[r.type]}>{TYPE_ICONS[r.type] || <MenuBook />}</Tooltip></TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">{r.name}</Typography>
                        {r.barcode && <Typography variant="caption" color="text.secondary"><QrCode sx={{ fontSize: 12, mr: 0.5 }} />{r.barcode}</Typography>}
                      </TableCell>
                      <TableCell><Chip size="small" label={cat?.name || '—'} sx={{ bgcolor: cat?.color + '20', color: cat?.color }} /></TableCell>
                      <TableCell>{r.author || '—'}</TableCell>
                      <TableCell align="center">{r.quantity}</TableCell>
                      <TableCell align="center"><Chip size="small" label={r.availableQty} color={r.availableQty > 0 ? 'success' : 'error'} /></TableCell>
                      <TableCell align="center"><Chip size="small" label={r.status === 'available' ? 'متاح' : 'غير متاح'} color={STATUS_COLORS[r.status]} /></TableCell>
                      <TableCell align="center"><Rating value={r.rating || 0} readOnly size="small" precision={0.5} /></TableCell>
                      <TableCell align="center" onClick={e => e.stopPropagation()}>
                        <IconButton size="small" onClick={() => openEditResource(r)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteResource(r.id)}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredResources.length === 0 && (
                  <TableRow><TableCell colSpan={9} align="center"><Typography color="text.secondary" sx={{ py: 4 }}>لا توجد موارد</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ═══ TAB 1: Loans ═══ */}
      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">سجل الإعارات</Typography>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setLoanDialog(true)}>إعارة جديدة</Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>رقم</TableCell>
                  <TableCell>المورد</TableCell>
                  <TableCell>العضو</TableCell>
                  <TableCell>تاريخ الإعارة</TableCell>
                  <TableCell>تاريخ الاستحقاق</TableCell>
                  <TableCell>تاريخ الإرجاع</TableCell>
                  <TableCell>التجديدات</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loans.map(l => (
                  <TableRow key={l.id} hover>
                    <TableCell>{l.id}</TableCell>
                    <TableCell>{l.resourceName || '—'}</TableCell>
                    <TableCell>{l.memberName || '—'}</TableCell>
                    <TableCell>{l.loanDate}</TableCell>
                    <TableCell>{l.dueDate}</TableCell>
                    <TableCell>{l.returnDate || '—'}</TableCell>
                    <TableCell align="center">{l.renewals}</TableCell>
                    <TableCell><Chip size="small" label={LOAN_STATUS[l.status] || l.status} color={STATUS_COLORS[l.status]} /></TableCell>
                    <TableCell align="center">
                      {l.status === 'active' && (
                        <>
                          <Tooltip title="إرجاع"><IconButton size="small" color="success" onClick={() => handleReturn(l.id)}><CheckCircle fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="تجديد"><IconButton size="small" color="primary" onClick={() => handleRenew(l.id)}><Schedule fontSize="small" /></IconButton></Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ═══ TAB 2: Categories ═══ */}
      {tab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>فئات الموارد</Typography>
          <Grid container spacing={2}>
            {categories.map(c => (
              <Grid item xs={12} sm={6} md={3} key={c.id}>
                <Card sx={{ borderRight: `4px solid ${c.color}`, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold">{c.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{c.nameEn}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2">{c.description}</Typography>
                    <Chip size="small" label={`${c.resourceCount} مورد`} sx={{ mt: 1, bgcolor: c.color + '20', color: c.color }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* ═══ TAB 3: Members ═══ */}
      {tab === 3 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">أعضاء المكتبة</Typography>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setMemberDialog(true)}>إضافة عضو</Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>الاسم</TableCell>
                  <TableCell>الوظيفة</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell>البريد</TableCell>
                  <TableCell align="center">الإعارات النشطة</TableCell>
                  <TableCell align="center">إجمالي الإعارات</TableCell>
                  <TableCell align="center">الغرامات</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map(m => (
                  <TableRow key={m.id} hover>
                    <TableCell><Typography fontWeight="bold">{m.name}</Typography></TableCell>
                    <TableCell>{m.role}</TableCell>
                    <TableCell>{m.department}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell align="center"><Chip size="small" label={m.activeLoans} color={m.activeLoans > 0 ? 'warning' : 'default'} /></TableCell>
                    <TableCell align="center">{m.totalLoans}</TableCell>
                    <TableCell align="center">{m.fines > 0 ? <Chip size="small" label={`${m.fines} ر.س`} color="error" /> : '—'}</TableCell>
                    <TableCell><Chip size="small" label={m.status === 'active' ? 'نشط' : 'معلق'} color={m.status === 'active' ? 'success' : 'default'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ═══ TAB 4: Suppliers ═══ */}
      {tab === 4 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>الموردون</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>الاسم</TableCell>
                  <TableCell>جهة الاتصال</TableCell>
                  <TableCell>البريد</TableCell>
                  <TableCell>الهاتف</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell align="center">التقييم</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.map(s => (
                  <TableRow key={s.id} hover>
                    <TableCell fontWeight="bold">{s.name}</TableCell>
                    <TableCell>{s.contact}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.phone}</TableCell>
                    <TableCell>{s.type}</TableCell>
                    <TableCell align="center"><Rating value={s.rating} readOnly size="small" precision={0.5} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ═══ TAB 5: Most Borrowed ═══ */}
      {tab === 5 && dashboard && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>الأكثر استعارة</Typography>
              {dashboard.mostBorrowed?.map((r, i) => (
                <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>{i + 1}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="bold">{r.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{TYPE_LABELS[r.type]}</Typography>
                  </Box>
                  <Chip label={`${r.timesLoaned} مرة`} size="small" color="primary" />
                </Box>
              ))}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>الأعلى تقييماً</Typography>
              {dashboard.topRated?.map((r, i) => (
                <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', width: 32, height: 32 }}>{i + 1}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="bold">{r.name}</Typography>
                    <Rating value={r.rating} readOnly size="small" precision={0.1} />
                  </Box>
                  <Chip label={`${r.reviewCount} تقييم`} size="small" />
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ═══════ DIALOGS ═══════ */}

      {/* ── Resource Dialog ── */}
      <Dialog open={resourceDialog} onClose={() => setResourceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingResource ? 'تعديل المورد' : 'إضافة مورد جديد'}</DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="اسم المورد *" fullWidth value={resourceForm.name} onChange={e => setResourceForm({ ...resourceForm, name: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>النوع *</InputLabel>
              <Select value={resourceForm.type} label="النوع *" onChange={e => setResourceForm({ ...resourceForm, type: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الفئة *</InputLabel>
              <Select value={resourceForm.categoryId} label="الفئة *" onChange={e => setResourceForm({ ...resourceForm, categoryId: e.target.value })}>
                {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="المؤلف / المصنع" fullWidth value={resourceForm.author} onChange={e => setResourceForm({ ...resourceForm, author: e.target.value })} />
            <TextField label="ISBN / رقم تعريف" fullWidth value={resourceForm.isbn} onChange={e => setResourceForm({ ...resourceForm, isbn: e.target.value })} />
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="الكمية" type="number" fullWidth value={resourceForm.quantity} onChange={e => setResourceForm({ ...resourceForm, quantity: +e.target.value })} /></Grid>
              <Grid item xs={6}><TextField label="التكلفة (ر.س)" type="number" fullWidth value={resourceForm.cost} onChange={e => setResourceForm({ ...resourceForm, cost: +e.target.value })} /></Grid>
            </Grid>
            <TextField label="وصف" multiline rows={3} fullWidth value={resourceForm.description} onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResourceDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={editingResource ? handleUpdateResource : handleCreateResource}>
            {editingResource ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Loan Dialog ── */}
      <Dialog open={loanDialog} onClose={() => setLoanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إعارة جديدة</DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>المورد *</InputLabel>
              <Select value={loanForm.resourceId} label="المورد *" onChange={e => setLoanForm({ ...loanForm, resourceId: e.target.value })}>
                {resources.filter(r => r.availableQty > 0).map(r => (
                  <MenuItem key={r.id} value={r.id}>{r.name} (متاح: {r.availableQty})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>العضو *</InputLabel>
              <Select value={loanForm.memberId} label="العضو *" onChange={e => setLoanForm({ ...loanForm, memberId: e.target.value })}>
                {members.filter(m => m.status === 'active').map(m => (
                  <MenuItem key={m.id} value={m.id}>{m.name} — {m.department}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="مدة الإعارة (أيام)" type="number" fullWidth value={loanForm.loanDays} onChange={e => setLoanForm({ ...loanForm, loanDays: +e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoanDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="primary" onClick={handleCheckout}>تأكيد الإعارة</Button>
        </DialogActions>
      </Dialog>

      {/* ── Member Dialog ── */}
      <Dialog open={memberDialog} onClose={() => setMemberDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة عضو جديد</DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="الاسم *" fullWidth value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} />
            <TextField label="البريد الإلكتروني *" fullWidth value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>الوظيفة</InputLabel>
              <Select value={memberForm.role} label="الوظيفة" onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}>
                <MenuItem value="therapist">معالج</MenuItem>
                <MenuItem value="teacher">معلم</MenuItem>
                <MenuItem value="specialist">أخصائي</MenuItem>
                <MenuItem value="researcher">باحث</MenuItem>
                <MenuItem value="staff">موظف</MenuItem>
              </Select>
            </FormControl>
            <TextField label="القسم" fullWidth value={memberForm.department} onChange={e => setMemberForm({ ...memberForm, department: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateMember}>إضافة</Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
