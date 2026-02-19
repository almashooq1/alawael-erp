/**
 * Saudi Compliance Monitoring Service
 * خدمة مراقبة الامتثال التلقائية للأنظمة السعودية
 *
 * Features:
 * - Automatic daily compliance checks
 * - Document expiry alerts (Iqama, Insurance, Contracts)
 * - Nitaqat monitoring
 * - WPS submission reminders
 * - Automated reports
 */

import schedule from 'node-schedule';
import SaudiEmployee from '../models/saudi-employee.model';
import SaudiIntegrationService from './saudi-integration.service';
import { createLogger, Logger } from '../utils/logger';
import { sendEmail, sendSMS } from '../models/notifications';

// ============================================
// Types & Interfaces
// ============================================

export interface ComplianceAlert {
  type: 'critical' | 'warning' | 'info';
  category: 'iqama' | 'insurance' | 'contract' | 'gosi' | 'nitaqat' | 'wps';
  employeeId: string;
  employeeName: string;
  message: string;
  daysRemaining?: number;
  expiryDate?: Date;
  actionRequired: string;
  priority: number; // 1-5, 1 being highest
}

export interface ComplianceReport {
  date: Date;
  totalEmployees: number;
  compliantEmployees: number;
  nonCompliantEmployees: number;
  complianceRate: number;
  criticalAlerts: ComplianceAlert[];
  warnings: ComplianceAlert[];
  upcomingExpirations: {
    iqamas: number;
    insurances: number;
    contracts: number;
  };
  nitaqatStatus: {
    color: string;
    saudizationRate: number;
    risk: string;
  };
}

// ============================================
// Compliance Monitoring Service
// ============================================

export class SaudiComplianceMonitoringService {
  private logger: Logger;
  private alerts: ComplianceAlert[] = [];
  private initialized = false;

  constructor() {
    this.logger = createLogger('SaudiComplianceMonitoring');
  }

  /**
   * Initialize automated monitoring schedules
   */
  initializeMonitoring(): void {
    if (this.initialized) {
      this.logger.warn('Compliance monitoring already initialized');
      return;
    }

    this.logger.info('Initializing Saudi compliance monitoring...');

    // Daily compliance check at 8:00 AM
    schedule.scheduleJob('0 8 * * *', async () => {
      await this.runDailyComplianceCheck();
    });

    // Weekly report every Monday at 9:00 AM
    schedule.scheduleJob('0 9 * * 1', async () => {
      await this.generateWeeklyReport();
    });

    // Monthly WPS reminder on 5th of each month
    schedule.scheduleJob('0 10 5 * *', async () => {
      await this.sendWPSReminder();
    });

    // Hourly critical alerts check
    schedule.scheduleJob('0 * * * *', async () => {
      await this.checkCriticalAlerts();
    });

    this.initialized = true;
    this.logger.info('Compliance monitoring schedules initialized');
  }

  /**
   * Run daily compliance check for all active employees
   */
  async runDailyComplianceCheck(): Promise<ComplianceReport> {
    this.logger.info('Running daily compliance check...');
    this.alerts = [];

    try {
      const employees = await SaudiEmployee.find({ status: 'active' });
      let compliantCount = 0;

      for (const employee of employees) {
        const isCompliant = await this.checkEmployeeCompliance(employee);
        if (isCompliant) compliantCount++;
      }

      // Check Nitaqat status
      const nitaqatStatus = await this.checkNitaqatStatus();

      const complianceRate = employees.length > 0 ? (compliantCount / employees.length) * 100 : 0;

      const report: ComplianceReport = {
        date: new Date(),
        totalEmployees: employees.length,
        compliantEmployees: compliantCount,
        nonCompliantEmployees: employees.length - compliantCount,
        complianceRate,
        criticalAlerts: this.alerts.filter(a => a.type === 'critical'),
        warnings: this.alerts.filter(a => a.type === 'warning'),
        upcomingExpirations: await this.getUpcomingExpirations(),
        nitaqatStatus,
      };

      // Send alerts for critical issues
      await this.processCriticalAlerts(report.criticalAlerts);

      // Update compliance records
      await this.updateComplianceRecords(employees);

      this.logger.info(
        `Daily compliance check completed. Rate: ${report.complianceRate.toFixed(2)}%`
      );
      return report;
    } catch (error: any) {
      this.logger.error('Daily compliance check failed', error);
      throw error;
    }
  }

