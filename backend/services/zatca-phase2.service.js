/**
 * ZATCA Phase 2 Service — خدمة هيئة الزكاة والضريبة والجمارك (المرحلة الثانية)
 * الفوترة الإلكترونية - Integration Phase - منصة فاتورة FATOORA
 *
 * يدعم:
 * - UBL 2.1 XML (كامل مع كل الحقول الإلزامية)
 * - تشفير TLV لرمز QR (Tags 1-9)
 * - سلسلة PIH (Previous Invoice Hash)
 * - عداد ICV (Invoice Counter Value)
 * - Onboarding (Compliance CSID → Production CSID)
 * - Clearance (B2B) و Reporting (B2C)
 * - إعادة المحاولة للأخطاء المؤقتة
 */
'use strict';

const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// ─── نماذج قاعدة البيانات ──────────────────────────────────────────────────
let ZatcaCredential, ZatcaInvoiceLog;
try {
  ZatcaCredential = require('../models/zatca/ZatcaCredential');
  ZatcaInvoiceLog = require('../models/zatca/ZatcaInvoiceLog');
} catch {
  ZatcaCredential = null;
  ZatcaInvoiceLog = null;
}

// ─── الإعدادات الأساسية ────────────────────────────────────────────────────
const ZATCA_ENV = process.env.ZATCA_ENV || 'sandbox';

const API_URLS = {
  sandbox: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal',
  simulation: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation',
  production: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core',
};

const BASE_URL = API_URLS[ZATCA_ENV] || API_URLS.sandbox;

// ─── رموز CPT لمراكز التأهيل ───────────────────────────────────────────────
const REHAB_CPT_CODES = {
  97110: { desc: 'Therapeutic Exercises', descAr: 'تمارين علاجية', specialty: 'PT', unit: 15 },
  97530: { desc: 'Therapeutic Activities', descAr: 'أنشطة علاجية', specialty: 'OT', unit: 15 },
  97112: {
    desc: 'Neuromuscular Re-education',
    descAr: 'إعادة تأهيل عصبي عضلي',
    specialty: 'PT/OT',
    unit: 15,
  },
  92507: { desc: 'Speech Therapy Individual', descAr: 'علاج نطق فردي', specialty: 'SLP' },
  92508: { desc: 'Speech Therapy Group', descAr: 'علاج نطق جماعي', specialty: 'SLP' },
  97153: {
    desc: 'ABA Treatment by Protocol',
    descAr: 'تحليل سلوك تطبيقي',
    specialty: 'BA',
    unit: 15,
  },
  97155: {
    desc: 'ABA Protocol Modification',
    descAr: 'تعديل بروتوكول سلوكي',
    specialty: 'BCBA',
    unit: 15,
  },
  97156: { desc: 'ABA Family Guidance', descAr: 'توجيه أسري - ABA', specialty: 'BA', unit: 15 },
  96130: {
    desc: 'Psychological Testing - 1st Hour',
    descAr: 'تقييم نفسي - أول ساعة',
    specialty: 'PSY',
  },
  96131: {
    desc: 'Psychological Testing - Each Add. Hour',
    descAr: 'تقييم نفسي - ساعة إضافية',
    specialty: 'PSY',
  },
  97161: {
    desc: 'PT Evaluation - Low Complexity',
    descAr: 'تقييم علاج طبيعي - منخفض',
    specialty: 'PT',
  },
  97162: {
    desc: 'PT Evaluation - Moderate Complexity',
    descAr: 'تقييم علاج طبيعي - متوسط',
    specialty: 'PT',
  },
  97163: {
    desc: 'PT Evaluation - High Complexity',
    descAr: 'تقييم علاج طبيعي - عالي',
    specialty: 'PT',
  },
  97165: {
    desc: 'OT Evaluation - Low Complexity',
    descAr: 'تقييم علاج وظيفي - منخفض',
    specialty: 'OT',
  },
  97166: {
    desc: 'OT Evaluation - Moderate Complexity',
    descAr: 'تقييم علاج وظيفي - متوسط',
    specialty: 'OT',
  },
  97167: {
    desc: 'OT Evaluation - High Complexity',
    descAr: 'تقييم علاج وظيفي - عالي',
    specialty: 'OT',
  },
  96112: { desc: 'Developmental Testing', descAr: 'تقييم نمائي', specialty: 'DEV' },
};

