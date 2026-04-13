/**
 * Report Builder Component — مُنشئ التقارير
 * إنشاء تقارير مخصصة مع فلاتر وجداول ورسوم بيانية
 */
import { useState, useEffect, useCallback } from 'react';




import { reportApi } from '../../services/documentProPhase6Service';

const REPORT_CATEGORIES = [
  { value: 'productivity', label: 'إنتاجية' },
  { value: 'compliance', label: 'امتثال' },
  { value: 'usage', label: 'استخدام' },
  { value: 'storage', label: 'تخزين' },
  { value: 'workflow', label: 'سير عمل' },
  { value: 'security', label: 'أمان' },
  { value: 'users', label: 'مستخدمين' },
  { value: 'departments', label: 'أقسام' },
  { value: 'trends', label: 'اتجاهات' },
  { value: 'comprehensive', label: 'شامل' },
];

const DATE_RANGES = [
  { value: 'today', label: 'اليوم' },
  { value: 'week', label: 'هذا الأسبوع' },
  { value: 'month', label: 'هذا الشهر' },
  { value: 'quarter', label: 'هذا الربع' },
  { value: 'year', label: 'هذه السنة' },
  { value: 'custom', label: 'مخصص' },
];

const EXPORT_FORMATS = [
  { value: 'json', label: 'JSON', icon: <JsonIcon /> },
  { value: 'csv', label: 'CSV', icon: <CsvIcon /> },
  { value: 'html', label: 'HTML', icon: <ChartIcon /> },
  { value: 'pdf', label: 'PDF', icon: <PdfIcon /> },
];

