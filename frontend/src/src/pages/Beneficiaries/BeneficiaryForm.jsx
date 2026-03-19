// نموذج إضافة/تعديل مستفيد - BeneficiaryForm

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
  Stepper,
  Step,
  StepLabel,
  Paper
} from '@mui/material';
import {
  Save,
  Cancel,
  ArrowBack,
  ArrowForward
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchBeneficiaryById,
  createBeneficiary,
  updateBeneficiary
} from '../../store/slices/beneficiariesSlice';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const BeneficiaryForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { currentBeneficiary, loading, error } = useSelector((state) => state.beneficiaries);
  const [activeStep, setActiveStep] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  const disabilityTypes = [
    'physical',
    'mental',
    'sensory',
    'multiple',
    'developmental'
  ];

  const severityLevels = ['mild', 'moderate', 'severe', 'profound'];
  const genders = ['male', 'female'];

  useEffect(() => {
    if (id) {
      dispatch(fetchBeneficiaryById(id));
    }
  }, [id, dispatch]);

  const validationSchema = Yup.object().shape({
    first_name: Yup.string().required('الاسم الأول مطلوب').min(2),
    last_name: Yup.string().required('الاسم الأخير مطلوب').min(2),
    national_id: Yup.string().required('الرقم الوطني مطلوب').min(5),
    date_of_birth: Yup.date().required('تاريخ الميلاد مطلوب'),
    gender: Yup.string().required('الجنس مطلوب'),
    guardian_name: Yup.string().required('اسم ولي الأمر مطلوب'),
    guardian_phone: Yup.string().required('رقم هاتف ولي الأمر مطلوب'),
    email: Yup.string().email('بريد إلكتروني صحيح'),
    phone: Yup.string(),
    address: Yup.string(),
    disability_type: Yup.string(),
    disability_category: Yup.string(),
    severity_level: Yup.string(),
    diagnosis: Yup.string(),
  });

  const initialValues = currentBeneficiary ? {
    first_name: currentBeneficiary.first_name || '',
    last_name: currentBeneficiary.last_name || '',
    national_id: currentBeneficiary.national_id || '',
    date_of_birth: currentBeneficiary.date_of_birth || '',
    gender: currentBeneficiary.gender || '',
    phone: currentBeneficiary.phone || '',
    email: currentBeneficiary.email || '',
    address: currentBeneficiary.address || '',
    city: currentBeneficiary.city || '',
    region: currentBeneficiary.region || '',
    postal_code: currentBeneficiary.postal_code || '',
    disability_type: currentBeneficiary.disability_type || '',
    disability_category: currentBeneficiary.disability_category || '',
    severity_level: currentBeneficiary.severity_level || '',
    diagnosis: currentBeneficiary.diagnosis || '',
    guardian_name: currentBeneficiary.guardian_name || '',
    guardian_relationship: currentBeneficiary.guardian_relationship || '',
    guardian_phone: currentBeneficiary.guardian_phone || '',
    guardian_email: currentBeneficiary.guardian_email || '',
    guardian_national_id: currentBeneficiary.guardian_national_id || '',
  } : {
    first_name: '',
    last_name: '',
    national_id: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    region: '',
    postal_code: '',
    disability_type: '',
    disability_category: '',
    severity_level: '',
    diagnosis: '',
    guardian_name: '',
    guardian_relationship: '',
    guardian_phone: '',
    guardian_email: '',
    guardian_national_id: '',
  };

  const handleSubmit = async (values) => {
    try {
      if (id) {
        await dispatch(updateBeneficiary({ id, data: values })).unwrap();
        setSuccessMessage('تم تحديث البيانات بنجاح');
      } else {
        await dispatch(createBeneficiary(values)).unwrap();
        setSuccessMessage('تم إضافة المستفيد بنجاح');
      }
      setTimeout(() => navigate('/beneficiaries'), 2000);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const steps = ['البيانات الأساسية', 'معلومات الإعاقة', 'معلومات ولي الأمر'];

  const renderStepContent = (step, values, setFieldValue, touched, errors) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="الاسم الأول"
                name="first_name"
                error={touched.first_name && Boolean(errors.first_name)}
                helperText={touched.first_name && errors.first_name}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="الاسم الأخير"
                name="last_name"
                error={touched.last_name && Boolean(errors.last_name)}
                helperText={touched.last_name && errors.last_name}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="الرقم الوطني"
                name="national_id"
                error={touched.national_id && Boolean(errors.national_id)}
                helperText={touched.national_id && errors.national_id}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="تاريخ الميلاد"
                name="date_of_birth"
                type="date"
                InputLabelProps={{ shrink: true }}
                error={touched.date_of_birth && Boolean(errors.date_of_birth)}
                helperText={touched.date_of_birth && errors.date_of_birth}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>الجنس</InputLabel>
                <Select
                  name="gender"
                  value={values.gender}
                  onChange={(e) => setFieldValue('gender', e.target.value)}
                  label="الجنس"
                >
                  <MenuItem value="">اختر</MenuItem>
                  <MenuItem value="male">ذكر</MenuItem>
                  <MenuItem value="female">أنثى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="البريد الإلكتروني"
                name="email"
                type="email"
                error={touched.email && Boolean(errors.email)}
                helperText={touched.email && errors.email}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="الهاتف"
                name="phone"
                error={touched.phone && Boolean(errors.phone)}
                helperText={touched.phone && errors.phone}
              />
            </Grid>
            <Grid item xs={12}>
              <Field
                as={TextField}
                fullWidth
                label="العنوان"
                name="address"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="المدينة"
                name="city"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="المنطقة"
                name="region"
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>نوع الإعاقة</InputLabel>
                <Select
                  name="disability_type"
                  value={values.disability_type}
                  onChange={(e) => setFieldValue('disability_type', e.target.value)}
                  label="نوع الإعاقة"
                >
                  <MenuItem value="">اختر</MenuItem>
                  {disabilityTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="فئة الإعاقة"
                name="disability_category"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>مستوى الشدة</InputLabel>
                <Select
                  name="severity_level"
                  value={values.severity_level}
                  onChange={(e) => setFieldValue('severity_level', e.target.value)}
                  label="مستوى الشدة"
                >
                  <MenuItem value="">اختر</MenuItem>
                  {severityLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Field
                as={TextField}
                fullWidth
                label="التشخيص الطبي"
                name="diagnosis"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="اسم ولي الأمر"
                name="guardian_name"
                error={touched.guardian_name && Boolean(errors.guardian_name)}
                helperText={touched.guardian_name && errors.guardian_name}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="صلة القرابة"
                name="guardian_relationship"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="رقم هاتف ولي الأمر"
                name="guardian_phone"
                error={touched.guardian_phone && Boolean(errors.guardian_phone)}
                helperText={touched.guardian_phone && errors.guardian_phone}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Field
                as={TextField}
                fullWidth
                label="بريد إلكتروني لولي الأمر"
                name="guardian_email"
                type="email"
              />
            </Grid>
            <Grid item xs={12}>
              <Field
                as={TextField}
                fullWidth
                label="الرقم الوطني لولي الأمر"
                name="guardian_national_id"
              />
            </Grid>
          </Grid>
        );
      default:
        return null;
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
          {id ? 'تعديل مستفيد' : 'إضافة مستفيد جديد'}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/beneficiaries')}
        >
          عودة
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ values, setFieldValue, touched, errors, isSubmitting }) => (
              <Form>
                <Box minHeight="400px" mb={3}>
                  {renderStepContent(activeStep, values, setFieldValue, touched, errors)}
                </Box>

                <Box display="flex" gap={2} justifyContent="space-between">
                  <Button
                    variant="outlined"
                    disabled={activeStep === 0}
                    onClick={() => setActiveStep(activeStep - 1)}
                    startIcon={<ArrowBack />}
                  >
                    السابق
                  </Button>

                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={isSubmitting || loading}
                      startIcon={<Save />}
                    >
                      {loading ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(activeStep + 1)}
                      endIcon={<ArrowForward />}
                    >
                      التالي
                    </Button>
                  )}
                </Box>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BeneficiaryForm;
