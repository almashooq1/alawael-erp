/**
 * Unit Tests — governmentCalculations.service.js
 * Pure business logic — NO mocks needed
 */
'use strict';

const {
  GOV_CONSTANTS,
  calculateVAT,
  calculateInvoiceTotals,
  encodeTLVForQR,
  validateVATNumber,
  generateInvoiceUUID,
  determineZATCAInvoiceType,
  calculateRehabServiceVAT,
  calculateGOSIContributions,
  calculateOrganizationGOSI,
  calculateSaudizationRate,
  calculateOrganizationSaudization,
  checkWPSCompliance,
  calculateWPSDueDate,
  checkNPHIESEligibility,
  calculatePatientShare,
  checkPriorAuthRequired,
  calculateInsuranceClaim,
  validateSaudiIBAN,
  validateNationalId,
  calculateVisaExpiry,
} = require('../../services/integrations/governmentCalculations.service');

// ═══════════════ ZATCA ═══════════════

describe('calculateVAT', () => {
  it('returns zeros for null/negative subtotal', () => {
    expect(calculateVAT(null).vatAmount).toBe(0);
    expect(calculateVAT(-100).vatAmount).toBe(0);
  });

  it('calculates standard 15% VAT', () => {
    const r = calculateVAT(1000);
    expect(r.vatAmount).toBe(150);
    expect(r.totalAmount).toBe(1150);
    expect(r.vatRate).toBe(15);
  });

  it('returns 0 VAT for exempt', () => {
    const r = calculateVAT(1000, 'exempt');
    expect(r.vatAmount).toBe(0);
    expect(r.totalAmount).toBe(1000);
  });

  it('returns 0 VAT for zero_rated', () => {
    const r = calculateVAT(1000, 'zero_rated');
    expect(r.vatAmount).toBe(0);
  });
});

describe('calculateInvoiceTotals', () => {
  it('returns zeros for empty items', () => {
    const r = calculateInvoiceTotals([]);
    expect(r.subtotal).toBe(0);
    expect(r.vatAmount).toBe(0);
  });

  it('sums items with mixed VAT categories', () => {
    const items = [
      { unitPrice: 100, quantity: 2, vatCategory: 'standard' },
      { unitPrice: 50, quantity: 1, vatCategory: 'exempt' },
    ];
    const r = calculateInvoiceTotals(items);
    expect(r.taxableAmount).toBe(200);
    expect(r.exemptAmount).toBe(50);
    expect(r.vatAmount).toBe(30); // 200 * 0.15
    expect(r.totalAmount).toBe(280); // 200+50+30
  });

  it('applies percentage discount', () => {
    const items = [
      {
        unitPrice: 100,
        quantity: 1,
        discount: 10,
        discountType: 'percentage',
        vatCategory: 'standard',
      },
    ];
    const r = calculateInvoiceTotals(items);
    expect(r.taxableAmount).toBe(90);
  });
});

describe('encodeTLVForQR', () => {
  it('returns empty string for null', () => {
    expect(encodeTLVForQR(null)).toBe('');
  });

  it('returns base64 string for valid invoice data', () => {
    const data = {
      sellerName: 'مركز AlAwael',
      vatNumber: '300000000000003',
      timestamp: '2025-01-01T12:00:00Z',
      totalAmount: 1150,
      vatAmount: 150,
    };
    const r = encodeTLVForQR(data);
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });
});

describe('validateVATNumber', () => {
  it('rejects null/empty', () => {
    expect(validateVATNumber(null).isValid).toBe(false);
    expect(validateVATNumber('').isValid).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(validateVATNumber('12345').isValid).toBe(false);
  });

  it('rejects if not starting with 3', () => {
    expect(validateVATNumber('100000000000003').isValid).toBe(false);
  });

  it('rejects if not ending with 3', () => {
    expect(validateVATNumber('300000000000001').isValid).toBe(false);
  });

  it('accepts valid 15-digit starting and ending with 3', () => {
    const r = validateVATNumber('300000000000003');
    expect(r.isValid).toBe(true);
    expect(r.formatted).toBe('300000000000003');
  });
});

