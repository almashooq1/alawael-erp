import { useState, useEffect } from 'react';

import { therapistService } from 'services/therapistService';
import { getStatusColor } from 'utils/statusColors';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, neutralColors, surfaceColors } from '../../theme/palette';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  InputAdornment,
  LinearProgress,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const TherapistCases = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const loadCases = async () => {
      try {
        const data = await therapistService.getTherapistCases(userId);
        setCases(data);
        setLoading(false);
        showSnackbar('تم تحميل الحالات بنجاح', 'success');
      } catch (error) {
        logger.error('Error loading cases:', error);
        setLoading(false);
        showSnackbar('حدث خطأ في تحميل الحالات', 'error');
      }
    };
    loadCases();
  }, [userId, showSnackbar]);

  const filteredCases = cases.filter(
    c =>
      c.patientName.includes(searchText) ||
      c.diagnosis.includes(searchText) ||
      c.id.includes(searchText)
  );

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
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TrendingUpIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              حالات المعالج
            </Typography>
            <Typography variant="body2">متابعة وإدارة حالات المرضى</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        {/* الإحصائيات */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  إجمالي الحالات
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.info }}>
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
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.success }}>
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
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.warning }}>
                  {Math.round(
                    (cases.filter(c => c.status === 'مكتمل').length / cases.length || 0) * 100
                  )}
                  %
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
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.purple }}>
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
                  <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
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
                  <Chip
                    label={caseItem.status}
                    color={getStatusColor(caseItem.status)}
                    size="small"
                  />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* البيانات الأساسية */}
                <Grid
                  container
                  spacing={2}
                  sx={{ mb: 2, pb: 2, borderBottom: `1px solid ${surfaceColors.borderSubtle}` }}
                >
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                      رقم الملف
                    </Typography>
                    <Typography variant="body2">{caseItem.id}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                      تاريخ البداية
                    </Typography>
                    <Typography variant="body2">{caseItem.startDate}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                      العمر
                    </Typography>
                    <Typography variant="body2">{caseItem.age} سنة</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
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
                  <Paper sx={{ p: 2, backgroundColor: surfaceColors.paperAlt }}>
                    <Typography variant="body2">{caseItem.treatmentPlan}</Typography>
                  </Paper>
                </Box>

                {/* التطور */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    📈 ملخص التطور:
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: surfaceColors.paperAlt }}>
                    <Typography variant="body2">{caseItem.progress}% تحسن مسجل</Typography>
                  </Paper>
                </Box>

                {/* الإجراءات */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    pt: 2,
                    borderTop: `1px solid ${surfaceColors.borderSubtle}`,
                  }}
                >
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
