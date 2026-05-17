/**
 * Social Media Management Service — خدمة إدارة منصات التواصل الاجتماعي
 *
 * Provides a unified API layer for all social media management operations:
 * analytics, post scheduling, platform performance, audience insights,
 * campaign tracking, and content queue management.
 */

import apiClient from './api.client';
import logger from 'utils/logger';

const BASE = '/api/v1/social-media';

// ─── Platform Constants ──────────────────────────────────────────────────────

export const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C', icon: 'IG' },
  { id: 'twitter', label: 'X (Twitter)', color: '#000000', icon: 'X' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2', icon: 'FB' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: 'LI' },
  { id: 'tiktok', label: 'TikTok', color: '#010101', icon: 'TT' },
  { id: 'youtube', label: 'YouTube', color: '#FF0000', icon: 'YT' },
  { id: 'snapchat', label: 'Snapchat', color: '#FFFC00', icon: 'SC' },
  { id: 'threads', label: 'Threads', color: '#101010', icon: 'TH' },
  { id: 'telegram', label: 'Telegram', color: '#2CA5E0', icon: 'TG' },
  { id: 'pinterest', label: 'Pinterest', color: '#E60023', icon: 'PT' },
];

export const POST_STATUSES = {
  published: { label: 'منشور', color: 'success' },
  scheduled: { label: 'مجدول', color: 'info' },
  draft: { label: 'مسودة', color: 'default' },
  failed: { label: 'فشل', color: 'error' },
  pending: { label: 'قيد المراجعة', color: 'warning' },
};

// ─── Mock Data Generators ────────────────────────────────────────────────────

const MOCK_OVERVIEW = {
  totalFollowers: 545_220,
  followerGrowth: '+9.1%',
  totalEngagements: 96_840,
  engagementRate: '4.4%',
  scheduledPosts: 23,
  publishedThisMonth: 87,
  totalReach: 1_428_000,
  reachGrowth: '+14.3%',
  platformBreakdown: [
    { platform: 'instagram', followers: 182_400, engagement: 5.8, reach: 520_000, posts: 28 },
    { platform: 'twitter', followers: 97_800, engagement: 3.1, reach: 280_000, posts: 41 },
    { platform: 'facebook', followers: 134_200, engagement: 2.9, reach: 310_000, posts: 22 },
    { platform: 'linkedin', followers: 44_320, engagement: 6.2, reach: 89_000, posts: 18 },
    { platform: 'tiktok', followers: 21_600, engagement: 8.7, reach: 41_000, posts: 9 },
    { platform: 'youtube', followers: 6_000, engagement: 4.5, reach: 18_000, posts: 3 },
    { platform: 'snapchat', followers: 12_400, engagement: 3.8, reach: 28_000, posts: 14 },
    { platform: 'threads', followers: 18_200, engagement: 5.2, reach: 42_000, posts: 19 },
    { platform: 'telegram', followers: 22_900, engagement: 2.4, reach: 68_000, posts: 24 },
    { platform: 'pinterest', followers: 5_400, engagement: 3.6, reach: 32_000, posts: 8 },
  ],
};

const MOCK_ENGAGEMENT_TREND = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86_400_000).toLocaleDateString('ar-SA', {
    day: '2-digit',
    month: '2-digit',
  }),
  instagram: 800 + Math.round(Math.random() * 400),
  twitter: 400 + Math.round(Math.random() * 200),
  facebook: 500 + Math.round(Math.random() * 250),
  linkedin: 200 + Math.round(Math.random() * 150),
  tiktok: 150 + Math.round(Math.random() * 300),
  snapchat: 120 + Math.round(Math.random() * 180),
  threads: 180 + Math.round(Math.random() * 220),
  telegram: 90 + Math.round(Math.random() * 120),
  pinterest: 60 + Math.round(Math.random() * 100),
}));

const MOCK_FOLLOWER_GROWTH = Array.from({ length: 12 }, (_, i) => {
  const month = new Date(2025, i, 1).toLocaleDateString('ar-SA', { month: 'short' });
  return {
    month,
    instagram: 160_000 + i * 1_900 + Math.round(Math.random() * 800),
    twitter: 88_000 + i * 900 + Math.round(Math.random() * 400),
    facebook: 120_000 + i * 1_200 + Math.round(Math.random() * 500),
    linkedin: 38_000 + i * 580 + Math.round(Math.random() * 200),
    tiktok: 14_000 + i * 640 + Math.round(Math.random() * 300),
    snapchat: 8_200 + i * 350 + Math.round(Math.random() * 160),
    threads: 9_400 + i * 740 + Math.round(Math.random() * 250),
    telegram: 15_600 + i * 610 + Math.round(Math.random() * 200),
    pinterest: 2_800 + i * 220 + Math.round(Math.random() * 100),
  };
});

