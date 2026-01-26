/**
 * ===================================================================
 * EXCEL GENERATOR - مولد ملفات Excel
 * ===================================================================
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

class ExcelGenerator {
  /**
   * تصدير الحسابات إلى Excel
   */
  static async exportAccounts(accounts) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Accounts');

    // Add headers
    worksheet.columns = [
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Name (EN)', key: 'nameEn', width: 30 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Active', key: 'isActive', width: 10 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Add data
    accounts.forEach(account => {
      worksheet.addRow({
        code: account.code,
        name: account.name,
        nameEn: account.nameEn,
        type: account.type,
        category: account.category,
        currency: account.currency,
        isActive: account.isActive ? 'Yes' : 'No',
      });
    });

    return await this._saveWorkbook(workbook, 'accounts');
  }

  /**
   * تصدير قيود اليومية إلى Excel
   */
  static async exportJournalEntries(entries) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Journal Entries');

    // Headers
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Reference', key: 'reference', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Account Code', key: 'accountCode', width: 15 },
      { header: 'Account Name', key: 'accountName', width: 30 },
      { header: 'Debit', key: 'debit', width: 15 },
      { header: 'Credit', key: 'credit', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Add data
    entries.forEach(entry => {
      entry.lines.forEach((line, index) => {
        worksheet.addRow({
          date: index === 0 ? new Date(entry.date).toLocaleDateString() : '',
          reference: index === 0 ? entry.reference : '',
          description: line.description || entry.description,
          accountCode: line.accountId.code,
          accountName: line.accountId.name,
          debit: line.debit || 0,
          credit: line.credit || 0,
          status: index === 0 ? entry.status : '',
        });
      });

      // Empty row between entries
      worksheet.addRow({});
    });

    // Format currency columns
    worksheet.getColumn('debit').numFmt = '#,##0.00';
    worksheet.getColumn('credit').numFmt = '#,##0.00';

    return await this._saveWorkbook(workbook, 'journal-entries');
  }

  /**
   * تصدير الفواتير إلى Excel
   */
  static async exportInvoices(invoices) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoices');

    worksheet.columns = [
      { header: 'Invoice #', key: 'invoiceNumber', width: 15 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Due Date', key: 'dueDate', width: 12 },
      { header: 'Customer', key: 'customerName', width: 30 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Tax', key: 'taxAmount', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Paid', key: 'paidAmount', width: 15 },
      { header: 'Remaining', key: 'remainingAmount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    invoices.forEach(invoice => {
      worksheet.addRow({
        invoiceNumber: invoice.invoiceNumber,
        type: invoice.type,
        date: new Date(invoice.date).toLocaleDateString(),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
        customerName: invoice.customerName,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        paidAmount: invoice.paidAmount,
        remainingAmount: invoice.remainingAmount,
        status: invoice.status,
      });
    });

    // Format currency columns
    ['subtotal', 'taxAmount', 'total', 'paidAmount', 'remainingAmount'].forEach(col => {
      worksheet.getColumn(col).numFmt = '#,##0.00';
    });

    return await this._saveWorkbook(workbook, 'invoices');
  }

  /**
   * تصدير تقرير مالي إلى Excel
   */
  static async exportFinancialReport(reportData, reportType) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportType);

    // Title
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = reportData.title || reportType;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Period
    if (reportData.period) {
      worksheet.mergeCells('A2:D2');
      worksheet.getCell('A2').value =
        `Period: ${reportData.period.startDate} to ${reportData.period.endDate}`;
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
    }

    worksheet.addRow([]);

    if (reportType === 'trial-balance') {
      this._addTrialBalanceData(worksheet, reportData);
    } else if (reportType === 'balance-sheet') {
      this._addBalanceSheetData(worksheet, reportData);
    } else if (reportType === 'income-statement') {
      this._addIncomeStatementData(worksheet, reportData);
    }

    return await this._saveWorkbook(workbook, reportType);
  }

  /**
   * إضافة بيانات ميزان المراجعة
   */
  static _addTrialBalanceData(worksheet, data) {
    worksheet.addRow(['Account Code', 'Account Name', 'Debit', 'Credit']);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    data.accounts.forEach(account => {
      worksheet.addRow([account.code, account.name, account.debit, account.credit]);
    });

    worksheet.addRow([]);
    worksheet.addRow(['Total', '', data.totals.debit, data.totals.credit]);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    // Format
    worksheet.getColumn(3).numFmt = '#,##0.00';
    worksheet.getColumn(4).numFmt = '#,##0.00';
  }

  /**
   * إضافة بيانات الميزانية العمومية
   */
  static _addBalanceSheetData(worksheet, data) {
    // Assets
    worksheet.addRow(['ASSETS']).font = { bold: true, size: 12 };
    data.assets.accounts.forEach(account => {
      worksheet.addRow(['', account.name, account.balance]);
    });
    worksheet.addRow(['Total Assets', '', data.assets.total]);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    worksheet.addRow([]);

    // Liabilities
    worksheet.addRow(['LIABILITIES']).font = { bold: true, size: 12 };
    data.liabilities.accounts.forEach(account => {
      worksheet.addRow(['', account.name, account.balance]);
    });
    worksheet.addRow(['Total Liabilities', '', data.liabilities.total]);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    worksheet.addRow([]);

    // Equity
    worksheet.addRow(['EQUITY']).font = { bold: true, size: 12 };
    data.equity.accounts.forEach(account => {
      worksheet.addRow(['', account.name, account.balance]);
    });
    worksheet.addRow(['Total Equity', '', data.equity.total]);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    worksheet.getColumn(3).numFmt = '#,##0.00';
  }

  /**
   * إضافة بيانات قائمة الدخل
   */
  static _addIncomeStatementData(worksheet, data) {
    // Revenue
    worksheet.addRow(['REVENUE']).font = { bold: true, size: 12 };
    data.revenue.accounts.forEach(account => {
      worksheet.addRow(['', account.name, account.balance]);
    });
    worksheet.addRow(['Total Revenue', '', data.revenue.total]);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    worksheet.addRow([]);

    // Expenses
    worksheet.addRow(['EXPENSES']).font = { bold: true, size: 12 };
    data.expenses.accounts.forEach(account => {
      worksheet.addRow(['', account.name, account.balance]);
    });
    worksheet.addRow(['Total Expenses', '', data.expenses.total]);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    worksheet.addRow([]);

    // Net Income
    worksheet.addRow(['NET INCOME', '', data.netIncome.amount]);
    worksheet.getRow(worksheet.rowCount).font = { bold: true, size: 12 };
    worksheet.getRow(worksheet.rowCount).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: data.netIncome.amount >= 0 ? 'FF90EE90' : 'FFFF6B6B' },
    };

    worksheet.getColumn(3).numFmt = '#,##0.00';
  }

  /**
   * حفظ الملف
   */
  static async _saveWorkbook(workbook, name) {
    const filename = `${name}-${Date.now()}.xlsx`;
    const filepath = path.join(__dirname, '../../temp', filename);

    // Create temp directory if not exists
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(filepath);
    return filepath;
  }

  /**
   * تصدير نموذج استيراد الحسابات
   */
  static async exportAccountsTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Accounts Template');

    worksheet.columns = [
      { header: 'Code*', key: 'code', width: 15 },
      { header: 'Name*', key: 'name', width: 30 },
      { header: 'Name (EN)', key: 'nameEn', width: 30 },
      { header: 'Type*', key: 'type', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Currency', key: 'currency', width: 10 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Add example row
    worksheet.addRow({
      code: '1010',
      name: 'الصندوق',
      nameEn: 'Cash',
      type: 'asset',
      category: 'current_asset',
      currency: 'SAR',
    });

    // Add instructions
    worksheet.addRow([]);
    worksheet.addRow(['Instructions:']).font = { bold: true };
    worksheet.addRow(['* Required fields']);
    worksheet.addRow(['Type: asset, liability, equity, revenue, expense']);

    return await this._saveWorkbook(workbook, 'accounts-template');
  }
}

module.exports = ExcelGenerator;
