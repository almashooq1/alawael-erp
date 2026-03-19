import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  Grid,
  Card,
  CardContent,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@mui/material';

/**
 * CreateCase
 * 
 * الوصف: نموذج إنشاء حالة جديدة
 * - بيانات المستفيد
 * - معلومات الإعاقة
 * - تاريخ طبي
 * - معلومات القبول
 */

function CreateCase({ onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    beneficiaryId: '',
    disabilityInfo: {
      primaryDisability: 'physical',
      severity: 'moderate',
    },
    admissionInfo: {
      priority: 'normal',
      applicationDate: new Date().toISOString().split('T')[0],
    },
    medicalHistory: [],
    currentMedications: [],
    allergies: [],
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      <Stack spacing={3}>
        {/* بيانات المستفيد */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>👤 بيانات المستفيد</Typography>
            <TextField
              fullWidth
              label="معرّف المستفيد"
              name="beneficiaryId"
              value={formData.beneficiaryId}
              onChange={handleInputChange}
              required
              helperText="أدخل معرّف المستفيد الموجود"
            />
          </CardContent>
        </Card>

        {/* معلومات الإعاقة */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>♿ معلومات الإعاقة</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>نوع الإعاقة الرئيسية</InputLabel>
                  <Select
                    value={formData.disabilityInfo.primaryDisability}
                    onChange={(e) =>
                      handleNestedChange('disabilityInfo', 'primaryDisability', e.target.value)
                    }
                    label="نوع الإعاقة الرئيسية"
                  >
                    <MenuItem value="physical">إعاقة حركية</MenuItem>
                    <MenuItem value="intellectual">إعاقة ذهنية</MenuItem>
                    <MenuItem value="visual">إعاقة بصرية</MenuItem>
                    <MenuItem value="hearing">إعاقة سمعية</MenuItem>
                    <MenuItem value="speech_language">اضطراب النطق واللغة</MenuItem>
                    <MenuItem value="autism_spectrum">اضطراب طيف التوحد</MenuItem>
                    <MenuItem value="learning_disability">صعوبة التعلم</MenuItem>
                    <MenuItem value="behavioral">اضطراب سلوكي</MenuItem>
                    <MenuItem value="multiple">إعاقات متعددة</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>درجة الخطورة</InputLabel>
                  <Select
                    value={formData.disabilityInfo.severity}
                    onChange={(e) =>
                      handleNestedChange('disabilityInfo', 'severity', e.target.value)
                    }
                    label="درجة الخطورة"
                  >
                    <MenuItem value="mild">خفيفة</MenuItem>
                    <MenuItem value="moderate">متوسطة</MenuItem>
                    <MenuItem value="severe">شديدة</MenuItem>
                    <MenuItem value="profound">عميقة</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* معلومات القبول */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>📋 معلومات القبول</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>الأولوية</InputLabel>
                  <Select
                    value={formData.admissionInfo.priority}
                    onChange={(e) =>
                      handleNestedChange('admissionInfo', 'priority', e.target.value)
                    }
                    label="الأولوية"
                  >
                    <MenuItem value="low">منخفضة</MenuItem>
                    <MenuItem value="normal">عادية</MenuItem>
                    <MenuItem value="high">مرتفعة</MenuItem>
                    <MenuItem value="urgent">عاجلة</MenuItem>
                    <MenuItem value="critical">حرجة</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="تاريخ الطلب"
                  value={formData.admissionInfo.applicationDate}
                  onChange={(e) =>
                    handleNestedChange('admissionInfo', 'applicationDate', e.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* الأزرار */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onClose} variant="outlined">إلغاء</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'جاري الحفظ...' : '💾 حفظ الحالة'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export default CreateCase;
