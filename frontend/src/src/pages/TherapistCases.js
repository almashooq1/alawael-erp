import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Button,
  TextField,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { therapistService } from '../services/therapistService';

const TherapistCases = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const loadCases = async () => {
      try {
        const data = await therapistService.getTherapistCases('TH001');
        setCases(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading cases:', error);
        setLoading(false);
      }
    };
    loadCases();
  }, []);

  const filteredCases = cases.filter(
    c => c.patientName.includes(searchText) || c.diagnosis.includes(searchText) || c.id.includes(searchText),
  );

  const getStatusColor = status => {
    switch (status) {
      case 'نشط':
        return 'success';
      case 'متقدم':
        return 'primary';
      case 'مستقر':
        return 'warning';
      case 'مكتمل':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل الحالات...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
          📊 إدارة الحالات والملفات الطبية
        </Typography>

        {/* الإحصائيات */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  إجمالي الحالات
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
                  {cases.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  حالات نشطة
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                  {cases.filter(c => c.status === 'نشط').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  معدل النجاح
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                  {Math.round((cases.filter(c => c.status === 'مكتمل').length / cases.length || 0) * 100)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  متوسط التقدم
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                  {Math.round(cases.reduce((sum, c) => sum + c.progress, 0) / cases.length || 0)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* البحث */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            placeholder="ابحث عن حالة..."
            variant="outlined"
            size="small"
            fullWidth
            sx={{ maxWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <Button variant="contained" startIcon={<AddIcon />}>
            حالة جديدة
          </Button>
        </Box>
      </Box>

      {/* قائمة الحالات */}
      {filteredCases.map(caseItem => (
        <Card key={caseItem.id} sx={{ borderRadius: 2, boxShadow: 3, mb: 2 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Avatar sx={{ width: 45, height: 45 }}>{caseItem.patientName.charAt(0)}</Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {caseItem.patientName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    التشخيص: {caseItem.diagnosis}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <LinearProgress
                      variant="determinate"
                      value={caseItem.progress}
                      sx={{
                        width: 100,
                        height: 6,
                        borderRadius: 3,
                        mb: 0.5,
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                      {caseItem.progress}%
                    </Typography>
                  </Box>
                  <Chip label={caseItem.status} color={getStatusColor(caseItem.status)} size="small" />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* البيانات الأساسية */}
                <Grid container spacing={2} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      رقم الملف
                    </Typography>
                    <Typography variant="body2">{caseItem.id}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      تاريخ البداية
                    </Typography>
                    <Typography variant="body2">{caseItem.startDate}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      العمر
                    </Typography>
                    <Typography variant="body2">{caseItem.age} سنة</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      عدد الجلسات
                    </Typography>
                    <Typography variant="body2">{caseItem.sessionCount}</Typography>
                  </Grid>
                </Grid>

                {/* خطة العلاج */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    📋 خطة العلاج:
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
                    <Typography variant="body2">{caseItem.treatmentPlan}</Typography>
                  </Paper>
                </Box>

                {/* التطور */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    📈 ملخص التطور:
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
                    <Typography variant="body2">{caseItem.progress}% تحسن مسجل</Typography>
                  </Paper>
                </Box>

                {/* الإجراءات */}
                <Box sx={{ display: 'flex', gap: 1, pt: 2, borderTop: '1px solid #eee' }}>
                  <Button size="small" startIcon={<EditIcon />}>
                    تعديل
                  </Button>
                  <Button size="small" color="error" startIcon={<DeleteIcon />}>
                    حذف
                  </Button>
                  <Button size="small" startIcon={<TrendingUpIcon />}>
                    عرض التطور
                  </Button>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Card>
      ))}

      {filteredCases.length === 0 && (
        <Card sx={{ borderRadius: 2, textAlign: 'center', py: 4 }}>
          <Typography color="textSecondary">لا توجد حالات</Typography>
        </Card>
      )}
    </Container>
  );
};

export default TherapistCases;
