/**
 * Professional Status States — AlAwael ERP (Phase 2)
 * حالات العرض الاحترافية (فارغ، خطأ، تحميل، نجاح)
 *
 * Components:
 * - EmptyState: No data / no results — with illustration variants
 * - ErrorState: Error with retry + error code
 * - SuccessState: Operation completed with auto-dismiss
 * - LoadingOverlay: Full-page / section loading with progress
 * - NoPermissionState: Access denied
 * - OfflineState: No internet connection
 * - ProDialog: Confirmation & form dialogs
 *
 * Phase 2: illustration variants, auto-dismiss, offline/permission states,
 *          search-specific empty, progress loading
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useTheme,
  alpha,
  Backdrop,
  LinearProgress,
} from '@mui/material';
import {
  InboxRounded as EmptyIcon,
  ErrorOutline as ErrorIcon,
  CheckCircleOutline as SuccessIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  WarningAmber as WarningIcon,
  DeleteForever as DeleteIcon,
  SearchOff as SearchOffIcon,
  CloudOff as CloudOffIcon,
  LockOutlined as LockIcon,
  FolderOffOutlined as FolderOffIcon,
  AddCircleOutline as AddIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// ─── Illustration variants for EmptyState ─────────────────────────────────────
const EMPTY_VARIANTS = {
  default: { icon: <EmptyIcon />, title: 'لا توجد بيانات', subtitle: 'لم يتم العثور على نتائج مطابقة' },
  search:  { icon: <SearchOffIcon />, title: 'لا توجد نتائج', subtitle: 'جرّب تعديل كلمات البحث أو الفلاتر' },
  folder:  { icon: <FolderOffIcon />, title: 'المجلد فارغ', subtitle: 'لا توجد ملفات في هذا المجلد' },
  list:    { icon: <EmptyIcon />, title: 'القائمة فارغة', subtitle: 'لم تتم إضافة أي عناصر بعد' },
};

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
export const EmptyState = ({
  icon,
  title,
  subtitle,
  action,         // { label, onClick, icon }
  secondaryAction, // Phase 2: optional secondary action
  variant = 'default', // default | search | folder | list
  compact = false,
  illustration,   // Phase 2: custom illustration node
}) => {
  const theme = useTheme();
  const v = EMPTY_VARIANTS[variant] || EMPTY_VARIANTS.default;

  const displayTitle = title || v.title;
  const displaySubtitle = subtitle || v.subtitle;
  const displayIcon = icon || v.icon;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: compact ? 4 : 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      {/* Custom illustration or icon circle */}
      {illustration || (
        <Box
          component={motion.div}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          sx={{
            width: compact ? 64 : 96,
            height: compact ? 64 : 96,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.text.disabled, 0.06),
            border: `2px dashed ${alpha(theme.palette.text.disabled, 0.12)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2.5,
            '& svg': {
              fontSize: compact ? 32 : 48,
              color: 'text.disabled',
            },
          }}
        >
          {displayIcon}
        </Box>
      )}

      <Typography
        variant={compact ? 'subtitle2' : 'h6'}
        fontWeight={700}
        gutterBottom
      >
        {displayTitle}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 400, mb: (action || secondaryAction) ? 3 : 0 }}
      >
        {displaySubtitle}
      </Typography>

      {/* Actions */}
      {(action || secondaryAction) && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {action && (
            <Button
              variant="contained"
              color="primary"
              startIcon={action.icon || <AddIcon />}
              onClick={action.onClick}
              sx={{ borderRadius: '10px' }}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={secondaryAction.icon}
              onClick={secondaryAction.onClick}
              sx={{ borderRadius: '10px' }}
            >
              {secondaryAction.label}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

// ─── ERROR STATE ─────────────────────────────────────────────────────────────
export const ErrorState = ({
  title = 'حدث خطأ',
  subtitle = 'تعذر تحميل البيانات. يرجى المحاولة مرة أخرى.',
  errorCode,       // Phase 2: error code display
  errorDetails,    // Phase 2: collapsible details
  onRetry,
  compact = false,
}) => {
  const theme = useTheme();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: compact ? 4 : 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Box
        component={motion.div}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
        sx={{
          width: compact ? 64 : 96,
          height: compact ? 64 : 96,
          borderRadius: '50%',
          backgroundColor: alpha(theme.palette.error.main, 0.08),
          border: `2px solid ${alpha(theme.palette.error.main, 0.15)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2.5,
        }}
      >
        <ErrorIcon sx={{ fontSize: compact ? 32 : 48, color: 'error.main' }} />
      </Box>

      <Typography variant={compact ? 'subtitle2' : 'h6'} fontWeight={700} gutterBottom color="error">
        {title}
      </Typography>

      {errorCode && (
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontFamily: 'monospace',
            color: 'text.disabled',
            backgroundColor: alpha(theme.palette.error.main, 0.06),
            px: 1.5,
            py: 0.25,
            borderRadius: '6px',
            mb: 1,
          }}
        >
          رمز الخطأ: {errorCode}
        </Typography>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: onRetry ? 3 : 0 }}>
        {subtitle}
      </Typography>

      {/* Error details (collapsible) */}
      {errorDetails && (
        <Box sx={{ mb: 2, maxWidth: 400 }}>
          <Button
            size="small"
            onClick={() => setShowDetails(!showDetails)}
            sx={{ fontSize: '0.75rem', color: 'text.disabled' }}
          >
            {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </Button>
          {showDetails && (
            <Typography
              component="pre"
              sx={{
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                color: 'text.disabled',
                backgroundColor: alpha(theme.palette.error.main, 0.04),
                p: 1.5,
                borderRadius: '8px',
                textAlign: 'left',
                direction: 'ltr',
                maxHeight: 120,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {errorDetails}
            </Typography>
          )}
        </Box>
      )}

      {onRetry && (
        <Button
          variant="contained"
          color="error"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          sx={{ borderRadius: '10px' }}
        >
          إعادة المحاولة
        </Button>
      )}
    </Box>
  );
};

// ─── SUCCESS STATE ───────────────────────────────────────────────────────────
export const SuccessState = ({
  title = 'تمت العملية بنجاح',
  subtitle,
  action,
  autoDismiss = 0, // Phase 2: auto dismiss in ms (0 = disabled)
  onDismiss,
}) => {
  const theme = useTheme();

  useEffect(() => {
    if (autoDismiss > 0 && onDismiss) {
      const t = setTimeout(onDismiss, autoDismiss);
      return () => clearTimeout(t);
    }
  }, [autoDismiss, onDismiss]);

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      >
        <Box
          sx={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            backgroundColor: alpha(theme.palette.success.main, 0.08),
            border: `2px solid ${alpha(theme.palette.success.main, 0.2)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2.5,
          }}
        >
          <SuccessIcon sx={{ fontSize: 48, color: 'success.main' }} />
        </Box>
      </motion.div>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: action ? 3 : 0 }}>
          {subtitle}
        </Typography>
      )}
      {action && (
        <Button variant="contained" color="success" onClick={action.onClick} sx={{ borderRadius: '10px' }}>
          {action.label}
        </Button>
      )}
    </Box>
  );
};

// ─── Phase 2: NO PERMISSION STATE ────────────────────────────────────────────
export const NoPermissionState = ({
  title = 'غير مصرّح لك',
  subtitle = 'ليس لديك صلاحية للوصول إلى هذه الصفحة.',
  action,
}) => {
  const theme = useTheme();

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          backgroundColor: alpha(theme.palette.warning.main, 0.08),
          border: `2px solid ${alpha(theme.palette.warning.main, 0.15)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2.5,
        }}
      >
        <LockIcon sx={{ fontSize: 48, color: 'warning.main' }} />
      </Box>
      <Typography variant="h6" fontWeight={700} gutterBottom color="warning.main">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: action ? 3 : 0 }}>
        {subtitle}
      </Typography>
      {action && (
        <Button variant="outlined" color="warning" onClick={action.onClick} sx={{ borderRadius: '10px' }}>
          {action.label}
        </Button>
      )}
    </Box>
  );
};

