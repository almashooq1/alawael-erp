import { useState, useEffect, useCallback } from 'react';

import { surfaceColors, neutralColors, brandColors } from 'theme/palette';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import Refresh from '@mui/icons-material/Refresh';
import Add from '@mui/icons-material/Add';
import Warning from '@mui/icons-material/Warning';
import CheckCircle from '@mui/icons-material/CheckCircle';

const API = process.env.REACT_APP_API_URL || '/api';

const auditTypeMap = {
  internal: 'تدقيق داخلي',
  external: 'تدقيق خارجي',
  zatca_audit: 'تدقيق زاتكا',
  special_purpose: 'تدقيق لغرض خاص',
  compliance: 'تدقيق امتثال',
  operational: 'تدقيق تشغيلي',
  forensic: 'تدقيق جنائي',
  it_audit: 'تدقيق تقنية المعلومات',
  continuous: 'تدقيق مستمر',
  peer_review: 'مراجعة نظراء',
};

const statusMap = {
  planning: { label: 'تخطيط', color: '#9E9E9E' },
  fieldwork: { label: 'عمل ميداني', color: '#2196F3' },
  review: { label: 'مراجعة', color: '#FF9800' },
  reporting: { label: 'إعداد التقرير', color: '#9C27B0' },
  completed: { label: 'مكتمل', color: '#4CAF50' },
  cancelled: { label: 'ملغي', color: '#D32F2F' },
};

const opinionMap = {
  unqualified: { label: 'رأي نظيف', color: '#4CAF50' },
  qualified: { label: 'رأي متحفظ', color: '#FF9800' },
  adverse: { label: 'رأي معاكس', color: '#D32F2F' },
  disclaimer: { label: 'امتناع عن إبداء الرأي', color: '#9E9E9E' },
};

const severityMap = {
  critical: { label: 'حرج', color: '#D32F2F' },
  high: { label: 'عالي', color: '#FF5722' },
  medium: { label: 'متوسط', color: '#FF9800' },
  low: { label: 'منخفض', color: '#4CAF50' },
  observation: { label: 'ملاحظة', color: '#607D8B' },
};

