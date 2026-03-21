/**
 * EHS — Environmental, Health & Safety — السلامة والصحة المهنية والبيئة
 * Safety Incidents, Inspections, Hazard Reports, PPE, Training
 */
import { useState, useEffect, useCallback } from 'react';


import { alpha } from '@mui/material/styles';


import { useSnackbar } from '../../contexts/SnackbarContext';
import * as svc from '../../services/enterpriseProPlus.service';

const INCIDENT_TYPES = {
  injury: 'إصابة',
  near_miss: 'حادث وشيك',
  property_damage: 'تلف ممتلكات',
  environmental: 'بيئي',
  fire: 'حريق',
  chemical: 'كيميائي',
};
const SEVERITY_MAP = {
  minor: { label: 'طفيف', color: '#4caf50' },
  moderate: { label: 'متوسط', color: '#ff9800' },
  major: { label: 'كبير', color: '#f44336' },
  critical: { label: 'حرج', color: '#b71c1c' },
  fatal: { label: 'مميت', color: '#000' },
};
const INSPECTION_TYPES = {
  routine: 'روتيني',
  surprise: 'مفاجئ',
  follow_up: 'متابعة',
  regulatory: 'تنظيمي',
};
const HAZARD_TYPES = {
  physical: 'فيزيائي',
  chemical: 'كيميائي',
  biological: 'بيولوجي',
  ergonomic: 'مريحي',
  psychological: 'نفسي',
};
const RISK_LEVELS = {
  low: { label: 'منخفض', color: '#4caf50' },
  medium: { label: 'متوسط', color: '#ff9800' },
  high: { label: 'عالي', color: '#f44336' },
  critical: { label: 'حرج', color: '#b71c1c' },
};
const PPE_TYPES = {
  helmet: 'خوذة',
  gloves: 'قفازات',
  goggles: 'نظارات',
  vest: 'سترة',
  boots: 'أحذية',
  mask: 'كمامة',
  harness: 'حزام أمان',
  ear_protection: 'حماية أذن',
};
const TRAINING_TYPES = {
  induction: 'تعريفي',
  fire: 'إطفاء',
  first_aid: 'إسعافات أولية',
  chemical: 'مواد كيميائية',
  heights: 'العمل على ارتفاعات',
  confined_space: 'أماكن محصورة',
};

