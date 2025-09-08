// نظام إدارة المالية والرسوم
class FinanceManager {
    constructor() {
        this.feeTypes = [];
        this.studentFees = [];
        this.payments = [];
        this.expenses = [];
        this.init();
    }

    init() {
        this.loadFeeTypes();
        this.loadStudentFees();
        this.loadPayments();
        this.loadExpenses();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            setInterval(() => {
                if (document.getElementById('finance').style.display !== 'none') {
                    this.loadPayments();
                    this.loadExpenses();
                }
            }, 60000);
        });
    }

    async loadFeeTypes() {
        try {
            const response = await fetch('/api/fee-types', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.feeTypes = data.fee_types;
                this.populateFeeTypeFilter();
            }
        } catch (error) {
            console.error('خطأ في تحميل أنواع الرسوم:', error);
        }
    }

    async loadStudentFees() {
        try {
            const response = await fetch('/api/student-fees', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.studentFees = data.student_fees;
                this.renderStudentFees();
            }
        } catch (error) {
            console.error('خطأ في تحميل رسوم الطلاب:', error);
        }
    }

    async loadPayments() {
        try {
            const response = await fetch('/api/payments', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.payments = data.payments;
                this.renderPayments();
                this.updateFinanceStats();
            }
        } catch (error) {
            console.error('خطأ في تحميل المدفوعات:', error);
        }
    }

    async loadExpenses() {
        try {
            const response = await fetch('/api/expenses', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.expenses = data.expenses;
                this.renderExpenses();
            }
        } catch (error) {
            console.error('خطأ في تحميل المصروفات:', error);
        }
    }

    renderStudentFees() {
        const tbody = document.getElementById('studentFeesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.studentFees.forEach(fee => {
            const row = document.createElement('tr');
            const isPaid = fee.amount_paid >= fee.amount_due;
            const isOverdue = new Date(fee.due_date) < new Date() && !isPaid;
            
            if (isOverdue) {
                row.className = 'table-danger';
            } else if (isPaid) {
                row.className = 'table-success';
            }
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="profile-placeholder me-2">
                            ${fee.student.name.charAt(0).toUpperCase()}
                        </div>
                        <strong>${fee.student.name}</strong>
                    </div>
                </td>
                <td>${this.getFeeTypeName(fee.fee_type_id)}</td>
                <td>${fee.amount_due} ريال</td>
                <td>${fee.amount_paid} ريال</td>
                <td>${(fee.amount_due - fee.amount_paid)} ريال</td>
                <td>${new Date(fee.due_date).toLocaleDateString('ar-SA')}</td>
                <td>
                    <span class="badge bg-${this.getFeeStatusColor(fee.status)}">
                        ${this.getFeeStatusText(fee.status)}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="financeManager.viewFee(${fee.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!isPaid ? `
                            <button class="btn btn-outline-success" onclick="financeManager.recordPayment(${fee.id})">
                                <i class="fas fa-credit-card"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    renderPayments() {
        const tbody = document.getElementById('paymentsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        // عرض آخر 50 دفعة
        const recentPayments = this.payments.slice(-50).reverse();

        recentPayments.forEach(payment => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="profile-placeholder me-2">
                            ${payment.student.name.charAt(0).toUpperCase()}
                        </div>
                        <strong>${payment.student.name}</strong>
                    </div>
                </td>
                <td>${this.getFeeTypeName(payment.fee_type_id)}</td>
                <td>${payment.amount} ريال</td>
                <td>
                    <span class="badge bg-${this.getPaymentMethodColor(payment.payment_method)}">
                        ${this.getPaymentMethodText(payment.payment_method)}
                    </span>
                </td>
                <td>${new Date(payment.payment_date).toLocaleDateString('ar-SA')}</td>
                <td>${payment.reference_number || 'غير محدد'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="financeManager.viewPayment(${payment.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="financeManager.printReceipt(${payment.id})">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    renderExpenses() {
        const tbody = document.getElementById('expensesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.expenses.forEach(expense => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div>
                        <strong>${expense.description}</strong>
                        <br>
                        <small class="text-muted">${expense.category || 'غير مصنف'}</small>
                    </div>
                </td>
                <td>${expense.amount} ريال</td>
                <td>${new Date(expense.expense_date).toLocaleDateString('ar-SA')}</td>
                <td>
                    <span class="badge bg-${this.getPaymentMethodColor(expense.payment_method)}">
                        ${this.getPaymentMethodText(expense.payment_method)}
                    </span>
                </td>
                <td>${expense.vendor || 'غير محدد'}</td>
                <td>${expense.receipt_number || 'غير محدد'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="financeManager.viewExpense(${expense.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="financeManager.editExpense(${expense.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateFinanceStats() {
        // حساب الإحصائيات المالية
        const totalRevenue = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
        const totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const netProfit = totalRevenue - totalExpenses;
        
        // حساب المستحقات
        const totalDue = this.studentFees.reduce((sum, fee) => sum + (fee.amount_due - fee.amount_paid), 0);

        document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(2) + ' ريال';
        document.getElementById('totalExpenses').textContent = totalExpenses.toFixed(2) + ' ريال';
        document.getElementById('netProfit').textContent = netProfit.toFixed(2) + ' ريال';
        document.getElementById('totalDue').textContent = totalDue.toFixed(2) + ' ريال';
    }

    getFeeTypeName(feeTypeId) {
        const feeType = this.feeTypes.find(ft => ft.id === feeTypeId);
        return feeType ? feeType.name : 'غير محدد';
    }

    getFeeStatusColor(status) {
        const colors = {
            'pending': 'warning',
            'paid': 'success',
            'overdue': 'danger',
            'cancelled': 'secondary'
        };
        return colors[status] || 'secondary';
    }

    getFeeStatusText(status) {
        const texts = {
            'pending': 'معلق',
            'paid': 'مدفوع',
            'overdue': 'متأخر',
            'cancelled': 'ملغي'
        };
        return texts[status] || 'غير محدد';
    }

    getPaymentMethodColor(method) {
        const colors = {
            'cash': 'success',
            'bank_transfer': 'primary',
            'credit_card': 'info',
            'check': 'warning',
            'other': 'secondary'
        };
        return colors[method] || 'secondary';
    }

    getPaymentMethodText(method) {
        const texts = {
            'cash': 'نقدي',
            'bank_transfer': 'تحويل بنكي',
            'credit_card': 'بطاقة ائتمان',
            'check': 'شيك',
            'other': 'أخرى'
        };
        return texts[method] || 'غير محدد';
    }

    populateFeeTypeFilter() {
        const select = document.getElementById('feeTypeFilter');
        if (!select) return;

        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        this.feeTypes.forEach(feeType => {
            const option = document.createElement('option');
            option.value = feeType.id;
            option.textContent = feeType.name;
            select.appendChild(option);
        });
    }

    async viewFee(feeId) {
        try {
            const response = await fetch(`/api/student-fees/${feeId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const fee = await response.json();
                this.showFeeModal(fee);
            }
        } catch (error) {
            console.error('خطأ في عرض الرسوم:', error);
        }
    }

    showFeeModal(fee) {
        const modalHtml = `
            <div class="modal fade" id="feeModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-money-bill-wave me-2"></i>
                                تفاصيل الرسوم - ${fee.student.name}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <p><strong>الطالب:</strong> ${fee.student.name}</p>
                                    <p><strong>نوع الرسوم:</strong> ${this.getFeeTypeName(fee.fee_type_id)}</p>
                                    <p><strong>المبلغ المستحق:</strong> ${fee.amount_due} ريال</p>
                                    <p><strong>المبلغ المدفوع:</strong> ${fee.amount_paid} ريال</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>المبلغ المتبقي:</strong> ${(fee.amount_due - fee.amount_paid)} ريال</p>
                                    <p><strong>تاريخ الاستحقاق:</strong> ${new Date(fee.due_date).toLocaleDateString('ar-SA')}</p>
                                    <p><strong>الحالة:</strong> 
                                        <span class="badge bg-${this.getFeeStatusColor(fee.status)}">
                                            ${this.getFeeStatusText(fee.status)}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            
                            ${fee.notes ? `
                                <div class="mb-3">
                                    <strong>ملاحظات:</strong>
                                    <p>${fee.notes}</p>
                                </div>
                            ` : ''}
                            
                            ${fee.payments && fee.payments.length > 0 ? `
                                <hr>
                                <h6>سجل المدفوعات:</h6>
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>التاريخ</th>
                                                <th>المبلغ</th>
                                                <th>الطريقة</th>
                                                <th>المرجع</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${fee.payments.map(payment => `
                                                <tr>
                                                    <td>${new Date(payment.payment_date).toLocaleDateString('ar-SA')}</td>
                                                    <td>${payment.amount} ريال</td>
                                                    <td>${this.getPaymentMethodText(payment.payment_method)}</td>
                                                    <td>${payment.reference_number || 'غير محدد'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            ${fee.amount_paid < fee.amount_due ? `
                                <button type="button" class="btn btn-success" onclick="financeManager.recordPayment(${fee.id})">
                                    <i class="fas fa-credit-card me-2"></i>تسجيل دفعة
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('feeModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('feeModal'));
        modal.show();
    }

    // فلترة الرسوم
    filterFees() {
        const feeTypeFilter = document.getElementById('feeTypeFilter').value;
        const statusFilter = document.getElementById('feeStatusFilter').value;
        const searchTerm = document.getElementById('feeSearch').value.toLowerCase();

        let filteredFees = this.studentFees;

        if (feeTypeFilter) {
            filteredFees = filteredFees.filter(f => f.fee_type_id == feeTypeFilter);
        }

        if (statusFilter) {
            filteredFees = filteredFees.filter(f => f.status === statusFilter);
        }

        if (searchTerm) {
            filteredFees = filteredFees.filter(f => 
                f.student.name.toLowerCase().includes(searchTerm)
            );
        }

        const originalFees = this.studentFees;
        this.studentFees = filteredFees;
        this.renderStudentFees();
        this.studentFees = originalFees;
    }

    recordPayment(feeId) {
        console.log('تسجيل دفعة للرسوم:', feeId);
        // سيتم تنفيذه لاحقاً - فتح modal تسجيل الدفعة
    }

    viewPayment(paymentId) {
        console.log('عرض الدفعة:', paymentId);
        // سيتم تنفيذه لاحقاً
    }

    printReceipt(paymentId) {
        console.log('طباعة إيصال الدفعة:', paymentId);
        // سيتم تنفيذه لاحقاً
    }

    viewExpense(expenseId) {
        console.log('عرض المصروف:', expenseId);
        // سيتم تنفيذه لاحقاً
    }

    editExpense(expenseId) {
        console.log('تعديل المصروف:', expenseId);
        // سيتم تنفيذه لاحقاً
    }
}

// إنشاء مثيل عام
const financeManager = new FinanceManager();

// دالة مساعدة للتنقل
function showFinanceSection() {
    hideAllSections();
    document.getElementById('finance').style.display = 'block';
    financeManager.loadFeeTypes();
    financeManager.loadStudentFees();
    financeManager.loadPayments();
    financeManager.loadExpenses();
}
