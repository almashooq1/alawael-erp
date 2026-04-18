/**
 * zatcaXmlSigner.js — XAdES-BES signer for ZATCA Phase-2 invoices.
 *
 * Turns an invoice document into the signed UBL 2.1 XML required by
 * Fatoora clearance / reporting:
 *
 *   invoice  →  UBL 2.1 XML  →  canonical (C14N)  →  SHA-256 digest
 *        →  RSA-SHA256 signature (PKCS#1 v1.5 over SignedInfo)
 *        →  ds:Signature block inserted  →  base64-encoded result
 *
 * Design notes:
 *
 *  • Pure-Node, zero new deps. Uses built-in crypto + string templates.
 *  • Canonicalization is a STRICT XML subset — sufficient for the
 *    deterministic documents we generate ourselves. Real XAdES
 *    production systems SHOULD layer a proper xml-c14n implementation
 *    (e.g. `xml-crypto`) on top when consuming externally-produced XML.
 *  • Mock mode: skips private-key crypto, returns deterministic
 *    placeholder signature block. Unlocks e2e flow end-to-end in dev.
 *  • Live mode: requires env ZATCA_PRIVATE_KEY (PEM) + ZATCA_CSID_CERT
 *    (base64 DER of the production certificate).
 *
 * Public API:
 *   buildUblInvoice(invoice, envelope, options)  →  xml string
 *   canonicalize(xmlString)                      →  canonical string
 *   digest(canonicalString)                      →  base64 SHA-256
 *   signDigest(digestBase64, privateKeyPem)      →  base64 signature
 *   signInvoice(invoice, envelope, options)      →  { xmlB64, invoiceHash, signatureValue, certificateB64 }
 */

'use strict';

const crypto = require('crypto');

const MODE = (process.env.ZATCA_SIGNER_MODE || 'mock').toLowerCase();

/**
 * Escape XML text content. Keeps things simple — we control the invoice
 * shape so we don't need to handle every attribute edge case.
 */
