/**
 * UserFormDialog — حوار إنشاء / تعديل مستخدم
 * يدعم: البيانات الأساسية + الفرع + إعدادات الحساب + قوة كلمة المرور
 */


import { useState, useEffect } from 'react';


import { ROLE_OPTIONS, getRoleColor } from './constants';
import userManagementService from 'services/userManagementService';

// ─── Password Strength ────────────────────────────────
const calcPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: 'inherit' };
  let score = 0;
  if (pw.length >= 8) score += 25;
  if (pw.length >= 12) score += 10;
  if (/[A-Z]/.test(pw)) score += 15;
  if (/[a-z]/.test(pw)) score += 15;
  if (/[0-9]/.test(pw)) score += 15;
  if (/[^A-Za-z0-9]/.test(pw)) score += 20;
  if (score <= 25) return { score, label: 'ضعيفة جداً', color: 'error' };
  if (score <= 50) return { score, label: 'ضعيفة', color: 'error' };
  if (score <= 70) return { score, label: 'متوسطة', color: 'warning' };
  if (score <= 85) return { score, label: 'قوية', color: 'info' };
  return { score: 100, label: 'قوية جداً', color: 'success' };
};

const generateStrongPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr, v => chars.charAt(v % chars.length)).join('');
};

const UserFormDialog = ({ open, onClose, editingUser, formData, setFormData, onSave, roles, branches: propBranches, saving }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [branches, setBranches] = useState(propBranches || []);
  const isEdit = Boolean(editingUser);
  const roleOptions = roles?.length > 0 ? roles : ROLE_OPTIONS;
  const passwordStrength = calcPasswordStrength(formData.password);

  // جلب الفروع إذا لم تُمرر كـ prop
  useEffect(() => {
    if (!propBranches?.length) {
      userManagementService.getBranches?.().then(b => setBranches(b || [])).catch(() => {});
    }
  }, [propBranches]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSwitchChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.checked }));
  };

  // التحقق البسيط
  const isValid = formData.fullName?.trim().length >= 2 &&
    (formData.email || formData.username || formData.phone);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon color="primary" />
        {isEdit ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {!isEdit && (
            <Alert severity="info" sx={{ mb: 2 }}>
              إذا لم يتم تحديد كلمة مرور، سيتم إنشاء كلمة مرور مؤقتة تلقائياً.
            </Alert>
          )}

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
            البيانات الأساسية
          </Typography>

          <Grid container spacing={2}>
            {/* الاسم الكامل */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="الاسم الكامل"
                value={formData.fullName}
                onChange={handleChange('fullName')}
                size="small"
                error={formData.fullName !== undefined && formData.fullName.trim().length > 0 && formData.fullName.trim().length < 2}
                helperText={formData.fullName?.trim().length > 0 && formData.fullName.trim().length < 2 ? 'يجب أن يكون حرفين على الأقل' : ''}
              />
            </Grid>

            {/* اسم المستخدم */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="اسم المستخدم"
                value={formData.username}
                onChange={handleChange('username')}
                size="small"
                dir="ltr"
                placeholder="username"
              />
            </Grid>

            {/* البريد الإلكتروني */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                size="small"
                dir="ltr"
                placeholder="user@example.com"
              />
            </Grid>

            {/* الهاتف */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="رقم الهاتف"
                value={formData.phone}
                onChange={handleChange('phone')}
                size="small"
                dir="ltr"
                placeholder="+966XXXXXXXXX"
              />
            </Grid>

            {/* كلمة المرور */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={isEdit ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                size="small"
                dir="ltr"
                placeholder={isEdit ? 'اتركه فارغاً للاحتفاظ بالحالية' : 'كلمة مرور قوية'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        title="توليد كلمة مرور قوية"
                        onClick={() => {
                          const pw = generateStrongPassword();
                          setFormData(prev => ({ ...prev, password: pw }));
                          setShowPassword(true);
                        }}
                      >
                        <GenerateIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        title="نسخ"
                        onClick={() => formData.password && navigator.clipboard?.writeText(formData.password).catch(() => {})}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <HideIcon fontSize="small" /> : <ShowIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {/* مؤشر قوة كلمة المرور */}
              {formData.password && (
                <Box sx={{ mt: 0.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength.score}
                    color={passwordStrength.color}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                  <Typography variant="caption" color={`${passwordStrength.color}.main`} sx={{ fontSize: 11 }}>
                    قوة كلمة المرور: {passwordStrength.label}
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* الدور */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الدور</InputLabel>
                <Select
                  value={formData.role}
                  label="الدور"
                  onChange={handleChange('role')}
                  renderValue={(val) => {
                    const r = roleOptions.find(opt => opt.value === val);
                    return r ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getRoleColor(val) }} />
                        {r.label}
                      </Box>
                    ) : val;
                  }}
                >
                  {roleOptions.map((r) => (
                    <MenuItem key={r.value} value={r.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getRoleColor(r.value) }} />
                        {r.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* الفرع */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الفرع</InputLabel>
                <Select
                  value={formData.branch || ''}
                  label="الفرع"
                  onChange={handleChange('branch')}
                >
                  <MenuItem value="">بدون فرع</MenuItem>
                  {branches.map((b) => (
                    <MenuItem key={b._id || b.id} value={b._id || b.id}>
                      {b.name_ar || b.name || b.label || b.code}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
            إعدادات الحساب
          </Typography>

          <Grid container spacing={2} alignItems="center">
            {/* حالة الحساب */}
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={handleSwitchChange('isActive')}
                    color="success"
                  />
                }
                label={formData.isActive ? 'الحساب نشط' : 'الحساب معطل'}
              />
            </Grid>

            {/* طلب تغيير كلمة المرور */}
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requirePasswordChange || false}
                    onChange={handleSwitchChange('requirePasswordChange')}
                    color="warning"
                  />
                }
                label="طلب تغيير كلمة المرور"
              />
            </Grid>

            {/* إرسال بريد ترحيبي */}
            {!isEdit && (
              <Grid item xs={12} sm={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.notifyByEmail || false}
                      onChange={handleSwitchChange('notifyByEmail')}
                      color="info"
                    />
                  }
                  label="إرسال بريد ترحيبي"
                />
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={!isValid || saving}
        >
          {saving ? 'جاري الحفظ...' : (isEdit ? 'تحديث' : 'إنشاء المستخدم')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserFormDialog;
