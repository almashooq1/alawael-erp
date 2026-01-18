# 🏛️ دليل التكامل مع الأنظمة الحكومية - GOSI و MOL والبنوك

**الإصدار:** v1.0.0  
**التاريخ:** 14 يناير 2026  
**الموضوع:** التكامل الكامل مع الأنظمة الحكومية والبنكية

---

## 📡 نظرة عامة على التكاملات

```
┌─────────────────────────────────────────────────────┐
│         نظام الموارد البشرية (HR System)           │
└─────────────────────────────────────────────────────┘
              ↓         ↓         ↓         ↓
        ┌─────┴────┬────┴────┬────┴────┬────┴────┐
        ↓          ↓         ↓         ↓         ↓
    ┌────────┐ ┌─────┐ ┌───────┐ ┌──────┐ ┌─────────┐
    │ GOSI   │ │ MOL │ │ Banks │ │ Email│ │Insurance│
    │ (9.75%)│ │     │ │(SWIFT)│ │      │ │ (APIs)  │
    └────────┘ └─────┘ └───────┘ └──────┘ └─────────┘
```

---

## 🔐 التكامل مع GOSI (التأمينات الاجتماعية)

### نقاط الاتصال

```
نوع التكامل: REST API + XML Encryption
الموقع: https://e.gosi.gov.sa/api
البروتوكول: HTTPS + OAuth 2.0
التشفير: AES256
```

### العمليات الرئيسية

#### 1. تسجيل موظف جديد

```javascript
// gosiService.js
class GOSIService {
  async registerEmployee(employee) {
    // البيانات المطلوبة
    const data = {
      // معلومات الموظف
      nationalId: employee.personal.idNumber,
      firstName: employee.personal.arabicName,
      dateOfBirth: employee.personal.dateOfBirth,
      nationality: employee.personal.nationality,

      // معلومات التوظيف
      companyCode: process.env.GOSI_COMPANY_CODE,
      hireDate: employee.employment.hireDate,
      insurableWage: employee.employment.baseSalary,
      insuranceType: '1', // عام

      // معلومات الاتصال
      email: employee.personal.email,
      phone: employee.personal.phone,
      address: employee.personal.address,
    };

    try {
      // تشفير البيانات
      const encryptedData = this.encryptData(data);

      // إرسال إلى GOSI
      const response = await axios.post(
        'https://e.gosi.gov.sa/api/subscribers/register',
        { data: encryptedData },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // معالجة الرد
      if (response.data.success) {
        const gosiId = response.data.subscriberNumber;

        // حفظ في النظام
        await Employee.updateOne(
          { _id: employee._id },
          {
            'socialInsurance.gosiId': gosiId,
            'socialInsurance.registrationDate': new Date(),
            'socialInsurance.status': 'registered',
          },
        );

        // تسجيل في السجل
        await AuditLog.create({
          action: 'GOSI_REGISTRATION',
          resource: 'employee',
          resourceId: employee._id,
          details: { gosiId, status: 'success' },
          status: 'success',
        });

        return { success: true, gosiId };
      }
    } catch (error) {
      console.error('GOSI Registration Error:', error);
      throw new Error('Failed to register with GOSI');
    }
  }

  // تشفير البيانات
  encryptData(data) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.GOSI_ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }
}
```

#### 2. تقرير المساهمات الشهري