// ═══════════════════════════════════════════════════════════════════════════
// خدمة ZATCA الرئيسية
// ═══════════════════════════════════════════════════════════════════════════
class ZatcaPhase2Service {
  constructor() {
    // Credentials من env (للاستخدام البسيط بدون DB)
    this.csid = process.env.ZATCA_CSID || '';
    this.secret = process.env.ZATCA_SECRET || '';
    this.privateKey = process.env.ZATCA_PRIVATE_KEY || '';
    this.certificate = process.env.ZATCA_CERTIFICATE || '';
  }

  // =========================================================================
  // 1. ONBOARDING — الحصول على CSID
  // =========================================================================

  /**
   * إنشاء مفتاح ECDSA secp256k1 (محاكاة - يستخدم P-256 كبديل)
   */
  generateEcdsaKeyPair() {
    try {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'prime256v1', // P-256 بديل secp256k1
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      return { privateKey, publicKey };
    } catch (err) {
      logger.error('[ZATCA] generateEcdsaKeyPair error:', err.message);
      throw new Error('فشل توليد مفاتيح ECDSA: ' + err.message);
    }
  }

  /**
   * إنشاء CSR لـ ZATCA Onboarding
   */
  buildCsrData(orgData) {
    return {
      commonName: orgData.organizationName || 'Rehab Center',
      organizationIdentifier: orgData.vatNumber || '',
      organizationUnit: orgData.branchCode || 'Branch-01',
      organizationName: orgData.organizationName || 'Rehab Center',
      countryName: 'SA',
      invoiceType: '1100', // Standard + Simplified
      address: orgData.street || '',
      businessCategory: orgData.businessCategory || 'Healthcare',
    };
  }

