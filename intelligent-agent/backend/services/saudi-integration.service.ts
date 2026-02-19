/**
 * Saudi Government Systems Integration Service
 * خدمة التكامل مع الأنظمة الحكومية السعودية
 *
 * Integrations:
 * - Ministry of Labor (مكتب العمل)
 * - Saudi Passports/Immigration (الجوازات)
 * - Iqama System (نظام الإقامات)
 * - Medical Insurance (التأمين الطبي)
 * - GOSI - General Organization for Social Insurance (التأمينات الاجتماعية)
 */

import axios, { AxiosInstance } from 'axios';
import { createLogger, Logger } from '../utils/logger';
import { EncryptionService } from '../utils/advanced.security';

// ============================================
// Types & Interfaces
// ============================================

export interface SaudiNationalID {
  nationalId: string; // رقم الهوية الوطنية (10 digits)
  fullNameArabic: string;
  fullNameEnglish: string;
  dateOfBirth: Date;
  gender: 'male' | 'female';
  nationality: string;
  placeOfBirth: string;
  issueDate: Date;
  expiryDate: Date;
}

export interface IqamaDetails {
  iqamaNumber: string; // رقم الإقامة (10 digits)
  fullNameArabic: string;
  fullNameEnglish: string;
  nationality: string;
  dateOfBirth: Date;
  gender: 'male' | 'female';
  profession: string;
  sponsorId: string; // رقم هوية الكفيل
  sponsorName: string;
  issueDate: Date;
  expiryDate: Date;
  borderNumber: string; // رقم الحدود
  iqamaStatus: 'active' | 'expired' | 'cancelled' | 'under-renewal';
}

export interface MolEstablishment {
  establishmentId: string; // رقم المنشأة
  establishmentName: string;
  laborOfficeId: string; // رقم مكتب العمل
  unifiedNumber: string; // الرقم الموحد
  crNumber: string; // رقم السجل التجاري
  nitaqatColor: 'platinum' | 'green' | 'yellow' | 'red';
  saudiEmployees: number;
  foreignEmployees: number;
  saudizationRate: number;
}

export interface MolEmployeeContract {
  contractId: string;
  employeeIqama: string;
  employerEstablishmentId: string;
  contractType: 'limited' | 'unlimited';
  jobTitle: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  startDate: Date;
  endDate?: Date;
  workingHours: number;
  contractStatus: 'active' | 'terminated' | 'suspended' | 'transfer-pending';
}

export interface GOSIRegistration {
  gosiNumber: string; // رقم التأمينات الاجتماعية
  employeeId: string;
  nationalId: string;
  subscriberWage: number; // الأجر الخاضع للاشتراك
  subscriptionStartDate: Date;
  subscriptionStatus: 'active' | 'suspended' | 'cancelled';
  employerContribution: number; // نسبة صاحب العمل
  employeeContribution: number; // نسبة الموظف
  lastContributionDate: Date;
}

export interface MedicalInsurance {
  policyNumber: string;
  insuranceCompany: string;
  employeeId: string;
  nationalId: string;
  coverageType: 'class-a' | 'class-b' | 'class-c' | 'vip';
  coverageAmount: number;
  startDate: Date;
  expiryDate: Date;
  status: 'active' | 'expired' | 'cancelled';
  dependents: number;
  coPaymentPercentage: number;
}

export interface VisaDetails {
  visaNumber: string;
  visaType: 'work' | 'visit' | 'business' | 'family';
  sponsorId: string;
  issueDate: Date;
  expiryDate: Date;
  status: 'valid' | 'expired' | 'used' | 'cancelled';
  occupation: string;
  nationality: string;
}

export interface ExitReEntry {
  requestId: string;
  iqamaNumber: string;
  requestType: 'single' | 'multiple';
  issueDate: Date;
  expiryDate: Date;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  remainingTrips?: number;
}

export interface WageProtectionSystem {
  molReferenceNumber: string;
  establishmentId: string;
  paymentMonth: string; // YYYY-MM
  employeeIqama: string;
  basicSalary: number;
  housingAllowance: number;
  otherAllowances: number;
  deductions: number;
  netSalary: number;
  paymentDate: Date;
  paymentStatus: 'pending' | 'paid' | 'rejected' | 'delayed';
  bankName: string;
  ibanNumber: string;
}

