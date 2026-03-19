/**
 * 💝 إدارة التبرعات والرعاية — Donations & Sponsorship Service
 * AlAwael ERP
 */
import apiClient from 'services/api.client';
import logger from 'utils/logger';

const safe = async (fn, fallback = null) => {
  try {
    return await fn();
  } catch (e) {
    logger.error('donationsService:', e);
    return fallback;
  }
};

// ═══════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════
export const MOCK_CAMPAIGNS = [
  {
    _id: 'camp-1',
    name: 'حملة كفالة طالب',
    description: 'كفالة طلاب التربية الخاصة لعام 2026',
    targetAmount: 500000,
    collectedAmount: 340000,
    status: 'نشطة',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    category: 'كفالة تعليمية',
    createdBy: 'إدارة التبرعات',
    donorsCount: 85,
    image: '',
  },
  {
    _id: 'camp-2',
    name: 'بناء مركز تأهيل جديد',
    description: 'مشروع بناء مركز تأهيل متخصص في جنوب الرياض',
    targetAmount: 2000000,
    collectedAmount: 1450000,
    status: 'نشطة',
    startDate: '2025-06-01',
    endDate: '2026-06-30',
    category: 'بنية تحتية',
    createdBy: 'إدارة المشاريع',
    donorsCount: 42,
    image: '',
  },
  {
    _id: 'camp-3',
    name: 'مبادرة الأجهزة المساعدة',
    description: 'توفير أجهزة سمعية وبصرية للمحتاجين',
    targetAmount: 300000,
    collectedAmount: 198000,
    status: 'نشطة',
    startDate: '2026-02-01',
    endDate: '2026-08-31',
    category: 'أجهزة مساعدة',
    createdBy: 'قسم التأهيل',
    donorsCount: 56,
    image: '',
  },
  {
    _id: 'camp-4',
    name: 'صندوق الزكاة',
    description: 'صندوق الزكاة لدعم الأسر المحتاجة',
    targetAmount: 800000,
    collectedAmount: 650000,
    status: 'نشطة',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    category: 'زكاة',
    createdBy: 'إدارة التبرعات',
    donorsCount: 220,
    image: '',
  },
  {
    _id: 'camp-5',
    name: 'حملة رمضان الخيرية',
    description: 'حملة جمع تبرعات شهر رمضان المبارك',
    targetAmount: 400000,
    collectedAmount: 400000,
    status: 'مكتملة',
    startDate: '2026-03-01',
    endDate: '2026-04-01',
    category: 'مناسبات',
    createdBy: 'إدارة التبرعات',
    donorsCount: 310,
    image: '',
  },
  {
    _id: 'camp-6',
    name: 'تطوير المناهج الخاصة',
    description: 'تطوير وتحديث مناهج التربية الخاصة',
    targetAmount: 150000,
    collectedAmount: 45000,
    status: 'نشطة',
    startDate: '2026-04-01',
    endDate: '2026-10-31',
    category: 'تعليم',
    createdBy: 'إدارة المناهج',
    donorsCount: 15,
    image: '',
  },
];

