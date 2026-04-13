/**
 * Housing & Transportation Management — إدارة السكن والمواصلات
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import {
  getHousingUnits,
  createHousingUnit,
  getHousingStats,
  getTransportationRoutes,
  createTransportationRoute,
} from '../../services/hr/employeeAffairsPhase2Service';

const UNIT_TYPES = ['شقة', 'غرفة مشتركة', 'فيلا', 'سكن عمال', 'استوديو'];
const _UNIT_STATUSES = ['متاح', 'مشغول', 'صيانة', 'محجوز'];
const ROUTE_TYPES = ['باص', 'ميكروباص', 'سيارة خاصة', 'خدمة نقل'];
const unitStatusColor = { متاح: 'success', مشغول: 'primary', صيانة: 'warning', محجوز: 'info' };

const fmtCurrency = v => (v !== null ? `${Number(v).toLocaleString('ar-SA')} ر.س` : '-');

export default function HousingTransportationManagement() {
  const [tab, setTab] = useState(0);
  const [units, setUnits] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openUnitDialog, setOpenUnitDialog] = useState(false);
  const [openRouteDialog, setOpenRouteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [unitForm, setUnitForm] = useState({
    building: '',
    type: '',
    capacity: '',
    monthlyRent: '',
    city: '',
    district: '',
  });
  const [routeForm, setRouteForm] = useState({
    name: '',
    type: 'باص',
    vehiclePlate: '',
    driverName: '',
    driverPhone: '',
    capacity: '',
    departureTime: '',
    returnTime: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r, s] = await Promise.all([
        getHousingUnits(),
        getTransportationRoutes(),
        getHousingStats(),
      ]);
      setUnits(u?.units || u?.data?.units || []);
      setRoutes(r?.data || r || []);
      setStats(s?.data || s);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateUnit = async () => {
    try {
      await createHousingUnit({
        building: unitForm.building,
        type: unitForm.type,
        capacity: Number(unitForm.capacity),
        monthlyRent: Number(unitForm.monthlyRent),
        address: { city: unitForm.city, district: unitForm.district },
      });
      setOpenUnitDialog(false);
      setUnitForm({
        building: '',
        type: '',
        capacity: '',
        monthlyRent: '',
        city: '',
        district: '',
      });
      setSnackbar({ open: true, message: 'تم إضافة الوحدة السكنية', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const handleCreateRoute = async () => {
    try {
      await createTransportationRoute({
        name: routeForm.name,
        type: routeForm.type,
        vehiclePlate: routeForm.vehiclePlate,
        driverName: routeForm.driverName,
        driverPhone: routeForm.driverPhone,
        capacity: Number(routeForm.capacity),
        schedule: { departureTime: routeForm.departureTime, returnTime: routeForm.returnTime },
      });
      setOpenRouteDialog(false);
      setRouteForm({
        name: '',
        type: 'باص',
        vehiclePlate: '',
        driverName: '',
        driverPhone: '',
        capacity: '',
        departureTime: '',
        returnTime: '',
      });
      setSnackbar({ open: true, message: 'تم إضافة خط النقل', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const statCards = [
    { label: 'وحدات سكنية', value: stats?.totalUnits || 0, color: '#1976d2', icon: '🏠' },
    { label: 'متاحة', value: stats?.available || 0, color: '#4caf50', icon: '✅' },
    { label: 'مشغولة', value: stats?.occupied || 0, color: '#ff9800', icon: '🔑' },
    { label: 'خطوط نقل نشطة', value: stats?.totalRoutes || 0, color: '#9c27b0', icon: '🚌' },
  ];

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        🏠 إدارة السكن والمواصلات
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ borderTop: `4px solid ${s.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5">{s.icon}</Typography>
                <Typography variant="h4" fontWeight="bold" color={s.color}>
                  {s.value}
                </Typography>
                <Typography variant="caption">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab icon={<HomeIcon />} label="الوحدات السكنية" />
          <Tab icon={<BusIcon />} label="خطوط النقل" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : tab === 0 ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenUnitDialog(true)}
            >
              إضافة وحدة سكنية
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                  <TableCell>رقم الوحدة</TableCell>
                  <TableCell>المبنى</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>السعة</TableCell>
                  <TableCell>الإيجار</TableCell>
                  <TableCell>الموقع</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {units.map(u => (
                  <TableRow key={u._id} hover>
                    <TableCell>
                      <strong>{u.unitNumber}</strong>
                    </TableCell>
                    <TableCell>{u.building}</TableCell>
                    <TableCell>{u.type}</TableCell>
                    <TableCell>{u.capacity} أشخاص</TableCell>
                    <TableCell>{fmtCurrency(u.monthlyRent)}</TableCell>
                    <TableCell>
                      {u.address?.city} — {u.address?.district}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.status}
                        color={unitStatusColor[u.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {units.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      لا توجد وحدات سكنية
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenRouteDialog(true)}
            >
              إضافة خط نقل
            </Button>
          </Box>
          <Grid container spacing={2}>
            {routes.map(r => (
              <Grid item xs={12} md={6} key={r._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant="h6">
                        <BusIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        {r.name}
                      </Typography>
                      <Chip label={r.routeNumber} size="small" color="primary" variant="outlined" />
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>النوع:</strong> {r.type}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>السعة:</strong> {r.capacity} راكب
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>السائق:</strong> {r.driverName}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>الحالة:</strong>{' '}
                          <Chip label={r.status || 'نشط'} size="small" color="success" />
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>الذهاب:</strong> {r.schedule?.departureTime}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>العودة:</strong> {r.schedule?.returnTime}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {routes.length === 0 && (
              <Grid item xs={12}>
                <Typography align="center">لا توجد خطوط نقل</Typography>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* Unit Dialog */}
      <Dialog
        open={openUnitDialog}
        onClose={() => setOpenUnitDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إضافة وحدة سكنية</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المبنى"
                value={unitForm.building}
                onChange={e => setUnitForm(p => ({ ...p, building: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="النوع"
                value={unitForm.type}
                onChange={e => setUnitForm(p => ({ ...p, type: e.target.value }))}
              >
                {UNIT_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="السعة"
                value={unitForm.capacity}
                onChange={e => setUnitForm(p => ({ ...p, capacity: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="الإيجار الشهري"
                value={unitForm.monthlyRent}
                onChange={e => setUnitForm(p => ({ ...p, monthlyRent: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المدينة"
                value={unitForm.city}
                onChange={e => setUnitForm(p => ({ ...p, city: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الحي"
                value={unitForm.district}
                onChange={e => setUnitForm(p => ({ ...p, district: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUnitDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateUnit}
            disabled={!unitForm.building || !unitForm.type}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Route Dialog */}
      <Dialog
        open={openRouteDialog}
        onClose={() => setOpenRouteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إضافة خط نقل</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم الخط"
                value={routeForm.name}
                onChange={e => setRouteForm(p => ({ ...p, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="النوع"
                value={routeForm.type}
                onChange={e => setRouteForm(p => ({ ...p, type: e.target.value }))}
              >
                {ROUTE_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="السعة"
                value={routeForm.capacity}
                onChange={e => setRouteForm(p => ({ ...p, capacity: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="لوحة المركبة"
                value={routeForm.vehiclePlate}
                onChange={e => setRouteForm(p => ({ ...p, vehiclePlate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="اسم السائق"
                value={routeForm.driverName}
                onChange={e => setRouteForm(p => ({ ...p, driverName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="وقت الذهاب"
                InputLabelProps={{ shrink: true }}
                value={routeForm.departureTime}
                onChange={e => setRouteForm(p => ({ ...p, departureTime: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="وقت العودة"
                InputLabelProps={{ shrink: true }}
                value={routeForm.returnTime}
                onChange={e => setRouteForm(p => ({ ...p, returnTime: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRouteDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateRoute} disabled={!routeForm.name}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(p => ({ ...p, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