export default function EHSSafetyPage() {
  const showSnackbar = useSnackbar();
  const [tab, setTab] = useState(0);
  const [incidents, setIncidents] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [ppeRecords, setPpeRecords] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [incidentDialog, setIncidentDialog] = useState(false);
  const [inspectionDialog, setInspectionDialog] = useState(false);
  const [hazardDialog, setHazardDialog] = useState(false);
  const [ppeDialog, setPpeDialog] = useState(false);
  const [trainingDialog, setTrainingDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [i, ins, h, p, t] = await Promise.all([
        svc.getEHSIncidents().then(r => r.data?.data || []),
        svc.getEHSInspections().then(r => r.data?.data || []),
        svc.getHazards().then(r => r.data?.data || []),
        svc.getPPERecords().then(r => r.data?.data || []),
        svc.getSafetyTrainings().then(r => r.data?.data || []),
      ]);
      setIncidents(i);
      setInspections(ins);
      setHazards(h);
      setPpeRecords(p);
      setTrainings(t);
    } catch {
      showSnackbar('خطأ في تحميل البيانات', 'error');
    }
    setLoading(false);
  }, [showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveIncident = async formData => {
    try {
      if (editItem?._id) await svc.investigateEHSIncident(editItem._id, formData);
      else await svc.createEHSIncident(formData);
      showSnackbar('تم الحفظ', 'success');
      setIncidentDialog(false);
      setEditItem(null);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSaveInspection = async formData => {
    try {
      await svc.createEHSInspection(formData);
      showSnackbar('تم الحفظ', 'success');
      setInspectionDialog(false);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSaveHazard = async formData => {
    try {
      await svc.createHazard(formData);
      showSnackbar('تم الحفظ', 'success');
      setHazardDialog(false);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSavePPE = async formData => {
    try {
      await svc.createPPERecord(formData);
      showSnackbar('تم الحفظ', 'success');
      setPpeDialog(false);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleSaveTraining = async formData => {
    try {
      await svc.createSafetyTraining(formData);
      showSnackbar('تم الحفظ', 'success');
      setTrainingDialog(false);
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const criticalIncidents = incidents.filter(
    i => i.severity === 'critical' || i.severity === 'fatal'
  );
  const openHazards = hazards.filter(h => h.status !== 'resolved' && h.status !== 'closed');

  const statCards = [
    { label: 'حوادث السلامة', value: incidents.length, color: '#d32f2f', icon: <IncidentIcon /> },
    {
      label: 'عمليات التفتيش',
      value: inspections.length,
      color: '#1976d2',
      icon: <InspectionIcon />,
    },
    { label: 'مخاطر مفتوحة', value: openHazards.length, color: '#ed6c02', icon: <HazardIcon /> },
    { label: 'دورات تدريبية', value: trainings.length, color: '#2e7d32', icon: <TrainingIcon /> },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        السلامة والصحة المهنية والبيئة (EHS)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        إدارة حوادث السلامة والتفتيش والمخاطر ومعدات الحماية والتدريب
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRight: `4px solid ${s.color}`,
              }}
            >
              <Avatar sx={{ bgcolor: alpha(s.color, 0.12), color: s.color }}>{s.icon}</Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {criticalIncidents.length > 0 && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            bgcolor: alpha('#d32f2f', 0.08),
            border: '1px solid',
            borderColor: alpha('#d32f2f', 0.3),
          }}
        >
          <Typography fontWeight={600} color="error">
            <MedicalIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            {criticalIncidents.length} حادثة حرجة تحتاج تحقيق فوري
          </Typography>
        </Paper>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="حوادث السلامة" icon={<IncidentIcon />} iconPosition="start" />
        <Tab label="التفتيش" icon={<InspectionIcon />} iconPosition="start" />
        <Tab label="المخاطر" icon={<HazardIcon />} iconPosition="start" />
        <Tab label="معدات الحماية" icon={<PPEIcon />} iconPosition="start" />
        <Tab label="التدريب" icon={<TrainingIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Safety Incidents */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditItem(null);
                setIncidentDialog(true);
              }}
            >
              تسجيل حادثة
            </Button>
          </Box>
          <Grid container spacing={2}>
            {incidents.map(inc => {
              const sev = SEVERITY_MAP[inc.severity] || { label: inc.severity, color: '#999' };
              return (
                <Grid item xs={12} md={6} key={inc._id}>
                  <Card variant="outlined" sx={{ borderRight: `4px solid ${sev.color}` }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {inc.title || 'حادثة #' + inc._id?.slice(-5)}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          <Chip
                            size="small"
                            label={sev.label}
                            sx={{
                              bgcolor: alpha(sev.color, 0.15),
                              color: sev.color,
                              fontWeight: 700,
                            }}
                          />
                          <Chip
                            size="small"
                            label={INCIDENT_TYPES[inc.type] || inc.type}
                            variant="outlined"
                          />
                        </Stack>
                      </Box>
                      {inc.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {inc.description.slice(0, 150)}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        {inc.location && (
                          <Chip
                            size="small"
                            variant="outlined"
                            icon={<WorkIcon />}
                            label={inc.location}
                          />
                        )}
                        {inc.oshaReportable && <Chip size="small" color="error" label="OSHA" />}
                        {inc.injuredPersons?.length > 0 && (
                          <Chip
                            size="small"
                            icon={<MedicalIcon />}
                            label={`${inc.injuredPersons.length} مصاب`}
                          />
                        )}
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mt: 1 }}
                      >
                        {inc.incidentDate
                          ? new Date(inc.incidentDate).toLocaleDateString('ar-SA')
                          : ''}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditItem(inc);
                            setIncidentDialog(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            {incidents.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    لا توجد حوادث مسجلة - بيئة عمل آمنة!
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Tab 1: Inspections */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setInspectionDialog(true)}
            >
              تفتيش جديد
            </Button>
          </Box>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>النوع</TableCell>
                  <TableCell>المنطقة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>النتائج</TableCell>
                  <TableCell>التقييم</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inspections.map(ins => (
                  <TableRow key={ins._id} hover>
                    <TableCell>
                      <Chip size="small" label={INSPECTION_TYPES[ins.type] || ins.type} />
                    </TableCell>
                    <TableCell>{ins.area || '-'}</TableCell>
                    <TableCell>
                      {ins.inspectionDate
                        ? new Date(ins.inspectionDate).toLocaleDateString('ar-SA')
                        : '-'}
                    </TableCell>
                    <TableCell>{ins.findings?.length || 0} ملاحظة</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          ins.overallRating === 'satisfactory'
                            ? 'مرضي'
                            : ins.overallRating === 'needs_improvement'
                              ? 'يحتاج تحسين'
                              : ins.overallRating === 'unsatisfactory'
                                ? 'غير مرضي'
                                : ins.overallRating || '-'
                        }
                        color={
                          ins.overallRating === 'satisfactory'
                            ? 'success'
                            : ins.overallRating === 'unsatisfactory'
                              ? 'error'
                              : 'warning'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          ins.status === 'completed'
                            ? 'مكتمل'
                            : ins.status === 'in_progress'
                              ? 'جاري'
                              : 'مخطط'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {inspections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      لا توجد عمليات تفتيش
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Tab 2: Hazards */}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setHazardDialog(true)}
            >
              تقرير مخاطر
            </Button>
          </Box>
          <Grid container spacing={2}>
            {hazards.map(h => {
              const risk = RISK_LEVELS[h.riskLevel] || { label: h.riskLevel, color: '#999' };
              return (
                <Grid item xs={12} md={6} lg={4} key={h._id}>
                  <Card variant="outlined" sx={{ borderTop: `3px solid ${risk.color}` }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Chip
                          size="small"
                          label={HAZARD_TYPES[h.type] || h.type}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={risk.label}
                          sx={{
                            bgcolor: alpha(risk.color, 0.15),
                            color: risk.color,
                            fontWeight: 700,
                          }}
                        />
                      </Box>
                      <Typography variant="body1" fontWeight={600}>
                        {h.title || h.description?.slice(0, 60)}
                      </Typography>
                      {h.location && (
                        <Typography variant="body2" color="text.secondary">
                          الموقع: {h.location}
                        </Typography>
                      )}
                      {h.controlMeasures?.length > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                          {h.controlMeasures.slice(0, 3).map((m, idx) => (
                            <Chip
                              key={idx}
                              size="small"
                              variant="outlined"
                              label={typeof m === 'string' ? m : m.description?.slice(0, 30)}
                            />
                          ))}
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            {hazards.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">لا توجد مخاطر مسجلة</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Tab 3: PPE Records */}
      {tab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setPpeDialog(true)}>
              سجل معدات جديد
            </Button>
          </Box>
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>الموظف</TableCell>
                  <TableCell>المعدات</TableCell>
                  <TableCell>تاريخ الاستلام</TableCell>
                  <TableCell>تاريخ الانتهاء</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ppeRecords.map(p => (
                  <TableRow key={p._id} hover>
                    <TableCell>{p.employee?.name || p.employeeName || '-'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {p.equipment?.map((eq, idx) => (
                          <Chip key={idx} size="small" label={PPE_TYPES[eq.type] || eq.type} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {p.issueDate ? new Date(p.issueDate).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell>
                      {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          p.condition === 'good'
                            ? 'جيد'
                            : p.condition === 'worn'
                              ? 'مستهلك'
                              : p.condition === 'damaged'
                                ? 'تالف'
                                : p.condition || '-'
                        }
                        color={
                          p.condition === 'good'
                            ? 'success'
                            : p.condition === 'damaged'
                              ? 'error'
                              : 'warning'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {ppeRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      لا توجد سجلات معدات حماية
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Tab 4: Training */}
      {tab === 4 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setTrainingDialog(true)}
            >
              دورة تدريبية جديدة
            </Button>
          </Box>
          <Grid container spacing={2}>
            {trainings.map(t => (
              <Grid item xs={12} md={6} lg={4} key={t._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" fontWeight={600}>
                      {t.title || TRAINING_TYPES[t.type] || t.type}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1 }}>
                      <Chip
                        size="small"
                        label={TRAINING_TYPES[t.type] || t.type}
                        color="primary"
                        variant="outlined"
                      />
                      {t.certificationValid && (
                        <Chip size="small" color="success" icon={<CompleteIcon />} label="شهادة" />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      المشاركون: {t.attendees?.length || 0}
                      {t.completionRate != null && ` | نسبة الإتمام: ${t.completionRate}%`}
                    </Typography>
                    {t.scheduledDate && (
                      <Typography variant="body2">
                        التاريخ: {new Date(t.scheduledDate).toLocaleDateString('ar-SA')}
                      </Typography>
                    )}
                    {t.duration && (
                      <Typography variant="body2">المدة: {t.duration} ساعة</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {trainings.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">لا توجد دورات تدريبية</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Incident Dialog */}
      <Dialog
        open={incidentDialog}
        onClose={() => {
          setIncidentDialog(false);
          setEditItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItem ? 'تعديل الحادثة' : 'تسجيل حادثة'}
          <IconButton
            onClick={() => {
              setIncidentDialog(false);
              setEditItem(null);
            }}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <SafetyIncidentForm initial={editItem} onSave={handleSaveIncident} />
        </DialogContent>
      </Dialog>

      {/* Inspection Dialog */}
      <Dialog
        open={inspectionDialog}
        onClose={() => setInspectionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          تفتيش جديد
          <IconButton
            onClick={() => setInspectionDialog(false)}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <InspectionForm onSave={handleSaveInspection} />
        </DialogContent>
      </Dialog>

      {/* Hazard Dialog */}
      <Dialog open={hazardDialog} onClose={() => setHazardDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          تقرير مخاطر
          <IconButton
            onClick={() => setHazardDialog(false)}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <HazardForm onSave={handleSaveHazard} />
        </DialogContent>
      </Dialog>

      {/* PPE Dialog */}
      <Dialog open={ppeDialog} onClose={() => setPpeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          سجل معدات حماية
          <IconButton
            onClick={() => setPpeDialog(false)}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <PPEForm onSave={handleSavePPE} />
        </DialogContent>
      </Dialog>

      {/* Training Dialog */}
      <Dialog
        open={trainingDialog}
        onClose={() => setTrainingDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          دورة تدريبية جديدة
          <IconButton
            onClick={() => setTrainingDialog(false)}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TrainingForm onSave={handleSaveTraining} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function SafetyIncidentForm({ initial, onSave }) {
  const [form, setForm] = useState({
    title: '',
    type: 'near_miss',
    severity: 'minor',
    location: '',
    description: '',
  });
  useEffect(() => {
    if (initial)
      setForm({
        title: initial.title || '',
        type: initial.type || 'near_miss',
        severity: initial.severity || 'minor',
        location: initial.location || '',
        description: initial.description || '',
      });
  }, [initial]);
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField fullWidth label="العنوان" value={form.title} onChange={ch('title')} required />
      </Grid>
      <Grid item xs={6}>
        <TextField select fullWidth label="النوع" value={form.type} onChange={ch('type')}>
          {Object.entries(INCIDENT_TYPES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={6}>
        <TextField select fullWidth label="الخطورة" value={form.severity} onChange={ch('severity')}>
          {Object.entries(SEVERITY_MAP).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="الموقع" value={form.location} onChange={ch('location')} />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="الوصف"
          value={form.description}
          onChange={ch('description')}
          multiline
          rows={3}
        />
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" fullWidth onClick={() => onSave(form)}>
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}

function InspectionForm({ onSave }) {
  const [form, setForm] = useState({ type: 'routine', area: '', notes: '' });
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={6}>
        <TextField select fullWidth label="النوع" value={form.type} onChange={ch('type')}>
          {Object.entries(INSPECTION_TYPES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={6}>
        <TextField fullWidth label="المنطقة" value={form.area} onChange={ch('area')} />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="ملاحظات"
          value={form.notes}
          onChange={ch('notes')}
          multiline
          rows={3}
        />
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" fullWidth onClick={() => onSave(form)}>
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}

function HazardForm({ onSave }) {
  const [form, setForm] = useState({
    type: 'physical',
    riskLevel: 'medium',
    title: '',
    location: '',
    description: '',
  });
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField fullWidth label="العنوان" value={form.title} onChange={ch('title')} required />
      </Grid>
      <Grid item xs={6}>
        <TextField select fullWidth label="النوع" value={form.type} onChange={ch('type')}>
          {Object.entries(HAZARD_TYPES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={6}>
        <TextField
          select
          fullWidth
          label="مستوى الخطر"
          value={form.riskLevel}
          onChange={ch('riskLevel')}
        >
          {Object.entries(RISK_LEVELS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="الموقع" value={form.location} onChange={ch('location')} />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="الوصف"
          value={form.description}
          onChange={ch('description')}
          multiline
          rows={3}
        />
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" fullWidth onClick={() => onSave(form)}>
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}

function PPEForm({ onSave }) {
  const [form, setForm] = useState({ employeeName: '', ppeType: 'helmet', condition: 'good' });
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="اسم الموظف"
          value={form.employeeName}
          onChange={ch('employeeName')}
          required
        />
      </Grid>
      <Grid item xs={6}>
        <TextField
          select
          fullWidth
          label="نوع المعدات"
          value={form.ppeType}
          onChange={ch('ppeType')}
        >
          {Object.entries(PPE_TYPES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={6}>
        <TextField
          select
          fullWidth
          label="الحالة"
          value={form.condition}
          onChange={ch('condition')}
        >
          <MenuItem value="good">جيد</MenuItem>
          <MenuItem value="worn">مستهلك</MenuItem>
          <MenuItem value="damaged">تالف</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          fullWidth
          onClick={() =>
            onSave({
              employeeName: form.employeeName,
              equipment: [{ type: form.ppeType, condition: form.condition }],
            })
          }
        >
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}

function TrainingForm({ onSave }) {
  const [form, setForm] = useState({
    title: '',
    type: 'induction',
    duration: '',
    scheduledDate: '',
  });
  const ch = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="عنوان الدورة"
          value={form.title}
          onChange={ch('title')}
          required
        />
      </Grid>
      <Grid item xs={4}>
        <TextField select fullWidth label="النوع" value={form.type} onChange={ch('type')}>
          {Object.entries(TRAINING_TYPES).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="number"
          label="المدة (ساعات)"
          value={form.duration}
          onChange={ch('duration')}
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          fullWidth
          type="date"
          label="التاريخ"
          value={form.scheduledDate}
          onChange={ch('scheduledDate')}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" fullWidth onClick={() => onSave(form)}>
          حفظ
        </Button>
      </Grid>
    </Grid>
  );
}