// ============================================
// Saudi Integration Service Class
// ============================================

export class SaudiIntegrationService {
  private logger: Logger;
  private encryptionService: EncryptionService;
  private molClient: AxiosInstance;
  private jawazatClient: AxiosInstance;
  private gosiClient: AxiosInstance;
  private medicalInsuranceClient: AxiosInstance;
  private mockMode: boolean;

  constructor() {
    this.logger = createLogger('SaudiIntegrationService');
    this.encryptionService = new EncryptionService();
    this.mockMode =
      process.env.SAUDI_INTEGRATION_MOCK === 'true' ||
      process.env.NODE_ENV === 'test' ||
      !!process.env.VITEST_WORKER_ID;

    // Ministry of Labor API Client
    this.molClient = axios.create({
      baseURL: process.env.MOL_API_BASE_URL || 'https://api.mol.gov.sa',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MOL_API_KEY}`,
        'X-API-Key': process.env.MOL_API_SECRET,
      },
    });

    // Jawazat (Passports) API Client
    this.jawazatClient = axios.create({
      baseURL: process.env.JAWAZAT_API_BASE_URL || 'https://api.gdp.gov.sa',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.JAWAZAT_API_KEY}`,
      },
    });

    // GOSI API Client
    this.gosiClient = axios.create({
      baseURL: process.env.GOSI_API_BASE_URL || 'https://api.gosi.gov.sa',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GOSI_API_KEY}`,
      },
    });

    // Medical Insurance API Client
    this.medicalInsuranceClient = axios.create({
      baseURL: process.env.MEDICAL_INSURANCE_API_URL || 'https://api.cchi.gov.sa',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MEDICAL_API_KEY}`,
      },
    });
  }

  // ============================================
  // National ID / Iqama Verification
  // ============================================

  /**
   * Verify Saudi National ID
   * التحقق من الهوية الوطنية السعودية
   */
  async verifySaudiNationalId(nationalId: string): Promise<SaudiNationalID> {
    try {
      this.logger.info(`Verifying Saudi National ID: ${nationalId}`);

      // Validate format (10 digits, starts with 1)
      if (!this.validateNationalIdFormat(nationalId)) {
        throw new Error('Invalid National ID format');
      }

      if (this.mockMode) {
        return {
          nationalId,
          fullNameArabic: 'أحمد محمد علي',
          fullNameEnglish: 'Ahmed Mohammed Ali',
          dateOfBirth: new Date('1990-01-15'),
          gender: 'male',
          nationality: 'Saudi',
          placeOfBirth: 'الرياض',
          issueDate: new Date('2015-01-01'),
          expiryDate: new Date('2035-01-01'),
        };
      }

      const response = await this.jawazatClient.post('/verify/national-id', { nationalId });
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to verify National ID', error);
      throw new Error(`National ID verification failed: ${error.message}`);
    }
  }

  /**
   * Verify Iqama (Residence permit)
   * التحقق من الإقامة
   */
  async verifyIqama(iqamaNumber: string): Promise<IqamaDetails> {
    try {
      this.logger.info(`Verifying Iqama: ${iqamaNumber}`);

      // Validate format (10 digits, starts with 2)
      if (!this.validateIqamaFormat(iqamaNumber)) {
        throw new Error('Invalid Iqama format');
      }

      if (this.mockMode) {
        return {
          iqamaNumber,
          fullNameArabic: 'محمد عبدالله',
          fullNameEnglish: 'Mohammed Abdullah',
          nationality: 'Egyptian',
          dateOfBirth: new Date('1992-05-20'),
          gender: 'male',
          profession: 'Engineer',
          sponsorId: '1234567890',
          sponsorName: 'شركة مثال',
          issueDate: new Date('2023-01-01'),
          expiryDate: this.getMockIqamaExpiry(iqamaNumber),
          borderNumber: 'BRD123456',
          iqamaStatus: 'active',
        };
      }

      const response = await this.jawazatClient.post('/verify/iqama', { iqamaNumber });
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to verify Iqama', error);
      throw new Error(`Iqama verification failed: ${error.message}`);
    }
  }

  /**
   * Check Iqama expiry status
   * التحقق من صلاحية الإقامة
   */
  async checkIqamaExpiry(iqamaNumber: string): Promise<{
    isExpired: boolean;
    expiryDate: Date;
    daysRemaining: number;
  }> {
    try {
      const now = new Date();
      const expiryDate = this.mockMode
        ? this.getMockIqamaExpiry(iqamaNumber)
        : new Date((await this.verifyIqama(iqamaNumber)).expiryDate);
      const daysRemaining = Math.floor(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        isExpired: now > expiryDate,
        expiryDate,
        daysRemaining: Math.max(0, daysRemaining),
      };
    } catch (error: any) {
      this.logger.error('Failed to check Iqama expiry', error);
      throw error;
    }
  }

  // ============================================
  // Ministry of Labor Integration
  // ============================================

  /**
   * Register employee contract with MOL
   * تسجيل عقد الموظف في مكتب العمل
   */
  async registerEmployeeContract(
    contract: MolEmployeeContract
  ): Promise<{ contractId: string; status: string }> {
    try {
      this.logger.info('Registering employee contract with MOL');

      if (this.mockMode) {
        return {
          contractId: `CONTRACT-${Date.now()}`,
          status: 'registered',
        };
      }

      const response = await this.molClient.post('/contracts/register', {
        iqamaNumber: contract.employeeIqama,
        establishmentId: contract.employerEstablishmentId,
        contractType: contract.contractType,
        jobTitle: contract.jobTitle,
        basicSalary: contract.basicSalary,
        housingAllowance: contract.housingAllowance,
        transportAllowance: contract.transportAllowance,
        startDate: contract.startDate,
        endDate: contract.endDate,
        workingHours: contract.workingHours,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to register contract with MOL', error);
      throw new Error(`MOL contract registration failed: ${error.message}`);
    }
  }

  /**
   * Update employee contract
   * تحديث عقد الموظف
   */
  async updateEmployeeContract(
    contractId: string,
    updates: Partial<MolEmployeeContract>
  ): Promise<{ success: boolean }> {
    try {
      this.logger.info(`Updating contract ${contractId} with MOL`);

      if (this.mockMode) {
        return { success: true };
      }

      const response = await this.molClient.put(`/contracts/${contractId}`, updates);
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to update contract', error);
      throw error;
    }
  }

  /**
   * Terminate employee contract
   * إنهاء عقد الموظف
   */
  async terminateContract(
    contractId: string,
    reason: string,
    terminationDate: Date
  ): Promise<{ success: boolean; referenceNumber: string }> {
    try {
      this.logger.info(`Terminating contract ${contractId}`);

      if (this.mockMode) {
        return {
          success: true,
          referenceNumber: `TERM-${Date.now()}`,
        };
      }

      const response = await this.molClient.post(`/contracts/${contractId}/terminate`, {
        reason,
        terminationDate,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to terminate contract', error);
      throw error;
    }
  }

  /**
   * Get establishment Nitaqat status
   * الحصول على حالة نطاقات المنشأة
   */
  async getNitaqatStatus(establishmentId: string): Promise<MolEstablishment> {
    try {
      if (this.mockMode) {
        return {
          establishmentId,
          establishmentName: 'شركة مثال',
          laborOfficeId: 'LOF123',
          unifiedNumber: 'UNIFIED123',
          crNumber: 'CR123456',
          nitaqatColor: 'green',
          saudiEmployees: 50,
          foreignEmployees: 50,
          saudizationRate: 50,
        };
      }

      const response = await this.molClient.get(`/establishments/${establishmentId}/nitaqat`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get Nitaqat status', error);
      throw error;
    }
  }

  /**
   * Submit Wage Protection System (WPS) file
   * تقديم ملف حماية الأجور
   */
  async submitWageProtection(
    payments: WageProtectionSystem[]
  ): Promise<{ referenceNumber: string; status: string }> {
    try {
      this.logger.info(`Submitting WPS file with ${payments.length} payments`);

      if (this.mockMode) {
        return {
          referenceNumber: `WPS-${Date.now()}`,
          status: 'accepted',
        };
      }

      const response = await this.molClient.post('/wps/submit', {
        payments,
        submissionDate: new Date(),
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to submit WPS file', error);
      throw error;
    }
  }

  // ============================================
  // GOSI Integration
  // ============================================

  /**
   * Register employee with GOSI
   * تسجيل الموظف في التأمينات الاجتماعية
   */
  async registerEmployeeWithGOSI(employee: {
    nationalId: string;
    fullName: string;
    dateOfBirth: Date;
    basicSalary: number;
    startDate: Date;
  }): Promise<GOSIRegistration> {
    try {
      this.logger.info(`Registering employee with GOSI: ${employee.nationalId}`);

      if (this.mockMode) {
        return {
          gosiNumber: `GOSI-${Date.now()}`,
          employeeId: employee.nationalId,
          nationalId: employee.nationalId,
          subscriberWage: employee.basicSalary,
          subscriptionStartDate: employee.startDate,
          subscriptionStatus: 'active',
          employerContribution: employee.basicSalary * 0.1175,
          employeeContribution: employee.basicSalary * 0.0975,
          lastContributionDate: new Date(),
        };
      }

      const response = await this.gosiClient.post('/register', {
        nationalId: employee.nationalId,
        fullName: employee.fullName,
        dateOfBirth: employee.dateOfBirth,
        subscriberWage: employee.basicSalary,
        startDate: employee.startDate,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to register with GOSI', error);
      throw error;
    }
  }

  /**
   * Update GOSI subscription
   * تحديث اشتراك التأمينات
   */
  async updateGOSISubscription(gosiNumber: string, newWage: number): Promise<{ success: boolean }> {
    try {
      if (this.mockMode) {
        return { success: true };
      }

      const response = await this.gosiClient.put(`/subscriptions/${gosiNumber}`, {
        subscriberWage: newWage,
        effectiveDate: new Date(),
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to update GOSI subscription', error);
      throw error;
    }
  }

  /**
   * Calculate GOSI contributions
   * حساب اشتراكات التأمينات
   */
  calculateGOSIContributions(
    basicSalary: number,
    isSaudi: boolean
  ): {
    employerContribution: number;
    employeeContribution: number;
    total: number;
  } {
    if (isSaudi) {
      // Saudi employees: 21.5% total (9.75% employer, 9.75% employee, 2% hazards)
      const employerContribution = basicSalary * 0.1175; // 9.75% + 2%
      const employeeContribution = basicSalary * 0.0975; // 9.75%

      return {
        employerContribution,
        employeeContribution,
        total: employerContribution + employeeContribution,
      };
    } else {
      // Foreign employees: 2% (employer only, for work injuries)
      return {
        employerContribution: basicSalary * 0.02,
        employeeContribution: 0,
        total: basicSalary * 0.02,
      };
    }
  }

  /**
   * Cancel GOSI subscription
   * إلغاء اشتراك التأمينات
   */
  async cancelGOSISubscription(
    gosiNumber: string,
    reason: string,
    effectiveDate: Date
  ): Promise<{ success: boolean; certificateUrl: string }> {
    try {
      if (this.mockMode) {
        return {
          success: true,
          certificateUrl: `https://gosi.gov.sa/certificates/${gosiNumber}`,
        };
      }

      const response = await this.gosiClient.post(`/subscriptions/${gosiNumber}/cancel`, {
        reason,
        effectiveDate,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to cancel GOSI subscription', error);
      throw error;
    }
  }

  // ============================================
  // Medical Insurance Integration
  // ============================================

  /**
   * Register medical insurance policy
   * تسجيل بوليصة التأمين الطبي
   */
  async registerMedicalInsurance(
    insurance: Omit<MedicalInsurance, 'policyNumber'>
  ): Promise<MedicalInsurance> {
    try {
      this.logger.info(`Registering medical insurance for employee: ${insurance.employeeId}`);

      if (this.mockMode) {
        return {
          policyNumber: `POL-${Date.now()}`,
          insuranceCompany: insurance.insuranceCompany,
          employeeId: insurance.employeeId,
          nationalId: insurance.nationalId,
          coverageType: insurance.coverageType,
          coverageAmount: insurance.coverageAmount,
          startDate: insurance.startDate,
          expiryDate: insurance.expiryDate,
          status: 'active',
          dependents: insurance.dependents,
          coPaymentPercentage: insurance.coPaymentPercentage,
        };
      }

      const response = await this.medicalInsuranceClient.post('/policies/register', {
        insuranceCompany: insurance.insuranceCompany,
        nationalId: insurance.nationalId,
        coverageType: insurance.coverageType,
        coverageAmount: insurance.coverageAmount,
        startDate: insurance.startDate,
        expiryDate: insurance.expiryDate,
        dependents: insurance.dependents,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to register medical insurance', error);
      throw error;
    }
  }

  /**
   * Renew medical insurance
   * تجديد التأمين الطبي
   */
  async renewMedicalInsurance(
    policyNumber: string,
    newExpiryDate: Date
  ): Promise<{ success: boolean; newPolicyNumber: string }> {
    try {
      if (this.mockMode) {
        return {
          success: true,
          newPolicyNumber: `POL-${Date.now()}`,
        };
      }

      const response = await this.medicalInsuranceClient.post(`/policies/${policyNumber}/renew`, {
        newExpiryDate,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to renew medical insurance', error);
      throw error;
    }
  }

  /**
   * Check medical insurance validity
   * التحقق من صلاحية التأمين الطبي
   */
  async checkMedicalInsuranceValidity(policyNumber: string): Promise<{
    isValid: boolean;
    expiryDate: Date;
    daysRemaining: number;
  }> {
    try {
      if (this.mockMode) {
        const expiryDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
        return {
          isValid: true,
          expiryDate,
          daysRemaining: 120,
        };
      }

      const response = await this.medicalInsuranceClient.get(`/policies/${policyNumber}/status`);
      const policy = response.data;

      const now = new Date();
      const expiryDate = new Date(policy.expiryDate);
      const daysRemaining = Math.floor(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        isValid: now < expiryDate && policy.status === 'active',
        expiryDate,
        daysRemaining: Math.max(0, daysRemaining),
      };
    } catch (error: any) {
      this.logger.error('Failed to check medical insurance validity', error);
      throw error;
    }
  }

  // ============================================
  // Visa & Exit Re-Entry Management
  // ============================================

  /**
   * Request Exit Re-Entry visa
   * طلب تأشيرة خروج وعودة
   */
  async requestExitReEntry(
    iqamaNumber: string,
    type: 'single' | 'multiple',
    duration: number // in days
  ): Promise<ExitReEntry> {
    try {
      this.logger.info(`Requesting ${type} Exit Re-Entry for: ${iqamaNumber}`);

      if (this.mockMode) {
        return {
          requestId: `ERE-${Date.now()}`,
          iqamaNumber,
          requestType: type,
          issueDate: new Date(),
          expiryDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
          status: 'active',
          remainingTrips: type === 'multiple' ? 3 : undefined,
        };
      }

      const response = await this.jawazatClient.post('/exit-reentry/request', {
        iqamaNumber,
        type,
        duration,
        requestDate: new Date(),
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to request Exit Re-Entry', error);
      throw error;
    }
  }

  /**
   * Check Exit Re-Entry status
   * التحقق من حالة الخروج والعودة
   */
  async checkExitReEntryStatus(requestId: string): Promise<ExitReEntry> {
    try {
      if (this.mockMode) {
        return {
          requestId,
          iqamaNumber: '2345678901',
          requestType: 'single',
          issueDate: new Date('2026-01-01'),
          expiryDate: new Date('2026-04-01'),
          status: 'active',
        };
      }

      const response = await this.jawazatClient.get(`/exit-reentry/${requestId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to check Exit Re-Entry status', error);
      throw error;
    }
  }

  /**
   * Request final exit
   * طلب خروج نهائي
   */
  async requestFinalExit(
    iqamaNumber: string,
    reason: string
  ): Promise<{ requestId: string; status: string }> {
    try {
      this.logger.info(`Requesting final exit for: ${iqamaNumber}`);

      if (this.mockMode) {
        return {
          requestId: `FINAL-${Date.now()}`,
          status: 'processing',
        };
      }

      const response = await this.jawazatClient.post('/final-exit/request', {
        iqamaNumber,
        reason,
        requestDate: new Date(),
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to request final exit', error);
      throw error;
    }
  }

  // ============================================
  // Validation Helpers
  // ============================================

  /**
   * Validate Saudi National ID format
   * التحقق من صيغة الهوية الوطنية
   */
  private validateNationalIdFormat(nationalId: string): boolean {
    // Must be 10 digits starting with 1
    const regex = /^1\d{9}$/;
    return regex.test(nationalId);
  }

  /**
   * Validate Iqama format
   * التحقق من صيغة الإقامة
   */
  private validateIqamaFormat(iqamaNumber: string): boolean {
    // Must be 10 digits starting with 2
    const regex = /^2\d{9}$/;
    return regex.test(iqamaNumber);
  }

  /**
   * Validate Saudi phone number
   * التحقق من رقم الجوال السعودي
   */
  validateSaudiPhone(phone: string): boolean {
    // Format: +966XXXXXXXXX or 05XXXXXXXX
    const regex = /^(\+9665|05)\d{8}$/;
    return regex.test(phone);
  }

  /**
   * Validate IBAN (Saudi bank account)
   * التحقق من رقم الآيبان
   */
  validateSaudiIBAN(iban: string): boolean {
    // Saudi IBAN: SA followed by 22 digits
    const regex = /^SA\d{22}$/;
    return regex.test(iban);
  }

  // ============================================
  // Compliance Checks
  // ============================================

  /**
   * Run comprehensive compliance check
   * فحص الامتثال الشامل
   */
  async runComplianceCheck(employeeData: {
    nationalId?: string;
    iqamaNumber?: string;
    contractId?: string;
    gosiNumber?: string;
    medicalInsurancePolicyNumber?: string;
  }): Promise<{
    compliant: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // Check Iqama validity
      if (employeeData.iqamaNumber) {
        const iqamaStatus = await this.checkIqamaExpiry(employeeData.iqamaNumber);
        if (iqamaStatus.isExpired) {
          issues.push('Iqama has expired');
        } else if (iqamaStatus.daysRemaining < 30) {
          warnings.push(`Iqama expires in ${iqamaStatus.daysRemaining} days`);
        }
      }

      // Check medical insurance
      if (employeeData.medicalInsurancePolicyNumber) {
        const insuranceStatus = await this.checkMedicalInsuranceValidity(
          employeeData.medicalInsurancePolicyNumber
        );
        if (!insuranceStatus.isValid) {
          issues.push('Medical insurance is not valid');
        } else if (insuranceStatus.daysRemaining < 30) {
          warnings.push(`Medical insurance expires in ${insuranceStatus.daysRemaining} days`);
        }
      }

      return {
        compliant: issues.length === 0,
        issues,
        warnings,
      };
    } catch (error: any) {
      this.logger.error('Compliance check failed', error);
      throw error;
    }
  }

  /**
   * Get employee status summary
   * ملخص حالة الموظف
   */
  async getEmployeeStatusSummary(employeeId: string): Promise<{
    iqamaValid: boolean;
    contractActive: boolean;
    gosiActive: boolean;
    insuranceValid: boolean;
    complianceScore: number;
  }> {
    // Implementation would fetch and aggregate all statuses
    return {
      iqamaValid: true,
      contractActive: true,
      gosiActive: true,
      insuranceValid: true,
      complianceScore: 100,
    };
  }

  // ============================================
  // Mock Helpers
  // ============================================

  private getMockIqamaExpiry(iqamaNumber: string): Date {
    const now = new Date();

    if (iqamaNumber.startsWith('299')) {
      return new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // expired 5 days ago
    }

    if (iqamaNumber.startsWith('288')) {
      return new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // expires in 5 days
    }

    return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // expires in 6 months
  }
}

export default new SaudiIntegrationService();