```javascript
async generateMonthlyGOSIReport(period) {
  // مثال: '2026-03' للشهر الثالث من سنة 2026
  const [year, month] = period.split('-');

  // جلب بيانات الموظفين النشطين
  const employees = await Employee.find({
    'socialInsurance.gosiId': { $exists: true },
    'employment.status': 'active'
  });

  // جلب بيانات الرواتب
  const payrolls = await Payroll.find({
    payPeriod: period,
    'payment.status': { $in: ['approved', 'processed', 'paid'] }
  });

  // بناء التقرير
  const report = {
    companyCode: process.env.GOSI_COMPANY_CODE,
    period: period,
    reportDate: new Date(),

    contributions: payrolls.map(payroll => {
      const employee = employees.find(e => e._id.toString() === payroll.employeeId.toString());
      const insurableSalary = Math.min(employee.employment.baseSalary, 45000); // الحد الأقصى
      const employeeShare = insurableSalary * 0.0975; // 9.75%
      const employerShare = insurableSalary * 0.13; // 13%

      return {
        subscriberNumber: employee.socialInsurance.gosiId,
        insurableWage: insurableSalary,
        employeeContribution: employeeShare,
        employerContribution: employerShare,
        totalContribution: employeeShare + employerShare,
        period: period
      };
    }),

    summary: {
      totalEmployees: payrolls.length,
      totalInsurableWages: payrolls.reduce((sum, p) => sum + Math.min(p.earnings.basicSalary, 45000), 0),
      totalEmployeeContribution: 0,
      totalEmployerContribution: 0
    }
  };

  // حساب الإجمالي
  report.summary.totalEmployeeContribution = report.contributions.reduce((sum, c) => sum + c.employeeContribution, 0);
  report.summary.totalEmployerContribution = report.contributions.reduce((sum, c) => sum + c.employerContribution, 0);

  try {
    // إرسال التقرير إلى GOSI
    const response = await axios.post(
      'https://e.gosi.gov.sa/api/contributions/submit',
      { data: this.encryptData(report) },
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // حفظ التقرير
    await GOSIReport.create({
      period: period,
      reportDate: new Date(),
      submissionDate: new Date(),
      status: 'submitted',
      responseId: response.data.reportId,
      totalContribution: report.summary.totalEmployeeContribution + report.summary.totalEmployerContribution
    });

    return { success: true, reportId: response.data.reportId };
  } catch (error) {
    console.error('GOSI Report Error:', error);
    throw error;
  }
}
```

#### 3. إنهاء الاشتراك

```javascript
async terminateEmployee(employeeId, terminationDate) {
  const employee = await Employee.findById(employeeId);

  if (!employee.socialInsurance.gosiId) {
    throw new Error('Employee not registered with GOSI');
  }

  const data = {
    subscriberNumber: employee.socialInsurance.gosiId,
    terminationDate: terminationDate,
    lastWage: employee.employment.baseSalary,
    terminationReason: 'resignation' // or 'dismissal', 'retirement'
  };

  try {
    const response = await axios.post(
      'https://e.gosi.gov.sa/api/subscribers/terminate',
      { data: this.encryptData(data) },
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      await Employee.updateOne(
        { _id: employeeId },
        {
          'socialInsurance.status': 'terminated',
          'employment.status': 'terminated',
          'employment.terminationDate': terminationDate
        }
      );

      return { success: true };
    }
  } catch (error) {
    console.error('GOSI Termination Error:', error);
    throw error;
  }
}
```

---

## 🏢 التكامل مع MOL (وزارة الموارد البشرية)

### نقاط الاتصال

```
نوع التكامل: REST API
الموقع: https://api.mol.gov.sa/v1
البروتوكول: HTTPS + OAuth 2.0
الوثائق: https://developer.mol.gov.sa
```

### العمليات الرئيسية

#### 1. تقرير الموارد البشرية الشهري

```javascript
class MOLService {
  async submitMonthlyHRReport(period) {
    const [year, month] = period.split('-');

    // جلب البيانات
    const employees = await Employee.find({ 'employment.status': 'active' });
    const attendances = await Attendance.find({ month: month, year: year });
    const leaves = await Leave.find({ startDate: { $gte: `${period}-01`, $lt: `${period}-32` } });

    const report = {
      companyCode: process.env.MOL_COMPANY_CODE,
      reportPeriod: period,
      submissionDate: new Date(),

      employees: {
        total: employees.length,
        active: employees.filter(e => e.employment.status === 'active').length,
        onLeave: employees.filter(e => e.employment.status === 'on_leave').length,
        suspended: employees.filter(e => e.employment.status === 'suspended').length,
        terminated: employees.filter(e => e.employment.status === 'terminated').length,
      },

      workingHours: {
        totalHoursWorked: this.calculateTotalHours(attendances),
        overtimeHours: this.calculateOvertimeHours(attendances),
        absentDays: this.calculateAbsentDays(attendances),
        leaveDays: leaves.length,
      },

      details: employees.map(emp => ({
        nationalId: emp.personal.idNumber,
        name: emp.personal.arabicName,
        position: emp.employment.positionTitle,
        department: emp.employment.department,
        salary: emp.employment.baseSalary,
        hireDate: emp.employment.hireDate,
        status: emp.employment.status,
      })),
    };

    try {
      const response = await axios.post('https://api.mol.gov.sa/v1/reports/submit', report, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // حفظ الرد
      await MOLReport.create({
        period: period,
        submissionDate: new Date(),
        status: 'submitted',
        responseId: response.data.reportId,
      });

      return { success: true, reportId: response.data.reportId };
    } catch (error) {
      console.error('MOL Report Error:', error);
      throw error;
    }
  }

  calculateTotalHours(attendances) {
    return attendances.reduce((sum, a) => sum + (a.hoursWorked || 8), 0);
  }

  calculateOvertimeHours(attendances) {
    return attendances.reduce((sum, a) => sum + Math.max(0, (a.hoursWorked || 0) - 8), 0);
  }

  calculateAbsentDays(attendances) {
    return attendances.filter(a => a.status === 'absent').length;
  }
}
```

