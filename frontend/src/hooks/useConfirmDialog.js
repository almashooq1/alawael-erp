import { useState, useCallback } from 'react';

/**
 * useConfirmDialog — Manages confirmation dialog state.
 *
 * @returns {object} {
 *   isOpen, title, message, variant, data,
 *   confirm(options), close(), handleConfirm()
 * }
 *
 * @example
 * const { isOpen, title, message, confirm, close, handleConfirm } = useConfirmDialog();
 * // To show: confirm({ title: 'حذف؟', message: 'هل أنت متأكد؟', onConfirm: () => deleteItem() });
 */
const useConfirmDialog = () => {
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'تأكيد',
    cancelLabel: 'إلغاء',
    variant: 'warning', // 'warning' | 'danger' | 'info'
    data: null,
    onConfirm: null,
    onCancel: null,
  });

  const confirm = useCallback((options = {}) => {
    setState({
      isOpen: true,
      title: options.title || 'تأكيد العملية',
      message: options.message || 'هل أنت متأكد من المتابعة؟',
      confirmLabel: options.confirmLabel || 'تأكيد',
      cancelLabel: options.cancelLabel || 'إلغاء',
      variant: options.variant || 'warning',
      data: options.data || null,
      onConfirm: options.onConfirm || null,
      onCancel: options.onCancel || null,
    });
  }, []);

  const close = useCallback(() => {
    state.onCancel?.(state.data);
    setState(prev => ({ ...prev, isOpen: false }));
  }, [state]);

  const handleConfirm = useCallback(() => {
    state.onConfirm?.(state.data);
    setState(prev => ({ ...prev, isOpen: false }));
  }, [state]);

  return {
    isOpen: state.isOpen,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    cancelLabel: state.cancelLabel,
    variant: state.variant,
    data: state.data,
    confirm,
    close,
    handleConfirm,
  };
};

export default useConfirmDialog;