const MOCK_BEST_TIMES = {
  instagram: [
    { day: 'الاثنين', hour: '19:00', score: 92 },
    { day: 'الأربعاء', hour: '12:00', score: 88 },
    { day: 'الجمعة', hour: '20:00', score: 95 },
  ],
  twitter: [
    { day: 'الثلاثاء', hour: '09:00', score: 85 },
    { day: 'الخميس', hour: '17:00', score: 82 },
    { day: 'السبت', hour: '11:00', score: 79 },
  ],
  facebook: [
    { day: 'الأربعاء', hour: '13:00', score: 90 },
    { day: 'الجمعة', hour: '15:00', score: 87 },
    { day: 'الأحد', hour: '18:00', score: 83 },
  ],
  linkedin: [
    { day: 'الاثنين', hour: '08:00', score: 91 },
    { day: 'الثلاثاء', hour: '10:00', score: 89 },
    { day: 'الأربعاء', hour: '09:00', score: 86 },
  ],
  tiktok: [
    { day: 'الثلاثاء', hour: '19:00', score: 94 },
    { day: 'الخميس', hour: '21:00', score: 91 },
    { day: 'الجمعة', hour: '18:00', score: 89 },
  ],
  youtube: [
    { day: 'الجمعة', hour: '16:00', score: 88 },
    { day: 'السبت', hour: '15:00', score: 85 },
    { day: 'الأحد', hour: '14:00', score: 82 },
  ],
  snapchat: [
    { day: 'الجمعة', hour: '21:00', score: 90 },
    { day: 'السبت', hour: '20:00', score: 87 },
    { day: 'الأحد', hour: '19:00', score: 84 },
  ],
  threads: [
    { day: 'الاثنين', hour: '20:00', score: 88 },
    { day: 'الأربعاء', hour: '18:00', score: 85 },
    { day: 'الجمعة', hour: '21:00', score: 92 },
  ],
  telegram: [
    { day: 'الثلاثاء', hour: '10:00', score: 80 },
    { day: 'الخميس', hour: '14:00', score: 78 },
    { day: 'السبت', hour: '09:00', score: 75 },
  ],
  pinterest: [
    { day: 'الجمعة', hour: '20:00', score: 86 },
    { day: 'السبت', hour: '11:00', score: 83 },
    { day: 'الأحد', hour: '15:00', score: 80 },
  ],
};