#### 2. تقرير الأجور والمزايا

```javascript
async submitWageReport(period) {
  const payrolls = await Payroll.find({
    payPeriod: period,
    'payment.status': { $in: ['approved', 'paid'] }
  });

  const report = {
    companyCode: process.env.MOL_COMPANY_CODE,
    period: period,

    wageBreakdown: {
      totalBasicWage: payrolls.reduce((sum, p) => sum + p.earnings.basicSalary, 0),
      totalAllowances: payrolls.reduce((sum, p) => {
        const allowances = Object.values(p.earnings.allowances || {});
        return sum + allowances.reduce((a, b) => a + b, 0);
      }, 0),
      totalBonuses: payrolls.reduce((sum, p) => {
        const bonuses = Object.values(p.earnings.bonuses || {});
        return sum + bonuses.reduce((a, b) => a + b, 0);
      }, 0),
      totalOvertime: payrolls.reduce((sum, p) => sum + (p.earnings.overtime?.amount || 0), 0),

      totalDeductions: payrolls.reduce((sum, p) => sum + p.deductions.totalDeductions, 0),
      totalNetWages: payrolls.reduce((sum, p) => sum + p.netSalary, 0)
    },

    employeeDetails: payrolls.map(p => ({
      nationalId: p.employee.personal.idNumber,
      salary: p.earnings.basicSalary,
      deductions: p.deductions.totalDeductions,
      netSalary: p.netSalary,
      paymentMethod: p.payment.method
    }))
  };

  try {
    await axios.post(
      'https://api.mol.gov.sa/v1/wages/submit',
      report,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true };
  } catch (error) {
    console.error('MOL Wage Report Error:', error);
    throw error;
  }
}
```

---

## 🏦 التكامل مع البنوك (SWIFT/ACH)

### نقاط الاتصال

```
البنك الأهلي:
├─ SWIFT Code: NCOSAESA
├─ البروتوكول: SWIFT MT103 / SFTP
└─ الساعات: 8 AM - 5 PM (الأحد - الخميس)

بنك الراجحي:
├─ SWIFT Code: RJHISARX
├─ البروتوكول: SWIFT MT103 / ACH
└─ الساعات: 8 AM - 5 PM (الأحد - الخميس)
```

### عملية التحويل البنكي

