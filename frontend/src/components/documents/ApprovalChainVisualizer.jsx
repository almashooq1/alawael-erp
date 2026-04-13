/**
 * ApprovalChainVisualizer — عارض ومصمم سلاسل الموافقات
 * إنشاء/تعديل/عرض سلاسل الموافقات المتعددة المراحل
 */
import { useState, useEffect } from 'react';




const STEP_TYPES = [
  { type: 'sequential', label: 'تسلسلي', icon: <SequentialIcon />, desc: 'موافقة على التوالي' },
  { type: 'parallel', label: 'متوازي', icon: <ParallelIcon />, desc: 'موافقة متزامنة' },
  { type: 'conditional', label: 'شرطي', icon: <ConditionalIcon />, desc: 'حسب شرط معين' },
];

const PRIORITIES = [
  { value: 'low', label: 'منخفض', color: '#4caf50' },
  { value: 'medium', label: 'متوسط', color: '#ff9800' },
  { value: 'high', label: 'عالي', color: '#f44336' },
  { value: 'urgent', label: 'عاجل', color: '#9c27b0' },
];

const ACTION_TYPES = ['approve', 'reject', 'return', 'delegate', 'escalate'];
const ACTION_LABELS = { approve: 'موافقة', reject: 'رفض', return: 'إعادة', delegate: 'تفويض', escalate: 'تصعيد' };
const ACTION_COLORS = { approve: '#4caf50', reject: '#f44336', return: '#ff9800', delegate: '#2196f3', escalate: '#9c27b0' };

const DEFAULT_STEP = {
  name: '', nameAr: '', type: 'sequential',
  approvers: [{ userId: '', role: '', department: '' }],
  requiredApprovals: 1, autoApproveAfterHours: '',
  sla: { warningHours: 24, deadlineHours: 48 },
  allowedActions: ['approve', 'reject'],
  conditions: { field: '', operator: 'equals', value: '' },
  escalateTo: '', autoEscalateAfterHours: '',
};

function StepStatusIndicator({ status }) {
  const map = {
    pending: { icon: <PendingIcon />, color: '#9e9e9e', label: 'انتظار' },
    in_progress: { icon: <InProgressIcon />, color: '#2196f3', label: 'جاري' },
    approved: { icon: <ApprovedIcon />, color: '#4caf50', label: 'موافق' },
    rejected: { icon: <RejectedIcon />, color: '#f44336', label: 'مرفوض' },
    escalated: { icon: <WarningIcon />, color: '#9c27b0', label: 'متصاعد' },
  };
  const s = map[status] || map.pending;
  return <Chip icon={s.icon} label={s.label} size="small" sx={{ bgcolor: `${s.color}15`, color: s.color, fontWeight: 'bold' }} />;
}