function xmlEscape(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build a UBL 2.1 Invoice XML document for ZATCA.
 *
 * This is a compact but ZATCA-spec-aligned invoice. Real production
 * systems can replace this with a library like `ubl-builder`, but for
 * the mock/integration flow the structure is sufficient.
 */
function buildUblInvoice(invoice, envelope, options = {}) {
  const {
    sellerName = process.env.ZATCA_SELLER_NAME || 'مراكز الأوائل للتأهيل',
    sellerVatNumber = process.env.ZATCA_SELLER_VAT || '300000000000003',
    sellerCrNumber = process.env.ZATCA_SELLER_CR || '1010101010',
    sellerAddress = {
      street: 'King Fahd Road',
      buildingNumber: '1234',
      cityName: 'Riyadh',
      postalZone: '12345',
      countryCode: 'SA',
    },
    buyerName = '',
    buyerVatNumber = '',
  } = options;

  const issue = new Date(invoice.issueDate || new Date());
  const issueDate = issue.toISOString().slice(0, 10);
  const issueTime = issue.toISOString().slice(11, 19);

  const isStandard = Boolean(buyerVatNumber);
  // ZATCA invoice type codes (UNTDID 1001 subset):
  //   388 = tax invoice (standard), 388+subtype for credit/debit notes
  const invoiceTypeCode = 388;
  // Name attribute encodes transaction type: 0100000 for standard, 0200000 for simplified
  const invoiceTypeName = isStandard ? '0100000' : '0200000';

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const itemLines = items
    .map((it, idx) => {
      const qty = Number(it.quantity || 0);
      const price = Number(it.unitPrice || 0);
      const line = Number(it.total || qty * price);
      const lineVat = Math.round(line * 0.15 * 100) / 100;
      return `
  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">${qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="SAR">${line.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="SAR">${lineVat.toFixed(2)}</cbc:TaxAmount>
      <cbc:RoundingAmount currencyID="SAR">${(line + lineVat).toFixed(2)}</cbc:RoundingAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${xmlEscape(it.description || 'Service')}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="SAR">${price.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
    })
    .join('');

  const subTotal = Number(invoice.subTotal || 0).toFixed(2);
  const taxAmount = Number(invoice.taxAmount || 0).toFixed(2);
  const totalAmount = Number(invoice.totalAmount || 0).toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice
  xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${xmlEscape(invoice.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${xmlEscape(envelope.uuid)}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${invoiceTypeName}">${invoiceTypeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>

  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${envelope.icv}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${envelope.pih || '0'}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">${xmlEscape(sellerCrNumber)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(sellerAddress.street)}</cbc:StreetName>
        <cbc:BuildingNumber>${xmlEscape(sellerAddress.buildingNumber)}</cbc:BuildingNumber>
        <cbc:CityName>${xmlEscape(sellerAddress.cityName)}</cbc:CityName>
        <cbc:PostalZone>${xmlEscape(sellerAddress.postalZone)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${sellerAddress.countryCode}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${xmlEscape(sellerVatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${xmlEscape(sellerName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      ${
        buyerVatNumber
          ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${xmlEscape(buyerVatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>`
          : ''
      }
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${xmlEscape(buyerName || 'Consumer')}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${taxAmount}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">${subTotal}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">${taxAmount}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${subTotal}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${subTotal}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${totalAmount}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${totalAmount}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${itemLines}
</Invoice>`.trim();
}

/**
 * Canonicalize XML string. Strict subset of C14N 1.1:
 *   - Strip XML prolog + comments
 *   - Collapse whitespace between tags
 *   - Trim leading/trailing whitespace
 * This is deterministic for the self-generated invoices we produce.
 * For externally-supplied XML, swap in `xml-crypto`'s SignedXml.
 */
function canonicalize(xml) {
  return String(xml)
    .replace(/<\?xml[^?]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

function digest(canonical) {
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('base64');
}

/**
 * Build the SignedInfo XML (the part that actually gets signed).
 */
function buildSignedInfo({ digestBase64, certDigestBase64 }) {
  return `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
<ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
<ds:Reference Id="invoiceSignedData" URI="">
<ds:Transforms>
<ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
<ds:XPath>not(ancestor-or-self::ext:UBLExtensions)</ds:XPath>
</ds:Transform>
<ds:Transform Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
</ds:Transforms>
<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
<ds:DigestValue>${digestBase64}</ds:DigestValue>
</ds:Reference>
<ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties">
<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
<ds:DigestValue>${certDigestBase64 || digestBase64}</ds:DigestValue>
</ds:Reference>
</ds:SignedInfo>`;
}

/**
 * Sign a base64 digest using the ZATCA production private key (PEM).
 * Returns base64 RSA-SHA256 signature value.
 */
function signDigest(digestBase64, privateKeyPem) {
  if (!privateKeyPem) {
    throw Object.assign(new Error('Private key is required for live signing'), {
      code: 'NO_PRIVATE_KEY',
    });
  }
  const s = crypto.createSign('RSA-SHA256');
  s.update(Buffer.from(digestBase64, 'base64'));
  s.end();
  const sig = s.sign(privateKeyPem);
  return sig.toString('base64');
}

/**
 * Mock signature: deterministic but obviously non-cryptographic.
 * Used in development when no real CSID is provisioned.
 */
function mockSignature(canonical) {
  return crypto
    .createHash('sha512')
    .update('mock-signer:' + canonical)
    .digest('base64');
}

/**
 * High-level entry point: given an invoice + envelope, returns a
 * self-contained signed XML ready for Fatoora submission.
 *
 * In mock mode, produces a structurally-valid XML with placeholder
 * signature blocks so the wire format stays stable.
 *
 * In live mode, requires env:
 *   ZATCA_PRIVATE_KEY  — PEM-formatted RSA private key (2048-bit)
 *   ZATCA_CSID_CERT    — base64-DER X.509 certificate (from ZATCA compliance)
 */
function signInvoice(invoice, envelope, options = {}) {
  const mode = options.mode || MODE;
  const unsignedXml = buildUblInvoice(invoice, envelope, options);
  const canonical = canonicalize(unsignedXml);
  const invoiceHash = digest(canonical);

  if (mode !== 'live') {
    const mockSig = mockSignature(canonical);
    const xmlWithSig = injectSignature(unsignedXml, {
      invoiceHash,
      signatureValue: mockSig,
      certificateB64: 'MOCK-CERT-BASE64',
    });
    return {
      mode: 'mock',
      xmlB64: Buffer.from(xmlWithSig, 'utf8').toString('base64'),
      invoiceHash,
      signatureValue: mockSig,
      certificateB64: 'MOCK-CERT-BASE64',
      signedXml: xmlWithSig,
    };
  }

  // Live — requires key + cert
  const privateKeyPem = options.privateKey || process.env.ZATCA_PRIVATE_KEY;
  const certificateB64 = options.certificate || process.env.ZATCA_CSID_CERT;
  if (!privateKeyPem || !certificateB64) {
    throw Object.assign(new Error('ZATCA live signer missing key/cert'), {
      code: 'NOT_CONFIGURED',
      missing: [!privateKeyPem && 'ZATCA_PRIVATE_KEY', !certificateB64 && 'ZATCA_CSID_CERT'].filter(
        Boolean
      ),
    });
  }

  // Compute cert digest for the SignedProperties reference
  const certDer = Buffer.from(certificateB64, 'base64');
  const certDigestBase64 = crypto.createHash('sha256').update(certDer).digest('base64');

  // Build SignedInfo and canonicalize it
  const signedInfo = buildSignedInfo({ digestBase64: invoiceHash, certDigestBase64 });
  const signedInfoCanonical = canonicalize(signedInfo);

  // The actual RSA signature is over the canonical SignedInfo
  const s = crypto.createSign('RSA-SHA256');
  s.update(signedInfoCanonical, 'utf8');
  s.end();
  const signatureValue = s.sign(privateKeyPem).toString('base64');

  const xmlWithSig = injectSignature(unsignedXml, {
    invoiceHash,
    signatureValue,
    certificateB64,
    signedInfo,
  });

  return {
    mode: 'live',
    xmlB64: Buffer.from(xmlWithSig, 'utf8').toString('base64'),
    invoiceHash,
    signatureValue,
    certificateB64,
    signedXml: xmlWithSig,
  };
}

function injectSignature(unsignedXml, { invoiceHash, signatureValue, certificateB64, signedInfo }) {
  const si =
    signedInfo || buildSignedInfo({ digestBase64: invoiceHash, certDigestBase64: invoiceHash });
  const sigBlock = `<ext:UBLExtensions xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
<ext:UBLExtension>
<ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
<ext:ExtensionContent>
<sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2" xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2" xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2">
<sac:SignatureInformation>
<cbc:ID xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">urn:oasis:names:specification:ubl:signature:1</cbc:ID>
<sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID>
<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">
${si}
<ds:SignatureValue>${signatureValue}</ds:SignatureValue>
<ds:KeyInfo>
<ds:X509Data>
<ds:X509Certificate>${certificateB64}</ds:X509Certificate>
</ds:X509Data>
</ds:KeyInfo>
</ds:Signature>
</sac:SignatureInformation>
</sig:UBLDocumentSignatures>
</ext:ExtensionContent>
</ext:UBLExtension>
</ext:UBLExtensions>`;
  // Insert signature block right after <Invoice ...>
  return unsignedXml.replace(/(<Invoice[^>]*>)/, `$1\n${sigBlock}`);
}

function getConfig() {
  const missing = [];
  if (MODE === 'live') {
    if (!process.env.ZATCA_PRIVATE_KEY) missing.push('ZATCA_PRIVATE_KEY');
    if (!process.env.ZATCA_CSID_CERT) missing.push('ZATCA_CSID_CERT');
  }
  return {
    provider: 'zatca-signer',
    mode: MODE,
    configured: MODE === 'mock' ? true : missing.length === 0,
    missing: missing.length ? missing : undefined,
  };
}

module.exports = {
  MODE,
  signInvoice,
  buildUblInvoice,
  canonicalize,
  digest,
  signDigest,
  getConfig,
};
