/**
 * Recommended Scales Dialog — المقاييس المقترحة حسب نوع الإعاقة
 * Fetches recommended scales from the backend based on disability type.
 */
import { useState } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
} from '@mui/material';
import {
  Close as CloseIcon,
  Recommend as RecommendIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import assessmentService from 'services/assessmentService';
import logger from 'utils/logger';
import { SCALE_ICONS } from './constants';

const DISABILITY_TYPE_OPTIONS = [
  { value: 'physical', label: 'إعاقة حركية' },
  { value: 'intellectual', label: 'إعاقة ذهنية' },
  { value: 'hearing', label: 'إعاقة سمعية' },
  { value: 'visual', label: 'إعاقة بصرية' },
  { value: 'speech', label: 'إعاقة نطقية' },
  { value: 'autism', label: 'اضطراب طيف التوحد' },
  { value: 'learning', label: 'صعوبات تعلم' },
  { value: 'multiple', label: 'إعاقة متعددة' },
  { value: 'cerebralPalsy', label: 'شلل دماغي' },
  { value: 'downSyndrome', label: 'متلازمة داون' },
];

const RecommendedScalesDialog = ({ open, onClose, scales, onOpenAssessment }) => {
  const [disabilityType, setDisabilityType] = useState('');
  const [recommended, setRecommended] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async (type) => {
    setDisabilityType(type);
    if (!type) {
      setRecommended(null);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await assessmentService.getRecommendedScales(type);
      const data = res?.data || res;
      setRecommended(data);
    } catch (err) {
      logger.warn('Recommended scales error:', err?.message);
      setError('فشل جلب المقاييس المقترحة');
      setRecommended(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: '#7b1fa2',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RecommendIcon />
          <span>المقاييس المقترحة حسب نوع الإعاقة</span>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <FormControl fullWidth sx={{ mb: 3, mt: 1 }}>
          <InputLabel>اختر نوع الإعاقة</InputLabel>
          <Select
            value={disabilityType}
            onChange={(e) => handleFetch(e.target.value)}
            label="اختر نوع الإعاقة"
          >
            {DISABILITY_TYPE_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        {recommended && (
          <>
            <Typography variant="h6" gutterBottom>
              المقاييس المقترحة ({recommended.scales?.length || recommended.length || 0})
            </Typography>
            <Grid container spacing={2}>
              {(recommended.scales || recommended || []).map((scaleKey) => {
                const key = typeof scaleKey === 'string' ? scaleKey : scaleKey?.key || scaleKey?.id;
                const scaleDef = scales.find(s => s.id === key);
                if (!scaleDef) {
                  return (
                    <Grid item xs={12} sm={6} key={key}>
                      <Card elevation={1} sx={{ borderTop: '3px solid #9e9e9e' }}>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold">{key}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            مقياس غير متوفر في التعريفات المحلية
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                }
                return (
                  <Grid item xs={12} sm={6} key={key}>
                    <Card
                      elevation={2}
                      sx={{
                        borderTop: `4px solid ${scaleDef.color}`,
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'translateY(-2px)' },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Avatar sx={{ bgcolor: scaleDef.color, width: 36, height: 36 }}>
                            {SCALE_ICONS[scaleDef.icon] || <AssessmentIcon fontSize="small" />}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {scaleDef.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {scaleDef.nameEn}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {scaleDef.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            label={`${scaleDef.domains.length} مجالات`}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: scaleDef.color }}
                          />
                          <Chip
                            label={`الحد الأقصى ${scaleDef.maxScore}`}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: scaleDef.color }}
                          />
                        </Box>
                      </CardContent>
                      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AddIcon />}
                          sx={{ bgcolor: scaleDef.color, '&:hover': { bgcolor: scaleDef.color, filter: 'brightness(0.9)' } }}
                          onClick={() => {
                            onClose();
                            onOpenAssessment(scaleDef);
                          }}
                        >
                          تطبيق المقياس
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}

        {!recommended && !loading && !error && disabilityType && (
          <Alert severity="info">لا توجد مقاييس مقترحة لهذا النوع</Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecommendedScalesDialog;
