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
  IconButton,
  Tooltip,
  Grid,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Shield,
  Refresh,
  Add,
  CheckCircle,
  Error,
  Warning,
  Gavel,
  VerifiedUser,
  BugReport,
  Assessment,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const controlStatusMap = {
  active: { label: 'نشط', color: '#4CAF50' },
  inactive: { label: 'غير نشط', color: '#9E9E9E' },
  under_review: { label: 'تحت المراجعة', color: '#2196F3' },
  remediation: { label: 'معالجة', color: '#FF9800' },
};
const effectiveMap = {
  effective: { label: 'فعّال', color: '#4CAF50', icon: <CheckCircle /> },
  partially_effective: { label: 'فعّال جزئياً', color: '#FF9800', icon: <Warning /> },
  ineffective: { label: 'غير فعّال', color: '#F44336', icon: <Error /> },
  not_tested: { label: 'لم يُختبر', color: '#9E9E9E', icon: <BugReport /> },
};
const compStatusMap = {
  compliant: { label: 'ممتثل', color: '#4CAF50' },
  non_compliant: { label: 'غير ممتثل', color: '#F44336' },
  partially_compliant: { label: 'ممتثل جزئياً', color: '#FF9800' },
  pending_review: { label: 'قيد المراجعة', color: '#2196F3' },
  remediation: { label: 'معالجة', color: '#9C27B0' },
};
const regulatorMap = {
  ZATCA: 'هيئة الزكاة والضريبة والجمارك',
  SAMA: 'البنك المركزي السعودي',
  CMA: 'هيئة السوق المالية',
  GOSI: 'التأمينات الاجتماعية',
  MOL: 'وزارة العمل',
  MOCI: 'وزارة التجارة',
  SOCPA: 'الهيئة السعودية للمراجعين والمحاسبين',
};