// ─── Phase 2: OFFLINE STATE ──────────────────────────────────────────────────
export const OfflineState = ({
  title = 'لا يوجد اتصال',
  subtitle = 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى.',
  onRetry,
}) => {
  const theme = useTheme();

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          backgroundColor: alpha(theme.palette.text.disabled, 0.06),
          border: `2px dashed ${alpha(theme.palette.text.disabled, 0.15)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2.5,
        }}
      >
        <CloudOffIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
      </Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: onRetry ? 3 : 0 }}>
        {subtitle}
      </Typography>
      {onRetry && (
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={onRetry} sx={{ borderRadius: '10px' }}>
          إعادة المحاولة
        </Button>
      )}
    </Box>
  );
};

// ─── LOADING OVERLAY ─────────────────────────────────────────────────────────
export const LoadingOverlay = ({
  open = true,
  message = 'جارٍ التحميل...',
  fullPage = false,
  progress,           // Phase 2: determinate progress (0-100)
  progressLabel,      // Phase 2: e.g. "3 من 10"
}) => {
  const theme = useTheme();

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: fullPage ? 0 : 8,
        gap: 2,
      }}
    >
      {progress !== undefined ? (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            variant="determinate"
            value={progress}
            size={52}
            thickness={3}
          />
          <Box
            sx={{
              top: 0, left: 0, bottom: 0, right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
              {Math.round(progress)}%
            </Typography>
          </Box>
        </Box>
      ) : (
        <CircularProgress size={fullPage ? 48 : 40} thickness={3} />
      )}
      <Typography variant={fullPage ? 'body1' : 'body2'} fontWeight={fullPage ? 600 : 400} color="text.secondary">
        {message}
      </Typography>
      {progressLabel && (
        <Typography variant="caption" color="text.disabled">
          {progressLabel}
        </Typography>
      )}
    </Box>
  );

  if (fullPage) {
    return (
      <Backdrop
        open={open}
        sx={{
          zIndex: 1500,
          flexDirection: 'column',
          gap: 2,
          backgroundColor: alpha(theme.palette.background.default, 0.85),
          backdropFilter: 'blur(4px)',
        }}
      >
        {content}
      </Backdrop>
    );
  }

  return content;
};

// ─── PRO DIALOG ──────────────────────────────────────────────────────────────
export const ProDialog = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  // Actions
  onConfirm,
  onCancel,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  confirmColor = 'primary',
  confirmLoading = false,
  // Variants
  variant = 'default', // default | danger | success | warning
  icon,
  maxWidth = 'sm',
  fullWidth = true,
  hideActions = false,
}) => {
  const theme = useTheme();

  const variantConfig = {
    default: { color: 'primary', icon: null },
    danger:  { color: 'error', icon: <DeleteIcon sx={{ fontSize: 32 }} /> },
    success: { color: 'success', icon: <SuccessIcon sx={{ fontSize: 32 }} /> },
    warning: { color: 'warning', icon: <WarningIcon sx={{ fontSize: 32 }} /> },
  };

  const config = variantConfig[variant] || variantConfig.default;
  const displayIcon = icon || config.icon;
  const displayColor = confirmColor || config.color;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{
        sx: {
          borderRadius: '16px',
          // Phase 2: subtle entrance animation
          animation: 'dialogSlideIn 0.2s ease-out',
          '@keyframes dialogSlideIn': {
            from: { opacity: 0, transform: 'scale(0.95) translateY(8px)' },
            to: { opacity: 1, transform: 'scale(1) translateY(0)' },
          },
        },
      }}
    >
      {/* Close button */}
      <IconButton
        onClick={onClose}
        sx={{ position: 'absolute', top: 12, left: 12, zIndex: 1 }}
        size="small"
        aria-label="إغلاق"
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      {/* Icon */}
      {displayIcon && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 3 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: alpha(
                (theme.palette[displayColor] || theme.palette.primary).main,
                0.1
              ),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: `${displayColor}.main`,
            }}
          >
            {displayIcon}
          </Box>
        </Box>
      )}

      {/* Title */}
      <DialogTitle
        sx={{
          textAlign: displayIcon ? 'center' : 'right',
          pb: subtitle ? 0.5 : 1,
          fontWeight: 700,
        }}
      >
        {title}
      </DialogTitle>

      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 3, pb: 1, textAlign: displayIcon ? 'center' : 'right' }}
        >
          {subtitle}
        </Typography>
      )}

      {/* Content */}
      {children && (
        <DialogContent sx={{ pt: 1 }}>
          {children}
        </DialogContent>
      )}

      {/* Actions */}
      {!hideActions && (
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          {onCancel && (
            <Button
              variant="outlined"
              color="inherit"
              onClick={onCancel || onClose}
              disabled={confirmLoading}
            >
              {cancelLabel}
            </Button>
          )}
          {onConfirm && (
            <Button
              variant="contained"
              color={displayColor}
              onClick={onConfirm}
              disabled={confirmLoading}
              startIcon={confirmLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ minWidth: 100 }}
            >
              {confirmLoading ? 'جارٍ...' : confirmLabel}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};