function StepEditor({ step, index, totalSteps, onChange, onDelete, onMove, onClone }) {
  const update = (key, val) => onChange(index, { ...step, [key]: val });
  const addApprover = () => update('approvers', [...step.approvers, { userId: '', role: '', department: '' }]);
  const removeApprover = (ai) => update('approvers', step.approvers.filter((_, i) => i !== ai));
  const updateApprover = (ai, key, val) => update('approvers', step.approvers.map((a, i) => i === ai ? { ...a, [key]: val } : a));

  const typeInfo = STEP_TYPES.find(t => t.type === step.type) || STEP_TYPES[0];

  return (
    <Paper dir="rtl" sx={{ p: 2, mb: 1.5, borderRadius: 2, borderRight: `4px solid ${step.type === 'parallel' ? '#2196f3' : step.type === 'conditional' ? '#9c27b0' : '#4caf50'}` }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
        <DragIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
        <Avatar sx={{ width: 28, height: 28, bgcolor: step.type === 'parallel' ? '#2196f3' : step.type === 'conditional' ? '#9c27b0' : '#4caf50', fontSize: 14 }}>{index + 1}</Avatar>
        <Chip label={typeInfo.label} icon={typeInfo.icon} size="small" color="primary" variant="outlined" />
        <Typography fontWeight="bold" flex={1}>{step.nameAr || step.name || `الخطوة ${index + 1}`}</Typography>
        <Tooltip title="أعلى"><span><IconButton size="small" disabled={index === 0} onClick={() => onMove(index, -1)}><UpIcon /></IconButton></span></Tooltip>
        <Tooltip title="أسفل"><span><IconButton size="small" disabled={index === totalSteps - 1} onClick={() => onMove(index, 1)}><DownIcon /></IconButton></span></Tooltip>
        <Tooltip title="نسخ"><IconButton size="small" onClick={() => onClone(index)}><CloneIcon /></IconButton></Tooltip>
        <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => onDelete(index)}><DeleteIcon /></IconButton></Tooltip>
      </Stack>

      <Grid container spacing={1.5}>
        <Grid item xs={12} md={3}>
          <TextField fullWidth size="small" label="اسم الخطوة (عربي)" value={step.nameAr || ''} onChange={e => update('nameAr', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth size="small" label="اسم الخطوة (English)" value={step.name || ''} onChange={e => update('name', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>نوع الخطوة</InputLabel>
            <Select value={step.type} label="نوع الخطوة" onChange={e => update('type', e.target.value)}>
              {STEP_TYPES.map(st => <MenuItem key={st.type} value={st.type}>{st.icon} {st.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth size="small" type="number" label="الموافقات المطلوبة" value={step.requiredApprovals || 1} onChange={e => update('requiredApprovals', parseInt(e.target.value))} inputProps={{ min: 1 }} />
        </Grid>
      </Grid>

      {/* Approvers */}
      <Box mt={1.5}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <PersonIcon fontSize="small" color="action" />
          <Typography variant="subtitle2">المعتمدون ({step.approvers?.length || 0})</Typography>
          <IconButton size="small" onClick={addApprover}><AddApproverIcon fontSize="small" /></IconButton>
        </Stack>
        {step.approvers?.map((a, ai) => (
          <Stack direction="row" spacing={1} key={ai} mb={0.5} alignItems="center">
            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{ai + 1}</Avatar>
            <TextField size="small" label="المستخدم/المعرف" value={a.userId} onChange={e => updateApprover(ai, 'userId', e.target.value)} sx={{ flex: 1 }} />
            <TextField size="small" label="الدور" value={a.role} onChange={e => updateApprover(ai, 'role', e.target.value)} sx={{ flex: 1 }} />
            <TextField size="small" label="القسم" value={a.department} onChange={e => updateApprover(ai, 'department', e.target.value)} sx={{ flex: 1 }} />
            <IconButton size="small" color="error" onClick={() => removeApprover(ai)} disabled={step.approvers.length <= 1}><DeleteIcon fontSize="small" /></IconButton>
          </Stack>
        ))}
      </Box>

      {/* Allowed Actions */}
      <Box mt={1.5}>
        <Typography variant="subtitle2" gutterBottom>الإجراءات المسموحة</Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {ACTION_TYPES.map(act => (
            <Chip key={act} label={ACTION_LABELS[act]} size="small" variant={(step.allowedActions || []).includes(act) ? 'filled' : 'outlined'}
              sx={{ bgcolor: (step.allowedActions || []).includes(act) ? `${ACTION_COLORS[act]}20` : 'transparent', color: ACTION_COLORS[act], borderColor: ACTION_COLORS[act] }}
              onClick={() => {
                const cur = step.allowedActions || [];
                update('allowedActions', cur.includes(act) ? cur.filter(a => a !== act) : [...cur, act]);
              }} clickable />
          ))}
        </Stack>
      </Box>

      {/* SLA */}
      <Grid container spacing={1} mt={1}>
        <Grid item xs={4}>
          <TextField fullWidth size="small" type="number" label="تحذير SLA (ساعات)" value={step.sla?.warningHours || ''} onChange={e => update('sla', { ...step.sla, warningHours: parseInt(e.target.value) })} InputProps={{ startAdornment: <TimerIcon sx={{ mr: 0.5, color: '#ff9800' }} fontSize="small" /> }} />
        </Grid>
        <Grid item xs={4}>
          <TextField fullWidth size="small" type="number" label="موعد SLA النهائي (ساعات)" value={step.sla?.deadlineHours || ''} onChange={e => update('sla', { ...step.sla, deadlineHours: parseInt(e.target.value) })} InputProps={{ startAdornment: <SLAIcon sx={{ mr: 0.5, color: '#f44336' }} fontSize="small" /> }} />
        </Grid>
        <Grid item xs={4}>
          <TextField fullWidth size="small" type="number" label="موافقة تلقائية بعد (ساعات)" value={step.autoApproveAfterHours || ''} onChange={e => update('autoApproveAfterHours', e.target.value)} />
        </Grid>
      </Grid>

      {/* Conditional */}
      {step.type === 'conditional' && (
        <Box mt={1.5}>
          <Typography variant="subtitle2" gutterBottom>الشرط</Typography>
          <Grid container spacing={1}>
            <Grid item xs={4}><TextField fullWidth size="small" label="الحقل" value={step.conditions?.field || ''} onChange={e => update('conditions', { ...step.conditions, field: e.target.value })} /></Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>العملية</InputLabel>
                <Select value={step.conditions?.operator || 'equals'} label="العملية" onChange={e => update('conditions', { ...step.conditions, operator: e.target.value })}>
                  <MenuItem value="equals">يساوي</MenuItem><MenuItem value="not_equals">لا يساوي</MenuItem>
                  <MenuItem value="gt">أكبر من</MenuItem><MenuItem value="lt">أصغر من</MenuItem>
                  <MenuItem value="contains">يحتوي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}><TextField fullWidth size="small" label="القيمة" value={step.conditions?.value || ''} onChange={e => update('conditions', { ...step.conditions, value: e.target.value })} /></Grid>
          </Grid>
        </Box>
      )}
    </Paper>
  );
}

/* Read-only visual */
function ChainPreview({ chain }) {
  if (!chain?.steps?.length) return <Alert severity="info">لا توجد خطوات</Alert>;
  return (
    <Box dir="rtl">
      <Stepper activeStep={chain.currentStep || 0} orientation="vertical">
        {chain.steps.map((step, i) => {
          const typeInfo = STEP_TYPES.find(t => t.type === step.type) || STEP_TYPES[0];
          const result = chain.stepResults?.[i];
          return (
            <Step key={i} completed={result?.status === 'approved'}>
              <StepLabel
                error={result?.status === 'rejected'}
                icon={<Avatar sx={{ width: 32, height: 32, bgcolor: result?.status === 'approved' ? '#4caf50' : result?.status === 'rejected' ? '#f44336' : '#9e9e9e' }}>{i + 1}</Avatar>}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography fontWeight="bold">{step.nameAr || step.name || `الخطوة ${i + 1}`}</Typography>
                  <Chip label={typeInfo.label} icon={typeInfo.icon} size="small" variant="outlined" />
                  {result?.status && <StepStatusIndicator status={result.status} />}
                </Stack>
              </StepLabel>
              <StepContent>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} mb={1}>
                      <Chip label={`${step.requiredApprovals || 1} موافقة مطلوبة`} size="small" />
                      <Chip label={`SLA: ${step.sla?.deadlineHours || 48}h`} size="small" icon={<TimerIcon />} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mb={1}>المعتمدون:</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {step.approvers?.map((a, ai) => (
                        <Chip key={ai} avatar={<Avatar><PersonIcon /></Avatar>} label={a.role || a.userId || `معتمد ${ai + 1}`} size="small" variant="outlined" />
                      ))}
                    </Stack>
                    {result && (
                      <Box mt={1}>
                        <Typography variant="caption" color="text.secondary">القرار: {result.decision} | التاريخ: {result.completedAt ? new Date(result.completedAt).toLocaleString('ar-SA') : '—'}</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
}

export default function ApprovalChainVisualizer({ open, onClose, chain, onSave }) {
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('عام');
  const [priority, setPriority] = useState('medium');
  const [steps, setSteps] = useState([]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (chain) {
      setName(chain.name || '');
      setNameAr(chain.nameAr || '');
      setDescription(chain.description || '');
      setCategory(chain.category || 'عام');
      setPriority(chain.priority || 'medium');
      setSteps(chain.steps?.map(s => ({ ...DEFAULT_STEP, ...s })) || []);
      setEditMode(chain.status === 'draft' || !chain._id);
    } else {
      setName(''); setNameAr(''); setDescription(''); setCategory('عام'); setPriority('medium');
      setSteps([]); setEditMode(true);
    }
  }, [chain, open]);

  const addStep = () => setSteps(prev => [...prev, { ...DEFAULT_STEP, nameAr: `الخطوة ${prev.length + 1}` }]);
  const updateStep = (idx, data) => setSteps(prev => prev.map((s, i) => i === idx ? data : s));
  const deleteStep = (idx) => setSteps(prev => prev.filter((_, i) => i !== idx));
  const moveStep = (idx, dir) => {
    const arr = [...steps]; const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]]; setSteps(arr);
  };
  const cloneStep = (idx) => setSteps(prev => [...prev.slice(0, idx + 1), { ...prev[idx], nameAr: `${prev[idx].nameAr} (نسخة)` }, ...prev.slice(idx + 1)]);

  const handleSave = () => onSave({ name, nameAr, description, category, priority, steps });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <TreeIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">{chain?._id ? 'سلسلة الموافقات' : 'إنشاء سلسلة جديدة'}</Typography>
            {chain?.status && <Chip label={chain.status === 'active' ? 'نشط' : chain.status === 'draft' ? 'مسودة' : 'أرشيف'} color={chain.status === 'active' ? 'success' : 'default'} size="small" />}
          </Stack>
          {chain?._id && (
            <Button size="small" onClick={() => setEditMode(!editMode)}>
              {editMode ? 'عرض' : 'تعديل'}
            </Button>
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers dir="rtl" sx={{ minHeight: 500 }}>
        {/* Chain Info */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="الاسم بالعربية" value={nameAr} onChange={e => setNameAr(e.target.value)} disabled={!editMode} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="الاسم (English)" value={name} onChange={e => setName(e.target.value)} disabled={!editMode} /></Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small" disabled={!editMode}>
              <InputLabel>التصنيف</InputLabel>
              <Select value={category} label="التصنيف" onChange={e => setCategory(e.target.value)}>
                {['عام', 'مشتريات', 'عقود', 'مالية', 'موارد بشرية', 'إدارية', 'تقنية'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small" disabled={!editMode}>
              <InputLabel>الأولوية</InputLabel>
              <Select value={priority} label="الأولوية" onChange={e => setPriority(e.target.value)}>
                {PRIORITIES.map(p => <MenuItem key={p.value} value={p.value}><Chip label={p.label} size="small" sx={{ bgcolor: `${p.color}20`, color: p.color }} /></MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}><TextField fullWidth size="small" label="الوصف" value={description} onChange={e => setDescription(e.target.value)} disabled={!editMode} /></Grid>
        </Grid>

        <Divider sx={{ mb: 2 }} />

        {editMode ? (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">خطوات الموافقة ({steps.length})</Typography>
              <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={addStep}>إضافة خطوة</Button>
            </Stack>
            {steps.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>أضف خطوات لتكوين سلسلة الموافقات</Alert>}
            {steps.map((s, i) => (
              <StepEditor key={i} step={s} index={i} totalSteps={steps.length}
                onChange={updateStep} onDelete={deleteStep} onMove={moveStep} onClone={cloneStep} />
            ))}
          </>
        ) : (
          <ChainPreview chain={{ ...chain, steps }} />
        )}
      </DialogContent>
      <DialogActions>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, px: 2 }}>{steps.length} خطوة</Typography>
        <Button onClick={onClose}>إغلاق</Button>
        {editMode && <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!nameAr && !name}>حفظ</Button>}
      </DialogActions>
    </Dialog>
  );
}
