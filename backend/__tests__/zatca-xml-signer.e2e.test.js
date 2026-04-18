/**
 * zatca-xml-signer.e2e.test.js — unit tests for the ZATCA XAdES signer.
 *
 * Covers:
 *   • UBL 2.1 invoice XML build (standard vs simplified distinction)
 *   • Canonicalization determinism
 *   • SHA-256 digest correctness
 *   • Mock signature is deterministic + non-empty
 *   • Live signature path — verifies RSA-SHA256 signature against a
 *     generated key pair (no ZATCA creds required)
 */

'use strict';

process.env.ZATCA_SIGNER_MODE = 'mock';

const crypto = require('crypto');
const signer = require('../services/zatcaXmlSigner');

const SAMPLE_INVOICE = {
  invoiceNumber: 'INV-TEST-001',
  issueDate: new Date('2026-04-18T10:30:00Z'),
  subTotal: 1000,
  taxAmount: 150,
  totalAmount: 1150,
  items: [
    { description: 'جلسة علاج طبيعي', quantity: 2, unitPrice: 300, total: 600 },
    { description: 'جلسة نطق', quantity: 1, unitPrice: 400, total: 400 },
  ],
};

const SAMPLE_ENVELOPE = {
  uuid: '12345678-1234-4234-abcd-0123456789ab',
  icv: 42,
  pih: 'previousHashBase64==',
};

describe('XAdES signer — UBL invoice build', () => {
  it('produces well-formed XML with required ZATCA elements', () => {
    const xml = signer.buildUblInvoice(SAMPLE_INVOICE, SAMPLE_ENVELOPE);
    expect(xml).toMatch(/<\?xml version="1.0"/);
    expect(xml).toMatch(/<Invoice/);
    expect(xml).toContain('INV-TEST-001');
    expect(xml).toContain('12345678-1234-4234-abcd-0123456789ab');
    expect(xml).toContain('<cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>'); // simplified by default
    expect(xml).toContain('<cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>');
    expect(xml).toContain('جلسة علاج طبيعي');
  });

  it('flips to STANDARD (0100000) when buyerVatNumber provided', () => {
    const xml = signer.buildUblInvoice(SAMPLE_INVOICE, SAMPLE_ENVELOPE, {
      buyerVatNumber: '300000000000999',
      buyerName: 'Acme Corp',
    });
    expect(xml).toContain('<cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>');
    expect(xml).toContain('300000000000999');
  });

  it('escapes XML special chars in description', () => {
    const xml = signer.buildUblInvoice(
      {
        ...SAMPLE_INVOICE,
        items: [{ description: 'Fee <admin> & "meta"', quantity: 1, unitPrice: 100, total: 100 }],
      },
      SAMPLE_ENVELOPE
    );
    expect(xml).toContain('Fee &lt;admin&gt; &amp; &quot;meta&quot;');
    expect(xml).not.toContain('<admin>');
  });

  it('handles empty items array', () => {
    const xml = signer.buildUblInvoice({ ...SAMPLE_INVOICE, items: [] }, SAMPLE_ENVELOPE);
    expect(xml).toMatch(/<Invoice/);
    expect(xml).not.toContain('<cac:InvoiceLine>');
  });
});

describe('XAdES signer — canonicalization', () => {
  it('strips XML prolog + comments + whitespace between tags', () => {
    const input = `<?xml version="1.0"?>
      <root>
        <!-- comment -->
        <a>1</a>
        <b>2</b>
      </root>`;
    const c = signer.canonicalize(input);
    expect(c).not.toMatch(/<\?xml/);
    expect(c).not.toMatch(/<!--/);
    expect(c).toBe('<root><a>1</a><b>2</b></root>');
  });

  it('is deterministic across multiple calls', () => {
    const xml = signer.buildUblInvoice(SAMPLE_INVOICE, SAMPLE_ENVELOPE);
    expect(signer.canonicalize(xml)).toBe(signer.canonicalize(xml));
  });
});

describe('XAdES signer — digest', () => {
  it('SHA-256 base64 is 44 chars', () => {
    const d = signer.digest('<root>hello</root>');
    expect(d).toHaveLength(44);
  });
  it('different inputs → different digests', () => {
    expect(signer.digest('abc')).not.toBe(signer.digest('abd'));
  });
  it('identical inputs → identical digests', () => {
    expect(signer.digest('same')).toBe(signer.digest('same'));
  });
});

