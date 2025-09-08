/**
 * Finance Management System JavaScript
 * مدير النظام المالي والمحاسبي
 */

class FinanceManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentTab = 'accounts';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboardStats();
        this.loadChartOfAccounts();
        this.createModals();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('[data-bs-toggle="pill"]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.target.getAttribute('data-bs-target').replace('#', '').replace('-tab', '');
                this.switchTab(target);
            });
        });

        // Filter changes
        document.getElementById('accountTypeFilter')?.addEventListener('change', () => this.loadChartOfAccounts());
        document.getElementById('accountStatusFilter')?.addEventListener('change', () => this.loadChartOfAccounts());
    }

    async loadDashboardStats() {
        try {
            const response = await fetch('/api/finance/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    updateDashboardStats(data) {
        document.getElementById('totalAssets').textContent = this.formatCurrency(data.total_assets || 0);
        document.getElementById('totalRevenue').textContent = this.formatCurrency(data.total_revenue || 0);
        document.getElementById('totalExpenses').textContent = this.formatCurrency(data.total_expenses || 0);
        document.getElementById('netIncome').textContent = this.formatCurrency(data.net_income || 0);
    }

    async switchTab(tabName) {
        this.currentTab = tabName;
        
        switch(tabName) {
            case 'accounts':
                await this.loadChartOfAccounts();
                break;
            case 'journal':
                await this.loadJournalEntries();
                break;
            case 'invoices':
                await this.loadInvoices();
                break;
            case 'payments':
                await this.loadPayments();
                break;
            case 'expenses':
                await this.loadExpenses();
                break;
            case 'reports':
                await this.loadReports();
                break;
            case 'assets':
                await this.loadFixedAssets();
                break;
            case 'budgets':
                await this.loadBudgets();
                break;
            case 'banks':
                await this.loadBankAccounts();
                break;
        }
    }

    async loadChartOfAccounts() {
        try {
            const typeFilter = document.getElementById('accountTypeFilter')?.value || '';
            const statusFilter = document.getElementById('accountStatusFilter')?.value || '';
            
            const params = new URLSearchParams();
            if (typeFilter) params.append('account_type', typeFilter);
            if (statusFilter) params.append('is_active', statusFilter);
            
            const response = await fetch(`/api/finance/accounts?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderAccountsTree(data.accounts || []);
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    }

    renderAccountsTree(accounts) {
        const container = document.getElementById('accountsTree');
        if (!container) return;
        
        container.innerHTML = '';
        
        accounts.forEach(account => {
            const accountElement = document.createElement('div');
            accountElement.className = `account-item account-level-${account.level || 1}`;
            accountElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${account.account_code}</strong> - ${account.account_name}
                        <small class="text-muted d-block">${this.getAccountTypeText(account.account_type)}</small>
                    </div>
                    <div class="text-end">
                        <span class="${account.balance >= 0 ? 'balance-positive' : 'balance-negative'}">
                            ${this.formatCurrency(account.balance || 0)}
                        </span>
                        <div>
                            <span class="badge ${account.is_active ? 'bg-success' : 'bg-secondary'}">
                                ${account.is_active ? 'نشط' : 'غير نشط'}
                            </span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(accountElement);
        });
    }

    async loadJournalEntries() {
        try {
            const response = await fetch('/api/finance/journal-entries', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderJournalEntries(data.journal_entries || []);
            }
        } catch (error) {
            console.error('Error loading journal entries:', error);
        }
    }

    renderJournalEntries(entries) {
        const tbody = document.getElementById('journalEntriesTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        entries.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.entry_number}</td>
                <td>${this.formatDate(entry.entry_date)}</td>
                <td>${entry.description}</td>
                <td>${this.formatCurrency(entry.total_amount)}</td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(entry.status)}">
                        ${this.getStatusText(entry.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="financeManager.viewJournalEntry(${entry.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    createModals() {
        const modalsContainer = document.getElementById('modalsContainer');
        if (!modalsContainer) return;
        
        // Add Account Modal
        const addAccountModal = `
            <div class="modal fade" id="addAccountModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">إضافة حساب جديد</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addAccountForm">
                                <div class="mb-3">
                                    <label class="form-label">رمز الحساب</label>
                                    <input type="text" class="form-control" name="account_code" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">اسم الحساب</label>
                                    <input type="text" class="form-control" name="account_name" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">نوع الحساب</label>
                                    <select class="form-select" name="account_type" required>
                                        <option value="asset">أصول</option>
                                        <option value="liability">خصوم</option>
                                        <option value="equity">حقوق ملكية</option>
                                        <option value="revenue">إيرادات</option>
                                        <option value="expense">مصروفات</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">الحساب الأب</label>
                                    <select class="form-select" name="parent_account_id">
                                        <option value="">لا يوجد</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                            <button type="button" class="btn btn-primary" onclick="financeManager.saveAccount()">حفظ</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modalsContainer.innerHTML = addAccountModal;
    }

    async saveAccount() {
        const form = document.getElementById('addAccountForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch('/api/finance/accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                this.showAlert('تم إضافة الحساب بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addAccountModal')).hide();
                form.reset();
                await this.loadChartOfAccounts();
            } else {
                const error = await response.json();
                this.showAlert(error.message || 'حدث خطأ أثناء إضافة الحساب', 'danger');
            }
        } catch (error) {
            console.error('Error saving account:', error);
            this.showAlert('حدث خطأ في الاتصال', 'danger');
        }
    }

    // Utility functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'SAR'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('ar-SA');
    }

    getAccountTypeText(type) {
        const types = {
            'asset': 'أصول',
            'liability': 'خصوم',
            'equity': 'حقوق ملكية',
            'revenue': 'إيرادات',
            'expense': 'مصروفات'
        };
        return types[type] || type;
    }

    getStatusText(status) {
        const statuses = {
            'draft': 'مسودة',
            'posted': 'مرحل',
            'cancelled': 'ملغي'
        };
        return statuses[status] || status;
    }

    getStatusBadgeClass(status) {
        const classes = {
            'draft': 'bg-warning',
            'posted': 'bg-success',
            'cancelled': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container-fluid');
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    // Placeholder methods for other tabs
    async loadInvoices() {
        console.log('Loading invoices...');
    }

    async loadPayments() {
        console.log('Loading payments...');
    }

    async loadExpenses() {
        console.log('Loading expenses...');
    }

    async loadReports() {
        console.log('Loading reports...');
    }

    async loadFixedAssets() {
        console.log('Loading fixed assets...');
    }

    async loadBudgets() {
        console.log('Loading budgets...');
    }

    async loadBankAccounts() {
        console.log('Loading bank accounts...');
    }
}

// Initialize the finance manager when the page loads
let financeManager;
document.addEventListener('DOMContentLoaded', function() {
    financeManager = new FinanceManager();
});
