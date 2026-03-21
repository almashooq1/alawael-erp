/**
 * BrandingSettings — صفحة إعدادات الهوية المؤسسية وتخصيص واجهة المستخدم
 *
 * يتيح للمسؤول:
 * - تعديل اسم النظام والشعار
 * - تخصيص الألوان والخطوط
 * - تعديل تصميم صفحة تسجيل الدخول
 * - إدارة قالب الشريط الجانبي
 * - تعديل تذييل الصفحة
 * - معاينة التغييرات في الوقت الفعلي
 */
import { useState, useCallback, useRef } from 'react';




import { gradients } from 'theme/palette';
import { useSnackbar } from 'contexts/SnackbarContext';
import { useAuth } from 'contexts/AuthContext';
import logger from 'utils/logger';

// =================== تعريف الثيمات المُعدّة مسبقاً ===================
const PRESET_THEMES = [
  {
    id: 'default',
    name: 'الافتراضي',
    nameEn: 'Default',
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#f093fb',
  },
  {
    id: 'ocean',
    name: 'المحيط',
    nameEn: 'Ocean',
    primary: '#0077b6',
    secondary: '#00b4d8',
    accent: '#90e0ef',
  },
  {
    id: 'forest',
    name: 'الغابة',
    nameEn: 'Forest',
    primary: '#2d6a4f',
    secondary: '#40916c',
    accent: '#95d5b2',
  },
  {
    id: 'sunset',
    name: 'الغروب',
    nameEn: 'Sunset',
    primary: '#e63946',
    secondary: '#f77f00',
    accent: '#fcbf49',
  },
  {
    id: 'royal',
    name: 'ملكي',
    nameEn: 'Royal',
    primary: '#7b2cbf',
    secondary: '#9d4edd',
    accent: '#c77dff',
  },
  {
    id: 'midnight',
    name: 'منتصف الليل',
    nameEn: 'Midnight',
    primary: '#1a1a2e',
    secondary: '#16213e',
    accent: '#0f3460',
  },
];

const FONT_OPTIONS = [
  { value: 'Cairo', label: 'Cairo (القاهرة)' },
  { value: 'Tajawal', label: 'Tajawal (تجوال)' },
  { value: 'Amiri', label: 'Amiri (أميري)' },
  { value: 'Noto Sans Arabic', label: 'Noto Sans Arabic' },
  { value: 'IBM Plex Sans Arabic', label: 'IBM Plex Sans Arabic' },
  { value: 'Almarai', label: 'Almarai (المراعي)' },
];

const SIDEBAR_STYLES = [
  { value: 'default', label: 'تقليدي' },
  { value: 'compact', label: 'مضغوط' },
  { value: 'modern', label: 'عصري' },
  { value: 'gradient', label: 'متدرج' },
];

const BORDER_RADIUS_OPTIONS = [
  { value: 4, label: 'حاد' },
  { value: 8, label: 'متوسط' },
  { value: 12, label: 'ناعم' },
  { value: 16, label: 'دائري' },
  { value: 24, label: 'كبسولة' },
];

