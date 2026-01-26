// Finance Module - Financial Management System
const fs = require('fs');
const path = require('path');

// مسار قاعدة البيانات المالية
const financePath = path.join(__dirname, '../data/finance.json');

// قراءة البيانات المالية
function readFinance() {
  try {
    if (!fs.existsSync(financePath)) {
      const initial = {
        invoices: [],
        expenses: [],
        budgets: [],
        payments: [],
      };
      fs.writeFileSync(financePath, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(financePath, 'utf8'));
  } catch (error) {
    console.error('Error reading finance data:', error);
    return { invoices: [], expenses: [], budgets: [], payments: [] };
  }
}

// كتابة البيانات المالية
function writeFinance(data) {
  try {
    fs.writeFileSync(financePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing finance data:', error);
    return false;
  }
}

// Invoice Model
class Invoice {
  static generateId() {
    return 'INV-' + Date.now();
  }

  static create(data) {
    const finance = readFinance();
    const invoice = {
      _id: this.generateId(),
      invoiceNumber: `INV-${finance.invoices.length + 1}`,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      amount: data.amount,
      items: data.items || [],
      status: 'pending', // pending, paid, overdue
      issueDate: new Date().toISOString(),
      dueDate: data.dueDate,
      createdAt: new Date().toISOString(),
    };
    finance.invoices.push(invoice);
    writeFinance(finance);
    return invoice;
  }

  static findById(id) {
    const finance = readFinance();
    return finance.invoices.find(inv => inv._id === id) || null;
  }

  static findAll() {
    return readFinance().invoices;
  }

  static updateById(id, updates) {
    const finance = readFinance();
    const invoice = finance.invoices.find(inv => inv._id === id);
    if (!invoice) return null;

    Object.assign(invoice, updates, { updatedAt: new Date().toISOString() });
    writeFinance(finance);
    return invoice;
  }

  static deleteById(id) {
    const finance = readFinance();
    const index = finance.invoices.findIndex(inv => inv._id === id);
    if (index === -1) return false;

    finance.invoices.splice(index, 1);
    writeFinance(finance);
    return true;
  }

  static getTotalRevenue() {
    const finance = readFinance();
    return finance.invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }
}

// Expense Model
class Expense {
  static generateId() {
    return 'EXP-' + Date.now();
  }

  static create(data) {
    const finance = readFinance();
    const expense = {
      _id: this.generateId(),
      expenseNumber: `EXP-${finance.expenses.length + 1}`,
      category: data.category, // salary, utilities, materials, etc
      description: data.description,
      amount: data.amount,
      vendor: data.vendor,
      status: 'pending', // pending, approved, rejected
      attachments: data.attachments || [],
      createdAt: new Date().toISOString(),
    };
    finance.expenses.push(expense);
    writeFinance(finance);
    return expense;
  }

  static findAll() {
    return readFinance().expenses;
  }

  static find() {
    return this.findAll();
  }

  static updateById(id, updates) {
    const finance = readFinance();
    const expense = finance.expenses.find(exp => exp._id === id);
    if (!expense) return null;

    Object.assign(expense, updates, { updatedAt: new Date().toISOString() });
    writeFinance(finance);
    return expense;
  }

  static getTotalExpenses(month = null) {
    const finance = readFinance();
    let expenses = finance.expenses.filter(exp => exp.status === 'approved');

    if (month) {
      expenses = expenses.filter(exp => {
        const date = new Date(exp.createdAt);
        return date.getMonth() === month;
      });
    }

    return expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }

  static getByCategoryStats() {
    const finance = readFinance();
    const stats = {};

    finance.expenses.forEach(exp => {
      if (exp.status === 'approved') {
        stats[exp.category] = (stats[exp.category] || 0) + exp.amount;
      }
    });

    return stats;
  }
}

// Budget Model
class Budget {
  static generateId() {
    return 'BUD-' + Date.now();
  }

  static create(data) {
    const finance = readFinance();
    const budget = {
      _id: this.generateId(),
      budgetNumber: `BUD-${finance.budgets.length + 1}`,
      year: data.year,
      month: data.month,
      categories: data.categories || {}, // { salary: 50000, utilities: 5000 }
      notes: data.notes,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    finance.budgets.push(budget);
    writeFinance(finance);
    return budget;
  }

  static getCurrentBudget() {
    const now = new Date();
    const finance = readFinance();

    return (
      finance.budgets.find(
        b => b.year === now.getFullYear() && b.month === now.getMonth() + 1 && b.status === 'active'
      ) || null
    );
  }

  static findAll() {
    return readFinance().budgets;
  }

  static getTotalBudget() {
    const budget = this.getCurrentBudget();
    if (!budget) return 0;

    return Object.values(budget.categories).reduce((sum, amount) => sum + amount, 0);
  }
}

// Payment Model
class Payment {
  static generateId() {
    return 'PAY-' + Date.now();
  }

  static recordPayment(data) {
    const finance = readFinance();
    const payment = {
      _id: this.generateId(),
      paymentNumber: `PAY-${finance.payments.length + 1}`,
      invoiceId: data.invoiceId,
      amount: data.amount,
      method: data.method, // bank, cash, check
      reference: data.reference,
      date: new Date().toISOString(),
      notes: data.notes,
    };
    finance.payments.push(payment);

    // تحديث حالة الفاتورة
    if (data.invoiceId) {
      const invoice = finance.invoices.find(inv => inv._id === data.invoiceId);
      if (invoice) {
        invoice.status = 'paid';
      }
    }

    writeFinance(finance);
    return payment;
  }

  static getAllPayments() {
    return readFinance().payments;
  }

  static getTotalPayments() {
    return this.getAllPayments().reduce((sum, pay) => sum + pay.amount, 0);
  }
}

module.exports = {
  Invoice,
  Expense,
  Budget,
  Payment,
  readFinance,
  writeFinance,
};
