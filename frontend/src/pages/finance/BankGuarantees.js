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

const guaranteeTypeMap = {
  tender: { label: 'ابتدائي (مناقصة)', color: '#2196F3' },
  performance: { label: 'حسن تنفيذ', color: '#4CAF50' },
  advance_payment: { label: 'دفعة مقدمة', color: '#FF9800' },
  retention: { label: 'ضمان حسن نية', color: '#9C27B0' },
  payment: { label: 'دفع', color: '#00BCD4' },
  customs: { label: 'جمركي', color: '#795548' },
  other: { label: 'أخرى', color: '#607D8B' },
};
const guaranteeStatusMap = {
  requested: { label: 'مطلوب', color: '#9E9E9E' },
  issued: { label: 'صادر', color: '#2196F3' },
  active: { label: 'نشط', color: '#4CAF50' },
  renewed: { label: 'مجدد', color: '#00BCD4' },
  released: { label: 'محرر', color: '#8BC34A' },
  claimed: { label: 'مطالب به', color: '#F44336' },
  expired: { label: 'منتهي', color: '#FF9800' },
  cancelled: { label: 'ملغي', color: '#9E9E9E' },
};
const lcTypeMap = {
  import: { label: 'استيراد', color: '#2196F3' },
  export: { label: 'تصدير', color: '#4CAF50' },
  standby: { label: 'ضمان احتياطي', color: '#FF9800' },
  revolving: { label: 'متجدد', color: '#9C27B0' },
};