export const MOCK_DONORS = [
  {
    _id: 'dn-1',
    name: 'عبدالرحمن الراجحي',
    type: 'فرد',
    email: 'rajhi@email.com',
    phone: '0501111111',
    totalDonations: 250000,
    donationsCount: 12,
    firstDonation: '2024-03-15',
    lastDonation: '2026-03-10',
    preferredCampaign: 'كفالة تعليمية',
    status: 'نشط',
    notes: 'داعم رئيسي',
  },
  {
    _id: 'dn-2',
    name: 'شركة المراعي',
    type: 'شركة',
    email: 'csr@almarai.com',
    phone: '0112222222',
    totalDonations: 500000,
    donationsCount: 4,
    firstDonation: '2025-01-10',
    lastDonation: '2026-02-20',
    preferredCampaign: 'بنية تحتية',
    status: 'نشط',
    notes: 'عقد رعاية سنوي',
  },
  {
    _id: 'dn-3',
    name: 'مؤسسة الوليد الخيرية',
    type: 'مؤسسة خيرية',
    email: 'info@waleed.org',
    phone: '0113333333',
    totalDonations: 750000,
    donationsCount: 8,
    firstDonation: '2024-05-20',
    lastDonation: '2026-03-01',
    preferredCampaign: 'أجهزة مساعدة',
    status: 'نشط',
    notes: 'شريك استراتيجي',
  },
  {
    _id: 'dn-4',
    name: 'سعود الفيصل',
    type: 'فرد',
    email: 'saud@email.com',
    phone: '0504444444',
    totalDonations: 85000,
    donationsCount: 6,
    firstDonation: '2025-06-10',
    lastDonation: '2026-01-15',
    preferredCampaign: 'زكاة',
    status: 'نشط',
    notes: '',
  },
  {
    _id: 'dn-5',
    name: 'بنك الجزيرة',
    type: 'شركة',
    email: 'csr@baj.com',
    phone: '0115555555',
    totalDonations: 300000,
    donationsCount: 3,
    firstDonation: '2025-09-01',
    lastDonation: '2026-03-05',
    preferredCampaign: 'كفالة تعليمية',
    status: 'نشط',
    notes: '',
  },
  {
    _id: 'dn-6',
    name: 'هند المطلق',
    type: 'فرد',
    email: 'hend@email.com',
    phone: '0506666666',
    totalDonations: 42000,
    donationsCount: 15,
    firstDonation: '2024-01-01',
    lastDonation: '2026-03-15',
    preferredCampaign: 'مناسبات',
    status: 'نشط',
    notes: 'متبرع منتظم شهرياً',
  },
  {
    _id: 'dn-7',
    name: 'جمعية البر الخيرية',
    type: 'مؤسسة خيرية',
    email: 'info@alber.org',
    phone: '0117777777',
    totalDonations: 180000,
    donationsCount: 5,
    firstDonation: '2025-04-01',
    lastDonation: '2026-02-01',
    preferredCampaign: 'تعليم',
    status: 'نشط',
    notes: '',
  },
  {
    _id: 'dn-8',
    name: 'خالد العثيم',
    type: 'فرد',
    email: 'khalid@email.com',
    phone: '0508888888',
    totalDonations: 120000,
    donationsCount: 3,
    firstDonation: '2025-11-01',
    lastDonation: '2026-03-10',
    preferredCampaign: 'بنية تحتية',
    status: 'نشط',
    notes: '',
  },
];

export const MOCK_DONATIONS = [
  {
    _id: 'don-1',
    donorId: 'dn-1',
    donorName: 'عبدالرحمن الراجحي',
    campaignId: 'camp-1',
    campaignName: 'حملة كفالة طالب',
    amount: 50000,
    type: 'تحويل بنكي',
    date: '2026-03-10',
    receiptNo: 'RCP-20260310-001',
    status: 'مؤكد',
    notes: '',
  },
  {
    _id: 'don-2',
    donorId: 'dn-2',
    donorName: 'شركة المراعي',
    campaignId: 'camp-2',
    campaignName: 'بناء مركز تأهيل جديد',
    amount: 200000,
    type: 'شيك',
    date: '2026-02-20',
    receiptNo: 'RCP-20260220-001',
    status: 'مؤكد',
    notes: 'دفعة ربعية',
  },
  {
    _id: 'don-3',
    donorId: 'dn-3',
    donorName: 'مؤسسة الوليد الخيرية',
    campaignId: 'camp-3',
    campaignName: 'مبادرة الأجهزة المساعدة',
    amount: 100000,
    type: 'تحويل بنكي',
    date: '2026-03-01',
    receiptNo: 'RCP-20260301-001',
    status: 'مؤكد',
    notes: '',
  },
  {
    _id: 'don-4',
    donorId: 'dn-4',
    donorName: 'سعود الفيصل',
    campaignId: 'camp-4',
    campaignName: 'صندوق الزكاة',
    amount: 20000,
    type: 'نقدي',
    date: '2026-01-15',
    receiptNo: 'RCP-20260115-001',
    status: 'مؤكد',
    notes: 'زكاة مال',
  },
  {
    _id: 'don-5',
    donorId: 'dn-6',
    donorName: 'هند المطلق',
    campaignId: 'camp-5',
    campaignName: 'حملة رمضان الخيرية',
    amount: 5000,
    type: 'بطاقة ائتمان',
    date: '2026-03-15',
    receiptNo: 'RCP-20260315-001',
    status: 'مؤكد',
    notes: 'تبرع شهري',
  },
  {
    _id: 'don-6',
    donorId: 'dn-5',
    donorName: 'بنك الجزيرة',
    campaignId: 'camp-1',
    campaignName: 'حملة كفالة طالب',
    amount: 100000,
    type: 'تحويل بنكي',
    date: '2026-03-05',
    receiptNo: 'RCP-20260305-001',
    status: 'مؤكد',
    notes: '',
  },
  {
    _id: 'don-7',
    donorId: 'dn-8',
    donorName: 'خالد العثيم',
    campaignId: 'camp-2',
    campaignName: 'بناء مركز تأهيل جديد',
    amount: 50000,
    type: 'شيك',
    date: '2026-03-10',
    receiptNo: 'RCP-20260310-002',
    status: 'معلق',
    notes: 'بانتظار تحصيل الشيك',
  },
];

