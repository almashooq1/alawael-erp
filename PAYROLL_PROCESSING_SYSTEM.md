# 💰 نظام معالجة الرواتب السعودي المتكامل - Payroll Processing System

**التاريخ:** 14 يناير 2026  
**الفئة المستهدفة:** المحاسبة، الموارد البشرية، الإدارة المالية  
**المعايير:** السعودية والدولية  
**الحالة:** ✅ READY FOR IMPLEMENTATION

---

## 📋 جدول المحتويات

1. [حساب الرواتب](#حساب-الرواتب)
2. [الخصومات والاستقطاعات](#الخصومات-والاستقطاعات)
3. [معالجة الرواتب](#معالجة-الرواتب)
4. [التحويلات البنكية](#التحويلات-البنكية)
5. [الضرائب والتقارير](#الضرائب-والتقارير)

---

## 🧮 حساب الرواتب

### مكونات الراتب الأساسية

```javascript
// حساب الراتب الشامل
const salaryCalculation = {
  // المدخلات
  inputs: {
    basicSalary: {
      description: 'الراتب الأساسي',
      required: true,
      example: 5000,
      currency: 'SAR',
      basis: 'fixed_monthly',
    },

    allowances: {
      housing: {
        description: 'بدل السكن',
        maxPercent: 50,
        example: 2000,
        taxable: false,
      },

      transportation: {
        description: 'بدل المواصلات',
        example: 500,
        taxable: true,
      },

      meals: {
        description: 'بدل الغذاء',
        example: 300,
        taxable: false,
      },

      phone: {
        description: 'بدل الهاتف',
        example: 200,
        taxable: false,
      },

      medical: {
        description: 'بدل الرعاية الطبية',
        example: 150,
        taxable: false,
      },

      dependents: {
        description: 'بدل التابعين',
        maxCount: 2,
        perDependent: 100,
        example: 200,
        taxable: false,
      },

      location: {
        description: 'بدل المناطق النائية',
        appliesTo: 'remote_areas',
        example: 'varies',
        taxable: false,
      },
    },
  },

  // الحسابات
  calculations: {
    // الراتب الإجمالي
    grossSalary: {
      formula: 'basicSalary + allowances + overtime + bonuses',
      example: 8350,
    },

    // الراتب المؤمن عليه
    insurableSalary: {
      formula: 'basicSalary + recurring_allowances',
      excludes: ['one_time_bonuses', 'overtime', 'benefits'],
      ceiling: 45000,
      example: 8000,
    },

    // الراتب الخاضع للضريبة
    taxableSalary: {
      formula: 'basicSalary + taxable_allowances - deductions',
      includes: ['basicSalary', 'transportation', 'performance_bonus'],
      excludes: ['housing', 'meals', 'phone', 'medical'],
      example: 5500,
    },
  },
};
```

### حساب الإضافي والبدائل

```javascript
// حساب العمل الإضافي والبدائل
const overtimeAndSubstitute = {
  // العمل الإضافي
  overtime: {
    eligibility: 'after_40_hours',

    calculations: {
      hourly_rate: {
        formula: 'basicSalary / 30 / 8',
        example: '5000 / 30 / 8 = 20.83 SAR/hour',
      },

      regular_overtime: {
        multiplier: 1.5, // 50% إضافي
        rate: 'hourly_rate * 1.5',
        example: '20.83 * 1.5 = 31.25 SAR/hour',
      },

      night_overtime: {
        multiplier: 2.0, // 100% إضافي
        rate: 'hourly_rate * 2.0',
        hours: '22:00_to_06:00',
        example: '20.83 * 2.0 = 41.67 SAR/hour',
      },

      weekend_overtime: {
        multiplier: 2.0, // 100% إضافي (الجمعة والسبت)
        rate: 'hourly_rate * 2.0',
        example: '20.83 * 2.0 = 41.67 SAR/hour',
      },

      holiday_overtime: {
        multiplier: 3.0, // 200% إضافي
        rate: 'hourly_rate * 3.0',
        example: '20.83 * 3.0 = 62.50 SAR/hour',
      },
    },

    limits: {
      daily: 4, // 4 ساعات يومياً
      weekly: 20, // 20 ساعة أسبوعياً
      monthly: 80, // 80 ساعة شهرياً
      enforced: true,
    },
  },

  // البدائل والتعويضات
  substitutions: {
    director_allowance: {
      description: 'بدل المدير',
      percent: 'varies',
      example: 500,
      taxable: true,
    },

    hazard_allowance: {
      description: 'بدل الخطورة',
      percent: 'varies',
      example: 'varies',
      taxable: false,
      industries: ['construction', 'mining', 'chemical', 'oil'],
    },

    shift_allowance: {
      description: 'بدل الورديات',
      example: 300,
      taxable: false,
      types: ['morning_shift', 'evening_shift', 'night_shift'],
    },
  },
};
```

---

## 🚫 الخصومات والاستقطاعات

### الخصومات الإجبارية

```javascript
// الخصومات والاستقطاعات الإجبارية
const mandatoryDeductions = {
  // اشتراك التأمينات الاجتماعية
  socialInsurance: {
    description: 'اشتراك التأمينات الاجتماعية',
    type: 'mandatory',

    general_insurance: {
      percent: 9.75, // 9.75% للموظف
      basedOn: 'insurableSalary',
      capped: 45000,

      calculation: {
        example: {
          salary_15000: 1462.5,
          salary_30000: 2925.0,
          salary_45000: 4387.5,
        },
      },

      employerContribution: {
        percent: 13, // 13% من المؤسسة
        unemploymentInsurance: 2, // + 2% للبطالة (سعوديين)
      },
    },

    reporting: 'monthly_to_gosi',
    deductible: true,
    nonRefundable: false,
  },

  // ضريبة الدخل
  incomeTax: {
    description: 'ضريبة الدخل',
    type: 'conditional',
    appliesTo: 'non_saudi_nationals',

    progressive_scale: {
      '0_to_25000': 0, // معفى
      '25001_to_50000': 5, // 5%
      '50001_to_75000': 10, // 10%
      '75001_to_100000': 15, // 15%
      '100001_plus': 20, // 20%
    },

    calculation: {
      basedOn: 'taxableSalary',
      frequency: 'annual',
      example: {
        annual_salary_100000: {
          taxable_amount: 100000,
          tax_due: 12500,
          monthly_tax: 1041.67,
        },
      },
    },

    deductible: true,
    reporting: 'annual_to_zakat_tax',
  },
};
```

### الخصومات الاختيارية

```javascript
// الخصومات الاختيارية
const optionalDeductions = {
  // القروض
  loans: {
    description: 'قروض الموظف',
    types: {
      personal_loan: {
        maxAmount: '6_months_salary',
        period: '12_to_60_months',
        interest: 'varies',
        maxDeduction: '25%_of_salary',
      },

      housing_loan: {
        maxAmount: '100%_home_value',
        period: '20_to_25_years',
        interest: 'subsidized',
        maxDeduction: '30%_of_salary',
      },

      emergency_loan: {
        maxAmount: 'one_month_salary',
        period: '6_months',
        interest: 'zero',
        maxDeduction: 'full_amount',
      },
    },

    requirements: ['written_agreement', 'hr_approval', 'employee_consent', 'security_deposit_optional'],

    penalties: 'late_payment_interest',
  },

  // الخصومات الأخرى
  otherDeductions: {
    employee_advance: {
      description: 'سلفة الموظف',
      maxAmount: 'one_month_salary',
      repaymentPeriod: '3_months',
    },

    uniforms: {
      description: 'تكلفة الزي الموحد',
      oneTime: true,
      refundable: false,
    },

    training_cost: {
      description: 'تكلفة التدريب',
      conditions: 'employee_leaves_within_year',
      refundable: 'full_or_partial',
    },

    damage_compensation: {
      description: 'تعويض الأضرار',
      requiresProof: true,
      maxAmount: 'one_month_salary',
    },

    charitable_contribution: {
      description: 'الخصم الخيري',
      voluntary: true,
      requiresConsent: true,
    },
  },

  // الحد الأقصى للخصومات
  deductionCaps: {
    total_optional: '25%_of_salary',
    loans_combined: '25%_of_salary',
    exceptions: 'zakat_legal_orders',
  },
};
```

---

## 🔄 معالجة الرواتب

### دورة معالجة الراتب

```javascript
// دورة معالجة الراتب الشهرية
const payrollCycle = {
  // المرحلة الأولى: التحضير
  preparation: {
    date: '1st_of_month',
    tasks: [
      {
        task: 'Collect employee data',
        description: 'جمع بيانات الموظفين',
        deadline: 'end_of_month',
      },
      {
        task: 'Record absences',
        description: 'تسجيل الغيابات',
        deadline: 'end_of_month',
      },
      {
        task: 'Record overtime',
        description: 'تسجيل الإضافي',
        deadline: 'end_of_month',
      },
      {
        task: 'Record bonuses',
        description: 'تسجيل المكافآت',
        deadline: 'end_of_month',
      },
      {
        task: 'Verify leave',
        description: 'التحقق من الإجازات',
        deadline: 'end_of_month',
      },
    ],
  },

  // المرحلة الثانية: الحساب
  calculation: {
    date: '15th_of_month',
    tasks: [
      {
        task: 'Calculate gross salary',
        description: 'حساب الراتب الإجمالي',
        formula: 'basic + allowances + overtime + bonuses',
      },
      {
        task: 'Calculate deductions',
        description: 'حساب الخصومات',
        includes: ['social_insurance', 'income_tax', 'loans', 'other_deductions'],
      },
      {
        task: 'Calculate net salary',
        description: 'حساب الراتب الصافي',
        formula: 'gross - deductions',
      },
      {
        task: 'Verify calculations',
        description: 'التحقق من الحسابات',
        checks: ['salary_caps', 'deduction_limits', 'regulatory_compliance'],
      },
    ],
  },

  // المرحلة الثالثة: الموافقة
  approval: {
    date: '20th_of_month',
    levels: [
      {
        level: 1,
        role: 'Department Manager',
        checks: 'payroll_accuracy',
      },
      {
        level: 2,
        role: 'HR Manager',
        checks: 'policy_compliance',
      },
      {
        level: 3,
        role: 'Finance Director',
        checks: 'financial_integrity',
      },
    ],

    signOff: 'digital_approval',
  },

  // المرحلة الرابعة: الإعداد للدفع
  paymentPreparation: {
    date: '22nd_of_month',
    tasks: [
      {
        task: 'Generate payslips',
        description: 'إنشاء قسائم الراتب',
        format: 'PDF',
        languages: ['Arabic', 'English'],
      },
      {
        task: 'Prepare bank transfer',
        description: 'إعداد التحويل البنكي',
        format: 'SWIFT/ACH',
        verification: 'double_check',
      },
      {
        task: 'Generate tax report',
        description: 'إنشاء تقرير الضرائب',
        recipients: ['Tax_Authority', 'Finance'],
      },
      {
        task: 'Prepare GOSI report',
        description: 'إعداد تقرير التأمينات',
        recipients: ['GOSI'],
        format: 'XML',
      },
    ],
  },

  // المرحلة الخامسة: الدفع
  payment: {
    date: '25th_of_month',
    method: 'bank_transfer',

    sequence: [
      {
        step: 1,
        action: 'Initiate transfer',
        system: 'Banking_Integration',
      },
      {
        step: 2,
        action: 'Confirm transfer',
        reviewer: 'Finance_Manager',
      },
      {
        step: 3,
        action: 'Execute transfer',
        bank: 'Employee_Banks',
      },
      {
        step: 4,
        action: 'Send confirmation',
        recipients: 'Employees',
        method: 'SMS_Email',
      },
    ],

    verification: 'bank_reconciliation',
  },

  // المرحلة السادسة: الإغلاق
  closure: {
    date: '28th_of_month',
    tasks: [
      {
        task: 'Reconcile payroll',
        description: 'المطابقة المالية',
        checkWith: ['Bank_Statements', 'GL_Accounts'],
      },
      {
        task: 'Archive payroll',
        description: 'أرشفة الرواتب',
        retention: '7_years',
      },
      {
        task: 'Generate final report',
        description: 'إنشاء التقرير النهائي',
        recipients: ['Management', 'Audit'],
      },
    ],
  },
};
```

### قسيمة الراتب

```javascript
// محتويات قسيمة الراتب
const payslip = {
  // معلومات الموظف
  employeeInfo: {
    name: 'Full Name',
    employeeId: 'ID Number',
    department: 'Department Name',
    position: 'Job Title',
    payPeriod: 'Month/Year',
  },

  // تفاصيل الأرباح
  earnings: {
    basicSalary: {
      description: 'الراتب الأساسي',
      amount: 5000.0,
    },

    allowances: {
      housing: { description: 'بدل السكن', amount: 2000.0 },
      transportation: { description: 'بدل المواصلات', amount: 500.0 },
      meals: { description: 'بدل الغذاء', amount: 300.0 },
      phone: { description: 'بدل الهاتف', amount: 200.0 },
      medical: { description: 'بدل الطبي', amount: 150.0 },
      dependents: { description: 'بدل التابعين', amount: 200.0 },
    },

    overtime: {
      description: 'العمل الإضافي',
      hours: 8,
      rate: 31.25,
      amount: 250.0,
    },

    bonuses: {
      performance: { description: 'مكافأة الأداء', amount: 500.0 },
      attendance: { description: 'مكافأة الحضور', amount: 250.0 },
    },

    totalEarnings: 9350.0,
  },

  // تفاصيل الخصومات
  deductions: {
    socialInsurance: {
      description: 'التأمينات الاجتماعية',
      percent: 9.75,
      amount: -780.0,
    },

    incomeTax: {
      description: 'ضريبة الدخل',
      percent: 5,
      amount: -450.0,
    },

    loans: {
      description: 'خصم القرض',
      amount: -500.0,
    },

    advance: {
      description: 'خصم السلفة',
      amount: -200.0,
    },

    totalDeductions: -1930.0,
  },

  // الملخص
  summary: {
    grossSalary: 9350.0,
    totalDeductions: 1930.0,
    netSalary: 7420.0,

    paymentMethod: 'Bank Transfer',
    bankName: 'Bank Name',
    accountNumber: '****1234',

    ytdEarnings: 46750.0,
    ytdDeductions: 9650.0,
    ytdNetSalary: 37100.0,
  },

  // معلومات إضافية
  additional: {
    leaveBalance: {
      annual: 10,
      sick: 15,
      unpaid: 0,
    },

    notes: 'Thank you for your hard work!',
    contactInfo: 'HR Department: hr@company.com',
    paymentDate: '25 January 2026',
  },

  // التوقيعات الرقمية
  signatures: {
    prepared_by: 'HR Manager',
    approved_by: 'Finance Director',
    date: '20 January 2026',
  },

  // معلومات التسليم
  delivery: {
    language: 'Arabic & English',
    format: 'PDF',
    channels: ['Email', 'Portal', 'SMS'],
    retention: 'Online for 7 years',
  },
};
```

---

## 🏦 التحويلات البنكية

### التكامل البنكي

```javascript
// التكامل مع البنوك
const bankIntegration = {
  // المتطلبات البنكية
  requirements: {
    accountDetails: {
      bankName: 'required',
      accountNumber: 'required',
      iban: 'required_for_international',
      accountHolder: 'required',
      verification: 'bank_confirmation',
    },

    encryption: {
      standard: 'AES256',
      transport: 'TLS1.2',
      keys: 'bank_approved',
    },

    authentication: {
      method: 'digital_certificate',
      backup: 'otp_verification',
    },
  },

  // ملف التحويل
  transferFile: {
    format: 'SWIFT MT103 or ACH',

    fileStructure: {
      header: {
        batchId: 'unique_identifier',
        company: 'company_name',
        date: 'processing_date',
        totalAmount: 'sum_of_all_salaries',
        recordCount: 'number_of_employees',
      },

      details: {
        per_employee: [
          {
            employeeId: 'id',
            name: 'full_name',
            bankAccount: 'iban',
            amount: 'net_salary',
            reference: 'payslip_number',
          },
        ],
      },

      footer: {
        totalRecords: 'count',
        totalAmount: 'sum',
        checksum: 'validation',
      },
    },

    validation: {
      checksums: 'verified',
      amounts: 'reconciled',
      accounts: 'validated',
      duplicates: 'checked',
    },
  },

  // عملية التحويل
  transferProcess: {
    step1: {
      action: 'File preparation',
      system: 'Payroll System',
      output: 'SWIFT file',
    },

    step2: {
      action: 'File encryption',
      method: 'AES256',
      output: 'encrypted_file',
    },

    step3: {
      action: 'Digital signature',
      method: 'PKI certificate',
      output: 'signed_file',
    },

    step4: {
      action: 'Secure transmission',
      protocol: 'SFTP/SSL',
      recipient: 'Bank system',
    },

    step5: {
      action: 'Bank verification',
      checks: ['file_integrity', 'signature_validity', 'account_validation'],
    },

    step6: {
      action: 'Transfer execution',
      timing: 'batch_processing',
      settlement: '1_business_day',
    },

    step7: {
      action: 'Confirmation receipt',
      format: 'SWIFT confirmation',
      notification: 'email_sms',
    },
  },

  // المعالجة والموثوقية
  processing: {
    failureHandling: {
      rejected_account: 'mark_for_investigation',
      insufficient_funds: 'retry_next_batch',
      duplicate_check: 'prevent_double_payment',
      reversal_process: 'automatic_if_error',
    },

    reconciliation: {
      frequency: 'daily',
      method: 'bank_statement_matching',
      variance: 'investigate_any_difference',
    },

    reporting: {
      success_rate: 'monitored',
      failed_transfers: 'escalated',
      completion_verification: 'required',
    },
  },
};
```

---

## 📊 الضرائب والتقارير

### تقارير الضرائب

```javascript
// تقارير الضرائب والالتزامات
const taxReporting = {
  // التقارير الشهرية
  monthlyReports: {
    withholding_tax: {
      description: 'تقرير ضريبة الدخل المستقطعة',
      includes: [
        'employee_names',
        'tax_amount',
        'gross_salary',
        'tax_rate'
      ],
      recipients: ['Tax_Authority', 'Finance']
    },

    social_insurance: {
      description: 'تقرير التأمينات الاجتماعية',
      includes: [
        'employee_details',
        'contributions',
        'salary_basis',
        'insurance_type'
      ],
      recipients: ['GOSI']
    }
  },

  // التقارير السنوية
  annualReports: {
    1901_tax_form: {
      description: 'نموذج 1901 (الضريبة)',
      includes: [
        'annual_salary',
        'annual_tax',
        'deductions',
        'net_income'
      ],
      deadline: 'within_60_days_of_year_end'
    },

    annual_withholding: {
      description: 'ملخص الضريبة السنوي',
      recipients: 'each_employee'
    },

    compliance_certification: {
      description: 'شهادة الامتثال',
      verifies: [
        'all_required_withholdings',
        'proper_remittance',
        'accurate_reporting'
      ]
    }
  },

  // الامتثال والتدقيق
  compliance: {
    requirements: {
      withholding: {
        accuracy: '100%',
        timeliness: 'monthly',
        reporting: 'regular'
      },

      remittance: {
        deadline: 'within_5_days',
        method: 'bank_transfer',
        verification: 'required'
      },

      documentation: {
        retention: '7_years',
        format: 'digital',
        accessibility: 'audit_ready'
      }
    }
  }
};
```

### لوحة معلومات الرواتب

```javascript
// لوحة معلومات معالجة الرواتب
const payrollDashboard = {
  // المقاييس الرئيسية
  keyMetrics: {
    activeEmployees: 'count',
    totalPayroll: 'monthly_sum',
    averageSalary: 'calculated',
    paymentSuccessRate: 'percentage',
    processingTime: 'days',
  },

  // التقارير السريعة
  quickReports: {
    payroll_summary: 'total_gross_deductions_net',
    pending_approvals: 'awaiting_sign_off',
    failed_transfers: 'needs_investigation',
    tax_summary: 'withholding_remittance',
  },

  // الرسوم البيانية
  charts: {
    salary_distribution: 'histogram',
    deductions_breakdown: 'pie_chart',
    cost_trends: 'line_chart',
    payment_status: 'bar_chart',
  },
};
```

---

## 🎯 الخلاصة

```
✅ نظام رواتب متكامل 100% وآمن
✅ متوافق مع جميع الأنظمة السعودية
✅ حساب دقيق وفوري
✅ تحويلات بنكية آمنة وموثوقة
✅ تقارير شاملة وامتثال تام
✅ أرشفة آمنة طويلة الأمد
```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ **READY FOR IMPLEMENTATION**
