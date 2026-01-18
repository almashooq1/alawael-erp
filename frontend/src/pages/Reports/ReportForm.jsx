// نموذج إنشاء/تعديل تقرير - ReportForm

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  FormHelperText
} from '@mui/material';
import {
  Save,
  Cancel,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

const ReportForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [report, setReport] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [reportTypes, setReportTypes] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id]);

  const loadInitialData = async () => {
    try {
      // جلب أنواع التقارير
      const typesResponse = await api.get('/reports/types');
      if (typesResponse.data.success) {
        setReportTypes(typesResponse.data.data);
      }

      // جلب قائمة المستفيدين
      const beneficiariesResponse = await api.get('/beneficiaries?per_page=100');
      if (beneficiariesResponse.data.success) {
        setBeneficiaries(beneficiariesResponse.data.data);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reports/${id}`);
      if (response.data.success) {
        setReport(response.data.data);
      }
      setLoading(false);
    } catch (err) {
      setError('خطأ في تحميل التقرير');
      setLoading(false);
    }
  };

  const validationSchema = Yup.object().shape({
    title: Yup.string().required('العنوان مطلوب').min(5),
    report_type: Yup.string().required('نوع التقرير مطلوب'),
    beneficiary_id: Yup.number(),
    description: Yup.string(),
    summary: Yup.string(),
    period_start: Yup.date(),
    period_end: Yup.date(),
  });

  const initialValues = report ? {
    title: report.title || '',
    report_type: report.report_type || '',
    description: report.description || '',
    beneficiary_id: report.beneficiary_id || '',
    summary: report.summary || '',
    period_start: report.period_start || '',
    period_end: report.period_end || '',
  } : {
    title: '',
    report_type: '',
    description: '',
    beneficiary_id: '',
    summary: '',
    period_start: '',
    period_end: '',
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setError('');

      if (id) {
        await api.put(`/reports/${id}`, values);
        setSuccessMessage('تم تحديث التقرير بنجاح');
      } else {
        await api.post('/reports', values);
        setSuccessMessage('تم إنشاء التقرير بنجاح');
      }

      setTimeout(() => navigate('/reports'), 2000);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
      setLoading(false);
    }
  };

  if (id && loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          {id ? 'تعديل التقرير' : 'إنشاء تقرير جديد'}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/reports')}
        >
          عودة
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      <Card>
        <CardContent>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ values, setFieldValue, touched, errors, isSubmitting }) => (
              <Form>
                <Grid container spacing={3}>
                  {/* البيانات الأساسية */}
                  <Grid item xs={12}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      البيانات الأساسية
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={8}>
                    <Field
                      as={TextField}
                      fullWidth
                      label="عنوان التقرير"
                      name="title"
                      error={touched.title && Boolean(errors.title)}
                      helperText={touched.title && errors.title}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>نوع التقرير</InputLabel>
                      <Select
                        name="report_type"
                        value={values.report_type}
                        onChange={(e) => setFieldValue('report_type', e.target.value)}
                        label="نوع التقرير"
                        error={touched.report_type && Boolean(errors.report_type)}
                      >
                        <MenuItem value="">اختر النوع</MenuItem>
                        {reportTypes.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.report_type && errors.report_type && (
                        <FormHelperText error>{errors.report_type}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>المستفيد</InputLabel>
                      <Select
                        name="beneficiary_id"
                        value={values.beneficiary_id}
                        onChange={(e) => setFieldValue('beneficiary_id', e.target.value)}
                        label="المستفيد"
                      >
                        <MenuItem value="">لا يوجد</MenuItem>
                        {beneficiaries.map((b) => (
                          <MenuItem key={b.id} value={b.id}>
                            {b.full_name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      fullWidth
                      label="الوصف"
                      name="description"
                      multiline
                      rows={2}
                    />
                  </Grid>

                  {/* الفترة الزمنية */}
                  <Grid item xs={12}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      الفترة الزمنية
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      fullWidth
                      label="من تاريخ"
                      name="period_start"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      fullWidth
                      label="إلى تاريخ"
                      name="period_end"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  {/* ملخص التقرير */}
                  <Grid item xs={12}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      محتوى التقرير
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      fullWidth
                      label="ملخص التقرير"
                      name="summary"
                      multiline
                      rows={5}
                      placeholder="اكتب ملخص التقرير هنا..."
                    />
                  </Grid>

                  {/* الأزرار */}
                  <Grid item xs={12}>
                    <Box display="flex" gap={2} justifyContent="flex-end">
                      <Button
                        variant="outlined"
                        onClick={() => navigate('/reports')}
                      >
                        إلغاء
                      </Button>
                      <Button
                        variant="contained"
                        type="submit"
                        disabled={isSubmitting || loading}
                        startIcon={<Save />}
                      >
                        {loading ? 'جاري الحفظ...' : 'حفظ التقرير'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ReportForm;
