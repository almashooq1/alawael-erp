const crypto = require('crypto');
const Invoice = require('../../models/finance/Invoice');
const JournalEntry = require('../../models/finance/JournalEntry');
const Payment = require('../../models/finance/Payment');
const InsuranceClaim = require('../../models/finance/InsuranceClaim');

// ===== خدمة المحاسبة والقيود اليومية =====
class AccountingService {
  /**
   * إنشاء قيد يومي (double-entry)
   */
  static async createJournalEntry(data) {
    const entry = new JournalEntry(data);
    if (!entry.is_balanced)
      throw new Error('القيد غير متوازن: إجمالي المدين لا يساوي إجمالي الدائن');
    return entry.save();
  }

  /**
   * قيد محاسبي للفاتورة
   * مدين: حسابات قبض (1200) ← دائن: إيرادات الخدمات (4100) + ضريبة VAT (2300)
   */
  static async createInvoiceEntry(invoice) {
    return AccountingService.createJournalEntry({
      entry_type: 'invoice',
      description_ar: `قيد فاتورة رقم ${invoice.invoice_number}`,
      reference_type: 'Invoice',
      reference_id: invoice._id,
      reference_number: invoice.invoice_number,
      branch_id: invoice.branch_id,
      lines: [
        {
          account_code: '1200',
          description: 'حسابات قبض - مستفيدين',
          debit: invoice.total_amount,
          credit: 0,
        },
        {
          account_code: '4100',
          description: 'إيرادات خدمات التأهيل',
          debit: 0,
          credit: invoice.taxable_amount,
        },
        {
          account_code: '2300',
          description: 'ضريبة القيمة المضافة المستحقة',
          debit: 0,
          credit: invoice.vat_amount,
        },
      ],
      status: 'posted',
      created_by: invoice.created_by,
    });
  }

  /**
   * قيد محاسبي للراتب
   * مدين: مصروف الرواتب (5100) ← دائن: نقدية/بنك (1100)، GOSI (2400)، ساند (2401)
   */
  static async createPayrollEntry(payroll) {
    const lines = [
      {
        account_code: '5100',
        description: `مصروف رواتب - ${payroll.month}/${payroll.year}`,
        debit: payroll.gross_salary,
        credit: 0,
      },
      {
        account_code: '1100',
        description: 'النقدية - المدفوع للموظف',
        debit: 0,
        credit: payroll.net_salary,
      },
    ];
    if (payroll.gosi_employee > 0) {
      lines.push({
        account_code: '2400',
        description: 'GOSI مستقطع',
        debit: 0,
        credit: payroll.gosi_employee,
      });
    }
    if (payroll.saned_deduction > 0) {
      lines.push({
        account_code: '2401',
        description: 'ساند مستقطع',
        debit: 0,
        credit: payroll.saned_deduction,
      });
    }
    if (payroll.other_deductions > 0) {
      lines.push({
        account_code: '2402',
        description: 'خصومات أخرى',
        debit: 0,
        credit: payroll.other_deductions,
      });
    }
    return AccountingService.createJournalEntry({
      entry_type: 'payroll',
      description_ar: `قيد رواتب شهر ${payroll.month}/${payroll.year}`,
      reference_type: 'PayrollRecord',
      reference_id: payroll._id,
      branch_id: payroll.branch_id,
      lines,
      status: 'posted',
    });
  }
}

// ===== خدمة ZATCA Phase 2 =====
class ZatcaService {
  /**
   * توليد TLV QR code حسب مواصفات ZATCA
   * الحقول: 1=اسم البائع، 2=رقم الضريبي، 3=تاريخ الفاتورة، 4=المجموع، 5=VAT
   */
  static generateQrTLV(sellerName, vatNumber, invoiceDate, totalAmount, vatAmount) {
    const encode = (tag, value) => {
      const valueBytes = Buffer.from(value, 'utf8');
      return Buffer.concat([Buffer.from([tag]), Buffer.from([valueBytes.length]), valueBytes]);
    };

    const tlv = Buffer.concat([
      encode(1, sellerName),
      encode(2, vatNumber),
      encode(3, invoiceDate.toISOString()),
      encode(4, totalAmount.toFixed(2)),
      encode(5, vatAmount.toFixed(2)),
    ]);

    return tlv.toString('base64');
  }

