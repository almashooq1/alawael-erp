/* eslint-disable no-console */
import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../../utils/tokenStorage';




import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';
const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const riskMap = {
  low: { label: 'منخفض', color: '#4CAF50' },
  medium: { label: 'متوسط', color: '#FF9800' },
  high: { label: 'مرتفع', color: '#F44336' },
  very_high: { label: 'مرتفع جداً', color: '#D32F2F' },
};
const appStatusMap = {
  pending: { label: 'قيد المراجعة', color: '#FF9800' },
  under_review: { label: 'تحت الدراسة', color: '#2196F3' },
  approved: { label: 'موافق عليه', color: '#4CAF50' },
  rejected: { label: 'مرفوض', color: '#F44336' },
  expired: { label: 'منتهي', color: '#9E9E9E' },
};

const CreditManagement = () => {
  const [tab, setTab] = useState(0);
  const [profiles, setProfiles] = useState([]);
  const [applications, setApplications] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileDialog, setProfileDialog] = useState(false);
  const [appDialog, setAppDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [profileForm, setProfileForm] = useState({
    customerName: '',
    creditLimit: '',
    riskCategory: 'medium',
    paymentTermsDays: '30',
  });
  const [appForm, setAppForm] = useState({
    customerName: '',
    applicationType: 'new',
    requestedLimit: '',
    businessDescription: '',
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, aRes, dRes] = await Promise.all([
        fetch(`${API}/finance/ultimate/credit-profiles`, { headers }),
        fetch(`${API}/finance/ultimate/credit-applications`, { headers }),
        fetch(`${API}/finance/ultimate/credit/dashboard`, { headers }),
      ]);
      const pData = await pRes.json();
      const aData = await aRes.json();
      const dData = await dRes.json();
      if (pData.success) setProfiles(pData.data);
      if (aData.success) setApplications(aData.data);
      if (dData.success) setDashboard(dData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateProfile = async () => {
    try {
      const payload = {
        ...profileForm,
        creditLimit: parseFloat(profileForm.creditLimit),
        paymentTermsDays: parseInt(profileForm.paymentTermsDays),
      };
      const res = await fetch(`${API}/finance/ultimate/credit-profiles`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setProfileDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateApp = async () => {
    try {
      const payload = { ...appForm, requestedLimit: parseFloat(appForm.requestedLimit) };
      const res = await fetch(`${API}/finance/ultimate/credit-applications`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setAppDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleHold = async (id, hold) => {
    try {
      await fetch(`${API}/finance/ultimate/credit-profiles/${id}/hold`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ creditHold: hold }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecide = async (id, decision) => {
    try {
      await fetch(`${API}/finance/ultimate/credit-applications/${id}/decide`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ decision, approvedLimit: 0 }),
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

  const onHold = profiles.filter(p => p.creditHold);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700} color={neutralColors.textPrimary}>
          <CreditScore sx={{ mr: 1, verticalAlign: 'middle' }} />
          إدارة الائتمان
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchData}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<Add />} onClick={() => setAppDialog(true)}>
            طلب ائتمان
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setProfileDialog(true)}
            sx={{ bgcolor: brandColors.primary, '&:hover': { bgcolor: brandColors.primaryDark } }}
          >
            ملف ائتمان جديد
          </Button>
        </Box>
      </Box>

      {onHold.length > 0 && (
        <Alert severity="error" icon={<Block />} sx={{ mb: 2 }}>
          <strong>{onHold.length} عملاء قيد التعليق الائتماني</strong> —{' '}
          {onHold.map(p => p.customerName).join(', ')}
        </Alert>
      )}

      {dashboard && (
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'إجمالي العملاء',
              value: dashboard.totalProfiles,
              color: '#2196F3',
              icon: <Person />,
            },
            {
              label: 'إجمالي الحد الائتماني',
              value: fmt(dashboard.totalCreditLimit),
              color: '#4CAF50',
              icon: <CreditScore />,
            },
            {
              label: 'إجمالي المستخدم',
              value: fmt(dashboard.totalUsed),
              color: '#FF9800',
              icon: <TrendingUp />,
            },
            {
              label: 'نسبة الاستخدام',
              value: `${dashboard.utilizationRate}%`,
              color: '#9C27B0',
              icon: <Assessment />,
            },
            { label: 'قيد التعليق', value: onHold.length, color: '#F44336', icon: <Block /> },
            {
              label: 'طلبات معلقة',
              value: dashboard.pendingApplications,
              color: '#FF5722',
              icon: <Warning />,
            },
          ].map((s, i) => (
            <Grid item xs={6} md={2} key={i}>
              <Card sx={{ bgcolor: surfaceColors.card, border: `2px solid ${s.color}20` }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
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
        <Tab label="ملفات الائتمان" icon={<Person />} iconPosition="start" />
        <Tab label="طلبات الائتمان" icon={<Assessment />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'العميل',
                    'الحد الائتماني',
                    'المستخدم',
                    'المتاح',
                    'نسبة الاستخدام',
                    'التصنيف',
                    'الدرجة',
                    'تعليق',
                    'إجراءات',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {profiles.map(p => {
                  const risk = riskMap[p.riskCategory] || riskMap.medium;
                  const util = p.creditLimit
                    ? Math.round((p.currentBalance / p.creditLimit) * 100)
                    : 0;
                  return (
                    <TableRow
                      key={p._id}
                      hover
                      sx={{ bgcolor: p.creditHold ? '#F4433610' : 'inherit' }}
                    >
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {p.customerName}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmt(p.creditLimit)}</TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#FF9800', fontWeight: 600 }}>
                        {fmt(p.currentBalance)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#4CAF50' }}>
                        {fmt(p.availableCredit)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={`${util}%`}
                          size="small"
                          sx={{
                            bgcolor:
                              util > 80 ? '#F4433620' : util > 50 ? '#FF980020' : '#4CAF5020',
                            color: util > 80 ? '#F44336' : util > 50 ? '#FF9800' : '#4CAF50',
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={risk.label}
                          size="small"
                          sx={{ bgcolor: `${risk.color}20`, color: risk.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>
                        {p.creditScore || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Switch
                          checked={p.creditHold || false}
                          size="small"
                          onChange={() => handleHold(p._id, !p.creditHold)}
                          color={p.creditHold ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Tooltip title="تفاصيل">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelected(p);
                              setDetailDialog(true);
                            }}
                          >
                            <Assessment fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {profiles.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد ملفات ائتمان
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
                    'العميل',
                    'النوع',
                    'المبلغ المطلوب',
                    'الحالة',
                    'تاريخ التقديم',
                    'إجراءات',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {applications.map(a => {
                  const st = appStatusMap[a.status] || appStatusMap.pending;
                  return (
                    <TableRow key={a._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {a.applicationNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{a.customerName}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {a.applicationType === 'new'
                          ? 'جديد'
                          : a.applicationType === 'increase'
                            ? 'زيادة'
                            : a.applicationType === 'renewal'
                              ? 'تجديد'
                              : a.applicationType}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmt(a.requestedLimit)}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString('ar-SA') : '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {(a.status === 'pending' || a.status === 'under_review') && (
                          <Box display="flex" gap={0.5}>
                            <Tooltip title="موافقة">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleDecide(a._id, 'approved')}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="رفض">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDecide(a._id, 'rejected')}
                              >
                                <Block fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {applications.length === 0 && (
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

      {/* Create Profile Dialog */}
      <Dialog open={profileDialog} onClose={() => setProfileDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>ملف ائتمان جديد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="اسم العميل"
              value={profileForm.customerName}
              onChange={e => setProfileForm({ ...profileForm, customerName: e.target.value })}
              fullWidth
            />
            <TextField
              label="الحد الائتماني (ر.س)"
              type="number"
              value={profileForm.creditLimit}
              onChange={e => setProfileForm({ ...profileForm, creditLimit: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="تصنيف المخاطر"
              value={profileForm.riskCategory}
              onChange={e => setProfileForm({ ...profileForm, riskCategory: e.target.value })}
              fullWidth
            >
              {Object.entries(riskMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="مدة السداد (أيام)"
              type="number"
              value={profileForm.paymentTermsDays}
              onChange={e => setProfileForm({ ...profileForm, paymentTermsDays: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateProfile}
            sx={{ bgcolor: brandColors.primary }}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credit Application Dialog */}
      <Dialog open={appDialog} onClose={() => setAppDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>طلب ائتمان جديد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="اسم العميل"
              value={appForm.customerName}
              onChange={e => setAppForm({ ...appForm, customerName: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="نوع الطلب"
              value={appForm.applicationType}
              onChange={e => setAppForm({ ...appForm, applicationType: e.target.value })}
              fullWidth
            >
              <MenuItem value="new">جديد</MenuItem>
              <MenuItem value="increase">زيادة حد</MenuItem>
              <MenuItem value="decrease">تخفيض حد</MenuItem>
              <MenuItem value="renewal">تجديد</MenuItem>
            </TextField>
            <TextField
              label="المبلغ المطلوب (ر.س)"
              type="number"
              value={appForm.requestedLimit}
              onChange={e => setAppForm({ ...appForm, requestedLimit: e.target.value })}
              fullWidth
            />
            <TextField
              label="وصف النشاط"
              value={appForm.businessDescription}
              onChange={e => setAppForm({ ...appForm, businessDescription: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAppDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateApp}
            sx={{ bgcolor: brandColors.primary }}
          >
            تقديم
          </Button>
        </DialogActions>
      </Dialog>

      {/* Profile Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          تفاصيل ملف الائتمان - {selected?.customerName}
        </DialogTitle>
        <DialogContent>
          {selected && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography>
                  <strong>الحد الائتماني:</strong> {fmt(selected.creditLimit)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>الرصيد الحالي:</strong>{' '}
                  <span style={{ color: '#FF9800', fontWeight: 700 }}>
                    {fmt(selected.currentBalance)}
                  </span>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>المتاح:</strong>{' '}
                  <span style={{ color: '#4CAF50', fontWeight: 700 }}>
                    {fmt(selected.availableCredit)}
                  </span>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>الدرجة الائتمانية:</strong> {selected.creditScore || 'غير محدد'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>التصنيف:</strong> {riskMap[selected.riskCategory]?.label}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>مدة السداد:</strong> {selected.paymentTermsDays} يوم
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>تعليق:</strong> {selected.creditHold ? '⛔ معلّق' : '✅ طبيعي'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>تأمين ائتمان:</strong>{' '}
                  {selected.creditInsurance?.insured ? 'مؤمّن' : 'غير مؤمّن'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CreditManagement;
