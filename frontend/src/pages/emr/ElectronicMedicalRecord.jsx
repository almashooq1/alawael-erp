import React, { useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Tabs, Tab, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, Alert, Avatar, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, IconButton, Grid, Divider, Badge, Tooltip
} from '@mui/material';
import {
  LocalHospital, Healing, Science, Medication, Vaccines, TransferWithinAStation,
  Add, Search, Warning, CheckCircle, Schedule, Cancel, AccessTime,
  TrendingUp, TrendingDown, RemoveRedEye
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend } from 'recharts';

const TABS = [
  { id: 'prescriptions', label: 'الوصفات الطبية', icon: <Healing /> },
  { id: 'vitals', label: 'العلامات الحيوية', icon: <LocalHospital /> },
  { id: 'labs', label: 'التحاليل', icon: <Science /> },
  { id: 'medications', label: 'الأدوية', icon: <Medication /> },
  { id: 'immunizations', label: 'التطعيمات', icon: <Vaccines /> },
  { id: 'referrals', label: 'التحويلات', icon: <TransferWithinAStation /> },
];

const BENEFICIARIES = [
  { id: 'b1', name: 'أحمد محمد السالم', age: 12, gender: 'male', diagnosis: 'توحد خفيف', allergies: ['بنسلين', 'فستق'], currentMedications: ['ميثيلفينيديت 10 مجم', 'أوميغا-3'] },
  { id: 'b2', name: 'سارة عبدالله العتيبي', age: 9, gender: 'female', diagnosis: 'شلل دماغي متوسط', allergies: ['حليب البقر'], currentMedications: ['باكلوفين 5 مجم'] },
  { id: 'b3', name: 'خالد سعد الفهد', age: 15, gender: 'male', diagnosis: 'متلازمة داون', allergies: [], currentMedications: ['ليفوثيروكسين 50 ميكروغرام'] },
  { id: 'b4', name: 'نورة فهد المطيري', age: 7, gender: 'female', diagnosis: 'تأخر النمو', allergies: ['بيض'], currentMedications: ['فيتامين د'] },
];

const PRESCRIPTIONS = [
  { id: 'rx1', beneficiaryId: 'b1', medications: [{ name: 'ميثيلفينيديت', dosage: '10 مجم', frequency: 'مرتين يومياً', duration: '30 يوم' }], prescribedDate: '2025-06-20', status: 'active', prescribedBy: 'د. ياسر' },
  { id: 'rx2', beneficiaryId: 'b1', medications: [{ name: 'أوميغا-3', dosage: '1000 مجم', frequency: 'مرة يومياً', duration: '60 يوم' }], prescribedDate: '2025-06-15', status: 'active', prescribedBy: 'د. ياسر' },
];

const VITALS = [
  { beneficiaryId: 'b1', recordedAt: '2025-06-27', bloodPressure: { systolic: 110, diastolic: 70 }, heartRate: 82, temperature: { value: 36.7 }, painLevel: { score: 2 } },
  { beneficiaryId: 'b1', recordedAt: '2025-06-26', bloodPressure: { systolic: 112, diastolic: 72 }, heartRate: 78, temperature: { value: 36.5 }, painLevel: { score: 1 } },
  { beneficiaryId: 'b1', recordedAt: '2025-06-25', bloodPressure: { systolic: 108, diastolic: 68 }, heartRate: 85, temperature: { value: 36.8 }, painLevel: { score: 3 } },
  { beneficiaryId: 'b1', recordedAt: '2025-06-24', bloodPressure: { systolic: 115, diastolic: 75 }, heartRate: 80, temperature: { value: 37.0 }, painLevel: { score: 0 } },
  { beneficiaryId: 'b1', recordedAt: '2025-06-23', bloodPressure: { systolic: 110, diastolic: 70 }, heartRate: 76, temperature: { value: 36.6 }, painLevel: { score: 1 } },
];

