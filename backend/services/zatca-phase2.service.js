/**
 * ZATCA Phase 2 Service — خدمة هيئة الزكاة والضريبة والجمارك (المرحلة الثانية)
 * الفوترة الإلكترونية - Integration Phase
 * منصة فاتورة FATOORA
 */
'use strict';

const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const ZATCA_ENV = process.env.ZATCA_ENV || 'sandbox';
const BASE_URL =
  ZATCA_ENV === 'production'
    ? 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core'
    : 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal';

const COMPLIANCE_API_URL = process.env.ZATCA_COMPLIANCE_API_URL || `${BASE_URL}/compliance`;
const REPORTING_API_URL =
  process.env.ZATCA_REPORTING_API_URL || `${BASE_URL}/invoices/reporting/single`;
const CLEARANCE_API_URL =
  process.env.ZATCA_CLEARANCE_API_URL || `${BASE_URL}/invoices/clearance/single`;

class ZatcaPhase2Service {
  constructor() {
    this.csid = process.env.ZATCA_CSID || '';
    this.secret = process.env.ZATCA_SECRET || '';
    this.pih = process.env.ZATCA_PIH || ''; // Previous Invoice Hash
  }

  // ─── بناء XML الفاتورة ────────────────────────────────────────────────────
  /**
   * بناء XML الفاتورة وفق مواصفات ZATCA UBL 2.1
   */
  buildInvoiceXml(invoiceData) {
    const {
      invoiceNumber,
      invoiceDate,
      invoiceTime,
      sellerName,
      sellerVatNumber,
      sellerAddress,
      buyerName,
      buyerVatNumber,
      buyerAddress,
      lineItems = [],
      taxableAmount,
      vatAmount,
      totalAmount,
      invoiceType = 'standard', // standard | simplified
      currency = 'SAR',
      note = '',
    } = invoiceData;

    const invoiceTypeCode = invoiceType === 'simplified' ? '388' : '380';
    const invoiceSubTypeCode = invoiceType === 'simplified' ? '0200000' : '0100000';

    const lineItemsXml = lineItems
      .map(
        (item, idx) => `
      <cac:InvoiceLine>
        <cbc:ID>${idx + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="${item.unit || 'PCE'}">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${currency}">${item.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
          <cbc:TaxAmount currencyID="${currency}">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>
          <cbc:RoundingAmount currencyID="${currency}">${(item.lineTotal + item.vatAmount).toFixed(2)}</cbc:RoundingAmount>
        </cac:TaxTotal>
        <cac:Item>
          <cbc:Name>${this._escapeXml(item.name)}</cbc:Name>
          <cac:ClassifiedTaxCategory>
            <cbc:ID>${item.vatCategory || 'S'}</cbc:ID>
            <cbc:Percent>${item.vatRate || 15}</cbc:Percent>
            <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
          </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
          <cbc:PriceAmount currencyID="${currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
      </cac:InvoiceLine>`
      )
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${invoiceNumber}</cbc:ID>
  <cbc:UUID>${uuidv4()}</cbc:UUID>
  <cbc:IssueDate>${invoiceDate}</cbc:IssueDate>
  <cbc:IssueTime>${invoiceTime || '00:00:00'}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${invoiceSubTypeCode}">${invoiceTypeCode}</cbc:InvoiceTypeCode>
  <cbc:Note languageID="ar">${this._escapeXml(note)}</cbc:Note>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${currency}</cbc:TaxCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">${sellerVatNumber}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${this._escapeXml(sellerAddress?.street || '')}</cbc:StreetName>
        <cbc:CityName>${this._escapeXml(sellerAddress?.city || 'الرياض')}</cbc:CityName>
        <cbc:PostalZone>${sellerAddress?.zip || '12345'}</cbc:PostalZone>
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
        buyerAddress
          ? `<cac:PostalAddress>
        <cbc:StreetName>${this._escapeXml(buyerAddress.street || '')}</cbc:StreetName>
        <cbc:CityName>${this._escapeXml(buyerAddress.city || '')}</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>`
          : ''
      }
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${vatAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${taxableAmount.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${taxableAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${taxableAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${totalAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${totalAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lineItemsXml}
</Invoice>`;

    return xml;
  }

  // ─── حساب hash الفاتورة ───────────────────────────────────────────────────
  /**
   * حساب SHA-256 hash للفاتورة
   */
  calculateInvoiceHash(xmlContent) {
    return crypto.createHash('sha256').update(xmlContent, 'utf8').digest('base64');
  }

  // ─── توليد QR Code ────────────────────────────────────────────────────────
  /**
   * توليد QR Code وفق مواصفات ZATCA (TLV encoding)
   */
  generateQrCode(invoiceData) {
    const { sellerName, sellerVatNumber, invoiceDate, invoiceTime, totalAmount, vatAmount } =
      invoiceData;

    const fields = [
      { tag: 1, value: sellerName },
      { tag: 2, value: sellerVatNumber },
      { tag: 3, value: `${invoiceDate}T${invoiceTime || '00:00:00'}` },
      { tag: 4, value: totalAmount.toFixed(2) },
      { tag: 5, value: vatAmount.toFixed(2) },
    ];

    const tlvBuffers = fields.map(({ tag, value }) => {
      const valueBuffer = Buffer.from(value, 'utf8');
      const tagBuffer = Buffer.alloc(1);
      tagBuffer.writeUInt8(tag);
      const lengthBuffer = Buffer.alloc(1);
      lengthBuffer.writeUInt8(valueBuffer.length);
      return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
    });

    return Buffer.concat(tlvBuffers).toString('base64');
  }

  // ─── إرسال فاتورة للتقرير (Simplified) ──────────────────────────────────
  /**
   * إرسال فاتورة مبسطة للإبلاغ (Reporting)
   */
  async reportInvoice(invoiceXml, invoiceHash) {
    try {
      const xmlBase64 = Buffer.from(invoiceXml).toString('base64');
      const response = await axios.post(
        REPORTING_API_URL,
        {
          invoiceHash,
          uuid: uuidv4(),
          invoice: xmlBase64,
        },
        {
          headers: {
            'accept-version': 'V2',
            Authorization: `Basic ${Buffer.from(`${this.csid}:${this.secret}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      logger.info('[ZATCA] Invoice reported successfully');
      return { success: true, data: response.data, status: response.status };
    } catch (err) {
      logger.error('[ZATCA] reportInvoice error:', err.response?.data || err.message);
      return {
        success: false,
        error: err.response?.data || err.message,
        status: err.response?.status,
      };
    }
  }

  // ─── إرسال فاتورة للمقاصة (Standard) ────────────────────────────────────
  /**
   * إرسال فاتورة ضريبية للمقاصة (Clearance)
   */
  async clearInvoice(invoiceXml, invoiceHash) {
    try {
      const xmlBase64 = Buffer.from(invoiceXml).toString('base64');
      const response = await axios.post(
        CLEARANCE_API_URL,
        {
          invoiceHash,
          uuid: uuidv4(),
          invoice: xmlBase64,
        },
        {
          headers: {
            'accept-version': 'V2',
            'Clearance-Status': '1',
            Authorization: `Basic ${Buffer.from(`${this.csid}:${this.secret}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      logger.info('[ZATCA] Invoice cleared successfully');
      return { success: true, data: response.data, status: response.status };
    } catch (err) {
      logger.error('[ZATCA] clearInvoice error:', err.response?.data || err.message);
      return {
        success: false,
        error: err.response?.data || err.message,
        status: err.response?.status,
      };
    }
  }

  // ─── معالجة فاتورة كاملة ─────────────────────────────────────────────────
  /**
   * معالجة فاتورة كاملة: بناء XML + حساب hash + QR + إرسال
   */
  async processInvoice(invoiceData) {
    const invoiceType = invoiceData.invoiceType || 'standard';
    const xml = this.buildInvoiceXml(invoiceData);
    const hash = this.calculateInvoiceHash(xml);
    const qrCode = this.generateQrCode(invoiceData);

    let zatcaResult;
    if (invoiceType === 'simplified') {
      zatcaResult = await this.reportInvoice(xml, hash);
    } else {
      zatcaResult = await this.clearInvoice(xml, hash);
    }

    return {
      xml,
      hash,
      qrCode,
      zatcaResult,
      uuid: uuidv4(),
    };
  }

  // ─── فحص التوافق ─────────────────────────────────────────────────────────
  /**
   * فحص تفاصيل التوافق مع ZATCA للفاتورة
   */
  async checkCompliance(invoiceXml, invoiceHash) {
    try {
      const xmlBase64 = Buffer.from(invoiceXml).toString('base64');
      const response = await axios.post(
        COMPLIANCE_API_URL,
        {
          invoiceHash,
          uuid: uuidv4(),
          invoice: xmlBase64,
        },
        {
          headers: {
            'accept-version': 'V2',
            Authorization: `Basic ${Buffer.from(`${this.csid}:${this.secret}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  _escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = new ZatcaPhase2Service();
