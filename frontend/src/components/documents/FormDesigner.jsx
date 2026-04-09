/**
 * FormDesigner — مصمم النماذج الديناميكية
 * إنشاء وتعديل قوالب النماذج بحقول متعددة الأنواع
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Select, MenuItem, FormControl, InputLabel, IconButton,
  Tooltip, Stack, Paper, Typography, Chip, Divider, Grid,
  Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
  Alert, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  TextFields as TextIcon,
  Numbers as NumberIcon,
  CalendarMonth as DateIcon,
  ArrowDropDownCircle as SelectIcon,
  CheckBox as CheckboxIcon,
  RadioButtonChecked as RadioIcon,
  AttachFile as FileIcon,
  Draw as SignatureIcon,
  LocationOn as LocationIcon,
  Star as RatingIcon,
  FormatListBulleted as TextareaIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Link as UrlIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  ContentCopy as CloneIcon,
} from '@mui/icons-material';

const FIELD_TYPES = [
  { type: 'text', label: 'نص', icon: <TextIcon /> },
  { type: 'textarea', label: 'نص طويل', icon: <TextareaIcon /> },
  { type: 'number', label: 'رقم', icon: <NumberIcon /> },
  { type: 'email', label: 'بريد إلكتروني', icon: <EmailIcon /> },
  { type: 'phone', label: 'هاتف', icon: <PhoneIcon /> },
  { type: 'url', label: 'رابط', icon: <UrlIcon /> },
  { type: 'date', label: 'تاريخ', icon: <DateIcon /> },
  { type: 'select', label: 'قائمة منسدلة', icon: <SelectIcon /> },
  { type: 'checkbox', label: 'مربع اختيار', icon: <CheckboxIcon /> },
  { type: 'radio', label: 'اختيار أحادي', icon: <RadioIcon /> },
  { type: 'file', label: 'ملف', icon: <FileIcon /> },
  { type: 'signature', label: 'توقيع', icon: <SignatureIcon /> },
  { type: 'location', label: 'موقع', icon: <LocationIcon /> },
  { type: 'rating', label: 'تقييم', icon: <RatingIcon /> },
];

const DEFAULT_FIELD = {
  name: '', labelAr: '', labelEn: '', type: 'text', required: false,
  placeholder: '', defaultValue: '', helpText: '',
  options: [], // for select/radio
  validation: { minLength: '', maxLength: '', min: '', max: '', pattern: '' },
  conditionalOn: '', conditionalValue: '',
};

function FieldEditor({ field, index, totalFields, onChange, onDelete, onMove, onClone, allFields }) {
  const update = (key, val) => onChange(index, { ...field, [key]: val });
  const updateValidation = (key, val) => onChange(index, { ...field, validation: { ...field.validation, [key]: val } });
  const hasOptions = ['select', 'radio'].includes(field.type);

  return (
    <Paper dir="rtl" sx={{ p: 2, mb: 1, borderRadius: 2, borderRight: `4px solid ${field.required ? '#f44336' : '#1976d2'}`, bgcolor: 'background.default' }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <DragIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
        <Chip label={`#${index + 1}`} size="small" />
        <Chip label={FIELD_TYPES.find(t => t.type === field.type)?.label || field.type} size="small" color="primary" icon={FIELD_TYPES.find(t => t.type === field.type)?.icon} />
        <Typography fontWeight="bold" flex={1}>{field.labelAr || 'حقل جديد'}</Typography>
        {field.required && <Chip label="مطلوب" size="small" color="error" />}
        <Box flex={1} />
        <Tooltip title="أعلى"><span><IconButton size="small" disabled={index === 0} onClick={() => onMove(index, -1)}><UpIcon /></IconButton></span></Tooltip>
        <Tooltip title="أسفل"><span><IconButton size="small" disabled={index === totalFields - 1} onClick={() => onMove(index, 1)}><DownIcon /></IconButton></span></Tooltip>
        <Tooltip title="نسخ"><IconButton size="small" onClick={() => onClone(index)}><CloneIcon /></IconButton></Tooltip>
        <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => onDelete(index)}><DeleteIcon /></IconButton></Tooltip>
      </Stack>

      <Grid container spacing={1.5}>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>النوع</InputLabel>
            <Select value={field.type} label="النوع" onChange={e => update('type', e.target.value)}>
              {FIELD_TYPES.map(ft => <MenuItem key={ft.type} value={ft.type}>{ft.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth size="small" label="الاسم البرمجي" value={field.name} onChange={e => update('name', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth size="small" label="التسمية (عربي)" value={field.labelAr} onChange={e => update('labelAr', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth size="small" label="التسمية (English)" value={field.labelEn} onChange={e => update('labelEn', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth size="small" label="نص توضيحي" value={field.placeholder} onChange={e => update('placeholder', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth size="small" label="القيمة الافتراضية" value={field.defaultValue} onChange={e => update('defaultValue', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth size="small" label="نص المساعدة" value={field.helpText} onChange={e => update('helpText', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControlLabel control={<Switch checked={field.required} onChange={e => update('required', e.target.checked)} />} label="مطلوب" />
        </Grid>
      </Grid>

      {/* Options for select/radio */}
      {hasOptions && (
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary" gutterBottom>الخيارات (سطر لكل خيار)</Typography>
          <TextField fullWidth size="small" multiline rows={3} value={(field.options || []).join('\n')} onChange={e => update('options', e.target.value.split('\n'))} placeholder="خيار 1\nخيار 2\nخيار 3" />
        </Box>
      )}

      {/* Validation */}
      <Accordion sx={{ mt: 1 }} disableGutters elevation={0}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SettingsIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2">التحقق والشروط</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={1}>
            {['text', 'textarea', 'email', 'url'].includes(field.type) && <>
              <Grid item xs={6}><TextField fullWidth size="small" type="number" label="الحد الأدنى للحروف" value={field.validation?.minLength || ''} onChange={e => updateValidation('minLength', e.target.value)} /></Grid>
              <Grid item xs={6}><TextField fullWidth size="small" type="number" label="الحد الأقصى للحروف" value={field.validation?.maxLength || ''} onChange={e => updateValidation('maxLength', e.target.value)} /></Grid>
            </>}
            {field.type === 'number' && <>
              <Grid item xs={6}><TextField fullWidth size="small" type="number" label="الحد الأدنى" value={field.validation?.min || ''} onChange={e => updateValidation('min', e.target.value)} /></Grid>
              <Grid item xs={6}><TextField fullWidth size="small" type="number" label="الحد الأقصى" value={field.validation?.max || ''} onChange={e => updateValidation('max', e.target.value)} /></Grid>
            </>}
            <Grid item xs={12}><TextField fullWidth size="small" label="نمط Regex" value={field.validation?.pattern || ''} onChange={e => updateValidation('pattern', e.target.value)} /></Grid>
          </Grid>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" color="text.secondary" mb={0.5}>العرض الشرطي</Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>يعتمد على حقل</InputLabel>
                <Select value={field.conditionalOn || ''} label="يعتمد على حقل" onChange={e => update('conditionalOn', e.target.value)}>
                  <MenuItem value="">بلا</MenuItem>
                  {allFields.filter((_, fi) => fi !== index).map((af, fi) => (
                    <MenuItem key={fi} value={af.name}>{af.labelAr || af.name || `حقل ${fi + 1}`}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="القيمة المطلوبة" value={field.conditionalValue || ''} onChange={e => update('conditionalValue', e.target.value)} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}

function FieldPreview({ fields }) {
  if (!fields.length) return <Alert severity="info">أضف حقولاً لمعاينة النموذج</Alert>;
  return (
    <Paper dir="rtl" sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>معاينة النموذج</Typography>
      <Grid container spacing={2}>
        {fields.map((f, i) => (
          <Grid item xs={12} md={f.type === 'textarea' ? 12 : 6} key={i}>
            {f.type === 'text' && <TextField fullWidth label={f.labelAr} required={f.required} placeholder={f.placeholder} helperText={f.helpText} />}
            {f.type === 'textarea' && <TextField fullWidth multiline rows={3} label={f.labelAr} required={f.required} placeholder={f.placeholder} />}
            {f.type === 'number' && <TextField fullWidth type="number" label={f.labelAr} required={f.required} />}
            {f.type === 'email' && <TextField fullWidth type="email" label={f.labelAr} required={f.required} />}
            {f.type === 'phone' && <TextField fullWidth type="tel" label={f.labelAr} required={f.required} />}
            {f.type === 'url' && <TextField fullWidth type="url" label={f.labelAr} required={f.required} />}
            {f.type === 'date' && <TextField fullWidth type="date" label={f.labelAr} required={f.required} InputLabelProps={{ shrink: true }} />}
            {f.type === 'select' && (
              <FormControl fullWidth required={f.required}>
                <InputLabel>{f.labelAr}</InputLabel>
                <Select label={f.labelAr}>
                  {(f.options || []).map((o, oi) => <MenuItem key={oi} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {f.type === 'checkbox' && <FormControlLabel control={<Switch />} label={f.labelAr} />}
            {f.type === 'radio' && (
              <Box><Typography variant="body2" gutterBottom>{f.labelAr}</Typography>
                {(f.options || []).map((o, oi) => <Chip key={oi} label={o} variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />)}
              </Box>
            )}
            {f.type === 'file' && <Button variant="outlined" startIcon={<FileIcon />}>{f.labelAr || 'اختر ملف'}</Button>}
            {f.type === 'signature' && <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderStyle: 'dashed' }}><SignatureIcon sx={{ fontSize: 40, color: 'text.secondary' }} /><Typography variant="body2" color="text.secondary">{f.labelAr || 'منطقة التوقيع'}</Typography></Paper>}
            {f.type === 'location' && <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderStyle: 'dashed' }}><LocationIcon sx={{ fontSize: 40, color: 'text.secondary' }} /><Typography variant="body2" color="text.secondary">{f.labelAr || 'الموقع'}</Typography></Paper>}
            {f.type === 'rating' && <Stack direction="row">{[1,2,3,4,5].map(s => <RatingIcon key={s} sx={{ color: s <= 3 ? '#ffc107' : '#e0e0e0' }} />)}</Stack>}
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}

export default function FormDesigner({ open, onClose, onSave, template }) {
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('عام');
  const [color, setColor] = useState('#1976d2');
  const [fields, setFields] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setNameAr(template.nameAr || '');
      setDescription(template.description || '');
      setCategory(template.category || 'عام');
      setColor(template.color || '#1976d2');
      setFields(template.fields?.map(f => ({ ...DEFAULT_FIELD, ...f })) || []);
    } else {
      setName(''); setNameAr(''); setDescription(''); setCategory('عام'); setColor('#1976d2'); setFields([]);
    }
  }, [template, open]);

  const addField = (type) => setFields(prev => [...prev, { ...DEFAULT_FIELD, type, name: `field_${prev.length + 1}` }]);
  const updateField = (idx, data) => setFields(prev => prev.map((f, i) => i === idx ? data : f));
  const deleteField = (idx) => setFields(prev => prev.filter((_, i) => i !== idx));
  const moveField = (idx, dir) => {
    const arr = [...fields]; const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]]; setFields(arr);
  };
  const cloneField = (idx) => setFields(prev => [...prev.slice(0, idx + 1), { ...prev[idx], name: `${prev[idx].name}_copy` }, ...prev.slice(idx + 1)]);

  const handleSave = () => {
    onSave({ name, nameAr, description, category, color, fields: fields.map(({ conditionalOn, conditionalValue, ...f }) => ({
      ...f,
      ...(conditionalOn && { conditionalOn, conditionalValue }),
    })) });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">{template ? 'تعديل القالب' : 'إنشاء قالب جديد'}</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" startIcon={previewMode ? <SettingsIcon /> : <PreviewIcon />} onClick={() => setPreviewMode(!previewMode)}>
              {previewMode ? 'تصميم' : 'معاينة'}
            </Button>
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent dividers dir="rtl" sx={{ minHeight: 500 }}>
        {/* Template Info */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="الاسم البرمجي" value={name} onChange={e => setName(e.target.value)} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="الاسم بالعربية" value={nameAr} onChange={e => setNameAr(e.target.value)} /></Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>التصنيف</InputLabel>
              <Select value={category} label="التصنيف" onChange={e => setCategory(e.target.value)}>
                {['عام', 'عقود', 'فواتير', 'موارد بشرية', 'تقارير', 'مالية', 'إدارية', 'قانونية'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}><TextField fullWidth size="small" type="color" label="اللون" value={color} onChange={e => setColor(e.target.value)} /></Grid>
          <Grid item xs={12} md={2}><TextField fullWidth size="small" label="الوصف" value={description} onChange={e => setDescription(e.target.value)} /></Grid>
        </Grid>

        {previewMode ? <FieldPreview fields={fields} /> : (
          <>
            {/* Toolbox */}
            <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" gutterBottom>إضافة حقل</Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {FIELD_TYPES.map(ft => (
                  <Chip key={ft.type} label={ft.label} icon={ft.icon} onClick={() => addField(ft.type)} variant="outlined" clickable size="small" />
                ))}
              </Stack>
            </Paper>

            {/* Fields Editor */}
            {fields.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>ابدأ بإضافة حقول من شريط الأدوات أعلاه</Alert>}
            {fields.map((f, i) => (
              <FieldEditor key={i} field={f} index={i} totalFields={fields.length}
                onChange={updateField} onDelete={deleteField} onMove={moveField} onClone={cloneField} allFields={fields} />
            ))}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, px: 2 }}>{fields.length} حقل</Typography>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!name && !nameAr}>حفظ</Button>
      </DialogActions>
    </Dialog>
  );
}