// =================== المكون الرئيسي ===================
const BrandingSettings = () => {
  const showSnackbar = useSnackbar();
  const { currentUser } = useAuth();
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);
  const loginBgInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // =================== حالة الإعدادات ===================
  const [branding, setBranding] = useState({
    // الهوية الأساسية
    systemName: 'نظام مراكز الأوائل للرعاية النهارية',
    systemNameEn: 'Al-Awael Day Care Centers System',
    shortName: 'الأوائل',
    tagline: 'رعاية متميزة... مستقبل مشرق',
    taglineEn: 'Distinguished Care... Bright Future',
    description: 'نظام إدارة شامل ومتكامل لمراكز الرعاية النهارية',

    // الشعار
    logo: '',
    logoPreview: '/logo.svg',
    favicon: '',
    faviconPreview: '/logo.svg',

    // الألوان
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    accentColor: '#f093fb',
    headerBgColor: '#ffffff',
    sidebarBgColor: '#ffffff',
    footerBgColor: '#f5f5f5',

    // الخطوط
    fontFamily: 'Cairo',
    fontSize: 14,
    headingFontFamily: 'Cairo',

    // التصميم
    borderRadius: 8,
    sidebarStyle: 'default',
    sidebarWidth: 280,
    headerHeight: 64,
    enableAnimations: true,
    enableGlassEffect: true,
    enableShadows: true,
    compactMode: false,

    // صفحة تسجيل الدخول
    loginBgType: 'gradient', // gradient | image | solid
    loginBgColor: '#667eea',
    loginBgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    loginBgImage: '',
    loginCardStyle: 'glass', // glass | solid | minimal
    loginShowLogo: true,
    loginShowTagline: true,

    // التذييل
    footerText: '© {year} نظام مراكز الأوائل للرعاية النهارية - جميع الحقوق محفوظة',
    footerShowSocialLinks: false,
    footerLinks: [],

    // الوضع الداكن
    darkMode: false,
    autoDarkMode: false, // تلقائي حسب وقت الجهاز

    // إضافات احترافية
    enableWatermark: false,
    watermarkText: 'مراكز الأوائل',
    enableCustomCSS: false,
    customCSS: '',
    enableRTL: true,
    showBreadcrumbs: true,
    showSearchBar: true,
    showNotifications: true,
    enableMultiLanguage: true,
    defaultLanguage: 'ar',
  });

  // =================== تحديث الإعدادات ===================
  const updateBranding = useCallback((key, value) => {
    setBranding(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  // =================== رفع الشعار ===================
  const handleLogoUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showSnackbar('حجم الملف يجب ألا يتجاوز 2 ميجابايت', 'error');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showSnackbar('يرجى رفع صورة بتنسيق PNG أو JPG أو SVG أو WebP', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      updateBranding('logo', file);
      updateBranding('logoPreview', reader.result);
    };
    reader.readAsDataURL(file);
  }, [showSnackbar, updateBranding]);

  const handleFaviconUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      updateBranding('favicon', file);
      updateBranding('faviconPreview', reader.result);
    };
    reader.readAsDataURL(file);
  }, [updateBranding]);

  const handleLoginBgUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      updateBranding('loginBgImage', reader.result);
      updateBranding('loginBgType', 'image');
    };
    reader.readAsDataURL(file);
  }, [updateBranding]);

  // =================== حفظ الإعدادات ===================
  const handleSave = async () => {
    setSaving(true);
    try {
      // إنشاء FormData للرفع
      const formData = new FormData();
      Object.entries(branding).forEach(([key, value]) => {
        if (key === 'logo' && value instanceof File) {
          formData.append('logo', value);
        } else if (key === 'favicon' && value instanceof File) {
          formData.append('favicon', value);
        } else if (typeof value !== 'object' || value === null) {
          formData.append(key, value);
        }
      });

      // TODO: استدعاء API الفعلي
      // await brandingService.update(formData);

      // محاكاة الحفظ
      await new Promise(resolve => setTimeout(resolve, 1000));

      // حفظ في localStorage كنسخة احتياطية
      const saveable = { ...branding };
      delete saveable.logo;
      delete saveable.favicon;
      localStorage.setItem('app_branding', JSON.stringify(saveable));

      showSnackbar('تم حفظ إعدادات الهوية المؤسسية بنجاح', 'success');
      setHasChanges(false);
    } catch (err) {
      logger.error('Failed to save branding:', err);
      showSnackbar('فشل حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  // =================== إعادة التعيين ===================
  const handleReset = () => {
    setBranding(prev => ({
      ...prev,
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      accentColor: '#f093fb',
      fontFamily: 'Cairo',
      fontSize: 14,
      borderRadius: 8,
      sidebarStyle: 'default',
      enableAnimations: true,
      enableGlassEffect: true,
      enableShadows: true,
    }));
    showSnackbar('تم إعادة التعيين إلى الإعدادات الافتراضية', 'info');
    setHasChanges(true);
  };

  // =================== تطبيق ثيم معدّ مسبقاً ===================
  const applyPresetTheme = (theme) => {
    updateBranding('primaryColor', theme.primary);
    updateBranding('secondaryColor', theme.secondary);
    updateBranding('accentColor', theme.accent);
    showSnackbar(`تم تطبيق ثيم "${theme.name}"`, 'success');
  };

  // =================== تبويبات المحتوى ===================
  const tabs = [
    { label: 'الهوية الأساسية', icon: <DesignIcon /> },
    { label: 'الشعار والأيقونات', icon: <ImageIcon /> },
    { label: 'الألوان والثيمات', icon: <PaletteIcon /> },
    { label: 'الخطوط والتصميم', icon: <TextFieldsIcon /> },
    { label: 'صفحة الدخول', icon: <DashboardIcon /> },
    { label: 'خيارات متقدمة', icon: <TuneIcon /> },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* =================== الرأس =================== */}
      <Paper
        elevation={0}
        sx={{
          background: gradients.primary,
          borderRadius: 3,
          p: 3,
          mb: 3,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <BrushIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  إعدادات الهوية المؤسسية
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  تخصيص تصميم واجهة المستخدم والشعار والألوان والمزيد
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={() => setPreviewOpen(true)}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              >
                معاينة
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving || !hasChanges}
                sx={{ bgcolor: 'rgba(255,255,255,0.25)', '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' } }}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </Stack>
          </Box>
        </Box>
        {/* خلفية زخرفية */}
        <Box sx={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
        <Box sx={{ position: 'absolute', bottom: -30, left: 40, width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
      </Paper>

      {hasChanges && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} action={
          <Button size="small" color="inherit" onClick={handleReset}>إعادة تعيين</Button>
        }>
          لديك تغييرات غير محفوظة — لا تنسَ الحفظ!
        </Alert>
      )}

      {/* =================== التبويبات =================== */}
      <Paper sx={{ borderRadius: 2, mb: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { minHeight: 56, fontWeight: 600 },
          }}
        >
          {tabs.map((tab, i) => (
            <Tab key={i} label={tab.label} icon={tab.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {/* =================== محتوى التبويبات =================== */}

      {/* === تبويب الهوية الأساسية === */}
      {activeTab === 0 && (
        <Fade in>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="معلومات الهوية" avatar={<DesignIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <Grid container spacing={2.5}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="اسم النظام (عربي)"
                        value={branding.systemName}
                        onChange={(e) => updateBranding('systemName', e.target.value)}
                        helperText="يظهر في الشريط الجانبي وصفحة الدخول"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="اسم النظام (إنجليزي)"
                        value={branding.systemNameEn}
                        onChange={(e) => updateBranding('systemNameEn', e.target.value)}
                        dir="ltr"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="الاسم المختصر"
                        value={branding.shortName}
                        onChange={(e) => updateBranding('shortName', e.target.value)}
                        helperText="يظهر عند تصغير الشريط الجانبي"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="الشعار النصي (Tagline)"
                        value={branding.tagline}
                        onChange={(e) => updateBranding('tagline', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="وصف النظام"
                        value={branding.description}
                        onChange={(e) => updateBranding('description', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="نص التذييل"
                        value={branding.footerText}
                        onChange={(e) => updateBranding('footerText', e.target.value)}
                        helperText="استخدم {year} للسنة الحالية"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>اللغة الافتراضية</InputLabel>
                        <Select
                          value={branding.defaultLanguage}
                          label="اللغة الافتراضية"
                          onChange={(e) => updateBranding('defaultLanguage', e.target.value)}
                        >
                          <MenuItem value="ar">العربية</MenuItem>
                          <MenuItem value="en">English</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="معاينة البطاقة" avatar={<VisibilityIcon color="primary" />} />
                <Divider />
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box
                    component="img"
                    src={branding.logoPreview}
                    alt="Logo"
                    sx={{ width: 80, height: 80, borderRadius: '50%', mb: 2, boxShadow: 3 }}
                  />
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {branding.systemName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {branding.tagline}
                  </Typography>
                  <Chip
                    label={branding.shortName}
                    color="primary"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>
      )}

      {/* === تبويب الشعار والأيقونات === */}
      {activeTab === 1 && (
        <Fade in>
          <Grid container spacing={3}>
            {/* الشعار الرئيسي */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="الشعار الرئيسي" avatar={<ImageIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        <IconButton
                          size="small"
                          sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                          onClick={() => logoInputRef.current?.click()}
                        >
                          <CameraIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <Avatar
                        src={branding.logoPreview}
                        sx={{ width: 120, height: 120, boxShadow: 3, border: '3px solid', borderColor: 'primary.main' }}
                      />
                    </Badge>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      hidden
                      onChange={handleLogoUpload}
                    />
                  </Box>
                  <Stack spacing={1.5}>
                    <Button
                      variant="outlined"
                      startIcon={<UploadIcon />}
                      onClick={() => logoInputRef.current?.click()}
                      fullWidth
                    >
                      رفع شعار جديد
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => {
                        updateBranding('logo', '');
                        updateBranding('logoPreview', '/logo.svg');
                      }}
                      fullWidth
                    >
                      إعادة الشعار الافتراضي
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                      يقبل: PNG, JPG, SVG, WebP — بحد أقصى 2 ميجابايت
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* أيقونة الموقع (Favicon) */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="أيقونة الموقع (Favicon)" avatar={<WallpaperIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        <IconButton
                          size="small"
                          sx={{ bgcolor: 'secondary.main', color: 'white', '&:hover': { bgcolor: 'secondary.dark' } }}
                          onClick={() => faviconInputRef.current?.click()}
                        >
                          <CameraIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <Avatar
                        src={branding.faviconPreview}
                        sx={{ width: 80, height: 80, boxShadow: 2, border: '2px solid', borderColor: 'secondary.main' }}
                      />
                    </Badge>
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/png,image/svg+xml,image/x-icon"
                      hidden
                      onChange={handleFaviconUpload}
                    />
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => faviconInputRef.current?.click()}
                    fullWidth
                  >
                    رفع أيقونة
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                    يُفضّل حجم 32×32 أو 64×64 بكسل
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* معاينة الشعار في السياق */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="معاينة الشعار في واجهة النظام" avatar={<PreviewIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <Grid container spacing={3}>
                    {/* معاينة: الشريط الجانبي */}
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                        الشريط الجانبي
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderRadius: 2 }}
                      >
                        <Avatar src={branding.logoPreview} sx={{ width: 36, height: 36 }} />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700} noWrap>
                            {branding.shortName || 'مراكز الأوائل'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            للرعاية النهارية
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                    {/* معاينة: صفحة الدخول */}
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                        صفحة تسجيل الدخول
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 3,
                          textAlign: 'center',
                          borderRadius: 2,
                          background: branding.loginBgType === 'gradient'
                            ? branding.loginBgGradient
                            : branding.loginBgColor,
                        }}
                      >
                        <Avatar
                          src={branding.logoPreview}
                          sx={{ width: 48, height: 48, mx: 'auto', mb: 1, boxShadow: 2 }}
                        />
                        <Typography variant="subtitle2" sx={{ color: 'white' }} fontWeight={700}>
                          {branding.systemName}
                        </Typography>
                      </Paper>
                    </Grid>
                    {/* معاينة: الشريط الجانبي مصغر */}
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                        الشريط الجانبي (مصغّر)
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{ p: 2, display: 'flex', justifyContent: 'center', borderRadius: 2 }}
                      >
                        <Avatar src={branding.logoPreview} sx={{ width: 36, height: 36 }} />
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>
      )}

      {/* === تبويب الألوان والثيمات === */}
      {activeTab === 2 && (
        <Fade in>
          <Grid container spacing={3}>
            {/* ثيمات معدة مسبقاً */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader
                  title="ثيمات جاهزة"
                  subheader="اختر ثيم أو خصص الألوان يدوياً"
                  avatar={<AutoAwesomeIcon color="primary" />}
                />
                <Divider />
                <CardContent>
                  <Grid container spacing={2}>
                    {PRESET_THEMES.map((theme) => (
                      <Grid item xs={6} sm={4} md={2} key={theme.id}>
                        <Paper
                          onClick={() => applyPresetTheme(theme)}
                          sx={{
                            p: 2,
                            textAlign: 'center',
                            cursor: 'pointer',
                            borderRadius: 2,
                            border: branding.primaryColor === theme.primary ? '2px solid' : '1px solid',
                            borderColor: branding.primaryColor === theme.primary ? 'primary.main' : 'divider',
                            transition: 'all 0.2s',
                            '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                            position: 'relative',
                          }}
                        >
                          {branding.primaryColor === theme.primary && (
                            <CheckIcon
                              sx={{ position: 'absolute', top: 4, right: 4, fontSize: 18, color: 'primary.main' }}
                            />
                          )}
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mb: 1 }}>
                            <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: theme.primary }} />
                            <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: theme.secondary }} />
                            <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: theme.accent }} />
                          </Box>
                          <Typography variant="caption" fontWeight={600}>{theme.name}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* الألوان المخصصة */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="ألوان مخصصة" avatar={<ColorLensIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <Grid container spacing={2.5}>
                    {[
                      { key: 'primaryColor', label: 'اللون الأساسي' },
                      { key: 'secondaryColor', label: 'اللون الثانوي' },
                      { key: 'accentColor', label: 'لون التمييز' },
                      { key: 'headerBgColor', label: 'خلفية الرأس' },
                      { key: 'sidebarBgColor', label: 'خلفية الشريط الجانبي' },
                      { key: 'footerBgColor', label: 'خلفية التذييل' },
                    ].map(({ key, label }) => (
                      <Grid item xs={12} sm={6} key={key}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            component="input"
                            type="color"
                            value={branding[key]}
                            onChange={(e) => updateBranding(key, e.target.value)}
                            sx={{
                              width: 40,
                              height: 40,
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              p: 0,
                              '&::-webkit-color-swatch': { borderRadius: '6px', border: '1px solid #ddd' },
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600}>{label}</Typography>
                            <Typography variant="caption" color="text.secondary">{branding[key]}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* معاينة الألوان */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="معاينة الألوان" avatar={<VisibilityIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <Box
                    sx={{
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {/* رأس المعاينة */}
                    <Box
                      sx={{
                        background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
                        p: 2,
                        color: 'white',
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={700}>
                        {branding.systemName}
                      </Typography>
                      <Typography variant="caption">{branding.tagline}</Typography>
                    </Box>
                    {/* محتوى المعاينة */}
                    <Box sx={{ p: 2, bgcolor: branding.headerBgColor }}>
                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <Button variant="contained" size="small" sx={{ bgcolor: branding.primaryColor }}>
                          زر رئيسي
                        </Button>
                        <Button variant="outlined" size="small" sx={{ color: branding.secondaryColor, borderColor: branding.secondaryColor }}>
                          زر ثانوي
                        </Button>
                        <Chip label="شارة" size="small" sx={{ bgcolor: branding.accentColor, color: 'white' }} />
                      </Stack>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          هذه معاينة كيف ستبدو الألوان في الواجهة الفعلية
                        </Typography>
                      </Paper>
                    </Box>
                    {/* تذييل المعاينة */}
                    <Box sx={{ bgcolor: branding.footerBgColor, p: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {branding.footerText.replace('{year}', new Date().getFullYear())}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>
      )}

      {/* === تبويب الخطوط والتصميم === */}
      {activeTab === 3 && (
        <Fade in>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="الخطوط" avatar={<FontSizeIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>خط النصوص الأساسي</InputLabel>
                        <Select
                          value={branding.fontFamily}
                          label="خط النصوص الأساسي"
                          onChange={(e) => updateBranding('fontFamily', e.target.value)}
                        >
                          {FONT_OPTIONS.map(f => (
                            <MenuItem key={f.value} value={f.value} sx={{ fontFamily: f.value }}>
                              {f.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>خط العناوين</InputLabel>
                        <Select
                          value={branding.headingFontFamily}
                          label="خط العناوين"
                          onChange={(e) => updateBranding('headingFontFamily', e.target.value)}
                        >
                          {FONT_OPTIONS.map(f => (
                            <MenuItem key={f.value} value={f.value} sx={{ fontFamily: f.value }}>
                              {f.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" gutterBottom fontWeight={600}>
                        حجم الخط الأساسي: {branding.fontSize}px
                      </Typography>
                      <Slider
                        value={branding.fontSize}
                        onChange={(_, v) => updateBranding('fontSize', v)}
                        min={12}
                        max={18}
                        step={1}
                        marks
                        valueLabelDisplay="auto"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="شكل العناصر" avatar={<RadiusIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <Typography variant="body2" gutterBottom fontWeight={600}>
                    انحناء الزوايا (Border Radius)
                  </Typography>
                  <Grid container spacing={1.5} sx={{ mb: 3 }}>
                    {BORDER_RADIUS_OPTIONS.map((opt) => (
                      <Grid item key={opt.value}>
                        <Paper
                          onClick={() => updateBranding('borderRadius', opt.value)}
                          sx={{
                            px: 2,
                            py: 1,
                            cursor: 'pointer',
                            borderRadius: `${opt.value}px`,
                            border: branding.borderRadius === opt.value ? '2px solid' : '1px solid',
                            borderColor: branding.borderRadius === opt.value ? 'primary.main' : 'divider',
                            transition: 'all 0.2s',
                            '&:hover': { borderColor: 'primary.main' },
                          }}
                        >
                          <Typography variant="caption" fontWeight={600}>{opt.label}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" gutterBottom fontWeight={600}>
                    نمط الشريط الجانبي
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <Select
                      value={branding.sidebarStyle}
                      onChange={(e) => updateBranding('sidebarStyle', e.target.value)}
                    >
                      {SIDEBAR_STYLES.map(s => (
                        <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography variant="body2" gutterBottom fontWeight={600}>
                    عرض الشريط الجانبي: {branding.sidebarWidth}px
                  </Typography>
                  <Slider
                    value={branding.sidebarWidth}
                    onChange={(_, v) => updateBranding('sidebarWidth', v)}
                    min={220}
                    max={360}
                    step={10}
                    valueLabelDisplay="auto"
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* تأثيرات بصرية */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="التأثيرات البصرية" avatar={<GradientIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <Grid container spacing={2}>
                    {[
                      { key: 'enableAnimations', label: 'تفعيل الحركات والانتقالات', desc: 'تأثيرات حركية عند التنقل وفتح القوائم' },
                      { key: 'enableGlassEffect', label: 'تأثير الزجاج (Glassmorphism)', desc: 'تأثير شفافية على البطاقات والقوائم' },
                      { key: 'enableShadows', label: 'الظلال', desc: 'ظلال خفيفة حول البطاقات والأزرار' },
                      { key: 'compactMode', label: 'الوضع المضغوط', desc: 'تقليل المسافات لعرض محتوى أكثر' },
                      { key: 'showBreadcrumbs', label: 'مسار التنقل (Breadcrumbs)', desc: 'إظهار مسار الصفحة الحالية' },
                      { key: 'showSearchBar', label: 'شريط البحث', desc: 'إظهار شريط البحث في الرأس' },
                    ].map(({ key, label, desc }) => (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={branding[key]}
                                onChange={(e) => updateBranding(key, e.target.checked)}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{label}</Typography>
                                <Typography variant="caption" color="text.secondary">{desc}</Typography>
                              </Box>
                            }
                            sx={{ m: 0, alignItems: 'flex-start' }}
                          />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>
      )}

      {/* === تبويب صفحة الدخول === */}
      {activeTab === 4 && (
        <Fade in>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="تخصيص صفحة تسجيل الدخول" avatar={<DashboardIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                      <Typography variant="body2" gutterBottom fontWeight={600}>
                        نوع الخلفية
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {[
                          { value: 'gradient', label: 'تدرج لوني', icon: <GradientIcon /> },
                          { value: 'solid', label: 'لون واحد', icon: <ColorFillIcon /> },
                          { value: 'image', label: 'صورة', icon: <ImageIcon /> },
                        ].map((opt) => (
                          <Paper
                            key={opt.value}
                            onClick={() => updateBranding('loginBgType', opt.value)}
                            sx={{
                              p: 1.5,
                              px: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              cursor: 'pointer',
                              borderRadius: 2,
                              border: branding.loginBgType === opt.value ? '2px solid' : '1px solid',
                              borderColor: branding.loginBgType === opt.value ? 'primary.main' : 'divider',
                              flex: 1,
                              justifyContent: 'center',
                            }}
                          >
                            {opt.icon}
                            <Typography variant="body2" fontWeight={600}>{opt.label}</Typography>
                          </Paper>
                        ))}
                      </Stack>
                    </Grid>

                    {branding.loginBgType === 'solid' && (
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            component="input"
                            type="color"
                            value={branding.loginBgColor}
                            onChange={(e) => updateBranding('loginBgColor', e.target.value)}
                            sx={{ width: 50, height: 40, border: 'none', cursor: 'pointer' }}
                          />
                          <TextField
                            value={branding.loginBgColor}
                            onChange={(e) => updateBranding('loginBgColor', e.target.value)}
                            size="small"
                            label="لون الخلفية"
                          />
                        </Box>
                      </Grid>
                    )}

                    {branding.loginBgType === 'image' && (
                      <Grid item xs={12}>
                        <Button
                          variant="outlined"
                          startIcon={<UploadIcon />}
                          onClick={() => loginBgInputRef.current?.click()}
                          fullWidth
                        >
                          رفع صورة خلفية
                        </Button>
                        <input
                          ref={loginBgInputRef}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handleLoginBgUpload}
                        />
                      </Grid>
                    )}

                    <Grid item xs={12}>
                      <Typography variant="body2" gutterBottom fontWeight={600}>
                        نمط بطاقة تسجيل الدخول
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {[
                          { value: 'glass', label: 'زجاجي' },
                          { value: 'solid', label: 'ثابت' },
                          { value: 'minimal', label: 'بسيط' },
                        ].map((opt) => (
                          <Paper
                            key={opt.value}
                            onClick={() => updateBranding('loginCardStyle', opt.value)}
                            sx={{
                              p: 1.5,
                              px: 2,
                              cursor: 'pointer',
                              borderRadius: 2,
                              border: branding.loginCardStyle === opt.value ? '2px solid' : '1px solid',
                              borderColor: branding.loginCardStyle === opt.value ? 'primary.main' : 'divider',
                              flex: 1,
                              textAlign: 'center',
                            }}
                          >
                            <Typography variant="body2" fontWeight={600}>{opt.label}</Typography>
                          </Paper>
                        ))}
                      </Stack>
                    </Grid>

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={branding.loginShowLogo}
                            onChange={(e) => updateBranding('loginShowLogo', e.target.checked)}
                          />
                        }
                        label="إظهار الشعار في صفحة الدخول"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={branding.loginShowTagline}
                            onChange={(e) => updateBranding('loginShowTagline', e.target.checked)}
                          />
                        }
                        label="إظهار الشعار النصي"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* معاينة صفحة الدخول */}
            <Grid item xs={12} md={5}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="معاينة" avatar={<PreviewIcon color="primary" />} />
                <Divider />
                <CardContent sx={{ p: 0 }}>
                  <Box
                    sx={{
                      background: branding.loginBgType === 'gradient'
                        ? branding.loginBgGradient
                        : branding.loginBgType === 'image'
                          ? `url(${branding.loginBgImage}) center/cover`
                          : branding.loginBgColor,
                      p: 3,
                      minHeight: 320,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '0 0 8px 8px',
                    }}
                  >
                    <Paper
                      elevation={branding.loginCardStyle === 'minimal' ? 0 : 6}
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        width: '100%',
                        maxWidth: 280,
                        textAlign: 'center',
                        backdropFilter: branding.loginCardStyle === 'glass' ? 'blur(10px)' : 'none',
                        bgcolor: branding.loginCardStyle === 'glass'
                          ? 'rgba(255,255,255,0.85)'
                          : 'background.paper',
                      }}
                    >
                      {branding.loginShowLogo && (
                        <Avatar
                          src={branding.logoPreview}
                          sx={{ width: 56, height: 56, mx: 'auto', mb: 1.5, boxShadow: 2 }}
                        />
                      )}
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        {branding.systemName}
                      </Typography>
                      {branding.loginShowTagline && (
                        <Typography variant="caption" color="text.secondary">
                          {branding.tagline}
                        </Typography>
                      )}
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ bgcolor: 'grey.100', height: 36, borderRadius: 1, mb: 1.5 }} />
                        <Box sx={{ bgcolor: 'grey.100', height: 36, borderRadius: 1, mb: 2 }} />
                        <Box
                          sx={{
                            bgcolor: branding.primaryColor,
                            height: 36,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'white' }} fontWeight={600}>
                            تسجيل الدخول
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>
      )}

      {/* === تبويب الخيارات المتقدمة === */}
      {activeTab === 5 && (
        <Fade in>
          <Grid container spacing={3}>
            {/* الوضع الداكن */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader
                  title="الوضع الداكن"
                  avatar={<DarkModeIcon color="primary" />}
                />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={branding.darkMode}
                          onChange={(e) => updateBranding('darkMode', e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>تفعيل الوضع الداكن</Typography>
                          <Typography variant="caption" color="text.secondary">
                            تغيير مظهر النظام للوضع الداكن
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={branding.autoDarkMode}
                          onChange={(e) => updateBranding('autoDarkMode', e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>التبديل التلقائي</Typography>
                          <Typography variant="caption" color="text.secondary">
                            التبديل تلقائياً حسب إعدادات الجهاز
                          </Typography>
                        </Box>
                      }
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* علامة مائية */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="علامة مائية" avatar={<WallpaperIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={branding.enableWatermark}
                        onChange={(e) => updateBranding('enableWatermark', e.target.checked)}
                      />
                    }
                    label="تفعيل العلامة المائية على المستندات"
                  />
                  <Collapse in={branding.enableWatermark}>
                    <TextField
                      fullWidth
                      label="نص العلامة المائية"
                      value={branding.watermarkText}
                      onChange={(e) => updateBranding('watermarkText', e.target.value)}
                      sx={{ mt: 2 }}
                    />
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>

            {/* RTL والتدويل */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="الاتجاه والتدويل" avatar={<SettingsIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={branding.enableRTL}
                          onChange={(e) => updateBranding('enableRTL', e.target.checked)}
                        />
                      }
                      label="دعم RTL (من اليمين لليسار)"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={branding.enableMultiLanguage}
                          onChange={(e) => updateBranding('enableMultiLanguage', e.target.checked)}
                        />
                      }
                      label="دعم تعدد اللغات"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={branding.showNotifications}
                          onChange={(e) => updateBranding('showNotifications', e.target.checked)}
                        />
                      }
                      label="إظهار لوحة الإشعارات"
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* CSS مخصص */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title="تنسيق CSS مخصص" avatar={<BrushIcon color="primary" />} />
                <Divider />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={branding.enableCustomCSS}
                        onChange={(e) => updateBranding('enableCustomCSS', e.target.checked)}
                      />
                    }
                    label="تفعيل CSS مخصص (للمتقدمين)"
                  />
                  <Collapse in={branding.enableCustomCSS}>
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      value={branding.customCSS}
                      onChange={(e) => updateBranding('customCSS', e.target.value)}
                      placeholder={`/* أضف تنسيقاتك المخصصة هنا */\n.MuiCard-root {\n  border-radius: 16px;\n}`}
                      sx={{
                        mt: 2,
                        '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 13, direction: 'ltr' },
                      }}
                    />
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>

            {/* أزرار الإجراءات */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                      sx={{ px: 4 }}
                    >
                      حفظ جميع الإعدادات
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<RefreshIcon />}
                      onClick={handleReset}
                    >
                      إعادة تعيين الافتراضي
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<PreviewIcon />}
                      onClick={() => setPreviewOpen(true)}
                    >
                      معاينة كاملة
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Fade>
      )}

      {/* =================== نافذة المعاينة الكاملة =================== */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>معاينة الهوية المؤسسية</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* الرأس */}
            <Box
              sx={{
                background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
                p: 2,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Avatar src={branding.logoPreview} sx={{ width: 40, height: 40 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>{branding.systemName}</Typography>
                <Typography variant="caption">{branding.tagline}</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', minHeight: 300 }}>
              {/* الشريط الجانبي */}
              <Box
                sx={{
                  width: 200,
                  bgcolor: branding.sidebarBgColor,
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                  p: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Avatar src={branding.logoPreview} sx={{ width: 28, height: 28 }} />
                  <Typography variant="caption" fontWeight={700}>{branding.shortName}</Typography>
                </Box>
                {['الرئيسية', 'لوحة التحكم', 'المستفيدين', 'الجلسات', 'التقارير'].map((item, i) => (
                  <Box key={i} sx={{ py: 0.8, px: 1, borderRadius: 1, bgcolor: i === 0 ? `${branding.primaryColor}15` : 'transparent', mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={i === 0 ? 700 : 400} color={i === 0 ? branding.primaryColor : 'text.secondary'}>
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* المحتوى */}
              <Box sx={{ flex: 1, p: 2, bgcolor: branding.headerBgColor }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  لوحة التحكم
                </Typography>
                <Grid container spacing={1.5}>
                  {[
                    { label: 'المستفيدين', value: '148', color: branding.primaryColor },
                    { label: 'الجلسات اليوم', value: '23', color: branding.secondaryColor },
                    { label: 'الموظفين', value: '34', color: branding.accentColor },
                  ].map((stat, i) => (
                    <Grid item xs={4} key={i}>
                      <Paper
                        sx={{
                          p: 1.5,
                          textAlign: 'center',
                          borderRadius: `${branding.borderRadius}px`,
                          borderTop: `3px solid ${stat.color}`,
                        }}
                        variant="outlined"
                      >
                        <Typography variant="h6" fontWeight={700} sx={{ color: stat.color }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="caption">{stat.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>

            {/* التذييل */}
            <Box sx={{ bgcolor: branding.footerBgColor, p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {branding.footerText.replace('{year}', new Date().getFullYear())}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BrandingSettings;