const LABS = [
  { beneficiaryId: 'b1', testName: 'صورة دم كاملة', orderedDate: '2025-06-20', overallStatus: 'completed', parameters: [
    { parameter: 'Hb', value: '11.5', unit: 'g/dL', referenceRange: '11.5-15.5', flag: 'normal' },
    { parameter: 'WBC', value: '7.2', unit: 'x10^9/L', referenceRange: '4.5-11.0', flag: 'normal' },
    { parameter: 'Platelets', value: '320', unit: 'x10^9/L', referenceRange: '150-450', flag: 'normal' },
  ]},
  { beneficiaryId: 'b1', testName: 'وظائف الكبد', orderedDate: '2025-06-18', overallStatus: 'completed', parameters: [
    { parameter: 'ALT', value: '35', unit: 'U/L', referenceRange: '7-56', flag: 'normal' },
    { parameter: 'AST', value: '42', unit: 'U/L', referenceRange: '10-40', flag: 'high' },
  ]},
];

const MEDS = [
  { beneficiaryId: 'b1', medicationName: 'ميثيلفينيديت', dosage: '10 مجم', scheduledTime: '08:00', status: 'administered', administeredBy: 'ممرضة ندى' },
  { beneficiaryId: 'b1', medicationName: 'أوميغا-3', dosage: '1000 مجم', scheduledTime: '12:00', status: 'administered', administeredBy: 'ممرضة ندى' },
  { beneficiaryId: 'b1', medicationName: 'ميثيلفينيديت', dosage: '10 مجم', scheduledTime: '14:00', status: 'scheduled', administeredBy: '' },
  { beneficiaryId: 'b1', medicationName: 'أوميغا-3', dosage: '1000 مجم', scheduledTime: '20:00', status: 'scheduled', administeredBy: '' },
];

const IMMUNIZATIONS = [
  { beneficiaryId: 'b1', vaccine: { name: 'MMR' }, dateAdministered: '2020-03-15', doseNumber: 2, status: 'completed' },
  { beneficiaryId: 'b1', vaccine: { name: 'الإنفلونزا الموسمية' }, dateAdministered: '2024-11-10', doseNumber: 1, status: 'completed' },
];

const REFERRALS = [
  { beneficiaryId: 'b1', referralNumber: 'REF-001', referralType: 'specialist', reason: 'تقييم أعصاب', status: 'pending', urgency: 'routine', referralDate: '2025-06-20' },
  { beneficiaryId: 'b1', referralNumber: 'REF-002', referralType: 'diagnostic', reason: 'تخطيط EEG', status: 'scheduled', urgency: 'routine', referralDate: '2025-06-18' },
];

function getStatusChip(status) {
  const map = {
    active: { color: 'success', label: 'نشطة' },
    completed: { color: 'success', label: 'مكتمل' },
    pending: { color: 'warning', label: 'معلق' },
    scheduled: { color: 'info', label: 'مجدول' },
    administered: { color: 'success', label: 'تم الإعطاء' },
    refused: { color: 'error', label: 'مرفوض' },
    missed: { color: 'error', label: 'فائت' },
    in_progress: { color: 'info', label: 'قيد التنفيذ' },
    cancelled: { color: 'default', label: 'ملغى' },
  };
  const s = map[status] || { color: 'default', label: status };
  return <Chip size="small" color={s.color} label={s.label} />;
}

function getFlagChip(flag) {
  const map = {
    normal: { color: 'success', label: 'طبيعي' },
    low: { color: 'warning', label: 'منخفض' },
    high: { color: 'warning', label: 'مرتفع' },
    critical_low: { color: 'error', label: 'حرج منخفض' },
    critical_high: { color: 'error', label: 'حرج مرتفع' },
    abnormal: { color: 'warning', label: 'غير طبيعي' },
  };
  const s = map[flag] || { color: 'default', label: flag };
  return <Chip size="small" color={s.color} label={s.label} />;
}

