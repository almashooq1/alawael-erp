/**
 * Compliance Management System ✅
 * نظام إدارة الامتثال والتشريعات
 *
 * Features:
 * ✅ Compliance tracking
 * ✅ Regulatory requirements
 * ✅ Audit trails
 * ✅ Documentation management
 * ✅ Risk assessment
 * ✅ Certification management
 * ✅ Compliance reports
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
  LinearProgress,
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
  Alert,
  AlertTitle,
  Divider,
} from '@mui/material';
import {
  Verified as VerifiedIcon,
  AssignmentTurnedIn as ComplianceIcon,
  Gavel as LegalIcon,
  Description as DocIcon,
  Assessment as RiskIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Bookmark as BookmarkIcon,
} from '@mui/icons-material';

const ComplianceManagement = () => {
  const [regulations, setRegulations] = useState([
    {
      id: 1,
      name: 'GDPR - حماية البيانات الشخصية',
      category: 'privacy',
      status: 'compliant',
      lastAudit: '2025-12-15',
      nextAudit: '2026-06-15',
      riskLevel: 'low',
      score: 95,
    },
    {
      id: 2,
      name: 'PCI-DSS - معايير أمان بطاقات الائتمان',
      category: 'payment',
      status: 'compliant',
      lastAudit: '2025-11-20',
      nextAudit: '2026-05-20',
      riskLevel: 'low',
      score: 98,
    },
    {
      id: 3,
      name: 'ISO 27001 - إدارة الأمان',
      category: 'security',
      status: 'compliant',
      lastAudit: '2025-10-10',
      nextAudit: '2026-04-10',
      riskLevel: 'low',
      score: 92,
    },
    {
      id: 4,
      name: 'HIPAA - حماية البيانات الصحية',
      category: 'health',
      status: 'partial',
      lastAudit: '2025-12-01',
      nextAudit: '2026-02-01',
      riskLevel: 'medium',
      score: 75,
    },
    {
      id: 5,
      name: 'SOC 2 - معايير الخدمات',
      category: 'operations',
      status: 'under-review',
      lastAudit: '2025-09-15',
      nextAudit: '2026-03-15',
      riskLevel: 'high',
      score: 68,
    },
  ]);

  const [documents, setDocuments] = useState([
    { id: 1, name: 'سياسة الخصوصية', regulation: 'GDPR', status: 'approved', lastReview: '2026-01-10', nextReview: '2026-07-10' },
    { id: 2, name: 'شروط الخدمة', regulation: 'General', status: 'approved', lastReview: '2025-12-20', nextReview: '2026-06-20' },
    { id: 3, name: 'سياسة الأمان', regulation: 'ISO 27001', status: 'under-review', lastReview: '2025-11-15', nextReview: '2026-05-15' },
    { id: 4, name: 'إجراء التدقيق', regulation: 'SOC 2', status: 'draft', lastReview: '2025-10-01', nextReview: '2026-04-01' },
  ]);

  const [certifications, setCertifications] = useState([
    { id: 1, name: 'شهادة GDPR', issuer: 'EDPB', issueDate: '2025-06-15', expiryDate: '2026-06-15', status: 'active', renewalCost: 5000 },
    {
      id: 2,
      name: 'شهادة PCI-DSS',
      issuer: 'PCI Security Council',
      issueDate: '2025-08-20',
      expiryDate: '2026-08-20',
      status: 'active',
      renewalCost: 8000,
    },
    {
      id: 3,
      name: 'شهادة ISO 27001',
      issuer: 'TÜV',
      issueDate: '2025-04-10',
      expiryDate: '2027-04-10',
      status: 'active',
      renewalCost: 12000,
    },
  ]);

  const [openDialog, setOpenDialog] = useState(false);

  const stats = {
    compliant: regulations.filter(r => r.status === 'compliant').length,
    partial: regulations.filter(r => r.status === 'partial').length,
    total: regulations.length,
    avgScore: Math.round(regulations.reduce((sum, r) => sum + r.score, 0) / regulations.length),
  };

  const getStatusColor = status => {
    if (status === 'compliant') return '#4caf50';
    if (status === 'partial') return '#ff9800';
    return '#f44336';
  };

  const getRiskColor = risk => {
    if (risk === 'low') return '#4caf50';
    if (risk === 'medium') return '#ff9800';
    return '#f44336';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'متوافقة', value: stats.compliant, icon: '✅', color: '#4caf50' },
          { label: 'جزئية', value: stats.partial, icon: '⚠️', color: '#ff9800' },
          { label: 'الإجمالي', value: stats.total, icon: '📋', color: '#667eea' },
          { label: 'متوسط النقاط', value: stats.avgScore, icon: '📊', color: '#2196f3' },
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

      {/* Compliance Alert */}
      <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3, borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>⚠️ تنبيه الامتثال</AlertTitle>
        هناك 2 متطلبات امتثال تحتاج إلى إجراء: SOC 2 و HIPAA
      </Alert>

      {/* Regulations */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📋 المتطلبات التنظيمية
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {regulations.map(reg => (
          <Grid item xs={12} key={reg.id}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {reg.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                    التصنيف: {reg.category}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label={reg.status === 'compliant' ? 'متوافق' : reg.status === 'partial' ? 'جزئي' : 'قيد المراجعة'}
                    color={reg.status === 'compliant' ? 'success' : reg.status === 'partial' ? 'warning' : 'error'}
                    size="small"
                  />
                  <Chip
                    label={reg.riskLevel === 'low' ? 'خطر منخفض' : reg.riskLevel === 'medium' ? 'خطر متوسط' : 'خطر عالي'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="textSecondary">
                    نقاط الامتثال
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: reg.score >= 80 ? '#4caf50' : '#ff9800' }}>
                    {reg.score}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={reg.score} sx={{ borderRadius: 2, height: 6 }} />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    آخر تدقيق
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                    {reg.lastAudit}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    التدقيق التالي
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                    {reg.nextAudit}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Documents */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📄 المستندات
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#667eea' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المستند</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المتطلب</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>آخر مراجعة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map(doc => (
              <TableRow key={doc.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                <TableCell sx={{ fontWeight: 600 }}>{doc.name}</TableCell>
                <TableCell>{doc.regulation}</TableCell>
                <TableCell>
                  <Chip
                    label={doc.status === 'approved' ? 'موافق عليه' : doc.status === 'under-review' ? 'قيد المراجعة' : 'مسودة'}
                    color={doc.status === 'approved' ? 'success' : doc.status === 'under-review' ? 'warning' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{doc.lastReview}</TableCell>
                <TableCell align="center">
                  <Button size="small" startIcon={<EditIcon />}>
                    تحرير
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Certifications */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        🏆 الشهادات
      </Typography>
      <Grid container spacing={2}>
        {certifications.map(cert => (
          <Grid item xs={12} sm={6} key={cert.id}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {cert.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {cert.issuer}
                    </Typography>
                  </Box>
                  <Chip label="نشطة" color="success" size="small" />
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
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

                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1.5 }}>
                  💰 تكلفة التجديد: ₪{cert.renewalCost}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ComplianceManagement;
