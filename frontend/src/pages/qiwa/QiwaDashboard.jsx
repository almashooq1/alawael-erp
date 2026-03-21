/**
 * Qiwa Dashboard — منصة قوى (وزارة الموارد البشرية)
 *
 * Employee verification, contract management, WPS wage protection,
 * Nitaqat saudization tracking, batch operations.
 */
import { useState, useEffect, useCallback } from 'react';
import { Paper,
} from '@mui/material';

import qiwaApi from '../../services/qiwa.service';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';

/* ── Tab panels ─────────────────────────── */
function TabPanel({ children, value, index, ...other }) {
  return value === index ? <Box role="tabpanel" py={2} {...other}>{children}</Box> : null;
}

export default function QiwaDashboard() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // employees
  const [employees, setEmployees] = useState([]);
  const [verifyDialog, setVerifyDialog] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ idNumber: '', idType: 'iqama' });
  const [verifyResult, setVerifyResult] = useState(null);
  // contracts
  const [contracts, setContracts] = useState([]);
  const [contractFilter, setContractFilter] = useState('active');
  const [newContractDialog, setNewContractDialog] = useState(false);
  const [contractForm, setContractForm] = useState({ employeeIqama: '', contractType: 'unlimited', jobTitle: '', jobTitleArabic: '', basicSalary: '', startDate: '' });
  // wps
  const [wpsCompliance, setWpsCompliance] = useState(null);
  const [wpsPeriod, setWpsPeriod] = useState(new Date().toISOString().slice(0, 7));
  // nitaqat
  const [nitaqat, setNitaqat] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, conRes, nitRes] = await Promise.allSettled([
        qiwaApi.getEmployees({ page: 1, limit: 50 }),
        qiwaApi.getContracts({ status: contractFilter }),
        qiwaApi.getNitaqatStatus(),
      ]);
      setEmployees(empRes.status === 'fulfilled' ? (empRes.value?.data?.data?.employees || empRes.value?.data?.data || []) : []);
      setContracts(conRes.status === 'fulfilled' ? (conRes.value?.data?.data?.contracts || conRes.value?.data?.data || []) : []);
      setNitaqat(nitRes.status === 'fulfilled' ? nitRes.value?.data?.data : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [contractFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleVerify = async () => {
    try {
      const res = await qiwaApi.verifyEmployee(verifyForm);
      setVerifyResult(res?.data?.data || res?.data);
    } catch { setError('فشل التحقق من بيانات الموظف'); }
  };

  const handleRegisterContract = async () => {
    try {
      await qiwaApi.registerContract({ ...contractForm, basicSalary: Number(contractForm.basicSalary) });
      setNewContractDialog(false);
      loadData();
    } catch { setError('فشل تسجيل العقد'); }
  };

  const loadWPSCompliance = async () => {
    try {
      const res = await qiwaApi.getWPSCompliance(wpsPeriod);
      setWpsCompliance(res?.data?.data || null);
    } catch { setError('فشل تحميل تقرير حماية الأجور'); }
  };

  /* ── Shared stat card ──────────────── */
  const KPI = ({ title, value, color = 'primary.main', icon }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold">{value ?? '—'}</Typography>
      </CardContent>
    </Card>
  );

  const statusColor = { active: 'success', terminated: 'error', pending: 'warning', expired: 'default' };

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /><Typography mt={2}>جاري تحميل بيانات قوى...</Typography></Box>;

  return (
    <Box p={3} dir="rtl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold"><QiwaIcon sx={{ mr: 1, verticalAlign: 'middle' }} />منصة قوى — وزارة الموارد البشرية</Typography>
          <Typography color="text.secondary">إدارة العقود، حماية الأجور، ونطاقات</Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>تحديث</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* KPI */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}><KPI title="الموظفون" value={employees.length} icon={<VerifyIcon />} /></Grid>
        <Grid item xs={6} md={3}><KPI title="العقود النشطة" value={contracts.filter(c => c.status === 'active').length} icon={<ContractIcon />} color="success.main" /></Grid>
        <Grid item xs={6} md={3}><KPI title="نطاقات" value={nitaqat?.band || nitaqat?.zone || '—'} icon={<NitaqatIcon />} color={nitaqat?.band === 'green' || nitaqat?.band === 'platinum' ? 'success.main' : 'warning.main'} /></Grid>
        <Grid item xs={6} md={3}><KPI title="نسبة السعودة" value={nitaqat?.saudizationRate != null ? `${nitaqat.saudizationRate}%` : '—'} icon={<NitaqatIcon />} color="info.main" /></Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="الموظفون والتحقق" />
        <Tab label="العقود" />
        <Tab label="حماية الأجور (WPS)" />
        <Tab label="نطاقات (Nitaqat)" />
      </Tabs>

      {/* ─── Tab 0: Employees ─── */}
      <TabPanel value={tab} index={0}>
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button variant="contained" startIcon={<SearchIcon />} onClick={() => setVerifyDialog(true)}>التحقق من موظف</Button>
        </Box>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>رقم الإقامة / الهوية</TableCell><TableCell>الاسم</TableCell><TableCell>الحالة</TableCell><TableCell>المسمى الوظيفي</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center">لا توجد بيانات</TableCell></TableRow>
              ) : employees.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>{e.iqamaNumber || e.nationalId || '—'}</TableCell>
                  <TableCell>{e.name || e.fullName || '—'}</TableCell>
                  <TableCell><Chip label={e.status === 'active' ? 'نشط' : e.status || '—'} color={statusColor[e.status] || 'default'} size="small" /></TableCell>
                  <TableCell>{e.jobTitle || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ─── Tab 1: Contracts ─── */}
      <TabPanel value={tab} index={1}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <TextField select label="حالة العقد" value={contractFilter} onChange={(e) => setContractFilter(e.target.value)} size="small" sx={{ width: 200 }}>
            <MenuItem value="active">نشط</MenuItem>
            <MenuItem value="terminated">منتهي</MenuItem>
            <MenuItem value="pending">قيد المعالجة</MenuItem>
          </TextField>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewContractDialog(true)}>تسجيل عقد</Button>
        </Box>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>رقم العقد</TableCell><TableCell>رقم الإقامة</TableCell><TableCell>النوع</TableCell><TableCell>الراتب</TableCell><TableCell>الحالة</TableCell><TableCell>تاريخ البدء</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {contracts.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">لا توجد عقود</TableCell></TableRow>
              ) : contracts.map((c, i) => (
                <TableRow key={i}>
                  <TableCell>{c.contractId || c._id || '—'}</TableCell>
                  <TableCell>{c.employeeIqama || '—'}</TableCell>
                  <TableCell>{c.contractType === 'unlimited' ? 'غير محدد المدة' : 'محدد المدة'}</TableCell>
                  <TableCell>{c.basicSalary?.toLocaleString() || '—'} ر.س</TableCell>
                  <TableCell><Chip label={c.status === 'active' ? 'نشط' : c.status || '—'} color={statusColor[c.status] || 'default'} size="small" /></TableCell>
                  <TableCell>{c.startDate ? new Date(c.startDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ─── Tab 2: WPS ─── */}
      <TabPanel value={tab} index={2}>
        <Box display="flex" gap={2} mb={2} alignItems="center">
          <TextField label="الفترة (YYYY-MM)" value={wpsPeriod} onChange={(e) => setWpsPeriod(e.target.value)} size="small" sx={{ width: 200 }} />
          <Button variant="contained" onClick={loadWPSCompliance}>عرض التقرير</Button>
        </Box>
        {wpsCompliance ? (
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>تقرير امتثال حماية الأجور — {wpsCompliance.period || wpsPeriod}</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption">الحالة</Typography>
                  <Box><Chip label={wpsCompliance.compliant ? 'ملتزم' : 'غير ملتزم'} color={wpsCompliance.compliant ? 'success' : 'error'} /></Box>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption">إجمالي المدفوعات</Typography>
                  <Typography variant="h5" fontWeight="bold">{wpsCompliance.totalPaid?.toLocaleString() || '—'} ر.س</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption">الموظفون المشمولون</Typography>
                  <Typography variant="h5" fontWeight="bold">{wpsCompliance.employeesCovered || '—'}</Typography>
                </Grid>
              </Grid>
              {wpsCompliance.issues && wpsCompliance.issues.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" color="error.main">المخالفات:</Typography>
                  {wpsCompliance.issues.map((issue, i) => (
                    <Alert key={i} severity="warning" sx={{ mt: 1 }}>{issue.description || issue}</Alert>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        ) : (
          <Typography color="text.secondary" textAlign="center" mt={4}>اختر فترة واضغط "عرض التقرير"</Typography>
        )}
      </TabPanel>

      {/* ─── Tab 3: Nitaqat ─── */}
      <TabPanel value={tab} index={3}>
        {nitaqat ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" mb={2}>حالة نطاقات</Typography>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: nitaqat.band === 'green' ? 'success.main' : nitaqat.band === 'platinum' ? '#b0bec5' : nitaqat.band === 'red' ? 'error.main' : 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="h6" color="white" fontWeight="bold">{nitaqat.band === 'green' ? 'أخضر' : nitaqat.band === 'platinum' ? 'بلاتيني' : nitaqat.band === 'red' ? 'أحمر' : nitaqat.band || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption">نسبة التوطين</Typography>
                      <Typography variant="h4" fontWeight="bold">{nitaqat.saudizationRate ?? '—'}%</Typography>
                    </Box>
                  </Box>
                  <LinearProgress variant="determinate" value={nitaqat.saudizationRate || 0} sx={{ height: 10, borderRadius: 5 }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" mb={2}>تفاصيل القوى العاملة</Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Box display="flex" justifyContent="space-between"><Typography>الموظفون السعوديون</Typography><Typography fontWeight="bold">{nitaqat.saudiCount ?? '—'}</Typography></Box>
                    <Divider />
                    <Box display="flex" justifyContent="space-between"><Typography>الموظفون غير السعوديين</Typography><Typography fontWeight="bold">{nitaqat.nonSaudiCount ?? '—'}</Typography></Box>
                    <Divider />
                    <Box display="flex" justifyContent="space-between"><Typography>الإجمالي</Typography><Typography fontWeight="bold">{nitaqat.totalEmployees ?? '—'}</Typography></Box>
                    <Divider />
                    <Box display="flex" justifyContent="space-between"><Typography>النسبة المطلوبة</Typography><Typography fontWeight="bold">{nitaqat.requiredRate ?? '—'}%</Typography></Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Typography color="text.secondary" textAlign="center" mt={4}>لا تتوفر بيانات نطاقات</Typography>
        )}
      </TabPanel>

      {/* ─── Verify Dialog ─── */}
      <Dialog open={verifyDialog} onClose={() => { setVerifyDialog(false); setVerifyResult(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>التحقق من بيانات موظف</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField select fullWidth label="نوع المعرّف" value={verifyForm.idType} onChange={(e) => setVerifyForm({ ...verifyForm, idType: e.target.value })}>
                <MenuItem value="iqama">إقامة</MenuItem>
                <MenuItem value="national_id">هوية وطنية</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="رقم المعرّف" value={verifyForm.idNumber} onChange={(e) => setVerifyForm({ ...verifyForm, idNumber: e.target.value })} />
            </Grid>
          </Grid>
          {verifyResult && (
            <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="subtitle2" mb={1}>نتيجة التحقق:</Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}><Typography variant="caption">الاسم</Typography><Typography>{verifyResult.name || verifyResult.fullName || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption">الحالة</Typography><Chip label={verifyResult.verified ? 'تم التحقق' : 'غير مؤكد'} color={verifyResult.verified ? 'success' : 'warning'} size="small" /></Grid>
                <Grid item xs={6}><Typography variant="caption">المهنة</Typography><Typography>{verifyResult.occupation || '—'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption">الكفيل</Typography><Typography>{verifyResult.sponsor || verifyResult.employer || '—'}</Typography></Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setVerifyDialog(false); setVerifyResult(null); }}>إغلاق</Button>
          <Button variant="contained" onClick={handleVerify}>تحقق</Button>
        </DialogActions>
      </Dialog>

      {/* ─── New Contract Dialog ─── */}
      <Dialog open={newContractDialog} onClose={() => setNewContractDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل عقد جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}><TextField fullWidth label="رقم إقامة الموظف" value={contractForm.employeeIqama} onChange={(e) => setContractForm({ ...contractForm, employeeIqama: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <TextField select fullWidth label="نوع العقد" value={contractForm.contractType} onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value })}>
                <MenuItem value="unlimited">غير محدد المدة</MenuItem>
                <MenuItem value="limited">محدد المدة</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth label="المسمى الوظيفي (English)" value={contractForm.jobTitle} onChange={(e) => setContractForm({ ...contractForm, jobTitle: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="المسمى الوظيفي (عربي)" value={contractForm.jobTitleArabic} onChange={(e) => setContractForm({ ...contractForm, jobTitleArabic: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="الراتب الأساسي" type="number" value={contractForm.basicSalary} onChange={(e) => setContractForm({ ...contractForm, basicSalary: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="تاريخ البدء" type="date" InputLabelProps={{ shrink: true }} value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewContractDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleRegisterContract}>تسجيل</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
