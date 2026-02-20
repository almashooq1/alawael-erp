// مكون عرض قوالب فئة معينة
import React, { useState } from 'react';
import { Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip, Chip } from '@mui/material';
// طباعة/تصدير PDF لنص القالب فقط
function printTemplate(title, body) {
  const win = window.open('', '', 'width=800,height=600');
  win.document.write(`
    <html dir="rtl"><head><title>${title}</title>
    <style>body{font-family:Tahoma,Arial,sans-serif;padding:40px;} pre{background:#f9f9f9;padding:16px;border-radius:8px;white-space:pre-wrap;}</style>
    </head><body>
    <h2>${title}</h2>
    <pre>${body}</pre>
    <script>window.onload = function(){window.print();window.onafterprint = function(){window.close();};}</script>
    </body></html>
  `);
  win.document.close();
}
import templatesService from '../../../services/templatesService';

// استخراج المتغيرات الديناميكية من نص القالب
function extractPlaceholders(text) {
  const matches = text.matchAll(/\{(\w+)\}/g);
  return Array.from(matches, m => m[1]);
}

export default function TemplateCategory({ category, templates, onCopy }) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customVars, setCustomVars] = useState({});
  const [currentTpl, setCurrentTpl] = useState(null);

  const handleCopy = async (tpl) => {
    navigator.clipboard.writeText(tpl.body);
    if (tpl._id) await templatesService.incrementUsage(tpl._id);
    if (onCopy) onCopy('تم نسخ نص القالب!');
  };

  const handleCustomize = (tpl) => {
    setCurrentTpl(tpl);
    // تهيئة المتغيرات
    const vars = {};
    extractPlaceholders(tpl.body).forEach(v => { vars[v] = ''; });
    setCustomVars(vars);
    setCustomizeOpen(true);
  };

  const handleCustomCopy = async () => {
    let text = currentTpl.body;
    Object.entries(customVars).forEach(([k, v]) => {
      text = text.replaceAll(`{${k}}`, v || '...');
    });
    navigator.clipboard.writeText(text);
    if (currentTpl._id) await templatesService.incrementUsage(currentTpl._id);
    setCustomizeOpen(false);
    if (onCopy) onCopy('تم نسخ القالب بعد التخصيص!');
  };

  if (!templates || templates.length === 0) return <Typography>لا توجد قوالب متاحة لهذه الفئة حالياً.</Typography>;
  return (
    <Box>
      {templates.map((tpl, i) => (
        <Paper key={i} sx={{ p: 2, mb: 2, position: 'relative' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle1" fontWeight="bold">{tpl.title}</Typography>
            {typeof tpl.usageCount === 'number' && (
              <Tooltip title="عدد مرات الاستخدام/النسخ">
                <Typography color="info.main" sx={{ fontSize: 13, mx: 1 }}>استخدام: {tpl.usageCount}</Typography>
              </Tooltip>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" mb={1}>{tpl.description}</Typography>
          <Paper sx={{ p: 1, background: '#f9f9f9', mb: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{tpl.body}</Paper>
          {/* عرض المرفقات إن وجدت */}
          {tpl.attachments && tpl.attachments.length > 0 && (
            <Box mb={1} mt={1}>
              <Typography fontSize={14} color="text.secondary" mb={0.5}>المرفقات:</Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {tpl.attachments.map((att, j) => (
                  <Chip
                    key={j}
                    label={att.name + (att.size ? ` (${Math.round(att.size/1024)}KB)` : '')}
                    component="a"
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    clickable
                    color="info"
                    variant="outlined"
                    sx={{ direction: 'ltr', fontSize: 13 }}
                  />
                ))}
              </Box>
            </Box>
          )}
          <Button variant="contained" color="success" size="small" sx={{ mr: 1 }} onClick={() => handleCopy(tpl)}>نسخ النص</Button>
          <Button variant="outlined" color="primary" size="small" sx={{ mr: 1 }} onClick={() => handleCustomize(tpl)}>تخصيص</Button>
          <Button variant="outlined" color="secondary" size="small" onClick={() => printTemplate(tpl.title, tpl.body)}>تصدير PDF</Button>
        </Paper>
      ))}
      <Dialog open={customizeOpen} onClose={() => setCustomizeOpen(false)}>
        <DialogTitle>تخصيص القالب</DialogTitle>
        <DialogContent>
          {currentTpl && extractPlaceholders(currentTpl.body).map(ph => (
            <TextField
              key={ph}
              label={ph}
              value={customVars[ph] || ''}
              onChange={e => setCustomVars(vars => ({ ...vars, [ph]: e.target.value }))}
              fullWidth
              margin="dense"
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomizeOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleCustomCopy}>نسخ القالب المخصص</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
