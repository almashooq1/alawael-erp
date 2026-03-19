/**
 * Data Encryption & Cryptography 🔐
 * نظام تشفير البيانات والتشفير المتقدم
 *
 * Features:
 * ✅ AES-256 encryption
 * ✅ End-to-end encryption
 * ✅ Key management
 * ✅ Certificate management
 * ✅ Hash algorithms
 * ✅ Encryption monitoring
 * ✅ Compliance tracking
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  LinearProgress,
  Alert,
  AlertTitle,
  Divider,
  Switch,
  Code,
} from '@mui/material';
import {
  VpnKey as KeyIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Security as SecurityIcon,
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const DataEncryption = () => {
  const [encryptionKeys, setEncryptionKeys] = useState([
    {
      id: 1,
      name: 'Master Key 1',
      algorithm: 'AES-256',
      keySize: 256,
      created: '2025-06-15',
      rotationDate: '2026-06-15',
      status: 'active',
      usage: 98765,
    },
    {
      id: 2,
      name: 'Master Key 2',
      algorithm: 'AES-256',
      keySize: 256,
      created: '2025-01-10',
      rotationDate: '2026-01-10',
      status: 'active',
      usage: 45321,
    },
    {
      id: 3,
      name: 'Backup Key',
      algorithm: 'AES-256',
      keySize: 256,
      created: '2024-12-01',
      rotationDate: '2025-12-01',
      status: 'archived',
      usage: 12543,
    },
  ]);

  const [dataEncryption, setDataEncryption] = useState([
    {
      id: 1,
      dataType: 'بيانات العملاء',
      encryptionStatus: 'encrypted',
      algorithm: 'AES-256-GCM',
      keyVersion: 1,
      dataSize: 2.5,
      lastScanned: '2026-01-16',
    },
    {
      id: 2,
      dataType: 'بيانات الدفع',
      encryptionStatus: 'encrypted',
      algorithm: 'AES-256-GCM',
      keyVersion: 1,
      dataSize: 0.8,
      lastScanned: '2026-01-16',
    },
    {
      id: 3,
      dataType: 'السجلات',
      encryptionStatus: 'encrypted',
      algorithm: 'AES-256-CBC',
      keyVersion: 2,
      dataSize: 5.2,
      lastScanned: '2026-01-15',
    },
    {
      id: 4,
      dataType: 'النسخ الاحتياطية',
      encryptionStatus: 'encrypted',
      algorithm: 'AES-256-GCM',
      keyVersion: 1,
      dataSize: 15.5,
      lastScanned: '2026-01-14',
    },
  ]);

  const [certificates, setCertificates] = useState([
    {
      id: 1,
      name: 'SSL/TLS Certificate',
      issuer: "Let's Encrypt",
      issueDate: '2025-06-15',
      expiryDate: '2026-06-15',
      status: 'valid',
      daysLeft: 151,
    },
    {
      id: 2,
      name: 'Wildcard Certificate',
      issuer: 'DigiCert',
      issueDate: '2025-03-10',
      expiryDate: '2026-03-10',
      status: 'valid',
      daysLeft: 53,
    },
    {
      id: 3,
      name: 'Code Signing Certificate',
      issuer: 'GlobalSign',
      issueDate: '2024-01-15',
      expiryDate: '2025-01-15',
      status: 'expired',
      daysLeft: -1,
    },
  ]);

  const [encryptionPolicies, setEncryptionPolicies] = useState([
    {
      id: 1,
      name: 'تشفير بيانات العملاء',
      enabled: true,
      algorithm: 'AES-256',
      enforcement: 'strict',
      compliance: 'GDPR',
    },
    {
      id: 2,
      name: 'تشفير الاتصالات',
      enabled: true,
      algorithm: 'TLS 1.3',
      enforcement: 'strict',
      compliance: 'NIST',
    },
    {
      id: 3,
      name: 'تشفير النسخ الاحتياطية',
      enabled: true,
      algorithm: 'AES-256',
      enforcement: 'moderate',
      compliance: 'ISO 27001',
    },
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);

  const stats = {
    activeKeys: encryptionKeys.filter(k => k.status === 'active').length,
    encryptedData: dataEncryption.filter(d => d.encryptionStatus === 'encrypted').length,
    validCerts: certificates.filter(c => c.status === 'valid').length,
    policies: encryptionPolicies.filter(p => p.enabled).length,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'مفاتيح نشطة', value: stats.activeKeys, icon: '🔑', color: '#667eea' },
          {
            label: 'بيانات مشفرة',
            value: `${stats.encryptedData}/${dataEncryption.length}`,
            icon: '🔒',
            color: '#4caf50',
          },
          { label: 'شهادات صالحة', value: stats.validCerts, icon: '✅', color: '#2196f3' },
          { label: 'سياسات مفعلة', value: stats.policies, icon: '📋', color: '#ff9800' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}05)`,
                border: `2px solid ${stat.color}30`,
              }}
            >
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Alert */}
      <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 3, borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>🔴 تنبيه حرج</AlertTitle>
        شهادة Code Signing انتهت صلاحيتها. يجب تجديدها فوراً.
      </Alert>

      {/* Encryption Keys */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        🔑 مفاتيح التشفير الرئيسية
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {encryptionKeys.map(key => (
          <Grid item xs={12} key={key.id}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {key.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ display: 'block', mt: 0.5 }}
                  >
                    {key.algorithm} • {key.keySize} bits
                  </Typography>
                </Box>
                <Chip
                  label={key.status === 'active' ? 'نشط' : 'مؤرشف'}
                  color={key.status === 'active' ? 'success' : 'default'}
                  size="small"
                />
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    تاريخ الإنشاء
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                    {key.created}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    تاريخ التدوير
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                    {key.rotationDate}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    عدد الاستخدامات
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                    {key.usage}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" startIcon={<RefreshIcon />} fullWidth>
                  تدوير المفتاح
                </Button>
                <Button size="small" variant="outlined" startIcon={<EditIcon />}>
                  تحرير
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Data Encryption Status */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        🔒 حالة تشفير البيانات
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#667eea' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>نوع البيانات</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الخوارزمية</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>إصدار المفتاح</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحجم</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataEncryption.map(data => (
              <TableRow key={data.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                <TableCell sx={{ fontWeight: 600 }}>{data.dataType}</TableCell>
                <TableCell>
                  <Chip label="مشفرة" color="success" size="small" icon={<LockIcon />} />
                </TableCell>
                <TableCell>
                  <Code sx={{ fontSize: 12, backgroundColor: '#f8f9ff', p: 1, borderRadius: 1 }}>
                    {data.algorithm}
                  </Code>
                </TableCell>
                <TableCell>{data.keyVersion}</TableCell>
                <TableCell>{data.dataSize} GB</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Certificates */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📜 الشهادات الرقمية
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {certificates.map(cert => (
          <Grid item xs={12} sm={6} key={cert.id}>
            <Card
              sx={{
                borderRadius: 2,
                borderLeft: cert.status === 'valid' ? '4px solid #4caf50' : '4px solid #f44336',
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {cert.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {cert.issuer}
                    </Typography>
                  </Box>
                  <Chip
                    label={cert.status === 'valid' ? 'صالحة' : 'منتهية'}
                    color={cert.status === 'valid' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      تاريخ الإصدار
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                      {cert.issueDate}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      تاريخ الانتهاء
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                      {cert.expiryDate}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      الأيام المتبقية
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color:
                          cert.daysLeft < 30
                            ? '#f44336'
                            : cert.daysLeft < 90
                              ? '#ff9800'
                              : '#4caf50',
                      }}
                    >
                      {cert.daysLeft >= 0 ? cert.daysLeft : 'منتهية'}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, Math.min(100, (cert.daysLeft / 365) * 100))}
                    sx={{ borderRadius: 2, height: 4 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Encryption Policies */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📋 سياسات التشفير
      </Typography>
      <List sx={{ backgroundColor: '#f8f9ff', borderRadius: 2 }}>
        {encryptionPolicies.map((policy, idx) => (
          <Box key={policy.id}>
            <ListItem sx={{ py: 2 }}>
              <ListItemIcon>
                {policy.enabled ? <LockIcon sx={{ color: '#4caf50' }} /> : <UnlockIcon />}
              </ListItemIcon>
              <ListItemText
                primary={policy.name}
                secondary={`${policy.algorithm} • ${policy.compliance}`}
              />
              <Box sx={{ textAlign: 'right', mr: 2 }}>
                <Chip label={policy.enforcement} size="small" variant="outlined" />
              </Box>
              <Switch checked={policy.enabled} />
            </ListItem>
            {idx < encryptionPolicies.length - 1 && <Divider />}
          </Box>
        ))}
      </List>
    </Box>
  );
};

export default DataEncryption;
