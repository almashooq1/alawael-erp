/**
 * 🧠 إدارة السلوك — Behavior Management
 * AlAwael ERP — Behavior tracking, FBA management, intervention plans
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  Button,
  Avatar,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  EmojiPeople as BehaviorIcon,
  Add as AddIcon,
  Warning as WarningIcon,
  Save as SaveIcon,
  Psychology as FBAIcon,
  Assignment as PlanIcon,
  Close as CloseIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'contexts/SnackbarContext';

/* ── Behavior type catalogs ── */
const BEHAVIOR_TYPES = [
  { key: 'aggression', nameAr: 'عدوان', color: '#F44336', icon: '⚠️' },
  { key: 'self_injury', nameAr: 'إيذاء ذاتي', color: '#E91E63', icon: '🔴' },
  { key: 'tantrum', nameAr: 'نوبة غضب', color: '#FF5722', icon: '😤' },
  { key: 'stereotypy', nameAr: 'سلوك نمطي', color: '#FF9800', icon: '🔄' },
  { key: 'elopement', nameAr: 'هروب', color: '#FFC107', icon: '🏃' },
  { key: 'property_destruction', nameAr: 'تدمير ممتلكات', color: '#795548', icon: '💥' },
  { key: 'non_compliance', nameAr: 'عدم امتثال', color: '#9C27B0', icon: '🚫' },
  { key: 'withdrawal', nameAr: 'انسحاب اجتماعي', color: '#607D8B', icon: '🔵' },
  { key: 'vocal_disruption', nameAr: 'اضطراب صوتي', color: '#3F51B5', icon: '🔊' },
  { key: 'pica', nameAr: 'أكل مواد غير غذائية', color: '#009688', icon: '⚠️' },
  { key: 'other', nameAr: 'أخرى', color: '#757575', icon: '📝' },
];

const SEVERITY_OPTIONS = [
  { value: 1, label: 'خفيف', color: '#8BC34A' },
  { value: 2, label: 'متوسط', color: '#FFC107' },
  { value: 3, label: 'شديد', color: '#FF9800' },
  { value: 4, label: 'حاد', color: '#F44336' },
  { value: 5, label: 'خطير', color: '#9C27B0' },
];

const FUNCTION_OPTIONS = [
  { value: 'attention', labelAr: 'الحصول على انتباه', icon: '👀' },
  { value: 'escape', labelAr: 'الهروب / التجنب', icon: '🏃' },
  { value: 'tangible', labelAr: 'الحصول على شيء ملموس', icon: '🎁' },
  { value: 'sensory', labelAr: 'تحفيز حسي ذاتي', icon: '🌀' },
  { value: 'unknown', labelAr: 'غير محدد', icon: '❓' },
];

const INTERVENTION_TYPES = [
  { value: 'antecedent', labelAr: 'التدخل القبلي', description: 'تعديل ما قبل السلوك' },
  { value: 'replacement', labelAr: 'السلوك البديل', description: 'تعليم سلوك بديل مناسب' },
  { value: 'consequence', labelAr: 'التدخل البعدي', description: 'تعديل نتائج السلوك' },
  { value: 'environmental', labelAr: 'تعديل البيئة', description: 'تغييرات بيئية مادية' },
  { value: 'skill_building', labelAr: 'بناء المهارات', description: 'تعليم مهارات جديدة' },
];

