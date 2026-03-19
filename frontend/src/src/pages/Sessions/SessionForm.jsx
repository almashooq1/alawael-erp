// Session Form - SessionForm.jsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  MenuItem,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import api from '../../utils/api';

const SessionForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(id ? true : false);
  const [error, setError] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [sessionTypes] = useState([
    'جلسة فردية',
    'جلسة جماعية',
    'جلسة أسرية',
    'جلسة توعوية',
    'جلسة متابعة'
  ]);

  const validationSchema = Yup.object().shape({
    beneficiary_id: Yup.string().required('يجب اختيار المستفيد'),
    therapist_id: Yup.string().required('يجب اختيار المعالج'),
    session_type: Yup.string().required('يجب اختيار نوع الجلسة'),
    session_date: Yup.date().required('يجب تحديد التاريخ'),
    session_time: Yup.string().required('يجب تحديد الوقت'),
    duration_minutes: Yup.number().min(15).required('يجب تحديد المدة'),
    session_objectives: Yup.string().required('يجب تحديد الأهداف')
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const beneficiariesRes = await api.get('/beneficiaries?per_page=100');
        setBeneficiaries(beneficiariesRes.data.data || []);

        const therapistsRes = await api.get('/users?role=therapist&per_page=100');
        setTherapists(therapistsRes.data.data || []);

        if (id) {
          const sessionRes = await api.get(`/sessions/${id}`);
          setSession(sessionRes.data.data);
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
        session_date: new Date(values.session_date).toISOString().split('T')[0]
      };

      if (id) {
        await api.put(`/sessions/${id}`, data);
      } else {
        await api.post('/sessions', data);
      }

      navigate('/sessions');
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

  const initialValues = session || {
    beneficiary_id: '',
    therapist_id: '',
    session_type: '',
    session_date: new Date().toISOString().split('T')[0],
    session_time: '09:00',
    duration_minutes: 60,
    session_objectives: '',
    session_notes: ''
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        {id ? 'تعديل الجلسة' : 'إضافة جلسة جديدة'}
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
                  معلومات الجلسة الأساسية
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
                      select
                      name="therapist_id"
                      label="المعالج"
                      value={values.therapist_id}
                      onChange={(e) => setFieldValue('therapist_id', e.target.value)}
                      error={touched.therapist_id && !!errors.therapist_id}
                      helperText={touched.therapist_id && errors.therapist_id}
                    >
                      {therapists.map((therapist) => (
                        <MenuItem key={therapist.id} value={therapist.id}>
                          {therapist.first_name} {therapist.last_name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      name="session_type"
                      label="نوع الجلسة"
                      value={values.session_type}
                      onChange={(e) => setFieldValue('session_type', e.target.value)}
                      error={touched.session_type && !!errors.session_type}
                      helperText={touched.session_type && errors.session_type}
                    >
                      {sessionTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      name="duration_minutes"
                      label="مدة الجلسة (دقيقة)"
                      value={values.duration_minutes}
                      onChange={(e) => setFieldValue('duration_minutes', parseInt(e.target.value))}
                      error={touched.duration_minutes && !!errors.duration_minutes}
                      helperText={touched.duration_minutes && errors.duration_minutes}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      name="session_date"
                      label="تاريخ الجلسة"
                      value={values.session_date}
                      onChange={(e) => setFieldValue('session_date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      error={touched.session_date && !!errors.session_date}
                      helperText={touched.session_date && errors.session_date}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="time"
                      name="session_time"
                      label="وقت الجلسة"
                      value={values.session_time}
                      onChange={(e) => setFieldValue('session_time', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      error={touched.session_time && !!errors.session_time}
                      helperText={touched.session_time && errors.session_time}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  أهداف الجلسة والملاحظات
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      name="session_objectives"
                      label="أهداف الجلسة"
                      value={values.session_objectives}
                      onChange={(e) => setFieldValue('session_objectives', e.target.value)}
                      error={touched.session_objectives && !!errors.session_objectives}
                      helperText={touched.session_objectives && errors.session_objectives}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      name="session_notes"
                      label="ملاحظات إضافية"
                      value={values.session_notes}
                      onChange={(e) => setFieldValue('session_notes', e.target.value)}
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
                onClick={() => navigate('/sessions')}
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

export default SessionForm;