const MOCK_POSTS = [
  {
    id: 'p1',
    platform: 'instagram',
    status: 'published',
    content: 'انطلاق برنامج تأهيل جديد لذوي الإعاقة الحركية في مركزنا...',
    scheduledAt: '2026-05-14T18:00',
    likes: 1420,
    comments: 87,
    shares: 312,
    reach: 18_400,
    image: true,
  },
  {
    id: 'p2',
    platform: 'twitter',
    status: 'published',
    content: 'تحديث: 97% من أهداف خطة التأهيل لهذا الشهر تم تحقيقها.',
    scheduledAt: '2026-05-14T10:00',
    likes: 234,
    comments: 41,
    shares: 189,
    reach: 6_200,
    image: false,
  },
  {
    id: 'p3',
    platform: 'facebook',
    status: 'scheduled',
    content: 'ورشة عمل مجانية: التواصل مع أسر ذوي الإعاقة — التسجيل مفتوح',
    scheduledAt: '2026-05-16T14:00',
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    image: true,
  },
  {
    id: 'p4',
    platform: 'linkedin',
    status: 'scheduled',
    content: 'نسعى لبناء شراكات مع المؤسسات التعليمية لتطوير برامج التأهيل المهني',
    scheduledAt: '2026-05-17T09:00',
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    image: false,
  },
  {
    id: 'p5',
    platform: 'instagram',
    status: 'draft',
    content: 'قصة نجاح: رحلة أحمد من التشخيص إلى الاستقلالية...',
    scheduledAt: null,
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    image: true,
  },
  {
    id: 'p6',
    platform: 'tiktok',
    status: 'published',
    content: 'يوم في حياة فريق التأهيل #تأهيل #ذوي_الإعاقة',
    scheduledAt: '2026-05-13T16:00',
    likes: 3800,
    comments: 210,
    shares: 940,
    reach: 42_000,
    image: true,
  },
  {
    id: 'p7',
    platform: 'facebook',
    status: 'published',
    content: 'افتتاح وحدة التأهيل عن بُعد — الآن يمكن تلقي الجلسات من المنزل',
    scheduledAt: '2026-05-12T11:00',
    likes: 892,
    comments: 134,
    shares: 287,
    reach: 21_000,
    image: true,
  },
  {
    id: 'p8',
    platform: 'twitter',
    status: 'failed',
    content: 'حضور مؤتمر الإعاقة الدولي 2026',
    scheduledAt: '2026-05-11T08:00',
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    image: false,
  },
  {
    id: 'p9',
    platform: 'instagram',
    status: 'scheduled',
    content: 'عروض موسم التخرج — صور من حفل تخريج طلاب برنامج الاستقلالية',
    scheduledAt: '2026-05-18T20:00',
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    image: true,
  },
  {
    id: 'p10',
    platform: 'linkedin',
    status: 'published',
    content: 'توظيف أخصائيين علاج وظيفي — انضم إلى فريقنا',
    scheduledAt: '2026-05-10T09:00',
    likes: 412,
    comments: 67,
    shares: 143,
    reach: 9_800,
    image: false,
  },
  {
    id: 'p11',
    platform: 'threads',
    status: 'published',
    content: 'نتحدث اليوم عن أهمية الدعم الأسري في رحلة التأهيل — شاركونا تجاربكم 💬',
    scheduledAt: '2026-05-13T20:00',
    likes: 674,
    comments: 118,
    shares: 203,
    reach: 14_200,
    image: false,
  },
  {
    id: 'p12',
    platform: 'telegram',
    status: 'published',
    content: 'تحديث: جدول جلسات شهر مايو — التفاصيل الكاملة في القناة',
    scheduledAt: '2026-05-12T09:00',
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 8_400,
    image: false,
  },
  {
    id: 'p13',
    platform: 'pinterest',
    status: 'published',
    content: 'أفكار تمارين منزلية مناسبة لذوي الإعاقة الحركية #تأهيل #منزل',
    scheduledAt: '2026-05-11T16:00',
    likes: 389,
    comments: 24,
    shares: 167,
    reach: 11_600,
    image: true,
  },
  {
    id: 'p14',
    platform: 'threads',
    status: 'scheduled',
    content: 'سلسلة "اسألوا الأخصائي": الجزء الثالث عن التواصل غير اللفظي',
    scheduledAt: '2026-05-19T19:00',
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    image: false,
  },
  {
    id: 'p15',
    platform: 'telegram',
    status: 'scheduled',
    content: 'ورشة افتراضية: دعم أسر الأطفال ذوي طيف التوحد — التسجيل مفتوح',
    scheduledAt: '2026-05-20T10:00',
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    image: true,
  },
];

const MOCK_HASHTAGS = [
  { tag: '#تأهيل', count: 2_840, growth: '+18%', platform: 'instagram' },
  { tag: '#ذوي_الإعاقة', count: 1_920, growth: '+24%', platform: 'instagram' },
  { tag: '#العلاج_الوظيفي', count: 1_140, growth: '+11%', platform: 'twitter' },
  { tag: '#استقلالية', count: 890, growth: '+9%', platform: 'tiktok' },
  { tag: '#جلسات_عن_بعد', count: 760, growth: '+32%', platform: 'facebook' },
  { tag: '#صحة_الأطفال', count: 620, growth: '+7%', platform: 'instagram' },
  { tag: '#التأهيل_المهني', count: 540, growth: '+15%', platform: 'linkedin' },
];

const MOCK_CAMPAIGNS = [
  {
    id: 'c1',
    name: 'موسم الوعي بالإعاقة',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    status: 'active',
    platforms: ['instagram', 'twitter', 'facebook'],
    budget: 12_000,
    spent: 7_400,
    impressions: 340_000,
    clicks: 18_200,
    conversions: 420,
    ctr: 5.4,
    cpc: 17.6,
  },
  {
    id: 'c2',
    name: 'ورش التأهيل المهني',
    startDate: '2026-04-15',
    endDate: '2026-05-20',
    status: 'active',
    platforms: ['linkedin', 'facebook'],
    budget: 8_000,
    spent: 6_200,
    impressions: 124_000,
    clicks: 8_900,
    conversions: 180,
    ctr: 7.2,
    cpc: 34.4,
  },
  {
    id: 'c3',
    name: 'قصص النجاح',
    startDate: '2026-03-01',
    endDate: '2026-04-30',
    status: 'completed',
    platforms: ['instagram', 'tiktok'],
    budget: 6_000,
    spent: 5_820,
    impressions: 218_000,
    clicks: 14_600,
    conversions: 320,
    ctr: 6.7,
    cpc: 18.2,
  },
  {
    id: 'c4',
    name: 'رمضان معكم',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    status: 'planned',
    platforms: ['instagram', 'twitter', 'tiktok', 'snapchat'],
    budget: 15_000,
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cpc: 0,
  },
];