export const MOCK_DONATIONS_DASHBOARD = {
  totalDonations: 3083000,
  donationsThisMonth: 525000,
  totalDonors: 8,
  activeCampaigns: 5,
  avgDonation: 45340,
  completedCampaigns: 1,
  categoryDistribution: [
    { name: 'كفالة تعليمية', amount: 490000 },
    { name: 'بنية تحتية', amount: 1500000 },
    { name: 'أجهزة مساعدة', amount: 198000 },
    { name: 'زكاة', amount: 650000 },
    { name: 'مناسبات', amount: 400000 },
    { name: 'تعليم', amount: 45000 },
  ],
  monthlyTrend: [
    { month: 'يناير', amount: 320000, donors: 28 },
    { month: 'فبراير', amount: 450000, donors: 35 },
    { month: 'مارس', amount: 525000, donors: 42 },
    { month: 'أبريل', amount: 380000, donors: 30 },
    { month: 'مايو', amount: 410000, donors: 33 },
    { month: 'يونيو', amount: 490000, donors: 38 },
  ],
  donorTypes: [
    { name: 'أفراد', count: 4, amount: 497000 },
    { name: 'شركات', count: 2, amount: 800000 },
    { name: 'مؤسسات خيرية', count: 2, amount: 930000 },
  ],
  paymentMethods: [
    { name: 'تحويل بنكي', count: 3, amount: 250000 },
    { name: 'شيك', count: 2, amount: 250000 },
    { name: 'نقدي', count: 1, amount: 20000 },
    { name: 'بطاقة ائتمان', count: 1, amount: 5000 },
  ],
};

// ═══════════════════════════════════════════
// Services
// ═══════════════════════════════════════════
export const campaignsService = {
  getAll: () => safe(() => apiClient.get('/campaigns').then(r => r.data), MOCK_CAMPAIGNS),
  getById: id =>
    safe(
      () => apiClient.get(`/campaigns/${id}`).then(r => r.data),
      MOCK_CAMPAIGNS.find(c => c._id === id)
    ),
  create: data => safe(() => apiClient.post('/campaigns', data).then(r => r.data)),
  update: (id, data) => safe(() => apiClient.put(`/campaigns/${id}`, data).then(r => r.data)),
  remove: id => safe(() => apiClient.delete(`/campaigns/${id}`).then(r => r.data)),
};

export const donorsService = {
  getAll: () => safe(() => apiClient.get('/donors').then(r => r.data), MOCK_DONORS),
  getById: id =>
    safe(
      () => apiClient.get(`/donors/${id}`).then(r => r.data),
      MOCK_DONORS.find(d => d._id === id)
    ),
  create: data => safe(() => apiClient.post('/donors', data).then(r => r.data)),
  update: (id, data) => safe(() => apiClient.put(`/donors/${id}`, data).then(r => r.data)),
  remove: id => safe(() => apiClient.delete(`/donors/${id}`).then(r => r.data)),
};

export const donationsListService = {
  getAll: () => safe(() => apiClient.get('/donations').then(r => r.data), MOCK_DONATIONS),
  create: data => safe(() => apiClient.post('/donations', data).then(r => r.data)),
  getByDonor: donorId =>
    safe(
      () => apiClient.get(`/donations/donor/${donorId}`).then(r => r.data),
      MOCK_DONATIONS.filter(d => d.donorId === donorId)
    ),
  getByCampaign: campaignId =>
    safe(
      () => apiClient.get(`/donations/campaign/${campaignId}`).then(r => r.data),
      MOCK_DONATIONS.filter(d => d.campaignId === campaignId)
    ),
};

export const donationsReportsService = {
  getDashboardStats: () =>
    safe(
      () => apiClient.get('/donations/dashboard/stats').then(r => r.data),
      MOCK_DONATIONS_DASHBOARD
    ),
};
