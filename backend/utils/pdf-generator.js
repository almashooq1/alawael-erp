/**
 * ===================================================================
 * PDF GENERATOR - مولد ملفات PDF
 * ===================================================================
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  /**
   * توليد فاتورة PDF
   */
  static async generateInvoice(invoice) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = `invoice-${invoice.invoiceNumber}.pdf`;
        const filepath = path.join(__dirname, '../../temp', filename);

        // إنشاء مجلد temp إذا لم يكن موجوداً
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        this._addInvoiceHeader(doc, invoice);

        // Customer Info
        this._addCustomerInfo(doc, invoice);

        // Items Table
        this._addItemsTable(doc, invoice);

        // Totals
        this._addTotals(doc, invoice);

        // Footer
        this._addFooter(doc, invoice);

        doc.end();

        stream.on('finish', () => {
          resolve(filepath);
        });

        stream.on('error', error => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * إضافة رأس الفاتورة
   */
  static _addInvoiceHeader(doc, invoice) {
    doc
      .fontSize(20)
      .text('INVOICE', 50, 50, { align: 'right' })
      .fontSize(10)
      .text(`Invoice #: ${invoice.invoiceNumber}`, 50, 80, { align: 'right' })
      .text(`Date: ${new Date(invoice.date).toLocaleDateString('en-GB')}`, 50, 95, {
        align: 'right',
      });

    if (invoice.dueDate) {
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}`, 50, 110, {
        align: 'right',
      });
    }

    doc.moveDown();
  }

  /**
   * إضافة معلومات العميل
   */
  static _addCustomerInfo(doc, invoice) {
    doc
      .fontSize(12)
      .text('Bill To:', 50, 150)
      .fontSize(10)
      .text(invoice.customerName, 50, 170)
      .text(invoice.customerAddress || '', 50, 185)
      .text(invoice.customerPhone || '', 50, 200)
      .text(invoice.customerEmail || '', 50, 215);

    doc.moveDown();
  }

  /**
   * إضافة جدول الأصناف
   */
  static _addItemsTable(doc, invoice) {
    const tableTop = 280;
    const itemCodeX = 50;
    const descriptionX = 150;
    const quantityX = 350;
    const priceX = 420;
    const amountX = 490;

    // Table Header
    doc
      .fontSize(10)
      .text('Description', descriptionX, tableTop, { width: 180 })
      .text('Qty', quantityX, tableTop, { width: 50, align: 'right' })
      .text('Price', priceX, tableTop, { width: 60, align: 'right' })
      .text('Amount', amountX, tableTop, { width: 70, align: 'right' });

    // Line under header
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(560, tableTop + 15)
      .stroke();

    // Items
    let position = tableTop + 25;
    invoice.items.forEach((item, index) => {
      const amount = item.quantity * item.unitPrice - (item.discount || 0);

      doc
        .fontSize(9)
        .text(item.description, descriptionX, position, { width: 180 })
        .text(item.quantity.toString(), quantityX, position, { width: 50, align: 'right' })
        .text(item.unitPrice.toFixed(2), priceX, position, { width: 60, align: 'right' })
        .text(amount.toFixed(2), amountX, position, { width: 70, align: 'right' });

      position += 20;

      // Page break if needed
      if (position > 700) {
        doc.addPage();
        position = 50;
      }
    });

    return position;
  }

  /**
   * إضافة الإجماليات
   */
  static _addTotals(doc, invoice) {
    const position = 650;
    const labelX = 400;
    const valueX = 490;

    doc
      .fontSize(10)
      .text('Subtotal:', labelX, position)
      .text(invoice.subtotal.toFixed(2), valueX, position, { width: 70, align: 'right' });

    if (invoice.discountAmount > 0) {
      doc
        .text('Discount:', labelX, position + 20)
        .text(`-${invoice.discountAmount.toFixed(2)}`, valueX, position + 20, {
          width: 70,
          align: 'right',
        });
    }

    doc
      .text('VAT (15%):', labelX, position + 40)
      .text(invoice.taxAmount.toFixed(2), valueX, position + 40, { width: 70, align: 'right' });

    // Line above total
    doc
      .moveTo(400, position + 55)
      .lineTo(560, position + 55)
      .stroke();

    doc
      .fontSize(12)
      .text('Total:', labelX, position + 60, { bold: true })
      .text(`${invoice.currency} ${invoice.total.toFixed(2)}`, valueX, position + 60, {
        width: 70,
        align: 'right',
        bold: true,
      });
  }

  /**
   * إضافة التذييل
   */
  static _addFooter(doc, invoice) {
    doc
      .fontSize(8)
      .text('Thank you for your business!', 50, 750, { align: 'center' })
      .text(invoice.notes || '', 50, 765, { align: 'center' });
  }

  /**
   * توليد تقرير مالي PDF
   */
  static async generateFinancialReport(reportData, reportType) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const filename = `${reportType}-${Date.now()}.pdf`;
        const filepath = path.join(__dirname, '../../temp', filename);

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Title
        doc.fontSize(18).text(reportData.title, { align: 'center' }).moveDown();

        // Period
        if (reportData.period) {
          doc
            .fontSize(10)
            .text(`Period: ${reportData.period.startDate} to ${reportData.period.endDate}`, {
              align: 'center',
            })
            .moveDown(2);
        }

        // Content based on report type
        if (reportType === 'trial-balance') {
          this._addTrialBalanceContent(doc, reportData);
        } else if (reportType === 'balance-sheet') {
          this._addBalanceSheetContent(doc, reportData);
        } else if (reportType === 'income-statement') {
          this._addIncomeStatementContent(doc, reportData);
        }

        doc.end();

        stream.on('finish', () => {
          resolve(filepath);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  static _addTrialBalanceContent(doc, data) {
    doc.fontSize(10);
    data.accounts.forEach(account => {
      doc.text(`${account.code} - ${account.name}`, 50, doc.y);
      doc.text(account.debit.toFixed(2), 400, doc.y - 12, { width: 70, align: 'right' });
      doc.text(account.credit.toFixed(2), 480, doc.y - 12, { width: 70, align: 'right' });
      doc.moveDown(0.5);
    });
  }

  static _addBalanceSheetContent(doc, data) {
    // Assets
    doc.fontSize(12).text('Assets', 50, doc.y).moveDown(0.5);
    doc.fontSize(10);
    data.assets.accounts.forEach(account => {
      doc.text(`${account.name}`, 70, doc.y);
      doc.text(account.balance.toFixed(2), 480, doc.y - 12, { width: 70, align: 'right' });
      doc.moveDown(0.5);
    });
    doc.fontSize(11).text('Total Assets', 70, doc.y);
    doc.text(data.assets.total.toFixed(2), 480, doc.y - 12, { width: 70, align: 'right' });
    doc.moveDown(2);

    // Similar for Liabilities and Equity...
  }

  static _addIncomeStatementContent(doc, data) {
    // Revenue
    doc.fontSize(12).text('Revenue', 50, doc.y).moveDown(0.5);
    doc.fontSize(10);
    data.revenue.accounts.forEach(account => {
      doc.text(`${account.name}`, 70, doc.y);
      doc.text(account.balance.toFixed(2), 480, doc.y - 12, { width: 70, align: 'right' });
      doc.moveDown(0.5);
    });

    // Similar for Expenses...
  }
}

module.exports = PDFGenerator;
