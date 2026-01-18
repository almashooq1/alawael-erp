import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  InputAdornment,
} from '@mui/material';
import { Add, Search, Edit, Delete } from '@mui/icons-material';
import api from '../services/api';
import { toast } from 'react-toastify';

export default function HRPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    salary: '',
    department: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/hrops/employees');
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('فشل تحميل بيانات الموظفين');
      // Demo data fallback
      setEmployees([
        { _id: '1', name: 'أحمد محمد', email: 'ahmed@company.com', position: 'مدير', department: 'الإدارة', salary: 5000, status: 'active' },
        { _id: '2', name: 'فاطمة علي', email: 'fatima@company.com', position: 'محاسب', department: 'المالية', salary: 3500, status: 'active' },
        { _id: '3', name: 'خالد سعيد', email: 'khaled@company.com', position: 'مطور', department: 'التقنية', salary: 4000, status: 'active' },
      ]);
    }
    setLoading(false);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ name: '', email: '', position: '', salary: '', department: '' });
  };

  const handleSubmit = async () => {
    try {
      await api.post('/hrops/employees', formData);
      toast.success('تم إضافة الموظف بنجاح');
      handleCloseDialog();
      fetchEmployees();
    } catch (error) {
      toast.error('فشلت عملية الإضافة');
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          إدارة الموظفين
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenDialog}>
          إضافة موظف جديد
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <TextField
          fullWidth
          placeholder="بحث عن موظف..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell>البريد الإلكتروني</TableCell>
                <TableCell>الوظيفة</TableCell>
                <TableCell>القسم</TableCell>
                <TableCell>الراتب</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee._id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>₪{employee.salary}</TableCell>
                  <TableCell>
                    <Chip
                      label={employee.status === 'active' ? 'نشط' : 'غير نشط'}
                      color={employee.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<Edit />}>تعديل</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Employee Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة موظف جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الاسم الكامل"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الوظيفة"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="القسم"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الراتب"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