```javascript
class BankingService {
  async prepareBankTransfer(payrollId) {
    const payroll = await Payroll.findById(payrollId);
    const employees = await Employee.find({
      _id: { $in: payroll.employees },
    });

    // بناء ملف SWIFT MT103
    const transfers = employees
      .filter(e => e.banking?.iban)
      .map(employee => {
        const salary = payroll.details[employee._id]?.netSalary || 0;

        return {
          // معلومات المستقبل
          recipientName: employee.personal.arabicName,
          recipientIBAN: employee.banking.iban,
          recipientSwiftCode: this.getSwiftCode(employee.banking.bankName),
          amount: salary,
          currency: 'SAR',

          // معلومات التحويل
          transferDate: new Date(),
          valueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // غدا
          reference: `HR-PAYROLL-${payroll.payPeriod}`,
          description: `Salary Payment - ${payroll.payPeriod}`,

          // معلومات المرسل
          companyName: process.env.COMPANY_NAME,
          companyIBAN: process.env.COMPANY_IBAN,
        };
      });

    // إنشاء ملف SWIFT
    const swiftFile = this.generateSWIFTFile(transfers);

    // حفظ الملف
    const filename = `PAYROLL-${payroll.payPeriod}-${Date.now()}.swift`;
    await FileService.save(filename, swiftFile);

    // إرسال للبنك
    try {
      await this.sendToBank(filename, swiftFile);

      // تحديث الحالة
      await Payroll.updateOne(
        { _id: payrollId },
        {
          'payment.status': 'processed',
          'payment.bankReference': `SWIFT-${Date.now()}`,
          'payment.bankFile': filename,
          'payment.sentToBank': new Date(),
        },
      );

      return { success: true, filename, count: transfers.length };
    } catch (error) {
      console.error('Bank Transfer Error:', error);
      throw error;
    }
  }

  generateSWIFTFile(transfers) {
    let swiftContent = '';

    // رأس الملف
    swiftContent += `{1:F01${process.env.COMPANY_SWIFT_CODE}XXXX0000000001}\n`;
    swiftContent += `{2:I103NCOSAESAXXX}\n`;
    swiftContent += `{3:{108:${generateUniqueReference()}}}\n`;
    swiftContent += `{4:\n`;

    // معلومات العملية
    swiftContent += `:20:${generateMessageRef()}\n`;
    swiftContent += `:23B:CRED\n`;
    swiftContent += `:32A:${formatDate(new Date())}SAR${getTotalAmount(transfers)}\n`;
    swiftContent += `:50H:/${process.env.COMPANY_IBAN}\n`;
    swiftContent += `:${process.env.COMPANY_NAME}\n`;
    swiftContent += `:30:${formatDate(new Date())}\n`;
    swiftContent += `:21:PAYROLL-${new Date().toISOString()}\n`;

    // تفاصيل التحويلات
    transfers.forEach(transfer => {
      swiftContent += `:61:${formatDate(transfer.valueDate)}RF${transfer.amount}${transfer.currency}\n`;
      swiftContent += `:32B:${transfer.currency}${transfer.amount}\n`;
      swiftContent += `:50A:/${transfer.companyIBAN}\n`;
      swiftContent += `:${transfer.companyName}\n`;
      swiftContent += `:59:/${transfer.recipientIBAN}\n`;
      swiftContent += `:${transfer.recipientName}\n`;
      swiftContent += `:70:/PAYROLL\n`;
      swiftContent += `:${transfer.description}\n`;
      swiftContent += `:71A:SHA\n`;
    });

    swiftContent += `-}\n`;

    return swiftContent;
  }

  async sendToBank(filename, content) {
    const SFTPClient = require('ssh2-sftp-client');
    const sftp = new SFTPClient();

    try {
      await sftp.connect({
        host: process.env.BANK_SFTP_HOST,
        port: process.env.BANK_SFTP_PORT,
        username: process.env.BANK_SFTP_USER,
        password: process.env.BANK_SFTP_PASS,
      });

      // رفع الملف
      await sftp.put(Buffer.from(content), `/incoming/${filename}`);

      await sftp.end();
      console.log(`✓ File sent to bank: ${filename}`);
    } catch (error) {
      console.error('SFTP Error:', error);
      throw error;
    }
  }

  getSwiftCode(bankName) {
    const codes = {
      'البنك الأهلي': 'NCOSAESA',
      الراجحي: 'RJHISARX',
      الإماراتي: 'UAEBDDD',
      الإنماء: 'ANDBSA2X',
    };
    return codes[bankName] || 'UNKNOWN';
  }
}
```

---

## 📧 التكامل مع خدمة البريد الإلكتروني

