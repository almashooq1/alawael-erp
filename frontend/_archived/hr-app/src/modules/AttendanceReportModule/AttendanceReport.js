import React, { useState } from 'react';
import { Card, CardContent, Typography, Grid, Button, TextField, MenuItem } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
// TODO: Replace with real API
const mockData = [
  {
    id: 1,
    employee: 'أحمد علي',
    date: '2026-01-01',
    status: 'حاضر',
    checkIn: '08:00',
    checkOut: '16:00',
  },
  { id: 2, employee: 'سارة محمد', date: '2026-01-01', status: 'إجازة', checkIn: '', checkOut: '' },
  {
    id: 3,
    employee: 'خالد يوسف',
    date: '2026-01-01',
    status: 'متأخر',
    checkIn: '09:15',
    checkOut: '16:00',
  },
];

const columns = [
  { field: 'employee', headerName: 'الموظف', flex: 1 },
  { field: 'date', headerName: 'التاريخ', flex: 1 },
  { field: 'status', headerName: 'الحالة', flex: 1 },
  { field: 'checkIn', headerName: 'دخول', flex: 1 },
  { field: 'checkOut', headerName: 'خروج', flex: 1 },
];

const AttendanceReport = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ employee: '', dateFrom: '', dateTo: '', status: '' });
  // TODO: Replace with real API call and filter logic
  const filteredRows = mockData.filter(row => {
    return (
      (!filters.employee || row.employee.includes(filters.employee)) &&
      (!filters.status || row.status === filters.status) &&
      (!filters.dateFrom || row.date >= filters.dateFrom) &&
      (!filters.dateTo || row.date <= filters.dateTo)
    );
  });

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {t('Attendance Report')}
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={3}>
            <TextField
              label={t('Employee')}
              value={filters.employee}
              onChange={e => setFilters(f => ({ ...f, employee: e.target.value }))}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label={t('Status')}
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              size="small"
              select
              fullWidth
            >
              <MenuItem value="">{t('All')}</MenuItem>
              <MenuItem value="حاضر">{t('Present')}</MenuItem>
              <MenuItem value="إجازة">{t('On Leave')}</MenuItem>
              <MenuItem value="متأخر">{t('Late')}</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label={t('From')}
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              size="small"
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label={t('To')}
              type="date"
              value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              size="small"
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3} display="flex" alignItems="center">
            <Button variant="contained" color="primary" sx={{ mr: 1 }}>
              {t('Export PDF')}
            </Button>
            <Button variant="outlined" color="primary">
              {t('Export Excel')}
            </Button>
          </Grid>
        </Grid>
        <div style={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            autoHeight
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceReport;