export default function ElectronicMedicalRecord() {
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(BENEFICIARIES[0]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('prescriptions');
  const [openRxModal, setOpenRxModal] = useState(false);

  const filteredBeneficiaries = useMemo(() => {
    const q = search.trim();
    if (!q) return BENEFICIARIES;
    return BENEFICIARIES.filter((b) => b.name.includes(q));
  }, [search]);

  const beneficiaryData = useMemo(() => {
    const id = selectedBeneficiary.id;
    return {
      prescriptions: PRESCRIPTIONS.filter((x) => x.beneficiaryId === id),
      vitals: VITALS.filter((x) => x.beneficiaryId === id),
      labs: LABS.filter((x) => x.beneficiaryId === id),
      medications: MEDS.filter((x) => x.beneficiaryId === id),
      immunizations: IMMUNIZATIONS.filter((x) => x.beneficiaryId === id),
      referrals: REFERRALS.filter((x) => x.beneficiaryId === id),
    };
  }, [selectedBeneficiary]);

  const allergyAlert = useMemo(() => {
    if (!selectedBeneficiary.allergies.length) return null;
    return (
      <Alert severity="error" icon={<Warning />} sx={{ mb: 2, borderRadius: 2 }}>
        <strong>تنبيه حساسية:</strong> {selectedBeneficiary.allergies.join(' — ')}
      </Alert>
    );
  }, [selectedBeneficiary]);

  const chartData = useMemo(() => {
    return beneficiaryData.vitals
      .slice()
      .reverse()
      .map((v) => ({
        date: v.recordedAt,
        ضغط_انبساطي: v.bloodPressure?.diastolic || 0,
        ضغط_انقباضي: v.bloodPressure?.systolic || 0,
        النبض: v.heartRate || 0,
        الحرارة: v.temperature?.value || 0,
      }));
  }, [beneficiaryData.vitals]);

  return (
    <Box dir="rtl" sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar beneficiary list */}
      <Box sx={{ width: 300, minWidth: 300, borderLeft: '1px solid #e0e0e0', p: 2, bgcolor: '#fafafa', overflowY: 'auto' }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          السجل الطبي الإلكتروني
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="بحث عن مستفيد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <Search sx={{ ml: 1, color: 'text.secondary' }} /> }}
          sx={{ mb: 2 }}
        />
        {filteredBeneficiaries.map((b) => (
          <Card
            key={b.id}
            onClick={() => setSelectedBeneficiary(b)}
            sx={{
              mb: 1.5,
              cursor: 'pointer',
              borderRadius: 2,
              transition: '0.2s',
              border: selectedBeneficiary.id === b.id ? '2px solid #2e7d32' : '1px solid transparent',
              boxShadow: selectedBeneficiary.id === b.id ? 4 : 1,
              '&:hover': { boxShadow: 3 },
            }}
          >
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: b.gender === 'male' ? '#1976d2' : '#c2185b' }}>
                  {b.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography fontWeight={600} fontSize={14}>{b.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {b.age} سنة — {b.diagnosis}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, p: 3, overflowY: 'auto', bgcolor: '#f5f7fa' }}>
        {/* Summary card */}
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Avatar sx={{ width: 64, height: 64, bgcolor: selectedBeneficiary.gender === 'male' ? '#1976d2' : '#c2185b', fontSize: 28 }}>
                  {selectedBeneficiary.name.charAt(0)}
                </Avatar>
              </Grid>
              <Grid item xs>
                <Typography variant="h5" fontWeight={700}>
                  {selectedBeneficiary.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedBeneficiary.age} سنة | {selectedBeneficiary.gender === 'male' ? 'ذكر' : 'أنثى'} | {selectedBeneficiary.diagnosis}
                </Typography>
              </Grid>
              <Grid item>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip icon={<Healing fontSize="small" />} label={selectedBeneficiary.currentMedications.join(' — ')} color="primary" variant="outlined" />
                  {selectedBeneficiary.allergies.length > 0 && (
                    <Chip icon={<Warning fontSize="small" />} label={`حساسية: ${selectedBeneficiary.allergies.join('، ')}`} color="error" variant="outlined" />
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {allergyAlert}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: 1 }}
        >
          {TABS.map((t) => (
            <Tab key={t.id} value={t.id} icon={t.icon} label={t.label} iconPosition="start" />
          ))}
        </Tabs>

        {/* Prescriptions tab */}
        {tab === 'prescriptions' && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>الوصفات الطبية</Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => setOpenRxModal(true)}>
                وصفة جديدة
              </Button>
            </Box>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                    <TableCell>الدواء</TableCell>
                    <TableCell>الجرعة</TableCell>
                    <TableCell>التكرار</TableCell>
                    <TableCell>المدة</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الطبيب</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {beneficiaryData.prescriptions.map((rx) =>
                    rx.medications.map((med, idx) => (
                      <TableRow key={rx.id + idx} hover>
                        <TableCell>{med.name}</TableCell>
                        <TableCell>{med.dosage}</TableCell>
                        <TableCell>{med.frequency}</TableCell>
                        <TableCell>{med.duration}</TableCell>
                        <TableCell>{rx.prescribedDate}</TableCell>
                        <TableCell>{getStatusChip(rx.status)}</TableCell>
                        <TableCell>{rx.prescribedBy}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Vitals tab */}
        {tab === 'vitals' && (
          <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>العلامات الحيوية</Typography>
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ReTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="ضغط_انقباضي" stroke="#d32f2f" strokeWidth={2} />
                    <Line type="monotone" dataKey="ضغط_انبساطي" stroke="#1976d2" strokeWidth={2} />
                    <Line type="monotone" dataKey="النبض" stroke="#388e3c" strokeWidth={2} />
                    <Line type="monotone" dataKey="الحرارة" stroke="#f57c00" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>الضغط</TableCell>
                    <TableCell>النبض</TableCell>
                    <TableCell>الحرارة</TableCell>
                    <TableCell>الألم</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {beneficiaryData.vitals.map((v, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{v.recordedAt}</TableCell>
                      <TableCell>{v.bloodPressure?.systolic}/{v.bloodPressure?.diastolic}</TableCell>
                      <TableCell>{v.heartRate}</TableCell>
                      <TableCell>{v.temperature?.value}°C</TableCell>
                      <TableCell>{v.painLevel?.score}/10</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Labs tab */}
        {tab === 'labs' && (
          <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>نتائج التحاليل</Typography>
            <Grid container spacing={2}>
              {beneficiaryData.labs.map((lab) => (
                <Grid item xs={12} md={6} key={lab.testName + lab.orderedDate}>
                  <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography fontWeight={700}>{lab.testName}</Typography>
                        {getStatusChip(lab.overallStatus)}
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        {lab.orderedDate}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      {lab.parameters.map((p, idx) => (
                        <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                          <Typography variant="body2">{p.parameter}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600}>{p.value} {p.unit}</Typography>
                            <Typography variant="caption" color="text.secondary">({p.referenceRange})</Typography>
                            {getFlagChip(p.flag)}
                          </Box>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Medications tab */}
        {tab === 'medications' && (
          <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>جدول إعطاء الأدوية (MAR)</Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                    <TableCell>الدواء</TableCell>
                    <TableCell>الجرعة</TableCell>
                    <TableCell>الوقت المجدول</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>المعطاة بواسطة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {beneficiaryData.medications.map((m, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{m.medicationName}</TableCell>
                      <TableCell>{m.dosage}</TableCell>
                      <TableCell>{m.scheduledTime}</TableCell>
                      <TableCell>{getStatusChip(m.status)}</TableCell>
                      <TableCell>{m.administeredBy || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Immunizations tab */}
        {tab === 'immunizations' && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>التطعيمات</Typography>
              <Button variant="contained" startIcon={<Add />}>
                إضافة تطعيم
              </Button>
            </Box>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                    <TableCell>اللقاح</TableCell>
                    <TableCell>الجرعة</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {beneficiaryData.immunizations.map((imm, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{imm.vaccine.name}</TableCell>
                      <TableCell>{imm.doseNumber}</TableCell>
                      <TableCell>{imm.dateAdministered}</TableCell>
                      <TableCell>{getStatusChip(imm.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Referrals tab */}
        {tab === 'referrals' && (
          <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>التحويلات الطبية</Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                    <TableCell>رقم التحويل</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>السبب</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الأولوية</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {beneficiaryData.referrals.map((ref, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{ref.referralNumber}</TableCell>
                      <TableCell>{ref.referralType}</TableCell>
                      <TableCell>{ref.reason}</TableCell>
                      <TableCell>{ref.referralDate}</TableCell>
                      <TableCell>{getStatusChip(ref.status)}</TableCell>
                      <TableCell>{ref.urgency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>

      {/* New Prescription Modal */}
      <Dialog open={openRxModal} onClose={() => setOpenRxModal(false)} maxWidth="sm" fullWidth dir="rtl">
        <DialogTitle>إنشاء وصفة طبية جديدة</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="اسم الدواء" margin="dense" />
          <TextField fullWidth label="الجرعة" margin="dense" />
          <TextField fullWidth label="التكرار" margin="dense" />
          <TextField fullWidth label="المدة" margin="dense" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRxModal(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => setOpenRxModal(false)}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
