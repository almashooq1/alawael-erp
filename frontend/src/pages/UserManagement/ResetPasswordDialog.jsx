/**
 * ResetPasswordDialog — حوار إعادة تعيين كلمة المرور
 */
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { useState } from 'react';
import {
  LockReset as ResetIcon,
  Visibility as ShowIcon,
  VisibilityOff as HideIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

const generatePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, v => chars.charAt(v % chars.length)).join('');
};

const ResetPasswordDialog = ({ open, onClose, user, onResetPassword }) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useGenerated, setUseGenerated] = useState(true);

  const handleReset = () => {
    const userId = user?._id || user?.id;
    if (userId) {
      onResetPassword(userId, useGenerated ? null : newPassword || null);
      setNewPassword('');
      setShowPassword(false);
      setUseGenerated(true);
    }
  };

  const handleGenerate = () => {
    const generated = generatePassword();
    setNewPassword(generated);
    setUseGenerated(false);
    setShowPassword(true);
  };

  const handleCopy = async () => {
    if (newPassword) {
      try {
        await navigator.clipboard.writeText(newPassword);
      } catch {
        // Fallback for insecure context
        const ta = document.createElement('textarea');
        ta.value = newPassword;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ResetIcon color="warning" />
        إعادة تعيين كلمة المرور
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            سيتم إعادة تعيين كلمة المرور للمستخدم: <strong>{user.fullName || user.username}</strong>.
            سيُطلب من المستخدم تغيير كلمة المرور عند تسجيل الدخول التالي.
          </Alert>

          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            اختر طريقة إعادة التعيين:
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant={useGenerated ? 'contained' : 'outlined'}
              size="small"
              onClick={() => {
                setUseGenerated(true);
                setNewPassword('');
              }}
            >
              كلمة مرور تلقائية
            </Button>
            <Button
              variant={!useGenerated ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setUseGenerated(false)}
            >
              كلمة مرور محددة
            </Button>
          </Box>

          {!useGenerated && (
            <Box>
              <TextField
                fullWidth
                label="كلمة المرور الجديدة"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                size="small"
                dir="ltr"
                placeholder="أدخل كلمة مرور جديدة"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={handleCopy}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <HideIcon fontSize="small" /> : <ShowIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                size="small"
                variant="text"
                sx={{ mt: 1 }}
                onClick={handleGenerate}
              >
                توليد كلمة مرور عشوائية
              </Button>
            </Box>
          )}

          {useGenerated && (
            <Alert severity="info">
              سيتم توليد كلمة مرور عشوائية من الخادم وعرضها لك بعد التأكيد.
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          إلغاء
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleReset}
          startIcon={<ResetIcon />}
        >
          إعادة تعيين
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResetPasswordDialog;
