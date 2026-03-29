import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eSignatureService from '../../services/eSignature.service';
import eSignaturePdfService from '../../services/eSignaturePdf.service';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Divider,  LinearProgress,
  Alert,  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Draw as DrawIcon,  CheckCircle,
  Cancel,
  ArrowBack,  History,
  Comment as CommentIcon,
  Person,  VerifiedUser,  Refresh,
  Download,
  Visibility,  PictureAsPdf,
  QrCode2,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';
import SignaturePad from '../../components/common/SignaturePad';

/* ═══ Status Map ═════════════════════════════════════════════════════════ */
const statusMap = {
  draft: { label: 'مسودة', color: 'default' },
  pending: { label: 'بانتظار التوقيع', color: 'warning' },
  in_progress: { label: 'قيد التنفيذ', color: 'info' },
  completed: { label: 'مكتمل', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
  expired: { label: 'منتهي', color: 'default' },
  cancelled: { label: 'ملغي', color: 'default' },
};

const signerStatusMap = {
  pending: { label: 'معلق', color: 'warning' },
  signed: { label: 'تم التوقيع', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
  expired: { label: 'منتهي', color: 'default' },
  delegated: { label: 'تم التفويض', color: 'info' },
};

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
  resent: 'أعيد الإرسال',
  downloaded: 'تم التحميل',
  verified: 'تم التحقق',
  comment_added: 'تعليق جديد',
  field_filled: 'تعبئة حقل',
};

export default function ESignatureSigning() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const canvasRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Signing state
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signMethod, setSignMethod] = useState(0); // 0=draw, 1=type, 2=upload
  const [typedSignature, setTypedSignature] = useState('');
  const [signatureFont, setSignatureFont] = useState('Noto Kufi Arabic');
  const [uploadedSignature, setUploadedSignature] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signingInProgress, setSigningInProgress] = useState(false);

  // Reject
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Comment
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  // PDF & Signature Pad
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [signaturePadData, setSignaturePadData] = useState(null);

  /* ─── Load Data ────────────────────────────────────────────────────────── */
  const loadDoc = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eSignatureService.getById(id);
      if (res?.data?.data) setDoc(res.data.data);
    } catch {
      showSnackbar('خطأ في تحميل بيانات الطلب', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadDoc();
  }, [loadDoc]);

  /* ─── Canvas Drawing ───────────────────────────────────────────────────── */
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a237e';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    if (signDialogOpen && signMethod === 0) {
      setTimeout(initCanvas, 100);
    }
  }, [signDialogOpen, signMethod, initCanvas]);

  const getCanvasPos = e => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = e => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = e => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = e => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    initCanvas();
  };

  /* ─── Handle Sign ──────────────────────────────────────────────────────── */
  const handleSign = async () => {
    // Use new SignaturePad data if available, else fall back to legacy canvas
    if (signaturePadData) {
      setSigningInProgress(true);
      try {
        await eSignatureService.sign(id, {
          signatureType: signaturePadData.type,
          signatureImage: signaturePadData.image,
          signatureText: signaturePadData.text,
          signatureFont: signaturePadData.font,
        });
        showSnackbar('تم التوقيع بنجاح', 'success');
        setSignDialogOpen(false);
        setSignaturePadData(null);
        loadDoc();
      } catch {
        showSnackbar('خطأ في التوقيع', 'error');
      } finally {
        setSigningInProgress(false);
      }
      return;
    }

    // Legacy fallback (should not normally reach here)
    setSigningInProgress(true);
    try {
      let signatureImage = null;
      let signatureType = 'draw';

      if (signMethod === 0) {
        signatureImage = canvasRef.current?.toDataURL('image/png');
        signatureType = 'draw';
      } else if (signMethod === 1) {
        if (!typedSignature.trim()) {
          showSnackbar('يرجى كتابة التوقيع', 'warning');
          setSigningInProgress(false);
          return;
        }
        signatureType = 'type';
      } else if (signMethod === 2) {
        if (!uploadedSignature) {
          showSnackbar('يرجى رفع صورة التوقيع', 'warning');
          setSigningInProgress(false);
          return;
        }
        signatureImage = uploadedSignature;
        signatureType = 'upload';
      }

      await eSignatureService.sign(id, {
        signatureType,
        signatureImage,
        signatureText: signMethod === 1 ? typedSignature : undefined,
        signatureFont: signMethod === 1 ? signatureFont : undefined,
      });

      showSnackbar('تم التوقيع بنجاح', 'success');
      setSignDialogOpen(false);
      loadDoc();
    } catch {
      showSnackbar('خطأ في التوقيع', 'error');
    } finally {
      setSigningInProgress(false);
    }
  };

  /* ─── Handle Generate PDF ──────────────────────────────────────────────── */
  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      await eSignaturePdfService.generatePdf(id);
      showSnackbar('تم إنشاء شهادة PDF بنجاح', 'success');
    } catch {
      showSnackbar('خطأ في إنشاء ملف PDF', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await eSignaturePdfService.downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${doc?.requestId || 'signed'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSnackbar('تم تنزيل الملف', 'success');
    } catch {
      // If no generated PDF yet, try generating first
      try {
        await eSignaturePdfService.generatePdf(id);
        const res = await eSignaturePdfService.downloadPdf(id);
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${doc?.requestId || 'signed'}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showSnackbar('تم إنشاء وتنزيل الملف', 'success');
      } catch {
        showSnackbar('خطأ في تنزيل ملف PDF', 'error');
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  /* ─── Handle Reject ────────────────────────────────────────────────────── */
  const handleReject = async () => {
    try {
      await eSignatureService.reject(id, { reason: rejectReason });
      showSnackbar('تم رفض التوقيع', 'success');
      setRejectDialogOpen(false);
      loadDoc();
    } catch {
      showSnackbar('خطأ في الرفض', 'error');
    }
  };

  /* ─── Handle Comment ───────────────────────────────────────────────────── */
  const handleComment = async () => {
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      await eSignatureService.addComment(id, { text: commentText });
      showSnackbar('تم إضافة التعليق', 'success');
      setCommentText('');
      loadDoc();
    } catch {
      showSnackbar('خطأ في إضافة التعليق', 'error');
    } finally {
      setCommenting(false);
    }
  };

  /* ─── Upload handler ───────────────────────────────────────────────────── */
  const handleUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setUploadedSignature(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ─── Fonts for typed signature ────────────────────────────────────────── */
  const fonts = [
    { value: 'Noto Kufi Arabic', label: 'نوتو كوفي' },
    { value: 'Amiri', label: 'الأميري' },
    { value: 'Cairo', label: 'القاهرة' },
    { value: 'Tajawal', label: 'تجول' },
    { value: 'cursive', label: 'مخطوط' },
  ];

  if (loading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!doc) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }} dir="rtl">
        <Alert severity="error" sx={{ mb: 2 }}>
          لم يتم العثور على طلب التوقيع
        </Alert>
        <Button onClick={() => navigate('/e-signature')}>العودة للقائمة</Button>
      </Box>
    );
  }

  const canSign = ['pending', 'in_progress'].includes(doc.status);
  const signedCount = doc.signers.filter(s => s.status === 'signed').length;
  const totalActionable = doc.signers.filter(s => s.role !== 'cc').length;
  const progressPercent =
    totalActionable > 0 ? Math.round((signedCount / totalActionable) * 100) : 0;

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <Box
        sx={{
          background:
            doc.status === 'completed'
              ? gradients.success
              : doc.status === 'rejected'
                ? gradients.error || gradients.danger
                : gradients.info,
          borderRadius: 3,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
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
              <DrawIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {doc.documentTitle}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {doc.requestId} • {statusMap[doc.status]?.label}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canSign && (
              <>
                <Button
                  variant="contained"
                  startIcon={<DrawIcon />}
                  onClick={() => setSignDialogOpen(true)}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': { bgcolor: '#f5f5f5' },
                  }}
                >
                  توقيع
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={() => setRejectDialogOpen(true)}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  رفض
                </Button>
              </>
            )}
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
      </Box>

      {/* ─── Progress Bar ────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            تقدم التوقيعات
          </Typography>
          <Typography variant="body2">
            {signedCount} / {totalActionable} ({progressPercent}%)
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPercent}
          sx={{ height: 10, borderRadius: 5 }}
          color={
            doc.status === 'completed' ? 'success' : doc.status === 'rejected' ? 'error' : 'primary'
          }
        />
      </Paper>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="التفاصيل" icon={<Visibility />} iconPosition="start" />
          <Tab label="الموقعون" icon={<Person />} iconPosition="start" />
          <Tab label="سجل التدقيق" icon={<History />} iconPosition="start" />
          <Tab label="التعليقات" icon={<CommentIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ═══ Tab 0: Details ════════════════════════════════════════════════ */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  بيانات المستند
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {[
                    { label: 'رقم الطلب', value: doc.requestId },
                    { label: 'نوع المستند', value: doc.documentType },
                    { label: 'الأولوية', value: doc.priority },
                    { label: 'القسم', value: doc.department || '-' },
                    {
                      label: 'تاريخ الإنشاء',
                      value: doc.createdAt
                        ? new Date(doc.createdAt).toLocaleDateString('ar-SA')
                        : '-',
                    },
                    {
                      label: 'تاريخ الانتهاء',
                      value: doc.expiresAt
                        ? new Date(doc.expiresAt).toLocaleDateString('ar-SA')
                        : '-',
                    },
                    { label: 'الحالة', value: statusMap[doc.status]?.label },
                    { label: 'رمز التحقق', value: doc.verificationCode || '-' },
                  ].map((item, i) => (
                    <Grid item xs={6} key={i}>
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.value}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
                {doc.description && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      الوصف
                    </Typography>
                    <Typography variant="body2">{doc.description}</Typography>
                  </Box>
                )}
                {doc.tags?.length > 0 && (
                  <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {doc.tags.map((t, i) => (
                      <Chip key={i} label={t} size="small" variant="outlined" />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, mb: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <VerifiedUser
                  sx={{
                    fontSize: 48,
                    color: doc.status === 'completed' ? 'success.main' : 'text.disabled',
                    mb: 1,
                  }}
                />
                <Typography variant="h6" fontWeight="bold">
                  {doc.status === 'completed' ? 'مستند موثق' : 'في انتظار التوقيع'}
                </Typography>
                <Chip
                  label={statusMap[doc.status]?.label}
                  color={statusMap[doc.status]?.color}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  إجراءات سريعة
                </Typography>
                {canSign && (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<DrawIcon />}
                    sx={{ mb: 1 }}
                    onClick={() => setSignDialogOpen(true)}
                  >
                    توقيع المستند
                  </Button>
                )}
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<VerifiedUser />}
                  sx={{ mb: 1 }}
                  onClick={() => navigate(`/e-signature/verify/${doc._id}`)}
                >
                  التحقق
                </Button>
                {doc.status === 'completed' && (
                  <>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={generatingPdf ? <CircularProgress size={18} /> : <PictureAsPdf />}
                      sx={{ mb: 1 }}
                      onClick={handleGeneratePdf}
                      disabled={generatingPdf}
                      color="secondary"
                    >
                      {generatingPdf ? 'جاري الإنشاء...' : 'إنشاء شهادة PDF'}
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={
                        downloadingPdf ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <Download />
                        )
                      }
                      sx={{ mb: 1, background: 'linear-gradient(45deg, #1a237e 30%, #1565c0 90%)' }}
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf}
                    >
                      {downloadingPdf ? 'جاري التنزيل...' : 'تنزيل PDF الموقّع'}
                    </Button>
                  </>
                )}
                {doc.verificationCode && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<QrCode2 />}
                    sx={{ mb: 1 }}
                    onClick={() => {
                      const url = `${window.location.origin}/verify/${doc.verificationCode}`;
                      navigator.clipboard.writeText(url);
                      showSnackbar('تم نسخ رابط التحقق', 'success');
                    }}
                  >
                    نسخ رابط التحقق
                  </Button>
                )}
                <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={loadDoc}>
                  تحديث
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ═══ Tab 1: Signers ════════════════════════════════════════════════ */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            الموقعون ({doc.signers.length})
          </Typography>

          {doc.workflow?.sequential && (
            <Box sx={{ mb: 3 }}>
              <Stepper
                activeStep={doc.signers.findIndex(s => s.status === 'pending')}
                alternativeLabel
              >
                {doc.signers
                  .filter(s => s.role !== 'cc')
                  .map((s, i) => (
                    <Step key={i} completed={s.status === 'signed'}>
                      <StepLabel error={s.status === 'rejected'}>{s.name}</StepLabel>
                    </Step>
                  ))}
              </Stepper>
            </Box>
          )}

          <List>
            {doc.signers.map((s, i) => (
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
                    {s.status === 'signed' ? <CheckCircle /> : <Person />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight="bold">{s.name}</Typography>
                      <Chip
                        label={signerStatusMap[s.status]?.label}
                        color={signerStatusMap[s.status]?.color}
                        size="small"
                      />
                      {s.role !== 'signer' && (
                        <Chip
                          label={
                            s.role === 'approver'
                              ? 'معتمد'
                              : s.role === 'witness'
                                ? 'شاهد'
                                : s.role === 'reviewer'
                                  ? 'مراجع'
                                  : 'CC'
                          }
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption">{s.email}</Typography>
                      {s.signedAt && (
                        <Typography variant="caption" display="block" color="success.main">
                          وقّع في: {new Date(s.signedAt).toLocaleString('ar-SA')}
                          {s.signatureType &&
                            ` (${s.signatureType === 'draw' ? 'رسم' : s.signatureType === 'type' ? 'كتابة' : s.signatureType === 'upload' ? 'رفع' : s.signatureType})`}
                        </Typography>
                      )}
                      {s.rejectionReason && (
                        <Typography variant="caption" display="block" color="error.main">
                          سبب الرفض: {s.rejectionReason}
                        </Typography>
                      )}
                      {s.delegatedToName && (
                        <Typography variant="caption" display="block" color="info.main">
                          تم التفويض إلى: {s.delegatedToName}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                {s.signatureImage && (
                  <Box
                    sx={{
                      width: 80,
                      height: 40,
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={s.signatureImage}
                      alt="signature"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </Box>
                )}
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* ═══ Tab 2: Audit Trail ════════════════════════════════════════════ */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            سجل التدقيق
          </Typography>
          {doc.auditTrail?.length > 0 ? (
            <Box>
              {[...doc.auditTrail].reverse().map((entry, i) => (
                <Box
                  key={i}
                  sx={{ display: 'flex', gap: 2, py: 1.5, borderBottom: '1px solid #f0f0f0' }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor:
                        entry.action === 'signed'
                          ? 'success.main'
                          : entry.action === 'rejected'
                            ? 'error.main'
                            : 'primary.main',
                      fontSize: 14,
                    }}
                  >
                    {entry.action === 'signed' ? (
                      <CheckCircle fontSize="small" />
                    ) : entry.action === 'rejected' ? (
                      <Cancel fontSize="small" />
                    ) : (
                      <History fontSize="small" />
                    )}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {auditActionMap[entry.action] || entry.action}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {entry.performerName || 'النظام'} •{' '}
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString('ar-SA') : ''}
                    </Typography>
                    {entry.details && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {entry.details}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary">لا توجد سجلات تدقيق</Typography>
          )}
        </Paper>
      )}

      {/* ═══ Tab 3: Comments ═══════════════════════════════════════════════ */}
      {activeTab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            التعليقات
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="أضف تعليقاً..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleComment();
              }}
            />
            <Button
              variant="contained"
              onClick={handleComment}
              disabled={commenting || !commentText.trim()}
            >
              إرسال
            </Button>
          </Box>

          {doc.comments?.length > 0 ? (
            <List>
              {doc.comments.map((c, i) => (
                <ListItem key={i} sx={{ bgcolor: '#f8f9fa', borderRadius: 2, mb: 1 }}>
                  <ListItemAvatar>
                    <Avatar>
                      <Person />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="bold">
                        {c.userName || 'مستخدم'}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2">{c.text}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.createdAt ? new Date(c.createdAt).toLocaleString('ar-SA') : ''}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">لا توجد تعليقات</Typography>
          )}
        </Paper>
      )}

      {/* ═══ Signing Dialog ════════════════════════════════════════════════ */}
      <Dialog
        open={signDialogOpen}
        onClose={() => setSignDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DrawIcon /> توقيع المستند
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            اختر طريقة التوقيع المناسبة: الرسم باليد، الكتابة، أو رفع صورة التوقيع
          </Alert>

          <SignaturePad
            width={560}
            height={200}
            onSave={data => setSignaturePadData(data)}
            disabled={signingInProgress}
          />

          {signaturePadData && (
            <Alert severity="success" sx={{ mt: 2 }}>
              تم اعتماد التوقيع بنجاح — اضغط &quot;تأكيد التوقيع&quot; أدناه لإرساله
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setSignDialogOpen(false);
              setSignaturePadData(null);
            }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSign}
            disabled={signingInProgress || !signaturePadData}
            startIcon={<CheckCircle />}
          >
            {signingInProgress ? 'جاري التوقيع...' : 'تأكيد التوقيع'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Reject Dialog ═════════════════════════════════════════════════ */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Cancel /> رفض التوقيع
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            سيتم رفض التوقيع وإخطار المرسل. يرجى ذكر سبب الرفض.
          </Alert>
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="سبب الرفض"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={!rejectReason.trim()}
          >
            تأكيد الرفض
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
