/**
 * لوحة تحكم شهادات البلوكتشين — Blockchain Certificates Dashboard
 */
import { useState, useEffect } from 'react';

import { getDashboard, certificatesService, templatesService } from '../../services/blockchainService';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';

const statusLabels = { draft: 'مسودة', issued: 'مصدرة', signed: 'موقعة', revoked: 'ملغاة' };
const statusColors = { draft: 'default', issued: 'info', signed: 'success', revoked: 'error' };

export default function BlockchainDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    Promise.all([
      getDashboard().catch(() => ({ data: {} })),
      certificatesService.getAll().catch(() => ({ data: [] })),
      templatesService.getAll().catch(() => ({ data: [] })),
    ]).then(([dash, certs, tmpl]) => {
      setData(dash.data || dash);
      setCertificates(Array.isArray(certs.data) ? certs.data : Array.isArray(certs) ? certs : []);
      setTemplates(Array.isArray(tmpl.data) ? tmpl.data : Array.isArray(tmpl) ? tmpl : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;

  const kpis = [
    { label: 'إجمالي الشهادات', value: certificates.length, icon: <CertIcon />, bg: '#e3f2fd' },
    { label: 'القوالب', value: templates.length, icon: <TemplateIcon />, bg: '#e8f5e9' },
    { label: 'شهادات مصدرة', value: certificates.filter(c => c.status === 'issued' || c.status === 'signed').length, icon: <VerifyIcon />, bg: '#fff3e0' },
    { label: 'ملغاة', value: certificates.filter(c => c.status === 'revoked').length, icon: <DashboardIcon />, bg: '#fce4ec' },
  ];

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>شهادات البلوكتشين</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        إدارة الشهادات الرقمية المعتمدة بتقنية البلوكتشين — إصدار، توقيع، تحقق
      </Typography>

      <Grid container spacing={2} mb={3}>
        {kpis.map((k) => (
          <Grid item xs={12} sm={6} md={3} key={k.label}>
            <Card sx={{ bgcolor: k.bg }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {k.icon}
                <Box>
                  <Typography variant="h5" fontWeight="bold">{k.value ?? 0}</Typography>
                  <Typography variant="body2">{k.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Certificates Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>آخر الشهادات</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>رقم الشهادة</TableCell>
              <TableCell>المستفيد</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>التاريخ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {certificates.slice(0, 10).map((cert, i) => (
              <TableRow key={cert._id || i}>
                <TableCell>{cert.certificateNumber || cert._id || '-'}</TableCell>
                <TableCell>{cert.recipientName || cert.recipient?.name || '-'}</TableCell>
                <TableCell>{cert.type || cert.template?.name || '-'}</TableCell>
                <TableCell>
                  <Chip label={statusLabels[cert.status] || cert.status || 'مسودة'} color={statusColors[cert.status] || 'default'} size="small" />
                </TableCell>
                <TableCell>{cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('ar') : '-'}</TableCell>
              </TableRow>
            ))}
            {certificates.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">لا توجد شهادات بعد</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
