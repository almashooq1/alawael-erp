/**
 * Professional Notification Toast System — AlAwael ERP
 * نظام إشعارات مُنبثقة احترافي
 *
 * Features:
 * - Stack multiple toasts
 * - Auto-dismiss with configurable duration
 * - Progress bar countdown
 * - Action buttons within toasts
 * - Different types: success, error, warning, info
 * - Position: top-right, top-left, bottom-right, bottom-left, top-center
 * - Slide/fade animations
 * - Global toast API via context
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  useTheme,
} from '@mui/material';



// ─── Config ──────────────────────────────────────────────────────────────────
const TOAST_DEFAULTS = {
  duration: 5000,
  position: 'top-left', // RTL: top-left = top-right visually
  maxVisible: 5,
};

const ICON_MAP = {
  success: <SuccessIcon />,
  error: <ErrorIcon />,
  warning: <WarningIcon />,
  info: <InfoIcon />,
};

const COLOR_MAP = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

// ─── Toast Context ───────────────────────────────────────────────────────────
const ToastContext = createContext(null);

let toastIdCounter = 0;

export const ToastProvider = ({ children, position, maxVisible }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (options) => {
      const id = ++toastIdCounter;
      const toast = {
        id,
        type: options.type || 'info',
        title: options.title,
        message: options.message,
        duration: options.duration ?? TOAST_DEFAULTS.duration,
        action: options.action, // { label, onClick }
        persistent: options.persistent || false,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        const max = maxVisible || TOAST_DEFAULTS.maxVisible;
        const updated = [toast, ...prev];
        return updated.slice(0, max);
      });

      // Auto-dismiss
      if (!toast.persistent && toast.duration > 0) {
        timersRef.current[id] = setTimeout(() => removeToast(id), toast.duration);
      }

      return id;
    },
    [maxVisible, removeToast]
  );

  // Shorthand methods
  const success = useCallback((title, message, opts = {}) => addToast({ type: 'success', title, message, ...opts }), [addToast]);
  const error = useCallback((title, message, opts = {}) => addToast({ type: 'error', title, message, duration: 8000, ...opts }), [addToast]);
  const warning = useCallback((title, message, opts = {}) => addToast({ type: 'warning', title, message, ...opts }), [addToast]);
  const info = useCallback((title, message, opts = {}) => addToast({ type: 'info', title, message, ...opts }), [addToast]);

  const clearAll = useCallback(() => {
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
    setToasts([]);
  }, []);

  const contextValue = { addToast, removeToast, success, error, warning, info, clearAll };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} position={position || TOAST_DEFAULTS.position} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

// ─── Toast Container ─────────────────────────────────────────────────────────
const POSITION_STYLES = {
  'top-right': { top: 80, right: 16 },
  'top-left': { top: 80, left: 16 },
  'bottom-right': { bottom: 16, right: 16 },
  'bottom-left': { bottom: 16, left: 16 },
  'top-center': { top: 80, left: '50%', transform: 'translateX(-50%)' },
};

const ToastContainer = ({ toasts, onDismiss, position }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        width: { xs: 'calc(100% - 32px)', sm: 380 },
        maxWidth: 420,
        pointerEvents: 'none',
        ...POSITION_STYLES[position],
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </Box>
  );
};

// ─── Toast Item ──────────────────────────────────────────────────────────────
const ToastItem = ({ toast, onDismiss }) => {
  const theme = useTheme();
  const colorKey = COLOR_MAP[toast.type] || 'info';
  const palette = theme.palette[colorKey];

  const elapsed = Date.now() - toast.createdAt;
  const remaining = Math.max(0, toast.duration - elapsed);
  const progress = toast.persistent ? 100 : (remaining / toast.duration) * 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{ pointerEvents: 'auto' }}
    >
      <Paper
        elevation={6}
        sx={{
          overflow: 'hidden',
          borderRadius: '12px',
          borderRight: `4px solid ${palette.main}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 2 }}>
          {/* Icon */}
          <Box sx={{ color: palette.main, mt: 0.25, flexShrink: 0 }}>
            {ICON_MAP[toast.type]}
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {toast.title && (
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                {toast.title}
              </Typography>
            )}
            {toast.message && (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                {toast.message}
              </Typography>
            )}
            {toast.action && (
              <Button
                size="small"
                color={colorKey}
                onClick={() => { toast.action.onClick?.(); onDismiss(toast.id); }}
                sx={{ mt: 1, fontWeight: 600 }}
              >
                {toast.action.label}
              </Button>
            )}
          </Box>

          {/* Close */}
          <IconButton size="small" onClick={() => onDismiss(toast.id)} sx={{ mt: -0.5, mr: -0.5 }} aria-label="إغلاق الإشعار">
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Progress Bar */}
        {!toast.persistent && (
          <LinearProgress
            variant="determinate"
            value={progress}
            color={colorKey}
            sx={{
              height: 3,
              '& .MuiLinearProgress-bar': {
                transition: `transform ${toast.duration}ms linear`,
                transform: 'translateX(0%) !important',
                animation: `toast-progress ${toast.duration}ms linear forwards`,
              },
              '@keyframes toast-progress': {
                from: { transform: 'translateX(0%)' },
                to: { transform: 'translateX(-100%)' },
              },
            }}
          />
        )}
      </Paper>
    </motion.div>
  );
};

export default ToastProvider;
