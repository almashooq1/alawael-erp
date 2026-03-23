/**
 * صفحة تفاصيل المستفيد — BeneficiaryProfilePage
 *
 * Shows detailed view of a single beneficiary:
 * - Personal info, contact, family, disability, medical
 * - Progress history with chart
 * - Documents, assessments
 * - Edit mode toggle
 *
 * @version 1.0.0
 * @date 2026-03-22
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Grid, Paper, Button, Chip,
  TextField, MenuItem, Divider, Avatar, IconButton, Tab, Tabs,
  LinearProgress, Stack, Alert, Tooltip, Skeleton,
} from '@mui/material';
import {
  ArrowBack, Edit, Save, Cancel, Person, Phone, Email,
  School, LocalHospital, Accessibility, FamilyRestroom as Family,
  Assignment, TrendingUp, Description, History,
} from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, brandColors, statusColors } from '../../theme/palette';
import beneficiaryService from '../../services/beneficiaryService';
import logger from '../../utils/logger';

const STATUS_LABELS = { active: 'نشط', inactive: 'غير نشط', pending: 'قيد الانتظار', transferred: 'محوّل', graduated: 'متخرج' };
const STATUS_COLORS = { active: 'success', inactive: 'error', pending: 'warning', transferred: 'info', graduated: 'secondary' };
const CATEGORY_LABELS = { physical: 'حركية', mental: 'ذهنية', sensory: 'حسية', multiple: 'متعددة', learning: 'تعلم', speech: 'نطق', other: 'أخرى' };
const GENDER_LABELS = { male: 'ذكر', female: 'أنثى' };

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

function InfoField({ label, value, icon }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      {icon && <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>}
      <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={500}>{value || '—'}</Typography>
      </Box>
    </Box>
  );
}

export default function BeneficiaryProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [beneficiary, setBeneficiary] = useState(null);
  const [progressHistory, setProgressHistory] = useState([]);
  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await beneficiaryService.getById(id);
      const data = res?.data?.data || res?.data || res;
      setBeneficiary(data);
      setProgressHistory(data?.progressHistory || []);
    } catch (err) {
      logger.error('BeneficiaryProfile load error:', err);
      showSnackbar('تعذر تحميل بيانات المستفيد', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showSnackbar]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEdit = () => {
    setEditing(true);
    setEditData({
      firstName: beneficiary?.firstName || beneficiary?.firstName_ar || '',
      lastName: beneficiary?.lastName || beneficiary?.lastName_ar || '',
      firstName_ar: beneficiary?.firstName_ar || beneficiary?.firstName || '',
      lastName_ar: beneficiary?.lastName_ar || beneficiary?.lastName || '',
      email: beneficiary?.email || beneficiary?.contactInfo?.email || '',
      phone: beneficiary?.phone || beneficiary?.contactInfo?.primaryPhone || '',
      gender: beneficiary?.gender || '',
      status: beneficiary?.status || 'active',
      category: beneficiary?.category || beneficiary?.disability?.type || '',
      dateOfBirth: beneficiary?.dateOfBirth ? new Date(beneficiary.dateOfBirth).toISOString().slice(0, 10) : '',
      nationalId: beneficiary?.nationalId || '',
      generalNotes: beneficiary?.generalNotes || '',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await beneficiaryService.update(id, editData);
      showSnackbar('تم تحديث بيانات المستفيد بنجاح', 'success');
      setEditing(false);
      loadData();
    } catch (err) {
      showSnackbar('فشل في حفظ التعديلات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await beneficiaryService.updateStatus(id, newStatus);
      showSnackbar('تم تحديث الحالة', 'success');
      loadData();
    } catch {
      showSnackbar('فشل في تحديث الحالة', 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من أرشفة هذا المستفيد؟')) return;
    try {
      await beneficiaryService.remove(id, 'أرشفة من صفحة التفاصيل');
      showSnackbar('تم أرشفة المستفيد', 'success');
      navigate('/beneficiary-portal/management');
    } catch {
      showSnackbar('فشل في الأرشفة', 'error');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3, mb: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3].map(i => (
            <Grid item xs={12} md={4} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (!beneficiary) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">لم يتم العثور على المستفيد</Alert>
        <Button onClick={() => navigate(-1)} startIcon={<ArrowBack />} sx={{ mt: 2 }}>العودة</Button>
      </Container>
    );
  }

  const b = beneficiary;
  const fullName = b.fullName || b.name || `${b.firstName_ar || b.firstName || ''} ${b.lastName_ar || b.lastName || ''}`;
  const age = b.age || (b.dateOfBirth ? Math.floor((Date.now() - new Date(b.dateOfBirth)) / (365.25 * 24 * 3600 * 1000)) : null);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Paper sx={{ background: gradients.accent, borderRadius: 3, p: 3, mb: 3, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'white' }}>
            <ArrowBack />
          </IconButton>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.2)', fontSize: 28 }}>
            {fullName.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight="bold">{fullName}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Chip label={STATUS_LABELS[b.status] || b.status} size="small" color={STATUS_COLORS[b.status] || 'default'} sx={{ fontWeight: 600 }} />
              {b.category && <Chip label={CATEGORY_LABELS[b.category] || b.category} size="small" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }} />}
              {age !== null && <Chip label={`${age} سنة`} size="small" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }} />}
              {b.nationalId && <Chip label={`هوية: ${b.nationalId}`} size="small" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }} />}
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            {!editing ? (
              <>
                <Button variant="contained" color="inherit" startIcon={<Edit />} sx={{ color: brandColors.primaryStart }} onClick={handleEdit}>تعديل</Button>
                <Button variant="outlined" color="inherit" onClick={handleDelete}>أرشفة</Button>
              </>
            ) : (
              <>
                <Button variant="contained" color="inherit" startIcon={<Save />} sx={{ color: brandColors.primaryStart }} onClick={handleSave} disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
                <Button variant="outlined" color="inherit" startIcon={<Cancel />} onClick={() => setEditing(false)}>إلغاء</Button>
              </>
            )}
          </Stack>
        </Box>
      </Paper>

      {/* Progress Bar */}
      {b.progress > 0 && (
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight={600}>التقدم الإجمالي</Typography>
            <Typography variant="body2" fontWeight={600} color="primary">{b.progress || 0}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={b.progress || 0} sx={{ height: 10, borderRadius: 5 }} />
        </Paper>
      )}

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<Person />} label="معلومات شخصية" iconPosition="start" />
          <Tab icon={<TrendingUp />} label="التقدم والأداء" iconPosition="start" />
          <Tab icon={<LocalHospital />} label="طبي وتعليمي" iconPosition="start" />
          <Tab icon={<Description />} label="مستندات" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: Personal Info */}
      <TabPanel value={tab} index={0}>
        {editing ? (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>تعديل البيانات الشخصية</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="الاسم الأول (عربي)" value={editData.firstName_ar} onChange={e => setEditData(p => ({ ...p, firstName_ar: e.target.value, firstName: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="اسم العائلة (عربي)" value={editData.lastName_ar} onChange={e => setEditData(p => ({ ...p, lastName_ar: e.target.value, lastName: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="البريد الإلكتروني" value={editData.email} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="الهاتف" value={editData.phone} onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="تاريخ الميلاد" type="date" InputLabelProps={{ shrink: true }} value={editData.dateOfBirth} onChange={e => setEditData(p => ({ ...p, dateOfBirth: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth select label="الجنس" value={editData.gender} onChange={e => setEditData(p => ({ ...p, gender: e.target.value }))}>
                  <MenuItem value="male">ذكر</MenuItem>
                  <MenuItem value="female">أنثى</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="رقم الهوية" value={editData.nationalId} onChange={e => setEditData(p => ({ ...p, nationalId: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="الحالة" value={editData.status} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="نوع الإعاقة" value={editData.category} onChange={e => setEditData(p => ({ ...p, category: e.target.value }))}>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={3} label="ملاحظات عامة" value={editData.generalNotes} onChange={e => setEditData(p => ({ ...p, generalNotes: e.target.value }))} />
              </Grid>
            </Grid>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                  <Person sx={{ verticalAlign: 'middle', mr: 1 }} /> المعلومات الشخصية
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <InfoField label="الاسم الكامل" value={fullName} />
                <InfoField label="الجنس" value={GENDER_LABELS[b.gender] || b.gender} />
                <InfoField label="تاريخ الميلاد" value={b.dateOfBirth ? new Date(b.dateOfBirth).toLocaleDateString('ar-SA') : null} />
                <InfoField label="العمر" value={age ? `${age} سنة` : null} />
                <InfoField label="رقم الهوية" value={b.nationalId} />
                <InfoField label="رقم الملف الطبي" value={b.mrn} />
                <InfoField label="الجنسية" value={b.nationality} />
                <InfoField label="فصيلة الدم" value={b.bloodType} />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                  <Phone sx={{ verticalAlign: 'middle', mr: 1 }} /> معلومات الاتصال
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <InfoField label="الهاتف" value={b.contactInfo?.primaryPhone || b.phone} icon={<Phone fontSize="small" />} />
                <InfoField label="هاتف بديل" value={b.contactInfo?.alternatePhone} />
                <InfoField label="البريد الإلكتروني" value={b.contactInfo?.email || b.email} icon={<Email fontSize="small" />} />
                <InfoField label="المدينة" value={b.address?.city} />
                <InfoField label="الحي" value={b.address?.district} />
                <InfoField label="العنوان" value={b.address?.street} />
              </Paper>
            </Grid>

            {/* Disability Info */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                  <Accessibility sx={{ verticalAlign: 'middle', mr: 1 }} /> معلومات الإعاقة
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <InfoField label="نوع الإعاقة" value={CATEGORY_LABELS[b.category || b.disability?.type] || b.category || b.disability?.type} />
                <InfoField label="الشدة" value={b.disability?.severity} />
                <InfoField label="الوصف" value={b.disability?.description} />
                <InfoField label="تاريخ التشخيص" value={b.disability?.diagnosisDate ? new Date(b.disability.diagnosisDate).toLocaleDateString('ar-SA') : null} />
                <InfoField label="جهة التشخيص" value={b.disability?.diagnosedBy} />
              </Paper>
            </Grid>

            {/* Emergency Contacts */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                  <Family sx={{ verticalAlign: 'middle', mr: 1 }} /> جهات الاتصال الطارئة
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {(b.emergencyContacts || []).length > 0
                  ? b.emergencyContacts.map((ec, i) => (
                    <Box key={i} sx={{ mb: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{ec.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{ec.relationship} — {ec.phone}</Typography>
                    </Box>
                  ))
                  : <Typography variant="body2" color="text.secondary">لا توجد جهات اتصال طارئة</Typography>
                }
              </Paper>
            </Grid>

            {/* Notes */}
            {b.generalNotes && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>ملاحظات عامة</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2">{b.generalNotes}</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 1: Progress */}
      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          {/* KPIs */}
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={700} color="primary">{b.academicScore || b.latestProgress?.academicScore || 0}</Typography>
              <Typography variant="caption" color="text.secondary">الدرجة الأكاديمية</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={700} color={statusColors.success}>{b.attendanceRate || b.latestProgress?.attendanceRate || 0}%</Typography>
              <Typography variant="caption" color="text.secondary">نسبة الحضور</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={700} color={statusColors.info}>{b.behaviorRating || b.latestProgress?.behaviorRating || 0}/10</Typography>
              <Typography variant="caption" color="text.secondary">تقييم السلوك</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={700} color={statusColors.warning}>{b.sessions || 0}</Typography>
              <Typography variant="caption" color="text.secondary">الجلسات</Typography>
            </Paper>
          </Grid>

          {/* Progress Chart */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>مسار التقدم</Typography>
              {progressHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[...progressHistory].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <RTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="academicScore" stroke={brandColors.primaryStart} strokeWidth={2} name="الدرجة الأكاديمية" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="attendanceRate" stroke={statusColors.success} strokeWidth={2} name="الحضور" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="behaviorRating" stroke={statusColors.info} strokeWidth={2} name="السلوك (×10)" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <History sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>لا يوجد سجل تقدم بعد</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Progress History Table */}
          {progressHistory.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>سجل الأداء الشهري</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                        <th style={{ textAlign: 'right', padding: '8px' }}>الشهر</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>الدرجة</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>الحضور</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>السلوك</th>
                        <th style={{ textAlign: 'center', padding: '8px' }}>الأداء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progressHistory.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '8px' }}>{p.month}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{p.academicScore}</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{p.attendanceRate}%</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>{p.behaviorRating}/10</td>
                          <td style={{ textAlign: 'center', padding: '8px' }}>
                            <Chip
                              size="small"
                              label={p.overallPerformance === 'excellent' ? 'ممتاز' : p.overallPerformance === 'good' ? 'جيد' : p.overallPerformance === 'satisfactory' ? 'مقبول' : 'يحتاج تحسين'}
                              color={p.overallPerformance === 'excellent' ? 'success' : p.overallPerformance === 'good' ? 'primary' : p.overallPerformance === 'satisfactory' ? 'warning' : 'error'}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Tab 2: Medical & Education */}
      <TabPanel value={tab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                <LocalHospital sx={{ verticalAlign: 'middle', mr: 1 }} /> المعلومات الطبية
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <InfoField label="الحالات الصحية" value={(b.medicalInfo?.conditions || []).join('، ') || null} />
              <InfoField label="الحساسية" value={(b.medicalInfo?.allergies || []).join('، ') || null} />
              <InfoField label="الطبيب المعالج" value={b.medicalInfo?.physicianName} />
              <InfoField label="هاتف الطبيب" value={b.medicalInfo?.physicianPhone} />
              <InfoField label="المستشفى" value={b.medicalInfo?.hospitalName} />
              {b.medicalInfo?.medications?.length > 0 && (
                <>
                  <Typography variant="caption" color="text.secondary">الأدوية:</Typography>
                  {b.medicalInfo.medications.map((m, i) => (
                    <Chip key={i} label={`${m.name} - ${m.dosage}`} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                <School sx={{ verticalAlign: 'middle', mr: 1 }} /> المعلومات التعليمية
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <InfoField label="المستوى الحالي" value={b.educationInfo?.currentLevel || b.currentLevel} />
              <InfoField label="الصف" value={b.educationInfo?.gradeLevel} />
              <InfoField label="المدرسة" value={b.educationInfo?.school} />
              <InfoField label="خطة تعليمية فردية" value={b.educationInfo?.specialEducationPlan ? 'نعم' : 'لا'} />
              {b.educationInfo?.iepDetails && <InfoField label="تفاصيل IEP" value={b.educationInfo.iepDetails} />}
            </Paper>
          </Grid>

          {/* Insurance */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>التأمين الصحي</Typography>
              <Divider sx={{ mb: 2 }} />
              <InfoField label="مؤمن عليه" value={b.insuranceInfo?.hasInsurance ? 'نعم' : 'لا'} />
              {b.insuranceInfo?.hasInsurance && (
                <>
                  <InfoField label="شركة التأمين" value={b.insuranceInfo?.provider} />
                  <InfoField label="رقم البوليصة" value={b.insuranceInfo?.policyNumber} />
                  <InfoField label="نوع التغطية" value={b.insuranceInfo?.coverageType} />
                  <InfoField label="انتهاء التغطية" value={b.insuranceInfo?.coverageEndDate ? new Date(b.insuranceInfo.coverageEndDate).toLocaleDateString('ar-SA') : null} />
                </>
              )}
            </Paper>
          </Grid>

          {/* Accessibility */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                <Accessibility sx={{ verticalAlign: 'middle', mr: 1 }} /> احتياجات خاصة
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <InfoField label="كرسي متحرك" value={b.accessibility?.needsWheelchair ? 'نعم' : 'لا'} />
              <InfoField label="مترجم إشارة" value={b.accessibility?.needsSignInterpreter ? 'نعم' : 'لا'} />
              <InfoField label="برايل" value={b.accessibility?.needsBraille ? 'نعم' : 'لا'} />
              <InfoField label="جهاز مساعد" value={b.accessibility?.needsAssistiveDevice ? 'نعم' : 'لا'} />
              {b.accessibility?.assistiveDeviceDetails && <InfoField label="تفاصيل الجهاز" value={b.accessibility.assistiveDeviceDetails} />}
              {b.accessibility?.specialInstructions && <InfoField label="تعليمات خاصة" value={b.accessibility.specialInstructions} />}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 3: Documents */}
      <TabPanel value={tab} index={3}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            <Description sx={{ verticalAlign: 'middle', mr: 1 }} /> المستندات
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {(b.documents || []).length > 0 ? (
            <Grid container spacing={2}>
              {b.documents.map((doc, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Description color="primary" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{doc.title || doc.fileName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {doc.category || ''} — {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString('ar-SA') : ''}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Description sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>لا توجد مستندات</Typography>
            </Box>
          )}
        </Paper>
      </TabPanel>
    </Container>
  );
}
