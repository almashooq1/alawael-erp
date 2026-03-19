import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Collapse,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

function BeneficiariesFilter({ onFilter, onClear, isFiltering }) {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    insuranceProvider: '',
    dateFromBirth: '',
    dateToBirth: '',
    status: 'all'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyFilter = () => {
    onFilter(filters);
    setExpanded(false);
  };

  const handleClear = () => {
    setFilters({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      insuranceProvider: '',
      dateFromBirth: '',
      dateToBirth: '',
      status: 'all'
    });
    onClear();
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              خيارات البحث المتقدمة
            </Typography>
            {activeFilterCount > 0 && (
              <Chip
                label={`${activeFilterCount} فلتر نشط`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <Tooltip title={expanded ? 'إغلاق' : 'فتح'}>
            <IconButton
              onClick={() => setExpanded(!expanded)}
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s'
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="الاسم الأول"
                  name="firstName"
                  value={filters.firstName}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="الاسم الأخير"
                  name="lastName"
                  value={filters.lastName}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="البريد الإلكتروني"
                  name="email"
                  type="email"
                  value={filters.email}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="الهاتف"
                  name="phone"
                  value={filters.phone}
                  onChange={handleInputChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>جهة التأمين</InputLabel>
                  <Select
                    name="insuranceProvider"
                    value={filters.insuranceProvider}
                    onChange={handleInputChange}
                    label="جهة التأمين"
                  >
                    <MenuItem value="">الكل</MenuItem>
                    <MenuItem value="SLIC">SLIC</MenuItem>
                    <MenuItem value="Achmea">Achmea</MenuItem>
                    <MenuItem value="Axa">Axa</MenuItem>
                    <MenuItem value="National">National</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>الحالة</InputLabel>
                  <Select
                    name="status"
                    value={filters.status}
                    onChange={handleInputChange}
                    label="الحالة"
                  >
                    <MenuItem value="all">الكل</MenuItem>
                    <MenuItem value="active">نشط</MenuItem>
                    <MenuItem value="inactive">غير نشط</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  fullWidth
                  label="من تاريخ الميلاد"
                  name="dateFromBirth"
                  type="date"
                  value={filters.dateFromBirth}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  fullWidth
                  label="إلى تاريخ الميلاد"
                  name="dateToBirth"
                  type="date"
                  value={filters.dateToBirth}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                {activeFilterCount > 0 && (
                  <Tooltip title="مسح جميع الفلاتر">
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<ClearIcon />}
                      onClick={handleClear}
                      size="small"
                    >
                      مسح
                    </Button>
                  </Tooltip>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleApplyFilter}
                  size="small"
                >
                  تطبيق الفلاتر
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default BeneficiariesFilter;
