/**
 * WorkflowTimeline — مكون الجدول الزمني لسير العمل
 * ═══════════════════════════════════════════════════════
 * يعرض مراحل سير العمل بتصميم Timeline احترافي RTL
 */

import React, { useState, useEffect } from 'react';





// ── ألوان الحالات ──────────────────────────────────
const STATUS_CONFIG = {
  draft: { label: 'مسودة', color: '#9E9E9E', icon: <DescriptionIcon />, bg: '#F5F5F5' },
  pending_review: { label: 'بانتظار المراجعة', color: '#FF9800', icon: <ScheduleIcon />, bg: '#FFF3E0' },
  department_review: { label: 'مراجعة القسم', color: '#2196F3', icon: <PersonIcon />, bg: '#E3F2FD' },
  approved: { label: 'معتمد', color: '#4CAF50', icon: <CheckCircleIcon />, bg: '#E8F5E9' },
  published: { label: 'منشور', color: '#00BCD4', icon: <CheckCircleIcon />, bg: '#E0F7FA' },
  archived: { label: 'مؤرشف', color: '#607D8B', icon: <DescriptionIcon />, bg: '#ECEFF1' },
  expired: { label: 'منتهي الصلاحية', color: '#F44336', icon: <WarningIcon />, bg: '#FFEBEE' },
  rejected: { label: 'مرفوض', color: '#F44336', icon: <CancelIcon />, bg: '#FFEBEE' },
  on_hold: { label: 'معلق', color: '#FF5722', icon: <PauseIcon />, bg: '#FBE9E7' },
  deleted: { label: 'محذوف', color: '#B71C1C', icon: <CancelIcon />, bg: '#FFCDD2' },
};

const WORKFLOW_ORDER = [
  'draft',
  'pending_review',
  'department_review',
  'approved',
  'published',
  'archived',
];

export default function WorkflowTimeline({
  workflowData,
  history = [],
  currentState,
  onTransition,
  loading = false,
  compact = false,
}) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (currentState) {
      const idx = WORKFLOW_ORDER.indexOf(currentState);
      setActiveStep(idx >= 0 ? idx : 0);
    }
  }, [currentState]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // ── العرض المضغوط ──────────────────────────────
  if (compact) {
    return (
      <Box sx={{ direction: 'rtl' }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {WORKFLOW_ORDER.map((status, index) => {
            const config = STATUS_CONFIG[status] || {};
            const isCompleted = index < activeStep;
            const isCurrent = index === activeStep;
            const isRejected = currentState === 'rejected';

            return (
              <Step key={status} completed={isCompleted}>
                <StepLabel
                  error={isRejected && isCurrent}
                  StepIconComponent={() => (
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: isCurrent ? config.color : isCompleted ? '#4CAF50' : '#E0E0E0',
                        fontSize: 16,
                      }}
                    >
                      {isCompleted ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : config.icon}
                    </Avatar>
                  )}
                >
                  <Typography variant="caption" sx={{ fontWeight: isCurrent ? 700 : 400 }}>
                    {config.label}
                  </Typography>
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>
      </Box>
    );
  }

  // ── العرض الكامل ──────────────────────────────
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        direction: 'rtl',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      {/* العنوان */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          📋 مسار سير العمل
        </Typography>
        {currentState && (
          <Chip
            label={STATUS_CONFIG[currentState]?.label || currentState}
            sx={{
              bgcolor: STATUS_CONFIG[currentState]?.bg || '#F5F5F5',
              color: STATUS_CONFIG[currentState]?.color || '#333',
              fontWeight: 700,
            }}
          />
        )}
      </Box>

      {/* شريط التقدم */}
      <Box sx={{ mb: 3 }}>
        <LinearProgress
          variant="determinate"
          value={Math.round((activeStep / (WORKFLOW_ORDER.length - 1)) * 100)}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: '#E0E0E0',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              bgcolor: STATUS_CONFIG[currentState]?.color || '#2196F3',
            },
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {Math.round((activeStep / (WORKFLOW_ORDER.length - 1)) * 100)}% مكتمل
        </Typography>
      </Box>

      {/* خطوات سير العمل */}
      <Stepper activeStep={activeStep} orientation="vertical">
        {WORKFLOW_ORDER.map((status, index) => {
          const config = STATUS_CONFIG[status] || {};
          const isCompleted = index < activeStep;
          const isCurrent = index === activeStep;
          const historyEntry = history.find((h) => h.to === status || h.status === status);

          return (
            <Step key={status} completed={isCompleted}>
              <StepLabel
                StepIconComponent={() => (
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: isCurrent ? config.color : isCompleted ? '#4CAF50' : '#E0E0E0',
                      transition: 'all 0.3s',
                      boxShadow: isCurrent ? `0 0 0 4px ${config.color}33` : 'none',
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon sx={{ fontSize: 20 }} />
                    ) : (
                      React.cloneElement(config.icon || <DescriptionIcon />, { sx: { fontSize: 20 } })
                    )}
                  </Avatar>
                )}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: isCurrent ? 700 : 500 }}>
                    {config.label}
                  </Typography>
                  {isCurrent && (
                    <Chip label="الحالية" size="small" color="primary" variant="outlined" />
                  )}
                </Box>
              </StepLabel>

              <StepContent>
                <Card variant="outlined" sx={{ bgcolor: config.bg || '#FAFAFA', mb: 1 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    {historyEntry && (
                      <Stack spacing={0.5}>
                        {historyEntry.performedBy && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {historyEntry.performedByName || historyEntry.performedBy}
                            </Typography>
                          </Box>
                        )}
                        {historyEntry.timestamp && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {new Date(historyEntry.timestamp).toLocaleDateString('ar-SA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Typography>
                          </Box>
                        )}
                        {historyEntry.comment && (
                          <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                            "{historyEntry.comment}"
                          </Typography>
                        )}
                      </Stack>
                    )}

                    {isCurrent && onTransition && (
                      <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {index < WORKFLOW_ORDER.length - 1 && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<ArrowForwardIcon />}
                            onClick={() => onTransition(WORKFLOW_ORDER[index + 1])}
                          >
                            التالي: {STATUS_CONFIG[WORKFLOW_ORDER[index + 1]]?.label}
                          </Button>
                        )}
                        {index > 0 && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<ReplayIcon />}
                            onClick={() => onTransition(WORKFLOW_ORDER[index - 1])}
                          >
                            إرجاع
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => onTransition('rejected')}
                        >
                          رفض
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </StepContent>
            </Step>
          );
        })}
      </Stepper>

      {/* حالات خاصة */}
      {currentState === 'rejected' && (
        <Alert severity="error" sx={{ mt: 2, direction: 'rtl' }}>
          <Typography variant="subtitle2">تم رفض المستند</Typography>
          {history.find((h) => h.to === 'rejected')?.comment && (
            <Typography variant="body2">
              السبب: {history.find((h) => h.to === 'rejected')?.comment}
            </Typography>
          )}
        </Alert>
      )}

      {currentState === 'on_hold' && (
        <Alert severity="warning" sx={{ mt: 2, direction: 'rtl' }}>
          <Typography variant="subtitle2">المستند معلق مؤقتاً</Typography>
        </Alert>
      )}
    </Paper>
  );
}
