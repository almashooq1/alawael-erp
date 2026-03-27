// نظام إدارة الجودة والتدقيق
class QualityManager {
    constructor() {
        this.qualityStandards = [];
        this.qualityAudits = [];
        this.correctiveActions = [];
        this.complianceChecklists = [];
        this.init();
    }

    init() {
        this.loadQualityStandards();
        this.loadQualityAudits();
        this.loadCorrectiveActions();
        this.loadComplianceChecklists();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            setInterval(() => {
                if (document.getElementById('quality').style.display !== 'none') {
                    this.loadQualityAudits();
                    this.loadCorrectiveActions();
                }
            }, 60000);
        });
    }

    async loadQualityStandards() {
        try {
            const response = await fetch('/api/quality-standards', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.qualityStandards = data.standards;
                this.renderQualityStandards();
            }
        } catch (error) {
            console.error('خطأ في تحميل معايير الجودة:', error);
        }
    }

    async loadQualityAudits() {
        try {
            const response = await fetch('/api/quality-audits', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.qualityAudits = data.audits;
                this.renderQualityAudits();
                this.updateQualityStats();
            }
        } catch (error) {
            console.error('خطأ في تحميل عمليات التدقيق:', error);
        }
    }

    async loadCorrectiveActions() {
        try {
            const response = await fetch('/api/corrective-actions', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.correctiveActions = data.actions;
                this.renderCorrectiveActions();
            }
        } catch (error) {
            console.error('خطأ في تحميل الإجراءات التصحيحية:', error);
        }
    }

    async loadComplianceChecklists() {
        try {
            const response = await fetch('/api/compliance-checklists', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.complianceChecklists = data.checklists;
                this.renderComplianceChecklists();
            }
        } catch (error) {
            console.error('خطأ في تحميل قوائم الامتثال:', error);
        }
    }

    renderQualityStandards() {
        const tbody = document.getElementById('qualityStandardsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.qualityStandards.forEach(standard => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div>
                        <strong>${standard.title}</strong>
                        <br>
                        <small class="text-muted">${standard.category || 'غير مصنف'}</small>
                    </div>
                </td>
                <td>${standard.description || 'لا يوجد وصف'}</td>
                <td>
                    <span class="badge bg-${this.getStandardStatusColor(standard.status)}">
                        ${this.getStandardStatusText(standard.status)}
                    </span>
                </td>
                <td>${standard.version || '1.0'}</td>
                <td>${standard.effective_date ? new Date(standard.effective_date).toLocaleDateString('ar-SA') : 'غير محدد'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="qualityManager.viewStandard(${standard.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="qualityManager.editStandard(${standard.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    renderQualityAudits() {
        const tbody = document.getElementById('qualityAuditsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.qualityAudits.forEach(audit => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div>
                        <strong>${audit.title}</strong>
                        <br>
                        <small class="text-muted">${audit.audit_type || 'تدقيق عام'}</small>
                    </div>
                </td>
                <td>${audit.auditor_name || 'غير محدد'}</td>
                <td>${audit.audit_date ? new Date(audit.audit_date).toLocaleDateString('ar-SA') : 'غير محدد'}</td>
                <td>
                    <span class="badge bg-${this.getAuditStatusColor(audit.status)}">
                        ${this.getAuditStatusText(audit.status)}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${this.getScoreColor(audit.score)}">
                        ${audit.score || 0}%
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="qualityManager.viewAudit(${audit.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="qualityManager.generateReport(${audit.id})">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    renderCorrectiveActions() {
        const tbody = document.getElementById('correctiveActionsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.correctiveActions.forEach(action => {
            const row = document.createElement('tr');
            const isOverdue = new Date(action.due_date) < new Date() && action.status !== 'completed';
            
            if (isOverdue) {
                row.className = 'table-warning';
            }
            
            row.innerHTML = `
                <td>
                    <div>
                        <strong>${action.title}</strong>
                        <br>
                        <small class="text-muted">${action.description || 'لا يوجد وصف'}</small>
                    </div>
                </td>
                <td>${action.assigned_to || 'غير محدد'}</td>
                <td>${action.due_date ? new Date(action.due_date).toLocaleDateString('ar-SA') : 'غير محدد'}</td>
                <td>
                    <span class="badge bg-${this.getActionStatusColor(action.status)}">
                        ${this.getActionStatusText(action.status)}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${this.getPriorityColor(action.priority)}">
                        ${this.getPriorityText(action.priority)}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="qualityManager.viewAction(${action.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${action.status !== 'completed' ? `
                            <button class="btn btn-outline-success" onclick="qualityManager.completeAction(${action.id})">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    renderComplianceChecklists() {
        const tbody = document.getElementById('complianceChecklistsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.complianceChecklists.forEach(checklist => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div>
                        <strong>${checklist.title}</strong>
                        <br>
                        <small class="text-muted">${checklist.category || 'غير مصنف'}</small>
                    </div>
                </td>
                <td>${checklist.description || 'لا يوجد وصف'}</td>
                <td>${checklist.total_items || 0}</td>
                <td>
                    <span class="badge bg-${this.getChecklistStatusColor(checklist.status)}">
                        ${this.getChecklistStatusText(checklist.status)}
                    </span>
                </td>
                <td>${checklist.created_date ? new Date(checklist.created_date).toLocaleDateString('ar-SA') : 'غير محدد'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="qualityManager.viewChecklist(${checklist.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="qualityManager.fillChecklist(${checklist.id})">
                            <i class="fas fa-clipboard-check"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateQualityStats() {
        const totalAudits = this.qualityAudits.length;
        const completedAudits = this.qualityAudits.filter(a => a.status === 'completed').length;
        const pendingActions = this.correctiveActions.filter(a => a.status === 'pending').length;
        const averageScore = this.qualityAudits.length > 0 ? 
            this.qualityAudits.reduce((sum, audit) => sum + (audit.score || 0), 0) / this.qualityAudits.length : 0;

        document.getElementById('totalAudits').textContent = totalAudits;
        document.getElementById('completedAudits').textContent = completedAudits;
        document.getElementById('pendingActions').textContent = pendingActions;
        document.getElementById('averageScore').textContent = averageScore.toFixed(1) + '%';
    }

    getStandardStatusColor(status) {
        const colors = {
            'active': 'success',
            'draft': 'warning',
            'retired': 'secondary'
        };
        return colors[status] || 'secondary';
    }

    getStandardStatusText(status) {
        const texts = {
            'active': 'نشط',
            'draft': 'مسودة',
            'retired': 'متقاعد'
        };
        return texts[status] || 'غير محدد';
    }

    getAuditStatusColor(status) {
        const colors = {
            'planned': 'secondary',
            'in_progress': 'warning',
            'completed': 'success',
            'cancelled': 'danger'
        };
        return colors[status] || 'secondary';
    }

    getAuditStatusText(status) {
        const texts = {
            'planned': 'مخطط',
            'in_progress': 'قيد التنفيذ',
            'completed': 'مكتمل',
            'cancelled': 'ملغي'
        };
        return texts[status] || 'غير محدد';
    }

    getActionStatusColor(status) {
        const colors = {
            'pending': 'warning',
            'in_progress': 'info',
            'completed': 'success',
            'overdue': 'danger'
        };
        return colors[status] || 'secondary';
    }

    getActionStatusText(status) {
        const texts = {
            'pending': 'معلق',
            'in_progress': 'قيد التنفيذ',
            'completed': 'مكتمل',
            'overdue': 'متأخر'
        };
        return texts[status] || 'غير محدد';
    }

    getChecklistStatusColor(status) {
        const colors = {
            'active': 'success',
            'draft': 'warning',
            'archived': 'secondary'
        };
        return colors[status] || 'secondary';
    }

    getChecklistStatusText(status) {
        const texts = {
            'active': 'نشط',
            'draft': 'مسودة',
            'archived': 'مؤرشف'
        };
        return texts[status] || 'غير محدد';
    }

    getPriorityColor(priority) {
        const colors = {
            'low': 'secondary',
            'medium': 'primary',
            'high': 'warning',
            'critical': 'danger'
        };
        return colors[priority] || 'secondary';
    }

    getPriorityText(priority) {
        const texts = {
            'low': 'منخفضة',
            'medium': 'متوسطة',
            'high': 'عالية',
            'critical': 'حرجة'
        };
        return texts[priority] || 'غير محدد';
    }

    getScoreColor(score) {
        if (score >= 90) return 'success';
        if (score >= 70) return 'warning';
        if (score >= 50) return 'info';
        return 'danger';
    }

    async viewStandard(standardId) {
        console.log('عرض معيار الجودة:', standardId);
        // سيتم تنفيذه لاحقاً
    }

    async viewAudit(auditId) {
        try {
            const response = await fetch(`/api/quality-audits/${auditId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const audit = await response.json();
                this.showAuditModal(audit);
            }
        } catch (error) {
            console.error('خطأ في عرض التدقيق:', error);
        }
    }

    showAuditModal(audit) {
        const modalHtml = `
            <div class="modal fade" id="auditModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-clipboard-list me-2"></i>
                                ${audit.title}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <p><strong>المدقق:</strong> ${audit.auditor_name || 'غير محدد'}</p>
                                    <p><strong>تاريخ التدقيق:</strong> ${audit.audit_date ? new Date(audit.audit_date).toLocaleDateString('ar-SA') : 'غير محدد'}</p>
                                    <p><strong>النوع:</strong> ${audit.audit_type || 'تدقيق عام'}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>الحالة:</strong> 
                                        <span class="badge bg-${this.getAuditStatusColor(audit.status)}">
                                            ${this.getAuditStatusText(audit.status)}
                                        </span>
                                    </p>
                                    <p><strong>النتيجة:</strong> 
                                        <span class="badge bg-${this.getScoreColor(audit.score)}">
                                            ${audit.score || 0}%
                                        </span>
                                    </p>
                                </div>
                            </div>
                            
                            ${audit.description ? `
                                <div class="mb-3">
                                    <h6>الوصف:</h6>
                                    <p>${audit.description}</p>
                                </div>
                            ` : ''}
                            
                            ${audit.findings ? `
                                <div class="mb-3">
                                    <h6>النتائج:</h6>
                                    <p>${audit.findings}</p>
                                </div>
                            ` : ''}
                            
                            ${audit.recommendations ? `
                                <div class="mb-3">
                                    <h6>التوصيات:</h6>
                                    <p>${audit.recommendations}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-info" onclick="qualityManager.generateReport(${audit.id})">
                                <i class="fas fa-file-pdf me-2"></i>تقرير
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('auditModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('auditModal'));
        modal.show();
    }

    async completeAction(actionId) {
        if (confirm('هل أنت متأكد من إكمال هذا الإجراء؟')) {
            try {
                const response = await fetch(`/api/corrective-actions/${actionId}/complete`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    this.loadCorrectiveActions();
                    showAlert('تم إكمال الإجراء التصحيحي', 'success');
                }
            } catch (error) {
                console.error('خطأ في إكمال الإجراء:', error);
                showAlert('حدث خطأ في إكمال الإجراء', 'error');
            }
        }
    }

    editStandard(standardId) {
        console.log('تعديل معيار الجودة:', standardId);
        // سيتم تنفيذه لاحقاً
    }

    generateReport(auditId) {
        console.log('إنشاء تقرير التدقيق:', auditId);
        // سيتم تنفيذه لاحقاً
    }

    viewAction(actionId) {
        console.log('عرض الإجراء التصحيحي:', actionId);
        // سيتم تنفيذه لاحقاً
    }

    viewChecklist(checklistId) {
        console.log('عرض قائمة الامتثال:', checklistId);
        // سيتم تنفيذه لاحقاً
    }

    fillChecklist(checklistId) {
        console.log('ملء قائمة الامتثال:', checklistId);
        // سيتم تنفيذه لاحقاً
    }
}

// إنشاء مثيل عام
const qualityManager = new QualityManager();

// دالة مساعدة للتنقل
function showQualitySection() {
    hideAllSections();
    document.getElementById('quality').style.display = 'block';
    qualityManager.loadQualityStandards();
    qualityManager.loadQualityAudits();
    qualityManager.loadCorrectiveActions();
    qualityManager.loadComplianceChecklists();
}
