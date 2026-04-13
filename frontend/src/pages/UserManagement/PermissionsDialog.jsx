/**
 * PermissionsDialog — حوار إدارة الصلاحيات
 */


import { useState, useEffect, useMemo } from 'react';



// الصلاحيات الافتراضية مجمعة حسب الوحدة
const PERMISSION_GROUPS = {
  'إدارة المستخدمين': [
    { key: 'users.view', label: 'عرض المستخدمين' },
    { key: 'users.create', label: 'إنشاء مستخدم' },
    { key: 'users.edit', label: 'تعديل مستخدم' },
    { key: 'users.delete', label: 'حذف / تعطيل مستخدم' },
    { key: 'users.reset_password', label: 'إعادة تعيين كلمة المرور' },
    { key: 'users.permissions', label: 'إدارة الصلاحيات' },
    { key: 'users.export', label: 'تصدير المستخدمين' },
    { key: 'users.import', label: 'استيراد المستخدمين' },
  ],
  'المالية والمحاسبة': [
    { key: 'finance.view', label: 'عرض البيانات المالية' },
    { key: 'finance.create', label: 'إنشاء سند مالي' },
    { key: 'finance.edit', label: 'تعديل سند مالي' },
    { key: 'finance.delete', label: 'حذف سند مالي' },
    { key: 'finance.reports', label: 'عرض التقارير المالية' },
  ],
  'الموارد البشرية': [
    { key: 'hr.view', label: 'عرض الموظفين' },
    { key: 'hr.create', label: 'إضافة موظف' },
    { key: 'hr.edit', label: 'تعديل بيانات الموظف' },
    { key: 'hr.delete', label: 'حذف موظف' },
    { key: 'hr.attendance', label: 'إدارة الحضور والانصراف' },
    { key: 'hr.payroll', label: 'إدارة الرواتب' },
  ],
  'العيادة والعلاج': [
    { key: 'clinic.view', label: 'عرض الملفات الطبية' },
    { key: 'clinic.create', label: 'إنشاء ملف طبي' },
    { key: 'clinic.edit', label: 'تعديل ملف طبي' },
    { key: 'clinic.sessions', label: 'إدارة الجلسات' },
    { key: 'clinic.reports', label: 'عرض التقارير الطبية' },
  ],
  'التقييم والتعليم': [
    { key: 'education.view', label: 'عرض الطلاب' },
    { key: 'education.assessments', label: 'إدارة التقييمات' },
    { key: 'education.plans', label: 'إدارة الخطط التعليمية' },
    { key: 'education.reports', label: 'عرض التقارير' },
  ],
  'النظام والإعدادات': [
    { key: 'settings.view', label: 'عرض الإعدادات' },
    { key: 'settings.edit', label: 'تعديل الإعدادات' },
    { key: 'settings.branches', label: 'إدارة الفروع' },
    { key: 'settings.audit', label: 'عرض سجل التدقيق' },
    { key: 'settings.backup', label: 'إدارة النسخ الاحتياطية' },
  ],
};

const PermissionsDialog = ({ open, onClose, user, onSave }) => {
  const [customPermissions, setCustomPermissions] = useState([]);
  const [deniedPermissions, setDeniedPermissions] = useState([]);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    if (user) {
      setCustomPermissions(user.customPermissions || []);
      setDeniedPermissions(user.deniedPermissions || []);
    }
  }, [user]);

  const allPermissionKeys = useMemo(() => {
    const keys = [];
    Object.values(PERMISSION_GROUPS).forEach((perms) => {
      perms.forEach((p) => keys.push(p.key));
    });
    return keys;
  }, []);

  const handleToggleCustom = (key) => {
    setCustomPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    // إذا كانت في المرفوض، أزلها
    setDeniedPermissions((prev) => prev.filter((k) => k !== key));
  };

  const handleToggleDenied = (key) => {
    setDeniedPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    // إذا كانت في المسموح، أزلها
    setCustomPermissions((prev) => prev.filter((k) => k !== key));
  };

  const handleAddCustom = () => {
    const key = customInput.trim();
    if (key && !customPermissions.includes(key) && !allPermissionKeys.includes(key)) {
      setCustomPermissions((prev) => [...prev, key]);
      setCustomInput('');
    }
  };

  const handleSave = () => {
    const userId = user?._id || user?.id;
    if (userId) {
      onSave(userId, { customPermissions, deniedPermissions });
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SecurityIcon color="primary" />
        إدارة صلاحيات: {user.fullName || user.username}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            الصلاحيات المخصصة تُضاف فوق صلاحيات الدور الافتراضية.
            الصلاحيات المرفوضة تُلغي حتى صلاحيات الدور.
          </Alert>

          <Grid container spacing={2}>
            {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
              <Grid item xs={12} md={6} key={group}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {group}
                  </Typography>
                  <FormGroup>
                    {perms.map((perm) => {
                      const isCustom = customPermissions.includes(perm.key);
                      const isDenied = deniedPermissions.includes(perm.key);

                      return (
                        <Box
                          key={perm.key}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: 0.25,
                            '&:hover': { bgcolor: 'action.hover', borderRadius: 1 },
                          }}
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={isCustom}
                                onChange={() => handleToggleCustom(perm.key)}
                                size="small"
                                color="success"
                              />
                            }
                            label={
                              <Typography variant="body2" sx={{ fontSize: 13 }}>
                                {perm.label}
                              </Typography>
                            }
                            sx={{ m: 0, flex: 1 }}
                          />
                          <Chip
                            label="رفض"
                            size="small"
                            color={isDenied ? 'error' : 'default'}
                            variant={isDenied ? 'filled' : 'outlined'}
                            onClick={() => handleToggleDenied(perm.key)}
                            sx={{ cursor: 'pointer', fontSize: 11, height: 22 }}
                          />
                        </Box>
                      );
                    })}
                  </FormGroup>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* إضافة صلاحية مخصصة */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            إضافة صلاحية مخصصة
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="مثال: reports.special_export"
              dir="ltr"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              sx={{ flex: 1 }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddCustom}
              disabled={!customInput.trim()}
            >
              إضافة
            </Button>
          </Box>

          {/* عرض الصلاحيات المخصصة الإضافية */}
          {customPermissions.filter((p) => !allPermissionKeys.includes(p)).length > 0 && (
            <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {customPermissions
                .filter((p) => !allPermissionKeys.includes(p))
                .map((p) => (
                  <Chip
                    key={p}
                    label={p}
                    size="small"
                    color="success"
                    variant="outlined"
                    onDelete={() =>
                      setCustomPermissions((prev) => prev.filter((k) => k !== p))
                    }
                  />
                ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            مسموح: {customPermissions.length} | مرفوض: {deniedPermissions.length}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} color="inherit">
          إلغاء
        </Button>
        <Button variant="contained" onClick={handleSave}>
          حفظ الصلاحيات
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PermissionsDialog;