const MOCK_AUDIENCE = {
  ageGroups: [
    { group: '18-24', percent: 22 },
    { group: '25-34', percent: 35 },
    { group: '35-44', percent: 26 },
    { group: '45-54', percent: 12 },
    { group: '55+', percent: 5 },
  ],
  genderSplit: [
    { gender: 'ذكور', percent: 43 },
    { gender: 'إناث', percent: 57 },
  ],
  topCities: [
    { city: 'الرياض', percent: 34 },
    { city: 'جدة', percent: 24 },
    { city: 'الدمام', percent: 14 },
    { city: 'مكة', percent: 10 },
    { city: 'المدينة', percent: 8 },
    { city: 'أخرى', percent: 10 },
  ],
  deviceSplit: [
    { device: 'موبايل', percent: 74 },
    { device: 'ديسكتوب', percent: 21 },
    { device: 'تابلت', percent: 5 },
  ],
};

const MOCK_TEAM_ACTIVITY = [
  { user: 'سارة العمري', action: 'جدولت منشوراً على Instagram', time: 'منذ 12 دقيقة' },
  { user: 'محمد الزهراني', action: 'نشر ردوداً على 8 تعليقات (Facebook)', time: 'منذ 34 دقيقة' },
  { user: 'نورا القحطاني', action: 'أنشأت حملة جديدة "رمضان معكم"', time: 'منذ 2 ساعة' },
  { user: 'خالد المطيري', action: 'رفع تقرير أداء الأسبوع', time: 'منذ 3 ساعات' },
  { user: 'رنا السالم', action: 'وافقت على 5 مسودات بانتظار النشر', time: 'منذ 5 ساعات' },
];

// ─── API Functions ────────────────────────────────────────────────────────────

const withMock = async (apiCall, mockData) => {
  try {
    const res = await apiCall();
    return res.data;
  } catch {
    return mockData;
  }
};

export const getOverview = () => withMock(() => apiClient.get(`${BASE}/overview`), MOCK_OVERVIEW);

export const getEngagementTrend = (days = 30) =>
  withMock(
    () => apiClient.get(`${BASE}/engagement-trend`, { params: { days } }),
    MOCK_ENGAGEMENT_TREND.slice(-days)
  );

export const getFollowerGrowth = () =>
  withMock(() => apiClient.get(`${BASE}/follower-growth`), MOCK_FOLLOWER_GROWTH);

export const getPosts = (params = {}) =>
  withMock(
    () => apiClient.get(`${BASE}/posts`, { params }),
    MOCK_POSTS.filter(
      p =>
        (!params.status || p.status === params.status) &&
        (!params.platform || p.platform === params.platform)
    )
  );

export const createPost = data =>
  withMock(() => apiClient.post(`${BASE}/posts`, data), {
    ...data,
    id: `p${Date.now()}`,
    status: data.scheduledAt ? 'scheduled' : 'draft',
  });

export const updatePost = (id, data) =>
  withMock(() => apiClient.put(`${BASE}/posts/${id}`, data), { ...data, id });

export const deletePost = id =>
  withMock(() => apiClient.delete(`${BASE}/posts/${id}`), { success: true });

export const getCampaigns = () =>
  withMock(() => apiClient.get(`${BASE}/campaigns`), MOCK_CAMPAIGNS);

export const getHashtagPerformance = () =>
  withMock(() => apiClient.get(`${BASE}/hashtags`), MOCK_HASHTAGS);

export const getAudienceInsights = () =>
  withMock(() => apiClient.get(`${BASE}/audience`), MOCK_AUDIENCE);

export const getBestPostingTimes = (platform = 'instagram') =>
  withMock(
    () => apiClient.get(`${BASE}/best-times`, { params: { platform } }),
    MOCK_BEST_TIMES[platform] || MOCK_BEST_TIMES.instagram
  );

export const getTeamActivity = () =>
  withMock(() => apiClient.get(`${BASE}/team-activity`), MOCK_TEAM_ACTIVITY);

export const exportReport = async (format = 'pdf') => {
  try {
    const res = await apiClient.get(`${BASE}/export`, { params: { format }, responseType: 'blob' });
    return res.data;
  } catch (err) {
    logger.error('Social media export failed:', err);
    throw err;
  }
};