  /**
   * Check compliance for individual employee
   */
  private async checkEmployeeCompliance(employee: any): Promise<boolean> {
    let isCompliant = true;

    // Check Iqama expiry (for expats)
    if (employee.iqamaNumber) {
      const iqamaStatus = await this.checkIqamaExpiry(employee);
      if (!iqamaStatus.isValid) {
        isCompliant = false;
      }
    }

    // Check medical insurance
    const insuranceStatus = await this.checkMedicalInsurance(employee);
    if (!insuranceStatus.isValid) {
      isCompliant = false;
    }

    // Check MOL contract
    const contractStatus = await this.checkMOLContract(employee);
    if (!contractStatus.isValid) {
      isCompliant = false;
    }

    // Check GOSI status
    const gosiStatus = await this.checkGOSIStatus(employee);
    if (!gosiStatus.isValid) {
      isCompliant = false;
    }

    // Update employee compliance record
    employee.compliance.isCompliant = isCompliant;
    employee.compliance.lastCheckDate = new Date();
    await employee.save();

    return isCompliant;
  }

  /**
   * Check Iqama expiry
   */
  private async checkIqamaExpiry(employee: any): Promise<{ isValid: boolean }> {
    if (!employee.iqamaDetails || !employee.iqamaDetails.expiryDate) {
      return { isValid: true };
    }

    const now = new Date();
    const expiryDate = new Date(employee.iqamaDetails.expiryDate);
    const daysRemaining = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 0) {
      // Expired
      this.alerts.push({
        type: 'critical',
        category: 'iqama',
        employeeId: employee.id,
        employeeName: employee.fullNameArabic,
        message: `إقامة الموظف منتهية منذ ${Math.abs(daysRemaining)} يوم`,
        daysRemaining: 0,
        expiryDate,
        actionRequired: 'تجديد الإقامة فوراً أو إنهاء خدمات الموظف',
        priority: 1,
      });
      return { isValid: false };
    } else if (daysRemaining <= 30) {
      // Expiring soon
      this.alerts.push({
        type: daysRemaining <= 7 ? 'critical' : 'warning',
        category: 'iqama',
        employeeId: employee.id,
        employeeName: employee.fullNameArabic,
        message: `إقامة الموظف تنتهي خلال ${daysRemaining} يوم`,
        daysRemaining,
        expiryDate,
        actionRequired: 'البدء بإجراءات تجديد الإقامة',
        priority: daysRemaining <= 7 ? 1 : 2,
      });
      return { isValid: daysRemaining > 7 };
    }