describe('generateInvoiceUUID', () => {
  it('returns UUID v4 format', () => {
    const uuid = generateInvoiceUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('determineZATCAInvoiceType', () => {
  it('returns simplified for B2C', () => {
    const r = determineZATCAInvoiceType(500, 'B2C');
    expect(r.invoiceType).toBe('simplified');
    expect(r.clearanceRequired).toBe(false);
  });

  it('returns standard with clearance for B2B >= 1000', () => {
    const r = determineZATCAInvoiceType(2000, 'B2B');
    expect(r.invoiceType).toBe('standard');
    expect(r.clearanceRequired).toBe(true);
    expect(r.processingMode).toBe('clearance');
  });

  it('B2B < 1000 does not require clearance', () => {
    const r = determineZATCAInvoiceType(500, 'B2B');
    expect(r.clearanceRequired).toBe(false);
  });
});

describe('calculateRehabServiceVAT', () => {
  it('applies standard VAT for rehab services', () => {
    const r = calculateRehabServiceVAT('physiotherapy', 1000);
    expect(r.vatAmount).toBe(150);
  });

  it('applies exempt for blood_transfusion', () => {
    const r = calculateRehabServiceVAT('blood_transfusion', 1000);
    expect(r.vatAmount).toBe(0);
  });
});

// ═══════════════ GOSI ═══════════════

describe('calculateGOSIContributions', () => {
  it('returns zeros for null salary', () => {
    const r = calculateGOSIContributions(null);
    expect(r.totalEmployeeDeduction).toBe(0);
    expect(r.totalEmployerCost).toBe(0);
  });

  it('calculates Saudi employee contributions', () => {
    const r = calculateGOSIContributions(10000, 2500, true);
    expect(r.gosiBase).toBe(12500);
    expect(r.employeeShare).toBe(1125); // 12500 * 0.09
    expect(r.employerShare).toBe(1125);
    expect(r.occupationalHazard).toBe(250); // 12500 * 0.02
    expect(r.sanedEmployee).toBe(93.75); // 12500 * 0.0075
    expect(r.totalEmployeeDeduction).toBe(1218.75);
  });

  it('caps salary at 45000', () => {
    const r = calculateGOSIContributions(50000, 10000, true);
    expect(r.gosiBase).toBe(45000);
  });

  it('non-Saudi only pays occupational hazard', () => {
    const r = calculateGOSIContributions(10000, 0, false);
    expect(r.employeeShare).toBe(0);
    expect(r.employerShare).toBe(0);
    expect(r.totalEmployeeDeduction).toBe(0);
    expect(r.totalEmployerCost).toBe(r.occupationalHazard);
  });
});

describe('calculateOrganizationGOSI', () => {
  it('returns zeros for empty', () => {
    const r = calculateOrganizationGOSI([]);
    expect(r.totalEmployees).toBe(0);
    expect(r.totalGOSI).toBe(0);
  });

  it('sums contributions for mix of Saudi and non-Saudi', () => {
    const employees = [
      { id: 'e1', basicSalary: 10000, housingAllowance: 2500, isSaudi: true },
      { id: 'e2', basicSalary: 8000, housingAllowance: 0, isSaudi: false },
    ];
    const r = calculateOrganizationGOSI(employees);
    expect(r.totalEmployees).toBe(2);
    expect(r.saudiCount).toBe(1);
    expect(r.nonSaudiCount).toBe(1);
    expect(r.totalGOSI).toBeGreaterThan(0);
    expect(r.breakdown).toHaveLength(2);
  });
});

// ═══════════════ Nitaqat ═══════════════

describe('calculateSaudizationRate', () => {
  it('returns red for 0 total', () => {
    const r = calculateSaudizationRate(0, 0);
    expect(r.band).toBe('red');
    expect(r.isCompliant).toBe(false);
  });

  it('calculates correct rate and band', () => {
    const r = calculateSaudizationRate(35, 100);
    expect(r.rate).toBe(35);
    expect(r.band).toBe('green_high');
    expect(r.isCompliant).toBe(true);
  });

  it('platinum for >= 40%', () => {
    expect(calculateSaudizationRate(50, 100).band).toBe('platinum');
  });

  it('yellow for 20-24%', () => {
    expect(calculateSaudizationRate(22, 100).band).toBe('yellow');
  });

  it('red for < 20%', () => {
    expect(calculateSaudizationRate(10, 100).band).toBe('red');
  });

  it('computes requiredToAdd for non-compliant', () => {
    const r = calculateSaudizationRate(5, 100);
    expect(r.requiredToAdd).toBeGreaterThan(0);
  });
});

describe('calculateOrganizationSaudization', () => {
  it('handles empty branches', () => {
    const r = calculateOrganizationSaudization([]);
    expect(r.branches).toEqual([]);
  });

  it('computes per-branch and overall rates', () => {
    const branches = [
      { id: 'b1', name: 'A', saudiCount: 10, totalCount: 30 },
      { id: 'b2', name: 'B', saudiCount: 20, totalCount: 50 },
    ];
    const r = calculateOrganizationSaudization(branches);
    expect(r.branches).toHaveLength(2);
    expect(r.overall.rate).toBeCloseTo(37.5, 1);
  });
});

// ═══════════════ WPS ═══════════════

describe('checkWPSCompliance', () => {
  it('returns 100% for empty', () => {
    const r = checkWPSCompliance([]);
    expect(r.complianceRate).toBe(100);
    expect(r.isCompliant).toBe(true);
  });

  it('detects violations for unpaid records', () => {
    const records = [
      { employeeId: 'e1', payrollMonth: '2025-01', paidAt: null, dueDate: '2025-02-10' },
    ];
    const r = checkWPSCompliance(records);
    expect(r.violationCount).toBe(1);
    expect(r.violations[0].severity).toBe('critical');
  });

  it('detects on-time and delayed payments', () => {
    const records = [
      { employeeId: 'e1', paidAt: '2025-02-05', dueDate: '2025-02-10' },
      { employeeId: 'e2', paidAt: '2025-02-25', dueDate: '2025-02-10' },
    ];
    const r = checkWPSCompliance(records);
    expect(r.compliantCount).toBe(1);
    expect(r.violationCount).toBe(1);
  });
});

describe('calculateWPSDueDate', () => {
  it('returns nulls for missing input', () => {
    const r = calculateWPSDueDate(null);
    expect(r.dueDate).toBeNull();
  });

  it('calculates due date as 10th of next month', () => {
    const r = calculateWPSDueDate('2025-01-15');
    expect(r.dueDate).toBe('2025-02-10');
    expect(r.warningDate).toBe('2025-02-07');
  });
});

// ═══════════════ NPHIES ═══════════════

describe('checkNPHIESEligibility', () => {
  it('returns not eligible for null', () => {
    expect(checkNPHIESEligibility(null, null).isEligible).toBe(false);
  });

  it('rejects expired policy', () => {
    const r = checkNPHIESEligibility({ id: 'p1' }, { expiryDate: '2020-01-01' });
    expect(r.isEligible).toBe(false);
    expect(r.reason).toContain('منتهية');
  });

  it('rejects when sessions exceeded', () => {
    const r = checkNPHIESEligibility(
      { id: 'p1' },
      { expiryDate: '2030-01-01', usedSessions: 50, annualSessionLimit: 50 }
    );
    expect(r.isEligible).toBe(false);
  });

  it('returns eligible with coverage details', () => {
    const r = checkNPHIESEligibility(
      { id: 'p1' },
      {
        expiryDate: '2030-01-01',
        usedSessions: 10,
        annualSessionLimit: 50,
        coveragePercentage: 80,
        companyName: 'Bupa',
        policyNumber: 'POL1',
        memberId: 'M1',
      }
    );
    expect(r.isEligible).toBe(true);
    expect(r.coverageDetails.insuranceCompany).toBe('Bupa');
    expect(r.coverageDetails.remainingSessions).toBe(40);
  });
});

describe('calculatePatientShare', () => {
  it('returns 0 for zero fee', () => {
    expect(calculatePatientShare(0, {}).patientShare).toBe(0);
  });

  it('full amount when no coverage', () => {
    const r = calculatePatientShare(500, null);
    expect(r.patientShare).toBe(500);
    expect(r.insuranceShare).toBe(0);
  });

  it('splits based on coverage %', () => {
    const r = calculatePatientShare(500, { coveragePercentage: 80, deductible: 0, copayment: 0 });
    expect(r.insuranceShare).toBe(400);
    expect(r.patientShare).toBe(100);
  });

  it('applies deductible first', () => {
    const r = calculatePatientShare(500, { coveragePercentage: 80, deductible: 50, copayment: 0 });
    // after deductible: 450, insurance covers 80% = 360
    expect(r.insuranceShare).toBe(360);
  });
});

describe('checkPriorAuthRequired', () => {
  it('requires auth for rehabilitation services', () => {
    const r = checkPriorAuthRequired('rehabilitation', 5);
    expect(r.requiresPriorAuth).toBe(true);
  });

  it('requires auth when sessions exceed threshold', () => {
    const r = checkPriorAuthRequired('other_service', 15, { priorAuthThreshold: 10 });
    expect(r.requiresPriorAuth).toBe(true);
  });

  it('no auth needed for small non-rehab service', () => {
    const r = checkPriorAuthRequired('consultation', 3);
    expect(r.requiresPriorAuth).toBe(false);
  });
});

describe('calculateInsuranceClaim', () => {
  it('returns zeros for empty sessions', () => {
    const r = calculateInsuranceClaim([], {});
    expect(r.totalFees).toBe(0);
  });

  it('calculates claim amounts', () => {
    const sessions = [{ fee: 300 }, { fee: 500 }];
    const coverage = { coveragePercentage: 80, deductible: 0, copayment: 0 };
    const r = calculateInsuranceClaim(sessions, coverage);
    expect(r.totalFees).toBe(800);
    expect(r.claimAmount).toBe(640);
    expect(r.patientTotal).toBe(160);
    expect(r.sessionCount).toBe(2);
  });
});

// ═══════════════ Validators ═══════════════

describe('validateSaudiIBAN', () => {
  it('rejects null', () => {
    expect(validateSaudiIBAN(null).isValid).toBe(false);
  });

  it('rejects non-SA prefix', () => {
    expect(validateSaudiIBAN('DE1234567890123456789012').isValid).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(validateSaudiIBAN('SA12345').isValid).toBe(false);
  });

  it('accepts valid SA + 22 digits', () => {
    const r = validateSaudiIBAN('SA 1234567890123456789012');
    expect(r.isValid).toBe(true);
    expect(r.formatted).toBe('SA1234567890123456789012');
  });
});

describe('validateNationalId', () => {
  it('rejects null', () => {
    expect(validateNationalId(null).isValid).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(validateNationalId('12345').isValid).toBe(false);
  });

  it('detects national ID (starts with 1)', () => {
    const r = validateNationalId('1234567890');
    expect(r.isValid).toBe(true);
    expect(r.type).toBe('national');
  });

  it('detects iqama (starts with 2)', () => {
    const r = validateNationalId('2345678901');
    expect(r.isValid).toBe(true);
    expect(r.type).toBe('iqama');
  });

  it('rejects IDs starting with other digits', () => {
    expect(validateNationalId('3234567890').isValid).toBe(false);
  });
});

describe('calculateVisaExpiry', () => {
  it('returns nulls for missing date', () => {
    const r = calculateVisaExpiry(null);
    expect(r.expiryDate).toBeNull();
  });

  it('calculates 2-year expiry for work visa', () => {
    const r = calculateVisaExpiry('2024-01-15', 'work');
    expect(r.expiryDate).toBe('2026-01-15');
  });

  it('calculates 1-year expiry for dependent visa', () => {
    const r = calculateVisaExpiry('2024-01-15', 'dependent');
    expect(r.expiryDate).toBe('2025-01-15');
  });

  it('flags expired visas', () => {
    const r = calculateVisaExpiry('2020-01-01', 'work');
    expect(r.isExpired).toBe(true);
    expect(r.urgency).toBe('expired');
  });
});

// ═══════════════ Constants ═══════════════

describe('GOV_CONSTANTS', () => {
  it('exports expected structure', () => {
    expect(GOV_CONSTANTS.ZATCA.VAT_RATE).toBe(0.15);
    expect(GOV_CONSTANTS.GOSI.SALARY_CAP).toBe(45000);
    expect(GOV_CONSTANTS.NITAQAT.PLATINUM_MIN).toBe(40);
    expect(GOV_CONSTANTS.WPS.MAX_DELAY_DAYS).toBe(10);
    expect(GOV_CONSTANTS.NPHIES.PRIOR_AUTH_REQUIRED_SERVICES).toContain('rehabilitation');
  });
});
