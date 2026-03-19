import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  MenuItem,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Save as SaveIcon,
  Restore as RestoreIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const Settings = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    companyName: '',
    companyNameEn: '',
    taxNumber: '',
    commercialRegister: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    fiscalYearStart: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    fiscalYearEnd: format(new Date(new Date().getFullYear(), 11, 31), 'yyyy-MM-dd'),
  });

  // Accounting Settings
  const [accountingSettings, setAccountingSettings] = useState({
    currency: 'SAR',
    currencySymbol: 'ر.س',
    decimalPlaces: 2,
    dateFormat: 'dd/MM/yyyy',
    fiscalYearStartMonth: 1,
    autoPostingEnabled: false,
    allowNegativeInventory: false,
    requireApprovalForExpenses: true,
    expenseApprovalLimit: 5000,
  });

  // VAT Settings
  const [vatSettings, setVatSettings] = useState({
    vatEnabled: true,
    vatRate: 15,
    vatNumber: '',
    vatStartDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Default Accounts
  const [defaultAccounts, setDefaultAccounts] = useState({
    cashAccount: '',
    bankAccount: '',
    salesAccount: '',
    purchasesAccount: '',
    vatPayableAccount: '',
    vatReceivableAccount: '',
    accountsReceivableAccount: '',
    accountsPayableAccount: '',
  });

  // Invoice Settings
  const [invoiceSettings, setInvoiceSettings] = useState({
    invoicePrefix: 'INV',
    invoiceStartNumber: 1001,
    quotationPrefix: 'QUO',
    quotationStartNumber: 1001,
    invoiceTerms: 'الدفع خلال 30 يوم من تاريخ الفاتورة',
    invoiceFooter: 'شكراً لتعاملكم معنا',
    includeQRCode: true,
    autoSendInvoices: false,
  });

  // Email Settings
  const [emailSettings, setEmailSettings] = useState({
    emailEnabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
    useSSL: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/accounting/settings');
      const settings = response.data.data;

      if (settings) {
        setGeneralSettings(settings.general || generalSettings);
        setAccountingSettings(settings.accounting || accountingSettings);
        setVatSettings(settings.vat || vatSettings);
        setDefaultAccounts(settings.defaultAccounts || defaultAccounts);
        setInvoiceSettings(settings.invoice || invoiceSettings);
        setEmailSettings(settings.email || emailSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setSaveSuccess(false);

      const settingsData = {
        general: generalSettings,
        accounting: accountingSettings,
        vat: vatSettings,
        defaultAccounts: defaultAccounts,
        invoice: invoiceSettings,
        email: emailSettings,
      };

      await axios.put('http://localhost:3001/api/accounting/settings', settingsData);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('هل أنت متأكد من إعادة تعيين الإعدادات إلى القيم الافتراضية؟')) {
      fetchSettings();
    }
  };

  const renderGeneralSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          معلومات الشركة
        </Typography>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="اسم الشركة (عربي)"
          value={generalSettings.companyName}
          onChange={(e) =>
            setGeneralSettings({ ...generalSettings, companyName: e.target.value })
          }
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="اسم الشركة (إنجليزي)"
          value={generalSettings.companyNameEn}
          onChange={(e) =>
            setGeneralSettings({ ...generalSettings, companyNameEn: e.target.value })
          }
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="الرقم الضريبي"
          value={generalSettings.taxNumber}
          onChange={(e) =>
            setGeneralSettings({ ...generalSettings, taxNumber: e.target.value })
          }
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="السجل التجاري"
          value={generalSettings.commercialRegister}
          onChange={(e) =>
            setGeneralSettings({ ...generalSettings, commercialRegister: e.target.value })
          }
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="العنوان"
          multiline
          rows={2}
          value={generalSettings.address}
          onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="رقم الهاتف"
          value={generalSettings.phone}
          onChange={(e) => setGeneralSettings({ ...generalSettings, phone: e.target.value })}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="البريد الإلكتروني"
          type="email"
          value={generalSettings.email}
          onChange={(e) => setGeneralSettings({ ...generalSettings, email: e.target.value })}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="الموقع الإلكتروني"
          value={generalSettings.website}
          onChange={(e) => setGeneralSettings({ ...generalSettings, website: e.target.value })}
        />
      </Grid>

      <Grid item xs={12}>
        <Divider sx={{ my: 2 }}>السنة المالية</Divider>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="date"
          label="بداية السنة المالية"
          value={generalSettings.fiscalYearStart}
          onChange={(e) =>
            setGeneralSettings({ ...generalSettings, fiscalYearStart: e.target.value })
          }
          InputLabelProps={{ shrink: true }}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="date"
          label="نهاية السنة المالية"
          value={generalSettings.fiscalYearEnd}
          onChange={(e) =>
            setGeneralSettings({ ...generalSettings, fiscalYearEnd: e.target.value })
          }
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
    </Grid>
  );

  const renderAccountingSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          الإعدادات المحاسبية
        </Typography>
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          select
          fullWidth
          label="العملة"
          value={accountingSettings.currency}
          onChange={(e) =>
            setAccountingSettings({ ...accountingSettings, currency: e.target.value })
          }
        >
          <MenuItem value="SAR">ريال سعودي (SAR)</MenuItem>
          <MenuItem value="USD">دولار أمريكي (USD)</MenuItem>
          <MenuItem value="EUR">يورو (EUR)</MenuItem>
          <MenuItem value="AED">درهم إماراتي (AED)</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="رمز العملة"
          value={accountingSettings.currencySymbol}
          onChange={(e) =>
            setAccountingSettings({ ...accountingSettings, currencySymbol: e.target.value })
          }
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          select
          fullWidth
          label="عدد المنازل العشرية"
          value={accountingSettings.decimalPlaces}
          onChange={(e) =>
            setAccountingSettings({ ...accountingSettings, decimalPlaces: parseInt(e.target.value) })
          }
        >
          <MenuItem value={0}>0</MenuItem>
          <MenuItem value={2}>2</MenuItem>
          <MenuItem value={3}>3</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          select
          fullWidth
          label="تنسيق التاريخ"
          value={accountingSettings.dateFormat}
          onChange={(e) =>
            setAccountingSettings({ ...accountingSettings, dateFormat: e.target.value })
          }
        >
          <MenuItem value="dd/MM/yyyy">يوم/شهر/سنة</MenuItem>
          <MenuItem value="MM/dd/yyyy">شهر/يوم/سنة</MenuItem>
          <MenuItem value="yyyy-MM-dd">سنة-شهر-يوم</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          select
          fullWidth
          label="بداية السنة المالية (الشهر)"
          value={accountingSettings.fiscalYearStartMonth}
          onChange={(e) =>
            setAccountingSettings({
              ...accountingSettings,
              fiscalYearStartMonth: parseInt(e.target.value),
            })
          }
        >
          <MenuItem value={1}>يناير</MenuItem>
          <MenuItem value={2}>فبراير</MenuItem>
          <MenuItem value={3}>مارس</MenuItem>
          <MenuItem value={4}>أبريل</MenuItem>
          <MenuItem value={5}>مايو</MenuItem>
          <MenuItem value={6}>يونيو</MenuItem>
          <MenuItem value={7}>يوليو</MenuItem>
          <MenuItem value={8}>أغسطس</MenuItem>
          <MenuItem value={9}>سبتمبر</MenuItem>
          <MenuItem value={10}>أكتوبر</MenuItem>
          <MenuItem value={11}>نوفمبر</MenuItem>
          <MenuItem value={12}>ديسمبر</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12}>
        <Divider sx={{ my: 2 }}>الخيارات</Divider>
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={accountingSettings.autoPostingEnabled}
              onChange={(e) =>
                setAccountingSettings({
                  ...accountingSettings,
                  autoPostingEnabled: e.target.checked,
                })
              }
            />
          }
          label="ترحيل تلقائي للقيود"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={accountingSettings.allowNegativeInventory}
              onChange={(e) =>
                setAccountingSettings({
                  ...accountingSettings,
                  allowNegativeInventory: e.target.checked,
                })
              }
            />
          }
          label="السماح بالمخزون السالب"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={accountingSettings.requireApprovalForExpenses}
              onChange={(e) =>
                setAccountingSettings({
                  ...accountingSettings,
                  requireApprovalForExpenses: e.target.checked,
                })
              }
            />
          }
          label="يتطلب موافقة على المصروفات"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="حد الموافقة على المصروفات"
          value={accountingSettings.expenseApprovalLimit}
          onChange={(e) =>
            setAccountingSettings({
              ...accountingSettings,
              expenseApprovalLimit: parseFloat(e.target.value),
            })
          }
          inputProps={{ min: 0 }}
          helperText="المصروفات التي تتجاوز هذا المبلغ تحتاج موافقة"
        />
      </Grid>
    </Grid>
  );

  const renderVATSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          إعدادات ضريبة القيمة المضافة
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={vatSettings.vatEnabled}
              onChange={(e) => setVatSettings({ ...vatSettings, vatEnabled: e.target.checked })}
            />
          }
          label="تفعيل ضريبة القيمة المضافة"
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="number"
          label="نسبة الضريبة (%)"
          value={vatSettings.vatRate}
          onChange={(e) =>
            setVatSettings({ ...vatSettings, vatRate: parseFloat(e.target.value) })
          }
          inputProps={{ min: 0, max: 100, step: 0.1 }}
          disabled={!vatSettings.vatEnabled}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="الرقم الضريبي"
          value={vatSettings.vatNumber}
          onChange={(e) => setVatSettings({ ...vatSettings, vatNumber: e.target.value })}
          disabled={!vatSettings.vatEnabled}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="date"
          label="تاريخ بدء الضريبة"
          value={vatSettings.vatStartDate}
          onChange={(e) => setVatSettings({ ...vatSettings, vatStartDate: e.target.value })}
          InputLabelProps={{ shrink: true }}
          disabled={!vatSettings.vatEnabled}
        />
      </Grid>

      {vatSettings.vatEnabled && (
        <Grid item xs={12}>
          <Alert severity="info">
            سيتم تطبيق ضريبة القيمة المضافة بنسبة {vatSettings.vatRate}% على جميع الفواتير
            والمبيعات بدءاً من {format(new Date(vatSettings.vatStartDate), 'dd/MM/yyyy')}.
          </Alert>
        </Grid>
      )}
    </Grid>
  );

  const renderDefaultAccounts = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          الحسابات الافتراضية
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          حدد الحسابات الافتراضية التي سيتم استخدامها في العمليات المحاسبية التلقائية
        </Typography>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="حساب الصندوق"
          value={defaultAccounts.cashAccount}
          onChange={(e) =>
            setDefaultAccounts({ ...defaultAccounts, cashAccount: e.target.value })
          }
          placeholder="مثال: 1010 - الصندوق"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="حساب البنك"
          value={defaultAccounts.bankAccount}
          onChange={(e) =>
            setDefaultAccounts({ ...defaultAccounts, bankAccount: e.target.value })
          }
          placeholder="مثال: 1020 - البنك"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="حساب المبيعات"
          value={defaultAccounts.salesAccount}
          onChange={(e) =>
            setDefaultAccounts({ ...defaultAccounts, salesAccount: e.target.value })
          }
          placeholder="مثال: 4010 - إيرادات المبيعات"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="حساب المشتريات"
          value={defaultAccounts.purchasesAccount}
          onChange={(e) =>
            setDefaultAccounts({ ...defaultAccounts, purchasesAccount: e.target.value })
          }
          placeholder="مثال: 5010 - المشتريات"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="حساب ضريبة المبيعات المستحقة"
          value={defaultAccounts.vatPayableAccount}
          onChange={(e) =>
            setDefaultAccounts({ ...defaultAccounts, vatPayableAccount: e.target.value })
          }
          placeholder="مثال: 2030 - ضريبة المبيعات المستحقة"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="حساب ضريبة المشتريات القابلة للاسترداد"
          value={defaultAccounts.vatReceivableAccount}
          onChange={(e) =>
            setDefaultAccounts({ ...defaultAccounts, vatReceivableAccount: e.target.value })
          }
          placeholder="مثال: 1050 - ضريبة المشتريات"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="حساب العملاء (المدينون)"
          value={defaultAccounts.accountsReceivableAccount}
          onChange={(e) =>
            setDefaultAccounts({ ...defaultAccounts, accountsReceivableAccount: e.target.value })
          }
          placeholder="مثال: 1030 - العملاء"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="حساب الموردين (الدائنون)"
          value={defaultAccounts.accountsPayableAccount}
          onChange={(e) =>
            setDefaultAccounts({ ...defaultAccounts, accountsPayableAccount: e.target.value })
          }
          placeholder="مثال: 2020 - الموردون"
        />
      </Grid>
    </Grid>
  );

  const renderInvoiceSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          إعدادات الفواتير
        </Typography>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="بادئة رقم الفاتورة"
          value={invoiceSettings.invoicePrefix}
          onChange={(e) =>
            setInvoiceSettings({ ...invoiceSettings, invoicePrefix: e.target.value })
          }
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="الرقم الابتدائي للفاتورة"
          value={invoiceSettings.invoiceStartNumber}
          onChange={(e) =>
            setInvoiceSettings({ ...invoiceSettings, invoiceStartNumber: parseInt(e.target.value) })
          }
          inputProps={{ min: 1 }}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="بادئة رقم عرض السعر"
          value={invoiceSettings.quotationPrefix}
          onChange={(e) =>
            setInvoiceSettings({ ...invoiceSettings, quotationPrefix: e.target.value })
          }
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="الرقم الابتدائي لعرض السعر"
          value={invoiceSettings.quotationStartNumber}
          onChange={(e) =>
            setInvoiceSettings({
              ...invoiceSettings,
              quotationStartNumber: parseInt(e.target.value),
            })
          }
          inputProps={{ min: 1 }}
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="شروط الدفع الافتراضية"
          multiline
          rows={2}
          value={invoiceSettings.invoiceTerms}
          onChange={(e) =>
            setInvoiceSettings({ ...invoiceSettings, invoiceTerms: e.target.value })
          }
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="تذييل الفاتورة"
          multiline
          rows={2}
          value={invoiceSettings.invoiceFooter}
          onChange={(e) =>
            setInvoiceSettings({ ...invoiceSettings, invoiceFooter: e.target.value })
          }
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={invoiceSettings.includeQRCode}
              onChange={(e) =>
                setInvoiceSettings({ ...invoiceSettings, includeQRCode: e.target.checked })
              }
            />
          }
          label="تضمين رمز QR في الفاتورة"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={invoiceSettings.autoSendInvoices}
              onChange={(e) =>
                setInvoiceSettings({ ...invoiceSettings, autoSendInvoices: e.target.checked })
              }
            />
          }
          label="إرسال الفواتير تلقائياً بالبريد"
        />
      </Grid>
    </Grid>
  );

  const renderEmailSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          إعدادات البريد الإلكتروني
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={emailSettings.emailEnabled}
              onChange={(e) => setEmailSettings({ ...emailSettings, emailEnabled: e.target.checked })}
            />
          }
          label="تفعيل إرسال البريد الإلكتروني"
        />
      </Grid>

      <Grid item xs={12} md={8}>
        <TextField
          fullWidth
          label="خادم SMTP"
          value={emailSettings.smtpHost}
          onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
          disabled={!emailSettings.emailEnabled}
          placeholder="smtp.gmail.com"
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="number"
          label="منفذ SMTP"
          value={emailSettings.smtpPort}
          onChange={(e) =>
            setEmailSettings({ ...emailSettings, smtpPort: parseInt(e.target.value) })
          }
          disabled={!emailSettings.emailEnabled}
          inputProps={{ min: 1 }}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="اسم المستخدم"
          value={emailSettings.smtpUser}
          onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
          disabled={!emailSettings.emailEnabled}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="password"
          label="كلمة المرور"
          value={emailSettings.smtpPassword}
          onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
          disabled={!emailSettings.emailEnabled}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="email"
          label="البريد الإلكتروني للمرسل"
          value={emailSettings.fromEmail}
          onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
          disabled={!emailSettings.emailEnabled}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="اسم المرسل"
          value={emailSettings.fromName}
          onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
          disabled={!emailSettings.emailEnabled}
        />
      </Grid>

      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={emailSettings.useSSL}
              onChange={(e) => setEmailSettings({ ...emailSettings, useSSL: e.target.checked })}
              disabled={!emailSettings.emailEnabled}
            />
          }
          label="استخدام SSL/TLS"
        />
      </Grid>

      {emailSettings.emailEnabled && (
        <Grid item xs={12}>
          <Alert severity="warning">
            تأكد من صحة بيانات SMTP قبل الحفظ. قد تحتاج إلى تمكين الوصول للتطبيقات الأقل أماناً في
            حساب البريد الإلكتروني الخاص بك.
          </Alert>
        </Grid>
      )}
    </Grid>
  );

  return (
    <Box>
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          تم حفظ الإعدادات بنجاح!
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="عام" />
              <Tab label="محاسبة" />
              <Tab label="الضريبة" />
              <Tab label="الحسابات الافتراضية" />
              <Tab label="الفواتير" />
              <Tab label="البريد الإلكتروني" />
            </Tabs>
          </Box>

          <Box sx={{ py: 2 }}>
            {activeTab === 0 && renderGeneralSettings()}
            {activeTab === 1 && renderAccountingSettings()}
            {activeTab === 2 && renderVATSettings()}
            {activeTab === 3 && renderDefaultAccounts()}
            {activeTab === 4 && renderInvoiceSettings()}
            {activeTab === 5 && renderEmailSettings()}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleResetSettings}
              disabled={loading}
            >
              إعادة تعيين
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveSettings}
              disabled={loading}
            >
              حفظ الإعدادات
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;
