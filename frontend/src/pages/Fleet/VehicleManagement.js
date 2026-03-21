/**
 * VehicleManagement.js — صفحة إدارة المركبات الشاملة
 * Comprehensive Vehicle Management Page
 *
 * Features:
 * - CRUD for vehicles with full details (plate, make, model, year, fuel, status)
 * - Maintenance tracking (add records, view history)
 * - Fuel consumption monitoring
 * - Driver assignment
 * - Vehicle statistics & KPIs
 * - Export-ready data tables
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
} from '@mui/material';


import { gradients, statusColors, surfaceColors, chartColors } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import vehicleService from '../../services/vehicleManagement.service';
import logger from '../../utils/logger';

// ─── ثوابت ──────────────────────────────────────────────────────────────────
const VEHICLE_STATUSES = [
  { value: 'نشطة', label: 'نشطة', color: 'success' },
  { value: 'معطلة', label: 'معطلة', color: 'default' },
  { value: 'في الإصلاح', label: 'في الإصلاح', color: 'warning' },
  { value: 'مبيعة', label: 'مبيعة', color: 'info' },
  { value: 'مسحوبة', label: 'مسحوبة', color: 'error' },
];

const VEHICLE_TYPES = [
  { value: 'سيدان', label: 'سيدان', icon: <CarIcon /> },
  { value: 'SUV', label: 'SUV', icon: <CarIcon /> },
  { value: 'شاحنة', label: 'شاحنة', icon: <TruckIcon /> },
  { value: 'حافلة', label: 'حافلة', icon: <BusIcon /> },
  { value: 'فان', label: 'فان', icon: <TruckIcon /> },
  { value: 'دراجة نارية', label: 'دراجة نارية', icon: <BikeIcon /> },
];

const FUEL_TYPES = [
  { value: 'بنزين', label: 'بنزين' },
  { value: 'ديزل', label: 'ديزل' },
  { value: 'كهربائي', label: 'كهربائي' },
  { value: 'هجين', label: 'هجين' },
];

const MAINTENANCE_TYPES = [
  { value: 'oil_change', label: 'تغيير زيت' },
  { value: 'tire_change', label: 'تغيير إطارات' },
  { value: 'brake_service', label: 'صيانة فرامل' },
  { value: 'engine_repair', label: 'إصلاح محرك' },
  { value: 'battery_replace', label: 'استبدال بطارية' },
  { value: 'ac_service', label: 'صيانة تكييف' },
  { value: 'general_service', label: 'صيانة عامة' },
  { value: 'body_repair', label: 'إصلاح هيكل' },
  { value: 'electrical', label: 'كهرباء' },
  { value: 'inspection', label: 'فحص دوري' },
];

const CONDITION_MAP = {
  ممتازة: { color: 'success', icon: <CheckIcon /> },
  جيدة: { color: 'info', icon: <CheckIcon /> },
  مقبولة: { color: 'warning', icon: <WarningIcon /> },
  'تحتاج صيانة': { color: 'error', icon: <CancelIcon /> },
};

// ─── بيانات تجريبية ─────────────────────────────────────────────────────────
const DEMO_VEHICLES = [
  {
    _id: 'v1',
    plateNumber: 'أ ب ج 1234',
    registrationNumber: 'REG-001',
    basicInfo: {
      make: 'تويوتا',
      model: 'هايلكس',
      year: 2023,
      color: 'أبيض',
      type: 'شاحنة',
      fuelType: 'ديزل',
    },
    status: 'نشطة',
    performance: { odometer: 45000, fuelConsumption: 12.5, condition: 'جيدة' },
    insurance: { insured: true, policyExpiryDate: '2026-12-15' },
    inspection: { nextInspectionDate: '2026-06-01', status: 'ساري' },
    maintenance: {
      totalMaintenanceCost: 3500,
      maintenanceHistory: [
        {
          date: '2026-01-15',
          type: 'oil_change',
          description: 'تغيير زيت وفلتر',
          cost: 350,
          provider: 'الراجحي للسيارات',
        },
      ],
    },
    tracking: { gpsEnabled: true, lastLocation: { address: 'الرياض، حي العليا' } },
    assignedDriver: { name: 'أحمد محمد' },
  },
  {
    _id: 'v2',
    plateNumber: 'د ه و 5678',
    registrationNumber: 'REG-002',
    basicInfo: {
      make: 'هيونداي',
      model: 'H1',
      year: 2022,
      color: 'فضي',
      type: 'فان',
      fuelType: 'بنزين',
    },
    status: 'نشطة',
    performance: { odometer: 62000, fuelConsumption: 14.2, condition: 'مقبولة' },
    insurance: { insured: true, policyExpiryDate: '2026-08-20' },
    inspection: { nextInspectionDate: '2026-04-15', status: 'ساري' },
    maintenance: {
      totalMaintenanceCost: 5200,
      maintenanceHistory: [
        {
          date: '2026-02-10',
          type: 'brake_service',
          description: 'تغيير تيل فرامل',
          cost: 800,
          provider: 'هيونداي الجبر',
        },
      ],
    },
    tracking: { gpsEnabled: true, lastLocation: { address: 'جدة، حي الروضة' } },
    assignedDriver: { name: 'خالد علي' },
  },
  {
    _id: 'v3',
    plateNumber: 'ز ح ط 9012',
    registrationNumber: 'REG-003',
    basicInfo: {
      make: 'فورد',
      model: 'ترانزيت',
      year: 2024,
      color: 'أزرق',
      type: 'حافلة',
      fuelType: 'ديزل',
    },
    status: 'في الإصلاح',
    performance: { odometer: 12000, fuelConsumption: 16.8, condition: 'تحتاج صيانة' },
    insurance: { insured: true, policyExpiryDate: '2027-01-30' },
    inspection: { nextInspectionDate: '2026-09-10', status: 'ساري' },
    maintenance: {
      totalMaintenanceCost: 8900,
      maintenanceHistory: [
        {
          date: '2026-03-01',
          type: 'engine_repair',
          description: 'إصلاح رأس المحرك',
          cost: 5500,
          provider: 'الوكالة الرسمية',
        },
      ],
    },
    tracking: { gpsEnabled: false, lastLocation: { address: 'الدمام، ورشة الصيانة' } },
    assignedDriver: null,
  },
  {
    _id: 'v4',
    plateNumber: 'ي ك ل 3456',
    registrationNumber: 'REG-004',
    basicInfo: {
      make: 'تويوتا',
      model: 'كامري',
      year: 2024,
      color: 'أسود',
      type: 'سيدان',
      fuelType: 'هجين',
    },
    status: 'نشطة',
    performance: { odometer: 8500, fuelConsumption: 6.2, condition: 'ممتازة' },
    insurance: { insured: true, policyExpiryDate: '2027-03-15' },
    inspection: { nextInspectionDate: '2027-01-20', status: 'ساري' },
    maintenance: { totalMaintenanceCost: 500, maintenanceHistory: [] },
    tracking: { gpsEnabled: true, lastLocation: { address: 'الرياض، حي الملز' } },
    assignedDriver: { name: 'فهد الشمري' },
  },
  {
    _id: 'v5',
    plateNumber: 'م ن س 7890',
    registrationNumber: 'REG-005',
    basicInfo: {
      make: 'نيسان',
      model: 'باترول',
      year: 2023,
      color: 'رمادي',
      type: 'SUV',
      fuelType: 'بنزين',
    },
    status: 'نشطة',
    performance: { odometer: 35000, fuelConsumption: 18.5, condition: 'جيدة' },
    insurance: { insured: false, policyExpiryDate: '2026-02-28' },
    inspection: { nextInspectionDate: '2026-05-15', status: 'ساري' },
    maintenance: {
      totalMaintenanceCost: 4200,
      maintenanceHistory: [
        {
          date: '2025-12-20',
          type: 'tire_change',
          description: 'تغيير 4 إطارات',
          cost: 2400,
          provider: 'بريدجستون',
        },
      ],
    },
    tracking: { gpsEnabled: true, lastLocation: { address: 'الطائف، طريق الهدا' } },
    assignedDriver: { name: 'عبدالرحمن القحطاني' },
  },
];

const DEMO_MAINTENANCE = [
  {
    _id: 'm1',
    vehicleId: 'v1',
    vehiclePlate: 'أ ب ج 1234',
    type: 'oil_change',
    description: 'تغيير زيت وفلتر',
    cost: 350,
    date: '2026-01-15',
    provider: 'الراجحي للسيارات',
    odometer: 42000,
    status: 'completed',
  },
  {
    _id: 'm2',
    vehicleId: 'v2',
    vehiclePlate: 'د ه و 5678',
    type: 'brake_service',
    description: 'تغيير تيل فرامل أمامي وخلفي',
    cost: 800,
    date: '2026-02-10',
    provider: 'هيونداي الجبر',
    odometer: 60000,
    status: 'completed',
  },
  {
    _id: 'm3',
    vehicleId: 'v3',
    vehiclePlate: 'ز ح ط 9012',
    type: 'engine_repair',
    description: 'إصلاح رأس المحرك وتغيير جوان',
    cost: 5500,
    date: '2026-03-01',
    provider: 'الوكالة الرسمية',
    odometer: 11500,
    status: 'in-progress',
  },
  {
    _id: 'm4',
    vehicleId: 'v5',
    vehiclePlate: 'م ن س 7890',
    type: 'tire_change',
    description: 'تغيير 4 إطارات بريدجستون',
    cost: 2400,
    date: '2025-12-20',
    provider: 'بريدجستون',
    odometer: 33000,
    status: 'completed',
  },
  {
    _id: 'm5',
    vehicleId: 'v4',
    vehiclePlate: 'ي ك ل 3456',
    type: 'inspection',
    description: 'فحص دوري 10,000 كم',
    cost: 500,
    date: '2026-02-28',
    provider: 'تويوتا عبداللطيف جميل',
    odometer: 8000,
    status: 'completed',
  },
  {
    _id: 'm6',
    vehicleId: 'v1',
    vehiclePlate: 'أ ب ج 1234',
    type: 'ac_service',
    description: 'شحن فريون وتنظيف مجاري التكييف',
    cost: 450,
    date: '2026-03-10',
    provider: 'مركز الخليج',
    odometer: 44500,
    status: 'scheduled',
  },
];

const DEMO_FUEL = [
  {
    _id: 'f1',
    vehicleId: 'v1',
    vehiclePlate: 'أ ب ج 1234',
    date: '2026-03-12',
    liters: 65,
    cost: 143,
    odometer: 44800,
    station: 'أرامكو - الرياض',
    fuelType: 'ديزل',
  },
  {
    _id: 'f2',
    vehicleId: 'v2',
    vehiclePlate: 'د ه و 5678',
    date: '2026-03-11',
    liters: 55,
    cost: 132,
    odometer: 61800,
    station: 'بترومين - جدة',
    fuelType: 'بنزين 91',
  },
  {
    _id: 'f3',
    vehicleId: 'v5',
    vehiclePlate: 'م ن س 7890',
    date: '2026-03-10',
    liters: 80,
    cost: 192,
    odometer: 34700,
    station: 'أرامكو - الطائف',
    fuelType: 'بنزين 95',
  },
  {
    _id: 'f4',
    vehicleId: 'v1',
    vehiclePlate: 'أ ب ج 1234',
    date: '2026-03-05',
    liters: 60,
    cost: 132,
    odometer: 43900,
    station: 'الناغي - الرياض',
    fuelType: 'ديزل',
  },
  {
    _id: 'f5',
    vehicleId: 'v4',
    vehiclePlate: 'ي ك ل 3456',
    date: '2026-03-08',
    liters: 40,
    cost: 96,
    odometer: 8300,
    station: 'بترومين - الرياض',
    fuelType: 'بنزين 91',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const VehicleManagement = () => {
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [fuelRecords, setFuelRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogs
  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [maintenanceDialog, setMaintenanceDialog] = useState(false);
  const [fuelDialog, setFuelDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Forms
  const [vehicleForm, setVehicleForm] = useState({});
  const [maintenanceForm, setMaintenanceForm] = useState({});
  const [fuelForm, setFuelForm] = useState({});

  // ─── تحميل البيانات ───────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [vehiclesRes] = await Promise.all([
        vehicleService.getVehicles().catch(err => {
          logger.warn('فشل تحميل المركبات:', err);
          return null;
        }),
      ]);

      const vData = vehiclesRes?.data?.vehicles || vehiclesRes?.data || [];
      if (Array.isArray(vData) && vData.length > 0) {
        setVehicles(vData);
        // Extract maintenance from vehicles
        const maint = [];
        vData.forEach(v => {
          if (v.maintenance?.maintenanceHistory) {
            v.maintenance.maintenanceHistory.forEach((m, i) => {
              maint.push({
                ...m,
                _id: `${v._id}-m${i}`,
                vehicleId: v._id,
                vehiclePlate: v.plateNumber,
              });
            });
          }
        });
        if (maint.length > 0) setMaintenanceRecords(maint);
        else setMaintenanceRecords(DEMO_MAINTENANCE);
      } else {
        setVehicles(DEMO_VEHICLES);
        setMaintenanceRecords(DEMO_MAINTENANCE);
      }
      setFuelRecords(DEMO_FUEL);
    } catch (err) {
      logger.error('خطأ في تحميل بيانات المركبات:', err);
      setVehicles(DEMO_VEHICLES);
      setMaintenanceRecords(DEMO_MAINTENANCE);
      setFuelRecords(DEMO_FUEL);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── إحصائيات ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = vehicles.filter(v => v.status === 'نشطة').length;
    const inRepair = vehicles.filter(v => v.status === 'في الإصلاح').length;
    const totalMaintCost = maintenanceRecords.reduce((sum, m) => sum + (m.cost || 0), 0);
    const totalFuelCost = fuelRecords.reduce((sum, f) => sum + (f.cost || 0), 0);
    const avgOdometer =
      vehicles.length > 0
        ? Math.round(
            vehicles.reduce((sum, v) => sum + (v.performance?.odometer || 0), 0) / vehicles.length
          )
        : 0;
    const uninsured = vehicles.filter(v => !v.insurance?.insured).length;
    const gpsEnabled = vehicles.filter(v => v.tracking?.gpsEnabled).length;

    return {
      total: vehicles.length,
      active,
      inRepair,
      totalMaintCost,
      totalFuelCost,
      avgOdometer,
      uninsured,
      gpsEnabled,
    };
  }, [vehicles, maintenanceRecords, fuelRecords]);

  const statusChartData = useMemo(() => {
    const counts = {};
    vehicles.forEach(v => {
      counts[v.status] = (counts[v.status] || 0) + 1;
    });
    const colorMap = {
      نشطة: statusColors.success,
      معطلة: '#9e9e9e',
      'في الإصلاح': statusColors.warning,
      مبيعة: statusColors.primaryBlue,
      مسحوبة: statusColors.error,
    };
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: colorMap[name] || '#666',
    }));
  }, [vehicles]);

  // ─── تصفية المركبات ───────────────────────────────────────────────────
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchSearch =
        !searchQuery ||
        v.plateNumber?.includes(searchQuery) ||
        v.basicInfo?.make?.includes(searchQuery) ||
        v.basicInfo?.model?.includes(searchQuery) ||
        v.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = !statusFilter || v.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [vehicles, searchQuery, statusFilter]);

  // ─── CRUD وظائف المركبات ──────────────────────────────────────────────
  const openVehicleCreate = () => {
    setEditItem(null);
    setVehicleForm({ status: 'نشطة', basicInfo: { fuelType: 'بنزين' } });
    setVehicleDialog(true);
  };

  const openVehicleEdit = vehicle => {
    setEditItem(vehicle);
    setVehicleForm({
      plateNumber: vehicle.plateNumber,
      registrationNumber: vehicle.registrationNumber,
      status: vehicle.status,
      basicInfo: { ...vehicle.basicInfo },
    });
    setVehicleDialog(true);
  };

  const handleVehicleSave = async () => {
    try {
      const payload = {
        plateNumber: vehicleForm.plateNumber,
        registrationNumber: vehicleForm.registrationNumber,
        status: vehicleForm.status,
        'basicInfo.make': vehicleForm.basicInfo?.make,
        'basicInfo.model': vehicleForm.basicInfo?.model,
        'basicInfo.year': vehicleForm.basicInfo?.year,
        'basicInfo.color': vehicleForm.basicInfo?.color,
        'basicInfo.type': vehicleForm.basicInfo?.type,
        'basicInfo.fuelType': vehicleForm.basicInfo?.fuelType,
        make: vehicleForm.basicInfo?.make,
        model: vehicleForm.basicInfo?.model,
        year: vehicleForm.basicInfo?.year,
        type: vehicleForm.basicInfo?.type,
      };
      if (editItem) {
        await vehicleService.updateVehicle(editItem._id, payload);
        showSnackbar('تم تحديث المركبة بنجاح', 'success');
      } else {
        await vehicleService.createVehicle(payload);
        showSnackbar('تم إضافة المركبة بنجاح', 'success');
      }
      setVehicleDialog(false);
      loadData();
    } catch (err) {
      logger.error('خطأ في حفظ المركبة:', err);
      showSnackbar('حدث خطأ أثناء حفظ المركبة', 'error');
    }
  };

  const handleVehicleDelete = vehicle => {
    showConfirm({
      title: 'تأكيد حذف المركبة',
      message: `هل أنت متأكد من حذف المركبة ${vehicle.plateNumber}؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          await vehicleService.deleteVehicle(vehicle._id);
          showSnackbar('تم حذف المركبة بنجاح', 'success');
          loadData();
        } catch {
          showSnackbar('حدث خطأ أثناء الحذف', 'error');
        }
      },
    });
  };

  // ─── وظائف الصيانة ────────────────────────────────────────────────────
  const openMaintenanceCreate = (vehicle = null) => {
    setMaintenanceForm({
      vehicleId: vehicle?._id || '',
      date: new Date().toISOString().slice(0, 10),
      type: 'general_service',
    });
    setMaintenanceDialog(true);
  };

  const handleMaintenanceSave = async () => {
    try {
      if (maintenanceForm.vehicleId) {
        await vehicleService.addMaintenance(maintenanceForm.vehicleId, {
          date: maintenanceForm.date,
          type: maintenanceForm.type,
          description: maintenanceForm.description,
          cost: Number(maintenanceForm.cost),
          provider: maintenanceForm.provider,
          odometer: Number(maintenanceForm.odometer),
        });
        showSnackbar('تم إضافة سجل الصيانة بنجاح', 'success');
      }
      setMaintenanceDialog(false);
      loadData();
    } catch (err) {
      logger.error('خطأ في حفظ الصيانة:', err);
      showSnackbar('حدث خطأ أثناء حفظ سجل الصيانة', 'error');
    }
  };

  // ─── وظائف الوقود ─────────────────────────────────────────────────────
  const openFuelCreate = (vehicle = null) => {
    setFuelForm({
      vehicleId: vehicle?._id || '',
      date: new Date().toISOString().slice(0, 10),
      fuelType: 'بنزين 91',
    });
    setFuelDialog(true);
  };

  const handleFuelSave = async () => {
    try {
      if (fuelForm.vehicleId) {
        await vehicleService.updateFuel(fuelForm.vehicleId, {
          amount: Number(fuelForm.liters),
          cost: Number(fuelForm.cost),
          odometer: Number(fuelForm.odometer),
        });
        showSnackbar('تم تسجيل التعبئة بنجاح', 'success');
      }
      setFuelDialog(false);
      loadData();
    } catch (err) {
      logger.error('خطأ في حفظ الوقود:', err);
      showSnackbar('حدث خطأ أثناء تسجيل التعبئة', 'error');
    }
  };

  // ─── عرض تفاصيل المركبة ──────────────────────────────────────────────
  const openVehicleDetail = vehicle => {
    setSelectedVehicle(vehicle);
    setDetailDialog(true);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CarIcon sx={{ fontSize: 44 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              إدارة المركبات
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              إدارة شاملة للمركبات والصيانة والوقود والتتبع
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي المركبات',
            value: stats.total,
            color: statusColors.primaryBlue,
            icon: <CarIcon />,
          },
          {
            label: 'المركبات النشطة',
            value: stats.active,
            color: statusColors.success,
            icon: <CheckIcon />,
          },
          {
            label: 'في الإصلاح',
            value: stats.inRepair,
            color: statusColors.warning,
            icon: <MaintenanceIcon />,
          },
          {
            label: 'تكلفة الصيانة',
            value: `${(stats.totalMaintCost / 1000).toFixed(1)}K ر.س`,
            color: statusColors.error,
            icon: <MaintenanceIcon />,
          },
          {
            label: 'تكلفة الوقود',
            value: `${(stats.totalFuelCost / 1000).toFixed(1)}K ر.س`,
            color: '#ff6f00',
            icon: <FuelIcon />,
          },
          { label: 'مدعومة بـ GPS', value: stats.gpsEnabled, color: '#00897b', icon: <GpsIcon /> },
        ].map((s, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card sx={{ borderTop: `4px solid ${s.color}`, height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: `${s.color}20`,
                    color: s.color,
                    mx: 'auto',
                    mb: 1,
                    width: 40,
                    height: 40,
                  }}
                >
                  {s.icon}
                </Avatar>
                <Typography variant="h5" fontWeight="bold" color={s.color}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => {
            setActiveTab(v);
            setPage(0);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="المركبات" icon={<CarIcon />} iconPosition="start" />
          <Tab label="الصيانة" icon={<MaintenanceIcon />} iconPosition="start" />
          <Tab label="الوقود" icon={<FuelIcon />} iconPosition="start" />
          <Tab label="الإحصائيات" icon={<StatsIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ═══════ TAB 0: المركبات ═══════ */}
      {activeTab === 0 && (
        <>
          {/* Toolbar */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="بحث بالوحة أو الموديل..."
              size="small"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1, maxWidth: 350 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>تصفية الحالة</InputLabel>
              <Select
                value={statusFilter}
                label="تصفية الحالة"
                onChange={e => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">الكل</MenuItem>
                {VEHICLE_STATUSES.map(s => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>
              تحديث
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openVehicleCreate}>
              إضافة مركبة
            </Button>
          </Box>

          {/* Vehicles Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>رقم اللوحة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الشركة / الموديل</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>السنة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الوقود</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>العداد (كم)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>السائق</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الموقع</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        لا توجد مركبات مطابقة
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map(v => {
                      const statusObj = VEHICLE_STATUSES.find(s => s.value === v.status);
                      const cond = CONDITION_MAP[v.performance?.condition];
                      return (
                        <TableRow key={v._id} hover>
                          <TableCell>
                            <Typography fontWeight="bold">{v.plateNumber}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {v.registrationNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {v.basicInfo?.make} {v.basicInfo?.model}
                          </TableCell>
                          <TableCell>{v.basicInfo?.year}</TableCell>
                          <TableCell>{v.basicInfo?.type || '-'}</TableCell>
                          <TableCell>{v.basicInfo?.fuelType || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={v.status}
                              size="small"
                              color={statusObj?.color || 'default'}
                            />
                            {cond && (
                              <Chip
                                label={v.performance?.condition}
                                size="small"
                                color={cond.color}
                                variant="outlined"
                                sx={{ ml: 0.5 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>{v.performance?.odometer?.toLocaleString() || '-'}</TableCell>
                          <TableCell>
                            {v.assignedDriver?.name || (
                              <Typography variant="caption" color="text.secondary">
                                غير معين
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {v.tracking?.gpsEnabled ? (
                              <Tooltip title={v.tracking?.lastLocation?.address || 'GPS نشط'}>
                                <GpsIcon color="success" fontSize="small" />
                              </Tooltip>
                            ) : (
                              <GpsIcon color="disabled" fontSize="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="تفاصيل">
                              <IconButton size="small" onClick={() => openVehicleDetail(v)}>
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="تعديل">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => openVehicleEdit(v)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="صيانة">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => openMaintenanceCreate(v)}
                              >
                                <MaintenanceIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="وقود">
                              <IconButton
                                size="small"
                                sx={{ color: '#ff6f00' }}
                                onClick={() => openFuelCreate(v)}
                              >
                                <FuelIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleVehicleDelete(v)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredVehicles.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => {
                setRowsPerPage(parseInt(e.target.value));
                setPage(0);
              }}
              labelRowsPerPage="عدد الصفوف:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
            />
          </TableContainer>
        </>
      )}

      {/* ═══════ TAB 1: الصيانة ═══════ */}
      {activeTab === 1 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              سجلات الصيانة
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openMaintenanceCreate()}
            >
              إضافة سجل صيانة
            </Button>
          </Box>

          {/* Maintenance summary cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ borderTop: `3px solid ${statusColors.success}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color={statusColors.success}>
                    {maintenanceRecords.filter(m => m.status === 'completed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    مكتملة
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ borderTop: `3px solid ${statusColors.warning}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color={statusColors.warning}>
                    {maintenanceRecords.filter(m => m.status === 'in-progress').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    جارية
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ borderTop: `3px solid ${statusColors.primaryBlue}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color={statusColors.primaryBlue}>
                    {maintenanceRecords.filter(m => m.status === 'scheduled').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    مجدولة
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ borderTop: `3px solid ${statusColors.error}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color={statusColors.error}>
                    {maintenanceRecords.reduce((sum, m) => sum + (m.cost || 0), 0).toLocaleString()}{' '}
                    ر.س
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    إجمالي التكاليف
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>المركبة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>نوع الصيانة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الوصف</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>التكلفة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>مقدم الخدمة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>العداد</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maintenanceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        لا توجد سجلات صيانة
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  maintenanceRecords.map(m => (
                    <TableRow key={m._id} hover>
                      <TableCell>
                        <Typography fontWeight="bold">{m.vehiclePlate}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={MAINTENANCE_TYPES.find(t => t.value === m.type)?.label || m.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{m.description}</TableCell>
                      <TableCell>{m.cost?.toLocaleString()} ر.س</TableCell>
                      <TableCell>{m.date}</TableCell>
                      <TableCell>{m.provider || '-'}</TableCell>
                      <TableCell>{m.odometer?.toLocaleString() || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            m.status === 'completed'
                              ? 'مكتمل'
                              : m.status === 'in-progress'
                                ? 'جاري'
                                : 'مجدول'
                          }
                          size="small"
                          color={
                            m.status === 'completed'
                              ? 'success'
                              : m.status === 'in-progress'
                                ? 'warning'
                                : 'info'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* ═══════ TAB 2: الوقود ═══════ */}
      {activeTab === 2 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              سجلات الوقود
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openFuelCreate()}>
              تسجيل تعبئة وقود
            </Button>
          </Box>

          {/* Fuel summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ borderTop: `3px solid #ff6f00` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: '#ff6f00' }}>
                    {fuelRecords.reduce((sum, f) => sum + (f.liters || 0), 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    إجمالي اللترات
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ borderTop: `3px solid ${statusColors.error}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color={statusColors.error}>
                    {fuelRecords.reduce((sum, f) => sum + (f.cost || 0), 0).toLocaleString()} ر.س
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    إجمالي التكلفة
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ borderTop: `3px solid ${statusColors.primaryBlue}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color={statusColors.primaryBlue}>
                    {fuelRecords.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    عدد التعبئات
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ borderTop: `3px solid ${statusColors.success}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color={statusColors.success}>
                    {fuelRecords.length > 0
                      ? (
                          fuelRecords.reduce((sum, f) => sum + (f.cost || 0), 0) /
                          fuelRecords.length
                        ).toFixed(0)
                      : 0}{' '}
                    ر.س
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    متوسط التعبئة
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>المركبة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الكمية (لتر)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>التكلفة (ر.س)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>سعر اللتر</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>العداد (كم)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>المحطة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>نوع الوقود</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fuelRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        لا توجد سجلات وقود
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  fuelRecords.map(f => (
                    <TableRow key={f._id} hover>
                      <TableCell>
                        <Typography fontWeight="bold">{f.vehiclePlate}</Typography>
                      </TableCell>
                      <TableCell>{f.date}</TableCell>
                      <TableCell>{f.liters}</TableCell>
                      <TableCell>{f.cost?.toLocaleString()} ر.س</TableCell>
                      <TableCell>
                        {f.liters > 0 ? (f.cost / f.liters).toFixed(2) : '-'} ر.س
                      </TableCell>
                      <TableCell>{f.odometer?.toLocaleString()}</TableCell>
                      <TableCell>{f.station || '-'}</TableCell>
                      <TableCell>
                        <Chip label={f.fuelType} size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* ═══════ TAB 3: الإحصائيات ═══════ */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          {/* Vehicle Status Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                توزيع حالة المركبات
              </Typography>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={55}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusChartData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </Paper>
          </Grid>

          {/* Summary Cards */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                ملخص الأسطول
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Alert severity="info" icon={<CarIcon />}>
                  إجمالي المركبات: <strong>{stats.total}</strong> — النشطة:{' '}
                  <strong>{stats.active}</strong>
                </Alert>
                <Alert severity="warning" icon={<MaintenanceIcon />}>
                  تكلفة الصيانة الإجمالية:{' '}
                  <strong>{stats.totalMaintCost.toLocaleString()} ر.س</strong>
                </Alert>
                <Alert severity="error" icon={<FuelIcon />}>
                  تكلفة الوقود الإجمالية:{' '}
                  <strong>{stats.totalFuelCost.toLocaleString()} ر.س</strong>
                </Alert>
                <Alert severity="success" icon={<GpsIcon />}>
                  مركبات بنظام GPS: <strong>{stats.gpsEnabled}</strong> من {stats.total}
                </Alert>
                {stats.uninsured > 0 && (
                  <Alert severity="error" icon={<WarningIcon />}>
                    مركبات غير مؤمنة: <strong>{stats.uninsured}</strong> — يجب تجديد التأمين!
                  </Alert>
                )}
                <Alert severity="info" icon={<SpeedIcon />}>
                  متوسط عداد المسافة: <strong>{stats.avgOdometer.toLocaleString()} كم</strong>
                </Alert>
              </Box>
            </Paper>
          </Grid>

          {/* Type breakdown */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                أنواع المركبات
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {(() => {
                  const types = {};
                  vehicles.forEach(v => {
                    const t = v.basicInfo?.type || 'أخرى';
                    types[t] = (types[t] || 0) + 1;
                  });
                  return Object.entries(types).map(([name, count], i) => (
                    <Chip key={i} label={`${name}: ${count}`} color="primary" variant="outlined" />
                  ));
                })()}
              </Box>
            </Paper>
          </Grid>

          {/* Fuel type breakdown */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                أنواع الوقود
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {(() => {
                  const fuels = {};
                  vehicles.forEach(v => {
                    const f = v.basicInfo?.fuelType || 'أخرى';
                    fuels[f] = (fuels[f] || 0) + 1;
                  });
                  return Object.entries(fuels).map(([name, count], i) => (
                    <Chip
                      key={i}
                      label={`${name}: ${count}`}
                      sx={{
                        bgcolor: chartColors.category[i % 6] + '20',
                        borderColor: chartColors.category[i % 6],
                      }}
                      variant="outlined"
                    />
                  ));
                })()}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ═══════ حوار إضافة/تعديل مركبة ═══════ */}
      <Dialog open={vehicleDialog} onClose={() => setVehicleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: surfaceColors.lightGray }}>
          {editItem ? 'تعديل المركبة' : 'إضافة مركبة جديدة'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="رقم اللوحة"
                value={vehicleForm.plateNumber || ''}
                onChange={e => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="رقم التسجيل"
                value={vehicleForm.registrationNumber || ''}
                onChange={e =>
                  setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="الشركة المصنعة"
                value={vehicleForm.basicInfo?.make || ''}
                onChange={e =>
                  setVehicleForm({
                    ...vehicleForm,
                    basicInfo: { ...vehicleForm.basicInfo, make: e.target.value },
                  })
                }
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="الموديل"
                value={vehicleForm.basicInfo?.model || ''}
                onChange={e =>
                  setVehicleForm({
                    ...vehicleForm,
                    basicInfo: { ...vehicleForm.basicInfo, model: e.target.value },
                  })
                }
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="سنة الصنع"
                type="number"
                value={vehicleForm.basicInfo?.year || ''}
                onChange={e =>
                  setVehicleForm({
                    ...vehicleForm,
                    basicInfo: { ...vehicleForm.basicInfo, year: parseInt(e.target.value) },
                  })
                }
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="اللون"
                value={vehicleForm.basicInfo?.color || ''}
                onChange={e =>
                  setVehicleForm({
                    ...vehicleForm,
                    basicInfo: { ...vehicleForm.basicInfo, color: e.target.value },
                  })
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select
                  value={vehicleForm.basicInfo?.type || ''}
                  label="النوع"
                  onChange={e =>
                    setVehicleForm({
                      ...vehicleForm,
                      basicInfo: { ...vehicleForm.basicInfo, type: e.target.value },
                    })
                  }
                >
                  {VEHICLE_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>نوع الوقود</InputLabel>
                <Select
                  value={vehicleForm.basicInfo?.fuelType || 'بنزين'}
                  label="نوع الوقود"
                  onChange={e =>
                    setVehicleForm({
                      ...vehicleForm,
                      basicInfo: { ...vehicleForm.basicInfo, fuelType: e.target.value },
                    })
                  }
                >
                  {FUEL_TYPES.map(f => (
                    <MenuItem key={f.value} value={f.value}>
                      {f.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={vehicleForm.status || 'نشطة'}
                  label="الحالة"
                  onChange={e => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                >
                  {VEHICLE_STATUSES.map(s => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVehicleDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleVehicleSave}>
            {editItem ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════ حوار إضافة صيانة ═══════ */}
      <Dialog
        open={maintenanceDialog}
        onClose={() => setMaintenanceDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: surfaceColors.lightGray }}>إضافة سجل صيانة</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>المركبة</InputLabel>
              <Select
                value={maintenanceForm.vehicleId || ''}
                label="المركبة"
                onChange={e =>
                  setMaintenanceForm({ ...maintenanceForm, vehicleId: e.target.value })
                }
              >
                {vehicles.map(v => (
                  <MenuItem key={v._id} value={v._id}>
                    {v.plateNumber} - {v.basicInfo?.make} {v.basicInfo?.model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>نوع الصيانة</InputLabel>
              <Select
                value={maintenanceForm.type || ''}
                label="نوع الصيانة"
                onChange={e => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
              >
                {MAINTENANCE_TYPES.map(t => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="الوصف"
              value={maintenanceForm.description || ''}
              onChange={e =>
                setMaintenanceForm({ ...maintenanceForm, description: e.target.value })
              }
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="التكلفة (ر.س)"
              type="number"
              value={maintenanceForm.cost || ''}
              onChange={e => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
              fullWidth
            />
            <TextField
              label="التاريخ"
              type="date"
              value={maintenanceForm.date || ''}
              onChange={e => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="مقدم الخدمة"
              value={maintenanceForm.provider || ''}
              onChange={e => setMaintenanceForm({ ...maintenanceForm, provider: e.target.value })}
              fullWidth
            />
            <TextField
              label="قراءة العداد (كم)"
              type="number"
              value={maintenanceForm.odometer || ''}
              onChange={e => setMaintenanceForm({ ...maintenanceForm, odometer: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMaintenanceDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleMaintenanceSave}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════ حوار تسجيل وقود ═══════ */}
      <Dialog open={fuelDialog} onClose={() => setFuelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: surfaceColors.lightGray }}>تسجيل تعبئة وقود</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>المركبة</InputLabel>
              <Select
                value={fuelForm.vehicleId || ''}
                label="المركبة"
                onChange={e => setFuelForm({ ...fuelForm, vehicleId: e.target.value })}
              >
                {vehicles.map(v => (
                  <MenuItem key={v._id} value={v._id}>
                    {v.plateNumber} - {v.basicInfo?.make} {v.basicInfo?.model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="التاريخ"
              type="date"
              value={fuelForm.date || ''}
              onChange={e => setFuelForm({ ...fuelForm, date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="الكمية (لتر)"
              type="number"
              value={fuelForm.liters || ''}
              onChange={e => setFuelForm({ ...fuelForm, liters: e.target.value })}
              fullWidth
            />
            <TextField
              label="التكلفة (ر.س)"
              type="number"
              value={fuelForm.cost || ''}
              onChange={e => setFuelForm({ ...fuelForm, cost: e.target.value })}
              fullWidth
            />
            <TextField
              label="قراءة العداد (كم)"
              type="number"
              value={fuelForm.odometer || ''}
              onChange={e => setFuelForm({ ...fuelForm, odometer: e.target.value })}
              fullWidth
            />
            <TextField
              label="المحطة"
              value={fuelForm.station || ''}
              onChange={e => setFuelForm({ ...fuelForm, station: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>نوع الوقود</InputLabel>
              <Select
                value={fuelForm.fuelType || 'بنزين 91'}
                label="نوع الوقود"
                onChange={e => setFuelForm({ ...fuelForm, fuelType: e.target.value })}
              >
                <MenuItem value="بنزين 91">بنزين 91</MenuItem>
                <MenuItem value="بنزين 95">بنزين 95</MenuItem>
                <MenuItem value="ديزل">ديزل</MenuItem>
                <MenuItem value="كهرباء">كهرباء</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFuelDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleFuelSave}>
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════ حوار تفاصيل المركبة ═══════ */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: surfaceColors.lightGray }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CarIcon color="primary" />
            تفاصيل المركبة — {selectedVehicle?.plateNumber}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedVehicle && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Basic Info */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  المعلومات الأساسية
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  رقم اللوحة
                </Typography>
                <Typography fontWeight="bold">{selectedVehicle.plateNumber}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  رقم التسجيل
                </Typography>
                <Typography>{selectedVehicle.registrationNumber || '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  الحالة
                </Typography>
                <Chip
                  label={selectedVehicle.status}
                  size="small"
                  color={
                    VEHICLE_STATUSES.find(s => s.value === selectedVehicle.status)?.color ||
                    'default'
                  }
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  الشركة
                </Typography>
                <Typography>{selectedVehicle.basicInfo?.make}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  الموديل
                </Typography>
                <Typography>{selectedVehicle.basicInfo?.model}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  السنة
                </Typography>
                <Typography>{selectedVehicle.basicInfo?.year}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  اللون
                </Typography>
                <Typography>{selectedVehicle.basicInfo?.color || '-'}</Typography>
              </Grid>

              {/* Performance */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  الأداء
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  العداد
                </Typography>
                <Typography fontWeight="bold">
                  {selectedVehicle.performance?.odometer?.toLocaleString()} كم
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  استهلاك الوقود
                </Typography>
                <Typography>{selectedVehicle.performance?.fuelConsumption} لتر/100كم</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  الحالة الفنية
                </Typography>
                <Chip
                  label={selectedVehicle.performance?.condition || '-'}
                  size="small"
                  color={CONDITION_MAP[selectedVehicle.performance?.condition]?.color || 'default'}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  نوع الوقود
                </Typography>
                <Typography>{selectedVehicle.basicInfo?.fuelType}</Typography>
              </Grid>

              {/* Insurance & Inspection */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  التأمين والفحص
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  التأمين
                </Typography>
                <Chip
                  label={selectedVehicle.insurance?.insured ? 'مؤمنة' : 'غير مؤمنة'}
                  size="small"
                  color={selectedVehicle.insurance?.insured ? 'success' : 'error'}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  انتهاء التأمين
                </Typography>
                <Typography>{selectedVehicle.insurance?.policyExpiryDate || '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  الفحص القادم
                </Typography>
                <Typography>{selectedVehicle.inspection?.nextInspectionDate || '-'}</Typography>
              </Grid>

              {/* Driver & Location */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  السائق والموقع
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  السائق المعين
                </Typography>
                <Typography fontWeight="bold">
                  {selectedVehicle.assignedDriver?.name || 'غير معين'}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  GPS
                </Typography>
                <Chip
                  label={selectedVehicle.tracking?.gpsEnabled ? 'مفعل' : 'غير مفعل'}
                  size="small"
                  color={selectedVehicle.tracking?.gpsEnabled ? 'success' : 'default'}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  آخر موقع
                </Typography>
                <Typography>{selectedVehicle.tracking?.lastLocation?.address || '-'}</Typography>
              </Grid>

              {/* Maintenance Cost */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  الصيانة
                </Typography>
                <Divider sx={{ mb: 1 }} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  إجمالي تكلفة الصيانة
                </Typography>
                <Typography fontWeight="bold" color="error">
                  {selectedVehicle.maintenance?.totalMaintenanceCost?.toLocaleString() || 0} ر.س
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  عدد سجلات الصيانة
                </Typography>
                <Typography>
                  {selectedVehicle.maintenance?.maintenanceHistory?.length || 0}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>إغلاق</Button>
          <Button
            variant="outlined"
            startIcon={<MaintenanceIcon />}
            onClick={() => {
              setDetailDialog(false);
              openMaintenanceCreate(selectedVehicle);
            }}
          >
            إضافة صيانة
          </Button>
          <Button
            variant="outlined"
            startIcon={<FuelIcon />}
            onClick={() => {
              setDetailDialog(false);
              openFuelCreate(selectedVehicle);
            }}
          >
            تسجيل وقود
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog {...confirmState} />
    </Container>
  );
};

export default VehicleManagement;
