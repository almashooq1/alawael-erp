/**
 * AutomationBuilder — منشئ قواعد الأتمتة
 * واجهة بصرية لبناء قواعد أتمتة المستندات (RPA)
 */
import { useState, useEffect } from 'react';




/* ─── تعريفات المشغلات ─── */
const TRIGGERS = [
  { value: 'upload', label: 'رفع مستند', icon: <UploadIcon />, color: '#4caf50',
    description: 'يتم التنفيذ عند رفع مستند جديد' },
  { value: 'status_change', label: 'تغيير الحالة', icon: <RefreshIcon />, color: '#2196f3',
    description: 'يتم التنفيذ عند تغيير حالة المستند' },
  { value: 'date', label: 'تاريخ محدد', icon: <DateIcon />, color: '#ff9800',
    description: 'يتم التنفيذ في تاريخ محدد' },
  { value: 'approval', label: 'موافقة', icon: <ApprovalIcon />, color: '#9c27b0',
    description: 'يتم التنفيذ عند الموافقة أو الرفض' },
  { value: 'keyword', label: 'كلمة مفتاحية', icon: <KeywordIcon />, color: '#009688',
    description: 'يتم التنفيذ عند تواجد كلمات محددة' },
  { value: 'schedule', label: 'جدولة', icon: <ScheduleIcon />, color: '#795548',
    description: 'تنفيذ دوري مجدول (cron)' },
  { value: 'manual', label: 'يدوي', icon: <PlayIcon />, color: '#607d8b',
    description: 'تنفيذ يدوي عند الطلب' },
  { value: 'webhook', label: 'ويب هوك', icon: <WebhookIcon />, color: '#e91e63',
    description: 'تنفيذ عبر استدعاء خارجي' },
];

/* ─── تعريفات الإجراءات ─── */
const ACTIONS = [
  { value: 'send_email', label: 'إرسال بريد', icon: <EmailIcon />, color: '#f44336',
    fields: [{ key: 'to', label: 'إلى', type: 'text' }, { key: 'subject', label: 'الموضوع', type: 'text' }, { key: 'template', label: 'القالب', type: 'text' }] },
  { value: 'send_notification', label: 'إرسال إشعار', icon: <NotifyIcon />, color: '#ff9800',
    fields: [{ key: 'message', label: 'الرسالة', type: 'text' }, { key: 'priority', label: 'الأولوية', type: 'select', options: ['high', 'medium', 'low'] }] },
  { value: 'add_tag', label: 'إضافة وسم', icon: <TagIcon />, color: '#4caf50',
    fields: [{ key: 'tags', label: 'الوسوم (مفصولة بفاصلة)', type: 'text' }] },
  { value: 'move_document', label: 'نقل المستند', icon: <MoveIcon />, color: '#2196f3',
    fields: [{ key: 'targetFolder', label: 'المجلد الهدف', type: 'text' }] },
  { value: 'copy_document', label: 'نسخ المستند', icon: <CopyIcon />, color: '#009688',
    fields: [{ key: 'targetFolder', label: 'المجلد الهدف', type: 'text' }] },
  { value: 'archive', label: 'أرشفة', icon: <ArchiveIcon />, color: '#795548',
    fields: [{ key: 'archivePolicy', label: 'سياسة الأرشفة', type: 'text' }] },
  { value: 'apply_watermark', label: 'تطبيق علامة مائية', icon: <WatermarkIcon />, color: '#9c27b0',
    fields: [{ key: 'profileId', label: 'معرف الملف', type: 'text' }] },
  { value: 'change_status', label: 'تغيير الحالة', icon: <RefreshIcon />, color: '#3f51b5',
    fields: [{ key: 'newStatus', label: 'الحالة الجديدة', type: 'select', options: ['draft', 'review', 'approved', 'published', 'archived'] }] },
  { value: 'run_webhook', label: 'تنفيذ ويب هوك', icon: <WebhookIcon />, color: '#e91e63',
    fields: [{ key: 'url', label: 'الرابط', type: 'text' }, { key: 'method', label: 'الطريقة', type: 'select', options: ['POST', 'PUT', 'PATCH'] }] },
];

/* ─── تعريفات الشروط ─── */
const CONDITION_FIELDS = [
  { value: 'documentType', label: 'نوع المستند' },
  { value: 'status', label: 'الحالة' },
  { value: 'category', label: 'التصنيف' },
  { value: 'priority', label: 'الأولوية' },
  { value: 'createdBy', label: 'المنشئ' },
  { value: 'fileSize', label: 'حجم الملف' },
  { value: 'tags', label: 'الوسوم' },
  { value: 'department', label: 'القسم' },
];

