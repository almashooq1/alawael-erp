/**
 * ===================================================================
 * ACCOUNTS LIST - قائمة دليل الحسابات
 * ===================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  AccountBalance,
  Search
} from '@mui/icons-material';
import axios from 'axios';

const AccountsList = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameEn: '',
    type: 'asset',
    category: '',
    description: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, [searchTerm, filterType]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('/api/accounting/accounts', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          searchTerm,
          type: filterType || undefined
        }
      });

      setAccounts(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في تحميل الحسابات');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        code: account.code,
        name: account.name,
        nameEn: account.nameEn || '',
        type: account.type,
        category: account.category || '',
        description: account.description || ''
      });
    } else {
      setEditingAccount(null);
      setFormData({
        code: '',
        name: '',
        nameEn: '',
        type: 'asset',
        category: '',
        description: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAccount(null);
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (editingAccount) {
        await axios.put(
          `/api/accounting/accounts/${editingAccount._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          '/api/accounting/accounts',
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      handleCloseDialog();
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في حفظ الحساب');
    }
  };

  const accountTypes = [
    { value: 'asset', label: 'أصول', color: 'primary' },
    { value: 'liability', label: 'خصوم', color: 'error' },
    { value: 'equity', label: 'حقوق ملكية', color: 'info' },
    { value: 'revenue', label: 'إيرادات', color: 'success' },
    { value: 'expense', label: 'مصروفات', color: 'warning' }
  ];

  const getTypeLabel = (type) => {
    return accountTypes.find(t => t.value === type)?.label || type;
  };

  const getTypeColor = (type) => {
    return accountTypes.find(t => t.value === type)?.color || 'default';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
          دليل الحسابات
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          حساب جديد
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2}>
            <TextField
              fullWidth
              placeholder="بحث بالكود أو الاسم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
            <TextField
              select
              label="تصفية حسب النوع"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">الكل</MenuItem>
              {accountTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الكود</TableCell>
                <TableCell>اسم الحساب</TableCell>
                <TableCell>الاسم الإنجليزي</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">
                      لا توجد حسابات
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {account.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{account.nameEn || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeLabel(account.type)}
                        color={getTypeColor(account.type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={account.isActive ? 'نشط' : 'غير نشط'}
                        color={account.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(account)}
                      >
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Dialog للإضافة/التعديل */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingAccount ? 'تعديل حساب' : 'حساب جديد'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="الكود *"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              fullWidth
              disabled={!!editingAccount}
            />
            <TextField
              label="اسم الحساب *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="الاسم الإنجليزي"
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="النوع *"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              fullWidth
            >
              {accountTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="الوصف"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button onClick={handleSubmit} variant="contained">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountsList;
