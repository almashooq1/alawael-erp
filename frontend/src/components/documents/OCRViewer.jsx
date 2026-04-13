/**
 * OCR Viewer Component — عارض نتائج استخراج النصوص
 * عرض النص المستخرج مع مناطق التعرف ومستوى الثقة
 */
import { useState, useEffect } from 'react';




import { ocrApi } from '../../services/documentProPhase6Service';

export default function OCRViewer({ documentId, onClose }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!documentId) return;
    loadResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const loadResult = async () => {
    setLoading(true);
    try {
      const r = await ocrApi.getResult(documentId);
      setResult(r.data?.result || r.data || null);
    } catch {
      setResult(null);
    }
    setLoading(false);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>جاري تحميل نتائج OCR...</Typography>
      </Box>
    );
  }

  if (!result) {
    return (
      <Alert severity="warning" icon={<OCRIcon />}>
        لا توجد نتائج OCR لهذا المستند — قم بتشغيل استخراج النصوص أولاً
      </Alert>
    );
  }

  const confidence = result.confidence || result.overallConfidence || 0;
  const confidenceColor = confidence > 0.8 ? 'success' : confidence > 0.5 ? 'warning' : 'error';

  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          <OCRIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          نتائج استخراج النصوص
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {result.language && (
            <Chip
              icon={<LangIcon />}
              label={result.language === 'arabic' ? 'عربي' : result.language === 'english' ? 'إنجليزي' : result.language}
              size="small"
              variant="outlined"
            />
          )}
          <Chip
            icon={<ConfidenceIcon />}
            label={`ثقة: ${(confidence * 100).toFixed(0)}%`}
            size="small"
            color={confidenceColor}
          />
          <Tooltip title="تحديث">
            <IconButton size="small" onClick={loadResult}><RefreshIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      <LinearProgress
        variant="determinate"
        value={confidence * 100}
        color={confidenceColor}
        sx={{ mb: 2, height: 6, borderRadius: 3 }}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<TextIcon />} label="النص المستخرج" iconPosition="start" />
        {result.zones?.length > 0 && (
          <Tab icon={<OCRIcon />} label={`المناطق (${result.zones.length})`} iconPosition="start" />
        )}
        {result.tables?.length > 0 && (
          <Tab icon={<TableIcon />} label={`جداول (${result.tables.length})`} iconPosition="start" />
        )}
      </Tabs>

      {/* Extracted Text */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Tooltip title="نسخ النص">
              <IconButton size="small" onClick={() => handleCopy(result.text || result.extractedText || '')}>
                <CopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Paper
            variant="outlined"
            sx={{
              p: 2, maxHeight: 400, overflowY: 'auto',
              whiteSpace: 'pre-wrap', direction: result.language === 'arabic' ? 'rtl' : 'ltr',
              fontFamily: 'Cairo, monospace', fontSize: '0.95rem', lineHeight: 1.8,
              bgcolor: 'grey.50',
            }}
          >
            {result.text || result.extractedText || 'لا يوجد نص'}
          </Paper>

          {/* Metadata */}
          <Grid container spacing={1} sx={{ mt: 2 }}>
            {[
              { label: 'عدد الكلمات', value: result.wordCount || '-' },
              { label: 'عدد الأسطر', value: result.lineCount || '-' },
              { label: 'زمن المعالجة', value: result.processingTime ? `${result.processingTime}ms` : '-' },
              { label: 'الصفحات', value: result.pageCount || 1 },
            ].map((m, i) => (
              <Grid item xs={6} sm={3} key={i}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={700}>{m.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{m.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Zones */}
      {tab === 1 && result.zones && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>النص</TableCell>
              <TableCell>الثقة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.zones.map((z, i) => (
              <TableRow key={i}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={z.type === 'paragraph' ? 'فقرة' : z.type === 'heading' ? 'عنوان' : z.type || 'نص'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {z.text?.substring(0, 100)}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={`${((z.confidence || 0) * 100).toFixed(0)}%`}
                    color={z.confidence > 0.8 ? 'success' : z.confidence > 0.5 ? 'warning' : 'error'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Tables */}
      {tab === 2 && result.tables && (
        <Box>
          {result.tables.map((tbl, ti) => (
            <Box key={ti} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>جدول {ti + 1}</Typography>
              <Table size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
                <TableBody>
                  {(tbl.rows || []).map((row, ri) => (
                    <TableRow key={ri}>
                      {(row.cells || row).map((cell, ci) => (
                        <TableCell key={ci} sx={{ border: '1px solid', borderColor: 'divider' }}>
                          {typeof cell === 'string' ? cell : cell?.text || ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}
