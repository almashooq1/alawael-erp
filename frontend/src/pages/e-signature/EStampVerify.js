import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import eStampService from '../../services/eStamp.service';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  Avatar,
  CircularProgress,
  Chip,
  Divider,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  Verified,
  ArrowBack,
  CheckCircle,
  Cancel,
  ContentCopy,
  Description,
  CalendarMonth,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

const typeLabels = {
  official: 'رسمي',
  department: 'إداري',
  personal: 'شخصي',
  temporary: 'مؤقت',
  project: 'مشروع',
  confidential: 'سري',
  received: 'وارد',
  approved: 'معتمد',
  rejected: 'مرفوض',
  draft: 'مسودة',
  copy: 'نسخة',
  urgent: 'عاجل',
};

export default function EStampVerify() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!code.trim()) {
      showSnackbar('أدخل كود التحقق', 'warning');
      return;
    }
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await eStampService.verify(code.trim());
      if (res?.data?.data) {
        setResult(res.data.data);
        showSnackbar('تم التحقق بنجاح', 'success');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'كود التحقق غير صالح';
      setError(msg);
      showSnackbar(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }} dir="rtl">
      {/* Header */}
      <Box
        sx={{
          background: gradients.info || gradients.primary,
          borderRadius: 3,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Verified sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                التحقق من الختم الإلكتروني
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                أدخل كود التحقق للتأكد من صحة الختم
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/e-stamp')}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
          >
            رجوع
          </Button>
        </Box>
      </Box>

      {/* Search Box */}
      <Paper sx={{ p: 4, borderRadius: 2, mb: 4, textAlign: 'center' }}>
        <Verified sx={{ fontSize: 56, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
          أدخل كود التحقق
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, maxWidth: 500, mx: 'auto' }}>
          <TextField
            fullWidth
            placeholder="مثال: STAMP-STM-2026-001-a1b2c3d4"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              sx: { fontFamily: 'monospace', direction: 'ltr', textAlign: 'left' },
            }}
          />
          <Button
            variant="contained"
            onClick={handleVerify}
            disabled={loading || !code.trim()}
            sx={{ minWidth: 120, whiteSpace: 'nowrap' }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'تحقّق'}
          </Button>
        </Box>
      </Paper>

      {/* Error */}
      {error && !result && (
        <Paper
          sx={{
            p: 4,
            borderRadius: 2,
            textAlign: 'center',
            border: '2px solid',
            borderColor: 'error.main',
          }}
        >
          <Cancel sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" color="error.main" sx={{ mb: 1 }}>
            كود غير صالح
          </Typography>
          <Typography color="text.secondary">{error}</Typography>
          <Alert severity="error" sx={{ mt: 3, textAlign: 'right' }}>
            لم يتم العثور على ختم مطابق لهذا الكود. تحقق من الكود وأعد المحاولة.
          </Alert>
        </Paper>
      )}

      {/* Result */}
      {result && (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {/* Validity banner */}
          <Box
            sx={{
              background:
                result.stamp?.status === 'active'
                  ? 'linear-gradient(135deg, #2e7d32, #66bb6a)'
                  : 'linear-gradient(135deg, #c62828, #ef5350)',
              p: 3,
              color: 'white',
              textAlign: 'center',
            }}
          >
            {result.stamp?.status === 'active' ? (
              <>
                <CheckCircle sx={{ fontSize: 56, mb: 1 }} />
                <Typography variant="h5" fontWeight="bold">
                  ختم صالح ✓
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  تم التحقق من صحة الختم بنجاح
                </Typography>
              </>
            ) : (
              <>
                <Cancel sx={{ fontSize: 56, mb: 1 }} />
                <Typography variant="h5" fontWeight="bold">
                  ختم غير فعّال
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  الختم بحالة: {result.stamp?.status}
                </Typography>
              </>
            )}
          </Box>

          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Stamp Info */}
              <Grid item xs={12} md={6}>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Verified color="primary" /> بيانات الختم
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {result.stamp?.stampImage ? (
                    <Avatar
                      src={result.stamp.stampImage}
                      variant="rounded"
                      sx={{ width: 56, height: 56, border: '1px solid #eee', bgcolor: 'white' }}
                    />
                  ) : (
                    <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                      <Verified />
                    </Avatar>
                  )}
                  <Box>
                    <Typography fontWeight="bold">{result.stamp?.name_ar}</Typography>
                    {result.stamp?.name_en && (
                      <Typography variant="body2" color="text.secondary">
                        {result.stamp.name_en}
                      </Typography>
                    )}
                  </Box>
                </Box>
                {[
                  ['رقم الختم', result.stamp?.stampId],
                  ['النوع', typeLabels[result.stamp?.stampType] || result.stamp?.stampType],
                  ['المؤسسة', result.stamp?.organization],
                  ['القسم', result.stamp?.department],
                  ['إجمالي الاستخدامات', result.stamp?.usageCount],
                ].map(
                  ([k, v]) =>
                    v && (
                      <Box
                        key={k}
                        sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {k}
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                          {v}
                        </Typography>
                      </Box>
                    )
                )}
              </Grid>

              {/* Application Info */}
              <Grid item xs={12} md={6}>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Description color="primary" /> بيانات التطبيق
                </Typography>
                {[
                  ['عنوان المستند', result.application?.documentTitle],
                  ['نوع المستند', result.application?.documentType],
                  ['رقم المستند', result.application?.documentId],
                  ['طُبّق بواسطة', result.application?.appliedByName],
                  [
                    'التاريخ',
                    result.application?.appliedAt
                      ? new Date(result.application.appliedAt).toLocaleString('ar-SA')
                      : null,
                  ],
                ].map(
                  ([k, v]) =>
                    v && (
                      <Box
                        key={k}
                        sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {k}
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                          {v}
                        </Typography>
                      </Box>
                    )
                )}

                {result.application?.verificationCode && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      كود التحقق
                    </Typography>
                    <Chip
                      label={result.application.verificationCode}
                      sx={{ fontFamily: 'monospace', fontSize: 12, mt: 0.5 }}
                      size="small"
                      icon={<ContentCopy sx={{ fontSize: 14 }} />}
                      onClick={() => {
                        navigator.clipboard.writeText(result.application.verificationCode);
                        showSnackbar('تم النسخ', 'info');
                      }}
                      clickable
                    />
                  </Box>
                )}

                {result.application?.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      ملاحظات
                    </Typography>
                    <Typography variant="body2">{result.application.notes}</Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {/* Help section */}
      {!result && !error && (
        <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            كيف تحصل على كود التحقق؟
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • يتم توليد كود التحقق تلقائياً عند تطبيق الختم على مستند.{'\n'}• يظهر الكود في صفحة
            تأكيد التطبيق ويمكن نسخه.{'\n'}• يمكنك أيضاً الحصول عليه من سجل استخدام الختم.{'\n'}•
            صيغة الكود: STAMP-STM-XXXX-XXX-XXXXXXXX
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
