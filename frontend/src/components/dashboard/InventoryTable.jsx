/**
 * Inventory Table Component
 * Displays and manages branch inventory
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Edit,
  Delete,
  Visibility,
  FileDownload,
  Refresh,
} from '@mui/icons-material';

const InventoryTable = ({ branchId, inventory, loading = false, error = null, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            فشل في تحميل بيانات المخزون: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (!inventory) {
    return (
      <Card>
        <CardContent>
          <Typography color="textSecondary">لا توجد بيانات مخزون متاحة</Typography>
        </CardContent>
      </Card>
    );
  }

  const { totalItems = 0, totalValue = 0, stockLevels = [] } = inventory;

  // Filter and sort data
  const filteredData = stockLevels
    ?.filter((item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    ?.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      if (sortBy === 'value') return b.value - a.value;
      return 0;
    }) || [];

  const getStockStatusColor = (quantity, reorderPoint) => {
    if (quantity === 0) return '#f44336';
    if (quantity <= (reorderPoint || 10)) return '#ff9800';
    return '#4caf50';
  };

  const getStockStatusLabel = (quantity, reorderPoint) => {
    if (quantity === 0) return 'نفاد';
    if (quantity <= (reorderPoint || 10)) return 'منخفض';
    return 'متاح';
  };

  const summaryCards = [
    {
      label: 'إجمالي العناصر',
      value: totalItems,
      unit: 'وحدة',
      color: '#2196f3',
    },
    {
      label: 'إجمالي القيمة',
      value: totalValue?.toLocaleString() || '0',
      unit: 'ريال',
      color: '#4caf50',
    },
    {
      label: 'عناصر منخفضة المخزون',
      value: filteredData.filter((item) => item.quantity <= (item.reorderPoint || 10)).length,
      unit: 'عنصر',
      color: '#ff9800',
    },
    {
      label: 'عناصر نفاد',
      value: filteredData.filter((item) => item.quantity === 0).length,
      unit: 'عنصر',
      color: '#f44336',
    },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {/* Summary Cards */}
      <Grid container spacing={2}>
        {summaryCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}cc 100%)`, color: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {card.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', my: 1 }}>
                  {card.value}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {card.unit}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Controls */}
      <Card>
        <CardHeader
          title="المخزون"
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="البحث"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="outlined"
                sx={{ width: 200 }}
              />
              <Tooltip title="تحديث">
                <IconButton onClick={onRefresh} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Button startIcon={<FileDownload />} size="small">
                تحميل
              </Button>
            </Box>
          }
        />

        <CardContent>
          {filteredData.length === 0 ? (
            <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
              لا توجد عناصر مطابقة
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>الاسم</TableCell>
                    <TableCell align="center">SKU</TableCell>
                    <TableCell align="right">الكمية</TableCell>
                    <TableCell align="right">النقطة المرجعية</TableCell>
                    <TableCell align="right">السعر</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                    <TableCell align="center">الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.map((item, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {item.name || 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {item.sku || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 'bold',
                            color: item.quantity === 0 ? '#f44336' : '#333',
                          }}
                        >
                          {item.quantity || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.reorderPoint || '-'}
                      </TableCell>
                      <TableCell align="right">
                        {item.unitPrice?.toLocaleString() || '0'} ريال
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={getStockStatusLabel(item.quantity, item.reorderPoint)}
                          size="small"
                          sx={{
                            backgroundColor: getStockStatusColor(item.quantity, item.reorderPoint),
                            color: 'white',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="عرض">
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small">
                            <Edit />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default InventoryTable;
