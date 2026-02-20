// مكون اقتراح قالب بالذكاء الاصطناعي
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, CircularProgress, Typography } from '@mui/material';
import templatesService from '../../../services/templatesService';

const languages = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
];

export default function AITemplateSuggestor({ open, onClose, category, onTemplateCreated }) {
  const [desc, setDesc] = useState('');
  const [lang, setLang] = useState('ar');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSuggest = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      // استدعاء API الذكاء الاصطناعي (محاكاة)
      // في النظام الفعلي: استبدل هذا بنداء فعلي لـ /api/ai/generate-template
      const aiBody = lang === 'ar'
        ? `سعادة/ ... المحترم\n${desc}\nوتفضلوا بقبول فائق الاحترام.`
        : `Dear Sir/Madam,\n${desc}\nBest regards.`;
      setTimeout(() => {
        setResult({
          title: lang === 'ar' ? 'قالب مقترح (ذكاء اصطناعي)' : 'AI Suggested Template',
          description: desc,
          body: aiBody,
          language: lang,
        });
        setLoading(false);
      }, 1200);
    } catch (e) {
      setError('حدث خطأ أثناء توليد القالب.');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    await templatesService.create({ ...result, category });
    if (onTemplateCreated) onTemplateCreated();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>اقتراح قالب بالذكاء الاصطناعي</DialogTitle>
      <DialogContent>
        <TextField
          label="وصف القالب أو المتطلبات"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          fullWidth
          margin="dense"
          multiline
          minRows={2}
        />
        <TextField
          select
          label="اللغة"
          value={lang}
          onChange={e => setLang(e.target.value)}
          fullWidth
          margin="dense"
        >
          {languages.map(l => <MenuItem key={l.code} value={l.code}>{l.label}</MenuItem>)}
        </TextField>
        {loading && <CircularProgress sx={{ mt: 2 }} />}
        {error && <Typography color="error">{error}</Typography>}
        {result && (
          <>
            <Typography variant="subtitle2" mt={2}>النص المقترح:</Typography>
            <Typography sx={{ background: '#f9f9f9', p: 1, borderRadius: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{result.body}</Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
        <Button variant="contained" color="success" onClick={handleSuggest} disabled={loading || !desc}>اقتراح</Button>
        <Button variant="outlined" color="primary" onClick={handleSave} disabled={!result}>حفظ القالب</Button>
      </DialogActions>
    </Dialog>
  );
}
