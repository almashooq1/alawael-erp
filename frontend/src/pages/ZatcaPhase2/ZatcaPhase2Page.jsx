/**
 * ZATCA Phase 2 Dashboard — الفوترة الإلكترونية المرحلة الثانية
 *
 * هيئة الزكاة والضريبة والجمارك — Integration Phase (FATOORA)
 * UBL 2.1 XML + SHA-256 Hash + TLV QR Code + Reporting/Clearance API
 */
import React, { useState, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Tabs, Tab, Chip, Divider, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Receipt as InvoiceIcon,
  QrCode as QrIcon,
  Send as SendIcon,
  CheckCircle as ClearedIcon,
  Code as XmlIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API = axios.create({ baseURL: '/api/zatca-phase2', withCredentials: true });

const INVOICE_TEMPLATE = {
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  invoiceTime: new Date().toTimeString().split(' ')[0],
  invoiceType: 'standard', // standard | simplified
  sellerName: '',
  sellerVatNumber: '',
  buyerName: '',
  buyerVatNumber: '',
  currency: 'SAR',
  items: [
    { description: '', quantity: 1, unitPrice: 0, vatRate: 15 },
  ],
};

export default function ZatcaPhase2Page() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // معالجة الفاتورة
  const [invoice, setInvoice] = useState(INVOICE_TEMPLATE);
  const [processResult, setProcessResult] = useState(null);

  // بناء XML فقط
  const [xmlResult, setXmlResult] = useState('');
  const [xmlDialog, setXmlDialog] = useState(false);

  // QR Code
  const [qrResult, setQrResult] = useState(null);
  const [qrDialog, setQrDialog] = useState(false);

  // التحقق من الامتثال
  const [complianceXml, setComplianceXml] = useState('');
  const [complianceHash, setComplianceHash] = useState('');
  const [complianceResult, setComplianceResult] = useState(null);

  // حالة الاتصال
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await API.get('/status');
      setStatus(res?.data?.data || res?.data || null);
    } catch {
      setError('فشل تحميل حالة ZATCA');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const calcTotals = () => {
    const subtotal = invoice.items.reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
    const vat = invoice.items.reduce((s, it) => s + (it.quantity * it.unitPrice * it.vatRate / 100), 0);
    return { subtotal, vat, total: subtotal + vat };
  };

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    setProcessResult(null);
    try {
      const { subtotal, vat, total } = calcTotals();
      const payload = { ...invoice, subtotal, vatAmount: vat, totalAmount: total };
      const res = await API.post('/invoice/process', payload);
      setProcessResult(res?.data?.data || res?.data || null);
      setSuccess('تمت معالجة الفاتورة بنجاح');
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل معالجة الفاتورة');
    } finally {
      setLoading(false);
    }
  };

  const handleBuildXml = async () => {
    setLoading(true);
    setError(null);
    try {
      const { subtotal, vat, total } = calcTotals();
      const payload = { ...invoice, subtotal, vatAmount: vat, totalAmount: total };
      const res = await API.post('/invoice/build-xml', payload);
      setXmlResult(res?.data?.data?.xml || res?.data?.xml || '');
      setXmlDialog(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل بناء XML');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    setLoading(true);
    setError(null);
    try {
      const { vat, total } = calcTotals();
      const payload = {
        sellerName: invoice.sellerName,
        vatNumber: invoice.sellerVatNumber,
        invoiceDate: invoice.invoiceDate,
        invoiceTime: invoice.invoiceTime,
        totalAmount: total,
        vatAmount: vat,
      };
      const res = await API.post('/invoice/qr', payload);
      setQrResult(res?.data?.data || res?.data || null);
      setQrDialog(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل توليد QR Code');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckCompliance = async () => {
    if (!complianceXml || !complianceHash) return;
    setLoading(true);
    setError(null);
    setComplianceResult(null);
    try {
      const res = await API.post('/compliance/check', { xml: complianceXml, hash: complianceHash });
      setComplianceResult(res?.data?.data || res?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل فحص التوافق');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index, field, value) => {
    const items = [...invoice.items];
    items[index] = { ...items[index], [field]: field === 'description' ? value : Number(value) };
    setInvoice({ ...invoice, items });
  };

  const { subtotal, vat, total } = calcTotals();

  const StatusChip = ({ status: s }) => {
    const map = {
      cleared: { label: 'مُصادق (Cleared)', color: 'success' },
      reported: { label: 'مُبلَّغ (Reported)', color: 'info' },
      rejected: { label: 'مرفوض', color: 'error' },
      pending: { label: 'معلق', color: 'warning' },
    };
    const cfg = map[s] || { label: s || '—', color: 'default' };
    return <Chip label={cfg.label} color={cfg.color} size="small" />;
  };

  return (
    <Box p={3} dir="rtl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            <InvoiceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            الفوترة الإلكترونية — ZATCA Phase 2
          </Typography>
          <Typography color="text.secondary">
            هيئة الزكاة والضريبة والجمارك — منصة فاتورة (FATOORA) — المرحلة الثانية
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadStatus} disabled={statusLoading}>
            {statusLoading ? <CircularProgress size={16} /> : 'حالة الاتصال'}
          </Button>
        </Box>
      </Box>

      {/* Status */}
      {status && (
        <Alert
          severity={status.connected ? 'success' : 'warning'}
          sx={{ mb: 2 }}
          onClose={() => setStatus(null)}
        >
          {status.connected
            ? `متصل بـ ZATCA — البيئة: ${status.environment || '—'} — CSID: ${status.csidStatus || '—'}`
            : 'غير متصل بـ ZATCA — تحقق من بيانات الاعتماد'}
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="إنشاء فاتورة" />
        <Tab label="فحص التوافق" />
        <Tab label="نتائج المعالجة" />
      </Tabs>

      {/* Tab 0: Create Invoice */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            {/* Invoice Header */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" mb={2}>بيانات الفاتورة</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <TextField
                      fullWidth size="small"
                      label="رقم الفاتورة"
                      value={invoice.invoiceNumber}
                      onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField
                      fullWidth size="small"
                      label="تاريخ الفاتورة"
                      type="date"
                      value={invoice.invoiceDate}
                      onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField
                      fullWidth size="small"
                      label="نوع الفاتورة"
                      select
                      value={invoice.invoiceType}
                      onChange={(e) => setInvoice({ ...invoice, invoiceType: e.target.value })}
                      SelectProps={{ native: true }}
                    >
                      <option value="standard">ضريبية (Standard)</option>
                      <option value="simplified">مبسطة (Simplified)</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth size="small"
                      label="اسم البائع"
                      value={invoice.sellerName}
                      onChange={(e) => setInvoice({ ...invoice, sellerName: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth size="small"
                      label="الرقم الضريبي للبائع"
                      value={invoice.sellerVatNumber}
                      onChange={(e) => setInvoice({ ...invoice, sellerVatNumber: e.target.value })}
                      inputProps={{ maxLength: 15 }}
                      helperText="15 رقماً"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth size="small"
                      label="اسم المشتري"
                      value={invoice.buyerName}
                      onChange={(e) => setInvoice({ ...invoice, buyerName: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth size="small"
                      label="الرقم الضريبي للمشتري (اختياري)"
                      value={invoice.buyerVatNumber}
                      onChange={(e) => setInvoice({ ...invoice, buyerVatNumber: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" mb={2}>بنود الفاتورة</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>الوصف</TableCell>
                        <TableCell align="center">الكمية</TableCell>
                        <TableCell align="center">سعر الوحدة</TableCell>
                        <TableCell align="center">نسبة الضريبة %</TableCell>
                        <TableCell align="center">الإجمالي</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoice.items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <TextField
                              size="small" fullWidth variant="standard"
                              value={item.description}
                              onChange={(e) => updateItem(i, 'description', e.target.value)}
                              placeholder="وصف الخدمة/المنتج"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              size="small" type="number" variant="standard"
                              value={item.quantity}
                              onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                              sx={{ width: 60 }}
                              inputProps={{ min: 1 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              size="small" type="number" variant="standard"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                              sx={{ width: 100 }}
                              inputProps={{ min: 0, step: 0.01 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              size="small" type="number" variant="standard"
                              value={item.vatRate}
                              onChange={(e) => updateItem(i, 'vatRate', e.target.value)}
                              sx={{ width: 60 }}
                              inputProps={{ min: 0, max: 100 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {(item.quantity * item.unitPrice * (1 + item.vatRate / 100)).toFixed(2)} ر.س
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Button
                  size="small" sx={{ mt: 1 }}
                  onClick={() => setInvoice({
                    ...invoice,
                    items: [...invoice.items, { description: '', quantity: 1, unitPrice: 0, vatRate: 15 }],
                  })}
                >
                  + إضافة بند
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Totals + Actions */}
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" mb={2}>الإجماليات</Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography color="text.secondary">المجموع قبل الضريبة</Typography>
                  <Typography>{subtotal.toFixed(2)} ر.س</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography color="text.secondary">ضريبة القيمة المضافة</Typography>
                  <Typography>{vat.toFixed(2)} ر.س</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography fontWeight="bold">الإجمالي شامل الضريبة</Typography>
                  <Typography fontWeight="bold" color="primary.main">{total.toFixed(2)} ر.س</Typography>
                </Box>
              </CardContent>
            </Card>

            <Box display="flex" flexDirection="column" gap={1.5}>
              <Button
                variant="contained"
                fullWidth
                startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
                onClick={handleProcess}
                disabled={loading || !invoice.invoiceNumber || !invoice.sellerName || !invoice.sellerVatNumber}
              >
                معالجة الفاتورة (إرسال لـ ZATCA)
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<XmlIcon />}
                onClick={handleBuildXml}
                disabled={loading}
              >
                بناء XML فقط
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<QrIcon />}
                onClick={handleGenerateQR}
                disabled={loading || !invoice.sellerName || !invoice.sellerVatNumber}
              >
                توليد QR Code
              </Button>
            </Box>

            {processResult && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" mb={1}>نتيجة المعالجة</Typography>
                  <Box mb={1}><StatusChip status={processResult.status} /></Box>
                  {processResult.uuid && (
                    <Typography variant="caption" display="block">UUID: {processResult.uuid}</Typography>
                  )}
                  {processResult.hash && (
                    <Typography variant="caption" display="block" sx={{ wordBreak: 'break-all' }}>
                      Hash: {processResult.hash.substring(0, 20)}...
                    </Typography>
                  )}
                  {processResult.zatcaResponse?.validationResults && (
                    <Alert
                      severity={processResult.zatcaResponse.validationResults.status === 'PASS' ? 'success' : 'error'}
                      sx={{ mt: 1 }}
                    >
                      {processResult.zatcaResponse.validationResults.status}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Compliance Check */}
      {tab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>
              <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              فحص التوافق مع ZATCA
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="محتوى XML"
                  multiline
                  rows={8}
                  value={complianceXml}
                  onChange={(e) => setComplianceXml(e.target.value)}
                  placeholder="ألصق محتوى XML هنا..."
                  inputProps={{ dir: 'ltr', style: { fontFamily: 'monospace', fontSize: '12px' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="قيمة Hash (SHA-256 Base64)"
                  value={complianceHash}
                  onChange={(e) => setComplianceHash(e.target.value)}
                  placeholder="SHA-256 hash..."
                  inputProps={{ dir: 'ltr', style: { fontFamily: 'monospace' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} /> : <CheckIcon />}
                  onClick={handleCheckCompliance}
                  disabled={loading || !complianceXml || !complianceHash}
                >
                  فحص التوافق
                </Button>
              </Grid>
            </Grid>

            {complianceResult && (
              <Box mt={3}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle1" mb={1}>نتيجة الفحص</Typography>
                <Alert severity={complianceResult.isValid ? 'success' : 'error'} sx={{ mb: 2 }}>
                  {complianceResult.isValid ? 'الفاتورة مطابقة لمعايير ZATCA' : 'الفاتورة غير مطابقة'}
                </Alert>
                {complianceResult.errors?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="error" mb={1}>الأخطاء:</Typography>
                    {complianceResult.errors.map((e, i) => (
                      <Typography key={i} variant="body2" color="error.main">• {e}</Typography>
                    ))}
                  </Box>
                )}
                {complianceResult.warnings?.length > 0 && (
                  <Box mt={1}>
                    <Typography variant="subtitle2" color="warning.main" mb={1}>التحذيرات:</Typography>
                    {complianceResult.warnings.map((w, i) => (
                      <Typography key={i} variant="body2" color="warning.main">• {w}</Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Process History */}
      {tab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>سجل معالجة الفواتير</Typography>
            <Alert severity="info">
              يمكن استعراض تاريخ الفواتير المُرسلة لـ ZATCA من هنا. قم بإرسال فاتورة أولاً لرؤية النتائج.
            </Alert>
            {processResult && (
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>رقم الفاتورة</TableCell>
                      <TableCell>UUID</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell>نوع الإرسال</TableCell>
                      <TableCell>التاريخ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell dir="ltr" sx={{ fontSize: 11 }}>{processResult.uuid || '—'}</TableCell>
                      <TableCell><StatusChip status={processResult.status} /></TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.invoiceType === 'standard' ? 'Clearance' : 'Reporting'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{new Date().toLocaleDateString('ar-SA')}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── XML Dialog ─── */}
      <Dialog open={xmlDialog} onClose={() => setXmlDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <XmlIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          محتوى XML — UBL 2.1
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={20}
            value={xmlResult}
            inputProps={{ dir: 'ltr', style: { fontFamily: 'monospace', fontSize: '11px' } }}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { navigator.clipboard.writeText(xmlResult); setSuccess('تم نسخ XML'); }}>
            نسخ
          </Button>
          <Button onClick={() => setXmlDialog(false)} variant="contained">إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* ─── QR Dialog ─── */}
      <Dialog open={qrDialog} onClose={() => setQrDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <QrIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          QR Code — TLV Encoding
        </DialogTitle>
        <DialogContent>
          {qrResult && (
            <Box textAlign="center">
              {qrResult.qrImage && (
                <img
                  src={`data:image/png;base64,${qrResult.qrImage}`}
                  alt="ZATCA QR Code"
                  style={{ maxWidth: 250, margin: '16px auto', display: 'block' }}
                />
              )}
              <Typography variant="caption" display="block" mt={1} sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 10 }}>
                TLV Base64: {qrResult.qrBase64 || qrResult.tlv || '—'}
              </Typography>
              <Box mt={2} textAlign="right">
                <Typography variant="body2"><strong>البائع:</strong> {qrResult.fields?.sellerName || invoice.sellerName}</Typography>
                <Typography variant="body2"><strong>الرقم الضريبي:</strong> {qrResult.fields?.vatNumber || invoice.sellerVatNumber}</Typography>
                <Typography variant="body2"><strong>الإجمالي:</strong> {total.toFixed(2)} ر.س</Typography>
                <Typography variant="body2"><strong>ضريبة القيمة المضافة:</strong> {vat.toFixed(2)} ر.س</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialog(false)} variant="contained">إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const CheckIcon = ClearedIcon;
