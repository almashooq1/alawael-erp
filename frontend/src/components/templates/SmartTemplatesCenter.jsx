// نظام القوالب الذكي الشامل - واجهة رئيسية
import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Button, TextField, Snackbar, Alert } from '@mui/material';
  // تصدير القوالب إلى JSON
  const handleExportJSON = () => {
    const cat = categories[tab].key;
    const data = dbTemplates[cat] && dbTemplates[cat].length > 0 ? dbTemplates[cat] : (templatesData[cat] || []);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `templates_${cat}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, msg: 'تم تصدير القوالب بنجاح!' });
  };

  // استيراد القوالب من JSON
  const handleImportJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const arr = JSON.parse(text);
      const cat = categories[tab].key;
      for (const tpl of arr) {
        await templatesService.create({ ...tpl, category: cat });
      }
      setSnackbar({ open: true, msg: 'تم استيراد القوالب بنجاح!' });
      fetchDbTemplates(cat);
    } catch {
      setSnackbar({ open: true, msg: 'فشل الاستيراد: ملف غير صالح.' });
    }
  };
import TemplateCategory from './TemplateCategory';
import templatesData from './templatesData';
import ManageCustomTemplates from './ManageCustomTemplates';
import templatesService from '../../../services/templatesService';
import AITemplateSuggestor from './AITemplateSuggestor';
import AdminTemplatesReview from './AdminTemplatesReview';

const categories = [
  { key: 'official', label: 'خطابات رسمية للشركة' },
  { key: 'hr', label: 'خطابات شؤون الموظفين' },
  { key: 'management', label: 'خطابات الإدارة' },
  { key: 'students', label: 'خطابات الطلاب وأولياء الأمور' },
  { key: 'government', label: 'خطابات الجهات الحكومية' },
  { key: 'custom', label: 'قوالب مخصصة' },
];

export default function SmartTemplatesCenter() {
  // تحقق من صلاحية المشرف (يمكنك تعديلها حسب نظام المصادقة لديك)
  const isAdmin = localStorage.getItem('role') === 'admin' || localStorage.getItem('isAdmin') === 'true';
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, msg: '' });
  const [manageOpen, setManageOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  // تحميل القوالب من قاعدة البيانات لكل تصنيف
  const [dbTemplates, setDbTemplates] = useState({});
  const [adminReviewOpen, setAdminReviewOpen] = useState(false);
  const [loadingDb, setLoadingDb] = useState(false);

  const fetchDbTemplates = async (category) => {
    setLoadingDb(true);
    try {
      const data = await templatesService.getAll({ category });
      setDbTemplates(prev => ({ ...prev, [category]: data }));
    } catch (e) {
      setDbTemplates(prev => ({ ...prev, [category]: [] }));
    }
    setLoadingDb(false);
  };

  React.useEffect(() => {
    const cat = categories[tab].key;
    fetchDbTemplates(cat);
    // eslint-disable-next-line
  }, [tab, manageOpen]);

  // بحث ذكي في جميع القوالب
  const currentCategory = categories[tab].key;
  let templatesList = dbTemplates[currentCategory] && dbTemplates[currentCategory].length > 0
    ? dbTemplates[currentCategory]
    : (templatesData[currentCategory] || []);
  // بحث ذكي: أي كلمة من البحث موجودة في العنوان أو النص أو الوصف أو الكلمات المفتاحية
  const searchWords = search.trim().toLowerCase().split(/\s+/);
  const filteredTemplates = templatesList.filter(tpl => {
    const fields = [tpl.title, tpl.body, tpl.description, ...(tpl.keywords || [])].join(' ').toLowerCase();
    return searchWords.every(word => fields.includes(word));
  });

  // إضافة قالب جديد (واجهة مبسطة)
  const handleAddTemplate = () => {
    setManageOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" mb={2}>مركز القوالب الذكي الشامل</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
        {categories.map((cat, i) => <Tab key={cat.key} label={cat.label} />)}
      </Tabs>
      <Box mt={2} display="flex" gap={2} alignItems="center">
                {isAdmin && (
                  <Button variant="contained" color="error" onClick={() => setAdminReviewOpen(true)}>
                    مراجعة القوالب الإدارية
                  </Button>
                )}
        <TextField
          label="بحث في القوالب"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 250 }}
        />
        <Button variant="contained" color="success" onClick={handleAddTemplate}>إنشاء قالب جديد</Button>
        <Button variant="contained" color="warning" onClick={() => setAiOpen(true)}>اقتراح قالب بالذكاء الاصطناعي</Button>
        <Button variant="outlined" color="info" onClick={handleExportJSON}>تصدير القوالب (JSON)</Button>
        <Button variant="outlined" color="secondary" component="label">
          استيراد القوالب (JSON)
          <input type="file" accept="application/json" hidden onChange={handleImportJSON} />
        </Button>
        {categories[tab].key === 'custom' && (
          <Button variant="outlined" color="primary" onClick={() => setManageOpen(true)}>
            إدارة القوالب المخصصة
          </Button>
        )}
      </Box>
      <Box mt={3}>
        <TemplateCategory
          category={currentCategory}
          templates={filteredTemplates}
          onCopy={msg => setSnackbar({ open: true, msg })}
          loading={loadingDb}
        />
        <ManageCustomTemplates
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          templates={dbTemplates['custom'] || []}
          setTemplates={() => fetchDbTemplates('custom')}
        />
        <AITemplateSuggestor
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          category={currentCategory}
          onTemplateCreated={() => fetchDbTemplates(currentCategory)}
        />
        {/* لوحة مراجعة القوالب الإدارية */}
        <AdminTemplatesReview open={adminReviewOpen} onClose={() => setAdminReviewOpen(false)} />
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={2000} onClose={() => setSnackbar({ open: false, msg: '' })}>
        <Alert severity="success" sx={{ width: '100%' }}>{snackbar.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
