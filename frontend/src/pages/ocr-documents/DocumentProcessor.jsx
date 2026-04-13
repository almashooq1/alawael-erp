/**
 * Document Processor — معالج المستندات
 * Phase 18 — رفع ومعالجة ومراجعة المستندات الطبية
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, Tabs, Tab,
  Chip, LinearProgress, Alert, Snackbar, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Divider, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
  Accordion, AccordionSummary, AccordionDetails, List, ListItem,
  ListItemText, ListItemIcon,
} from '@mui/material';
import {
  DocumentScanner as ScanIcon,
  Description as DocIcon,
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as EditIcon,
  ExpandMore as ExpandIcon,
  Search as SearchIcon,
  TextSnippet as TextIcon,
  History as HistoryIcon,
  Replay as ReplayIcon,
  BatchPrediction as BatchIcon,
  ArrowBack as BackIcon,
  DataObject as JsonIcon,
  TableChart as CsvIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ocrDocumentService from '../../services/ocrDocumentService';

/* ── labels ── */
const statusLabel = {
  queued: 'في الانتظار', preprocessing: 'معالجة أولية', ocr_running: 'تعرف ضوئي',
  parsing: 'تحليل', review_needed: 'بحاجة مراجعة',
  completed: 'مكتمل', failed: 'فشل', archived: 'مؤرشف',
};
const statusColor = (s) => ({ completed: 'success', failed: 'error', review_needed: 'warning', queued: 'default' }[s] || 'info');

const docTypeLabel = {
  discharge_summary: 'ملخص خروج', lab_report: 'تقرير مختبر', prescription: 'وصفة طبية',
  radiology_report: 'تقرير أشعة', therapy_report: 'تقرير علاج', progress_note: 'ملاحظة تقدم',
  assessment_form: 'نموذج تقييم', referral_letter: 'خطاب إحالة',
  consent_form: 'نموذج موافقة', insurance_claim: 'مطالبة تأمين', other: 'أخرى',
};

