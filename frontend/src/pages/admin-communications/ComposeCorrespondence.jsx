/**
 * Compose Correspondence — إنشاء مراسلة جديدة
 * متطابق مع Backend Correspondence Schema
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';




import { gradients } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import adminCommunicationsService from '../../services/adminCommunications.service';
import {
  CORRESPONDENCE_TYPES,
  PRIORITY_LEVELS,
  CONFIDENTIALITY_LEVELS,
  SENDER_TYPES,
  DEPARTMENTS,
} from './constants';

const steps = ['بيانات المراسلة', 'المحتوى والمرفقات', 'المراجعة والإرسال'];

export default function ComposeCorrespondence() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showSnackbar = useSnackbar();

  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // ─── Form state (aligned with backend Correspondence schema) ───
  const [form, setForm] = useState({
    type: searchParams.get('type') || 'official_letter',
    subject: '',
    content: '',
    summary: '',
    priority: 'normal',
    confidentiality: 'internal',
    senderType: 'internal',
    senderName: '',
    senderDepartment: '',
    senderPhone: '',
    senderEmail: '',
    recipientType: 'internal',
    recipientName: '',
    recipientDepartment: '',
    recipientOrganization: '',
    recipientPhone: '',
    recipientEmail: '',
    ccList: [],
    externalReferenceNumber: '',
    dueDate: '',
    validUntil: '',
    requiresReply: false,
    requiresApproval: false,
    keywords: [],
    notes: '',
    parentCorrespondence: null,
    branchCode: '',
  });
  const [attachments, setAttachments] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCcName, setNewCcName] = useState('');

  // ─── Rehydrate from replyTo ───
  const replyToId = searchParams.get('replyTo');
  useEffect(() => {
    if (replyToId) {
      adminCommunicationsService.getById(replyToId).then(res => {
        const orig = res?.data?.data;
        if (orig) {
          setForm(prev => ({
            ...prev,
            type: 'response',
            subject: `رد: ${orig.subject || ''}`,
            parentCorrespondence: replyToId,
            recipientType: orig.sender?.type || 'internal',
            recipientName: orig.sender?.name || '',
          }));
        }
      }).catch(() => {});
    }
  }, [replyToId]);

  /* ─── Helpers ──────────────────────────────────────────────────────────── */
  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addKeyword = () => {
    if (newKeyword.trim() && !form.keywords.includes(newKeyword.trim())) {
      updateField('keywords', [...form.keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = kw => updateField('keywords', form.keywords.filter(k => k !== kw));

  const addCc = () => {
    if (newCcName.trim()) {
      updateField('ccList', [...form.ccList, { name: newCcName.trim(), type: 'department' }]);
      setNewCcName('');
    }
  };

  const removeCc = idx => updateField('ccList', form.ccList.filter((_, i) => i !== idx));

  const handleFileSelect = e => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeAttachment = idx => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const formatFileSize = bytes => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  /** Build backend-compatible payload from form state */
  const buildPayload = () => ({
    type: form.type,
    subject: form.subject,
    content: form.content,
    summary: form.summary || undefined,
    priority: form.priority,
    confidentiality: form.confidentiality,
    externalReferenceNumber: form.externalReferenceNumber || undefined,
    branchCode: form.branchCode || undefined,
    sender: {
      type: form.senderType,
      name: form.senderName || '(الحالي)',
      phone: form.senderPhone || undefined,
      email: form.senderEmail || undefined,
    },
    recipients: [
      {
        type: form.recipientType,
        name: form.recipientName,
        phone: form.recipientPhone || undefined,
        email: form.recipientEmail || undefined,
        isPrimary: true,
        responseDeadline: form.dueDate || undefined,
      },
    ],
    carbonCopy: form.ccList.map(cc => ({
      name: cc.name,
      type: cc.type || 'department',
    })),
    keywords: form.keywords.length ? form.keywords : undefined,
    dueDate: form.dueDate || undefined,
    validUntil: form.validUntil || undefined,
    parentCorrespondence: form.parentCorrespondence || undefined,
    metadata: {
      notes: form.notes || undefined,
      requiresReply: form.requiresReply,
      requiresApproval: form.requiresApproval,
    },
  });

  /* ─── Save / Send ──────────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = await adminCommunicationsService.create(payload);
      const id = res?.data?.data?._id;

      if (id && attachments.length > 0) {
        for (const file of attachments) {
          await adminCommunicationsService.uploadAttachment(id, file);
        }
      }

      showSnackbar('تم حفظ المسودة بنجاح', 'success');
      navigate(`/admin-communications/view/${id || ''}`);
    } catch {
      showSnackbar('خطأ في حفظ المراسلة', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!form.subject.trim()) {
      showSnackbar('يرجى إدخال موضوع المراسلة', 'warning');
      return;
    }
    if (!form.recipientName.trim()) {
      showSnackbar('يرجى تحديد المستلم', 'warning');
      return;
    }
    if (!form.content.trim()) {
      showSnackbar('يرجى إدخال نص المراسلة', 'warning');
      return;
    }

    setSending(true);
    try {
      const payload = buildPayload();
      const res = await adminCommunicationsService.create(payload);
      const id = res?.data?.data?._id;

      if (id && attachments.length > 0) {
        for (const file of attachments) {
          await adminCommunicationsService.uploadAttachment(id, file);
        }
      }
      if (id) {
        await adminCommunicationsService.send(id);
      }

      showSnackbar('تم إرسال المراسلة بنجاح', 'success');
      navigate('/admin-communications/outbox');
    } catch {
      showSnackbar('خطأ في إرسال المراسلة', 'error');
    } finally {
      setSending(false);
    }
  };

  /* ─── Step 1: Basic Info ───────────────────────────────────────────────── */
  const renderStep1 = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4}>
        <FormControl fullWidth>
          <InputLabel>نوع المراسلة *</InputLabel>
          <Select
            value={form.type}
            label="نوع المراسلة *"
            onChange={e => updateField('type', e.target.value)}
          >
            {Object.entries(CORRESPONDENCE_TYPES).map(([key, val]) => (
              <MenuItem key={key} value={key}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: val.color }} />
                  {val.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <FormControl fullWidth>
          <InputLabel>الأولوية</InputLabel>
          <Select
            value={form.priority}
            label="الأولوية"
            onChange={e => updateField('priority', e.target.value)}
          >
            {Object.entries(PRIORITY_LEVELS).map(([key, val]) => (
              <MenuItem key={key} value={key}>{val.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <FormControl fullWidth>
          <InputLabel>مستوى السرية</InputLabel>
          <Select
            value={form.confidentiality}
            label="مستوى السرية"
            onChange={e => updateField('confidentiality', e.target.value)}
          >
            {Object.entries(CONFIDENTIALITY_LEVELS).map(([key, val]) => (
              <MenuItem key={key} value={key}>{val.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={8}>
        <TextField
          fullWidth
          label="الموضوع *"
          value={form.subject}
          onChange={e => updateField('subject', e.target.value)}
          placeholder="أدخل موضوع المراسلة..."
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="الرقم المرجعي الخارجي"
          value={form.externalReferenceNumber}
          onChange={e => updateField('externalReferenceNumber', e.target.value)}
          placeholder="(للمراسلات الواردة)"
          helperText="اتركه فارغاً للمراسلات الداخلية"
        />
      </Grid>

      {/* ─── Sender ─── */}
      <Grid item xs={12}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          <Person sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: 20 }} />
          بيانات المرسل
        </Typography>
      </Grid>

      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>نوع المرسل</InputLabel>
          <Select
            value={form.senderType}
            label="نوع المرسل"
            onChange={e => updateField('senderType', e.target.value)}
          >
            {Object.entries(SENDER_TYPES).map(([key, val]) => (
              <MenuItem key={key} value={key}>{val.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="اسم المرسل"
          value={form.senderName}
          onChange={e => updateField('senderName', e.target.value)}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>القسم / الإدارة</InputLabel>
          <Select
            value={form.senderDepartment}
            label="القسم / الإدارة"
            onChange={e => updateField('senderDepartment', e.target.value)}
          >
            <MenuItem value="">— اختر —</MenuItem>
            {DEPARTMENTS.map(d => (
              <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {form.senderType !== 'internal' && (
        <>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="هاتف المرسل"
              value={form.senderPhone}
              onChange={e => updateField('senderPhone', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="بريد المرسل"
              value={form.senderEmail}
              onChange={e => updateField('senderEmail', e.target.value)}
              type="email"
            />
          </Grid>
        </>
      )}

      {/* ─── Recipient ─── */}
      <Grid item xs={12}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          <Business sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: 20 }} />
          بيانات المستلم
        </Typography>
      </Grid>

      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>نوع المستلم</InputLabel>
          <Select
            value={form.recipientType}
            label="نوع المستلم"
            onChange={e => updateField('recipientType', e.target.value)}
          >
            {Object.entries(SENDER_TYPES).map(([key, val]) => (
              <MenuItem key={key} value={key}>{val.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="اسم المستلم *"
          value={form.recipientName}
          onChange={e => updateField('recipientName', e.target.value)}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>قسم المستلم</InputLabel>
          <Select
            value={form.recipientDepartment}
            label="قسم المستلم"
            onChange={e => updateField('recipientDepartment', e.target.value)}
          >
            <MenuItem value="">— اختر —</MenuItem>
            {DEPARTMENTS.map(d => (
              <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {form.recipientType !== 'internal' && (
        <>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="الجهة / المؤسسة"
              value={form.recipientOrganization}
              onChange={e => updateField('recipientOrganization', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="هاتف المستلم"
              value={form.recipientPhone}
              onChange={e => updateField('recipientPhone', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="بريد المستلم"
              value={form.recipientEmail}
              onChange={e => updateField('recipientEmail', e.target.value)}
              type="email"
            />
          </Grid>
        </>
      )}

      {/* ─── CC ─── */}
      <Grid item xs={12}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          <PersonAdd sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: 20 }} />
          نسخة إلى (CC)
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          {form.ccList.map((cc, i) => (
            <Chip key={i} label={cc.name} onDelete={() => removeCc(i)} size="small" variant="outlined" />
          ))}
          <TextField
            size="small"
            placeholder="أضف مستلماً..."
            value={newCcName}
            onChange={e => setNewCcName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCc(); } }}
            sx={{ width: 180 }}
          />
          <IconButton size="small" onClick={addCc}><AddIcon fontSize="small" /></IconButton>
        </Stack>
      </Grid>

      {/* ─── Dates ─── */}
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="date"
          label="تاريخ الاستحقاق"
          value={form.dueDate}
          onChange={e => updateField('dueDate', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="date"
          label="صالحة حتى"
          value={form.validUntil}
          onChange={e => updateField('validUntil', e.target.value)}
          InputLabelProps={{ shrink: true }}
          helperText="تاريخ انتهاء صلاحية المراسلة"
        />
      </Grid>

      {/* Options */}
      <Grid item xs={12}>
        <Stack direction="row" spacing={3}>
          <FormControlLabel
            control={<Switch checked={form.requiresReply} onChange={e => updateField('requiresReply', e.target.checked)} />}
            label="يتطلب رد"
          />
          <FormControlLabel
            control={<Switch checked={form.requiresApproval} onChange={e => updateField('requiresApproval', e.target.checked)} />}
            label="يتطلب اعتماد"
          />
        </Stack>
      </Grid>
    </Grid>
  );

  /* ─── Step 2: Content & Attachments ────────────────────────────────────── */
  const renderStep2 = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={10}
          label="نص المراسلة *"
          value={form.content}
          onChange={e => updateField('content', e.target.value)}
          placeholder="اكتب نص المراسلة هنا..."
        />
      </Grid>

      <Grid item xs={12} sm={8}>
        <TextField
          fullWidth
          multiline
          rows={2}
          label="الملخص"
          value={form.summary}
          onChange={e => updateField('summary', e.target.value)}
          placeholder="ملخص مختصر — يظهر في قوائم البحث"
          inputProps={{ maxLength: 1000 }}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          multiline
          rows={2}
          label="ملاحظات داخلية"
          value={form.notes}
          onChange={e => updateField('notes', e.target.value)}
          placeholder="ملاحظات خاصة (لا تظهر في المراسلة)"
        />
      </Grid>

      {/* Keywords */}
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>الكلمات المفتاحية</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {form.keywords.map(kw => (
            <Chip key={kw} label={kw} onDelete={() => removeKeyword(kw)} size="small" />
          ))}
          <TextField
            size="small"
            placeholder="أضف كلمة..."
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
            sx={{ width: 150 }}
          />
          <IconButton size="small" onClick={addKeyword}><AddIcon fontSize="small" /></IconButton>
        </Stack>
      </Grid>

      {/* Attachments */}
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>
          <AttachFile sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: 20 }} />
          المرفقات
        </Typography>
        <Button variant="outlined" component="label" startIcon={<AttachFile />} sx={{ mb: 2 }}>
          إرفاق ملف
          <input type="file" hidden multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt" onChange={handleFileSelect} />
        </Button>

        {attachments.length > 0 && (
          <List dense>
            {attachments.map((file, i) => (
              <ListItem key={i} sx={{ bgcolor: 'rgba(0,0,0,0.02)', borderRadius: '10px', mb: 0.5 }}>
                <ListItemIcon><InsertDriveFile color="primary" /></ListItemIcon>
                <ListItemText primary={file.name} secondary={formatFileSize(file.size)} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => removeAttachment(i)}>
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
        <Typography variant="caption" color="text.secondary">
          الحد الأقصى لحجم الملف: 25 ميجابايت — الأنواع المدعومة: PDF, Word, Excel, صور, نص
        </Typography>
      </Grid>
    </Grid>
  );

  /* ─── Step 3: Review ───────────────────────────────────────────────────── */
  const renderStep3 = () => {
    const typeConfig = CORRESPONDENCE_TYPES[form.type] || {};
    const priorityConfig = PRIORITY_LEVELS[form.priority] || {};
    const confConfig = CONFIDENTIALITY_LEVELS[form.confidentiality] || {};

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="info" sx={{ mb: 2 }}>
            راجع بيانات المراسلة قبل الإرسال أو الحفظ كمسودة
          </Alert>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>البيانات الأساسية</Typography>
              <Divider sx={{ mb: 1 }} />
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">النوع:</Typography>
                  <Chip label={typeConfig.label} size="small" sx={{ bgcolor: typeConfig.bg, color: typeConfig.color }} />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">الأولوية:</Typography>
                  <Chip label={priorityConfig.label} size="small" color={priorityConfig.chipColor} variant="outlined" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">السرية:</Typography>
                  <Typography variant="body2">{confConfig.label}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">الموضوع:</Typography>
                  <Typography variant="body2" fontWeight="bold">{form.subject || '—'}</Typography>
                </Box>
                {form.externalReferenceNumber && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">مرجع خارجي:</Typography>
                    <Typography variant="body2">{form.externalReferenceNumber}</Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>المرسل والمستلم</Typography>
              <Divider sx={{ mb: 1 }} />
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">المرسل:</Typography>
                  <Typography variant="body2">
                    {form.senderName || '(الحالي)'}
                    {form.senderDepartment ? ` — ${DEPARTMENTS.find(d => d.value === form.senderDepartment)?.label || ''}` : ''}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">نوع المرسل:</Typography>
                  <Chip label={SENDER_TYPES[form.senderType]?.label} size="small" variant="outlined" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">المستلم:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {form.recipientName || '—'}
                    {form.recipientOrganization ? ` — ${form.recipientOrganization}` : ''}
                  </Typography>
                </Box>
                {form.ccList.length > 0 && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">نسخة إلى:</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {form.ccList.map((cc, i) => (
                        <Chip key={i} label={cc.name} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                )}
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">الاستحقاق:</Typography>
                  <Typography variant="body2">
                    {form.dueDate ? new Date(form.dueDate).toLocaleDateString('ar-SA') : 'غير محدد'}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">المرفقات:</Typography>
                  <Typography variant="body2">{attachments.length} ملف</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>نص المراسلة</Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                {form.content || '(لا يوجد محتوى)'}
              </Typography>
              {form.summary && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">الملخص: {form.summary}</Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const getStepContent = step => {
    switch (step) {
      case 0: return renderStep1();
      case 1: return renderStep2();
      case 2: return renderStep3();
      default: return null;
    }
  };

  /* ─── Render ───────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ p: 3 }}>
      <Paper
        sx={{
          p: 3, mb: 3,
          background: gradients?.primary || 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: '#fff', borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(25,118,210,0.25)',
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton sx={{ color: '#fff' }} onClick={() => navigate(-1)}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {replyToId ? 'الرد على مراسلة' : 'إنشاء مراسلة جديدة'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {CORRESPONDENCE_TYPES[form.type]?.label || 'مراسلة'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 3, borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)' }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map(label => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>{getStepContent(activeStep)}</Paper>

      <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid rgba(0,0,0,0.04)' }}>
        <Box display="flex" justifyContent="space-between">
          <Box>
            {activeStep > 0 && (
              <Button onClick={() => setActiveStep(prev => prev - 1)}>السابق</Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving || sending}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ كمسودة'}
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button variant="contained" onClick={() => setActiveStep(prev => prev + 1)}>
                التالي
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                startIcon={<SendIcon />}
                onClick={handleSend}
                disabled={saving || sending}
              >
                {sending ? 'جاري الإرسال...' : 'إرسال المراسلة'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
