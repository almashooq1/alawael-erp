const BeneficiaryFile = require('../models/BeneficiaryFile');
const Employee = require('../models/Employee');
const Invoice = require('../models/Invoice');
// const Document = require('../models/Document'); // Enable when ready
const TherapySession = require('../models/TherapySession');

class GlobalSearchService {
  /**
   * Determines the type of query to optimize search
   */
  static detectQueryType(query) {
    if (/^INV-\d{4}-\d+/.test(query) || /^INV-AUTO-/.test(query)) return 'INVOICE_ID';
    if (/^EMP-\d{4}-\d+/.test(query)) return 'EMPLOYEE_ID';
    if (/^PAT-\d{4}-\d+/.test(query)) return 'PATIENT_FILE';
    if (/^\d{4}-\d{2}-\d{2}$/.test(query)) return 'DATE';
    if (/^\d+$/.test(query)) return 'NUMERIC';
    return 'TEXT';
  }

  /**
   * The Master Search Function
   */
  static async search(term) {
    if (!term) return {};

    const type = this.detectQueryType(term);
    const results = {
      metadata: { query: term, type },
      beneficiaries: [],
      employees: [],
      invoices: [],
      sessions: [],
      totalHits: 0,
    };

    const regex = new RegExp(term, 'i'); // Case insensitive

    // 1. Specialized Search (Fast Track)
    if (type === 'INVOICE_ID') {
      const inv = await Invoice.findOne({ invoiceNumber: term });
      if (inv) results.invoices.push(inv);
    } else if (type === 'EMPLOYEE_ID') {
      const emp = await Employee.findOne({ employeeId: term });
      if (emp) results.employees.push(emp);
    } else if (type === 'PATIENT_FILE') {
      const ben = await BeneficiaryFile.findOne({ fileNumber: term });
      if (ben) results.beneficiaries.push(ben);
    }

    // 2. General Fuzzy Search (Parallel Execution)
    else {
      const promises = [
        // Search Beneficiaries
        BeneficiaryFile.find({
          $or: [{ firstName: regex }, { lastName: regex }, { fileNumber: regex }],
        })
          .select('firstName lastName fileNumber phone')
          .limit(5),

        // Search Employees
        Employee.find({
          $or: [{ firstName: regex }, { lastName: regex }, { position: regex }, { department: regex }],
        })
          .select('firstName lastName employeeId position department')
          .limit(5),

        // Search Invoices (if numeric or partial text)
        Invoice.find({
          $or: [{ invoiceNumber: regex }, { status: regex }],
        })
          .select('invoiceNumber totalAmount status createdAt')
          .limit(5),
      ];

      // Add Session Search if date
      if (type === 'DATE') {
        // Not implemented in regex block, usually needs exact date match,
        // but we could parse the date string.
      }

      const [bens, emps, invs] = await Promise.all(promises);

      results.beneficiaries = bens;
      results.employees = emps;
      results.invoices = invs;
    }

    // Calculate Totals
    results.totalHits = results.beneficiaries.length + results.employees.length + results.invoices.length;

    return results;
  }
}

module.exports = GlobalSearchService;
module.exports.instance = new GlobalSearchService();