export default function ReportBuilder({ onReportGenerated }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [result, setResult] = useState(null);

  // Builder state
  const [report, setReport] = useState({
    name: '',
    nameAr: '',
    category: 'comprehensive',
    dateRange: 'month',
    dateFrom: '',
    dateTo: '',
    filters: {},
    format: 'json',
    scheduleEnabled: false,
    scheduleFrequency: 'weekly',
  });

  // Dialog state
  const [scheduleDialog, setScheduleDialog] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        reportApi.getTemplates({}),
        reportApi.getSchedules({}),
      ]);
      setTemplates(tRes.data?.templates || []);
      setSchedules(sRes.data?.schedules || []);
    } catch { }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const steps = ['اختيار القالب', 'تحديد الفلاتر', 'معاينة وتنفيذ'];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const r = await reportApi.generate({
        name: report.nameAr || report.name,
        category: report.category,
        dateRange: report.dateRange,
        dateFrom: report.dateFrom,
        dateTo: report.dateTo,
        filters: report.filters,
        format: report.format,
      });
      setResult(r.data);
      onReportGenerated?.(r.data);
    } catch { }
    setLoading(false);
  };

  const handleRunTemplate = async (templateId) => {
    setLoading(true);
    try {
      const r = await reportApi.runFromTemplate(templateId, {
        dateRange: report.dateRange,
        format: report.format,
      });
      setResult(r.data);
      setStep(2);
    } catch { }
    setLoading(false);
  };

  const handleExport = async (executionId, format) => {
    try {
      await reportApi.export(executionId, format);
    } catch { }
  };

  const handleCreateSchedule = async () => {
    try {
      await reportApi.createSchedule({
        name: report.nameAr || 'جدول تقرير',
        frequency: report.scheduleFrequency,
        category: report.category,
      });
      setScheduleDialog(false);
      loadTemplates();
    } catch { }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        <ReportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        مُنشئ التقارير المتقدم
      </Typography>

      <Stepper activeStep={step} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {/* Step 0: Template Selection */}
      {step === 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            اختر من القوالب الجاهزة أو أنشئ تقريراً مخصصاً
          </Typography>
          <Grid container spacing={2}>
            {templates.map((t, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
                  }}
                  onClick={() => handleRunTemplate(t._id)}
                >
                  <CardContent>
                    <Typography fontWeight={600}>{t.nameAr || t.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.category} {t.isSystem ? '• نظام' : ''}
                    </Typography>
                    {t.description && (
                      <Typography variant="body2" sx={{ mt: 1 }}>{t.description}</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {/* Custom report card */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  borderStyle: 'dashed',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
                }}
                onClick={() => setStep(1)}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <AddIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography fontWeight={600}>تقرير مخصص</Typography>
                  <Typography variant="caption" color="text.secondary">أنشئ تقريراً بفلاتر مخصصة</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Step 1: Filters */}
      {step === 1 && (
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="اسم التقرير" value={report.nameAr}
                onChange={(e) => setReport((r) => ({ ...r, nameAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={report.category} label="الفئة"
                  onChange={(e) => setReport((r) => ({ ...r, category: e.target.value }))}
                >
                  {REPORT_CATEGORIES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>الفترة الزمنية</InputLabel>
                <Select
                  value={report.dateRange} label="الفترة الزمنية"
                  onChange={(e) => setReport((r) => ({ ...r, dateRange: e.target.value }))}
                >
                  {DATE_RANGES.map((d) => (
                    <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>صيغة التصدير</InputLabel>
                <Select
                  value={report.format} label="صيغة التصدير"
                  onChange={(e) => setReport((r) => ({ ...r, format: e.target.value }))}
                >
                  {EXPORT_FORMATS.map((f) => (
                    <MenuItem key={f.value} value={f.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {f.icon} {f.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {report.dateRange === 'custom' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth type="date" label="من تاريخ" InputLabelProps={{ shrink: true }}
                    value={report.dateFrom}
                    onChange={(e) => setReport((r) => ({ ...r, dateFrom: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth type="date" label="إلى تاريخ" InputLabelProps={{ shrink: true }}
                    value={report.dateTo}
                    onChange={(e) => setReport((r) => ({ ...r, dateTo: e.target.value }))}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={report.scheduleEnabled}
                    onChange={(e) => setReport((r) => ({ ...r, scheduleEnabled: e.target.checked }))}
                  />
                }
                label="جدولة تلقائية"
              />
              {report.scheduleEnabled && (
                <FormControl sx={{ ml: 2, minWidth: 150 }} size="small">
                  <InputLabel>التكرار</InputLabel>
                  <Select
                    value={report.scheduleFrequency} label="التكرار"
                    onChange={(e) => setReport((r) => ({ ...r, scheduleFrequency: e.target.value }))}
                  >
                    <MenuItem value="daily">يومي</MenuItem>
                    <MenuItem value="weekly">أسبوعي</MenuItem>
                    <MenuItem value="monthly">شهري</MenuItem>
                    <MenuItem value="quarterly">ربع سنوي</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={() => setStep(0)}>رجوع</Button>
            <Button variant="contained" startIcon={<RunIcon />} onClick={() => { handleGenerate(); setStep(2); }}>
              تنفيذ التقرير
            </Button>
          </Box>
        </Box>
      )}

      {/* Step 2: Results */}
      {step === 2 && (
        <Box>
          {loading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>جاري إنشاء التقرير...</Typography>
            </Box>
          ) : result ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                تم إنشاء التقرير بنجاح — {result.resultCount || 0} سجل
              </Alert>

              {/* Export actions */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {EXPORT_FORMATS.map((f) => (
                  <Tooltip title={`تصدير ${f.label}`} key={f.value}>
                    <Button
                      size="small" variant="outlined"
                      startIcon={f.icon}
                      onClick={() => handleExport(result.executionId || result._id, f.value)}
                    >
                      {f.label}
                    </Button>
                  </Tooltip>
                ))}
              </Box>

              {/* Data preview */}
              {result.data && Array.isArray(result.data) && result.data.length > 0 && (
                <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {Object.keys(result.data[0]).slice(0, 6).map((key) => (
                          <TableCell key={key}>{key}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.data.slice(0, 20).map((row, ri) => (
                        <TableRow key={ri}>
                          {Object.values(row).slice(0, 6).map((val, vi) => (
                            <TableCell key={vi}>
                              {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </Box>
          ) : (
            <Alert severity="warning">لم يتم إنشاء التقرير بعد</Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={() => { setStep(0); setResult(null); }}>تقرير جديد</Button>
          </Box>
        </Box>
      )}

      {/* Scheduled Reports */}
      {schedules.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            التقارير المجدولة ({schedules.length})
          </Typography>
          <Grid container spacing={1}>
            {schedules.map((s, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{s.name || `جدول ${i + 1}`}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.frequency === 'daily' ? 'يومي' : s.frequency === 'weekly' ? 'أسبوعي' : s.frequency === 'monthly' ? 'شهري' : s.frequency}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={s.isActive ? 'نشط' : 'معطل'}
                      color={s.isActive ? 'success' : 'default'}
                    />
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Paper>
  );
}