const BankGuarantees = () => {
  const [tab, setTab] = useState(0);
  const [guarantees, setGuarantees] = useState([]);
  const [lcs, setLcs] = useState([]);
  const [exposure, setExposure] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lcDialog, setLcDialog] = useState(false);
  const [form, setForm] = useState({
    type: 'performance',
    bankName: '',
    beneficiaryName: '',
    contractRef: '',
    projectName: '',
    amount: '',
    marginPercent: '',
    expiryDate: '',
  });
  const [lcForm, setLcForm] = useState({
    type: 'import',
    bankName: '',
    beneficiaryName: '',
    amount: '',
    goodsDescription: '',
    portOfLoading: '',
    portOfDischarge: '',
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, lcRes, expRes, exprRes] = await Promise.all([
        fetch(`${API}/finance/enterprise/guarantees`, { headers }),
        fetch(`${API}/finance/enterprise/lc`, { headers }),
        fetch(`${API}/finance/enterprise/guarantees/exposure`, { headers }),
        fetch(`${API}/finance/enterprise/guarantees/expiring?days=60`, { headers }),
      ]);
      const gData = await gRes.json();
      const lcData = await lcRes.json();
      const expData = await expRes.json();
      const exprData = await exprRes.json();
      if (gData.success) setGuarantees(gData.data);
      if (lcData.success) setLcs(lcData.data);
      if (expData.success) setExposure(expData.data);
      if (exprData.success) setExpiring(exprData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateGuarantee = async () => {
    try {
      const res = await fetch(`${API}/finance/enterprise/guarantees`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          marginPercent: parseFloat(form.marginPercent),
        }),
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

  const handleCreateLC = async () => {
    try {
      const res = await fetch(`${API}/finance/enterprise/lc`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...lcForm, amount: parseFloat(lcForm.amount) }),
      });
      const data = await res.json();
      if (data.success) {
        setLcDialog(false);
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
          <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
          خطابات الضمان والاعتمادات المستندية
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
            خطاب ضمان
          </Button>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setLcDialog(true)}
            color="secondary"
          >
            اعتماد مستندي
          </Button>
        </Box>
      </Box>

      {/* Exposure Summary */}
      {exposure && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: surfaceColors.card, border: '2px solid #F4433620' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="#F44336">
                  {fmt(exposure.totalExposure)}
                </Typography>
                <Typography variant="body2" color={neutralColors.textSecondary}>
                  إجمالي التعرض
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: surfaceColors.card, border: '2px solid #FF980020' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="#FF9800">
                  {fmt(exposure.totalMargin)}
                </Typography>
                <Typography variant="body2" color={neutralColors.textSecondary}>
                  إجمالي الهوامش
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: surfaceColors.card, border: '2px solid #2196F320' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="#2196F3">
                  {exposure.totalActive}
                </Typography>
                <Typography variant="body2" color={neutralColors.textSecondary}>
                  خطابات نشطة
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: surfaceColors.card, border: '2px solid #F4433620' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="#F44336">
                  {expiring.length}
                </Typography>
                <Typography variant="body2" color={neutralColors.textSecondary}>
                  تنتهي خلال 60 يوم
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {expiring.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>تنبيه:</strong> {expiring.length} خطاب(ات) ضمان ستنتهي صلاحيتها خلال 60 يوم
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="خطابات الضمان" icon={<VerifiedUser />} iconPosition="start" />
        <Tab label="الاعتمادات المستندية" icon={<LocalShipping />} iconPosition="start" />
        <Tab label="التعرض حسب البنك" icon={<AccountBalance />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم الخطاب',
                    'النوع',
                    'البنك',
                    'المستفيد',
                    'المبلغ',
                    'الهامش',
                    'تاريخ الانتهاء',
                    'الحالة',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {guarantees.map(g => {
                  const tp = guaranteeTypeMap[g.type] || guaranteeTypeMap.other;
                  const st = guaranteeStatusMap[g.status] || guaranteeStatusMap.requested;
                  const daysLeft = g.expiryDate
                    ? Math.ceil((new Date(g.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <TableRow key={g._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {g.guaranteeNumber || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={tp.label}
                          size="small"
                          sx={{ bgcolor: `${tp.color}20`, color: tp.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{g.bankName}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{g.beneficiaryName}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {fmt(g.amount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {g.marginPercent ? `${g.marginPercent}%` : '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {g.expiryDate ? new Date(g.expiryDate).toLocaleDateString('ar-SA') : '-'}
                        {daysLeft !== null && daysLeft <= 30 && (
                          <Chip
                            label={`${daysLeft} يوم`}
                            size="small"
                            sx={{ ml: 1, bgcolor: '#F4433620', color: '#F44336' }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {guarantees.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد خطابات ضمان
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
                    'رقم الاعتماد',
                    'النوع',
                    'البنك',
                    'المستفيد',
                    'المبلغ',
                    'المرحلة',
                    'الحالة',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {lcs.map(lc => {
                  const tp = lcTypeMap[lc.type] || lcTypeMap.import;
                  return (
                    <TableRow key={lc._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {lc.lcNumber || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={tp.label}
                          size="small"
                          sx={{ bgcolor: `${tp.color}20`, color: tp.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{lc.bankName}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{lc.beneficiaryName}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {fmt(lc.amount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{lc.currentStage || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip label={lc.status || 'draft'} size="small" />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lcs.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد اعتمادات مستندية
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {tab === 2 && exposure && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: surfaceColors.card }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  التعرض حسب البنك
                </Typography>
                {exposure.byBank.map((b, i) => (
                  <Box
                    key={i}
                    display="flex"
                    justifyContent="space-between"
                    p={1}
                    borderBottom="1px solid #eee"
                  >
                    <Typography fontWeight={600}>{b.bank}</Typography>
                    <Typography fontWeight={700} color="#F44336">
                      {fmt(b.amount)}
                    </Typography>
                  </Box>
                ))}
                {exposure.byBank.length === 0 && (
                  <Typography color={neutralColors.textSecondary}>لا توجد بيانات</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: surfaceColors.card }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  التعرض حسب النوع
                </Typography>
                {exposure.byType.map((t, i) => {
                  const tp = guaranteeTypeMap[t.type] || { label: t.type, color: '#607D8B' };
                  return (
                    <Box
                      key={i}
                      display="flex"
                      justifyContent="space-between"
                      p={1}
                      borderBottom="1px solid #eee"
                    >
                      <Chip
                        label={tp.label}
                        size="small"
                        sx={{ bgcolor: `${tp.color}20`, color: tp.color }}
                      />
                      <Typography fontWeight={700}>{fmt(t.amount)}</Typography>
                    </Box>
                  );
                })}
                {exposure.byType.length === 0 && (
                  <Typography color={neutralColors.textSecondary}>لا توجد بيانات</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Create Guarantee Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إصدار خطاب ضمان جديد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="نوع الخطاب"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              select
              fullWidth
            >
              {Object.entries(guaranteeTypeMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="البنك"
              value={form.bankName}
              onChange={e => setForm({ ...form, bankName: e.target.value })}
              fullWidth
            />
            <TextField
              label="المستفيد"
              value={form.beneficiaryName}
              onChange={e => setForm({ ...form, beneficiaryName: e.target.value })}
              fullWidth
            />
            <TextField
              label="رقم العقد"
              value={form.contractRef}
              onChange={e => setForm({ ...form, contractRef: e.target.value })}
              fullWidth
            />
            <TextField
              label="اسم المشروع"
              value={form.projectName}
              onChange={e => setForm({ ...form, projectName: e.target.value })}
              fullWidth
            />
            <TextField
              label="المبلغ (ر.س)"
              type="number"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              fullWidth
            />
            <TextField
              label="نسبة الهامش %"
              type="number"
              value={form.marginPercent}
              onChange={e => setForm({ ...form, marginPercent: e.target.value })}
              fullWidth
            />
            <TextField
              label="تاريخ الانتهاء"
              type="date"
              value={form.expiryDate}
              onChange={e => setForm({ ...form, expiryDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateGuarantee}
            sx={{ bgcolor: brandColors.primary }}
          >
            إصدار
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create LC Dialog */}
      <Dialog open={lcDialog} onClose={() => setLcDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>فتح اعتماد مستندي جديد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="نوع الاعتماد"
              value={lcForm.type}
              onChange={e => setLcForm({ ...lcForm, type: e.target.value })}
              select
              fullWidth
            >
              {Object.entries(lcTypeMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="البنك"
              value={lcForm.bankName}
              onChange={e => setLcForm({ ...lcForm, bankName: e.target.value })}
              fullWidth
            />
            <TextField
              label="المستفيد"
              value={lcForm.beneficiaryName}
              onChange={e => setLcForm({ ...lcForm, beneficiaryName: e.target.value })}
              fullWidth
            />
            <TextField
              label="المبلغ"
              type="number"
              value={lcForm.amount}
              onChange={e => setLcForm({ ...lcForm, amount: e.target.value })}
              fullWidth
            />
            <TextField
              label="وصف البضاعة"
              value={lcForm.goodsDescription}
              onChange={e => setLcForm({ ...lcForm, goodsDescription: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="ميناء الشحن"
              value={lcForm.portOfLoading}
              onChange={e => setLcForm({ ...lcForm, portOfLoading: e.target.value })}
              fullWidth
            />
            <TextField
              label="ميناء التفريغ"
              value={lcForm.portOfDischarge}
              onChange={e => setLcForm({ ...lcForm, portOfDischarge: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLcDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateLC} color="secondary">
            فتح الاعتماد
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BankGuarantees;
