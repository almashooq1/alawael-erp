/**
 * Professional Status States — AlAwael ERP
 * حالات العرض الاحترافية (فارغ، خطأ، تحميل، نجاح)
 *
 * Components:
 * - EmptyState: No data / no results
 * - ErrorState: Error with retry
 * - SuccessState: Operation completed
 * - LoadingOverlay: Full-page / section loading
 * - ProDialog: Confirmation & form dialogs
 */

import {
  useTheme,
  alpha,
} from '@mui/material';

import { motion } from 'framer-motion';
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
export const EmptyState = ({
  icon,
  title = 'لا توجد بيانات',
  subtitle = 'لم يتم العثور على نتائج مطابقة',
  action,         // { label, onClick, icon }
  compact = false,
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
        py: compact ? 4 : 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: compact ? 64 : 96,
          height: compact ? 64 : 96,
          borderRadius: '50%',
          backgroundColor: alpha(theme.palette.text.disabled, 0.06),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2.5,
        }}
      >
        {icon || <EmptyIcon sx={{ fontSize: compact ? 32 : 48, color: 'text.disabled' }} />}
      </Box>
      <Typography
        variant={compact ? 'subtitle2' : 'h6'}
        fontWeight={700}
        gutterBottom
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 400, mb: action ? 3 : 0 }}
      >
        {subtitle}
      </Typography>
      {action && (
        <Button
          variant="outlined"
          color="primary"
          startIcon={action.icon}
          onClick={action.onClick}
          sx={{ borderRadius: '10px' }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
};

// ─── ERROR STATE ─────────────────────────────────────────────────────────────
export const ErrorState = ({
  title = 'حدث خطأ',
  subtitle = 'تعذر تحميل البيانات. يرجى المحاولة مرة أخرى.',
  onRetry,
  compact = false,
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
        py: compact ? 4 : 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: compact ? 64 : 96,
          height: compact ? 64 : 96,
          borderRadius: '50%',
          backgroundColor: alpha(theme.palette.error.main, 0.08),
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
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: onRetry ? 3 : 0 }}>
        {subtitle}
      </Typography>
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
}) => {
  const theme = useTheme();

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

// ─── LOADING OVERLAY ─────────────────────────────────────────────────────────
export const LoadingOverlay = ({
  open = true,
  message = 'جارٍ التحميل...',
  fullPage = false,
}) => {
  const theme = useTheme();

  if (fullPage) {
    return (
      <Backdrop open={open} sx={{ zIndex: 1500, flexDirection: 'column', gap: 2, backgroundColor: alpha(theme.palette.background.default, 0.85) }}>
        <CircularProgress size={48} thickness={3} />
        <Typography variant="body1" fontWeight={600}>{message}</Typography>
      </Backdrop>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        gap: 2,
      }}
    >
      <CircularProgress size={40} thickness={3} />
      <Typography variant="body2" color="text.secondary">{message}</Typography>
    </Box>
  );
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
  variant = 'default', // default | danger | success
  icon,
  maxWidth = 'sm',
  fullWidth = true,
  hideActions = false,
}) => {
  const theme = useTheme();

  const variantConfig = {
    default: { color: 'primary', icon: null },
    danger: { color: 'error', icon: <DeleteIcon sx={{ fontSize: 32 }} /> },
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
      PaperProps={{ sx: { borderRadius: '16px' } }}
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
