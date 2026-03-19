/**
 * 🚌 خدمة إدارة النقل والمواصلات — Transport Management Service
 * AlAwael ERP
 */
import apiClient from './api.client';
import logger from '../utils/logger';

const safe = (fn, fallback = null) =>
  fn().catch(err => {
    logger.warn('transportService ▸', err.message);
    return fallback;
  });

/* ═══ Static Data ═══ */
const ROUTE_TYPES = ['ذهاب', 'إياب', 'ذهاب وإياب', 'خاص', 'طوارئ'];
const TRIP_STATUSES = ['مجدول', 'جاري', 'مكتمل', 'ملغي', 'متأخر'];
const VEHICLE_TYPES = ['حافلة كبيرة', 'حافلة صغيرة', 'سيارة ركاب', 'شاحنة نقل', 'فان'];
const FUEL_TYPES = ['بنزين', 'ديزل', 'كهربائي', 'هجين'];
const ACCIDENT_SEVERITY = ['بسيط', 'متوسط', 'خطير', 'كارثي'];
const DRIVER_STATUSES = ['متاح', 'في مهمة', 'إجازة', 'موقوف', 'تدريب'];

/* ═══ Mock Routes ═══ */
const MOCK_ROUTES = Array.from({ length: 14 }, (_, i) => ({
  _id: `route-${i + 1}`,
  routeName: [
    'المركز ← مدرسة النور',
    'حي الربوة ← المركز',
    'المركز ← المستشفى',
    'الحي الجنوبي ← المركز',
    'المركز ← مدرسة الأمل',
    'حي الورود ← المركز',
    'المركز ← مركز التأهيل',
    'الحي الشمالي ← المركز',
    'المركز ← حي السلام',
    'المركز ← النادي الرياضي',
    'حي الشفاء ← المركز',
    'المركز ← مكتب الإدارة',
    'الحي الغربي ← المركز',
    'المركز ← مدرسة الفجر',
  ][i],
  routeCode: `R-${String(i + 1).padStart(3, '0')}`,
  type: ROUTE_TYPES[i % 5],
  stopsCount: 3 + (i % 6),
  totalDistance: +(5 + Math.random() * 25).toFixed(1),
  estimatedTime: 15 + (i % 8) * 5,
  assignedVehicle: i < 10 ? `حافلة #${(i % 5) + 1}` : null,
  assignedDriver:
    i < 10
      ? ['سعيد الحربي', 'ماجد العتيبي', 'فهد الشمري', 'عبدالرحمن القحطاني', 'تركي المطيري'][i % 5]
      : null,
  passengers: Math.floor(8 + Math.random() * 30),
  status: i < 10 ? 'نشط' : i < 12 ? 'متوقف' : 'قيد الإنشاء',
  rating: +(3.5 + Math.random() * 1.5).toFixed(1),
  createdAt: new Date(2025, 8 + (i % 4), 1 + i).toISOString(),
}));