  /**
   * تنفيذ Onboarding للحصول على Compliance CSID
   */
  async performOnboarding(branchId, orgData, otp) {
    if (!ZatcaCredential) {
      return { success: false, error: 'نموذج ZatcaCredential غير متوفر' };
    }

    try {
      const keyPair = this.generateEcdsaKeyPair();
      const csrData = this.buildCsrData(orgData);

      // إرسال CSR إلى ZATCA
      const csrBase64 = Buffer.from(JSON.stringify(csrData)).toString('base64');

      const response = await axios.post(
        `${BASE_URL}/compliance`,
        { csr: csrBase64 },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept-Version': 'V2',
            OTP: otp,
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      // حفظ أو تحديث بيانات الاعتماد في DB
      let credential = await ZatcaCredential.findOne({ branchId });
      if (!credential) {
        credential = new ZatcaCredential({ branchId, branchCode: orgData.branchCode || 'BR01' });
      }

      credential.csr = csrBase64;
      credential.privateKey = keyPair.privateKey;
      credential.publicKey = keyPair.publicKey;
      credential.complianceCsid = data.binarySecurityToken;
      credential.binarySecurityToken = data.binarySecurityToken;
      credential.secret = data.secret;
      credential.complianceRequestId = data.requestID;
      credential.onboardedAt = new Date();
      credential.organizationName = orgData.organizationName;
      credential.vatNumber = orgData.vatNumber;
      credential.crNumber = orgData.crNumber;
      Object.assign(credential, orgData);

      await credential.save();

      logger.info('[ZATCA] Onboarding: Compliance CSID obtained', { branchId });
      return {
        success: true,
        requestId: data.requestID,
        message: 'تم الحصول على Compliance CSID بنجاح',
      };
    } catch (err) {
      logger.error('[ZATCA] performOnboarding error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  /**
   * الحصول على Production CSID بعد نجاح Compliance Check
   */
  async obtainProductionCsid(branchId) {
    if (!ZatcaCredential) {
      return { success: false, error: 'نموذج ZatcaCredential غير متوفر' };
    }

    try {
      const credential = await ZatcaCredential.findOne({ branchId });
      if (!credential || !credential.complianceCsid) {
        return { success: false, error: 'يجب الحصول على Compliance CSID أولاً' };
      }

      const auth = `Basic ${Buffer.from(`${credential.complianceCsid}:${credential.secret}`).toString('base64')}`;

      const response = await axios.post(
        `${BASE_URL}/production/csids`,
        { compliance_request_id: credential.complianceRequestId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept-Version': 'V2',
            Authorization: auth,
          },
          timeout: 30000,
        }
      );

      const data = response.data;

      credential.productionCsid = data.binarySecurityToken;
      credential.binarySecurityToken = data.binarySecurityToken;
      credential.secret = data.secret;
      credential.productionRequestId = data.requestID;
      credential.isProduction = true;
      credential.apiBaseUrl = API_URLS.production;
      if (data.expiresAt) {
        credential.csidExpiresAt = new Date(data.expiresAt);
      }
      await credential.save();

      logger.info('[ZATCA] Production CSID obtained', { branchId });
      return { success: true, message: 'تم الحصول على Production CSID بنجاح' };
    } catch (err) {
      logger.error('[ZATCA] obtainProductionCsid error:', err.response?.data || err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  // =========================================================================
  // 2. بناء UBL 2.1 XML الكامل
  // =========================================================================

  /**
   * بناء XML الفاتورة وفق مواصفات ZATCA UBL 2.1 الكاملة
   */
  buildInvoiceXml(invoiceData) {
    const {
      invoiceNumber,
      invoiceDate,
      invoiceTime = '00:00:00',
      sellerName,
      sellerVatNumber,
      sellerCrNumber = '',
      sellerAddress = {},
      buyerName,
      buyerVatNumber = '',
      buyerCrNumber = '',
      buyerAddress = {},
      lineItems = [],
      taxableAmount,
      vatAmount,
      totalAmount,
      discountAmount = 0,
      invoiceType = 'standard',
      originalInvoiceId = '',
      paymentMeansCode = '10',
      currency = 'SAR',
      note = '',
      previousHash = '',
      invoiceCounter = 1,
      uuid = uuidv4(),
    } = invoiceData;

    // تحديد نوع الفاتورة
    const isSimplified = invoiceType === 'simplified';
    const isCreditNote = invoiceType === 'credit_note';
    const isDebitNote = invoiceType === 'debit_note';

    let typeCode = '388';
    if (isCreditNote) typeCode = '381';
    if (isDebitNote) typeCode = '383';

    const subTypeCode = isSimplified ? '0200000' : '0100000';

    // بناء بنود الفاتورة
    const lineItemsXml = lineItems
      .map(
        (item, idx) => `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${item.unit || 'PCE'}">${item.quantity || 1}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${currency}">${(item.lineTotal || 0).toFixed(2)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${currency}">${(item.vatAmount || 0).toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${currency}">${(item.lineTotal || 0).toFixed(2)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${currency}">${(item.vatAmount || 0).toFixed(2)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID>${item.vatCategory || 'S'}</cbc:ID>
            <cbc:Percent>${item.vatRate ?? 15}</cbc:Percent>
            <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${this._escapeXml(item.name || item.description || '')}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>${item.vatCategory || 'S'}</cbc:ID>
          <cbc:Percent>${item.vatRate ?? 15}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${currency}">${(item.unitPrice || 0).toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`
      )
      .join('');

    // PIH Reference
    const pihHash = previousHash || this._calculatePihForFirst();

    // Billing Reference (للإشعارات)
    const billingReferenceXml =
      (isCreditNote || isDebitNote) && originalInvoiceId
        ? `  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${originalInvoiceId}</cbc:ID>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>`
        : '';

    // Discount
    const discountXml =
      discountAmount > 0
        ? `  <cac:AllowanceCharge>
    <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
    <cbc:AllowanceChargeReason>Discount</cbc:AllowanceChargeReason>
    <cbc:Amount currencyID="${currency}">${discountAmount.toFixed(2)}</cbc:Amount>
    <cac:TaxCategory>
      <cbc:ID>S</cbc:ID>
      <cbc:Percent>15.00</cbc:Percent>
      <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
    </cac:TaxCategory>
  </cac:AllowanceCharge>`
        : '';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${invoiceCounter}</cbc:ID>
  <cbc:UUID>${uuid}</cbc:UUID>
  <cbc:IssueDate>${invoiceDate}</cbc:IssueDate>
  <cbc:IssueTime>${invoiceTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${subTypeCode}">${typeCode}</cbc:InvoiceTypeCode>
  <cbc:Note languageID="ar">${this._escapeXml(note)}</cbc:Note>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${currency}</cbc:TaxCurrencyCode>
${billingReferenceXml}
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${invoiceCounter}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${pihHash}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">${sellerCrNumber || sellerVatNumber}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${this._escapeXml(sellerAddress.street || '')}</cbc:StreetName>
        <cbc:BuildingNumber>${this._escapeXml(sellerAddress.buildingNumber || '0000')}</cbc:BuildingNumber>
        <cbc:CitySubdivisionName>${this._escapeXml(sellerAddress.district || '')}</cbc:CitySubdivisionName>
        <cbc:CityName>${this._escapeXml(sellerAddress.city || 'الرياض')}</cbc:CityName>
        <cbc:PostalZone>${sellerAddress.postalCode || '12345'}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${sellerVatNumber}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this._escapeXml(sellerName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      ${
        buyerCrNumber || buyerVatNumber
          ? `<cac:PartyIdentification>
        <cbc:ID schemeID="${buyerCrNumber ? 'CRN' : 'NAT'}">${buyerCrNumber || buyerVatNumber}</cbc:ID>
      </cac:PartyIdentification>`
          : ''
      }
      ${
        buyerVatNumber
          ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${buyerVatNumber}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>`
          : ''
      }
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this._escapeXml(buyerName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      ${
        buyerAddress && (buyerAddress.city || buyerAddress.street)
          ? `<cac:PostalAddress>
        <cbc:StreetName>${this._escapeXml(buyerAddress.street || '')}</cbc:StreetName>
        <cbc:CityName>${this._escapeXml(buyerAddress.city || '')}</cbc:CityName>
        <cbc:PostalZone>${buyerAddress.postalCode || ''}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${buyerAddress.countryCode || 'SA'}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>`
          : ''
      }
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${paymentMeansCode}</cbc:PaymentMeansCode>
  </cac:PaymentMeans>
${discountXml}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${vatAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${(taxableAmount - discountAmount).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${taxableAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${(taxableAmount - discountAmount).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${totalAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${currency}">${discountAmount.toFixed(2)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="${currency}">${totalAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lineItemsXml}
</Invoice>`;

    return xml;
  }

  // =========================================================================
  // 3. حساب Hash SHA-256 الكامل
  // =========================================================================

  /**
   * حساب SHA-256 hash للفاتورة (مع إزالة UBLExtensions)
   */
  calculateInvoiceHash(xmlContent) {
    // إزالة UBLExtensions من XML قبل الحساب
    const cleanedXml = xmlContent
      .replace(/<ext:UBLExtensions>[\s\S]*?<\/ext:UBLExtensions>/g, '')
      .replace(/^\s*[\r\n]/gm, '');

    return crypto.createHash('sha256').update(cleanedXml, 'utf8').digest('base64');
  }

  /**
   * حساب PIH لأول فاتورة
   */
  _calculatePihForFirst() {
    return crypto.createHash('sha256').update('0').digest('base64');
  }

  // =========================================================================
  // 4. توليد QR Code (TLV Encoding)
  // =========================================================================

  /**
   * توليد QR Code وفق مواصفات ZATCA (TLV encoding - Tags 1-9)
   */
  generateQrCode(invoiceData, options = {}) {
    const {
      sellerName,
      sellerVatNumber,
      invoiceDate,
      invoiceTime = '00:00:00',
      totalAmount,
      vatAmount,
      invoiceHash = '',
      signature = '',
      publicKey = '',
      csid = '',
    } = invoiceData;

    const timestamp = `${invoiceDate}T${invoiceTime}`;
    const includePhase2 = options.phase2 !== false;

    const fields = [
      { tag: 1, value: sellerName || '' },
      { tag: 2, value: sellerVatNumber || '' },
      { tag: 3, value: timestamp },
      {
        tag: 4,
        value: (typeof totalAmount === 'number'
          ? totalAmount
          : parseFloat(totalAmount || 0)
        ).toFixed(2),
      },
      {
        tag: 5,
        value: (typeof vatAmount === 'number' ? vatAmount : parseFloat(vatAmount || 0)).toFixed(2),
      },
    ];

    // إضافة Tags 6-9 للمرحلة الثانية
    if (includePhase2) {
      if (invoiceHash) fields.push({ tag: 6, value: invoiceHash });
      if (signature) fields.push({ tag: 7, value: signature });
      if (publicKey) fields.push({ tag: 8, value: publicKey });
      if (csid) fields.push({ tag: 9, value: csid });
    }

    const tlvBuffers = fields.map(({ tag, value }) => {
      const valueBuffer = Buffer.from(String(value), 'utf8');
      const tagBuffer = Buffer.alloc(1);
      tagBuffer.writeUInt8(tag);
      const lengthBuffer = Buffer.alloc(1);
      lengthBuffer.writeUInt8(Math.min(valueBuffer.length, 255));
      return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
    });

    return Buffer.concat(tlvBuffers).toString('base64');
  }

  /**
   * فك ترميز QR Code TLV
   */
  decodeQrCode(qrBase64) {
    try {
      const tlv = Buffer.from(qrBase64, 'base64');
      const data = {};
      let offset = 0;
      const tagNames = {
        1: 'sellerName',
        2: 'vatNumber',
        3: 'timestamp',
        4: 'totalAmount',
        5: 'vatAmount',
        6: 'invoiceHash',
        7: 'signature',
        8: 'publicKey',
        9: 'csid',
      };

      while (offset < tlv.length) {
        const tag = tlv.readUInt8(offset++);
        const length = tlv.readUInt8(offset++);
        const value = tlv.slice(offset, offset + length).toString('utf8');
        offset += length;
        data[tagNames[tag] || `tag_${tag}`] = value;
      }

      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // =========================================================================
  // 5. معالجة فاتورة كاملة (Main Method)
  // =========================================================================

  /**
   * معالجة فاتورة كاملة: بناء XML + PIH + Hash + QR + إرسال
   */
  async processInvoice(invoiceData, branchId = null) {
    let credential = null;
    let invoiceCounter = invoiceData.invoiceCounter || 1;
    let previousHash = invoiceData.previousHash || null;
    const uuid = uuidv4();

    // جلب بيانات الاعتماد من DB إذا كان branchId متوفر
    if (branchId && ZatcaCredential) {
      try {
        credential = await ZatcaCredential.findOne({ branchId, isActive: true });
        if (credential) {
          invoiceCounter = await credential.getNextIcv();
          previousHash = credential.getPreviousInvoiceHash();
        }
      } catch (err) {
        logger.warn('[ZATCA] Could not load credential from DB:', err.message);
      }
    }

    // استخدام env vars كـ fallback
    const csidToken = credential?.binarySecurityToken || this.csid;
    const secretToken = credential?.secret || this.secret;

    const invoiceType = invoiceData.invoiceType || 'standard';
    const isSimplified = invoiceType === 'simplified';

    // بناء XML
    const xml = this.buildInvoiceXml({
      ...invoiceData,
      invoiceCounter,
      previousHash,
      uuid,
    });

    // حساب Hash
    const hash = this.calculateInvoiceHash(xml);

    // توليد QR
    const qrCode = this.generateQrCode({
      ...invoiceData,
      invoiceHash: hash,
      csid: csidToken,
    });

    // إرسال إلى ZATCA
    let zatcaResult;
    if (isSimplified) {
      zatcaResult = await this._sendToZatca(xml, hash, uuid, 'reporting', csidToken, secretToken);
    } else {
      zatcaResult = await this._sendToZatca(xml, hash, uuid, 'clearance', csidToken, secretToken);
    }

    // تحديث آخر hash في DB
    if (credential && zatcaResult?.success) {
      try {
        await credential.updateLastHash(hash);
      } catch (err) {
        logger.warn('[ZATCA] Could not update last hash:', err.message);
      }
    }

    // تسجيل في DB
    if (ZatcaInvoiceLog && invoiceData.invoiceId) {
      try {
        await ZatcaInvoiceLog.create({
          invoiceId: invoiceData.invoiceId,
          branchId,
          requestType: isSimplified ? 'reporting' : 'clearance',
          zatcaUuid: uuid,
          invoiceCounter,
          invoiceHash: hash,
          previousHash,
          requestXml: xml,
          responseXml: JSON.stringify(zatcaResult?.data),
          responseStatus: zatcaResult?.success ? 'PASS' : 'ERROR',
          clearanceStatus: zatcaResult?.data?.clearanceStatus || null,
          reportingStatus: zatcaResult?.data?.reportingStatus || null,
          warningMessages: zatcaResult?.data?.validationResults?.warningMessages || [],
          errorMessages: zatcaResult?.data?.validationResults?.errorMessages || [],
          submittedAt: new Date(),
          respondedAt: new Date(),
        });
      } catch (err) {
        logger.warn('[ZATCA] Could not save invoice log:', err.message);
      }
    }

    return {
      xml,
      hash,
      qrCode,
      uuid,
      invoiceCounter,
      previousHash,
      zatcaResult,
    };
  }

  // =========================================================================
  // 6. إرسال للتقرير / المقاصة
  // =========================================================================

  async reportInvoice(invoiceXml, invoiceHash, options = {}) {
    const uuid = options.uuid || uuidv4();
    const csid = options.csid || this.csid;
    const secret = options.secret || this.secret;
    return this._sendToZatca(invoiceXml, invoiceHash, uuid, 'reporting', csid, secret);
  }

  async clearInvoice(invoiceXml, invoiceHash, options = {}) {
    const uuid = options.uuid || uuidv4();
    const csid = options.csid || this.csid;
    const secret = options.secret || this.secret;
    return this._sendToZatca(invoiceXml, invoiceHash, uuid, 'clearance', csid, secret);
  }

  async checkCompliance(invoiceXml, invoiceHash, options = {}) {
    const uuid = options.uuid || uuidv4();
    const csid = options.csid || this.csid;
    const secret = options.secret || this.secret;
    return this._sendToZatca(invoiceXml, invoiceHash, uuid, 'compliance', csid, secret);
  }

  /**
   * إرسال الفاتورة إلى ZATCA API
   */
  async _sendToZatca(xml, hash, uuid, type, csid, secret) {
    if (!csid || !secret) {
      logger.warn('[ZATCA] CSID or Secret not configured — skipping API call');
      return {
        success: false,
        skipped: true,
        error: 'ZATCA credentials not configured',
        localHash: hash,
        localUuid: uuid,
      };
    }

    const xmlBase64 = Buffer.from(xml).toString('base64');
    const auth = `Basic ${Buffer.from(`${csid}:${secret}`).toString('base64')}`;

    const endpointMap = {
      reporting: '/invoices/reporting/single',
      clearance: '/invoices/clearance/single',
      compliance: '/compliance/invoices',
    };

    const endpoint = endpointMap[type] || endpointMap.reporting;
    const headers = {
      'accept-version': 'V2',
      'Accept-Language': 'ar',
      Authorization: auth,
      'Content-Type': 'application/json',
    };

    if (type === 'clearance') {
      headers['Clearance-Status'] = '1';
    }

    try {
      const response = await axios.post(
        `${BASE_URL}${endpoint}`,
        { invoiceHash: hash, uuid, invoice: xmlBase64 },
        { headers, timeout: 30000 }
      );

      const data = response.data;
      const status = data?.validationResults?.status || 'UNKNOWN';
      const isSuccess = ['PASS', 'WARNING'].includes(status);

      if (isSuccess) {
        logger.info(`[ZATCA] Invoice ${type} successful`, { uuid, status });
      } else {
        logger.warn(`[ZATCA] Invoice ${type} failed`, {
          uuid,
          status,
          errors: data?.validationResults?.errorMessages,
        });
      }

      return { success: isSuccess, data, status: response.status };
    } catch (err) {
      logger.error(`[ZATCA] ${type} error:`, err.response?.data || err.message);
      return {
        success: false,
        error: err.response?.data || err.message,
        status: err.response?.status,
      };
    }
  }

  // =========================================================================
  // 7. رموز CPT لمراكز التأهيل
  // =========================================================================

  /**
   * الحصول على رموز CPT لمراكز التأهيل
   */
  getRehabCptCodes() {
    return REHAB_CPT_CODES;
  }

  /**
   * الحصول على وصف رمز CPT
   */
  getCptDescription(code) {
    return REHAB_CPT_CODES[code] || { desc: `CPT ${code}`, descAr: `رمز CPT ${code}` };
  }

  // =========================================================================
  // 8. جلب حالة الاعتماد للفرع
  // =========================================================================

  async getCredentialStatus(branchId) {
    if (!ZatcaCredential) {
      return {
        configured: !!(this.csid && this.secret),
        env: ZATCA_ENV,
        source: 'env',
      };
    }

    try {
      const credential = await ZatcaCredential.findOne({ branchId });
      if (!credential) {
        return {
          configured: false,
          env: ZATCA_ENV,
          branchId,
          message: 'لا توجد بيانات اعتماد للفرع',
        };
      }

      return {
        configured: !!(credential.binarySecurityToken && credential.secret),
        isProduction: credential.isProduction,
        env: ZATCA_ENV,
        branchId,
        invoiceCounter: credential.invoiceCounter,
        onboardedAt: credential.onboardedAt,
        csidExpiresAt: credential.csidExpiresAt,
        hasProductionCsid: !!credential.productionCsid,
        hasComplianceCsid: !!credential.complianceCsid,
      };
    } catch (err) {
      return { configured: false, env: ZATCA_ENV, error: err.message };
    }
  }

  // =========================================================================
  // 9. Helpers
  // =========================================================================

  _escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * التحقق من صحة رقم الضريبة (VAT) السعودي (15 رقم)
   */
  validateVatNumber(vatNumber) {
    if (!vatNumber) return false;
    const clean = String(vatNumber).replace(/\s/g, '');
    return /^[0-9]{15}$/.test(clean);
  }

  /**
   * حساب ضريبة القيمة المضافة (15%)
   */
  calculateVat(amount, rate = 15) {
    const vatAmount = (amount * rate) / 100;
    return {
      subtotal: parseFloat(amount.toFixed(2)),
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      total: parseFloat((amount + vatAmount).toFixed(2)),
      rate,
    };
  }
}

module.exports = new ZatcaPhase2Service();
module.exports.ZatcaPhase2Service = ZatcaPhase2Service;
module.exports.REHAB_CPT_CODES = REHAB_CPT_CODES;
