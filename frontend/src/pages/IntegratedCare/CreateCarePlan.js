import { useState, useEffect } from 'react';


import apiClient from 'services/api.client';
import { useNavigate } from 'react-router-dom';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

// Section Types Definition
const DOMAINS = {
  educational: ['academic', 'classroom', 'communication'],
  therapeutic: ['speech', 'occupational', 'physical', 'behavioral', 'psychological'],
  lifeSkills: ['selfCare', 'homeSkills', 'social', 'transport', 'financial'],
};

function CreateCarePlan() {
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    beneficiary: '',
    startDate: new Date().toISOString().split('T')[0],
    status: 'DRAFT',
    educational: { enabled: false, domains: {} },
    therapeutic: { enabled: false, domains: {} },
    lifeSkills: { enabled: false, domains: {} },
  });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await apiClient.get('/integrated-care/students');
        const list = Array.isArray(res) ? res : res?.data || [];
        setStudents(list);
      } catch {
        setStudents([
          { _id: '678509efc8619e0780280459', name: 'أحمد محمد' },
          { _id: '678509efc8619e0780280460', name: 'سارة علي' },
        ]);
      }
    };
    fetchStudents();
  }, []);

  // --- HANDLERS ---

  const handleBasicChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSectionToggle = section => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], enabled: !prev[section].enabled },
    }));
  };

  // Helper to safely set deeply nested domain data
  const handleDomainChange = (section, domain, field, value) => {
    setFormData(prev => {
      const currentDomains = prev[section].domains || {};
      const currentDomainData = currentDomains[domain] || { goals: [], notes: '' };

      return {
        ...prev,
        [section]: {
          ...prev[section],
          domains: {
            ...currentDomains,
            [domain]: { ...currentDomainData, [field]: value },
          },
        },
      };
    });
  };

  const addGoal = (section, domain) => {
    setFormData(prev => {
      const currentDomains = prev[section].domains || {};
      const currentDomainData = currentDomains[domain] || { goals: [], notes: '' };
      const currentGoals = currentDomainData.goals || [];

      return {
        ...prev,
        [section]: {
          ...prev[section],
          domains: {
            ...currentDomains,
            [domain]: {
              ...currentDomainData,
              goals: [
                ...currentGoals,
                { title: '', type: domain.toUpperCase(), target: '', status: 'PENDING' },
              ],
            },
          },
        },
      };
    });
  };

  const updateGoal = (section, domain, index, field, value) => {
    setFormData(prev => {
      const currentDomainData = prev[section].domains[domain]; // Assumes exist if we are editing
      const updatedGoals = [...currentDomainData.goals];
      updatedGoals[index] = { ...updatedGoals[index], [field]: value };

      return {
        ...prev,
        [section]: {
          ...prev[section],
          domains: {
            ...prev[section].domains,
            [domain]: { ...currentDomainData, goals: updatedGoals },
          },
        },
      };
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await apiClient.post('/integrated-care/plans', formData);
      navigate('/integrated-care');
    } catch (err) {
      logger.error(err);
      showSnackbar('خطأ في إنشاء الخطة', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERERS ---

  const renderSectionStep = (sectionName, _title) => {
    if (!formData[sectionName].enabled) return <Typography>هذا القسم غير مفعّل.</Typography>;

    return (
      <Grid container spacing={3}>
        {DOMAINS[sectionName].map(domain => (
          <Grid item xs={12} key={domain}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  {domain.charAt(0).toUpperCase() + domain.slice(1)} Domain
                </Typography>

                <TextField
                  fullWidth
                  label="ملاحظات عامة / خط الأساس"
                  multiline
                  rows={2}
                  sx={{ mb: 2 }}
                  onChange={e => handleDomainChange(sectionName, domain, 'notes', e.target.value)}
                />

                <Typography variant="subtitle2" gutterBottom>
                  الأهداف:
                </Typography>
                {(formData[sectionName].domains?.[domain]?.goals || []).map((goal, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      label="عنوان الهدف"
                      size="small"
                      fullWidth
                      value={goal.title}
                      onChange={e => updateGoal(sectionName, domain, idx, 'title', e.target.value)}
                    />
                    <TextField
                      label="معايير الهدف"
                      size="small"
                      sx={{ width: '150px' }}
                      value={goal.target}
                      onChange={e => updateGoal(sectionName, domain, idx, 'target', e.target.value)}
                    />
                  </Box>
                ))}

                <Button
                  startIcon={<AddIcon />}
                  size="small"
                  onClick={() => addGoal(sectionName, domain)}
                >
                  إضافة هدف
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const steps = [
    'المعلومات الأساسية',
    'الخطة التعليمية',
    'الخطة العلاجية',
    'خطة المهارات الحياتية',
    'المراجعة',
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.success, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssignmentIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              إنشاء خطة رعاية
            </Typography>
            <Typography variant="body2">إعداد خطة رعاية متكاملة للمستفيد</Typography>
          </Box>
        </Box>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          إنشاء خطة رعاية متكاملة
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 2, mb: 4 }}>
          {activeStep === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="المستفيد"
                  name="beneficiary"
                  value={formData.beneficiary}
                  onChange={handleBasicChange}
                >
                  {students.map(s => (
                    <MenuItem key={s._id} value={s._id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  type="date"
                  fullWidth
                  label="تاريخ البداية"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleBasicChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>اختيار الأقسام المفعلة</Divider>
                <Box sx={{ display: 'flex', gap: '20px' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.educational.enabled}
                        onChange={() => handleSectionToggle('educational')}
                      />
                    }
                    label="الخطة التعليمية"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.therapeutic.enabled}
                        onChange={() => handleSectionToggle('therapeutic')}
                      />
                    }
                    label="الخطة العلاجية"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.lifeSkills.enabled}
                        onChange={() => handleSectionToggle('lifeSkills')}
                      />
                    }
                    label="خطة المهارات الحياتية"
                  />
                </Box>
              </Grid>
            </Grid>
          )}

          {activeStep === 1 && renderSectionStep('educational', 'Educational Plan')}
          {activeStep === 2 && renderSectionStep('therapeutic', 'Therapeutic Plan')}
          {activeStep === 3 && renderSectionStep('lifeSkills', 'Life Skills Plan')}

          {activeStep === 4 && (
            <Box>
              <Typography variant="h6">الملخص</Typography>
              <Typography>رقم المستفيد: {formData.beneficiary}</Typography>
              <Typography>تاريخ البداية: {formData.startDate}</Typography>
              <Typography>
                الأقسام:
                {[
                  formData.educational.enabled ? ' تعليمي ' : '',
                  formData.therapeutic.enabled ? ' علاجي ' : '',
                  formData.lifeSkills.enabled ? ' مهارات حياتية ' : '',
                ]}
              </Typography>
              <Button
                variant="contained"
                color="success"
                size="large"
                fullWidth
                sx={{ mt: 4 }}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'جاري الإنشاء...' : 'إنشاء الخطة'}
              </Button>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button disabled={activeStep === 0} onClick={() => setActiveStep(prev => prev - 1)}>
            السابق
          </Button>
          {activeStep < steps.length - 1 && (
            <Button variant="contained" onClick={() => setActiveStep(prev => prev + 1)}>
              التالي
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default CreateCarePlan;
