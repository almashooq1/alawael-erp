/* eslint-disable no-unused-vars */
/**
 * 🏢 CRM Advanced API Routes
 * Professional Customer Relationship Management System
 *
 * Features:
 * - Customer Management
 * - Deal/Opportunity Management
 * - Pipeline Management
 * - Activity Tracking
 * - Sales Metrics & Analytics
 * - Contact Management
 * - Task Management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');

// ============================================
// 📊 MOCK DATA - CRM Database Simulation
// ============================================

const crmDatabase = {
  customers: [
    {
      id: 'cust_001',
      name: 'شركة ABC للاستشارات',
      email: 'info@abc.com',
      phone: '+966501234567',
      address: 'الرياض - حي النخيل',
      industry: 'الاستشارات',
      employees: 150,
      annualRevenue: '5,000,000 ر.س',
      website: 'www.abc.com',
      status: 'عميل نشط',
      tier: 'ذهبي',
      lastContact: '2026-01-10',
      createdDate: '2025-06-15',
      owner: 'أحمد محمد',
      notes: 'عميل مهم جداً',
      deals: [1, 2],
      totalValue: 430000,
      rating: 5,
    },
    {
      id: 'cust_002',
      name: 'شركة XYZ التقنية',
      email: 'sales@xyz.com',
      phone: '+966501234568',
      address: 'جدة - حي البلد',
      industry: 'تقنية المعلومات',
      employees: 200,
      annualRevenue: '8,000,000 ر.س',
      website: 'www.xyz.com',
      status: 'عميل نشط',
      tier: 'بلاتيني',
      lastContact: '2026-01-11',
      createdDate: '2025-05-20',
      owner: 'فاطمة علي',
      notes: 'عميل فرص عالية',
      deals: [3],
      totalValue: 550000,
      rating: 4.5,
    },
    {
      id: 'cust_003',
      name: 'مؤسسة DEF التدريب',
      email: 'contact@def.com',
      phone: '+966501234569',
      address: 'الدمام - حي الشرقية',
      industry: 'التدريب والتطوير',
      employees: 80,
      annualRevenue: '2,000,000 ر.س',
      website: 'www.def.com',
      status: 'عميل متوقع',
      tier: 'فضي',
      lastContact: '2026-01-05',
      createdDate: '2025-08-10',
      owner: 'محمود حسن',
      notes: 'قيد المتابعة',
      deals: [4],
      totalValue: 180000,
      rating: 3.5,
    },
    {
      id: 'cust_004',
      name: 'شركة GHI المالية',
      email: 'enquiry@ghi.com',
      phone: '+966501234570',
      address: 'الخبر - حي الأحساء',
      industry: 'الخدمات المالية',
      employees: 120,
      annualRevenue: '12,000,000 ر.س',
      website: 'www.ghi.com',
      status: 'عميل محتمل',
      tier: 'برونزي',
      lastContact: '2026-01-01',
      createdDate: '2025-10-15',
      owner: 'سارة عبدالله',
      notes: 'يحتاج متابعة',
      deals: [],
      totalValue: 0,
      rating: 2.5,
    },
  ],

  deals: [
    {
      id: 1,
      title: 'عقد الاستشارات السنوية',
      customerId: 'cust_001',
      customerName: 'شركة ABC للاستشارات',
      value: 250000,
      currency: 'ر.س',
      stage: 'التفاوض',
      probability: 85,
      expectedCloseDate: '2026-02-15',
      createdDate: '2025-11-20',
      owner: 'أحمد محمد',
      description: 'عقد استشارات إدارية سنوية',
      activities: 12,
      status: 'جاري',
      source: 'إحالة داخلية',
    },
    {
      id: 2,
      title: 'ترقية الخدمات الإضافية',
      customerId: 'cust_001',
      customerName: 'شركة ABC للاستشارات',
      value: 180000,
      currency: 'ر.س',
      stage: 'العرض',
      probability: 60,
      expectedCloseDate: '2026-02-28',
      createdDate: '2025-12-05',
      owner: 'أحمد محمد',
      description: 'خدمات استشارية إضافية',
      activities: 8,
      status: 'جاري',
      source: 'الاتصال البارد',
    },
    {
      id: 3,
      title: 'حل تقني متكامل',
      customerId: 'cust_002',
      customerName: 'شركة XYZ التقنية',
      value: 550000,
      currency: 'ر.س',
      stage: 'الاتفاقية',
      probability: 95,
      expectedCloseDate: '2026-01-31',
      createdDate: '2025-10-10',
      owner: 'فاطمة علي',
      description: 'تطوير حل تقني مخصص',
      activities: 25,
      status: 'جاري',
      source: 'عرض توضيحي',
    },
    {
      id: 4,
      title: 'برنامج تدريب بالشراكة',
      customerId: 'cust_003',
      customerName: 'مؤسسة DEF التدريب',
      value: 180000,
      currency: 'ر.س',
      stage: 'التأهيل',
      probability: 45,
      expectedCloseDate: '2026-03-15',
      createdDate: '2026-01-01',
      owner: 'محمود حسن',
      description: 'برنامج تدريب مشترك',
      activities: 3,
      status: 'جاري',
      source: 'إحالة',
    },
  ],

  activities: [
    {
      id: 'act_001',
      type: 'اتصال هاتفي',
      dealId: 1,
      customerId: 'cust_001',
      title: 'مناقشة تفاصيل العقد',
      description: 'تم مناقشة الشروط والأسعار',
      date: '2026-01-12',
      time: '10:30',
      owner: 'أحمد محمد',
      outcome: 'موافق مبدئي',
      nextFollowUp: '2026-01-15',
    },
    {
      id: 'act_002',
      type: 'اجتماع',
      dealId: 2,
      customerId: 'cust_001',
      title: 'عرض الخدمات الإضافية',
      description: 'عرض تقديمي شامل للخدمات',
      date: '2026-01-11',
      time: '14:00',
      owner: 'أحمد محمد',
      outcome: 'طلب عرض سعر مفصل',
      nextFollowUp: '2026-01-18',
    },
    {
      id: 'act_003',
      type: 'بريد إلكتروني',
      dealId: 3,
      customerId: 'cust_002',
      title: 'إرسال الاتفاقية للتوقيع',
      description: 'تم إرسال نسخة نهائية من الاتفاقية',
      date: '2026-01-10',
      time: '09:15',
      owner: 'فاطمة علي',
      outcome: 'في انتظار التوقيع',
      nextFollowUp: '2026-01-17',
    },
  ],

  pipeline: {
    stages: [
      { id: 1, name: 'التأهيل', value: 0, count: 1 },
      { id: 2, name: 'الاتصال الأول', value: 0, count: 2 },
      { id: 3, name: 'العرض', value: 180000, count: 1 },
      { id: 4, name: 'التفاوض', value: 250000, count: 1 },
      { id: 5, name: 'الاتفاقية', value: 550000, count: 1 },
    ],
    totalValue: 980000,
    totalDeals: 5,
    averageDealValue: 196000,
    conversionRate: 78,
  },
};

// ============================================
// 📈 KPI CALCULATIONS
// ============================================

function calculateKPIs() {
  const deals = crmDatabase.deals;
  const customers = crmDatabase.customers;
  const activeDeals = deals.filter(d => d.status === 'جاري').length;
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  const avgValue = activeDeals > 0 ? totalValue / activeDeals : 0;

  return [
    {
      label: 'إجمالي العملاء',
      value: customers.length.toString(),
      trend: '+2',
      tone: 'success',
      chartData: [45, 52, 58, 72, 85, 95],
      details: `${customers.filter(c => c.status === 'عميل نشط').length} نشطين`,
    },
    {
      label: 'الفرص المفتوحة',
      value: activeDeals.toString(),
      trend: '+1',
      tone: 'success',
      chartData: [2, 3, 3, 4, 4, 5],
      details: `قيمة إجمالية: ${totalValue.toLocaleString('ar-SA')} ر.س`,
    },
    {
      label: 'متوسط قيمة الصفقة',
      value: `${(avgValue / 1000).toFixed(0)}ك ر.س`,
      trend: '+8%',
      tone: 'success',
      chartData: [150, 160, 170, 180, 190, 196],
      details: `من ${activeDeals} صفقة نشطة`,
    },
    {
      label: 'معدل الإغلاق',
      value: '78%',
      trend: '+3%',
      tone: 'success',
      chartData: [65, 68, 70, 74, 76, 78],
      details: 'محسوب من الأشهر الستة الماضية',
    },
    {
      label: 'دورة المبيعات',
      value: '45 يوم',
      trend: '-5 أيام',
      tone: 'success',
      chartData: [60, 58, 55, 50, 47, 45],
      details: 'متوسط الفترة من الفرصة إلى الإغلاق',
    },
  ];
}

// ============================================
// 🔄 ROUTES - CRM Endpoints
// ============================================

/**
 * GET /api/crm/dashboard
 * Get CRM Dashboard Data with KPIs and Overview
 */
