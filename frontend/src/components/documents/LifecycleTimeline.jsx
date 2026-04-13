/**
 * LifecycleTimeline — عارض الجدول الزمني لدورة حياة المستند
 * عرض المراحل والأحداث والاحتفاظ والحجز القانوني
 */
import { useState, useEffect } from 'react';



import { lifecycleApi } from '../../services/documentProPhase9Service';
import logger from '../../utils/logger';

const fmtDateTime = (d) => d ? new Date(d).toLocaleString('ar-SA') : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ar-SA') : '—';
const fmtDuration = (mins) => {
  if (!mins) return '—';
  if (mins < 60) return `${mins} دقيقة`;
  if (mins < 1440) return `${Math.round(mins / 60)} ساعة`;
  return `${Math.round(mins / 1440)} يوم`;
};

const phaseColors = ['#1976d2', '#4caf50', '#ff9800', '#9c27b0', '#f44336', '#00bcd4', '#795548', '#607d8b'];

function EventTimeline({ events }) {
  if (!events?.length) return <Alert severity="info">لا توجد أحداث</Alert>;

  const eventIcons = {
    lifecycle_assigned: <ActiveIcon color="primary" />,
    phase_transition:   <ArrowIcon color="info" />,
    legal_hold_set:     <LegalIcon color="error" />,
    legal_hold_released:<LegalIcon color="success" />,
    retention_extended: <CalIcon color="warning" />,
    disposition_requested: <WarningIcon color="warning" />,
    disposed: <DisposedIcon color="error" />,
  };

  const eventLabels = {
    lifecycle_assigned: 'تعيين دورة الحياة',
    phase_transition:   'انتقال مرحلة',
    legal_hold_set:     'تطبيق حجز قانوني',
    legal_hold_released:'رفع حجز قانوني',
    retention_extended: 'تمديد الاحتفاظ',
    disposition_requested: 'طلب إتلاف',
    disposed: 'تم الإتلاف',
  };

  return (
    <List dense>
      {events.slice(0, 30).map((e, i) => (
        <ListItem key={i} sx={{ borderRight: `3px solid ${i === 0 ? '#1976d2' : '#e0e0e0'}`, mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            {eventIcons[e.type] || <EventIcon color="action" />}
          </ListItemIcon>
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight="bold">{eventLabels[e.type] || e.type}</Typography>
                {e.details?.from && e.details?.to && (
                  <Chip label={`${e.details.from} → ${e.details.to}`} size="small" variant="outlined" />
                )}
              </Stack>
            }
            secondary={fmtDateTime(e.timestamp)}
          />
        </ListItem>
      ))}
    </List>
  );
}

export default function LifecycleTimeline({ open, onClose, documentId: propDocId }) {
  const [docId, setDocId] = useState('');
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (propDocId) { setDocId(propDocId); }
  }, [propDocId]);

  useEffect(() => {
    if (open && docId) loadTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, docId]);

  const loadTimeline = async () => {
    if (!docId) return;
    setLoading(true);
    setError('');
    try {
      const r = await lifecycleApi.getTimeline(docId);
      setTimeline(r.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'خطأ في تحميل البيانات');
      logger.error('LifecycleTimeline', e);
    }
    setLoading(false);
  };

  const statusIcon = {
    active: <ActiveIcon sx={{ color: '#4caf50' }} />,
    legal_hold: <HoldIcon sx={{ color: '#f44336' }} />,
    completed: <DoneIcon sx={{ color: '#1976d2' }} />,
    disposed: <DisposedIcon sx={{ color: '#9e9e9e' }} />,
    suspended: <PendingIcon sx={{ color: '#ff9800' }} />,
  };

  const statusLabel = {
    active: 'نشط', legal_hold: 'حجز قانوني', completed: 'مكتمل', disposed: 'مُتلَف', suspended: 'معلق',
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          <TimelineIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">الجدول الزمني لدورة الحياة</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers dir="rtl" sx={{ minHeight: 400 }}>
        {/* Document ID Input */}
        <Stack direction="row" spacing={2} mb={3} alignItems="center">
          <TextField fullWidth size="small" label="معرف المستند" value={docId} onChange={e => setDocId(e.target.value)} />
          <Button variant="contained" onClick={loadTimeline} disabled={!docId || loading}>عرض</Button>
        </Stack>

        {loading && <Box textAlign="center" py={4}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {timeline && !loading && (
          <Box>
            {/* Status Header */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
                <Stack direction="row" spacing={1} alignItems="center">
                  {statusIcon[timeline.status] || statusIcon.active}
                  <Typography fontWeight="bold">{statusLabel[timeline.status] || timeline.status}</Typography>
                </Stack>
                {timeline.currentPhase && (
                  <Chip label={`المرحلة الحالية: ${timeline.currentPhase.name}`} color="primary" />
                )}
                {timeline.currentPhase?.expiresAt && (
                  <Chip label={`تنتهي: ${fmtDate(timeline.currentPhase.expiresAt)}`} color={new Date(timeline.currentPhase.expiresAt) < new Date() ? 'error' : 'default'} variant="outlined" />
                )}
              </Stack>
            </Paper>

            {/* Retention Info */}
            {timeline.retention && (
              <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>معلومات الاحتفاظ</Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Chip icon={<CalIcon />} label={`نهاية الاحتفاظ: ${fmtDate(timeline.retention.retentionEndDate)}`} variant="outlined" />
                    {timeline.retention.legalHold && (
                      <Chip icon={<LegalIcon />} label={`حجز قانوني: ${timeline.retention.legalHoldReason}`} color="error" />
                    )}
                    {timeline.retention.dispositionMethod && (
                      <Chip label={`طريقة الإتلاف: ${timeline.retention.dispositionMethod}`} variant="outlined" />
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Phase History */}
            {timeline.phases?.length > 0 && (
              <Box mb={3}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>تاريخ المراحل</Typography>
                <Stepper orientation="vertical" activeStep={timeline.phases.length}>
                  {timeline.phases.map((p, i) => (
                    <Step key={i} completed>
                      <StepLabel
                        icon={<Avatar sx={{ width: 28, height: 28, bgcolor: phaseColors[i % phaseColors.length], fontSize: 14 }}>{i + 1}</Avatar>}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight="bold">{p.phase}</Typography>
                          <Chip label={fmtDuration(p.duration)} size="small" variant="outlined" />
                        </Stack>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary">
                          دخول: {fmtDateTime(p.enteredAt)} | خروج: {fmtDateTime(p.exitedAt)}
                        </Typography>
                        {p.exitReason && <Chip label={p.exitReason} size="small" sx={{ mt: 0.5 }} />}
                        {p.notes && <Typography variant="body2" sx={{ mt: 0.5 }}>{p.notes}</Typography>}
                      </StepContent>
                    </Step>
                  ))}
                  {timeline.currentPhase && (
                    <Step active>
                      <StepLabel icon={<Avatar sx={{ width: 28, height: 28, bgcolor: '#4caf50', fontSize: 14 }}><ActiveIcon sx={{ fontSize: 16 }} /></Avatar>}>
                        <Typography fontWeight="bold" color="primary">{timeline.currentPhase.name} (حالي)</Typography>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary">
                          دخول: {fmtDateTime(timeline.currentPhase.enteredAt)}
                          {timeline.currentPhase.expiresAt && ` | تنتهي: ${fmtDate(timeline.currentPhase.expiresAt)}`}
                        </Typography>
                      </StepContent>
                    </Step>
                  )}
                </Stepper>
              </Box>
            )}

            {/* Events */}
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>الأحداث ({timeline.events?.length || 0})</Typography>
            <EventTimeline events={timeline.events} />
          </Box>
        )}

        {!timeline && !loading && !error && (
          <Box textAlign="center" py={6}>
            <TimelineIcon sx={{ fontSize: 60, color: 'text.disabled' }} />
            <Typography color="text.secondary" mt={1}>أدخل معرف المستند لعرض الجدول الزمني</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}
