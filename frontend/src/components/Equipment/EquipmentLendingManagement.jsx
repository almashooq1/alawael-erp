/**
 * Equipment Lending Management
 * إدارة متقدمة لإعارة المعدات للمنزل والاستخدام الخارجي
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  Paper,
  Chip,
  Alert,
  Grid,
  Typography,
  Stack,
  Rating,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormGroup,
  Checkbox,
  FileUpload,
  Avatar,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/material';
import {
  ArrowOutward as ArrowOutwardIcon,
  ArrowInward as ArrowInwardIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  LocalShipping as LocalShippingIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';

const EquipmentLendingManagement = () => {
  const [lendings, setLendings] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openBorrowDialog, setOpenBorrowDialog] = useState(false);
  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [selectedLending, setSelectedLending] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const { get, post } = useApi();
  const { user } = useAuth();

  // نموذج الإعارة
  const [borrowForm, setBorrowForm] = useState({
    equipmentId: '',
    expectedReturnDate: '',
    lendingType: 'in_house',
    borrowLocation: '',
    department: '',
  });

  // نموذج الإرجاع
  const [returnForm, setReturnForm] = useState({
    condition: 'good',
    notes: '',
    images: [],
    issues: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [lendingRes, overdueRes, equipmentRes] = await Promise.all([
        get('/api/lending'),
        get('/api/lending/overdue'),
        get('/api/equipment?status=available'),
      ]);

      setLendings(lendingRes.data);
      setOverdue(overdueRes.data);
      setEquipment(equipmentRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async () => {
    try {
      await post('/api/lending/borrow', borrowForm);
      setOpenBorrowDialog(false);
      setBorrowForm({
        equipmentId: '',
        expectedReturnDate: '',
        lendingType: 'in_house',
        borrowLocation: '',
        department: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error borrowing equipment:', error);
    }
  };

  const handleReturn = async () => {
    try {
      await post(`/api/lending/${selectedLending._id}/return`, returnForm);
      setOpenReturnDialog(false);
      setReturnForm({
        condition: 'good',
        notes: '',
        images: [],
        issues: [],
      });
      fetchData();
    } catch (error) {
      console.error('Error returning equipment:', error);
    }
  };

  const getLendingTypeLabel = (type) => {
    const labels = {
      in_house: 'إعارة داخلية',
      home_loan: 'إعارة للمنزل',
      temporary: 'إعارة مؤقتة',
      demo: 'عرض توضيحي',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'info',
      returned: 'success',
      overdue: 'error',
      damaged: 'warning',
      lost: 'error',
    };
    return colors[status] || 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
          🏭 إدارة إعارة المعدات
        </Typography>
        <Typography variant="body1" color="textSecondary">
          نظام متقدم لتتبع إعارة المعدات للاستخدام المنزلي والخارجي
        </Typography>
      </Box>

      {/* Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Typography variant="h5" gutterBottom>
                {lendings.filter((l) => l.status === 'active').length}
              </Typography>
              <Typography variant="body2">إعارات نشطة حالياً</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Typography variant="h5" gutterBottom>
                {overdue.length}
              </Typography>
              <Typography variant="body2">إعارات متأخرة 🔴</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Typography variant="h5" gutterBottom>
                {lendings.filter((l) => l.status === 'returned').length}
              </Typography>
              <Typography variant="body2">معدات مرتجعة بنجاح</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Overdue Alerts */}
      {overdue.length > 0 && (
        <Alert
          severity="error"
          icon={<WarningIcon />}
          sx={{ mb: 3 }}
          action={<Button color="inherit" size="small">تتبع</Button>}
        >
          ⚠️ {overdue.length} إعارات متأخرة تتطلب متابعة فورية
        </Alert>
      )}

      {/* Tabs & Actions */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="قائمة الإعارات"
          action={
            <Button
              variant="contained"
              startIcon={<ArrowOutwardIcon />}
              onClick={() => setOpenBorrowDialog(true)}
              sx={{ borderRadius: 2 }}
            >
              ➕ إعارة معدة
            </Button>
          }
        />

        <CardContent>
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>المعدة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>المستعير</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>نوع الإعارة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>من</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>إلى</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lendings.map((lending) => (
                  <TableRow
                    key={lending._id}
                    hover
                    sx={{
                      backgroundColor:
                        lending.status === 'overdue' ? '#ffebee' : 'transparent',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {lending.equipment?.name}
                    </TableCell>
                    <TableCell>{lending.borrower?.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={getLendingTypeLabel(lending.lendingType)}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(lending.borrowDate).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      {new Date(lending.expectedReturnDate).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={lending.status}
                        color={getStatusColor(lending.status)}
                        size="small"
                        icon={
                          lending.status === 'overdue' ? (
                            <WarningIcon />
                          ) : lending.status === 'returned' ? (
                            <CheckCircleIcon />
                          ) : (
                            <ScheduleIcon />
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {lending.status === 'active' && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ArrowInwardIcon />}
                          onClick={() => {
                            setSelectedLending(lending);
                            setOpenReturnDialog(true);
                          }}
                        >
                          إرجاع
                        </Button>
                      )}
                      {lending.status === 'returned' && (
                        <Button size="small" disabled>
                          مرتجعة
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {lendings.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <LocalShippingIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
              <Typography color="textSecondary">
                لا توجد إعارات حالياً
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Borrow Dialog */}
      <Dialog open={openBorrowDialog} onClose={() => setOpenBorrowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>🏭 إعارة معدة جديدة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>المعدة</InputLabel>
              <Select
                value={borrowForm.equipmentId}
                onChange={(e) =>
                  setBorrowForm({ ...borrowForm, equipmentId: e.target.value })
                }
                label="المعدة"
              >
                {equipment.map((item) => (
                  <MenuItem key={item._id} value={item._id}>
                    {item.name} ({item.equipmentId})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="تاريخ الإرجاع المتوقع"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={borrowForm.expectedReturnDate}
              onChange={(e) =>
                setBorrowForm({ ...borrowForm, expectedReturnDate: e.target.value })
              }
            />

            <FormControl fullWidth>
              <InputLabel>نوع الإعارة</InputLabel>
              <Select
                value={borrowForm.lendingType}
                onChange={(e) =>
                  setBorrowForm({ ...borrowForm, lendingType: e.target.value })
                }
                label="نوع الإعارة"
              >
                <MenuItem value="in_house">إعارة داخلية</MenuItem>
                <MenuItem value="home_loan">إعارة للمنزل</MenuItem>
                <MenuItem value="temporary">إعارة مؤقتة</MenuItem>
                <MenuItem value="demo">عرض توضيحي</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="موقع الاستخدام"
              placeholder="المنزل، المركز، الخارج..."
              value={borrowForm.borrowLocation}
              onChange={(e) =>
                setBorrowForm({ ...borrowForm, borrowLocation: e.target.value })
              }
            />

            <TextField
              fullWidth
              label="القسم / الجهة"
              placeholder="اختياري"
              value={borrowForm.department}
              onChange={(e) =>
                setBorrowForm({ ...borrowForm, department: e.target.value })
              }
            />

            <Alert severity="info">
              ℹ️ تأكد من تاريخ الإرجاع - ستتلقى تذكيرات قبل الموعد بـ 3 أيام
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBorrowDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleBorrow}>
            ✓ تأكيد الإعارة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={openReturnDialog} onClose={() => setOpenReturnDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📦 إرجاع معدة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedLending && (
            <Stack spacing={2}>
              <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  المعدة المرتجعة:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {selectedLending.equipment?.name}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  ✨ حالة المعدة:
                </Typography>
                <RadioGroup
                  value={returnForm.condition}
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, condition: e.target.value })
                  }
                >
                  <FormControlLabel value="excellent" control={<Radio />} label="ممتازة" />
                  <FormControlLabel value="good" control={<Radio />} label="جيدة" />
                  <FormControlLabel value="fair" control={<Radio />} label="مقبولة" />
                  <FormControlLabel value="poor" control={<Radio />} label="سيئة" />
                  <FormControlLabel value="damaged" control={<Radio />} label="تالفة" />
                </RadioGroup>
              </Box>

              {returnForm.condition === 'damaged' && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="وصف الأضرار"
                  placeholder="اشرح الأضرار التي حدثت..."
                  value={returnForm.notes}
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, notes: e.target.value })
                  }
                />
              )}

              <FormGroup>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  مشاكل أثناء الاستخدام:
                </Typography>
                <FormControlLabel
                  control={<Checkbox />}
                  label="مشاكل تقنية"
                />
                <FormControlLabel
                  control={<Checkbox />}
                  label="بطاريات ضعيفة"
                />
                <FormControlLabel
                  control={<Checkbox />}
                  label="قطع مفقودة"
                />
                <FormControlLabel
                  control={<Checkbox />}
                  label="احتاج لمعايرة"
                />
              </FormGroup>

              <Alert severity="info">
                📸 يمكنك رفع صور للتوثيق (اختياري)
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReturnDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleReturn}>
            ✓ تأكيد الإرجاع
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EquipmentLendingManagement;
