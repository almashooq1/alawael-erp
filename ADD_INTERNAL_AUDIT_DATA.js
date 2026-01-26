#!/usr/bin/env node

/**
 * سكريبت إضافة بيانات تجريبية لنظام التدقيق الداخلي
 * Internal Audit System - Sample Data
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/internal-audits';
let authToken = '';

// بيانات الاختبار
const testData = {
  credentials: {
    email: 'admin@alawael.com',
    password: 'Admin@123456'
  },
  auditPlan: {
    planId: 'PLAN-2026-Q1',
    year: 2026,
    title: 'خطة التدقيق الداخلي - الربع الأول 2026',
    titleAr: 'خطة التدقيق الداخلي - الربع الأول 2026',
    description: 'خطة شاملة للتدقيق الداخلي للربع الأول من عام 2026',
    departments: [
      {
        departmentId: 'HM',
        departmentName: 'Human Management',
        departmentNameAr: 'إدارة الموارد البشرية',
        auditFrequency: 'quarterly',
        estimatedAuditors: 2,
        riskLevel: 'high',
        priorities: ['Staff Management', 'Payroll', 'Training']
      },
      {
        departmentId: 'FM',
        departmentName: 'Finance',
        departmentNameAr: 'إدارة المالية',
        auditFrequency: 'quarterly',
        estimatedAuditors: 3,
        riskLevel: 'high',
        priorities: ['Budget Control', 'Payment Processing', 'Reporting']
      },
      {
        departmentId: 'OM',
        departmentName: 'Operations',
        departmentNameAr: 'إدارة العمليات',
        auditFrequency: 'semi-annual',
        estimatedAuditors: 2,
        riskLevel: 'medium',
        priorities: ['Process Compliance', 'Quality Control']
      }
    ],
    objectives: [
      {
        objectiveId: 'OBJ-001',
        title: 'Compliance Verification',
        titleAr: 'التحقق من الامتثال',
        description: 'التحقق من امتثال العمليات للمعايير المعتمدة'
      },
      {
        objectiveId: 'OBJ-002',
        title: 'Risk Assessment',
        titleAr: 'تقييم المخاطر',
        description: 'تقييم المخاطر المحتملة في الأقسام المختلفة'
      }
    ],
    resources: {
      totalBudget: 50000,
      allocatedAuditors: 7,
      auditDays: 30,
      supportTools: ['Audit Checklist', 'Risk Matrix', 'Documentation']
    },
    standards: [
      {
        standardId: 'ISO-9001',
        standardName: 'Quality Management',
        applicableGuidelines: ['Process Management', 'Document Control']
      }
    ],
    auditTeam: [
      {
        auditorId: 'AUD-001',
        auditorName: 'أحمد محمد',
        role: 'lead-auditor',
        specialization: ['Finance', 'Risk Management'],
        certifications: ['CIA', 'CISA']
      },
      {
        auditorId: 'AUD-002',
        auditorName: 'فاطمة علي',
        role: 'auditor',
        specialization: ['HR', 'Compliance'],
        certifications: ['CIA']
      }
    ],
    status: 'approved'
  },
  surpriseAudit: {
    auditId: 'AUD-2026-001',
    type: 'surprise',
    auditInfo: {
      title: 'تدقيق مفاجئ - قسم المالية',
      titleAr: 'تدقيق مفاجئ - قسم المالية',
      description: 'عملية تدقيق مفاجئة للتحقق من دقة العمليات المالية',
      reason: 'Risk-based sampling',
      reasonAr: 'عينة عشوائية بناءً على المخاطر',
      triggeringFactor: 'Routine schedule',
      initiatedBy: 'audit_manager',
      initiationDate: new Date()
    },
    auditScope: {
      departmentId: 'FM',
      departmentName: 'Finance',
      departmentNameAr: 'قسم المالية',
      processArea: 'Payment Processing',
      processAreaAr: 'معالجة الدفع',
      scopeDescription: 'فحص دقة ومعالجة عمليات الدفع',
      riskAssessment: 'High risk process'
    },
    auditTeam: [
      {
        auditorsId: 'AUD-001',
        auditorName: 'أحمد محمد',
        role: 'lead',
        responsibility: 'القيادة والإشراف'
      }
    ],
    schedule: {
      scheduledDate: new Date('2026-01-25'),
      duration: 8,
      location: 'Finance Department'
    },
    auditCriteria: [
      {
        criteriaId: 'CRI-001',
        criteriaTitle: 'Payment Accuracy',
        criteriaType: 'compliance',
        description: 'التحقق من دقة المدفوعات',
        expectedResults: 'Zero errors'
      }
    ],
    status: 'in-progress',
    progressPercentage: 50
  },
  nonConformanceReport: {
    ncrId: 'NCR-2026-001',
    reportInfo: {
      title: 'عدم مطابقة في التوثيق المالي',
      titleAr: 'عدم مطابقة في التوثيق المالي',
      description: 'وجود تفاوت بين السجلات المحاسبية والتقارير المالية',
      descriptionAr: 'وجود تفاوت بين السجلات المحاسبية والتقارير المالية'
    },
    classification: {
      type: 'internal-audit',
      category: 'major',
      severity: '2-High',
      immediateImpact: true
    },
    details: {
      affectedProcessArea: 'Financial Reporting',
      affectedDepartment: 'Finance',
      affectedDepartmentAr: 'قسم المالية',
      statementOfNonconformity: 'الفرق في سجلات الأصول الثابتة',
      statementAr: 'الفرق في سجلات الأصول الثابتة',
      relatedStandard: 'ISO 9001:2015',
      requirementNotMet: 'Document Control',
      rootCause: 'Manual data entry errors',
      potentialImpact: 'Financial reporting accuracy'
    },
    status: 'open'
  },
  correctiveAction: {
    actionId: 'CA-2026-001',
    type: 'corrective',
    actionInfo: {
      title: 'خطة تصحيح التوثيق المالي',
      titleAr: 'خطة تصحيح التوثيق المالي',
      description: 'إعادة مراجعة وتصحيح السجلات المالية',
      descriptionAr: 'إعادة مراجعة وتصحيح السجلات المالية'
    },
    rootCauseAnalysis: {
      method: '5-why',
      analysis: 'تم تحديد أن السبب الرئيسي هو عدم وجود نظام آلي للتحقق',
      analysisAr: 'تم تحديد أن السبب الرئيسي هو عدم وجود نظام آلي للتحقق',
      identifiedRootCauses: [
        {
          causeId: 'RC-001',
          cause: 'Lack of automated validation',
          causeAr: 'عدم وجود تحقق آلي',
          probability: 'high',
          contributionPercentage: 80
        }
      ]
    },
    proposedActions: [
      {
        actionSequence: 1,
        description: 'تطوير نظام التحقق الآلي',
        objective: 'منع الأخطاء اليدوية',
        expectedOutcome: 'تقليل الأخطاء بنسبة 95%'
      }
    ],
    implementation: {
      ownerName: 'مدير قسم المالية',
      ownerDepartment: 'Finance',
      ownerEmail: 'finance@alawael.com',
      status: 'planning',
      progressPercentage: 0,
      targetCompletionDate: new Date('2026-03-15')
    },
    status: 'planning',
    overallStatus: 'new'
  },
  closureFollowUp: {
    followUpId: 'FU-2026-001',
    linkedTo: {
      type: 'ncr',
      linkedId: 'NCR-2026-001',
      linkedTitle: 'عدم مطابقة في التوثيق المالي'
    },
    followUpInfo: {
      description: 'متابعة إغلاق تقرير عدم المطابقة NCR-2026-001',
      descriptionAr: 'متابعة إغلاق تقرير عدم المطابقة NCR-2026-001',
      status: 'pending'
    },
    closureCriteria: [
      {
        criteriaId: 'CC-001',
        description: 'تصحيح جميع السجلات المالية',
        descriptionAr: 'تصحيح جميع السجلات المالية',
        measurable: true,
        targetMetrics: '100% of records',
        acceptanceCriteria: 'Zero discrepancies',
        verificationMethod: 'Audit'
      }
    ],
    statusOverall: 'not-started'
  }
};

// ==========================================
// الدوال
// ==========================================

async function login() {
  console.log('\n🔐 جاري تسجيل الدخول...');
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', testData.credentials);
    if (response.data.success) {
      authToken = response.data.accessToken;
      console.log('✅ تم تسجيل الدخول بنجاح');
      console.log(`📝 البريد: ${response.data.user.email}`);
      console.log(`👤 الدور: ${response.data.user.role}`);
      return true;
    }
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error.message);
    return false;
  }
}

async function createAuditPlan() {
  console.log('\n📋 جاري إنشاء خطة التدقيق...');
  try {
    const response = await axios.post(
      `${API_BASE}/audit-plans`,
      testData.auditPlan,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (response.data.success) {
      console.log('✅ تم إنشاء خطة التدقيق');
      console.log(`   معرف الخطة: ${response.data.data.planId}`);
      return response.data.data;
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء خطة التدقيق:', error.response?.data?.message || error.message);
  }
}

async function createSurpriseAudit() {
  console.log('\n🔍 جاري إنشاء تدقيق مفاجئ...');
  try {
    const response = await axios.post(
      `${API_BASE}/surprise-audits`,
      testData.surpriseAudit,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (response.data.success) {
      console.log('✅ تم إنشاء التدقيق المفاجئ');
      console.log(`   معرف التدقيق: ${response.data.data.auditId}`);
      return response.data.data;
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء التدقيق:', error.response?.data?.message || error.message);
  }
}

async function createNCR() {
  console.log('\n⚠️ جاري إنشاء تقرير عدم المطابقة...');
  try {
    const response = await axios.post(
      `${API_BASE}/non-conformance-reports`,
      testData.nonConformanceReport,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (response.data.success) {
      console.log('✅ تم إنشاء تقرير عدم المطابقة');
      console.log(`   معرف التقرير: ${response.data.data.ncrId}`);
      return response.data.data;
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء التقرير:', error.response?.data?.message || error.message);
  }
}

async function createCorrectiveAction() {
  console.log('\n✅ جاري إنشاء إجراء تصحيحي...');
  try {
    const response = await axios.post(
      `${API_BASE}/corrective-preventive-actions`,
      testData.correctiveAction,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (response.data.success) {
      console.log('✅ تم إنشاء الإجراء التصحيحي');
      console.log(`   معرف الإجراء: ${response.data.data.actionId}`);
      return response.data.data;
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء الإجراء:', error.response?.data?.message || error.message);
  }
}

async function createClosureFollowUp() {
  console.log('\n🔐 جاري إنشاء متابعة إغلاق...');
  try {
    const response = await axios.post(
      `${API_BASE}/closure-followups`,
      testData.closureFollowUp,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (response.data.success) {
      console.log('✅ تم إنشاء متابعة الإغلاق');
      console.log(`   معرف المتابعة: ${response.data.data.followUpId}`);
      return response.data.data;
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء المتابعة:', error.response?.data?.message || error.message);
  }
}

async function getDashboard() {
  console.log('\n📊 جاري جلب بيانات لوحة التحكم...');
  try {
    const response = await axios.get(
      `${API_BASE}/internal-audit-dashboard`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (response.data.success) {
      console.log('✅ تم جلب بيانات لوحة التحكم');
      console.log('   خطط التدقيق:', response.data.data.auditPlans.total);
      console.log('   عمليات التدقيق:', response.data.data.surpriseAudits.total);
      console.log('   تقارير عدم المطابقة:', response.data.data.nonConformances.total);
      console.log('   الإجراءات:', response.data.data.actions.total);
      console.log('   متابعات الإغلاق:', response.data.data.followUps.total);
      return response.data.data;
    }
  } catch (error) {
    console.error('❌ خطأ في جلب البيانات:', error.response?.data?.message || error.message);
  }
}

// ==========================================
// التنفيذ الرئيسي
// ==========================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('   بيانات تجريبية - نظام التدقيق الداخلي');
  console.log('   Sample Data - Internal Audit System');
  console.log('='.repeat(60));

  // تسجيل الدخول
  if (!(await login())) {
    console.log('\n❌ فشل تسجيل الدخول. تأكد من تشغيل الـ Backend.');
    process.exit(1);
  }

  // إنشاء البيانات
  await createAuditPlan();
  await createSurpriseAudit();
  await createNCR();
  await createCorrectiveAction();
  await createClosureFollowUp();

  // جلب لوحة التحكم
  await getDashboard();

  console.log('\n' + '='.repeat(60));
  console.log('✅ تم إضافة البيانات التجريبية بنجاح');
  console.log('='.repeat(60));
  console.log('\n📌 الخطوات التالية:');
  console.log('1. افتح المتصفح وانتقل إلى: http://localhost:3002');
  console.log('2. سجل الدخول بـ: admin@alawael.com / Admin@123456');
  console.log('3. اذهب إلى قسم "التدقيق الداخلي"');
  console.log('4. ستجد البيانات التجريبية المضافة');
  console.log('\n');
}

// تشغيل البرنامج
main().catch(error => {
  console.error('❌ خطأ:', error.message);
  process.exit(1);
});