export default function DocumentProcessor() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  /* ── Upload state ── */
  const [uploadForm, setUploadForm] = useState({
    fileName: '', documentType: 'other', beneficiaryId: '', language: 'ara+eng',
    ocrEngine: 'tesseract-mixed', tags: '', pageCount: 1,
  });

  /* ── Documents list ── */
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [extraction, setExtraction] = useState(null);
  const [corrections, setCorrections] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  /* ── Search ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  /* ── Templates ── */
  const [templates, setTemplates] = useState([]);

  /* ── Batches ── */
  const [batches, setBatches] = useState([]);

  /* ── Correction dialog ── */
  const [corrDialog, setCorrDialog] = useState(false);
  const [corrForm, setCorrForm] = useState({ field: '', oldValue: '', newValue: '', reason: '' });

  /* ── Reject dialog ── */
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const notify = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  /* ── Loaders ── */
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ocrDocumentService.listDocuments();
      setDocuments(res.data?.data || res.data || []);
    } catch { notify('فشل تحميل المستندات', 'error'); }
    finally { setLoading(false); }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await ocrDocumentService.listTemplates();
      setTemplates(res.data?.data || res.data || []);
    } catch { /* silent */ }
  }, []);

  const loadBatches = useCallback(async () => {
    try {
      const res = await ocrDocumentService.listBatches();
      setBatches(res.data?.data || res.data || []);
    } catch { /* silent */ }
  }, []);

  const loadDocDetail = useCallback(async (id) => {
    try {
      const [docRes, extRes, corrRes, auditRes] = await Promise.all([
        ocrDocumentService.getDocument(id),
        ocrDocumentService.getExtraction(id).catch(() => null),
        ocrDocumentService.listCorrections(id),
        ocrDocumentService.getDocumentAuditLog(id),
      ]);
      setSelectedDoc(docRes.data?.data || docRes.data);
      setExtraction(extRes?.data?.data || extRes?.data || null);
      setCorrections(corrRes.data?.data || corrRes.data || []);
      setAuditLog(auditRes.data?.data || auditRes.data || []);
    } catch { notify('فشل تحميل تفاصيل المستند', 'error'); }
  }, []);

  useEffect(() => { loadDocuments(); loadTemplates(); loadBatches(); }, [loadDocuments, loadTemplates, loadBatches]);

  /* ── Actions ── */
  const handleUpload = async () => {
    if (!uploadForm.fileName) { notify('اسم الملف مطلوب', 'error'); return; }
    setLoading(true);
    try {
      const payload = {
        ...uploadForm,
        tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()) : [],
        pageCount: parseInt(uploadForm.pageCount) || 1,
      };
      await ocrDocumentService.uploadDocument(payload);
      notify('تم رفع المستند ومعالجته بنجاح');
      setUploadForm({ fileName: '', documentType: 'other', beneficiaryId: '', language: 'ara+eng', ocrEngine: 'tesseract-mixed', tags: '', pageCount: 1 });
      loadDocuments();
    } catch { notify('فشل رفع المستند', 'error'); }
    finally { setLoading(false); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await ocrDocumentService.searchDocuments(searchQuery);
      setSearchResults(res.data?.data || res.data || []);
    } catch { notify('فشل البحث', 'error'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    try {
      await ocrDocumentService.approveDocument(id);
      notify('تمت الموافقة على المستند');
      loadDocuments();
      if (selectedDoc?.id === id) loadDocDetail(id);
    } catch { notify('فشل الموافقة', 'error'); }
  };

  const handleReject = async () => {
    if (!selectedDoc) return;
    try {
      await ocrDocumentService.rejectDocument(selectedDoc.id, rejectReason);
      notify('تم رفض المستند');
      setRejectDialog(false);
      setRejectReason('');
      loadDocuments();
      loadDocDetail(selectedDoc.id);
    } catch { notify('فشل الرفض', 'error'); }
  };

  const handleReprocess = async (id) => {
    setLoading(true);
    try {
      await ocrDocumentService.reprocessDocument(id);
      notify('تمت إعادة المعالجة');
      loadDocuments();
      if (selectedDoc?.id === id) loadDocDetail(id);
    } catch { notify('فشلت إعادة المعالجة', 'error'); }
    finally { setLoading(false); }
  };

  const handleCorrection = async () => {
    if (!selectedDoc) return;
    try {
      await ocrDocumentService.addCorrection(selectedDoc.id, corrForm);
      notify('تم حفظ التصحيح');
      setCorrDialog(false);
      setCorrForm({ field: '', oldValue: '', newValue: '', reason: '' });
      loadDocDetail(selectedDoc.id);
    } catch { notify('فشل التصحيح', 'error'); }
  };

  const handleExport = async (id, format) => {
    try {
      const res = await ocrDocumentService.exportDocument(id, format);
      const data = res.data?.data || res.data;
      const blob = new Blob([typeof data.data === 'string' ? data.data : JSON.stringify(data.data, null, 2)],
        { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${id}.${format}`;
      a.click();
      notify(`تم تصدير المستند بصيغة ${format.toUpperCase()}`);
    } catch { notify('فشل التصدير', 'error'); }
  };

  /* ══════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════ */
  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <IconButton onClick={() => navigate('/ocr-documents')}><BackIcon /></IconButton>
        <ScanIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h5" fontWeight="bold">معالج المستندات</Typography>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<UploadIcon />} label="رفع مستند" />
        <Tab icon={<DocIcon />} label="المستندات" />
        <Tab icon={<SearchIcon />} label="بحث النصوص" />
        <Tab icon={<TextIcon />} label="القوالب" />
        <Tab icon={<BatchIcon />} label="الدفعات" />
      </Tabs>

      {/* ═══ TAB 0 — Upload ═══ */}
      {tab === 0 && (
        <Card sx={{ p: 3, maxWidth: 700 }}>
          <Typography variant="h6" gutterBottom><UploadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />رفع مستند جديد</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="اسم الملف" value={uploadForm.fileName}
                onChange={e => setUploadForm({ ...uploadForm, fileName: e.target.value })} required />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>نوع المستند</InputLabel>
                <Select value={uploadForm.documentType} label="نوع المستند"
                  onChange={e => setUploadForm({ ...uploadForm, documentType: e.target.value })}>
                  {Object.entries(docTypeLabel).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="معرف المستفيد" value={uploadForm.beneficiaryId}
                onChange={e => setUploadForm({ ...uploadForm, beneficiaryId: e.target.value })} />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>اللغة</InputLabel>
                <Select value={uploadForm.language} label="اللغة"
                  onChange={e => setUploadForm({ ...uploadForm, language: e.target.value })}>
                  <MenuItem value="ara">عربي</MenuItem>
                  <MenuItem value="eng">إنجليزي</MenuItem>
                  <MenuItem value="ara+eng">مختلط</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>محرك OCR</InputLabel>
                <Select value={uploadForm.ocrEngine} label="محرك OCR"
                  onChange={e => setUploadForm({ ...uploadForm, ocrEngine: e.target.value })}>
                  <MenuItem value="tesseract-ar">Tesseract Arabic</MenuItem>
                  <MenuItem value="tesseract-en">Tesseract English</MenuItem>
                  <MenuItem value="tesseract-mixed">Tesseract Mixed</MenuItem>
                  <MenuItem value="google-vision">Google Vision</MenuItem>
                  <MenuItem value="azure-cognitive">Azure Cognitive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="عدد الصفحات" type="number" value={uploadForm.pageCount}
                onChange={e => setUploadForm({ ...uploadForm, pageCount: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="الوسوم (مفصولة بفاصلة)" value={uploadForm.tags}
                onChange={e => setUploadForm({ ...uploadForm, tags: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" startIcon={<UploadIcon />} onClick={handleUpload}
                disabled={loading || !uploadForm.fileName} size="large">
                رفع ومعالجة
              </Button>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* ═══ TAB 1 — Documents List & Detail ═══ */}
      {tab === 1 && (
        <Grid container spacing={3}>
          {/* List */}
          <Grid item xs={12} md={selectedDoc ? 5 : 12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">المستندات ({documents.length})</Typography>
              <IconButton onClick={loadDocuments}><RefreshIcon /></IconButton>
            </Box>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell align="right">الملف</TableCell>
                    <TableCell align="right">النوع</TableCell>
                    <TableCell align="right">الحالة</TableCell>
                    <TableCell align="right">الثقة</TableCell>
                    <TableCell align="center">إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map(doc => (
                    <TableRow key={doc.id} hover selected={selectedDoc?.id === doc.id}
                      onClick={() => loadDocDetail(doc.id)} sx={{ cursor: 'pointer' }}>
                      <TableCell align="right">{doc.fileName}</TableCell>
                      <TableCell align="right"><Chip size="small" label={docTypeLabel[doc.documentType] || doc.documentType} /></TableCell>
                      <TableCell align="right"><Chip size="small" label={statusLabel[doc.status]} color={statusColor(doc.status)} /></TableCell>
                      <TableCell align="right">{doc.confidenceScore ? `${Math.round(doc.confidenceScore * 100)}%` : '—'}</TableCell>
                      <TableCell align="center">
                        {doc.status === 'review_needed' && (
                          <Tooltip title="موافقة"><IconButton size="small" color="success" onClick={e => { e.stopPropagation(); handleApprove(doc.id); }}><ApproveIcon fontSize="small" /></IconButton></Tooltip>
                        )}
                        <Tooltip title="إعادة معالجة"><IconButton size="small" onClick={e => { e.stopPropagation(); handleReprocess(doc.id); }}><ReplayIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Detail Panel */}
          {selectedDoc && (
            <Grid item xs={12} md={7}>
              <Card sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">{selectedDoc.fileName}</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {selectedDoc.status === 'review_needed' && (
                      <>
                        <Button size="small" color="success" startIcon={<ApproveIcon />}
                          onClick={() => handleApprove(selectedDoc.id)}>موافقة</Button>
                        <Button size="small" color="error" startIcon={<RejectIcon />}
                          onClick={() => setRejectDialog(true)}>رفض</Button>
                      </>
                    )}
                    <Button size="small" startIcon={<ReplayIcon />}
                      onClick={() => handleReprocess(selectedDoc.id)}>إعادة معالجة</Button>
                    <Button size="small" startIcon={<JsonIcon />}
                      onClick={() => handleExport(selectedDoc.id, 'json')}>JSON</Button>
                    <Button size="small" startIcon={<CsvIcon />}
                      onClick={() => handleExport(selectedDoc.id, 'csv')}>CSV</Button>
                  </Box>
                </Box>

                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={4}><Typography variant="caption" color="text.secondary">النوع</Typography><br /><Chip size="small" label={docTypeLabel[selectedDoc.documentType]} /></Grid>
                  <Grid item xs={4}><Typography variant="caption" color="text.secondary">الحالة</Typography><br /><Chip size="small" label={statusLabel[selectedDoc.status]} color={statusColor(selectedDoc.status)} /></Grid>
                  <Grid item xs={4}><Typography variant="caption" color="text.secondary">الثقة</Typography><br /><Typography fontWeight="bold">{selectedDoc.confidenceScore ? `${Math.round(selectedDoc.confidenceScore * 100)}%` : '—'}</Typography></Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Extracted Data */}
                {extraction && (
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandIcon />}>
                      <Typography variant="subtitle1"><TextIcon sx={{ mr: 1, verticalAlign: 'middle' }} />البيانات المستخرجة</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {/* Raw Text */}
                      <Typography variant="subtitle2" gutterBottom>النص الخام:</Typography>
                      <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50', whiteSpace: 'pre-wrap', direction: 'rtl' }}>
                        <Typography variant="body2">{extraction.rawText}</Typography>
                      </Paper>

                      {/* Structured Fields */}
                      <Typography variant="subtitle2" gutterBottom>البيانات المنظمة:</Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead><TableRow><TableCell align="right">الحقل</TableCell><TableCell align="right">القيمة</TableCell><TableCell align="right">الثقة</TableCell><TableCell align="center">تصحيح</TableCell></TableRow></TableHead>
                          <TableBody>
                            {Object.entries(extraction.structuredData || {}).map(([key, val]) => (
                              <TableRow key={key}>
                                <TableCell align="right"><strong>{key}</strong></TableCell>
                                <TableCell align="right">{typeof val === 'object' ? JSON.stringify(val, null, 1) : String(val)}</TableCell>
                                <TableCell align="right">{extraction.fieldConfidence?.[key] ? `${Math.round(extraction.fieldConfidence[key] * 100)}%` : '—'}</TableCell>
                                <TableCell align="center">
                                  <IconButton size="small" onClick={() => { setCorrForm({ field: key, oldValue: typeof val === 'object' ? JSON.stringify(val) : String(val), newValue: '', reason: '' }); setCorrDialog(true); }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Corrections */}
                {corrections.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandIcon />}>
                      <Typography variant="subtitle1"><EditIcon sx={{ mr: 1, verticalAlign: 'middle' }} />التصحيحات ({corrections.length})</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {corrections.map(c => (
                          <ListItem key={c.id}>
                            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary={`${c.field}: ${c.oldValue} → ${c.newValue}`}
                              secondary={`${c.reason || ''} — ${new Date(c.correctedAt).toLocaleDateString('ar-SA')}`} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Audit Log */}
                {auditLog.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandIcon />}>
                      <Typography variant="subtitle1"><HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />سجل التدقيق ({auditLog.length})</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {auditLog.map(a => (
                          <ListItem key={a.id}>
                            <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
                            <ListItemText primary={a.details}
                              secondary={`${a.action} — ${new Date(a.timestamp).toLocaleString('ar-SA')}`} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* ═══ TAB 2 — Search ═══ */}
      {tab === 2 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom><SearchIcon sx={{ mr: 1, verticalAlign: 'middle' }} />البحث في النصوص المستخرجة</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField fullWidth placeholder="ابحث في محتوى المستندات..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
            <Button variant="contained" onClick={handleSearch} disabled={!searchQuery.trim()}>بحث</Button>
          </Box>
          {searchResults.length > 0 && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead><TableRow sx={{ bgcolor: 'grey.100' }}><TableCell align="right">الملف</TableCell><TableCell align="right">النوع</TableCell><TableCell align="right">المقتطف</TableCell></TableRow></TableHead>
                <TableBody>
                  {searchResults.map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell align="right">{r.fileName}</TableCell>
                      <TableCell align="right"><Chip size="small" label={docTypeLabel[r.documentType] || r.documentType} /></TableCell>
                      <TableCell align="right"><Typography variant="body2" sx={{ direction: 'rtl' }}>...{r.snippet}...</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {searchResults.length === 0 && searchQuery && !loading && (
            <Typography color="text.secondary" textAlign="center" sx={{ mt: 3 }}>لا توجد نتائج</Typography>
          )}
        </Card>
      )}

      {/* ═══ TAB 3 — Templates ═══ */}
      {tab === 3 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom><TextIcon sx={{ mr: 1, verticalAlign: 'middle' }} />قوالب الاستخراج ({templates.length})</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow sx={{ bgcolor: 'grey.100' }}><TableCell align="right">الاسم</TableCell><TableCell align="right">النوع</TableCell><TableCell align="right">الحقول</TableCell></TableRow></TableHead>
              <TableBody>
                {templates.map(t => (
                  <TableRow key={t.id} hover>
                    <TableCell align="right">{t.name}</TableCell>
                    <TableCell align="right"><Chip size="small" label={docTypeLabel[t.documentType] || t.documentType} /></TableCell>
                    <TableCell align="right">{(t.fields || []).join(', ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* ═══ TAB 4 — Batches ═══ */}
      {tab === 4 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom><BatchIcon sx={{ mr: 1, verticalAlign: 'middle' }} />الدفعات ({batches.length})</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow sx={{ bgcolor: 'grey.100' }}><TableCell align="right">الاسم</TableCell><TableCell align="right">الحالة</TableCell><TableCell align="right">المستندات</TableCell><TableCell align="right">المعالجة</TableCell></TableRow></TableHead>
              <TableBody>
                {batches.map(b => (
                  <TableRow key={b.id} hover>
                    <TableCell align="right">{b.name}</TableCell>
                    <TableCell align="right"><Chip size="small" label={b.status} color={statusColor(b.status)} /></TableCell>
                    <TableCell align="right">{b.totalDocuments}</TableCell>
                    <TableCell align="right">{b.processedCount}/{b.totalDocuments}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* ═══ Correction Dialog ═══ */}
      <Dialog open={corrDialog} onClose={() => setCorrDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تصحيح حقل</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="الحقل" value={corrForm.field} disabled sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth label="القيمة الحالية" value={corrForm.oldValue} disabled sx={{ mb: 2 }} />
          <TextField fullWidth label="القيمة الجديدة" value={corrForm.newValue}
            onChange={e => setCorrForm({ ...corrForm, newValue: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth label="السبب" value={corrForm.reason}
            onChange={e => setCorrForm({ ...corrForm, reason: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCorrDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCorrection} disabled={!corrForm.newValue}>حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Reject Dialog ═══ */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>رفض المستند</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="سبب الرفض" multiline rows={3} value={rejectReason}
            onChange={e => setRejectReason(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={!rejectReason}>رفض</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