const OPERATORS = [
  { value: 'equals', label: 'يساوي' },
  { value: 'not_equals', label: 'لا يساوي' },
  { value: 'contains', label: 'يحتوي' },
  { value: 'not_contains', label: 'لا يحتوي' },
  { value: 'greater_than', label: 'أكبر من' },
  { value: 'less_than', label: 'أقل من' },
  { value: 'in', label: 'ضمن قائمة' },
  { value: 'exists', label: 'موجود' },
];

const defaultRule = {
  name: '',
  description: '',
  trigger: { event: 'upload', config: {} },
  conditions: [],
  actions: [],
  isActive: true,
  priority: 5,
  maxExecutionsPerDay: 100,
  cooldownMinutes: 0,
  stopOnError: false,
};

export default function AutomationBuilder({ open, onClose, onSave, rule }) {
  const [form, setForm] = useState(defaultRule);
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (rule) {
      setForm({
        name: rule.name || '',
        description: rule.description || '',
        trigger: rule.trigger || { event: 'upload', config: {} },
        conditions: rule.conditions || [],
        actions: rule.actions || [],
        isActive: rule.isActive !== false,
        priority: rule.priority || 5,
        maxExecutionsPerDay: rule.maxExecutionsPerDay || 100,
        cooldownMinutes: rule.cooldownMinutes || 0,
        stopOnError: rule.stopOnError || false,
      });
    } else {
      setForm(defaultRule);
    }
    setActiveStep(0);
  }, [rule, open]);

  /* ─── Trigger Config ─── */
  const setTrigger = (event) => {
    setForm(p => ({ ...p, trigger: { event, config: {} } }));
  };

  const setTriggerConfig = (key, val) => {
    setForm(p => ({ ...p, trigger: { ...p.trigger, config: { ...p.trigger.config, [key]: val } } }));
  };

  /* ─── Conditions ─── */
  const addCondition = () => {
    setForm(p => ({
      ...p,
      conditions: [...p.conditions, { field: 'documentType', operator: 'equals', value: '' }],
    }));
  };

  const updateCondition = (idx, key, val) => {
    setForm(p => ({
      ...p,
      conditions: p.conditions.map((c, i) => i === idx ? { ...c, [key]: val } : c),
    }));
  };

  const removeCondition = (idx) => {
    setForm(p => ({ ...p, conditions: p.conditions.filter((_, i) => i !== idx) }));
  };

  /* ─── Actions ─── */
  const addAction = (type) => {
    const actionDef = ACTIONS.find(a => a.value === type);
    const config = {};
    (actionDef?.fields || []).forEach(f => { config[f.key] = ''; });
    setForm(p => ({
      ...p,
      actions: [...p.actions, { type, config, delay: 0 }],
    }));
  };

  const updateActionConfig = (idx, key, val) => {
    setForm(p => ({
      ...p,
      actions: p.actions.map((a, i) => i === idx ? { ...a, config: { ...a.config, [key]: val } } : a),
    }));
  };

  const updateActionDelay = (idx, val) => {
    setForm(p => ({
      ...p,
      actions: p.actions.map((a, i) => i === idx ? { ...a, delay: val } : a),
    }));
  };

  const removeAction = (idx) => {
    setForm(p => ({ ...p, actions: p.actions.filter((_, i) => i !== idx) }));
  };

  /* ─── Validate & Save ─── */
  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'الاسم مطلوب';
    if (!form.trigger.event) e.trigger = 'المشغل مطلوب';
    if (!form.actions.length) e.actions = 'أضف إجراء واحد على الأقل';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
  };

  const triggerDef = TRIGGERS.find(t => t.value === form.trigger.event);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon color="primary" />
        {rule ? 'تعديل قاعدة الأتمتة' : 'إنشاء قاعدة أتمتة جديدة'}
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Step 1: Basic Info */}
          <Step>
            <StepLabel
              onClick={() => setActiveStep(0)}
              sx={{ cursor: 'pointer' }}
              error={!!errors.name}
            >
              <Typography fontWeight="bold">المعلومات الأساسية</Typography>
            </StepLabel>
            <StepContent>
              <Stack spacing={2} py={1}>
                <TextField
                  fullWidth label="اسم القاعدة" value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  error={!!errors.name} helperText={errors.name}
                  required
                />
                <TextField
                  fullWidth label="الوصف" multiline rows={2} value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                />
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth size="small" label="الأولوية (1-10)" type="number"
                      value={form.priority}
                      onChange={(e) => setForm(p => ({ ...p, priority: Math.min(10, Math.max(1, +e.target.value)) }))}
                      inputProps={{ min: 1, max: 10 }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth size="small" label="الحد اليومي" type="number"
                      value={form.maxExecutionsPerDay}
                      onChange={(e) => setForm(p => ({ ...p, maxExecutionsPerDay: +e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth size="small" label="فترة الانتظار (دقائق)" type="number"
                      value={form.cooldownMinutes}
                      onChange={(e) => setForm(p => ({ ...p, cooldownMinutes: +e.target.value }))}
                    />
                  </Grid>
                </Grid>
                <Stack direction="row" spacing={2}>
                  <FormControlLabel
                    control={<Switch checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />}
                    label="نشط"
                  />
                  <FormControlLabel
                    control={<Switch checked={form.stopOnError} onChange={(e) => setForm(p => ({ ...p, stopOnError: e.target.checked }))} />}
                    label="إيقاف عند الخطأ"
                  />
                </Stack>
              </Stack>
              <Button variant="contained" size="small" onClick={() => setActiveStep(1)} sx={{ mt: 1 }}>
                التالي
              </Button>
            </StepContent>
          </Step>

          {/* Step 2: Trigger */}
          <Step>
            <StepLabel
              onClick={() => setActiveStep(1)}
              sx={{ cursor: 'pointer' }}
              error={!!errors.trigger}
            >
              <Typography fontWeight="bold">المشغل (متى يتم التنفيذ؟)</Typography>
            </StepLabel>
            <StepContent>
              <Grid container spacing={1} mb={2}>
                {TRIGGERS.map((t) => (
                  <Grid item xs={6} md={3} key={t.value}>
                    <Card
                      variant={form.trigger.event === t.value ? 'elevation' : 'outlined'}
                      sx={{
                        cursor: 'pointer', p: 1.5, textAlign: 'center',
                        border: form.trigger.event === t.value ? `2px solid ${t.color}` : undefined,
                        bgcolor: form.trigger.event === t.value ? t.color + '11' : undefined,
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: t.color + '08' },
                      }}
                      onClick={() => setTrigger(t.value)}
                    >
                      <Box sx={{ color: t.color, mb: 0.5 }}>{t.icon}</Box>
                      <Typography variant="body2" fontWeight="bold">{t.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Trigger-specific config */}
              {form.trigger.event === 'status_change' && (
                <Stack spacing={1}>
                  <TextField size="small" label="الحالة المصدر" value={form.trigger.config.fromStatus || ''} onChange={(e) => setTriggerConfig('fromStatus', e.target.value)} />
                  <TextField size="small" label="الحالة الهدف" value={form.trigger.config.toStatus || ''} onChange={(e) => setTriggerConfig('toStatus', e.target.value)} />
                </Stack>
              )}
              {form.trigger.event === 'keyword' && (
                <TextField size="small" fullWidth label="الكلمات المفتاحية (مفصولة بفاصلة)" value={form.trigger.config.keywords || ''} onChange={(e) => setTriggerConfig('keywords', e.target.value)} />
              )}
              {form.trigger.event === 'schedule' && (
                <TextField size="small" fullWidth label="تعبير Cron" value={form.trigger.config.cron || ''} onChange={(e) => setTriggerConfig('cron', e.target.value)} placeholder="0 9 * * *" helperText="مثال: 0 9 * * * (كل يوم الساعة 9)" />
              )}
              {form.trigger.event === 'webhook' && (
                <TextField size="small" fullWidth label="المفتاح السري" value={form.trigger.config.secret || ''} onChange={(e) => setTriggerConfig('secret', e.target.value)} />
              )}
              {form.trigger.event === 'date' && (
                <Stack spacing={1}>
                  <TextField size="small" label="حقل التاريخ" value={form.trigger.config.dateField || ''} onChange={(e) => setTriggerConfig('dateField', e.target.value)} placeholder="expiryDate" />
                  <TextField size="small" label="قبل بكم يوم" type="number" value={form.trigger.config.daysBefore || 0} onChange={(e) => setTriggerConfig('daysBefore', +e.target.value)} />
                </Stack>
              )}

              <Stack direction="row" spacing={1} mt={2}>
                <Button size="small" onClick={() => setActiveStep(0)}>السابق</Button>
                <Button variant="contained" size="small" onClick={() => setActiveStep(2)}>التالي</Button>
              </Stack>
            </StepContent>
          </Step>

          {/* Step 3: Conditions */}
          <Step>
            <StepLabel onClick={() => setActiveStep(2)} sx={{ cursor: 'pointer' }}>
              <Typography fontWeight="bold">الشروط (اختياري)</Typography>
            </StepLabel>
            <StepContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                الشروط تحدد متى يجب تنفيذ الإجراءات. بدون شروط سيتم التنفيذ دائماً.
              </Alert>

              {form.conditions.map((c, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2 }}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>الحقل</InputLabel>
                        <Select value={c.field} label="الحقل" onChange={(e) => updateCondition(idx, 'field', e.target.value)}>
                          {CONDITION_FIELDS.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>العامل</InputLabel>
                        <Select value={c.operator} label="العامل" onChange={(e) => updateCondition(idx, 'operator', e.target.value)}>
                          {OPERATORS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={5}>
                      <TextField fullWidth size="small" label="القيمة" value={c.value} onChange={(e) => updateCondition(idx, 'value', e.target.value)} />
                    </Grid>
                    <Grid item xs={1}>
                      <IconButton size="small" color="error" onClick={() => removeCondition(idx)}><DeleteIcon /></IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}

              <Button startIcon={<AddIcon />} size="small" onClick={addCondition} sx={{ mb: 2 }}>إضافة شرط</Button>

              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setActiveStep(1)}>السابق</Button>
                <Button variant="contained" size="small" onClick={() => setActiveStep(3)}>التالي</Button>
              </Stack>
            </StepContent>
          </Step>

          {/* Step 4: Actions */}
          <Step>
            <StepLabel
              onClick={() => setActiveStep(3)}
              sx={{ cursor: 'pointer' }}
              error={!!errors.actions}
            >
              <Typography fontWeight="bold">الإجراءات (ماذا يحدث؟)</Typography>
            </StepLabel>
            <StepContent>
              {errors.actions && <Alert severity="error" sx={{ mb: 2 }}>{errors.actions}</Alert>}

              {/* Action list */}
              {form.actions.map((a, idx) => {
                const def = ACTIONS.find(x => x.value === a.type);
                return (
                  <Accordion key={idx} defaultExpanded variant="outlined" sx={{ mb: 1, borderRadius: '8px !important' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={idx + 1} size="small" color="primary" />
                        <Box sx={{ color: def?.color }}>{def?.icon}</Box>
                        <Typography fontWeight="bold">{def?.label || a.type}</Typography>
                        {a.delay > 0 && <Chip label={`تأخير ${a.delay}ث`} size="small" variant="outlined" />}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1.5}>
                        {(def?.fields || []).map((f) => (
                          f.type === 'select' ? (
                            <FormControl key={f.key} fullWidth size="small">
                              <InputLabel>{f.label}</InputLabel>
                              <Select value={a.config[f.key] || ''} label={f.label} onChange={(e) => updateActionConfig(idx, f.key, e.target.value)}>
                                {f.options.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                              </Select>
                            </FormControl>
                          ) : (
                            <TextField key={f.key} fullWidth size="small" label={f.label} value={a.config[f.key] || ''} onChange={(e) => updateActionConfig(idx, f.key, e.target.value)} />
                          )
                        ))}
                        <TextField
                          size="small" label="تأخير قبل التنفيذ (ثواني)" type="number"
                          value={a.delay || 0}
                          onChange={(e) => updateActionDelay(idx, +e.target.value)}
                        />
                        <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => removeAction(idx)}>
                          إزالة الإجراء
                        </Button>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                );
              })}

              {/* Add action menu */}
              <Typography variant="subtitle2" mt={2} mb={1}>إضافة إجراء:</Typography>
              <Grid container spacing={1} mb={2}>
                {ACTIONS.map((a) => (
                  <Grid item xs={6} md={4} key={a.value}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: 'pointer', p: 1, textAlign: 'center',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: a.color + '11', borderColor: a.color },
                      }}
                      onClick={() => addAction(a.value)}
                    >
                      <Box sx={{ color: a.color, mb: 0.5 }}>{a.icon}</Box>
                      <Typography variant="caption" fontWeight="bold">{a.label}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setActiveStep(2)}>السابق</Button>
              </Stack>
            </StepContent>
          </Step>
        </Stepper>

        {/* Summary */}
        {form.name && form.actions.length > 0 && (
          <Paper sx={{ p: 2, mt: 3, borderRadius: 2, bgcolor: '#f0f4ff' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>ملخص القاعدة</Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip label={`المشغل: ${triggerDef?.label}`} color="primary" size="small" icon={triggerDef?.icon} />
              {form.conditions.length > 0 && <Chip label={`${form.conditions.length} شرط`} size="small" variant="outlined" icon={<RuleIcon />} />}
              <ArrowIcon color="action" />
              {form.actions.map((a, i) => {
                const def = ACTIONS.find(x => x.value === a.type);
                return <Chip key={i} label={def?.label} size="small" sx={{ bgcolor: def?.color + '22', color: def?.color }} />;
              })}
            </Stack>
          </Paper>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={handleSave} startIcon={<SaveIcon />} disabled={!form.name}>
          {rule ? 'تحديث القاعدة' : 'إنشاء القاعدة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
