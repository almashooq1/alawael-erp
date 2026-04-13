import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eSignatureService from '../../services/eSignature.service';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  InputAdornment,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Verified,  GppBad,
  Search,
  ArrowBack,
  CheckCircle,
  Cancel,
  Person,
  Schedule,
  Description,
  Shield,
  History,
  ContentCopy,} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

/* ═══ Audit Action Labels ════════════════════════════════════════════════ */
const auditActionMap = {
  created: 'تم الإنشاء',
  sent: 'تم الإرسال',
  viewed: 'تم العرض',
  signed: 'تم التوقيع',
  rejected: 'تم الرفض',
  delegated: 'تم التفويض',
  reminded: 'تذكير',
  expired: 'انتهت الصلاحية',
  cancelled: 'تم الإلغاء',
  comment_added: 'تعليق',
  verified: 'تم التحقق',
};

export default function ESignatureVerify() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  /* ─── Auto-verify if ID is in URL ──────────────────────────────────────── */
  const verifyById = useCallback(async docId => {
    setLoading(true);
    setError('');
    try {
      const res = await eSignatureService.verify(docId);
      if (res?.data?.data) setResult(res.data.data);
    } catch {
      setError('لم يتم العثور على المستند أو حدث خطأ في التحقق');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) verifyById(id);
  }, [id, verifyById]);

  /* ─── Verify by code ───────────────────────────────────────────────────── */
  const handleVerifyByCode = async () => {
    if (!verifyCode.trim()) {
      showSnackbar('يرجى إدخال رمز التحقق', 'warning');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await eSignatureService.verifyByCode(verifyCode.trim());
      if (res?.data?.data) setResult(res.data.data);
    } catch {
      setError('رمز التحقق غير صالح');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (result?.verificationCode) {
      navigator.clipboard.writeText(result.verificationCode);
      showSnackbar('تم نسخ رمز التحقق', 'success');
    }
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ background: gradients.info, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <Shield sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                التحقق من المستند
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                تحقق من صحة وسلامة المستند الموقّع إلكترونياً
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/e-signature')}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
          >
            رجوع
          </Button>
        </Box>
      </Box>

      {/* ─── Search by code ──────────────────────────────────────────────── */}
      {!id && (
        <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            التحقق باستخدام رمز التحقق
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            أدخل رمز التحقق الموجود في المستند الموقّع للتأكد من صحته
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, maxWidth: 600 }}>
            <TextField
              fullWidth
              placeholder="أدخل رمز التحقق..."
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value.toUpperCase())}
              onKeyDown={e => {
                if (e.key === 'Enter') handleVerifyByCode();
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                sx: { fontFamily: 'monospace', fontSize: 18, letterSpacing: 2 },
              }}
            />
            <Button
              variant="contained"
              onClick={handleVerifyByCode}
              disabled={loading}
              sx={{ minWidth: 140 }}
            >
              {loading ? <CircularProgress size={24} /> : 'تحقق'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* ─── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={48} />
          <Typography sx={{ mt: 2 }}>جاري التحقق...</Typography>
        </Box>
      )}

      {/* ─── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography fontWeight="bold">{error}</Typography>
        </Alert>
      )}

      {/* ═══ Verification Result ═══════════════════════════════════════════ */}
      {result && !loading && (
        <>
          {/* ─── Main Status Card ──────────────────────────────────────── */}
          <Card
            sx={{
              p: 4,
              mb: 4,
              borderRadius: 3,
              textAlign: 'center',
              border: '3px solid',
              borderColor: result.isValid ? 'success.main' : 'warning.main',
              bgcolor: result.isValid ? '#f1f8e9' : '#fff8e1',
            }}
          >
            {result.isValid ? (
              <Verified sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            ) : (
              <GppBad sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
            )}
            <Typography
              variant="h4"
              fontWeight="bold"
              color={result.isValid ? 'success.main' : 'warning.main'}
            >
              {result.isValid ? 'مستند موثق وصالح' : 'المستند غير مكتمل التوثيق'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              {result.isValid
                ? 'تم التحقق من جميع التوقيعات بنجاح. هذا المستند صحيح وموثق إلكترونياً.'
                : 'لم يكتمل توقيع جميع الأطراف المطلوبة بعد.'}
            </Typography>
          </Card>

          {/* ─── Document Details ─────────────────────────────────────── */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Description color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      بيانات المستند
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {[
                    { label: 'رقم الطلب', value: result.requestId },
                    { label: 'عنوان المستند', value: result.documentTitle },
                    { label: 'نوع المستند', value: result.documentType },
                    { label: 'الحالة', value: result.status },
                    { label: 'المنشئ', value: result.createdByName || '-' },
                    {
                      label: 'تاريخ الإنشاء',
                      value: result.createdAt
                        ? new Date(result.createdAt).toLocaleDateString('ar-SA')
                        : '-',
                    },
                    {
                      label: 'تاريخ الإتمام',
                      value: result.completedAt
                        ? new Date(result.completedAt).toLocaleDateString('ar-SA')
                        : '-',
                    },
                  ].map((item, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        py: 1,
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Shield color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      معلومات الأمان
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  {result.verificationCode && (
                    <Box
                      sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, mb: 2, textAlign: 'center' }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        رمز التحقق
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                        }}
                      >
                        <Typography variant="h5" sx={{ fontFamily: 'monospace', letterSpacing: 3 }}>
                          {result.verificationCode}
                        </Typography>
                        <IconButton size="small" onClick={copyCode}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  )}

                  {result.documentHash && (
                    <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        بصمة المستند (SHA-256)
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}
                      >
                        {result.documentHash}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ─── Signers List ────────────────────────────────────────── */}
          <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              حالة الموقعين ({result.signersStatus?.length || 0})
            </Typography>
            <List>
              {(result.signersStatus || []).map((s, i) => (
                <ListItem
                  key={i}
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    mb: 1,
                    bgcolor:
                      s.status === 'signed'
                        ? '#f1f8e9'
                        : s.status === 'rejected'
                          ? '#ffebee'
                          : '#fff',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor:
                          s.status === 'signed'
                            ? 'success.main'
                            : s.status === 'rejected'
                              ? 'error.main'
                              : 'grey.400',
                      }}
                    >
                      {s.status === 'signed' ? (
                        <CheckCircle />
                      ) : s.status === 'rejected' ? (
                        <Cancel />
                      ) : (
                        <Person />
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography fontWeight="bold">{s.name}</Typography>
                        <Chip
                          label={
                            s.status === 'signed'
                              ? 'تم التوقيع'
                              : s.status === 'rejected'
                                ? 'مرفوض'
                                : 'معلق'
                          }
                          color={
                            s.status === 'signed'
                              ? 'success'
                              : s.status === 'rejected'
                                ? 'error'
                                : 'warning'
                          }
                          size="small"
                        />
                        {s.role && s.role !== 'signer' && (
                          <Chip label={s.role} size="small" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {s.signedAt && (
                          <Typography variant="caption" color="success.main">
                            <Schedule sx={{ fontSize: 12, verticalAlign: 'middle', ml: 0.5 }} />
                            {new Date(s.signedAt).toLocaleString('ar-SA')}
                            {s.signatureType &&
                              ` • طريقة التوقيع: ${s.signatureType === 'draw' ? 'رسم' : s.signatureType === 'type' ? 'كتابة' : s.signatureType === 'upload' ? 'رفع' : s.signatureType}`}
                          </Typography>
                        )}
                        {s.signatureHash && (
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{ fontFamily: 'monospace', fontSize: 10 }}
                          >
                            hash: {s.signatureHash.substring(0, 20)}...
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* ─── Audit Trail (if available) ──────────────────────────── */}
          {result.auditTrail?.length > 0 && (
            <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <History color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  سجل التدقيق
                </Typography>
              </Box>
              {[...result.auditTrail].reverse().map((entry, i) => (
                <Box
                  key={i}
                  sx={{ display: 'flex', gap: 2, py: 1, borderBottom: '1px solid #f0f0f0' }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: 12,
                      bgcolor:
                        entry.action === 'signed'
                          ? 'success.main'
                          : entry.action === 'rejected'
                            ? 'error.main'
                            : 'grey.500',
                    }}
                  >
                    {entry.action === 'signed' ? (
                      <CheckCircle sx={{ fontSize: 16 }} />
                    ) : (
                      <History sx={{ fontSize: 16 }} />
                    )}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {auditActionMap[entry.action] || entry.action}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {entry.performerName || 'النظام'} •{' '}
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString('ar-SA') : ''}
                    </Typography>
                    {entry.details && (
                      <Typography variant="caption" display="block">
                        {entry.details}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
