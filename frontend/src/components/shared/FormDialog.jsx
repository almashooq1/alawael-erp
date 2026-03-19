import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

/**
 * FormDialog — Modal dialog with form content, standardized layout.
 *
 * @param {boolean}  open         — Dialog visibility
 * @param {function} onClose      — Close handler
 * @param {function} [onSubmit]   — Submit handler
 * @param {string}   title        — Dialog title
 * @param {string}   [subtitle]   — Optional subtitle
 * @param {node}     children     — Form content
 * @param {string}   [submitLabel]— Submit button text
 * @param {string}   [cancelLabel]— Cancel button text
 * @param {boolean}  [loading]    — Submit loading state
 * @param {boolean}  [disabled]   — Disable submit button
 * @param {string}   [maxWidth]   — Dialog maxWidth (xs|sm|md|lg|xl)
 * @param {boolean}  [fullWidth]  — Full width dialog
 * @param {node}     [extraActions] — Additional action buttons
 * @param {string}   [submitColor] — Submit button color
 */
const FormDialog = ({
  open,
  onClose,
  onSubmit,
  title,
  subtitle,
  children,
  submitLabel = 'حفظ',
  cancelLabel = 'إلغاء',
  loading = false,
  disabled = false,
  maxWidth = 'sm',
  fullWidth = true,
  extraActions,
  submitColor = 'primary',
}) => {
  const handleSubmit = (e) => {
    e?.preventDefault();
    onSubmit?.();
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <IconButton onClick={onClose} disabled={loading} size="small" sx={{ mt: -0.5, mr: -1 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          {children}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {extraActions}
          <Button onClick={onClose} disabled={loading} color="inherit">
            {cancelLabel}
          </Button>
          {onSubmit && (
            <Button
              type="submit"
              variant="contained"
              color={submitColor}
              disabled={loading || disabled}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {submitLabel}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FormDialog;
