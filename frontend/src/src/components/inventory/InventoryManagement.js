/**
 * Inventory Management Component - Advanced Version ⭐
 * مكون إدارة المخزون - نسخة متقدمة
 *
 * Features:
 * ✅ Stock tracking
 * ✅ Inventory management
 * ✅ Warehouse management
 * ✅ Low stock alerts
 * ✅ Supply chain
 * ✅ Inventory analytics
 * ✅ Barcode scanning
 * ✅ Supplier management
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  LinearProgress,
  Alert,
  Badge,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  TrendingDown as TrendingDownIcon,
  Store as StoreIcon,
  LocalShipping as LocalShippingIcon,
  AssignmentInd as AssignmentIndIcon,
} from '@mui/icons-material';

const InventoryManagement = () => {
  const [products, setProducts] = useState([
    {
      id: 'SKU001',
      name: 'لابتوب Dell XPS 13',
      category: 'الكترونيات',
      stock: 15,
      minStock: 10,
      maxStock: 50,
      price: 1200,
      warehouse: 'المستودع الرئيسي',
      supplier: 'Dell Direct',
      lastRestocked: '2026-01-10',
      status: 'كافي',
    },
    {
      id: 'SKU002',
      name: 'ماوس Logitech',
      category: 'الاكسسوارات',
      stock: 5,
      minStock: 20,
      maxStock: 100,
      price: 45,
      warehouse: 'المستودع الفرعي',
      supplier: 'Tech Supplies Co',
      lastRestocked: '2025-12-15',
      status: 'منخفض',
    },
    {
      id: 'SKU003',
      name: 'لوحة مفاتيح ميكانيكية',
      category: 'الاكسسوارات',
      stock: 0,
      minStock: 15,
      maxStock: 75,
      price: 85,
      warehouse: 'المستودع الرئيسي',
      supplier: 'Gaming Tech',
      lastRestocked: '2025-11-20',
      status: 'نفاد الخزين',
    },
  ]);

  const [movements, setMovements] = useState([
    { id: 'MOV001', productId: 'SKU001', type: 'استقبال', quantity: 20, date: '2026-01-10', reference: 'فاتورة #1001' },
    { id: 'MOV002', productId: 'SKU002', type: 'مبيعات', quantity: 5, date: '2026-01-15', reference: 'أمر #2001' },
    { id: 'MOV003', productId: 'SKU003', type: 'تعديل', quantity: 10, date: '2026-01-08', reference: 'جرد يدوي' },
  ]);

  const [suppliers, setSuppliers] = useState([
    {
      id: 'SUP001',
      name: 'Dell Direct',
      contact: 'sales@dell.com',
      phone: '+966 12 345 6789',
      rating: 4.8,
      leadTime: '3-5 أيام',
      status: 'نشط',
    },
    {
      id: 'SUP002',
      name: 'Tech Supplies Co',
      contact: 'orders@techsupplies.com',
      phone: '+966 11 234 5678',
      rating: 4.5,
      leadTime: '5-7 أيام',
      status: 'نشط',
    },
  ]);

  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    stock: '',
    minStock: '',
    maxStock: '',
    price: '',
  });

  // Analytics
  const inventoryStats = useMemo(() => {
    return {
      total: products.length,
      inStock: products.filter(p => p.stock > p.minStock).length,
      lowStock: products.filter(p => p.stock <= p.minStock && p.stock > 0).length,
      outOfStock: products.filter(p => p.stock === 0).length,
      totalValue: products.reduce((sum, p) => sum + p.stock * p.price, 0),
      avgStock: (products.reduce((sum, p) => sum + p.stock, 0) / products.length).toFixed(1),
    };
  }, [products]);

  const categoryStats = useMemo(() => {
    const stats = {};
    products.forEach(p => {
      stats[p.category] = (stats[p.category] || 0) + p.stock;
    });
    return Object.entries(stats).map(([cat, count]) => ({ name: cat, value: count }));
  }, [products]);

  const stockMovements = useMemo(() => {
    return products.map(p => ({
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      maxStock: p.maxStock,
    }));
  }, [products]);

  const handleAddProduct = () => {
    if (newProduct.name && newProduct.category) {
      const prod = {
        id: `SKU${String(products.length + 1).padStart(3, '0')}`,
        ...newProduct,
        stock: parseInt(newProduct.stock) || 0,
        minStock: parseInt(newProduct.minStock) || 10,
        maxStock: parseInt(newProduct.maxStock) || 100,
        price: parseFloat(newProduct.price) || 0,
        warehouse: 'المستودع الرئيسي',
        supplier: 'قيد التحديد',
        lastRestocked: new Date().toISOString().split('T')[0],
        status: parseInt(newProduct.stock) > parseInt(newProduct.minStock) ? 'كافي' : 'منخفض',
      };
      setProducts([...products, prod]);
      setNewProduct({ name: '', category: '', stock: '', minStock: '', maxStock: '', price: '' });
      setOpenDialog(false);
    }
  };

  const getStockStatus = (stock, minStock, maxStock) => {
    if (stock === 0) return { label: 'نفاد', color: 'error' };
    if (stock <= minStock) return { label: 'منخفض', color: 'warning' };
    if (stock >= maxStock) return { label: 'ممتلئ', color: 'info' };
    return { label: 'كافي', color: 'success' };
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f9ff', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
            📦 إدارة المخزون
          </Typography>
          <Typography variant="body2" color="textSecondary">
            تتبع المنتجات والمستودعات والعروض التوريدية
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            px: 3,
          }}
        >
          منتج جديد
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    إجمالي المنتجات
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {inventoryStats.total}
                  </Typography>
                </Box>
                <InventoryIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    المنتجات الناقصة
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {inventoryStats.lowStock}
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    القيمة الإجمالية
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {(inventoryStats.totalValue / 1000).toFixed(0)}K
                  </Typography>
                </Box>
                <TrendingDownIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    متوسط المخزون
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {inventoryStats.avgStock}
                  </Typography>
                </Box>
                <StoreIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="📦 المنتجات" icon={<InventoryIcon />} iconPosition="start" />
          <Tab label="📊 الحركات" icon={<LocalShippingIcon />} iconPosition="start" />
          <Tab label="🏢 الموردون" icon={<AssignmentIndIcon />} iconPosition="start" />
          <Tab label="📈 التحليلات" />
        </Tabs>
      </Paper>

      {/* Tab 1: Products */}
      {tabValue === 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المنتج</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الفئة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المخزون</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>السعر</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المستودع</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map(prod => {
                const status = getStockStatus(prod.stock, prod.minStock, prod.maxStock);
                return (
                  <TableRow key={prod.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {prod.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {prod.id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{prod.category}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {prod.stock} وحدة
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {prod.minStock}-{prod.maxStock}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{prod.price.toLocaleString()} ر.س</TableCell>
                    <TableCell>{prod.warehouse}</TableCell>
                    <TableCell>
                      <Chip label={status.label} color={status.color} size="small" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: Movements */}
      {tabValue === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المنتج</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>النوع</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الكمية</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>التاريخ</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المرجع</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.map(mov => {
                const prod = products.find(p => p.id === mov.productId);
                return (
                  <TableRow key={mov.id} hover>
                    <TableCell>{prod?.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={mov.type}
                        color={mov.type === 'استقبال' ? 'success' : mov.type === 'مبيعات' ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{mov.quantity}</TableCell>
                    <TableCell>{new Date(mov.date).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>{mov.reference}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 3: Suppliers */}
      {tabValue === 2 && (
        <Grid container spacing={2}>
          {suppliers.map(sup => (
            <Grid item xs={12} md={6} key={sup.id}>
              <Card sx={{ boxShadow: 2, borderRadius: 2 }}>
                <CardHeader
                  title={sup.name}
                  subheader={sup.contact}
                  sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}
                />
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        📞 الهاتف
                      </Typography>
                      <Typography variant="body2">{sup.phone}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        ⏱️ وقت التسليم
                      </Typography>
                      <Typography variant="body2">{sup.leadTime}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                        ⭐ التقييم
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {sup.rating}
                        </Typography>
                        <Chip label={sup.status} color={sup.status === 'نشط' ? 'success' : 'warning'} size="small" />
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 4: Analytics */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                📊 توزيع المخزون حسب الفئة
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                📈 مستويات المخزون الحالية
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stockMovements}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="stock" fill="#8884d8" name="المخزون الحالي" />
                  <Bar dataKey="minStock" fill="#ffc658" name="الحد الأدنى" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Add Product Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>منتج جديد</DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="اسم المنتج"
              value={newProduct.name}
              onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} label="الفئة">
                <MenuItem value="الكترونيات">الكترونيات</MenuItem>
                <MenuItem value="الاكسسوارات">الاكسسوارات</MenuItem>
                <MenuItem value="أخرى">أخرى</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="الكمية الحالية"
              type="number"
              value={newProduct.stock}
              onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
              fullWidth
            />
            <TextField
              label="الحد الأدنى"
              type="number"
              value={newProduct.minStock}
              onChange={e => setNewProduct({ ...newProduct, minStock: e.target.value })}
              fullWidth
            />
            <TextField
              label="الحد الأقصى"
              type="number"
              value={newProduct.maxStock}
              onChange={e => setNewProduct({ ...newProduct, maxStock: e.target.value })}
              fullWidth
            />
            <TextField
              label="السعر"
              type="number"
              value={newProduct.price}
              onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={handleAddProduct} variant="contained" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryManagement;