  /**
   * توليد XML فاتورة UBL 2.1 متوافقة مع ZATCA
   */
  static generateInvoiceXml(invoice, seller) {
    const date = invoice.invoice_date.toISOString().split('T')[0];
    const time = invoice.invoice_date.toISOString().split('T')[1].replace('Z', '');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${invoice.invoice_number}</cbc:ID>
  <cbc:UUID>${invoice.uuid}</cbc:UUID>
  <cbc:IssueDate>${date}</cbc:IssueDate>
  <cbc:IssueTime>${time}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${invoice.invoice_subtype === 'b2b' ? '0200000' : '0100000'}">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${seller.name_ar}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${seller.vat_number}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${invoice.taxable_amount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${invoice.taxable_amount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${invoice.total_amount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${invoice.total_amount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
  }

  /**
   * حساب hash SHA-256 للفاتورة (للتسلسل)
   */
  static generateInvoiceHash(xmlContent) {
    return crypto.createHash('sha256').update(xmlContent, 'utf8').digest('base64');
  }

  /**
   * إعداد الفاتورة لإرسالها لـ ZATCA
   */
  static async prepareForZatca(invoiceId, seller) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error('الفاتورة غير موجودة');

    // الحصول على hash الفاتورة السابقة (للتسلسل)
    const prevInvoice = await Invoice.findOne({
      branch_id: invoice.branch_id,
      invoice_counter: invoice.invoice_counter - 1,
    });
    const prevHash =
      prevInvoice?.zatca_hash ||
      'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI4NjcyMzk3NzU5NTdmMDEzNw==';

    const xml = ZatcaService.generateInvoiceXml(invoice, seller);
    const hash = ZatcaService.generateInvoiceHash(xml);
    const qr = ZatcaService.generateQrTLV(
      seller.name_ar,
      seller.vat_number,
      invoice.invoice_date,
      invoice.total_amount,
      invoice.vat_amount
    );

    await Invoice.findByIdAndUpdate(invoiceId, {
      zatca_xml: xml,
      zatca_hash: hash,
      zatca_qr: qr,
      previous_invoice_hash: prevHash,
    });

    return { xml, hash, qr };
  }
}

// ===== خدمة المطالبات التأمينية =====
class InsuranceClaimService {
  static async submitClaim(claimId) {
    const claim = await InsuranceClaim.findById(claimId).populate(
      'beneficiary_id insurance_company_id'
    );
    if (!claim) throw new Error('المطالبة غير موجودة');
    if (claim.status !== 'draft') throw new Error('المطالبة تم تقديمها مسبقاً');

    claim.status = 'submitted';
    claim.submission_date = new Date();
    claim.submitted_at = new Date();
    return claim.save();
  }

  static async processClaimResponse(claimId, approvedItems, totalApproved, status) {
    const claim = await InsuranceClaim.findById(claimId);
    if (!claim) throw new Error('المطالبة غير موجودة');

    // تحديث بنود المطالبة
    if (approvedItems && Array.isArray(approvedItems)) {
      claim.items = claim.items.map(item => {
        const approved = approvedItems.find(a => a.service_code === item.service_code);
        if (approved) {
          item.approved_amount = approved.approved_amount;
          item.status = approved.approved_amount >= item.claimed_amount ? 'approved' : 'partial';
        }
        return item;
      });
    }

    claim.total_approved =
      totalApproved || claim.items.reduce((s, i) => s + (i.approved_amount || 0), 0);
    claim.status =
      status || (claim.total_approved >= claim.total_claimed ? 'approved' : 'partially_approved');
    return claim.save();
  }

  static async checkEligibility(beneficiaryId, serviceType) {
    // فحص أساسي للأهلية - يمكن توسيعه ليتصل بـ NPHIES
    const recentClaim = await InsuranceClaim.findOne({
      beneficiary_id: beneficiaryId,
      claim_type: serviceType,
      status: { $in: ['submitted', 'under_review'] },
    });
    return {
      eligible: !recentClaim,
      reason: recentClaim ? 'يوجد مطالبة معلقة لنفس الخدمة' : null,
    };
  }
}

module.exports = { AccountingService, ZatcaService, InsuranceClaimService };
