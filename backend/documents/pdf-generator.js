/**
 * PDF Generator Service - خدمة توليد PDF
 * Enterprise PDF Generation for Alawael ERP
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * PDF Configuration
 */
const pdfConfig = {
  defaults: {
    format: 'A4',
    orientation: 'portrait',
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    printBackground: true,
  },
  storage: {
    path: process.env.PDF_STORAGE_PATH || './storage/pdfs',
    tempPath: process.env.PDF_TEMP_PATH || './storage/pdfs/temp',
  },
  templatesPath: process.env.PDF_TEMPLATES_PATH || './templates/pdf',
  company: {
    name: process.env.COMPANY_NAME || 'نظام الأهداف ERP',
    address: process.env.COMPANY_ADDRESS || 'المملكة العربية السعودية',
    phone: process.env.COMPANY_PHONE || '',
    email: process.env.COMPANY_EMAIL || '',
    logo: process.env.COMPANY_LOGO || '',
    website: process.env.COMPANY_WEBSITE || '',
  },
};

/**
 * PDF Generator Class
 */
class PDFGenerator {
  constructor() {
    this.config = pdfConfig;
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(data) {
    try {
      const html = this.getInvoiceTemplate(data);
      return await this.generateFromHTML(html);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw error;
    }
  }

  /**
   * Get invoice template
   */
  getInvoiceTemplate(data) {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة رقم ${data.invoiceNumber || ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
    .company-info h1 { color: #2563eb; font-size: 24px; }
    .invoice-info { text-align: left; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th, td { padding: 12px; text-align: right; border-bottom: 1px solid #eee; }
    th { background: #f8fafc; color: #666; font-weight: 600; }
    .totals { width: 300px; margin-right: auto; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-info">
        <h1>${this.config.company.name}</h1>
        <p>${this.config.company.address}</p>
      </div>
      <div class="invoice-info">
        <h2>فاتورة</h2>
        <p>رقم: ${data.invoiceNumber || ''}</p>
        <p>تاريخ: ${data.invoiceDate || ''}</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>الوصف</th>
          <th>الكمية</th>
          <th>السعر</th>
          <th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${Array.isArray(data.items) ? data.items.map(item => \`
          <tr>
            <td>\${item.description || ''}</td>
            <td>\${item.quantity || 0}</td>
            <td>\${item.unitPrice || 0}</td>
            <td>\${item.total || 0}</td>
          </tr>\`
        ).join('') : '<tr><td colspan="4">لا توجد عناصر</td></tr>'}
      </tbody>
    </table>
    <div class="totals">
      <div class="totals-row">
        <span>الإجمالي:</span>
        <span>${data.total || 0}</span>
      </div>
    </div>
    <div class="footer">
      <p>شكراً لتعاملكم معنا</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate from HTML
   */
  async generateFromHTML(html) {
    try {
      // Placeholder for actual PDF generation
      return html;
    } catch (error) {
      console.error('Error generating PDF from HTML:', error);
      throw error;
    }
  }
}

// Export
module.exports = PDFGenerator;