/* ═══ Mock Trips ═══ */
const MOCK_TRIPS = Array.from({ length: 20 }, (_, i) => {
  const statuses = TRIP_STATUSES;
  const today = new Date();
  const d = new Date(today);
  d.setDate(d.getDate() - Math.floor(i / 4));
  const hour = 6 + (i % 12);
  return {
    _id: `trip-${i + 1}`,
    tripNumber: `T-${String(1000 + i)}`,
    route: MOCK_ROUTES[i % 14].routeName,
    routeId: `route-${(i % 14) + 1}`,
    driver: ['سعيد الحربي', 'ماجد العتيبي', 'فهد الشمري', 'عبدالرحمن القحطاني', 'تركي المطيري'][
      i % 5
    ],
    vehicle: `حافلة #${(i % 5) + 1}`,
    vehicleType: VEHICLE_TYPES[i % 5],
    date: d.toISOString().slice(0, 10),
    startTime: `${String(hour).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
    endTime: `${String(hour + 1).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
    passengers: Math.floor(5 + Math.random() * 25),
    distance: +(5 + Math.random() * 20).toFixed(1),
    fuelConsumed: +(2 + Math.random() * 8).toFixed(1),
    status: statuses[i < 8 ? 2 : i < 12 ? 1 : i < 16 ? 0 : i < 18 ? 4 : 3],
    notes: i % 3 === 0 ? 'رحلة طبيعية بدون ملاحظات' : '',
  };
});

/* ═══ Mock Drivers ═══ */
const MOCK_DRIVERS = [
  {
    _id: 'd-1',
    name: 'سعيد الحربي',
    phone: '0501234567',
    licenseType: 'ثقيل',
    licenseExpiry: '2027-06-15',
    vehicle: 'حافلة كبيرة #3',
    totalTrips: 342,
    rating: 4.8,
    status: 'متاح',
    monthlyTrips: 28,
  },
  {
    _id: 'd-2',
    name: 'ماجد العتيبي',
    phone: '0509876543',
    licenseType: 'ثقيل',
    licenseExpiry: '2027-03-20',
    vehicle: 'حافلة صغيرة #1',
    totalTrips: 298,
    rating: 4.6,
    status: 'في مهمة',
    monthlyTrips: 25,
  },
  {
    _id: 'd-3',
    name: 'فهد الشمري',
    phone: '0551234567',
    licenseType: 'خاص',
    licenseExpiry: '2026-12-01',
    vehicle: 'سيارة ركاب #2',
    totalTrips: 267,
    rating: 4.5,
    status: 'متاح',
    monthlyTrips: 22,
  },
  {
    _id: 'd-4',
    name: 'عبدالرحمن القحطاني',
    phone: '0561234567',
    licenseType: 'ثقيل',
    licenseExpiry: '2027-01-10',
    vehicle: 'حافلة كبيرة #1',
    totalTrips: 312,
    rating: 4.3,
    status: 'إجازة',
    monthlyTrips: 20,
  },
  {
    _id: 'd-5',
    name: 'تركي المطيري',
    phone: '0571234567',
    licenseType: 'نقل',
    licenseExpiry: '2026-09-30',
    vehicle: 'شاحنة نقل #1',
    totalTrips: 189,
    rating: 4.7,
    status: 'متاح',
    monthlyTrips: 18,
  },
  {
    _id: 'd-6',
    name: 'خالد الغامدي',
    phone: '0581234567',
    licenseType: 'ثقيل',
    licenseExpiry: '2027-04-22',
    vehicle: 'حافلة صغيرة #2',
    totalTrips: 156,
    rating: 4.2,
    status: 'تدريب',
    monthlyTrips: 14,
  },
  {
    _id: 'd-7',
    name: 'نايف العنزي',
    phone: '0591234567',
    licenseType: 'خاص',
    licenseExpiry: '2026-11-15',
    vehicle: 'سيارة ركاب #3',
    totalTrips: 203,
    rating: 4.9,
    status: 'متاح',
    monthlyTrips: 20,
  },
  {
    _id: 'd-8',
    name: 'بندر الدوسري',
    phone: '0541234567',
    licenseType: 'ثقيل',
    licenseExpiry: '2027-08-05',
    vehicle: 'فان #1',
    totalTrips: 145,
    rating: 4.4,
    status: 'موقوف',
    monthlyTrips: 0,
  },
];

/* ═══ Mock Fuel Records ═══ */
const MOCK_FUEL = Array.from({ length: 15 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - i * 2);
  return {
    _id: `fuel-${i + 1}`,
    vehicle: `حافلة #${(i % 5) + 1}`,
    driver: MOCK_DRIVERS[i % 8].name,
    date: d.toISOString().slice(0, 10),
    fuelType: FUEL_TYPES[i % 4],
    liters: +(30 + Math.random() * 70).toFixed(1),
    costPerLiter: +(2.0 + Math.random() * 0.5).toFixed(2),
    totalCost: 0,
    odometer: 45000 + i * 350,
    station: ['أرامكو', 'الدريس', 'نفط', 'ساسكو'][i % 4],
    receipt: `RCP-${2000 + i}`,
  };
});
MOCK_FUEL.forEach(f => {
  f.totalCost = +(f.liters * f.costPerLiter).toFixed(2);
});

/* ═══ Mock Accidents ═══ */
const MOCK_ACCIDENTS = [
  {
    _id: 'acc-1',
    date: '2026-02-15',
    vehicle: 'حافلة #2',
    driver: 'ماجد العتيبي',
    location: 'شارع الملك فهد',
    severity: 'بسيط',
    description: 'خدش جانبي بسيط في المرآب',
    injuries: 0,
    estimatedCost: 1200,
    status: 'مغلق',
    insuranceClaim: 'CLM-001',
  },
  {
    _id: 'acc-2',
    date: '2026-01-28',
    vehicle: 'سيارة #2',
    driver: 'فهد الشمري',
    location: 'تقاطع حي الورود',
    severity: 'متوسط',
    description: 'اصطدام خفيف عند الإشارة',
    injuries: 0,
    estimatedCost: 4500,
    status: 'قيد المعالجة',
    insuranceClaim: 'CLM-002',
  },
  {
    _id: 'acc-3',
    date: '2025-12-10',
    vehicle: 'حافلة #1',
    driver: 'عبدالرحمن القحطاني',
    location: 'طريق الملك عبدالعزيز',
    severity: 'بسيط',
    description: 'انفجار إطار خلفي',
    injuries: 0,
    estimatedCost: 800,
    status: 'مغلق',
    insuranceClaim: '',
  },
  {
    _id: 'acc-4',
    date: '2025-11-05',
    vehicle: 'شاحنة #1',
    driver: 'تركي المطيري',
    location: 'منطقة صناعية',
    severity: 'متوسط',
    description: 'تضرر مصد أمامي',
    injuries: 0,
    estimatedCost: 3200,
    status: 'مغلق',
    insuranceClaim: 'CLM-003',
  },
];

