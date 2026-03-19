// Program Form - ProgramForm.jsx

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
  Divider
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import api from '../../services/api';

const ProgramForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(id ? true : false);
  const [error, setError] = useState(null);
  const [programTypes] = useState([
    'علاج نفسي',
    'علاج حركي',
    'علاج لغوي',
    'تدريب مهاري',
    'برنامج تعليمي'
  ]);

  const validationSchema = Yup.object().shape({
    program_name: Yup.string().required('يجب إدخال اسم البرنامج'),
    program_type: Yup.string().required('يجب اختيار نوع البرنامج'),
    description: Yup.string().required('يجب إدخال وصف البرنامج'),
    start_date: Yup.date().required('يجب تحديد تاريخ البداية'),
    duration_weeks: Yup.number().min(1).required('يجب تحديد مدة البرنامج'),
    objectives: Yup.string().required('يجب تحديد الأهداف')
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const programRes = await api.get(`/programs/${id}`);
          setProgram(programRes.data.data);
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
        start_date: new Date(values.start_date).toISOString().split('T')[0]
      };

      if (id) {
        await api.put(`/programs/${id}`, data);
      } else {
        await api.post('/programs', data);
      }

      navigate('/programs');
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

  const initialValues = program || {
    program_name: '',
    program_type: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    duration_weeks: 12,
    objectives: '',
    target_group: ''
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        {id ? 'تعديل البرنامج' : 'إضافة برنامج جديد'}
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
                  معلومات البرنامج الأساسية
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="program_name"
                      label="اسم البرنامج"
                      value={values.program_name}
                      onChange={(e) => setFieldValue('program_name', e.target.value)}
                      error={touched.program_name && !!errors.program_name}
                      helperText={touched.program_name && errors.program_name}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      name="program_type"
                      label="نوع البرنامج"
                      value={values.program_type}
                      onChange={(e) => setFieldValue('program_type', e.target.value)}
                      error={touched.program_type && !!errors.program_type}
                      helperText={touched.program_type && errors.program_type}
                    >
                      {programTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
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
                      type="number"
                      name="duration_weeks"
                      label="المدة (بالأسابيع)"
                      value={values.duration_weeks}
                      onChange={(e) => setFieldValue('duration_weeks', parseInt(e.target.value))}
                      error={touched.duration_weeks && !!errors.duration_weeks}
                      helperText={touched.duration_weeks && errors.duration_weeks}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="target_group"
                      label="الفئة المستهدفة"
                      value={values.target_group}
                      onChange={(e) => setFieldValue('target_group', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  الوصف والأهداف
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      name="description"
                      label="وصف البرنامج"
                      value={values.description}
                      onChange={(e) => setFieldValue('description', e.target.value)}
                      error={touched.description && !!errors.description}
                      helperText={touched.description && errors.description}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      name="objectives"
                      label="أهداف البرنامج"
                      value={values.objectives}
                      onChange={(e) => setFieldValue('objectives', e.target.value)}
                      error={touched.objectives && !!errors.objectives}
                      helperText={touched.objectives && errors.objectives}
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
                onClick={() => navigate('/programs')}
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

export default ProgramForm;
