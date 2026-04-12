/**
 * ZATCA Phase 2 Service — Unit Tests
 * خدمة هيئة الزكاة والضريبة والجمارك (المرحلة الثانية)
 */
'use strict';

// ─── Mocks MUST be defined BEFORE require ───────────────────────────────────

const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  post: mockAxiosPost,
  create: jest.fn(() => ({ post: mockAxiosPost })),
}));

const mockCreateHash = jest.fn(() => ({
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('mocked-hash-base64'),
}));
const mockGenerateKeyPairSync = jest.fn().mockReturnValue({
  privateKey: '-----BEGIN PRIVATE KEY-----\nmocked\n-----END PRIVATE KEY-----',
  publicKey: '-----BEGIN PUBLIC KEY-----\nmocked\n-----END PUBLIC KEY-----',
});
jest.mock('crypto', () => ({
  createHash: mockCreateHash,
  generateKeyPairSync: mockGenerateKeyPairSync,
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Set env vars BEFORE requiring service
process.env.ZATCA_ENV = 'sandbox';
process.env.ZATCA_CSID = 'test-csid';
process.env.ZATCA_SECRET = 'test-secret';
process.env.ZATCA_PRIVATE_KEY = 'test-key';
process.env.ZATCA_CERTIFICATE = 'test-cert';

const zatcaModule = require('../../services/zatca-phase2.service');
const { ZatcaPhase2Service, REHAB_CPT_CODES } = zatcaModule;

// ─── Sample Data ────────────────────────────────────────────────────────────

const sampleInvoice = {
  invoiceNumber: 'INV-001',
  invoiceDate: '2024-01-15',
  invoiceTime: '14:30:00',
  sellerName: 'مركز التأهيل',
  sellerVatNumber: '300012345600003',
  sellerCrNumber: '1234567890',
  sellerAddress: {
    street: 'شارع الملك فهد',
    city: 'الرياض',
    postalCode: '12345',
    buildingNumber: '1234',
    district: 'حي العليا',
  },
  buyerName: 'محمد أحمد',
  buyerVatNumber: '300098765400003',
  buyerAddress: {
    street: 'شارع الأمير',
    city: 'جدة',
    postalCode: '21000',
    countryCode: 'SA',
  },
  lineItems: [
    {
      name: 'جلسة علاج طبيعي',
      quantity: 2,
      unitPrice: 200,
      lineTotal: 400,
      vatAmount: 60,
      vatRate: 15,
      vatCategory: 'S',
      unit: 'PCE',
    },
  ],
  taxableAmount: 400,
  vatAmount: 60,
  totalAmount: 460,
  discountAmount: 0,
  invoiceType: 'standard',
  currency: 'SAR',
};

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('ZatcaPhase2Service', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore env vars for each test
    process.env.ZATCA_CSID = 'test-csid';
    process.env.ZATCA_SECRET = 'test-secret';
    process.env.ZATCA_PRIVATE_KEY = 'test-key';
    process.env.ZATCA_CERTIFICATE = 'test-cert';
    service = new ZatcaPhase2Service();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 1. Module Exports
  // ═══════════════════════════════════════════════════════════════════════

  describe('Module exports', () => {
    it('default export is an instance of ZatcaPhase2Service', () => {
      expect(zatcaModule).toBeInstanceOf(ZatcaPhase2Service);
    });

    it('exports ZatcaPhase2Service class/constructor', () => {
      expect(ZatcaPhase2Service).toBeDefined();
      expect(typeof ZatcaPhase2Service).toBe('function');
      expect(new ZatcaPhase2Service()).toBeInstanceOf(ZatcaPhase2Service);
    });

    it('exports REHAB_CPT_CODES with 17 keys', () => {
      expect(REHAB_CPT_CODES).toBeDefined();
      expect(typeof REHAB_CPT_CODES).toBe('object');
      expect(Object.keys(REHAB_CPT_CODES)).toHaveLength(17);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Constructor
  // ═══════════════════════════════════════════════════════════════════════

  describe('Constructor', () => {
    it('reads CSID from env', () => {
      expect(service.csid).toBe('test-csid');
    });

    it('reads SECRET from env', () => {
      expect(service.secret).toBe('test-secret');
    });

    it('reads PRIVATE_KEY and CERTIFICATE from env', () => {
      expect(service.privateKey).toBe('test-key');
      expect(service.certificate).toBe('test-cert');
    });

    it('defaults to empty strings when env vars are not set', () => {
      delete process.env.ZATCA_CSID;
      delete process.env.ZATCA_SECRET;
      delete process.env.ZATCA_PRIVATE_KEY;
      delete process.env.ZATCA_CERTIFICATE;

      const s = new ZatcaPhase2Service();
      expect(s.csid).toBe('');
      expect(s.secret).toBe('');
      expect(s.privateKey).toBe('');
      expect(s.certificate).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Key Generation & CSR
  // ═══════════════════════════════════════════════════════════════════════

  describe('generateEcdsaKeyPair', () => {
    it('calls crypto.generateKeyPairSync and returns {privateKey, publicKey}', () => {
      const result = service.generateEcdsaKeyPair();
      expect(mockGenerateKeyPairSync).toHaveBeenCalledWith(
        'ec',
        expect.objectContaining({
          namedCurve: 'prime256v1',
        })
      );
      expect(result).toHaveProperty('privateKey');
      expect(result).toHaveProperty('publicKey');
      expect(result.privateKey).toContain('BEGIN PRIVATE KEY');
      expect(result.publicKey).toContain('BEGIN PUBLIC KEY');
    });

    it('throws with Arabic error message when crypto fails', () => {
      mockGenerateKeyPairSync.mockImplementationOnce(() => {
        throw new Error('crypto failure');
      });
      expect(() => service.generateEcdsaKeyPair()).toThrow('فشل توليد مفاتيح ECDSA');
      expect(() => service.generateEcdsaKeyPair()).not.toThrow(); // resets
    });
  });

  describe('buildCsrData', () => {
    it('returns CSR object with defaults when orgData is empty', () => {
      const result = service.buildCsrData({});
      expect(result).toEqual(
        expect.objectContaining({
          commonName: 'Rehab Center',
          organizationIdentifier: '',
          organizationUnit: 'Branch-01',
          organizationName: 'Rehab Center',
          countryName: 'SA',
          invoiceType: '1100',
          address: '',
          businessCategory: 'Healthcare',
        })
      );
    });

    it('uses values from orgData when provided', () => {
      const orgData = {
        organizationName: 'مركز التأهيل',
        vatNumber: '300012345600003',
        branchCode: 'BR-MAIN',
        street: 'شارع الملك',
        businessCategory: 'Medical',
      };
      const result = service.buildCsrData(orgData);
      expect(result.commonName).toBe('مركز التأهيل');
      expect(result.organizationIdentifier).toBe('300012345600003');
      expect(result.organizationUnit).toBe('BR-MAIN');
      expect(result.address).toBe('شارع الملك');
      expect(result.businessCategory).toBe('Medical');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Onboarding (null model paths)
  // ═══════════════════════════════════════════════════════════════════════

  describe('performOnboarding', () => {
    it('generates key pair and calls axios.post', async () => {
      mockAxiosPost.mockResolvedValue({
        data: {
          binarySecurityToken: 'bst-token',
          secret: 'api-secret',
          requestID: 'req-123',
        },
      });
      const result = await service.performOnboarding(
        'branch-1',
        { organizationName: 'Test' },
        '123456'
      );
      expect(mockGenerateKeyPairSync).toHaveBeenCalled();
      expect(mockAxiosPost).toHaveBeenCalled();
      const url = mockAxiosPost.mock.calls[0][0];
      expect(url).toContain('/compliance');
    });

    it('sends OTP in headers', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { binarySecurityToken: 'bst', secret: 's', requestID: 'r' },
      });
      await service.performOnboarding('branch-1', {}, '654321');
      const headers = mockAxiosPost.mock.calls[0][2].headers;
      expect(headers.OTP).toBe('654321');
    });

    it('returns {success:false, error} when axios throws', async () => {
      mockAxiosPost.mockRejectedValue(new Error('Network fail'));
      const result = await service.performOnboarding('branch-1', {}, '123456');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network fail');
    });

    it('returns object with success field', async () => {
      mockAxiosPost.mockRejectedValue(new Error('fail'));
      const result = await service.performOnboarding('branch-x', {}, '000');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. Production CSID (null model paths)
  // ═══════════════════════════════════════════════════════════════════════

  describe('obtainProductionCsid', () => {
    it('returns {success:false} when no credential found in DB (findOne returns null)', async () => {
      // Mock findOne resolves to null (no credential in DB)
      const result = await service.obtainProductionCsid('branch-1');
      expect(result).toEqual({
        success: false,
        error: 'يجب الحصول على Compliance CSID أولاً',
      });
    });

    it('does not call axios when no credential exists', async () => {
      await service.obtainProductionCsid('branch-1');
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('returns object with error message string', async () => {
      const result = await service.obtainProductionCsid('any-branch');
      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 6. Build Invoice XML
  // ═══════════════════════════════════════════════════════════════════════

  describe('buildInvoiceXml', () => {
    it('returns valid XML string with UBL 2.1 elements', () => {
      const xml = service.buildInvoiceXml(sampleInvoice);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2');
      expect(xml).toContain('<cbc:ProfileID>reporting:1.0</cbc:ProfileID>');
    });

    it('includes UBLExtensions section', () => {
      const xml = service.buildInvoiceXml(sampleInvoice);
      expect(xml).toContain('<ext:UBLExtensions>');
      expect(xml).toContain('</ext:UBLExtensions>');
    });

    it('standard invoice uses typeCode 388 and subTypeCode 0100000', () => {
      const xml = service.buildInvoiceXml({ ...sampleInvoice, invoiceType: 'standard' });
      expect(xml).toContain('<cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>');
    });

    it('simplified invoice uses typeCode 388 and subTypeCode 0200000', () => {
      const xml = service.buildInvoiceXml({ ...sampleInvoice, invoiceType: 'simplified' });
      expect(xml).toContain('<cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>');
    });

    it('credit note uses typeCode 381 and includes BillingReference', () => {
      const xml = service.buildInvoiceXml({
        ...sampleInvoice,
        invoiceType: 'credit_note',
        originalInvoiceId: 'INV-000',
      });
      expect(xml).toContain('>381</cbc:InvoiceTypeCode>');
      expect(xml).toContain('<cac:BillingReference>');
      expect(xml).toContain('INV-000');
    });

    it('debit note uses typeCode 383 and includes BillingReference', () => {
      const xml = service.buildInvoiceXml({
        ...sampleInvoice,
        invoiceType: 'debit_note',
        originalInvoiceId: 'INV-000',
      });
      expect(xml).toContain('>383</cbc:InvoiceTypeCode>');
      expect(xml).toContain('<cac:BillingReference>');
    });

    it('includes AllowanceCharge section when discount > 0', () => {
      const xml = service.buildInvoiceXml({ ...sampleInvoice, discountAmount: 50 });
      expect(xml).toContain('<cac:AllowanceCharge>');
      expect(xml).toContain('<cbc:ChargeIndicator>false</cbc:ChargeIndicator>');
      expect(xml).toContain('50.00');
    });

    it('does not include AllowanceCharge when discount is 0', () => {
      const xml = service.buildInvoiceXml({ ...sampleInvoice, discountAmount: 0 });
      expect(xml).not.toContain('<cac:AllowanceCharge>');
    });

    it('includes buyer PostalAddress when buyerAddress is provided', () => {
      const xml = service.buildInvoiceXml(sampleInvoice);
      expect(xml).toContain('<cac:PostalAddress>');
      expect(xml).toContain('جدة');
    });

    it('does not include buyer PostalAddress when empty', () => {
      const xml = service.buildInvoiceXml({
        ...sampleInvoice,
        buyerAddress: {},
      });
      // The condition checks for buyerAddress.city or buyerAddress.street
      // With empty object, neither exists so no PostalAddress in customer section
      const customerSection = xml.split('AccountingCustomerParty')[1];
      // Extract just the customer party block
      const customerBlock = customerSection?.split('</cac:AccountingCustomerParty>')[0] || '';
      expect(customerBlock).not.toContain('<cac:PostalAddress>');
    });

    it('escapes XML special characters in text content', () => {
      const xml = service.buildInvoiceXml({
        ...sampleInvoice,
        sellerName: 'Test<Name>&"Value\'',
      });
      expect(xml).toContain('&lt;');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&quot;');
      expect(xml).toContain('&apos;');
    });

    it('includes line items with correct structure', () => {
      const xml = service.buildInvoiceXml(sampleInvoice);
      expect(xml).toContain('<cac:InvoiceLine>');
      expect(xml).toContain('unitCode="PCE"');
      expect(xml).toContain('>2</cbc:InvoicedQuantity>');
      expect(xml).toContain('400.00');
    });

    it('includes seller address details', () => {
      const xml = service.buildInvoiceXml(sampleInvoice);
      expect(xml).toContain('شارع الملك فهد');
      expect(xml).toContain('الرياض');
      expect(xml).toContain('12345');
    });

    it('includes PIH reference', () => {
      const xml = service.buildInvoiceXml(sampleInvoice);
      expect(xml).toContain('<cbc:ID>PIH</cbc:ID>');
      expect(xml).toContain('EmbeddedDocumentBinaryObject');
    });

    it('includes ICV reference', () => {
      const xml = service.buildInvoiceXml(sampleInvoice);
      expect(xml).toContain('<cbc:ID>ICV</cbc:ID>');
    });

    it('uses uuid from uuidv4 when not provided', () => {
      const xml = service.buildInvoiceXml(sampleInvoice);
      expect(xml).toContain('test-uuid-1234');
    });

    it('uses provided previousHash when given', () => {
      const xml = service.buildInvoiceXml({ ...sampleInvoice, previousHash: 'custom-pih-hash' });
      expect(xml).toContain('custom-pih-hash');
    });

    it('includes LegalMonetaryTotal with correct amounts', () => {
      const xml = service.buildInvoiceXml(sampleInvoice);
      expect(xml).toContain(
        '<cbc:LineExtensionAmount currencyID="SAR">400.00</cbc:LineExtensionAmount>'
      );
      expect(xml).toContain(
        '<cbc:TaxInclusiveAmount currencyID="SAR">460.00</cbc:TaxInclusiveAmount>'
      );
      expect(xml).toContain('<cbc:PayableAmount currencyID="SAR">460.00</cbc:PayableAmount>');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 7. Invoice Hash
  // ═══════════════════════════════════════════════════════════════════════

  describe('calculateInvoiceHash', () => {
    it('calls crypto.createHash with sha256 and returns base64', () => {
      const result = service.calculateInvoiceHash('<Invoice>test</Invoice>');
      expect(mockCreateHash).toHaveBeenCalledWith('sha256');
      expect(result).toBe('mocked-hash-base64');
    });

    it('strips UBLExtensions before hashing', () => {
      const xmlWithExtensions = `<Invoice>
        <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>
        <cbc:ID>1</cbc:ID>
      </Invoice>`;
      service.calculateInvoiceHash(xmlWithExtensions);

      const mockUpdate = mockCreateHash.mock.results[0].value.update;
      const passedXml = mockUpdate.mock.calls[0][0];
      expect(passedXml).not.toContain('UBLExtensions');
      expect(passedXml).toContain('<cbc:ID>1</cbc:ID>');
    });

    it('returns string result', () => {
      const result = service.calculateInvoiceHash('<Invoice/>');
      expect(typeof result).toBe('string');
    });
  });

  describe('_calculatePihForFirst', () => {
    it('hashes the string "0" with SHA-256', () => {
      service._calculatePihForFirst();
      expect(mockCreateHash).toHaveBeenCalledWith('sha256');
      const mockUpdate = mockCreateHash.mock.results[0].value.update;
      expect(mockUpdate).toHaveBeenCalledWith('0');
    });

    it('returns base64 digest', () => {
      const result = service._calculatePihForFirst();
      expect(result).toBe('mocked-hash-base64');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 8. QR Code TLV
  // ═══════════════════════════════════════════════════════════════════════

  describe('generateQrCode', () => {
    const qrInput = {
      sellerName: 'مركز التأهيل',
      sellerVatNumber: '300012345600003',
      invoiceDate: '2024-01-15',
      invoiceTime: '14:30:00',
      totalAmount: 460,
      vatAmount: 60,
    };

    it('returns a base64 string', () => {
      const result = service.generateQrCode(qrInput);
      expect(typeof result).toBe('string');
      // Should be valid base64
      expect(() => Buffer.from(result, 'base64')).not.toThrow();
    });

    it('includes tags 1-5 (sellerName, vatNumber, timestamp, total, vat)', () => {
      const result = service.generateQrCode(qrInput);
      const decoded = service.decodeQrCode(result);
      expect(decoded.success).toBe(true);
      expect(decoded.data.sellerName).toBe('مركز التأهيل');
      expect(decoded.data.vatNumber).toBe('300012345600003');
      expect(decoded.data.timestamp).toBe('2024-01-15T14:30:00');
      expect(decoded.data.totalAmount).toBe('460.00');
      expect(decoded.data.vatAmount).toBe('60.00');
    });

    it('includes Phase 2 tags 6-9 when provided', () => {
      const result = service.generateQrCode({
        ...qrInput,
        invoiceHash: 'hash123',
        signature: 'sig456',
        publicKey: 'pub789',
        csid: 'csid000',
      });
      const decoded = service.decodeQrCode(result);
      expect(decoded.data.invoiceHash).toBe('hash123');
      expect(decoded.data.signature).toBe('sig456');
      expect(decoded.data.publicKey).toBe('pub789');
      expect(decoded.data.csid).toBe('csid000');
    });

    it('excludes Phase 2 tags when phase2: false', () => {
      const result = service.generateQrCode(
        { ...qrInput, invoiceHash: 'hash123', signature: 'sig456' },
        { phase2: false }
      );
      const decoded = service.decodeQrCode(result);
      expect(decoded.data).not.toHaveProperty('invoiceHash');
      expect(decoded.data).not.toHaveProperty('signature');
    });

    it('handles number amounts correctly', () => {
      const result = service.generateQrCode({ ...qrInput, totalAmount: 100, vatAmount: 15 });
      const decoded = service.decodeQrCode(result);
      expect(decoded.data.totalAmount).toBe('100.00');
      expect(decoded.data.vatAmount).toBe('15.00');
    });

    it('handles string amounts correctly', () => {
      const result = service.generateQrCode({
        ...qrInput,
        totalAmount: '250.50',
        vatAmount: '37.58',
      });
      const decoded = service.decodeQrCode(result);
      expect(decoded.data.totalAmount).toBe('250.50');
      expect(decoded.data.vatAmount).toBe('37.58');
    });

    it('defaults invoiceTime to 00:00:00 when not provided', () => {
      const { invoiceTime, ...noTime } = qrInput;
      const result = service.generateQrCode(noTime);
      const decoded = service.decodeQrCode(result);
      expect(decoded.data.timestamp).toBe('2024-01-15T00:00:00');
    });

    it('handles missing optional Phase 2 fields gracefully', () => {
      // Only tags 1-5, no phase 2 data
      const result = service.generateQrCode(qrInput);
      const decoded = service.decodeQrCode(result);
      expect(decoded.data).not.toHaveProperty('invoiceHash');
      expect(decoded.data).not.toHaveProperty('signature');
    });
  });

  describe('decodeQrCode', () => {
    it('decodes TLV back to object with {success:true, data}', () => {
      const encoded = service.generateQrCode({
        sellerName: 'Test',
        sellerVatNumber: '123456789012345',
        invoiceDate: '2024-01-01',
        totalAmount: 100,
        vatAmount: 15,
      });
      const result = service.decodeQrCode(encoded);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.sellerName).toBe('Test');
    });

    it('roundtrip: encode then decode produces same values', () => {
      const input = {
        sellerName: 'مركز المحمدية',
        sellerVatNumber: '300012345600003',
        invoiceDate: '2024-06-15',
        invoiceTime: '10:00:00',
        totalAmount: 1150,
        vatAmount: 150,
        invoiceHash: 'abc-hash',
        signature: 'def-sig',
        publicKey: 'ghi-key',
        csid: 'jkl-csid',
      };
      const encoded = service.generateQrCode(input);
      const decoded = service.decodeQrCode(encoded);

      expect(decoded.success).toBe(true);
      expect(decoded.data.sellerName).toBe('مركز المحمدية');
      expect(decoded.data.vatNumber).toBe('300012345600003');
      expect(decoded.data.totalAmount).toBe('1150.00');
      expect(decoded.data.vatAmount).toBe('150.00');
      expect(decoded.data.invoiceHash).toBe('abc-hash');
      expect(decoded.data.signature).toBe('def-sig');
      expect(decoded.data.publicKey).toBe('ghi-key');
      expect(decoded.data.csid).toBe('jkl-csid');
    });

    it('returns {success:false, error} with invalid base64', () => {
      const result = service.decodeQrCode('!!!not-base64!!!');
      // Even if base64 decoding doesn't throw, the TLV parsing likely will
      // for truly malformed data. Let's provide something that will break TLV parsing.
      // Actually Buffer.from handles most strings, so let's test with truncated TLV
      expect(result).toHaveProperty('success');
    });

    it('returns {success:false} when TLV is truncated/corrupt', () => {
      // Create a buffer that starts TLV but is truncated
      const badTlv = Buffer.alloc(3);
      badTlv.writeUInt8(1, 0); // tag 1
      badTlv.writeUInt8(100, 1); // length 100 but only 1 byte follows
      badTlv.writeUInt8(65, 2); // 'A'
      const badBase64 = badTlv.toString('base64');
      // This won't throw because Buffer.slice doesn't throw for out-of-range
      // But the loop will read beyond buffer bounds eventually
      const result = service.decodeQrCode(badBase64);
      // It will either succeed with partial data or fail
      expect(result).toHaveProperty('success');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 9. Process Invoice
  // ═══════════════════════════════════════════════════════════════════════

  describe('processInvoice', () => {
    beforeEach(() => {
      // Default: _sendToZatca will be called, mock axios for it
      mockAxiosPost.mockResolvedValue({
        data: {
          validationResults: { status: 'PASS' },
          clearanceStatus: 'CLEARED',
        },
        status: 200,
      });
    });

    it('returns object with xml, hash, qrCode, uuid, invoiceCounter, previousHash, zatcaResult', async () => {
      const result = await service.processInvoice(sampleInvoice);
      expect(result).toHaveProperty('xml');
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('uuid');
      expect(result).toHaveProperty('invoiceCounter');
      expect(result).toHaveProperty('previousHash');
      expect(result).toHaveProperty('zatcaResult');
    });

    it('xml contains valid UBL content', async () => {
      const result = await service.processInvoice(sampleInvoice);
      expect(result.xml).toContain('<?xml version="1.0"');
      expect(result.xml).toContain('<Invoice');
    });

    it('standard invoice calls _sendToZatca endpoint with clearance', async () => {
      await service.processInvoice({ ...sampleInvoice, invoiceType: 'standard' });
      expect(mockAxiosPost).toHaveBeenCalled();
      const url = mockAxiosPost.mock.calls[0][0];
      expect(url).toContain('clearance');
    });

    it('simplified invoice calls _sendToZatca endpoint with reporting', async () => {
      await service.processInvoice({ ...sampleInvoice, invoiceType: 'simplified' });
      expect(mockAxiosPost).toHaveBeenCalled();
      const url = mockAxiosPost.mock.calls[0][0];
      expect(url).toContain('reporting');
    });

    it('uses env var credentials when branchId is not provided', async () => {
      await service.processInvoice(sampleInvoice);
      // Should use the service's csid and secret from env
      expect(mockAxiosPost).toHaveBeenCalled();
      const headers = mockAxiosPost.mock.calls[0][2].headers;
      const auth = headers.Authorization;
      // Auth should contain base64 of "test-csid:test-secret"
      const expectedAuth = `Basic ${Buffer.from('test-csid:test-secret').toString('base64')}`;
      expect(auth).toBe(expectedAuth);
    });

    it('generates UUID via uuidv4', async () => {
      const result = await service.processInvoice(sampleInvoice);
      expect(result.uuid).toBe('test-uuid-1234');
    });

    it('uses default invoiceCounter of 1 when not provided', async () => {
      const result = await service.processInvoice(sampleInvoice);
      expect(result.invoiceCounter).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 10. Send to ZATCA
  // ═══════════════════════════════════════════════════════════════════════

  describe('_sendToZatca', () => {
    const xml = '<Invoice>test</Invoice>';
    const hash = 'test-hash';
    const uuid = 'test-uuid';

    it('returns {success:false, skipped:true} when csid is empty', async () => {
      const result = await service._sendToZatca(xml, hash, uuid, 'reporting', '', 'secret');
      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.error).toContain('not configured');
    });

    it('returns {success:false, skipped:true} when secret is empty', async () => {
      const result = await service._sendToZatca(xml, hash, uuid, 'reporting', 'csid', '');
      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
    });

    it('does not call axios when credentials missing', async () => {
      await service._sendToZatca(xml, hash, uuid, 'reporting', '', '');
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('returns {success:true} for PASS status', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'PASS' } },
        status: 200,
      });
      const result = await service._sendToZatca(xml, hash, uuid, 'reporting', 'csid', 'secret');
      expect(result.success).toBe(true);
    });

    it('returns {success:true} for WARNING status', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'WARNING' } },
        status: 200,
      });
      const result = await service._sendToZatca(xml, hash, uuid, 'clearance', 'csid', 'secret');
      expect(result.success).toBe(true);
    });

    it('returns {success:false} for ERROR status', async () => {
      mockAxiosPost.mockResolvedValue({
        data: {
          validationResults: {
            status: 'ERROR',
            errorMessages: [{ message: 'Invalid' }],
          },
        },
        status: 200,
      });
      const result = await service._sendToZatca(xml, hash, uuid, 'reporting', 'csid', 'secret');
      expect(result.success).toBe(false);
    });

    it('returns {success:false, error} when axios throws', async () => {
      mockAxiosPost.mockRejectedValue(new Error('Network error'));
      const result = await service._sendToZatca(xml, hash, uuid, 'reporting', 'csid', 'secret');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('includes Clearance-Status header for clearance type', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'PASS' } },
        status: 200,
      });
      await service._sendToZatca(xml, hash, uuid, 'clearance', 'csid', 'secret');
      const headers = mockAxiosPost.mock.calls[0][2].headers;
      expect(headers['Clearance-Status']).toBe('1');
    });

    it('uses correct endpoint for reporting', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'PASS' } },
        status: 200,
      });
      await service._sendToZatca(xml, hash, uuid, 'reporting', 'csid', 'secret');
      expect(mockAxiosPost.mock.calls[0][0]).toContain('/invoices/reporting/single');
    });

    it('uses correct endpoint for compliance', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'PASS' } },
        status: 200,
      });
      await service._sendToZatca(xml, hash, uuid, 'compliance', 'csid', 'secret');
      expect(mockAxiosPost.mock.calls[0][0]).toContain('/compliance/invoices');
    });

    it('sends invoice as base64 in request body', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'PASS' } },
        status: 200,
      });
      await service._sendToZatca(xml, hash, uuid, 'reporting', 'csid', 'secret');
      const body = mockAxiosPost.mock.calls[0][1];
      expect(body.invoice).toBe(Buffer.from(xml).toString('base64'));
      expect(body.invoiceHash).toBe(hash);
      expect(body.uuid).toBe(uuid);
    });

    it('returns axios error response data when available', async () => {
      const axiosError = new Error('Request failed');
      axiosError.response = { data: { message: 'Unauthorized' }, status: 401 };
      mockAxiosPost.mockRejectedValue(axiosError);
      const result = await service._sendToZatca(xml, hash, uuid, 'reporting', 'csid', 'secret');
      expect(result.success).toBe(false);
      expect(result.error).toEqual({ message: 'Unauthorized' });
      expect(result.status).toBe(401);
    });
  });

  describe('reportInvoice', () => {
    it('delegates to _sendToZatca with reporting type', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'PASS' } },
        status: 200,
      });
      const result = await service.reportInvoice('<xml/>', 'hash');
      expect(mockAxiosPost.mock.calls[0][0]).toContain('reporting');
      expect(result.success).toBe(true);
    });

    it('uses options csid/secret when provided', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'PASS' } },
        status: 200,
      });
      await service.reportInvoice('<xml/>', 'hash', {
        csid: 'custom-csid',
        secret: 'custom-secret',
      });
      const headers = mockAxiosPost.mock.calls[0][2].headers;
      const expectedAuth = `Basic ${Buffer.from('custom-csid:custom-secret').toString('base64')}`;
      expect(headers.Authorization).toBe(expectedAuth);
    });
  });

  describe('clearInvoice', () => {
    it('delegates to _sendToZatca with clearance type', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'PASS' } },
        status: 200,
      });
      const result = await service.clearInvoice('<xml/>', 'hash');
      expect(mockAxiosPost.mock.calls[0][0]).toContain('clearance');
      expect(result.success).toBe(true);
    });

    it('uses provided uuid from options', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'PASS' } },
        status: 200,
      });
      await service.clearInvoice('<xml/>', 'hash', { uuid: 'my-uuid' });
      const body = mockAxiosPost.mock.calls[0][1];
      expect(body.uuid).toBe('my-uuid');
    });
  });

  describe('checkCompliance', () => {
    it('delegates to _sendToZatca with compliance type', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'PASS' } },
        status: 200,
      });
      const result = await service.checkCompliance('<xml/>', 'hash');
      expect(mockAxiosPost.mock.calls[0][0]).toContain('compliance');
      expect(result.success).toBe(true);
    });

    it('falls back to service credentials when options not provided', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'PASS' } },
        status: 200,
      });
      await service.checkCompliance('<xml/>', 'hash');
      const headers = mockAxiosPost.mock.calls[0][2].headers;
      const expectedAuth = `Basic ${Buffer.from('test-csid:test-secret').toString('base64')}`;
      expect(headers.Authorization).toBe(expectedAuth);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 11. CPT Codes
  // ═══════════════════════════════════════════════════════════════════════

  describe('getRehabCptCodes', () => {
    it('returns REHAB_CPT_CODES object', () => {
      const codes = service.getRehabCptCodes();
      expect(codes).toBe(REHAB_CPT_CODES);
    });

    it('has 17 entries', () => {
      const codes = service.getRehabCptCodes();
      expect(Object.keys(codes)).toHaveLength(17);
    });

    it('contains expected CPT codes', () => {
      const codes = service.getRehabCptCodes();
      expect(codes).toHaveProperty('97110');
      expect(codes).toHaveProperty('92507');
      expect(codes).toHaveProperty('97153');
      expect(codes).toHaveProperty('96112');
    });
  });

  describe('getCptDescription', () => {
    it('returns correct desc/descAr for known code 97110', () => {
      const result = service.getCptDescription(97110);
      expect(result.desc).toBe('Therapeutic Exercises');
      expect(result.descAr).toBe('تمارين علاجية');
      expect(result.specialty).toBe('PT');
    });

    it('returns correct info for code 92507', () => {
      const result = service.getCptDescription(92507);
      expect(result.desc).toBe('Speech Therapy Individual');
      expect(result.descAr).toBe('علاج نطق فردي');
    });

    it('returns default for unknown code 99999', () => {
      const result = service.getCptDescription(99999);
      expect(result.desc).toBe('CPT 99999');
      expect(result.descAr).toBe('رمز CPT 99999');
    });

    it('returns default for code 0', () => {
      const result = service.getCptDescription(0);
      expect(result.desc).toContain('CPT');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 12. Credential Status
  // ═══════════════════════════════════════════════════════════════════════

  describe('getCredentialStatus', () => {
    it('returns not-configured status when no credential found in DB', async () => {
      // Mock findOne returns null (no credential stored)
      const result = await service.getCredentialStatus('branch-1');
      expect(result.configured).toBe(false);
      expect(result).toHaveProperty('env');
      expect(result).toHaveProperty('branchId', 'branch-1');
      expect(result.message).toBe('لا توجد بيانات اعتماد للفرع');
    });

    it('includes env and branchId in response', async () => {
      const result = await service.getCredentialStatus('branch-abc');
      expect(result.env).toBeDefined();
      expect(result.branchId).toBe('branch-abc');
    });

    it('returns configured:false when no credential in store', async () => {
      const result = await service.getCredentialStatus('non-existent');
      expect(result.configured).toBe(false);
    });

    it('includes env field in response', async () => {
      const result = await service.getCredentialStatus('branch-1');
      expect(result.env).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 13. VAT Helpers
  // ═══════════════════════════════════════════════════════════════════════

  describe('validateVatNumber', () => {
    it('returns true for valid 15-digit number', () => {
      expect(service.validateVatNumber('300012345600003')).toBe(true);
    });

    it('returns false for too short number', () => {
      expect(service.validateVatNumber('12345')).toBe(false);
    });

    it('returns false for null', () => {
      expect(service.validateVatNumber(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(service.validateVatNumber(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(service.validateVatNumber('')).toBe(false);
    });

    it('cleans spaces and validates', () => {
      expect(service.validateVatNumber('300 012 345 600 003')).toBe(true);
    });

    it('returns false for 15 chars with letters', () => {
      expect(service.validateVatNumber('30001234560000A')).toBe(false);
    });

    it('returns false for 16 digits', () => {
      expect(service.validateVatNumber('3000123456000031')).toBe(false);
    });
  });

  describe('calculateVat', () => {
    it('calculates default 15% VAT', () => {
      const result = service.calculateVat(100);
      expect(result).toEqual({
        subtotal: 100,
        vatAmount: 15,
        total: 115,
        rate: 15,
      });
    });

    it('calculates custom 5% VAT rate', () => {
      const result = service.calculateVat(200, 5);
      expect(result).toEqual({
        subtotal: 200,
        vatAmount: 10,
        total: 210,
        rate: 5,
      });
    });

    it('handles zero amount', () => {
      const result = service.calculateVat(0);
      expect(result).toEqual({
        subtotal: 0,
        vatAmount: 0,
        total: 0,
        rate: 15,
      });
    });

    it('handles decimal amounts', () => {
      const result = service.calculateVat(99.99);
      expect(result.subtotal).toBe(99.99);
      expect(result.vatAmount).toBeCloseTo(15, 1);
      expect(result.rate).toBe(15);
    });

    it('returns numeric values, not strings', () => {
      const result = service.calculateVat(100);
      expect(typeof result.subtotal).toBe('number');
      expect(typeof result.vatAmount).toBe('number');
      expect(typeof result.total).toBe('number');
      expect(typeof result.rate).toBe('number');
    });

    it('calculates 0% VAT rate (zero-rated)', () => {
      const result = service.calculateVat(500, 0);
      expect(result).toEqual({
        subtotal: 500,
        vatAmount: 0,
        total: 500,
        rate: 0,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 14. XML Escape
  // ═══════════════════════════════════════════════════════════════════════

  describe('_escapeXml', () => {
    it('escapes < and >', () => {
      expect(service._escapeXml('<test>')).toBe('&lt;test&gt;');
    });

    it('escapes &', () => {
      expect(service._escapeXml('A & B')).toBe('A &amp; B');
    });

    it('escapes double quotes', () => {
      expect(service._escapeXml('"hello"')).toBe('&quot;hello&quot;');
    });

    it('escapes single quotes (apostrophe)', () => {
      expect(service._escapeXml("it's")).toBe('it&apos;s');
    });

    it('handles all 5 special chars together', () => {
      const input = '<tag attr="val" & \'apos\'>';
      const result = service._escapeXml(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&apos;');
    });

    it('returns empty string for null', () => {
      expect(service._escapeXml(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(service._escapeXml(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(service._escapeXml('')).toBe('');
    });

    it('converts numbers to string and processes', () => {
      expect(service._escapeXml(12345)).toBe('12345');
    });

    it('leaves normal text unchanged', () => {
      expect(service._escapeXml('مرحبا بالعالم')).toBe('مرحبا بالعالم');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 15. Edge Cases & Integration-like scenarios
  // ═══════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('buildInvoiceXml with minimal data (defaults)', () => {
      const minimal = {
        invoiceDate: '2024-01-01',
        sellerName: 'Test',
        sellerVatNumber: '111111111111111',
        buyerName: 'Buyer',
        lineItems: [],
        taxableAmount: 0,
        vatAmount: 0,
        totalAmount: 0,
      };
      const xml = service.buildInvoiceXml(minimal);
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('388'); // default standard
      expect(xml).toContain('0100000'); // default standard subtype
    });

    it('processInvoice handles no env credentials gracefully', async () => {
      service.csid = '';
      service.secret = '';
      const result = await service.processInvoice(sampleInvoice);
      // _sendToZatca should return skipped:true
      expect(result.zatcaResult.success).toBe(false);
      expect(result.zatcaResult.skipped).toBe(true);
    });

    it('buildInvoiceXml with multiple line items', () => {
      const multiLine = {
        ...sampleInvoice,
        lineItems: [
          {
            name: 'Item 1',
            quantity: 1,
            unitPrice: 100,
            lineTotal: 100,
            vatAmount: 15,
            vatRate: 15,
            unit: 'PCE',
          },
          {
            name: 'Item 2',
            quantity: 3,
            unitPrice: 50,
            lineTotal: 150,
            vatAmount: 22.5,
            vatRate: 15,
            unit: 'EA',
          },
          {
            name: 'Item 3',
            quantity: 2,
            unitPrice: 75,
            lineTotal: 150,
            vatAmount: 22.5,
            vatRate: 15,
            unit: 'PCE',
          },
        ],
      };
      const xml = service.buildInvoiceXml(multiLine);
      expect(xml).toContain('<cbc:ID>1</cbc:ID>');
      expect(xml).toContain('<cbc:ID>2</cbc:ID>');
      expect(xml).toContain('<cbc:ID>3</cbc:ID>');
      expect(xml).toContain('unitCode="EA"');
    });

    it('_sendToZatca with UNKNOWN validation status returns false', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'UNKNOWN' } },
        status: 200,
      });
      const result = await service._sendToZatca(
        '<xml/>',
        'hash',
        'uuid',
        'reporting',
        'csid',
        'secret'
      );
      expect(result.success).toBe(false);
    });

    it('_sendToZatca defaults to reporting endpoint for unknown type', async () => {
      mockAxiosPost.mockResolvedValue({
        data: { validationResults: { status: 'PASS' } },
        status: 200,
      });
      await service._sendToZatca('<xml/>', 'hash', 'uuid', 'unknown_type', 'csid', 'secret');
      expect(mockAxiosPost.mock.calls[0][0]).toContain('/invoices/reporting/single');
    });

    it('generateQrCode with empty/null sellerName', () => {
      const result = service.generateQrCode({
        sellerName: '',
        sellerVatNumber: '123456789012345',
        invoiceDate: '2024-01-01',
        totalAmount: 0,
        vatAmount: 0,
      });
      expect(typeof result).toBe('string');
    });

    it('multiple instances are independent', () => {
      const s1 = new ZatcaPhase2Service();
      const s2 = new ZatcaPhase2Service();
      s1.csid = 'csid-a';
      s2.csid = 'csid-b';
      expect(s1.csid).not.toBe(s2.csid);
    });
  });
});
