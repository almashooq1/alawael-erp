import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Add, Save } from '@mui/icons-material';
import arSA from 'date-fns/locale/ar-SA';

const AddGoalDialog = ({ open, onClose, irpId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'motor',
    
    // Specific
    specific: {
      what: '',
      who: '',
      where: '',
      why: ''
    },
    
    // Measurable
    measurable: {
      metric: '',
      unit: '',
      baseline: 0,
      target: 0,
      milestones: []
    },
    
    // Achievable
    achievable: {
      isRealistic: true,
      requiredResources: [],
      potentialBarriers: [],
      supportStrategies: []
    },
    
    // Relevant
    relevant: {
      alignsWithOverallGoals: true,
      benefitDescription: '',
      priorityLevel: 'medium'
    },
    
    // Time-bound
    timeBound: {
      startDate: new Date(),
      targetDate: null,
      reviewDates: []
    }
  });

  const [milestoneInput, setMilestoneInput] = useState({ value: '', date: null });
  const [resourceInput, setResourceInput] = useState('');
  const [barrierInput, setBarrierInput] = useState('');
  const [strategyInput, setStrategyInput] = useState('');

  const categories = [
    { value: 'motor', label: 'مهارات حركية' },
    { value: 'cognitive', label: 'مهارات معرفية' },
    { value: 'social', label: 'مهارات اجتماعية' },
    { value: 'communication', label: 'التواصل' },
    { value: 'self_care', label: 'العناية الذاتية' },
    { value: 'behavioral', label: 'سلوكية' },
    { value: 'academic', label: 'أكاديمية' }
  ];

  const priorityLevels = [
    { value: 'critical', label: 'حرج' },
    { value: 'high', label: 'مرتفع' },
    { value: 'medium', label: 'متوسط' },
    { value: 'low', label: 'منخفض' }
  ];

  const handleChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addMilestone = () => {
    if (milestoneInput.value && milestoneInput.date) {
      setFormData(prev => ({
        ...prev,
        measurable: {
          ...prev.measurable,
          milestones: [
            ...prev.measurable.milestones,
            {
              value: parseFloat(milestoneInput.value),
              date: milestoneInput.date,
              description: `معلم رئيسي: ${milestoneInput.value}`
            }
          ]
        }
      }));
      setMilestoneInput({ value: '', date: null });
    }
  };

  const addResource = () => {
    if (resourceInput.trim()) {
      setFormData(prev => ({
        ...prev,
        achievable: {
          ...prev.achievable,
          requiredResources: [...prev.achievable.requiredResources, resourceInput]
        }
      }));
      setResourceInput('');
    }
  };

  const addBarrier = () => {
    if (barrierInput.trim()) {
      setFormData(prev => ({
        ...prev,
        achievable: {
          ...prev.achievable,
          potentialBarriers: [...prev.achievable.potentialBarriers, barrierInput]
        }
      }));
      setBarrierInput('');
    }
  };

  const addStrategy = () => {
    if (strategyInput.trim()) {
      setFormData(prev => ({
        ...prev,
        achievable: {
          ...prev.achievable,
          supportStrategies: [...prev.achievable.supportStrategies, strategyInput]
        }
      }));
      setStrategyInput('');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/smart-irp/${irpId}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.data);
        onClose();
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: 'motor',
          specific: { what: '', who: '', where: '', why: '' },
          measurable: { metric: '', unit: '', baseline: 0, target: 0, milestones: [] },
          achievable: { isRealistic: true, requiredResources: [], potentialBarriers: [], supportStrategies: [] },
          relevant: { alignsWithOverallGoals: true, benefitDescription: '', priorityLevel: 'medium' },
          timeBound: { startDate: new Date(), targetDate: null, reviewDates: [] }
        });
      } else {
        setError(data.message || 'فشل في إضافة الهدف');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم');
      console.error('Error adding goal:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Add />
          <Typography variant="h6">إضافة هدف SMART جديد</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={arSA}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                معلومات أساسية
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان الهدف"
                value={formData.title}
                onChange={(e) => handleChange(null, 'title', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="وصف الهدف"
                value={formData.description}
                onChange={(e) => handleChange(null, 'description', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>المجال</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => handleChange(null, 'category', e.target.value)}
                  label="المجال"
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* S - Specific */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom sx={{ mt: 2 }}>
                S - محدد (Specific)
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ماذا سيتم إنجازه؟ (What)"
                value={formData.specific.what}
                onChange={(e) => handleChange('specific', 'what', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="من سينجزه؟ (Who)"
                value={formData.specific.who}
                onChange={(e) => handleChange('specific', 'who', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="أين سيتم؟ (Where)"
                value={formData.specific.where}
                onChange={(e) => handleChange('specific', 'where', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="لماذا هو مهم؟ (Why)"
                value={formData.specific.why}
                onChange={(e) => handleChange('specific', 'why', e.target.value)}
              />
            </Grid>

            {/* M - Measurable */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom sx={{ mt: 2 }}>
                M - قابل للقياس (Measurable)
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="المقياس (Metric)"
                value={formData.measurable.metric}
                onChange={(e) => handleChange('measurable', 'metric', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="وحدة القياس (Unit)"
                value={formData.measurable.unit}
                onChange={(e) => handleChange('measurable', 'unit', e.target.value)}
                placeholder="مثال: كلمات، دقائق، مرات..."
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="نقطة البداية (Baseline)"
                value={formData.measurable.baseline}
                onChange={(e) => handleChange('measurable', 'baseline', parseFloat(e.target.value) || 0)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="الهدف المطلوب (Target)"
                value={formData.measurable.target}
                onChange={(e) => handleChange('measurable', 'target', parseFloat(e.target.value) || 0)}
                required
              />
            </Grid>

            {/* Milestones */}
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                المعالم الرئيسية (Milestones)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  type="number"
                  label="القيمة"
                  value={milestoneInput.value}
                  onChange={(e) => setMilestoneInput(prev => ({ ...prev, value: e.target.value }))}
                  sx={{ flex: 1 }}
                />
                <DatePicker
                  label="التاريخ"
                  value={milestoneInput.date}
                  onChange={(date) => setMilestoneInput(prev => ({ ...prev, date }))}
                  renderInput={(params) => <TextField {...params} size="small" sx={{ flex: 1 }} />}
                />
                <Button variant="outlined" onClick={addMilestone}>
                  إضافة
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {formData.measurable.milestones.map((milestone, index) => (
                  <Chip
                    key={index}
                    label={`${milestone.value} - ${new Date(milestone.date).toLocaleDateString('ar-SA')}`}
                    onDelete={() => {
                      setFormData(prev => ({
                        ...prev,
                        measurable: {
                          ...prev.measurable,
                          milestones: prev.measurable.milestones.filter((_, i) => i !== index)
                        }
                      }));
                    }}
                  />
                ))}
              </Box>
            </Grid>

            {/* A - Achievable */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom sx={{ mt: 2 }}>
                A - قابل للتحقيق (Achievable)
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                الموارد المطلوبة
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="أضف مورد"
                  value={resourceInput}
                  onChange={(e) => setResourceInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addResource()}
                />
                <Button variant="outlined" onClick={addResource}>
                  إضافة
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {formData.achievable.requiredResources.map((resource, index) => (
                  <Chip
                    key={index}
                    label={resource}
                    onDelete={() => {
                      setFormData(prev => ({
                        ...prev,
                        achievable: {
                          ...prev.achievable,
                          requiredResources: prev.achievable.requiredResources.filter((_, i) => i !== index)
                        }
                      }));
                    }}
                  />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                العوائق المحتملة
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="أضف عائق"
                  value={barrierInput}
                  onChange={(e) => setBarrierInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addBarrier()}
                />
                <Button variant="outlined" onClick={addBarrier}>
                  إضافة
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {formData.achievable.potentialBarriers.map((barrier, index) => (
                  <Chip
                    key={index}
                    label={barrier}
                    color="warning"
                    onDelete={() => {
                      setFormData(prev => ({
                        ...prev,
                        achievable: {
                          ...prev.achievable,
                          potentialBarriers: prev.achievable.potentialBarriers.filter((_, i) => i !== index)
                        }
                      }));
                    }}
                  />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                استراتيجيات الدعم
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="أضف استراتيجية"
                  value={strategyInput}
                  onChange={(e) => setStrategyInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addStrategy()}
                />
                <Button variant="outlined" onClick={addStrategy}>
                  إضافة
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {formData.achievable.supportStrategies.map((strategy, index) => (
                  <Chip
                    key={index}
                    label={strategy}
                    color="success"
                    onDelete={() => {
                      setFormData(prev => ({
                        ...prev,
                        achievable: {
                          ...prev.achievable,
                          supportStrategies: prev.achievable.supportStrategies.filter((_, i) => i !== index)
                        }
                      }));
                    }}
                  />
                ))}
              </Box>
            </Grid>

            {/* R - Relevant */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom sx={{ mt: 2 }}>
                R - ذو صلة (Relevant)
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="وصف الفائدة"
                value={formData.relevant.benefitDescription}
                onChange={(e) => handleChange('relevant', 'benefitDescription', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>مستوى الأولوية</InputLabel>
                <Select
                  value={formData.relevant.priorityLevel}
                  onChange={(e) => handleChange('relevant', 'priorityLevel', e.target.value)}
                  label="مستوى الأولوية"
                >
                  {priorityLevels.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* T - Time-bound */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom sx={{ mt: 2 }}>
                T - محدد بوقت (Time-bound)
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="تاريخ البداية"
                value={formData.timeBound.startDate}
                onChange={(date) => handleChange('timeBound', 'startDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="تاريخ الهدف"
                value={formData.timeBound.targetDate}
                onChange={(date) => handleChange('timeBound', 'targetDate', date)}
                minDate={formData.timeBound.startDate}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </Grid>
          </Grid>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSubmit}
          disabled={loading || !formData.title || !formData.measurable.metric || !formData.measurable.target}
        >
          {loading ? 'جاري الحفظ...' : 'حفظ الهدف'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddGoalDialog;
