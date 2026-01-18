// Assessment Form - AssessmentForm.jsx

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
  FormControlLabel,
  Checkbox,
  Slider,
  Divider
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import api from '../../services/api';

const AssessmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(id ? true : false);
  const [error, setError] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [assessmentTypes] = useState([
    'تقييم حركي',
    'تقييم إدراكي',
    'تقييم لغوي',
    'تقييم سمعي',
    'تقييم بصري',
    'تقييم نفسي'
  ]);

  const validationSchema = Yup.object().shape({
    beneficiary_id: Yup.string().required('يجب اختيار المستفيد'),
    assessment_type: Yup.string().required('يجب اختيار نوع التقييم'),
    assessment_tool: Yup.string().required('يجب تحديد أداة التقييم'),
    assessment_date: Yup.date().required('يجب تحديد التاريخ'),
    total_score: Yup.number().required('يجب إدخال الدرجة الكلية'),
    assessment_results: Yup.string().required('يجب إدخال النتائج')
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const beneficiariesRes = await api.get('/beneficiaries?per_page=100');
        setBeneficiaries(beneficiariesRes.data.data || []);

        if (id) {
          const assessmentRes = await api.get(`/assessments/${id}`);
          setAssessment(assessmentRes.data.data);
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
        assessment_date: new Date(values.assessment_date).toISOString().split('T')[0]
      };

      if (id) {
        await api.put(`/assessments/${id}`, data);
      } else {
        await api.post('/assessments', data);
      }

      navigate('/assessments');
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

  const initialValues = assessment || {
    beneficiary_id: '',
    assessment_type: '',
    assessment_tool: '',
    assessment_date: new Date().toISOString().split('T')[0],
    total_score: 0,
    assessment_results: '',
    recommendations: ''
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        {id ? 'تعديل التقييم' : 'إضافة تقييم جديد'}
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
      >
        {({ values, errors, touched, isSubmitting }) => (
          <Form>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  معلومات التقييم الأساسية
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
                      onChange={(e) => {
                        values.beneficiary_id = e.target.value;
                      }}
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

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      name="assessment_type"
                      label="نوع التقييم"
                      value={values.assessment_type}
                      onChange={(e) => {
                        values.assessment_type = e.target.value;
                      }}
                      error={touched.assessment_type && !!errors.assessment_type}
                      helperText={touched.assessment_type && errors.assessment_type}
                    >
                      {assessmentTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="assessment_tool"
                      label="أداة التقييم"
                      value={values.assessment_tool}
                      onChange={(e) => {
                        values.assessment_tool = e.target.value;
                      }}
                      error={touched.assessment_tool && !!errors.assessment_tool}
                      helperText={touched.assessment_tool && errors.assessment_tool}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      name="assessment_date"
                      label="تاريخ التقييم"
                      value={values.assessment_date}
                      onChange={(e) => {
                        values.assessment_date = e.target.value;
                      }}
                      InputLabelProps={{ shrink: true }}
                      error={touched.assessment_date && !!errors.assessment_date}
                      helperText={touched.assessment_date && errors.assessment_date}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      name="total_score"
                      label="الدرجة الكلية"
                      value={values.total_score}
                      onChange={(e) => {
                        values.total_score = e.target.value;
                      }}
                      error={touched.total_score && !!errors.total_score}
                      helperText={touched.total_score && errors.total_score}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  النتائج والتوصيات
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      name="assessment_results"
                      label="نتائج التقييم"
                      value={values.assessment_results}
                      onChange={(e) => {
                        values.assessment_results = e.target.value;
                      }}
                      error={touched.assessment_results && !!errors.assessment_results}
                      helperText={touched.assessment_results && errors.assessment_results}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      name="recommendations"
                      label="التوصيات"
                      value={values.recommendations}
                      onChange={(e) => {
                        values.recommendations = e.target.value;
                      }}
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
                onClick={() => navigate('/assessments')}
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

export default AssessmentForm;
