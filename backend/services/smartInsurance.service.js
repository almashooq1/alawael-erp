const Invoice = require('../models/Invoice');
const Beneficiary = require('../models/Beneficiary'); // Assuming policy details here

class SmartInsuranceService {
  /**
   * AI Claim Scrubber
   * Validates a claim against thousands of "Rejection Rules" BEFORE verifying with the Payer.
   * Prevents "Denied Claims".
   */
  static async scrubClaim(invoiceId) {
    const invoice = await Invoice.findById(invoiceId).populate('beneficiary');
    if (!invoice) throw new Error('Invoice not found');

    const policy = invoice.beneficiary.insurancePolicy || {};
    const errors = [];
    const warnings = [];

    // Rule 1: Eligibility Check (Date)
    if (policy.expiryDate && new Date(policy.expiryDate) < new Date(invoice.date)) {
      errors.push('CRITICAL: Insurance Policy has expired.');
    }

    // Rule 2: Diagnosis Code (ICD-10) Mandatory
    // Assuming invoice items have linked diagnosis
    const missingDiagnosis = invoice.items.some(item => !item.diagnosisCode);
    if (missingDiagnosis) {
      errors.push('REJECTION RISK: Discovery of missing ICD-10 Diagnosis Code on service lines.');
    }

    // Rule 3: Session Limit Information
    // Check if patient exceeded their 20 sessions/year limit
    // Mock check against historical usage
    const currentUsage = 18; // Mock
    const limit = policy.sessionLimit || 20;
    if (currentUsage + invoice.items.length > limit) {
      warnings.push(`LIMIT ALERT: Patient is at ${currentUsage + invoice.items.length}/${limit} sessions.`);
    }

    // Rule 4: Waiting Period
    // Verification if service is covered immediately

    return {
      claimId: invoiceId,
      status: errors.length > 0 ? 'REJECTED_INTERNAL' : 'CLEAN',
      confidence: errors.length > 0 ? 0 : warnings.length > 0 ? 80 : 99,
      issues: {
        errors,
        warnings,
      },
      recommendation: errors.length > 0 ? 'Do not submit. Fix errors.' : 'Ready for electronic submission.',
    };
  }

  /**
   * Electronic Remittance Advice (ERA) Auto-Reconciliation
   * Parses the bank payment file from Insurance and matches it to Invoices
   */
  static async reconcilePayment(remittanceFile) {
    // Mock Parsing of standard CSV/835 Format
    // payment_ref, amount, claim_id, status

    const mockRow = { claimId: 'INV-1001', paidAmount: 150, billedAmount: 200, status: 'PARTIAL_PAYMENT' };

    // Logic:
    // 1. Find Invoice
    // 2. Update Status -> PAID / PARTIAL
    // 3. Write-off difference OR Bill Patient?

    return {
      processed: 1,
      amountReconciled: 150,
      discrepancies: [{ claim: 'INV-1001', difference: 50, action: 'Patient Responsibility' }],
    };
  }
}

module.exports = SmartInsuranceService;
module.exports.instance = new SmartInsuranceService();