```javascript
class EmailService {
  async sendPayslip(employee, payroll) {
    const html = await this.generatePayslipHTML(employee, payroll);

    await mailer.sendMail({
      from: process.env.EMAIL_FROM,
      to: employee.personal.email,
      cc: `${employee.employment.manager.email}`,
      subject: `قسيمة الراتب - ${payroll.payPeriod}`,
      html: html,
      attachments: [
        {
          filename: `Payslip-${payroll.payPeriod}.pdf`,
          content: await this.generatePayslipPDF(employee, payroll),
        },
      ],
    });
  }

  async sendLeaveNotification(employee, leave) {
    await mailer.sendMail({
      from: process.env.EMAIL_FROM,
      to: employee.personal.email,
      cc: `${employee.employment.manager.email}`,
      subject: `تنبيه: طلب إجازة جديد`,
      html: `
        <h2>تم تقديم طلب إجازة</h2>
        <p>الموظف: ${employee.personal.arabicName}</p>
        <p>النوع: ${leave.leaveType}</p>
        <p>من: ${leave.startDate} إلى ${leave.endDate}</p>
        <p>الحالة: في انتظار الموافقة</p>
        <p><a href="${process.env.APP_URL}/leaves/${leave._id}">عرض التفاصيل</a></p>
      `,
    });
  }

  async sendInsuranceClaimUpdate(employee, claim) {
    const statuses = {
      submitted: 'تم استقبال الادعاء',
      under_review: 'قيد المراجعة',
      approved: 'تم الموافقة',
      rejected: 'تم الرفض',
      paid: 'تم الدفع',
    };

    await mailer.sendMail({
      from: process.env.EMAIL_FROM,
      to: employee.personal.email,
      subject: `تحديث حالة الادعاء التأميني`,
      html: `
        <h2>تحديث حالة الادعاء</h2>
        <p>رقم الادعاء: ${claim.claimNumber}</p>
        <p>الحالة: ${statuses[claim.status]}</p>
        <p>المبلغ المطالب: ${claim.amounts.claimed} ر.س</p>
        <p><a href="${process.env.APP_URL}/insurance/claims/${claim._id}">متابعة الادعاء</a></p>
      `,
    });
  }
}
```

---

## 🔄 دورة المعالجة الشهرية الكاملة

```
يوم 25: دورة الرواتب الكاملة
└─ 8:00 AM   - بدء حساب الرواتب
└─ 10:00 AM  - جاهزة للموافقة
└─ 2:00 PM   - الموافقات متعددة المستويات
└─ 4:00 PM   - جاهزة للدفع

يوم 26: التحويلات البنكية
└─ 8:00 AM   - إرسال ملفات البنك (SWIFT)
└─ 10:00 AM  - تأكيد الاستقبال من البنك
└─ 2:00 PM   - بدء التحويلات البنكية
└─ 5:00 PM   - إرسال قسائم الرواتب للموظفين

يوم 27: التقارير الحكومية
└─ 8:00 AM   - جمع بيانات الراتب النهائية
└─ 10:00 AM  - إرسال تقرير GOSI (نفس اليوم)
└─ 2:00 PM   - إرسال تقرير MOL (إذا لزم الأمر)
└─ 4:00 PM   - إغلاق الدورة المحاسبية

يوم 28: التحقق والتأكيد
└─ 8:00 AM   - تأكيد استقبال الموظفين للرواتب
└─ 10:00 AM  - تأكيد استقبال GOSI للتقرير
└─ 2:00 PM   - إرسال التقارير المحاسبية
└─ 4:00 PM   - أرشفة الوثائق
```

---

## ✅ قوائم التحقق الشهرية

```
قبل الدفع:
☐ تحميل بيانات الحضور
☐ التحقق من الساعات الإضافية
☐ التحقق من الخصومات الإضافية
☐ التحقق من بيانات البنك
☐ التحقق من المكافآت والبدلات

عند المعالجة:
☐ حساب الرواتب تلقائيا
☐ مراجعة النتائج
☐ الموافقات المتعددة
☐ إنشاء ملف البنك (SWIFT)
☐ تأكيد أرقام IBAN

عند الإرسال:
☐ إرسال ملف البنك
☐ تأكيد الاستقبال من البنك
☐ إرسال قسائم الرواتب
☐ إرسال تقرير GOSI
☐ إرسال تقرير MOL

بعد الدفع:
☐ تأكيد استقبال الموظفين
☐ تأكيد استقبال الجهات الحكومية
☐ إغلاق الدورة
☐ أرشفة الوثائق
☐ إنشاء التقارير النهائية
```

---

**✅ التكاملات الحكومية جاهزة للتنفيذ الفوري!**

**الإصدار:** v1.0.0  
**التاريخ:** 14 يناير 2026  
**الحالة:** ✅ جاهز للاستخدام

---

_"نظام موارد بشرية سعودي - متكامل مع جميع الجهات الحكومية"_
