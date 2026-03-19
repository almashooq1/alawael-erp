import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Alert,
  LinearProgress,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TrendingUp, Save } from '@mui/icons-material';
import arSA from 'date-fns/locale/ar-SA';

const ProgressUpdateDialog = ({ open, onClose, irpId, goal, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    date: new Date(),
    value: 0,
    notes: '',
    attachments: []
  });

  useEffect(() => {
    if (goal) {
      setFormData(prev => ({
        ...prev,
        value: goal.measurable.current || 0
      }));
    }
  }, [goal]);

  const calculateProgress = () => {
    if (!goal) return 0;
    const { baseline, target } = goal.measurable;
    const progress = ((formData.value - baseline) / (target - baseline)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 80) return 'primary';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/smart-irp/${irpId}/goals/${goal._id}/progress`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuccess(`تم التحديث بنجاح! نسبة الإنجاز: ${data.data.percentage}%`);
        setTimeout(() => {
          onSuccess(data.data);
          onClose();
        }, 1500);
      } else {
        setError(data.message || 'فشل في تحديث التقدم');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالخادم');
      console.error('Error updating progress:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!goal) return null;

  const progress = calculateProgress();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp />
          <Typography variant="h6">تحديث التقدم</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={arSA}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {/* Goal Summary */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              {goal.title}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {goal.description}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 2 }}>
              <Chip label={goal.category} size="small" color="primary" variant="outlined" />
              <Chip 
                label={goal.status} 
                size="small" 
                color={
                  goal.status === 'achieved' ? 'success' :
                  goal.status === 'on_track' ? 'primary' :
                  goal.status === 'at_risk' ? 'warning' : 'error'
                }
              />
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="caption" color="textSecondary">
                  نقطة البداية
                </Typography>
                <Typography variant="h6">
                  {goal.measurable.baseline} {goal.measurable.unit}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="textSecondary">
                  الحالي
                </Typography>
                <Typography variant="h6" color="primary">
                  {goal.measurable.current} {goal.measurable.unit}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="textSecondary">
                  الهدف
                </Typography>
                <Typography variant="h6" color="success.main">
                  {goal.measurable.target} {goal.measurable.unit}
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption">التقدم الحالي</Typography>
                <Typography variant="caption" fontWeight="bold">
                  {goal.achievementPercentage}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={goal.achievementPercentage}
                color={getStatusColor(goal.achievementPercentage)}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>
          </Box>

          {/* Progress Update Form */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <DatePicker
                label="تاريخ التحديث"
                value={formData.date}
                onChange={(date) => setFormData(prev => ({ ...prev, date }))}
                maxDate={new Date()}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label={`القيمة الجديدة (${goal.measurable.unit})`}
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  value: parseFloat(e.target.value) || 0 
                }))}
                required
                inputProps={{
                  min: 0,
                  max: goal.measurable.target * 1.5, // Allow exceeding target by 50%
                  step: 1
                }}
                helperText={`المدى: ${goal.measurable.baseline} - ${goal.measurable.target} ${goal.measurable.unit}`}
              />
            </Grid>

            {/* Live Progress Preview */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                <Typography variant="subtitle2" gutterBottom>
                  معاينة التقدم المحدث
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption">نسبة الإنجاز المتوقعة</Typography>
                  <Typography variant="h6" color="primary">
                    {progress.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  color={getStatusColor(progress)}
                  sx={{ height: 10, borderRadius: 1 }}
                />
                {progress >= 100 && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    🎉 تهانينا! الهدف سيتم تحقيقه بهذا التحديث!
                  </Alert>
                )}
                {progress < goal.achievementPercentage && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    ⚠️ القيمة الجديدة أقل من القيمة الحالية
                  </Alert>
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="ملاحظات"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="أضف ملاحظات حول التقدم، التحديات المواجهة، أو أي معلومات مهمة..."
              />
            </Grid>

            {/* Recent Progress History */}
            {goal.progress && goal.progress.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  آخر التحديثات
                </Typography>
                <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                  {goal.progress.slice(-3).reverse().map((p, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        p: 1, 
                        mb: 1, 
                        bgcolor: 'background.default', 
                        borderRadius: 1,
                        borderLeft: 3,
                        borderColor: 'primary.main'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(p.date).toLocaleDateString('ar-SA')}
                        </Typography>
                        <Typography variant="caption" fontWeight="bold">
                          {p.value} {goal.measurable.unit} ({p.percentage}%)
                        </Typography>
                      </Box>
                      {p.notes && (
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                          {p.notes}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSubmit}
          disabled={loading || formData.value === 0}
        >
          {loading ? 'جاري الحفظ...' : 'حفظ التحديث'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProgressUpdateDialog;
