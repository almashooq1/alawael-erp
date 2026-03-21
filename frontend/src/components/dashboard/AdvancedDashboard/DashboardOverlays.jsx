/**
 * DashboardOverlays — Scroll-to-top FAB, error/socket snackbars, shortcuts dialog
 */

import { brandColors, gradients } from 'theme/palette';
import { SECTIONS } from '../dashboardConstants';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  Snackbar,
  Typography,
  Zoom
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import CloseIcon from '@mui/icons-material/Close';

const DashboardOverlays = ({
  showScrollTop, scrollToTop, error, dispatch, fetchData,
  socketToast, showShortcuts, setShowShortcuts,
}) => (
  <>
    {/* ══════════════════ SCROLL TO TOP FAB ══════════════════ */}
    <Zoom in={showScrollTop}>
      <Fab
        size="small"
        onClick={scrollToTop}
        aria-label="العودة إلى الأعلى"
        sx={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          background: gradients.primary,
          color: '#fff',
          '&:hover': { background: `linear-gradient(135deg, ${brandColors.primaryEnd} 0%, ${brandColors.primaryStart} 100%)` },
          boxShadow: '0 4px 20px rgba(102,126,234,0.4)',
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Zoom>

    {/* ══════════════════ ERROR SNACKBAR ═════════════════════ */}
    <Snackbar
      open={!!error}
      autoHideDuration={10000}
      onClose={() => dispatch({ type: 'CLEAR_ERROR' })}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <Alert
        severity="warning"
        variant="filled"
        onClose={() => dispatch({ type: 'CLEAR_ERROR' })}
        sx={{ borderRadius: 3 }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => { dispatch({ type: 'CLEAR_ERROR' }); fetchData(true); }}
            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
          >
            إعادة المحاولة
          </Button>
        }
      >
        {error || 'تعذر جلب البيانات، يتم استخدام البيانات المحلية'}
      </Alert>
    </Snackbar>

    {/* ══════════════════ SOCKET STATUS TOAST ════════════════ */}
    <Snackbar
      open={!!socketToast}
      autoHideDuration={4000}
      onClose={() => dispatch({ type: 'SET_SOCKET_TOAST', value: null })}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        severity={socketToast === 'connected' ? 'success' : 'info'}
        variant="filled"
        onClose={() => dispatch({ type: 'SET_SOCKET_TOAST', value: null })}
        sx={{ borderRadius: 3 }}
      >
        {socketToast === 'connected'
          ? 'تم إعادة الاتصال المباشر بنجاح'
          : 'انقطع الاتصال المباشر — البيانات تُحدّث تلقائياً'}
      </Alert>
    </Snackbar>

    {/* ══════════════════ KEYBOARD SHORTCUT HELP ════════════ */}
    <Dialog
      open={showShortcuts}
      onClose={() => setShowShortcuts(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 4, backdropFilter: 'blur(12px)' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KeyboardIcon sx={{ color: brandColors.primaryStart }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>اختصارات لوحة المفاتيح</Typography>
        </Box>
        <IconButton size="small" onClick={() => setShowShortcuts(false)} aria-label="إغلاق">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 2 }}>
        {[
          { keys: '?', desc: 'عرض / إخفاء هذه النافذة' },
          { keys: 'Ctrl + Shift + R', desc: 'تحديث بيانات لوحة التحكم' },
          { keys: 'Home', desc: 'التمرير إلى الأعلى' },
          ...SECTIONS.map((sec, i) => ({ keys: `${i + 1}`, desc: `الانتقال إلى ${sec.label}` })),
        ].map((shortcut, idx) => (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.8 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>{shortcut.desc}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {shortcut.keys.split(' + ').map((k, ki) => (
                <Chip key={ki} label={k} size="small" variant="outlined" sx={{
                  fontWeight: 700, fontSize: '0.7rem', height: 24, minWidth: 28,
                  fontFamily: 'monospace', borderColor: 'rgba(102,126,234,0.3)', color: brandColors.primaryStart,
                }} />
              ))}
            </Box>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  </>
);

export default DashboardOverlays;
