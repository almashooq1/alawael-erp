/**
 * ConfirmDialog.jsx — Reusable MUI Confirmation Dialog
 * مكون حوار تأكيد قابل لإعادة الاستخدام
 *
 * Replaces all window.confirm() calls across the application.
 *
 * Usage:
 *   const [confirmState, showConfirm] = useConfirmDialog();
 *
 *   // Trigger:
 *   showConfirm({
 *     title: 'حذف العنصر',
 *     message: 'هل أنت متأكد؟',
 *     confirmText: 'حذف',
 *     confirmColor: 'error',
 *     onConfirm: () => handleDelete(id),
 *   });
 *
 *   // Render (once, at bottom of component):
 *   <ConfirmDialog {...confirmState} />
 */

import { useState, useCallback } from 'react';


// ═══════════════════════════════════════════════════════════════════════════
// ConfirmDialog Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ConfirmDialog({
  open = false,
  title = 'تأكيد',
  message = 'هل أنت متأكد من هذا الإجراء؟',
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  confirmColor = 'error',
  icon,
  onConfirm,
  onClose,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${confirmColor}.lighter`,
            color: `${confirmColor}.main`,
          }}
        >
          {icon || <WarningIcon />}
        </Box>
        <Typography variant="h6" fontWeight={600}>{title}</Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: '1rem' }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" variant="outlined" sx={{ borderRadius: 2 }}>
          {cancelText}
        </Button>
        <Button
          onClick={() => { onConfirm?.(); onClose?.(); }}
          color={confirmColor}
          variant="contained"
          sx={{ borderRadius: 2 }}
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// useConfirmDialog Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook that manages ConfirmDialog state.
 * Returns [dialogProps, showConfirm] — spread dialogProps onto <ConfirmDialog />.
 *
 * @returns {[object, Function]}
 */
export function useConfirmDialog() {
  const [state, setState] = useState({
    open: false,
    title: 'تأكيد',
    message: '',
    confirmText: 'تأكيد',
    cancelText: 'إلغاء',
    confirmColor: 'error',
    icon: null,
    onConfirm: null,
  });

  const showConfirm = useCallback((options) => {
    setState({
      open: true,
      title: options.title || 'تأكيد',
      message: options.message || 'هل أنت متأكد من هذا الإجراء؟',
      confirmText: options.confirmText || 'تأكيد',
      cancelText: options.cancelText || 'إلغاء',
      confirmColor: options.confirmColor || 'error',
      icon: options.icon || null,
      onConfirm: options.onConfirm || null,
    });
  }, []);

  const onClose = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return [{ ...state, onClose }, showConfirm];
}