/* ═══ Mock Monthly Stats ═══ */
const MOCK_MONTHLY_STATS = [
  { month: 'سبتمبر', trips: 180, passengers: 2880, fuel: 4200, cost: 9240, distance: 3200 },
  { month: 'أكتوبر', trips: 195, passengers: 3120, fuel: 4550, cost: 10010, distance: 3450 },
  { month: 'نوفمبر', trips: 172, passengers: 2752, fuel: 4100, cost: 9020, distance: 3100 },
  { month: 'ديسمبر', trips: 165, passengers: 2640, fuel: 3900, cost: 8580, distance: 2950 },
  { month: 'يناير', trips: 188, passengers: 3008, fuel: 4350, cost: 9570, distance: 3300 },
  { month: 'فبراير', trips: 210, passengers: 3360, fuel: 4800, cost: 10560, distance: 3600 },
];

/* ═══ Service Methods ═══ */
const transportService = {
  /* — Static Getters — */
  getRouteTypes: () => ROUTE_TYPES,
  getTripStatuses: () => TRIP_STATUSES,
  getVehicleTypes: () => VEHICLE_TYPES,
  getFuelTypes: () => FUEL_TYPES,
  getAccidentSeverities: () => ACCIDENT_SEVERITY,
  getDriverStatuses: () => DRIVER_STATUSES,

  /* — Routes — */
  getRoutes: () =>
    safe(async () => {
      const r = await apiClient.get('/transport-routes');
      return r.data?.data || r.data || r;
    }, MOCK_ROUTES),
  getRoute: id =>
    safe(async () => {
      const r = await apiClient.get(`/transport-routes/${id}`);
      return r.data?.data || r.data || r;
    }),
  createRoute: data =>
    safe(async () => {
      const r = await apiClient.post('/transport-routes', data);
      return r.data?.data || r.data || r;
    }),
  updateRoute: (id, data) =>
    safe(async () => {
      const r = await apiClient.put(`/transport-routes/${id}`, data);
      return r.data?.data || r.data || r;
    }),
  deleteRoute: id =>
    safe(async () => {
      await apiClient.delete(`/transport-routes/${id}`);
      return true;
    }, false),
  optimizeRoute: id =>
    safe(async () => {
      const r = await apiClient.post(`/transport-routes/${id}/optimize`);
      return r.data?.data || r.data || r;
    }),
  getRouteStatistics: () =>
    safe(async () => {
      const r = await apiClient.get('/transport-routes/statistics');
      return r.data?.data || r.data || r;
    }),

  /* — Trips — */
  getTrips: () =>
    safe(async () => {
      const r = await apiClient.get('/trips');
      return r.data?.data || r.data || r;
    }, MOCK_TRIPS),
  createTrip: data =>
    safe(async () => {
      const r = await apiClient.post('/trips', data);
      return r.data?.data || r.data || r;
    }),
  updateTrip: (id, data) =>
    safe(async () => {
      const r = await apiClient.put(`/trips/${id}`, data);
      return r.data?.data || r.data || r;
    }),
  deleteTrip: id =>
    safe(async () => {
      await apiClient.delete(`/trips/${id}`);
      return true;
    }, false),

  /* — Drivers — */
  getDrivers: () =>
    safe(async () => {
      const r = await apiClient.get('/drivers');
      return r.data?.data || r.data || r;
    }, MOCK_DRIVERS),
  createDriver: data =>
    safe(async () => {
      const r = await apiClient.post('/drivers', data);
      return r.data?.data || r.data || r;
    }),
  updateDriver: (id, data) =>
    safe(async () => {
      const r = await apiClient.put(`/drivers/${id}`, data);
      return r.data?.data || r.data || r;
    }),

  /* — Fuel — */
  getFuelRecords: () =>
    safe(async () => {
      const r = await apiClient.get('/fuel');
      return r.data?.data || r.data || r;
    }, MOCK_FUEL),
  createFuelRecord: data =>
    safe(async () => {
      const r = await apiClient.post('/fuel', data);
      return r.data?.data || r.data || r;
    }),

  /* — Accidents — */
  getAccidents: () =>
    safe(async () => {
      const r = await apiClient.get('/traffic-accidents');
      return r.data?.data || r.data || r;
    }, MOCK_ACCIDENTS),
  createAccident: data =>
    safe(async () => {
      const r = await apiClient.post('/traffic-accidents', data);
      return r.data?.data || r.data || r;
    }),
  updateAccident: (id, data) =>
    safe(async () => {
      const r = await apiClient.put(`/traffic-accidents/${id}`, data);
      return r.data?.data || r.data || r;
    }),

  /* — GPS — */
  getGPSLocations: () =>
    safe(async () => {
      const r = await apiClient.get('/gps/locations');
      return r.data?.data || r.data || r;
    }, []),

  /* — Analytics / Dashboard — */
  getMonthlyStats: () =>
    safe(async () => {
      const r = await apiClient.get('/transport/analytics/monthly');
      return r.data?.data || r.data || r;
    }, MOCK_MONTHLY_STATS),
  getDashboardSummary: () =>
    safe(async () => {
      const r = await apiClient.get('/transport/dashboard');
      return r.data?.data || r.data || r;
    }, null),
};

export default transportService;