    return { isValid: true };
  }

  /**
   * Check medical insurance validity
   */
  private async checkMedicalInsurance(employee: any): Promise<{ isValid: boolean }> {
    if (!employee.medicalInsurance || !employee.medicalInsurance.expiryDate) {
      this.alerts.push({
        type: 'critical',
        category: 'insurance',
        employeeId: employee.id,
        employeeName: employee.fullNameArabic,
        message: 'لا يوجد تأمين طبي مسجل للموظف',
        actionRequired: 'تسجيل تأمين طبي فوراً',
        priority: 1,
      });
      return { isValid: false };
    }

    const now = new Date();
    const expiryDate = new Date(employee.medicalInsurance.expiryDate);
    const daysRemaining = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 0) {
      this.alerts.push({
        type: 'critical',
        category: 'insurance',
        employeeId: employee.id,
        employeeName: employee.fullNameArabic,
        message: `التأمين الطبي منتهي منذ ${Math.abs(daysRemaining)} يوم`,
        daysRemaining: 0,
        expiryDate,
        actionRequired: 'تجديد التأمين الطبي فوراً',
        priority: 1,
      });
      return { isValid: false };
    } else if (daysRemaining <= 30) {
      this.alerts.push({
        type: daysRemaining <= 14 ? 'critical' : 'warning',
        category: 'insurance',
        employeeId: employee.id,
        employeeName: employee.fullNameArabic,
        message: `التأمين الطبي ينتهي خلال ${daysRemaining} يوم`,
        daysRemaining,
        expiryDate,
        actionRequired: 'تجديد التأمين الطبي',
        priority: daysRemaining <= 14 ? 1 : 2,
      });
      return { isValid: daysRemaining > 14 };
    }

    return { isValid: true };
  }

  /**
   * Check MOL contract status
   */
  private async checkMOLContract(employee: any): Promise<{ isValid: boolean }> {
    if (!employee.mol || !employee.mol.contractId) {
      this.alerts.push({
        type: 'critical',
        category: 'contract',
        employeeId: employee.id,
        employeeName: employee.fullNameArabic,
        message: 'لا يوجد عقد مسجل في مكتب العمل',
        actionRequired: 'تسجيل عقد في مكتب العمل فوراً',
        priority: 1,
      });
      return { isValid: false };
    }

    if (employee.mol.contractStatus !== 'active') {
      this.alerts.push({
        type: 'warning',
        category: 'contract',
        employeeId: employee.id,
        employeeName: employee.fullNameArabic,
        message: `حالة العقد: ${employee.mol.contractStatus}`,
        actionRequired: 'مراجعة حالة العقد',
        priority: 2,
      });
      return { isValid: false };
    }

    // Check limited contract expiry
    if (employee.mol.contractType === 'limited' && employee.mol.endDate) {
      const now = new Date();
      const endDate = new Date(employee.mol.endDate);
      const daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 60 && daysRemaining > 0) {
        this.alerts.push({
          type: 'warning',
          category: 'contract',
          employeeId: employee.id,
          employeeName: employee.fullNameArabic,
          message: `عقد محدد المدة ينتهي خلال ${daysRemaining} يوم`,
          daysRemaining,
          expiryDate: endDate,
          actionRequired: 'تجديد العقد أو إنهاء الخدمات',
          priority: 2,
        });
      }
    }

    return { isValid: true };
  }

  /**
   * Check GOSI status
   */
  private async checkGOSIStatus(employee: any): Promise<{ isValid: boolean }> {
    if (!employee.gosi || employee.gosi.subscriptionStatus !== 'active') {
      const isSaudi = employee.identificationType === 'national-id';

      if (isSaudi) {
        // GOSI is mandatory for Saudis
        this.alerts.push({
          type: 'critical',
          category: 'gosi',
          employeeId: employee.id,
          employeeName: employee.fullNameArabic,
          message: 'الموظف السعودي غير مسجل في التأمينات الاجتماعية',
          actionRequired: 'تسجيل الموظف في التأمينات فوراً',
          priority: 1,
        });
        return { isValid: false };
      } else {
        // GOSI is optional for expats (only work injuries)
        this.alerts.push({
          type: 'warning',
          category: 'gosi',
          employeeId: employee.id,
          employeeName: employee.fullNameArabic,
          message: 'الموظف غير مسجل في التأمينات (اختياري للأجانب)',
          actionRequired: 'التسجيل موصى به لتغطية مخاطر العمل',
          priority: 3,
        });
        return { isValid: true }; // Not critical for expats
      }
    }

    return { isValid: true };
  }

  /**
   * Check Nitaqat status
   */
  private async checkNitaqatStatus(): Promise<any> {
    try {
      const establishmentId = process.env.MOL_ESTABLISHMENT_ID || 'EST12345';
      const nitaqat = await SaudiIntegrationService.getNitaqatStatus(establishmentId);

      let risk = 'low';
      if (nitaqat.nitaqatColor === 'red') {
        risk = 'critical';
        this.alerts.push({
          type: 'critical',
          category: 'nitaqat',
          employeeId: 'ESTABLISHMENT',
          employeeName: 'المنشأة',
          message: 'المنشأة في النطاق الأحمر!',
          actionRequired: 'زيادة عدد الموظفين السعوديين فوراً',
          priority: 1,
        });
      } else if (nitaqat.nitaqatColor === 'yellow') {
        risk = 'medium';
        this.alerts.push({
          type: 'warning',
          category: 'nitaqat',
          employeeId: 'ESTABLISHMENT',
          employeeName: 'المنشأة',
          message: 'المنشأة في النطاق الأصفر',
          actionRequired: 'خطة لتحسين نسبة السعودة',
          priority: 2,
        });
      }

      return {
        color: nitaqat.nitaqatColor,
        saudizationRate: nitaqat.saudizationRate,
        risk,
      };
    } catch (error) {
      this.logger.error('Failed to check Nitaqat status', error);
      return { color: 'unknown', saudizationRate: 0, risk: 'unknown' };
    }
  }

  /**
   * Get upcoming expirations
   */
  private async getUpcomingExpirations(): Promise<any> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringIqamas = await SaudiEmployee.countDocuments({
      'iqamaDetails.expiryDate': { $lte: thirtyDaysFromNow, $gte: new Date() },
      status: 'active',
    });

    const expiringInsurances = await SaudiEmployee.countDocuments({
      'medicalInsurance.expiryDate': { $lte: thirtyDaysFromNow, $gte: new Date() },
      status: 'active',
    });

    const expiringContracts = await SaudiEmployee.countDocuments({
      'mol.endDate': { $lte: thirtyDaysFromNow, $gte: new Date() },
      'mol.contractType': 'limited',
      status: 'active',
    });

    return {
      iqamas: expiringIqamas,
      insurances: expiringInsurances,
      contracts: expiringContracts,
    };
  }

  /**
   * Process critical alerts
   */
  private async processCriticalAlerts(alerts: ComplianceAlert[]): Promise<void> {
    for (const alert of alerts) {
      // Send email notification
      await this.sendAlertEmail(alert);

      // Send SMS for priority 1 alerts
      if (alert.priority === 1) {
        await this.sendAlertSMS(alert);
      }

      // Log alert
      this.logger.warn(`Critical Alert: ${alert.message}`, {
        employeeId: alert.employeeId,
        category: alert.category,
      });
    }
  }

  /**
   * Send alert email
   */
  private async sendAlertEmail(alert: ComplianceAlert): Promise<void> {
    const subject = `تنبيه امتثال ${alert.type === 'critical' ? 'عاجل' : 'هام'}: ${alert.category}`;
    const body = `
      <div dir="rtl">
        <h2>${alert.type === 'critical' ? '🔴' : '🟡'} تنبيه امتثال</h2>
        <p><strong>الموظف:</strong> ${alert.employeeName}</p>
        <p><strong>النوع:</strong> ${alert.category}</p>
        <p><strong>الرسالة:</strong> ${alert.message}</p>
        ${alert.daysRemaining !== undefined ? `<p><strong>الأيام المتبقية:</strong> ${alert.daysRemaining}</p>` : ''}
        <p><strong>الإجراء المطلوب:</strong> ${alert.actionRequired}</p>
        <p><strong>الأولوية:</strong> ${alert.priority}/5</p>
      </div>
    `;

    try {
      await sendEmail(process.env.HR_EMAIL || 'hr@company.com', subject, body);
    } catch (error) {
      this.logger.error('Failed to send alert email', error);
    }
  }

  /**
   * Send alert SMS
   */
  private async sendAlertSMS(alert: ComplianceAlert): Promise<void> {
    const message = `تنبيه عاجل: ${alert.message} - ${alert.employeeName}`;

    try {
      await sendSMS(process.env.HR_PHONE || '+966501234567', message);
    } catch (error) {
      this.logger.error('Failed to send alert SMS', error);
    }
  }

  /**
   * Update compliance records
   */
  private async updateComplianceRecords(employees: any[]): Promise<void> {
    for (const employee of employees) {
      const relevantAlerts = this.alerts.filter(a => a.employeeId === employee.id);

      employee.compliance.issues = relevantAlerts
        .filter(a => a.type === 'critical')
        .map(a => a.message);

      employee.compliance.warnings = relevantAlerts
        .filter(a => a.type === 'warning')
        .map(a => a.message);

      employee.compliance.lastCheckDate = new Date();

      // Set next review date based on nearest expiry
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + 7); // Default: weekly
      employee.compliance.nextReviewDate = nextReview;

      await employee.save();
    }
  }

  /**
   * Check critical alerts (hourly)
   */
  private async checkCriticalAlerts(): Promise<void> {
    const employees = await SaudiEmployee.find({
      status: 'active',
      $or: [
        { 'iqamaDetails.expiryDate': { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
        { 'medicalInsurance.expiryDate': { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
      ],
    });

    if (employees.length > 0) {
      this.logger.warn(`Found ${employees.length} employees with critical expirations`);
    }
  }

  /**
   * Generate weekly report
   */
  async generateWeeklyReport(): Promise<void> {
    this.logger.info('Generating weekly compliance report...');

    const report = await this.runDailyComplianceCheck();

    const reportHTML = `
      <div dir="rtl">
        <h1>📊 تقرير الامتثال الأسبوعي</h1>
        <p><strong>التاريخ:</strong> ${report.date.toLocaleDateString('ar-SA')}</p>
        
        <h2>📈 الإحصائيات العامة</h2>
        <ul>
          <li>إجمالي الموظفين: ${report.totalEmployees}</li>
          <li>الموظفين الملتزمين: ${report.compliantEmployees}</li>
          <li>الموظفين غير الملتزمين: ${report.nonCompliantEmployees}</li>
          <li>نسبة الامتثال: ${report.complianceRate.toFixed(2)}%</li>
        </ul>

        <h2>🔴 التنبيهات الحرجة (${report.criticalAlerts.length})</h2>
        <ul>
          ${report.criticalAlerts.map(a => `<li>${a.message} - ${a.employeeName}</li>`).join('')}
        </ul>

        <h2>🟡 التحذيرات (${report.warnings.length})</h2>
        <ul>
          ${report.warnings.map(a => `<li>${a.message} - ${a.employeeName}</li>`).join('')}
        </ul>

        <h2>📅 الانتهاءات القادمة (30 يوم)</h2>
        <ul>
          <li>إقامات: ${report.upcomingExpirations.iqamas}</li>
          <li>تأمينات طبية: ${report.upcomingExpirations.insurances}</li>
          <li>عقود: ${report.upcomingExpirations.contracts}</li>
        </ul>

        <h2>🎯 حالة نطاقات</h2>
        <ul>
          <li>اللون: ${report.nitaqatStatus.color}</li>
          <li>نسبة السعودة: ${report.nitaqatStatus.saudizationRate}%</li>
          <li>مستوى المخاطر: ${report.nitaqatStatus.risk}</li>
        </ul>
      </div>
    `;

    await sendEmail(
      process.env.HR_EMAIL || 'hr@company.com',
      'تقرير الامتثال الأسبوعي',
      reportHTML
    );

    this.logger.info('Weekly report sent successfully');
  }

  /**
   * Send WPS reminder
   */
  private async sendWPSReminder(): Promise<void> {
    const message = `
      <div dir="rtl">
        <h2>📋 تذكير: تقديم ملف حماية الأجور</h2>
        <p>يرجى تقديم ملف حماية الأجور (WPS) لهذا الشهر قبل يوم 10.</p>
        <p><strong>الموعد النهائي:</strong> ${new Date().toLocaleDateString('ar-SA')}</p>
      </div>
    `;

    await sendEmail(
      process.env.HR_EMAIL || 'hr@company.com',
      'تذكير: تقديم ملف حماية الأجور (WPS)',
      message
    );

    this.logger.info('WPS reminder sent');
  }
}

export default new SaudiComplianceMonitoringService();
