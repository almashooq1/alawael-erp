/**
 * BehaviorManagement — إدارة السلوك
 * Behavior Management & Intervention Tracking
 */
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AddIcon from '@mui/icons-material/Add';

const BEHAVIOR_RECORDS = [
  {
    id: 1,
    date: '2026-03-25',
    behavior: 'نوبة غضب في الفصل',
    severity: 'متوسط',
    trigger: 'صعوبة في المهمة',
    intervention: 'التهدئة والتحويل',
    outcome: 'نجح',
  },
  {
    id: 2,
    date: '2026-03-27',
    behavior: 'رفض التعاون مع المعالج',
    severity: 'خفيف',
    trigger: 'الإجهاد',
    intervention: 'استراحة مؤقتة',
    outcome: 'نجح جزئياً',
  },
  {
    id: 3,
    date: '2026-03-28',
    behavior: 'سلوك إيذاء ذاتي',
    severity: 'شديد',
    trigger: 'الإحباط',
    intervention: 'تدخل فوري + إخطار الأسرة',
    outcome: 'جاري المتابعة',
  },
];

const SEVERITY_COLORS = {
  خفيف: 'success',
  متوسط: 'warning',
  شديد: 'error',
};

export default function BehaviorManagement() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
    }, 1500);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <PsychologyIcon color="primary" sx={{ fontSize: 36 }} />
          <Typography variant="h4" fontWeight="bold">
            إدارة السلوك
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          تسجيل حادثة سلوكية
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        {[
          { label: 'إجمالي الحوادث (هذا الشهر)', value: BEHAVIOR_RECORDS.length, color: 'primary' },
          { label: 'حوادث شديدة', value: BEHAVIOR_RECORDS.filter(r => r.severity === 'شديد').length, color: 'error' },
          { label: 'تدخلات ناجحة', value: BEHAVIOR_RECORDS.filter(r => r.outcome === 'نجح').length, color: 'success' },
        ].map(stat => (
          <Grid item xs={12} sm={4} key={stat.label}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight="bold" color={`${stat.color}.main`}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Records Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>التاريخ</TableCell>
              <TableCell>السلوك</TableCell>
              <TableCell align="center">الحدة</TableCell>
              <TableCell>المحفز</TableCell>
              <TableCell>التدخل</TableCell>
              <TableCell align="center">النتيجة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {BEHAVIOR_RECORDS.map(record => (
              <TableRow key={record.id} hover>
                <TableCell>{record.date}</TableCell>
                <TableCell>{record.behavior}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={record.severity}
                    color={SEVERITY_COLORS[record.severity]}
                    size="small"
                  />
                </TableCell>
                <TableCell>{record.trigger}</TableCell>
                <TableCell>{record.intervention}</TableCell>
                <TableCell align="center">
                  <Chip label={record.outcome} size="small" variant="outlined" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Incident Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل حادثة سلوكية جديدة</DialogTitle>
        <DialogContent>
          {submitted ? (
            <Alert severity="success">تم تسجيل الحادثة بنجاح</Alert>
          ) : (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="التاريخ" type="date" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>الحدة</InputLabel>
                  <Select defaultValue="متوسط" label="الحدة">
                    <MenuItem value="خفيف">خفيف</MenuItem>
                    <MenuItem value="متوسط">متوسط</MenuItem>
                    <MenuItem value="شديد">شديد</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="وصف السلوك" multiline rows={2} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="المحفز / السبب" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="التدخل المتخذ" multiline rows={2} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitted}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
