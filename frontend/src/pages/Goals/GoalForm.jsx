// Goal Form - GoalForm.jsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import api from '../../services/api';

const GoalForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(id ? true : false);
  const [error, setError] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [domains] = useState([
    'مجال حركي',
    'مجال إدراكي',
    'مجال لغوي',
    'مجال نفسي اجتماعي',
    'مجال أكاديمي'
  ]);

  const validationSchema = Yup.object().shape({
    beneficiary_id: Yup.string().required('يجب اختيار المستفيد'),
    goal_description: Yup.string().required('يجب إدخال وصف الهدف'),
    domain: Yup.string().required('يجب اختيار المجال'),
    target_value: Yup.number().required('يجب تحديد القيمة المستهدفة'),
    start_date: Yup.date().required('يجب تحديد تاريخ البداية'),
    target_date: Yup.date().required('يجب تحديد تاريخ النهاية'),
    strategies: Yup.string().required('يجب تحديد الاستراتيجيات')
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const beneficiariesRes = await api.get('/beneficiaries?per_page=100');
        setBeneficiaries(beneficiariesRes.data.data || []);

        if (id) {
          const goalRes = await api.get(`/goals/${id}`);
          setGoal(goalRes.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'حدث خطأ');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const data = {
        ...values,
        start_date: new Date(values.start_date).toISOString().split('T')[0],
        target_date: new Date(values.target_date).toISOString().split('T')[0]
      };

      if (id) {
        await api.put(`/goals/${id}`, data);
      } else {
        await api.post('/goals', data);
      }

      navigate('/goals');
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const initialValues = goal || {
    beneficiary_id: '',
    goal_description: '',
    domain: '',
    goal_category: 'short_term',
    target_value: 100,
    current_progress: 0,
    start_date: new Date().toISOString().split('T')[0],
    target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    strategies: '',
    evaluation_criteria: ''
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        {id ? 'تعديل الهدف' : 'إضافة هدف جديد'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  معلومات الهدف الأساسية
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      name="beneficiary_id"
                      label="المستفيد"
                      value={values.beneficiary_id}
                      onChange={(e) => setFieldValue('beneficiary_id', e.target.value)}
                      error={touched.beneficiary_id && !!errors.beneficiary_id}
                      helperText={touched.beneficiary_id && errors.beneficiary_id}
                    >
                      {beneficiaries.map((ben) => (
                        <MenuItem key={ben.id} value={ben.id}>
                          {ben.first_name} {ben.last_name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      name="goal_description"
                      label="وصف الهدف"
                      value={values.goal_description}
                      onChange={(e) => setFieldValue('goal_description', e.target.value)}
                      error={touched.goal_description && !!errors.goal_description}
                      helperText={touched.goal_description && errors.goal_description}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      name="domain"
                      label="المجال"
                      value={values.domain}
                      onChange={(e) => setFieldValue('domain', e.target.value)}
                      error={touched.domain && !!errors.domain}
                      helperText={touched.domain && errors.domain}
                    >
                      {domains.map((domain) => (
                        <MenuItem key={domain} value={domain}>
                          {domain}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <FormLabel>فئة الهدف</FormLabel>
                      <RadioGroup
                        row
                        name="goal_category"
                        value={values.goal_category}
                        onChange={(e) => setFieldValue('goal_category', e.target.value)}
                      >
                        <FormControlLabel
                          value="short_term"
                          control={<Radio />}
                          label="قصير الأجل"
                        />
                        <FormControlLabel
                          value="long_term"
                          control={<Radio />}
                          label="طويل الأجل"
                        />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      name="start_date"
                      label="تاريخ البداية"
                      value={values.start_date}
                      onChange={(e) => setFieldValue('start_date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      error={touched.start_date && !!errors.start_date}
                      helperText={touched.start_date && errors.start_date}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      name="target_date"
                      label="تاريخ النهاية المستهدفة"
                      value={values.target_date}
                      onChange={(e) => setFieldValue('target_date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      error={touched.target_date && !!errors.target_date}
                      helperText={touched.target_date && errors.target_date}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      name="target_value"
                      label="القيمة المستهدفة"
                      value={values.target_value}
                      onChange={(e) => setFieldValue('target_value', parseInt(e.target.value))}
                      error={touched.target_value && !!errors.target_value}
                      helperText={touched.target_value && errors.target_value}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      name="current_progress"
                      label="التقدم الحالي"
                      value={values.current_progress}
                      onChange={(e) => setFieldValue('current_progress', parseInt(e.target.value))}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  الاستراتيجيات والتقييم
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      name="strategies"
                      label="الاستراتيجيات المستخدمة"
                      value={values.strategies}
                      onChange={(e) => setFieldValue('strategies', e.target.value)}
                      error={touched.strategies && !!errors.strategies}
                      helperText={touched.strategies && errors.strategies}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      name="evaluation_criteria"
                      label="معايير التقييم"
                      value={values.evaluation_criteria}
                      onChange={(e) => setFieldValue('evaluation_criteria', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Buttons */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'جاري الحفظ...' : id ? 'تحديث' : 'إنشاء'}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => navigate('/goals')}
              >
                إلغاء
              </Button>
            </Box>
          </Form>
        )}
      </Formik>
    </Container>
  );
};

export default GoalForm;