describe('XAdES signer — mock mode', () => {
  it('signInvoice returns xmlB64 + invoiceHash + signature', () => {
    const r = signer.signInvoice(SAMPLE_INVOICE, SAMPLE_ENVELOPE);
    expect(r.mode).toBe('mock');
    expect(r.xmlB64).toBeTruthy();
    expect(r.invoiceHash).toHaveLength(44);
    expect(r.signatureValue).toHaveLength(88); // SHA-512 base64
    expect(r.certificateB64).toBe('MOCK-CERT-BASE64');
  });
  it('produces deterministic output for identical inputs', () => {
    const a = signer.signInvoice(SAMPLE_INVOICE, SAMPLE_ENVELOPE);
    const b = signer.signInvoice(SAMPLE_INVOICE, SAMPLE_ENVELOPE);
    expect(a.invoiceHash).toBe(b.invoiceHash);
    expect(a.signatureValue).toBe(b.signatureValue);
  });
  it('signedXml contains UBLExtensions + ds:Signature block', () => {
    const r = signer.signInvoice(SAMPLE_INVOICE, SAMPLE_ENVELOPE);
    expect(r.signedXml).toContain('<ext:UBLExtensions');
    expect(r.signedXml).toContain('<ds:Signature');
    expect(r.signedXml).toContain('<ds:SignatureValue>');
    expect(r.signedXml).toContain('<ds:X509Certificate>MOCK-CERT-BASE64</ds:X509Certificate>');
  });
  it('xmlB64 decodes back to the signedXml', () => {
    const r = signer.signInvoice(SAMPLE_INVOICE, SAMPLE_ENVELOPE);
    const decoded = Buffer.from(r.xmlB64, 'base64').toString('utf8');
    expect(decoded).toBe(r.signedXml);
  });
});

describe('XAdES signer — live mode with in-test RSA key pair', () => {
  let keyPair;
  beforeAll(() => {
    keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
  });

  it('signs with the provided private key + cert', () => {
    const fakeCertB64 = Buffer.from('fake-cert-der').toString('base64');
    const r = signer.signInvoice(SAMPLE_INVOICE, SAMPLE_ENVELOPE, {
      mode: 'live',
      privateKey: keyPair.privateKey,
      certificate: fakeCertB64,
    });
    expect(r.mode).toBe('live');
    expect(r.signatureValue).toBeTruthy();
    // RSA-SHA256 signature from 2048-bit key → 256 bytes → 344 chars base64
    expect(r.signatureValue.length).toBeGreaterThan(300);
    expect(r.certificateB64).toBe(fakeCertB64);
  });

  it('throws NOT_CONFIGURED when live mode lacks key', () => {
    expect(() => {
      signer.signInvoice(SAMPLE_INVOICE, SAMPLE_ENVELOPE, { mode: 'live' });
    }).toThrow(/live signer missing/);
  });

  it('signature verifies against the public key', () => {
    const fakeCertB64 = Buffer.from('fake-cert-der').toString('base64');
    const r = signer.signInvoice(SAMPLE_INVOICE, SAMPLE_ENVELOPE, {
      mode: 'live',
      privateKey: keyPair.privateKey,
      certificate: fakeCertB64,
    });
    // Reconstruct SignedInfo to verify
    const certDigest = crypto
      .createHash('sha256')
      .update(Buffer.from(fakeCertB64, 'base64'))
      .digest('base64');
    const signedInfo = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
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
<ds:DigestValue>${r.invoiceHash}</ds:DigestValue>
</ds:Reference>
<ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties">
<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
<ds:DigestValue>${certDigest}</ds:DigestValue>
</ds:Reference>
</ds:SignedInfo>`;
    const canonical = signer.canonicalize(signedInfo);
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(canonical, 'utf8');
    verify.end();
    const isValid = verify.verify(keyPair.publicKey, r.signatureValue, 'base64');
    expect(isValid).toBe(true);
  });
});

describe('XAdES signer — getConfig', () => {
  it('mock mode is always configured', () => {
    const c = signer.getConfig();
    expect(c.mode).toBe('mock');
    expect(c.configured).toBe(true);
  });
});