const FinancialAuditManager = () => {
  const [tab, setTab] = useState(0);
  const [engagements, setEngagements] = useState([]);
  const [, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    title: '',
    auditType: 'internal',
    description: '',
    'scope.startDate': '',
    'scope.endDate': '',
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [engRes, sumRes] = await Promise.all([
        fetch(`${API}/finance/elite/audit-engagements`, { headers }),
        fetch(`${API}/finance/elite/audit-engagements/dashboard/summary`, { headers }),
      ]);
      const engJson = await engRes.json();
      const sumJson = await sumRes.json();
      if (engJson.success) setEngagements(engJson.data);
      if (sumJson.success) setSummary(sumJson.data || {});
    } catch (e) {
      setError('خطأ في تحميل بيانات التدقيق');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const payload = {
        title: form.title,
        auditType: form.auditType,
        description: form.description,
        scope: {
          startDate: form['scope.startDate'] || undefined,
          endDate: form['scope.endDate'] || undefined,
        },
      };
      const res = await fetch(`${API}/finance/elite/audit-engagements`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setOpenDialog(false);
        fetchData();
      }
    } catch (e) {
      setError('خطأ في إنشاء مهمة التدقيق');
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );

  const totalFindings = engagements.reduce((sum, e) => sum + (e.findings?.length || 0), 0);
  const criticalFindings = engagements.reduce(
    (sum, e) =>
      sum +
      (e.findings?.filter(f => f.severity === 'critical' || f.severity === 'high').length || 0),
    0
  );
  const completedCount = engagements.filter(e => e.status === 'completed').length;

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
            <FindInPage sx={{ fontSize: 40, color: brandColors.primary }} />
            <Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: neutralColors.textPrimary, textAlign: 'right' }}
              >
                إدارة التدقيق
              </Typography>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                Financial Audit Manager — مهام التدقيق، النتائج، الإجراءات التصحيحية
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData}>
              تحديث
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              sx={{ bgcolor: brandColors.primary }}
            >
              مهمة تدقيق جديدة
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
                <FindInPage sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {engagements.length}
                </Typography>
                <Typography variant="body2">إجمالي مهام التدقيق</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #FF5722 0%, #BF360C 100%)',
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <BugReport sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {totalFindings}
                </Typography>
                <Typography variant="body2">إجمالي النتائج</Typography>
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
                <Warning sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {criticalFindings}
                </Typography>
                <Typography variant="body2">نتائج حرجة/عالية</Typography>
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
                  {completedCount}
                </Typography>
                <Typography variant="body2">مكتملة</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="مهام التدقيق" />
          <Tab label="النتائج" />
          <Tab label="آراء التدقيق" />
        </Tabs>

        {tab === 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: surfaceColors.sectionBg }}>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الرقم</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>العنوان</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الفريق</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>النتائج</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>التقدم</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {engagements.map(eng => {
                    const st = statusMap[eng.status] || {};
                    const phases = ['planning', 'fieldwork', 'review', 'reporting', 'completed'];
                    const progress = Math.round(
                      ((phases.indexOf(eng.status) + 1) / phases.length) * 100
                    );
                    return (
                      <TableRow key={eng._id} hover>
                        <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {eng.engagementNumber}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                          {eng.title}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          {auditTypeMap[eng.auditType] || eng.auditType}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          {eng.team?.length || 0} عضو
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Chip
                              label={eng.findings?.length || 0}
                              size="small"
                              variant="outlined"
                            />
                            {eng.findings?.filter(f => f.severity === 'critical').length > 0 && (
                              <Chip
                                label={`${eng.findings.filter(f => f.severity === 'critical').length} حرج`}
                                sx={{ bgcolor: '#D32F2F', color: '#fff' }}
                                size="small"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', minWidth: 130 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                              color={progress === 100 ? 'success' : 'primary'}
                            />
                            <Typography variant="caption">{progress}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Chip
                            label={st.label || eng.status}
                            sx={{ bgcolor: st.color, color: '#fff' }}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {engagements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                        لا توجد مهام تدقيق
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
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'right', mb: 2 }}>
                جميع النتائج
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: surfaceColors.sectionBg }}>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>مهمة التدقيق</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>العنوان</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الخطورة</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>المعيار</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {engagements.flatMap(eng =>
                    (eng.findings || []).map((f, i) => (
                      <TableRow key={`${eng._id}-${i}`} hover>
                        <TableCell sx={{ textAlign: 'right' }}>{eng.title}</TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                          {f.title}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Chip
                            label={severityMap[f.severity]?.label || f.severity}
                            sx={{ bgcolor: severityMap[f.severity]?.color, color: '#fff' }}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>{f.criteria || '-'}</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Chip
                            label={
                              f.status === 'resolved'
                                ? 'تم الحل'
                                : f.status === 'accepted'
                                  ? 'مقبول'
                                  : 'مفتوح'
                            }
                            sx={{
                              bgcolor:
                                f.status === 'resolved'
                                  ? '#4CAF50'
                                  : f.status === 'accepted'
                                    ? '#2196F3'
                                    : '#FF9800',
                              color: '#fff',
                            }}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {engagements.flatMap(e => e.findings || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                        لا توجد نتائج
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
            {engagements
              .filter(e => e.auditOpinion?.opinion)
              .map(eng => {
                const op = opinionMap[eng.auditOpinion.opinion] || {};
                return (
                  <Grid item xs={12} md={6} key={eng._id}>
                    <Card
                      sx={{ borderRadius: 3, p: 3, borderRight: `4px solid ${op.color || '#ccc'}` }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 2,
                        }}
                      >
                        <Chip
                          label={op.label || eng.auditOpinion.opinion}
                          sx={{ bgcolor: op.color, color: '#fff', fontWeight: 700 }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'right' }}>
                          {eng.title}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ textAlign: 'right', color: neutralColors.textSecondary, mb: 1 }}
                      >
                        {auditTypeMap[eng.auditType] || eng.auditType} — {eng.engagementNumber}
                      </Typography>
                      {eng.auditOpinion.basisForOpinion && (
                        <Typography variant="body2" sx={{ textAlign: 'right', mt: 1 }}>
                          <strong>أساس الرأي:</strong> {eng.auditOpinion.basisForOpinion}
                        </Typography>
                      )}
                      {eng.auditOpinion.keyAuditMatters?.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                            أمور التدقيق الرئيسية:
                          </Typography>
                          {eng.auditOpinion.keyAuditMatters.map((m, i) => (
                            <Typography
                              key={i}
                              variant="body2"
                              sx={{ textAlign: 'right', color: neutralColors.textSecondary }}
                            >
                              • {m}
                            </Typography>
                          ))}
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Gavel sx={{ fontSize: 16, color: neutralColors.textSecondary, mr: 0.5 }} />
                        <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                          {eng.auditOpinion.issuedDate
                            ? new Date(eng.auditOpinion.issuedDate).toLocaleDateString('ar-SA')
                            : 'لم يصدر بعد'}
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            {engagements.filter(e => e.auditOpinion?.opinion).length === 0 && (
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 3, p: 4 }}>
                  <Typography sx={{ textAlign: 'center', color: neutralColors.textSecondary }}>
                    لا توجد آراء تدقيق صادرة
                  </Typography>
                </Card>
              </Grid>
            )}
          </Grid>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ textAlign: 'right', fontWeight: 700 }}>مهمة تدقيق جديدة</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="عنوان المهمة"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              select
              label="نوع التدقيق"
              value={form.auditType}
              onChange={e => setForm({ ...form, auditType: e.target.value })}
              sx={{ mb: 2 }}
            >
              {Object.entries(auditTypeMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              type="date"
              label="تاريخ البداية"
              value={form['scope.startDate']}
              onChange={e => setForm({ ...form, 'scope.startDate': e.target.value })}
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="date"
              label="تاريخ النهاية"
              value={form['scope.endDate']}
              onChange={e => setForm({ ...form, 'scope.endDate': e.target.value })}
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />
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

export default FinancialAuditManager;