export default function BehaviorManagement() {
  const theme = useTheme();
  const g = theme.palette.gradients || {};
  const { showSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0); // 0=incidents, 1=FBA, 2=intervention
  const [incidents, setIncidents] = useState([]);

  /* ── Incident form ── */
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    beneficiary: '',
    behaviorType: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    duration: '',
    severity: 2,
    antecedent: '',
    consequence: '',
    setting: '',
    observer: '',
    notes: '',
  });

  /* ── FBA form ── */
  const [fbaList, setFbaList] = useState([]);
  const [fbaDialogOpen, setFbaDialogOpen] = useState(false);
  const [fbaForm, setFbaForm] = useState({
    beneficiary: '',
    targetBehavior: '',
    operationalDefinition: '',
    hypothesizedFunction: 'attention',
    dataCollectionMethod: '',
    baselineData: '',
    summary: '',
  });

  /* ── Intervention form ── */
  const [interventionDialogOpen, setInterventionDialogOpen] = useState(false);
  const [interventionForm, setInterventionForm] = useState({
    beneficiary: '',
    targetBehavior: '',
    interventionType: 'replacement',
    description: '',
    strategies: '',
    reinforcers: '',
    crisisPlan: '',
    dataCollection: '',
  });
  const [interventions, setInterventions] = useState([]);

  /* ── Save incident ── */
  const handleSaveIncident = useCallback(() => {
    if (!incidentForm.beneficiary || !incidentForm.behaviorType) {
      showSnackbar('يرجى ملء البيانات المطلوبة', 'warning');
      return;
    }
    setIncidents(prev => [
      { ...incidentForm, id: Date.now(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
    showSnackbar('تم تسجيل الحادثة السلوكية', 'success');
    setIncidentDialogOpen(false);
    setIncidentForm({
      beneficiary: '',
      behaviorType: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      duration: '',
      severity: 2,
      antecedent: '',
      consequence: '',
      setting: '',
      observer: '',
      notes: '',
    });
  }, [incidentForm, showSnackbar]);

  /* ── Save FBA ── */
  const handleSaveFBA = useCallback(() => {
    if (!fbaForm.beneficiary || !fbaForm.targetBehavior) {
      showSnackbar('يرجى ملء البيانات المطلوبة', 'warning');
      return;
    }
    setFbaList(prev => [
      { ...fbaForm, id: Date.now(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
    showSnackbar('تم حفظ التحليل الوظيفي', 'success');
    setFbaDialogOpen(false);
    setFbaForm({
      beneficiary: '',
      targetBehavior: '',
      operationalDefinition: '',
      hypothesizedFunction: 'attention',
      dataCollectionMethod: '',
      baselineData: '',
      summary: '',
    });
  }, [fbaForm, showSnackbar]);

  /* ── Save Intervention ── */
  const handleSaveIntervention = useCallback(() => {
    if (!interventionForm.beneficiary || !interventionForm.targetBehavior) {
      showSnackbar('يرجى ملء البيانات المطلوبة', 'warning');
      return;
    }
    setInterventions(prev => [
      { ...interventionForm, id: Date.now(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
    showSnackbar('تم حفظ خطة التدخل', 'success');
    setInterventionDialogOpen(false);
    setInterventionForm({
      beneficiary: '',
      targetBehavior: '',
      interventionType: 'replacement',
      description: '',
      strategies: '',
      reinforcers: '',
      crisisPlan: '',
      dataCollection: '',
    });
  }, [interventionForm, showSnackbar]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const byType = {};
    incidents.forEach(inc => {
      byType[inc.behaviorType] = (byType[inc.behaviorType] || 0) + 1;
    });
    const avgSeverity = incidents.length
      ? (incidents.reduce((s, i) => s + Number(i.severity), 0) / incidents.length).toFixed(1)
      : 0;
    return {
      total: incidents.length,
      byType,
      avgSeverity,
      fbaCount: fbaList.length,
      planCount: interventions.length,
    };
  }, [incidents, fbaList, interventions]);

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: g.warning || 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: '#fff',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: alpha('#fff', 0.2) }}>
            <BehaviorIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              إدارة السلوك
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              تسجيل الحوادث السلوكية — التحليل الوظيفي — خطط التدخل
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* ── KPI Cards ── */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'الحوادث المسجلة', value: stats.total, color: '#F44336', icon: <WarningIcon /> },
          { label: 'متوسط الشدة', value: stats.avgSeverity, color: '#FF9800', icon: <SpeedIcon /> },
          { label: 'تحليلات وظيفية', value: stats.fbaCount, color: '#7C4DFF', icon: <FBAIcon /> },
          { label: 'خطط تدخل', value: stats.planCount, color: '#4CAF50', icon: <PlanIcon /> },
        ].map((kpi, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card sx={{ borderRadius: 2, borderBottom: `3px solid ${kpi.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Avatar
                  sx={{ mx: 'auto', mb: 1, bgcolor: alpha(kpi.color, 0.1), color: kpi.color }}
                >
                  {kpi.icon}
                </Avatar>
                <Typography variant="h4" fontWeight={700} color={kpi.color}>
                  {kpi.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {kpi.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Tabs ── */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab icon={<WarningIcon />} label="الحوادث السلوكية" />
          <Tab icon={<FBAIcon />} label="التحليل الوظيفي (FBA)" />
          <Tab icon={<PlanIcon />} label="خطط التدخل" />
        </Tabs>
      </Paper>

      {/* ═══════ TAB 0: Incidents ═══════ */}
      {tab === 0 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" mb={2}>
            <Typography variant="h6" fontWeight={700}>
              سجل الحوادث السلوكية
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIncidentDialogOpen(true)}
              color="error"
            >
              تسجيل حادثة
            </Button>
          </Stack>

          {incidents.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <BehaviorIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                لا توجد حوادث مسجلة
              </Typography>
              <Typography color="text.secondary">اضغط "تسجيل حادثة" لبدء التوثيق</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha('#F44336', 0.05) }}>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المستفيد</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>نوع السلوك</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      الشدة
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المثير</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incidents.map(inc => {
                    const bType = BEHAVIOR_TYPES.find(b => b.key === inc.behaviorType);
                    const sev = SEVERITY_OPTIONS.find(s => s.value === Number(inc.severity));
                    return (
                      <TableRow key={inc.id} hover>
                        <TableCell>
                          {inc.date} {inc.time}
                        </TableCell>
                        <TableCell>{inc.beneficiary}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${bType?.icon || ''} ${bType?.nameAr || inc.behaviorType}`}
                            size="small"
                            sx={{ bgcolor: alpha(bType?.color || '#999', 0.1), fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={sev?.label || inc.severity}
                            size="small"
                            sx={{
                              bgcolor: alpha(sev?.color || '#999', 0.15),
                              color: sev?.color,
                              fontWeight: 700,
                            }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {inc.antecedent || '—'}
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {inc.notes || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ═══════ TAB 1: FBA ═══════ */}
      {tab === 1 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" mb={2}>
            <Typography variant="h6" fontWeight={700}>
              التحليل الوظيفي للسلوك (FBA)
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setFbaDialogOpen(true)}
              color="secondary"
            >
              تحليل جديد
            </Button>
          </Stack>

          {fbaList.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <FBAIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                لا توجد تحليلات وظيفية
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {fbaList.map(fba => {
                const func = FUNCTION_OPTIONS.find(f => f.value === fba.hypothesizedFunction);
                return (
                  <Grid item xs={12} sm={6} key={fba.id}>
                    <Card sx={{ borderRadius: 2, borderRight: `4px solid #7C4DFF` }}>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {fba.targetBehavior}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          المستفيد: {fba.beneficiary}
                        </Typography>
                        <Alert severity="info" sx={{ mb: 1 }}>
                          <Typography variant="caption" fontWeight={700}>
                            التعريف الإجرائي:
                          </Typography>
                          <Typography variant="body2">
                            {fba.operationalDefinition || '—'}
                          </Typography>
                        </Alert>
                        <Chip
                          icon={<FBAIcon />}
                          label={`الوظيفة: ${func?.labelAr || fba.hypothesizedFunction}`}
                          color="secondary"
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                        {fba.summary && (
                          <Typography variant="body2" color="text.secondary" mt={1}>
                            {fba.summary}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* ═══════ TAB 2: Intervention Plans ═══════ */}
      {tab === 2 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" mb={2}>
            <Typography variant="h6" fontWeight={700}>
              خطط التدخل السلوكي
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setInterventionDialogOpen(true)}
            >
              خطة جديدة
            </Button>
          </Stack>

          {interventions.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <PlanIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                لا توجد خطط تدخل
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {interventions.map(plan => {
                const iType = INTERVENTION_TYPES.find(t => t.value === plan.interventionType);
                return (
                  <Grid item xs={12} sm={6} key={plan.id}>
                    <Card sx={{ borderRadius: 2, borderRight: `4px solid #4CAF50` }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" mb={1}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {plan.targetBehavior}
                          </Typography>
                          <Chip
                            label={iType?.labelAr || plan.interventionType}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          المستفيد: {plan.beneficiary}
                        </Typography>
                        <Typography variant="body2">{plan.description}</Typography>
                        {plan.strategies && (
                          <Alert severity="success" sx={{ mt: 1 }}>
                            <Typography variant="caption" fontWeight={700}>
                              الاستراتيجيات:
                            </Typography>
                            <Typography variant="body2">{plan.strategies}</Typography>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* ═══════ Incident Dialog ═══════ */}
      <Dialog
        open={incidentDialogOpen}
        onClose={() => setIncidentDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h6" fontWeight={700}>
              تسجيل حادثة سلوكية
            </Typography>
            <IconButton onClick={() => setIncidentDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="معرف المستفيد"
                value={incidentForm.beneficiary}
                onChange={e => setIncidentForm(f => ({ ...f, beneficiary: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>نوع السلوك</InputLabel>
                <Select
                  value={incidentForm.behaviorType}
                  onChange={e => setIncidentForm(f => ({ ...f, behaviorType: e.target.value }))}
                  label="نوع السلوك"
                >
                  {BEHAVIOR_TYPES.map(b => (
                    <MenuItem key={b.key} value={b.key}>
                      {b.icon} {b.nameAr}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="التاريخ"
                type="date"
                value={incidentForm.date}
                onChange={e => setIncidentForm(f => ({ ...f, date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="الوقت"
                type="time"
                value={incidentForm.time}
                onChange={e => setIncidentForm(f => ({ ...f, time: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="المدة (دقيقة)"
                type="number"
                value={incidentForm.duration}
                onChange={e => setIncidentForm(f => ({ ...f, duration: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth>
                <InputLabel>الشدة</InputLabel>
                <Select
                  value={incidentForm.severity}
                  onChange={e => setIncidentForm(f => ({ ...f, severity: e.target.value }))}
                  label="الشدة"
                >
                  {SEVERITY_OPTIONS.map(s => (
                    <MenuItem
                      key={s.value}
                      value={s.value}
                      sx={{ color: s.color, fontWeight: 700 }}
                    >
                      {s.value} — {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="المثير السابق (Antecedent)"
                value={incidentForm.antecedent}
                onChange={e => setIncidentForm(f => ({ ...f, antecedent: e.target.value }))}
                placeholder="ماذا حدث قبل السلوك..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="النتيجة (Consequence)"
                value={incidentForm.consequence}
                onChange={e => setIncidentForm(f => ({ ...f, consequence: e.target.value }))}
                placeholder="ماذا حدث بعد السلوك..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="المكان / البيئة"
                value={incidentForm.setting}
                onChange={e => setIncidentForm(f => ({ ...f, setting: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الملاحظ / المسجّل"
                value={incidentForm.observer}
                onChange={e => setIncidentForm(f => ({ ...f, observer: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات إضافية"
                value={incidentForm.notes}
                onChange={e => setIncidentForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIncidentDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<SaveIcon />}
            onClick={handleSaveIncident}
          >
            حفظ الحادثة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════ FBA Dialog ═══════ */}
      <Dialog open={fbaDialogOpen} onClose={() => setFbaDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h6" fontWeight={700}>
              تحليل وظيفي جديد (FBA)
            </Typography>
            <IconButton onClick={() => setFbaDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="معرف المستفيد"
                value={fbaForm.beneficiary}
                onChange={e => setFbaForm(f => ({ ...f, beneficiary: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="السلوك المستهدف"
                value={fbaForm.targetBehavior}
                onChange={e => setFbaForm(f => ({ ...f, targetBehavior: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="التعريف الإجرائي للسلوك"
                value={fbaForm.operationalDefinition}
                onChange={e => setFbaForm(f => ({ ...f, operationalDefinition: e.target.value }))}
                placeholder="وصف دقيق وقابل للملاحظة والقياس..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>الوظيفة المفترضة</InputLabel>
                <Select
                  value={fbaForm.hypothesizedFunction}
                  onChange={e => setFbaForm(f => ({ ...f, hypothesizedFunction: e.target.value }))}
                  label="الوظيفة المفترضة"
                >
                  {FUNCTION_OPTIONS.map(fo => (
                    <MenuItem key={fo.value} value={fo.value}>
                      {fo.icon} {fo.labelAr}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="طريقة جمع البيانات"
                value={fbaForm.dataCollectionMethod}
                onChange={e => setFbaForm(f => ({ ...f, dataCollectionMethod: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="ملخص التحليل والتوصيات"
                value={fbaForm.summary}
                onChange={e => setFbaForm(f => ({ ...f, summary: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFbaDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<SaveIcon />}
            onClick={handleSaveFBA}
          >
            حفظ التحليل
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════ Intervention Dialog ═══════ */}
      <Dialog
        open={interventionDialogOpen}
        onClose={() => setInterventionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h6" fontWeight={700}>
              خطة تدخل سلوكي جديدة
            </Typography>
            <IconButton onClick={() => setInterventionDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="معرف المستفيد"
                value={interventionForm.beneficiary}
                onChange={e => setInterventionForm(f => ({ ...f, beneficiary: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="السلوك المستهدف"
                value={interventionForm.targetBehavior}
                onChange={e => setInterventionForm(f => ({ ...f, targetBehavior: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>نوع التدخل</InputLabel>
                <Select
                  value={interventionForm.interventionType}
                  onChange={e =>
                    setInterventionForm(f => ({ ...f, interventionType: e.target.value }))
                  }
                  label="نوع التدخل"
                >
                  {INTERVENTION_TYPES.map(it => (
                    <MenuItem key={it.value} value={it.value}>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {it.labelAr}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {it.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="وصف التدخل"
                value={interventionForm.description}
                onChange={e => setInterventionForm(f => ({ ...f, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="الاستراتيجيات"
                value={interventionForm.strategies}
                onChange={e => setInterventionForm(f => ({ ...f, strategies: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="المعززات"
                value={interventionForm.reinforcers}
                onChange={e => setInterventionForm(f => ({ ...f, reinforcers: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="خطة الأزمات"
                value={interventionForm.crisisPlan}
                onChange={e => setInterventionForm(f => ({ ...f, crisisPlan: e.target.value }))}
                placeholder="ما الإجراء عند تصعيد السلوك..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInterventionDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveIntervention}>
            حفظ الخطة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
