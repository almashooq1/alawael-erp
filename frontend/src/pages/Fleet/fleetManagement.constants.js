/**
 * fleetManagement.constants.js — Status map, tab definitions, table config
 * ثوابت إدارة الأسطول
 */


import { statusColors as paletteStatus } from '../../theme/palette';

/** Chip color map (MUI color prop) for entity statuses */
export const STATUS_CHIP_COLORS = {
  active: 'success',
  available: 'success',
  completed: 'info',
  inactive: 'default',
  'in-transit': 'warning',
  maintenance: 'error',
  pending: 'warning',
  cancelled: 'error',
};

export const TABS = [
  { label: 'السائقون', icon: <PersonIcon />, key: 'drivers' },
  { label: 'المركبات', icon: <CarIcon />, key: 'vehicles' },
  { label: 'الرحلات', icon: <TripIcon />, key: 'trips' },
  { label: 'المسارات', icon: <RouteIcon />, key: 'routes' },
  { label: 'الحوادث', icon: <AccidentIcon />, key: 'accidents' },
  { label: 'تتبع GPS', icon: <GpsIcon />, key: 'gps' },
];

export const COLUMNS = {
  drivers: ['name', 'licenseNumber', 'phone', 'status', 'rating', 'vehicleAssigned'],
  vehicles: ['plateNumber', 'make', 'model', 'year', 'status', 'mileage', 'fuelType'],
  trips: ['origin', 'destination', 'driver', 'vehicle', 'status', 'date', 'distance'],
  routes: ['name', 'origin', 'destination', 'distance', 'estimatedTime', 'status'],
  accidents: ['date', 'location', 'driver', 'vehicle', 'severity', 'status'],
  gps: ['vehicle', 'lat', 'lng', 'speed', 'lastUpdate', 'status'],
};

export const HEADERS = {
  drivers: ['الاسم', 'رقم الرخصة', 'الهاتف', 'الحالة', 'التقييم', 'المركبة'],
  vehicles: ['رقم اللوحة', 'الشركة', 'الموديل', 'السنة', 'الحالة', 'المسافة', 'الوقود'],
  trips: ['نقطة الانطلاق', 'الوجهة', 'السائق', 'المركبة', 'الحالة', 'التاريخ', 'المسافة'],
  routes: ['اسم المسار', 'نقطة البداية', 'نقطة النهاية', 'المسافة', 'الوقت المتوقع', 'الحالة'],
  accidents: ['التاريخ', 'الموقع', 'السائق', 'المركبة', 'الخطورة', 'الحالة'],
  gps: ['المركبة', 'خط العرض', 'خط الطول', 'السرعة', 'آخر تحديث', 'الحالة'],
};

/** Stats card definitions computed from data */
export const STAT_CARDS = data => [
  {
    label: 'السائقون النشطون',
    value: (Array.isArray(data.drivers) ? data.drivers : []).filter(d => d.status === 'active')
      .length,
    color: paletteStatus.success,
  },
  {
    label: 'المركبات المتاحة',
    value: (Array.isArray(data.vehicles) ? data.vehicles : []).filter(v => v.status === 'active')
      .length,
    color: paletteStatus.primaryBlue,
  },
  {
    label: 'الرحلات الجارية',
    value: (Array.isArray(data.trips) ? data.trips : []).filter(t => t.status === 'in-transit')
      .length,
    color: paletteStatus.warning,
  },
  {
    label: 'إجمالي الحوادث',
    value: (Array.isArray(data.accidents) ? data.accidents : []).length,
    color: paletteStatus.error,
  },
];