router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const kpis = calculateKPIs();
    const recentDeals = crmDatabase.deals.slice(0, 3);
    const topCustomers = crmDatabase.customers
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        kpis,
        recentDeals,
        topCustomers,
        pipeline: crmDatabase.pipeline,
        statistics: {
          activeDeals: crmDatabase.deals.filter(d => d.status === 'جاري').length,
          activeCustomers: crmDatabase.customers.filter(c => c.status === 'عميل نشط').length,
          revenueThisMonth: 450000,
          forecastedRevenue: 980000,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات لوحة التحكم',
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * GET /api/crm/customers
 * Get All Customers with Filtering & Pagination
 */
router.get('/customers', authenticateToken, (req, res) => {
  try {
    const { page = 1, limit = 10, status, tier, search } = req.query;
    let customers = crmDatabase.customers;

    // Apply filters
    if (status) {
      customers = customers.filter(c => c.status === status);
    }
    if (tier) {
      customers = customers.filter(c => c.tier === tier);
    }
    if (search) {
      customers = customers.filter(
        c => c.name.includes(search) || c.email.includes(search) || c.phone.includes(search)
      );
    }

    // Pagination
    const start = (page - 1) * limit;
    const paginatedCustomers = customers.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: {
        customers: paginatedCustomers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: customers.length,
          pages: Math.ceil(customers.length / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب قائمة العملاء',
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * GET /api/crm/customers/:customerId
 * Get Customer Details with Related Deals and Activities
 */
router.get('/customers/:customerId', authenticateToken, (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = crmDatabase.customers.find(c => c.id === customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود',
      });
    }

    const deals = crmDatabase.deals.filter(d => d.customerId === customerId);
    const activities = crmDatabase.activities.filter(a => a.customerId === customerId);

    res.json({
      success: true,
      data: {
        customer,
        deals,
        activities,
        summary: {
          totalDeals: deals.length,
          totalValue: deals.reduce((sum, d) => sum + d.value, 0),
          activeDeals: deals.filter(d => d.status === 'جاري').length,
          totalActivities: activities.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تفاصيل العميل',
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * GET /api/crm/deals
 * Get All Deals with Filtering by Stage and Status
 */
router.get('/deals', authenticateToken, (req, res) => {
  try {
    const { stage, status, owner, page = 1, limit = 10 } = req.query;
    let deals = crmDatabase.deals;

    // Apply filters
    if (stage) {
      deals = deals.filter(d => d.stage === stage);
    }
    if (status) {
      deals = deals.filter(d => d.status === status);
    }
    if (owner) {
      deals = deals.filter(d => d.owner === owner);
    }

    // Pagination
    const start = (page - 1) * limit;
    const paginatedDeals = deals.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: {
        deals: paginatedDeals,
        stages: crmDatabase.pipeline.stages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: deals.length,
          pages: Math.ceil(deals.length / limit),
        },
        statistics: {
          totalValue: deals.reduce((sum, d) => sum + d.value, 0),
          averageValue:
            deals.length > 0 ? deals.reduce((sum, d) => sum + d.value, 0) / deals.length : 0,
          count: deals.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب قائمة الفرص',
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * GET /api/crm/deals/:dealId
 * Get Deal Details with All Related Information
 */
router.get('/deals/:dealId', authenticateToken, (req, res) => {
  try {
    const { dealId } = req.params;
    const deal = crmDatabase.deals.find(d => d.id === parseInt(dealId));

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'الفرصة غير موجودة',
      });
    }

    const customer = crmDatabase.customers.find(c => c.id === deal.customerId);
    const activities = crmDatabase.activities.filter(a => a.dealId === deal.id);

    res.json({
      success: true,
      data: {
        deal,
        customer,
        activities,
        timeline: calculateDealTimeline(deal),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تفاصيل الفرصة',
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * GET /api/crm/pipeline
 * Get Sales Pipeline Overview
 */
router.get('/pipeline', authenticateToken, (req, res) => {
  try {
    const stageSummary = crmDatabase.pipeline.stages.map(stage => {
      const stageDeals = crmDatabase.deals.filter(d => d.stage === stage.name);
      const value = stageDeals.reduce((sum, d) => sum + d.value, 0);
      return {
        ...stage,
        value,
        count: stageDeals.length,
        deals: stageDeals,
      };
    });

    res.json({
      success: true,
      data: {
        pipeline: stageSummary,
        summary: {
          totalValue: crmDatabase.pipeline.totalValue,
          totalDeals: crmDatabase.pipeline.totalDeals,
          averageDealValue: crmDatabase.pipeline.averageDealValue,
          conversionRate: crmDatabase.pipeline.conversionRate,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات خط الأنابيب',
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * GET /api/crm/activities
 * Get Recent Activities with Filtering
 */
router.get('/activities', authenticateToken, (req, res) => {
  try {
    const { type, dealId, customerId, page = 1, limit = 20 } = req.query;
    let activities = crmDatabase.activities;

    // Apply filters
    if (type) activities = activities.filter(a => a.type === type);
    if (dealId) activities = activities.filter(a => a.dealId === parseInt(dealId));
    if (customerId) activities = activities.filter(a => a.customerId === customerId);

    // Sort by date (newest first)
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination
    const start = (page - 1) * limit;
    const paginatedActivities = activities.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: {
        activities: paginatedActivities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: activities.length,
          pages: Math.ceil(activities.length / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب سجل الأنشطة',
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * GET /api/crm/analytics
 * Get Advanced Analytics and Reports
 */
router.get('/analytics', authenticateToken, (req, res) => {
  try {
    const deals = crmDatabase.deals;
    const customers = crmDatabase.customers;

    // Sales by stage
    const salesByStage = crmDatabase.pipeline.stages.map(stage => ({
      stage: stage.name,
      value: deals.filter(d => d.stage === stage.name).reduce((sum, d) => sum + d.value, 0),
    }));

    // Sales by industry
    const salesByIndustry = {};
    customers.forEach(c => {
      if (!salesByIndustry[c.industry]) {
        salesByIndustry[c.industry] = 0;
      }
      const customerDeals = deals.filter(d => d.customerId === c.id);
      const value = customerDeals.reduce((sum, d) => sum + d.value, 0);
      salesByIndustry[c.industry] += value;
    });

    // Sales by owner
    const salesByOwner = {};
    deals.forEach(d => {
      if (!salesByOwner[d.owner]) {
        salesByOwner[d.owner] = 0;
      }
      salesByOwner[d.owner] += d.value;
    });

    res.json({
      success: true,
      data: {
        salesByStage,
        salesByIndustry: Object.entries(salesByIndustry).map(([name, value]) => ({
          name,
          value,
        })),
        salesByOwner: Object.entries(salesByOwner).map(([name, value]) => ({
          name,
          value,
        })),
        trends: {
          thisMonth: 450000,
          lastMonth: 380000,
          growth: '+18.4%',
          forecast: 980000,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التحليلات',
      error: 'حدث خطأ داخلي',
    });
  }
});

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================

function calculateDealTimeline(deal) {
  const createdDate = new Date(deal.createdDate);
  const today = new Date();
  const daysActive = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));

  return {
    createdDate: deal.createdDate,
    daysActive,
    expectedCloseDate: deal.expectedCloseDate,
    daysUntilClose: Math.max(
      0,
      Math.floor((new Date(deal.expectedCloseDate) - today) / (1000 * 60 * 60 * 24))
    ),
  };
}

module.exports = router;
