/**
 * Maintenance & Inspection Module - مكون الصيانة والفحص
 * 
 * إدارة شاملة لجدول الصيانة والفحص الدوري
 * ✅ Maintenance Scheduling
 * ✅ Inspection Records
 * ✅ Service History
 * ✅ Cost Tracking
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Wrench as WrenchIcon,
} from '@mui/icons-material';

const MaintenanceModule = ({ vehicleId }) => {
  // حالات
  const [maintenanceSchedule, setMaintenanceSchedule] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [inspectionRecords, setInspectionRecords] = useState([]);
  // const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openInspectionDialog, setOpenInspectionDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  // نموذج الصيانة
  const [maintenanceForm, setMaintenanceForm] = useState({
    type: 'عام',
    description: '',
    cost: 0,
    provider: '',
    mileage: 0,
    notes: '',
  });

  // نموذج الفحص
  const [inspectionForm, setInspectionForm] = useState({
    result: 'معايير',
    notes: '',
    inspector: '',
    emissionStatus: 'جيد',
    safetyStatus: 'جيد',
  });

  // جلب البيانات عند التحميل
  useEffect(() => {
    loadMaintenanceData();
  }, [vehicleId]);

  const loadMaintenanceData = async () => {
    try {
      setLoading(true);

      // محاكاة جلب البيانات
      const scheduleData = {
        lastMaintenanceDate: new Date('2024-01-15'),
        nextMaintenanceDate: new Date('2024-02-15'),
        estimatedCost: 500,
        maintenanceItems: {
          oil: { interval: 5000, lastDone: new Date('2024-01-15') },
          filter: { interval: 10000, lastDone: new Date('2024-01-15') },
          tires: { interval: 20000, lastDone: new Date('2023-12-01') },
          brakes: { interval: 40000, lastDone: new Date('2023-06-01') },
        },
      };

      const historyData = [
        {
          id: '1',
          date: new Date('2024-01-15'),
          type: 'عام',
          description: 'تبديل الزيت والفلتر',
          cost: 300,
          provider: 'مركز الصيانة الرئيسي',
          mileage: 45000,
        },
        {
          id: '2',
          date: new Date('2023-12-01'),
          type: 'إطارات',
          description: 'تبديل الإطارات الأمامية',
          cost: 800,
          provider: 'متجر الإطارات',
          mileage: 43000,
        },
      ];

      const inspectionData = [
        {
          id: '1',
          date: new Date('2024-01-10'),
          result: 'معايير',
          inspector: 'أحمد محمد',
          emissionStatus: 'جيد',
          safetyStatus: 'جيد',
        },
        {
          id: '2',
          date: new Date('2023-01-05'),
          result: 'معايير',
          inspector: 'محمد علي',
          emissionStatus: 'جيد',
          safetyStatus: 'جيد',
        },
      ];

      setMaintenanceSchedule(scheduleData);
      setMaintenanceHistory(historyData);
      setInspectionRecords(inspectionData);
    } catch (error) {
      console.error('خطأ في جلب بيانات الصيانة:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaintenance = () => {
    setMaintenanceForm({
      type: 'عام',
      description: '',
      cost: 0,
      provider: '',
      mileage: 0,
      notes: '',
    });
    setOpenDialog(true);
  };

  const handleSaveMaintenance = async () => {
    try {
      // إرسال البيانات للخادم
      const newMaintenance = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date(),
        ...maintenanceForm,
      };

      setMaintenanceHistory([newMaintenance, ...maintenanceHistory]);
      setOpenDialog(false);
      setMaintenanceForm({
        type: 'عام',
        description: '',
        cost: 0,
        provider: '',
        mileage: 0,
        notes: '',
      });

      // إعادة تحميل البيانات
      loadMaintenanceData();
    } catch (error) {
      console.error('خطأ في حفظ الصيانة:', error);
    }
  };

  const handleAddInspection = () => {
    setInspectionForm({
      result: 'معايير',
      notes: '',
      inspector: '',
      emissionStatus: 'جيد',
      safetyStatus: 'جيد',
    });
    setOpenInspectionDialog(true);
  };

  const handleSaveInspection = async () => {
    try {
      const newInspection = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date(),
        ...inspectionForm,
      };

      setInspectionRecords([newInspection, ...inspectionRecords]);
      setOpenInspectionDialog(false);

      // إعادة تحميل البيانات
      loadMaintenanceData();
    } catch (error) {
      console.error('خطأ في حفظ الفحص:', error);
    }
  };

  const getMaintenanceTypeColor = type => {
    const colors = {
      عام: 'info',
      زيت: 'primary',
      فلتر: 'secondary',
      إطارات: 'warning',
      فرامل: 'error',
      بطارية: 'success',
    };
    return colors[type] || 'default';
  };

  // Reserved for future use
  // eslint-disable-next-line no-unused-vars
  const _getMaintenanceStatus = scheduledDate => {
    const now = new Date();
    if (now > scheduledDate) {
      return { status: 'متأخر', color: 'error' };
    }
    const daysLeft = Math.floor((scheduledDate - now) / (1000 * 60 * 60 * 24));
    if (daysLeft < 7) {
      return { status: 'عاجل', color: 'warning' };
    }
    return { status: 'جاهز', color: 'success' };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        جاري التحميل...
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* الرأس */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          🔧 إدارة الصيانة والفحص
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddMaintenance}
            sx={{ borderRadius: 2 }}
          >
            إضافة صيانة
          </Button>
          <Button
            variant="outlined"
            startIcon={<ScheduleIcon />}
            onClick={handleAddInspection}
            sx={{ borderRadius: 2 }}
          >
            تسجيل فحص
          </Button>
        </Box>
      </Box>

      {/* جدول الصيانة */}
      {maintenanceSchedule && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* الصيانة التالية */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <WrenchIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="caption">الصيانة التالية</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {maintenanceSchedule.nextMaintenanceDate.toLocaleDateString('ar-SA')}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
              <Typography variant="body2">
                📍 التكلفة المتوقعة: {maintenanceSchedule.estimatedCost} ر.س
              </Typography>
            </Paper>
          </Grid>

          {/* آخر صيانة */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="caption">آخر صيانة</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {maintenanceSchedule.lastMaintenanceDate.toLocaleDateString('ar-SA')}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
              <Typography variant="body2">
                ✓ الحالة: تم إجراء الصيانة بنجاح
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* جدول العناصر المخطط صيانتها */}
      {maintenanceSchedule && (
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            📋 جدول الصيانة المنتظم
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(maintenanceSchedule.maintenanceItems).map(([key, item]) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      {key === 'oil' && '🛢️ تغيير الزيت'}
                      {key === 'filter' && '🔽 تغيير الفلتر'}
                      {key === 'tires' && '🛞 إطارات'}
                      {key === 'brakes' && '🛑 فرامل'}
                      {key === 'battery' && '🔋 بطارية'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      المسافة: كل {item.interval.toLocaleString('ar-SA')} كم
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      آخر صيانة: {item.lastDone.toLocaleDateString('ar-SA')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* سجل الصيانة */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            📝 سجل الصيانة ({maintenanceHistory.length})
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f9f9f9' }}>
                <TableCell sx={{ fontWeight: 600 }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>الوصف</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>التكلفة</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>المزود</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>المسافة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {maintenanceHistory.map(record => (
                <TableRow key={record.id} hover>
                  <TableCell>
                    {new Date(record.date).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.type}
                      size="small"
                      color={getMaintenanceTypeColor(record.type)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{record.description}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {record.cost} ر.س
                  </TableCell>
                  <TableCell>{record.provider}</TableCell>
                  <TableCell>{record.mileage.toLocaleString('ar-SA')} كم</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* سجل الفحص */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            ✅ سجل الفحص الدوري ({inspectionRecords.length})
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f9f9f9' }}>
                <TableCell sx={{ fontWeight: 600 }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>النتيجة</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>حالة الانبعاثات</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>حالة الأمان</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>المفتش</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inspectionRecords.map(record => (
                <TableRow key={record.id} hover>
                  <TableCell>
                    {new Date(record.date).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.result}
                      size="small"
                      color={record.result === 'معايير' ? 'success' : 'error'}
                      icon={record.result === 'معايير' ? '✓' : '✕'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.emissionStatus}
                      size="small"
                      variant="outlined"
                      color={record.emissionStatus === 'جيد' ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.safetyStatus}
                      size="small"
                      variant="outlined"
                      color={record.safetyStatus === 'جيد' ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>{record.inspector}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* نافذة إضافة صيانة */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          🔧 إضافة سجل صيانة
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>نوع الصيانة</InputLabel>
              <Select
                value={maintenanceForm.type}
                onChange={e => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                label="نوع الصيانة"
              >
                <MenuItem value="عام">عام</MenuItem>
                <MenuItem value="زيت">تغيير الزيت</MenuItem>
                <MenuItem value="فلتر">تغيير الفلتر</MenuItem>
                <MenuItem value="إطارات">إطارات</MenuItem>
                <MenuItem value="فرامل">فرامل</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="الوصف"
              value={maintenanceForm.description}
              onChange={e => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />

            <TextField
              label="التكلفة (ر.س)"
              type="number"
              value={maintenanceForm.cost}
              onChange={e => setMaintenanceForm({ ...maintenanceForm, cost: parseFloat(e.target.value) })}
              fullWidth
            />

            <TextField
              label="المزود/مركز الصيانة"
              value={maintenanceForm.provider}
              onChange={e => setMaintenanceForm({ ...maintenanceForm, provider: e.target.value })}
              fullWidth
            />

            <TextField
              label="قراءة العداد (كم)"
              type="number"
              value={maintenanceForm.mileage}
              onChange={e => setMaintenanceForm({ ...maintenanceForm, mileage: parseFloat(e.target.value) })}
              fullWidth
            />

            <TextField
              label="ملاحظات"
              value={maintenanceForm.notes}
              onChange={e => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)} variant="outlined">
            إلغاء
          </Button>
          <Button onClick={handleSaveMaintenance} variant="contained" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة تسجيل الفحص */}
      <Dialog open={openInspectionDialog} onClose={() => setOpenInspectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          ✅ تسجيل فحص دوري
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>النتيجة</InputLabel>
              <Select
                value={inspectionForm.result}
                onChange={e => setInspectionForm({ ...inspectionForm, result: e.target.value })}
                label="النتيجة"
              >
                <MenuItem value="معايير">✓ معايير</MenuItem>
                <MenuItem value="رسب">✕ رسب</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>حالة الانبعاثات</InputLabel>
              <Select
                value={inspectionForm.emissionStatus}
                onChange={e => setInspectionForm({ ...inspectionForm, emissionStatus: e.target.value })}
                label="حالة الانبعاثات"
              >
                <MenuItem value="جيد">جيد</MenuItem>
                <MenuItem value="متوسط">متوسط</MenuItem>
                <MenuItem value="سيء">سيء</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>حالة الأمان</InputLabel>
              <Select
                value={inspectionForm.safetyStatus}
                onChange={e => setInspectionForm({ ...inspectionForm, safetyStatus: e.target.value })}
                label="حالة الأمان"
              >
                <MenuItem value="جيد">جيد</MenuItem>
                <MenuItem value="متوسط">متوسط</MenuItem>
                <MenuItem value="سيء">سيء</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="المفتش"
              value={inspectionForm.inspector}
              onChange={e => setInspectionForm({ ...inspectionForm, inspector: e.target.value })}
              fullWidth
            />

            <TextField
              label="ملاحظات"
              value={inspectionForm.notes}
              onChange={e => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenInspectionDialog(false)} variant="outlined">
            إلغاء
          </Button>
          <Button onClick={handleSaveInspection} variant="contained" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenanceModule;