const ComplianceControls = () => {
  const [tab, setTab] = useState(0);
  const [controls, setControls] = useState([]);
  const [compItems, setCompItems] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [controlDialog, setControlDialog] = useState(false);
  const [compDialog, setCompDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [controlForm, setControlForm] = useState({
    controlName: '',
    controlArea: 'financial_reporting',
    controlType: 'preventive',
    description: '',
    riskLevel: 'medium',
  });
  const [compForm, setCompForm] = useState({
    regulatoryBody: 'ZATCA',
    requirementName: '',
    description: '',
    dueDate: '',
    priority: 'high',
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, iRes, dRes] = await Promise.all([
        fetch(`${API}/finance/ultimate/internal-controls`, { headers }),
        fetch(`${API}/finance/ultimate/compliance-items`, { headers }),
        fetch(`${API}/finance/ultimate/compliance/dashboard`, { headers }),
      ]);
      const cData = await cRes.json();
      const iData = await iRes.json();
      const dData = await dRes.json();
      if (cData.success) setControls(cData.data);
      if (iData.success) setCompItems(iData.data);
      if (dData.success) setDashboard(dData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateControl = async () => {
    try {
      const res = await fetch(`${API}/finance/ultimate/internal-controls`, {
        method: 'POST',
        headers,
        body: JSON.stringify(controlForm),
      });
      const data = await res.json();
      if (data.success) {
        setControlDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateComp = async () => {
    try {
      const res = await fetch(`${API}/finance/ultimate/compliance-items`, {
        method: 'POST',
        headers,
        body: JSON.stringify(compForm),
      });
      const data = await res.json();
      if (data.success) {
        setCompDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestControl = async id => {
    try {
      await fetch(`${API}/finance/ultimate/internal-controls/${id}/test`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ result: 'effective', notes: 'اختبار تلقائي' }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompStatus = async (id, status) => {
    try {
      await fetch(`${API}/finance/ultimate/compliance-items/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
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

  const nonCompliant = compItems.filter(c => c.status === 'non_compliant');
  const ineffective = controls.filter(c => c.effectiveness === 'ineffective');

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700} color={neutralColors.textPrimary}>
          <Shield sx={{ mr: 1, verticalAlign: 'middle' }} />
          الامتثال والرقابة الداخلية
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchData}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<Add />} onClick={() => setCompDialog(true)}>
            بند امتثال
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setControlDialog(true)}
            sx={{ bgcolor: brandColors.primary, '&:hover': { bgcolor: brandColors.primaryDark } }}
          >
            رقابة جديدة
          </Button>
        </Box>
      </Box>

      {(nonCompliant.length > 0 || ineffective.length > 0) && (
        <Box mb={2}>
          {nonCompliant.length > 0 && (
            <Alert severity="error" icon={<Gavel />} sx={{ mb: 1 }}>
              <strong>{nonCompliant.length} بنود غير ممتثلة</strong> — تحتاج إجراء فوري
            </Alert>
          )}
          {ineffective.length > 0 && (
            <Alert severity="warning" icon={<Warning />}>
              <strong>{ineffective.length} ضوابط غير فعّالة</strong> — تحتاج معالجة
            </Alert>
          )}
        </Box>
      )}

      {dashboard && (
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'إجمالي الضوابط',
              value: dashboard.totalControls,
              color: '#2196F3',
              icon: <Shield />,
            },
            {
              label: 'ضوابط فعّالة',
              value: dashboard.effectiveControls,
              color: '#4CAF50',
              icon: <VerifiedUser />,
            },
            {
              label: 'بنود الامتثال',
              value: dashboard.totalCompItems,
              color: '#FF9800',
              icon: <Gavel />,
            },
            {
              label: 'نسبة الامتثال',
              value: `${dashboard.complianceRate}%`,
              color: '#8BC34A',
              icon: <Assessment />,
            },
            { label: 'غير ممتثل', value: nonCompliant.length, color: '#F44336', icon: <Error /> },
            {
              label: 'نسبة الفعالية',
              value: `${dashboard.effectivenessRate}%`,
              color: '#9C27B0',
              icon: <CheckCircle />,
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
        <Tab label="الرقابة الداخلية" icon={<Shield />} iconPosition="start" />
        <Tab label="بنود الامتثال" icon={<Gavel />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم الضابط',
                    'الاسم',
                    'المجال',
                    'النوع',
                    'المخاطر',
                    'الفعالية',
                    'آخر اختبار',
                    'الحالة',
                    'إجراءات',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {controls.map(c => {
                  const st = controlStatusMap[c.status] || controlStatusMap.active;
                  const eff = effectiveMap[c.effectiveness] || effectiveMap.not_tested;
                  return (
                    <TableRow key={c._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {c.controlNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{c.controlName}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{c.controlArea}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {c.controlType === 'preventive'
                          ? 'وقائي'
                          : c.controlType === 'detective'
                            ? 'كشفي'
                            : 'تصحيحي'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={
                            c.riskLevel === 'high'
                              ? 'مرتفع'
                              : c.riskLevel === 'medium'
                                ? 'متوسط'
                                : 'منخفض'
                          }
                          size="small"
                          sx={{
                            bgcolor:
                              c.riskLevel === 'high'
                                ? '#F4433620'
                                : c.riskLevel === 'medium'
                                  ? '#FF980020'
                                  : '#4CAF5020',
                            color:
                              c.riskLevel === 'high'
                                ? '#F44336'
                                : c.riskLevel === 'medium'
                                  ? '#FF9800'
                                  : '#4CAF50',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          icon={eff.icon}
                          label={eff.label}
                          size="small"
                          sx={{ bgcolor: `${eff.color}20`, color: eff.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {c.lastTestDate
                          ? new Date(c.lastTestDate).toLocaleDateString('ar-SA')
                          : 'لم يُختبر'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Tooltip title="اختبار الضابط">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleTestControl(c._id)}
                          >
                            <BugReport fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {controls.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد ضوابط رقابية
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
                    'رقم البند',
                    'الجهة',
                    'المتطلب',
                    'الأولوية',
                    'تاريخ الاستحقاق',
                    'الحالة',
                    'إجراءات',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {compItems.map(ci => {
                  const st = compStatusMap[ci.status] || compStatusMap.pending_review;
                  const overdue =
                    ci.dueDate && new Date(ci.dueDate) < new Date() && ci.status !== 'compliant';
                  return (
                    <TableRow
                      key={ci._id}
                      hover
                      sx={{ bgcolor: overdue ? '#F4433608' : 'inherit' }}
                    >
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {ci.complianceNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={regulatorMap[ci.regulatoryBody] || ci.regulatoryBody}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{ci.requirementName}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={
                            ci.priority === 'critical'
                              ? 'حرج'
                              : ci.priority === 'high'
                                ? 'عالي'
                                : ci.priority === 'medium'
                                  ? 'متوسط'
                                  : 'منخفض'
                          }
                          size="small"
                          sx={{
                            bgcolor:
                              ci.priority === 'critical'
                                ? '#D32F2F20'
                                : ci.priority === 'high'
                                  ? '#F4433620'
                                  : '#FF980020',
                            color:
                              ci.priority === 'critical'
                                ? '#D32F2F'
                                : ci.priority === 'high'
                                  ? '#F44336'
                                  : '#FF9800',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{ textAlign: 'right', color: overdue ? '#F44336' : 'inherit' }}
                      >
                        {ci.dueDate ? new Date(ci.dueDate).toLocaleDateString('ar-SA') : '-'}
                        {overdue && ' ⚠️'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="ممتثل">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleCompStatus(ci._id, 'compliant')}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="غير ممتثل">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleCompStatus(ci._id, 'non_compliant')}
                            >
                              <Error fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {compItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد بنود امتثال
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Create Control Dialog */}
      <Dialog open={controlDialog} onClose={() => setControlDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>ضابط رقابي جديد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="اسم الضابط"
              value={controlForm.controlName}
              onChange={e => setControlForm({ ...controlForm, controlName: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="المجال"
              value={controlForm.controlArea}
              onChange={e => setControlForm({ ...controlForm, controlArea: e.target.value })}
              fullWidth
            >
              <MenuItem value="financial_reporting">التقارير المالية</MenuItem>
              <MenuItem value="treasury">الخزينة</MenuItem>
              <MenuItem value="procurement">المشتريات</MenuItem>
              <MenuItem value="payroll">الرواتب</MenuItem>
              <MenuItem value="tax">الضرائب</MenuItem>
              <MenuItem value="it_general">تقنية المعلومات</MenuItem>
            </TextField>
            <TextField
              select
              label="النوع"
              value={controlForm.controlType}
              onChange={e => setControlForm({ ...controlForm, controlType: e.target.value })}
              fullWidth
            >
              <MenuItem value="preventive">وقائي</MenuItem>
              <MenuItem value="detective">كشفي</MenuItem>
              <MenuItem value="corrective">تصحيحي</MenuItem>
            </TextField>
            <TextField
              select
              label="مستوى المخاطر"
              value={controlForm.riskLevel}
              onChange={e => setControlForm({ ...controlForm, riskLevel: e.target.value })}
              fullWidth
            >
              <MenuItem value="low">منخفض</MenuItem>
              <MenuItem value="medium">متوسط</MenuItem>
              <MenuItem value="high">مرتفع</MenuItem>
            </TextField>
            <TextField
              label="الوصف"
              value={controlForm.description}
              onChange={e => setControlForm({ ...controlForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setControlDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateControl}
            sx={{ bgcolor: brandColors.primary }}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Compliance Item Dialog */}
      <Dialog open={compDialog} onClose={() => setCompDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>بند امتثال جديد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              select
              label="الجهة الرقابية"
              value={compForm.regulatoryBody}
              onChange={e => setCompForm({ ...compForm, regulatoryBody: e.target.value })}
              fullWidth
            >
              {Object.entries(regulatorMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="اسم المتطلب"
              value={compForm.requirementName}
              onChange={e => setCompForm({ ...compForm, requirementName: e.target.value })}
              fullWidth
            />
            <TextField
              label="الوصف"
              value={compForm.description}
              onChange={e => setCompForm({ ...compForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="تاريخ الاستحقاق"
              type="date"
              value={compForm.dueDate}
              onChange={e => setCompForm({ ...compForm, dueDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="الأولوية"
              value={compForm.priority}
              onChange={e => setCompForm({ ...compForm, priority: e.target.value })}
              fullWidth
            >
              <MenuItem value="critical">حرج</MenuItem>
              <MenuItem value="high">عالي</MenuItem>
              <MenuItem value="medium">متوسط</MenuItem>
              <MenuItem value="low">منخفض</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateComp}
            sx={{ bgcolor: brandColors.primary }}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ComplianceControls;
