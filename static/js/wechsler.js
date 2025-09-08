// Wechsler Intelligence Scales Management
class WechslerManager {
    constructor() {
        this.currentAssessment = null;
        this.currentSubtest = null;
        this.subtestItems = [];
        this.currentItemIndex = 0;
        this.init();
    }

    init() {
        this.loadStatistics();
        this.loadAssessments();
        this.loadStudents();
        this.loadAssessors();
        this.setupEventListeners();
        
        // Set today's date as default
        document.getElementById('wechslerAssessmentDate').value = new Date().toISOString().split('T')[0];
    }

    setupEventListeners() {
        // Search and filter
        document.getElementById('wechslerStudentSearch').addEventListener('input', () => this.filterAssessments());
        document.getElementById('scaleTypeFilter').addEventListener('change', () => this.filterAssessments());
        document.getElementById('wechslerStatusFilter').addEventListener('change', () => this.filterAssessments());
        document.getElementById('wechslerDateFrom').addEventListener('change', () => this.filterAssessments());
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/wechsler/statistics', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const stats = await response.json();
                document.getElementById('totalWechslerAssessments').textContent = stats.total_assessments || 0;
                document.getElementById('completedWechslerAssessments').textContent = stats.completed_assessments || 0;
                document.getElementById('inProgressWechslerAssessments').textContent = stats.in_progress_assessments || 0;
                document.getElementById('averageWechslerIQ').textContent = stats.average_iq || 0;
            }
        } catch (error) {
            console.error('Error loading Wechsler statistics:', error);
        }
    }

    async loadAssessments() {
        try {
            this.showLoading();
            const response = await fetch('/api/wechsler/assessments', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const assessments = await response.json();
                this.displayAssessments(assessments);
            } else {
                this.showError('فشل في تحميل التقييمات');
            }
        } catch (error) {
            console.error('Error loading Wechsler assessments:', error);
            this.showError('حدث خطأ في تحميل التقييمات');
        } finally {
            this.hideLoading();
        }
    }

    displayAssessments(assessments) {
        const tbody = document.getElementById('wechslerAssessmentsTableBody');
        const noAssessments = document.getElementById('noWechslerAssessments');

        if (!assessments || assessments.length === 0) {
            tbody.innerHTML = '';
            noAssessments.style.display = 'block';
            return;
        }

        noAssessments.style.display = 'none';
        tbody.innerHTML = assessments.map(assessment => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm bg-primary rounded-circle d-flex align-items-center justify-content-center me-2">
                            <i class="fas fa-user text-white"></i>
                        </div>
                        <div>
                            <div class="fw-medium">${assessment.student_name}</div>
                            <small class="text-muted">${assessment.student_id_number || ''}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge ${this.getScaleBadgeClass(assessment.scale_type)}">${assessment.scale_type}</span>
                    ${assessment.scale_version ? `<br><small class="text-muted">${assessment.scale_version}</small>` : ''}
                </td>
                <td>
                    <div>${this.formatDate(assessment.assessment_date)}</div>
                    ${assessment.assessment_time ? `<small class="text-muted">${assessment.assessment_time}</small>` : ''}
                </td>
                <td>${assessment.assessor_name}</td>
                <td>${this.getStatusBadge(assessment.assessment_status)}</td>
                <td>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar" role="progressbar" style="width: ${assessment.completion_percentage}%"></div>
                    </div>
                    <small class="text-muted">${Math.round(assessment.completion_percentage)}%</small>
                </td>
                <td>
                    ${assessment.full_scale_iq ? 
                        `<span class="badge bg-info">${assessment.full_scale_iq}</span>` : 
                        '<span class="text-muted">-</span>'
                    }
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="wechsler.viewAssessment(${assessment.id})" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${assessment.assessment_status === 'in_progress' ? `
                            <button class="btn btn-outline-success" onclick="wechsler.continueAssessment(${assessment.id})" title="متابعة التقييم">
                                <i class="fas fa-play"></i>
                            </button>
                        ` : ''}
                        ${assessment.assessment_status === 'completed' ? `
                            <button class="btn btn-outline-info" onclick="wechsler.generateReport(${assessment.id})" title="إنشاء تقرير">
                                <i class="fas fa-file-alt"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-outline-danger" onclick="wechsler.deleteAssessment(${assessment.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async loadStudents() {
        try {
            const response = await fetch('/api/students', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const students = await response.json();
                const select = document.getElementById('wechslerStudentSelect');
                select.innerHTML = '<option value="">اختر الطالب</option>' +
                    students.map(student => 
                        `<option value="${student.id}">${student.name} - ${student.id_number || student.id}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading students:', error);
        }
    }

    async loadAssessors() {
        try {
            const response = await fetch('/api/teachers', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const teachers = await response.json();
                const select = document.getElementById('wechslerAssessorSelect');
                select.innerHTML = '<option value="">اختر الفاحص</option>' +
                    teachers.map(teacher => 
                        `<option value="${teacher.id}">${teacher.name}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading assessors:', error);
        }
    }

    async createAssessment() {
        try {
            const form = document.getElementById('newWechslerAssessmentForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const formData = {
                student_id: document.getElementById('wechslerStudentSelect').value,
                assessor_id: document.getElementById('wechslerAssessorSelect').value,
                scale_type: document.getElementById('scaleTypeSelect').value,
                scale_version: document.getElementById('scaleVersionInput').value || null,
                assessment_date: document.getElementById('wechslerAssessmentDate').value,
                assessment_time: document.getElementById('wechslerAssessmentTime').value || null,
                assessment_location: document.getElementById('wechslerAssessmentLocation').value || null,
                language_used: document.getElementById('languageUsed').value,
                testing_conditions: document.getElementById('wechslerTestingConditions').value || null,
                rapport_quality: document.getElementById('wechslerRapportQuality').value || null,
                attention_level: document.getElementById('wechslerAttentionLevel').value || null
            };

            this.showLoading();
            const response = await fetch('/api/wechsler/assessments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccess('تم إنشاء التقييم بنجاح');
                bootstrap.Modal.getInstance(document.getElementById('newWechslerAssessmentModal')).hide();
                form.reset();
                this.loadAssessments();
                this.loadStatistics();
                
                // Ask if user wants to start the assessment immediately
                if (confirm('هل تريد بدء التقييم الآن؟')) {
                    this.continueAssessment(result.id);
                }
            } else {
                const error = await response.json();
                this.showError(error.message || 'فشل في إنشاء التقييم');
            }
        } catch (error) {
            console.error('Error creating Wechsler assessment:', error);
            this.showError('حدث خطأ في إنشاء التقييم');
        } finally {
            this.hideLoading();
        }
    }

    // Utility functions
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    getStatusBadge(status) {
        const statusMap = {
            'in_progress': '<span class="badge bg-warning">قيد التنفيذ</span>',
            'completed': '<span class="badge bg-success">مكتمل</span>',
            'cancelled': '<span class="badge bg-danger">ملغي</span>'
        };
        return statusMap[status] || '<span class="badge bg-secondary">غير محدد</span>';
    }

    getScaleBadgeClass(scaleType) {
        const classMap = {
            'WISC-V': 'bg-primary',
            'WAIS-IV': 'bg-success',
            'WPPSI-IV': 'bg-info'
        };
        return classMap[scaleType] || 'bg-secondary';
    }

    showLoading() {
        document.getElementById('wechslerLoadingSpinner').classList.remove('d-none');
    }

    hideLoading() {
        document.getElementById('wechslerLoadingSpinner').classList.add('d-none');
    }

    showSuccess(message) {
        alert(message);
    }

    showError(message) {
        alert('خطأ: ' + message);
    }

    filterAssessments() {
        this.loadAssessments();
    }

    clearFilters() {
        document.getElementById('wechslerStudentSearch').value = '';
        document.getElementById('scaleTypeFilter').value = '';
        document.getElementById('wechslerStatusFilter').value = '';
        document.getElementById('wechslerDateFrom').value = '';
        this.loadAssessments();
    }

    viewAssessment(assessmentId) {
        // Implementation for viewing assessment details
        console.log('Viewing Wechsler assessment:', assessmentId);
    }

    continueAssessment(assessmentId) {
        // Implementation for continuing assessment
        console.log('Continuing Wechsler assessment:', assessmentId);
    }

    generateReport(assessmentId) {
        // Implementation for generating report
        console.log('Generating Wechsler report:', assessmentId);
    }

    deleteAssessment(assessmentId) {
        if (!confirm('هل أنت متأكد من حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء.')) {
            return;
        }
        // Implementation for deleting assessment
        console.log('Deleting Wechsler assessment:', assessmentId);
    }
}

// Global functions for onclick handlers
function createWechslerAssessment() {
    wechsler.createAssessment();
}

function filterWechslerAssessments() {
    wechsler.filterAssessments();
}

function clearWechslerFilters() {
    wechsler.clearFilters();
}

function updateScaleInfo() {
    const scaleType = document.getElementById('scaleTypeSelect').value;
    const infoAlert = document.getElementById('scaleInfoAlert');
    const infoText = document.getElementById('scaleInfoText');
    
    const scaleInfo = {
        'WISC-V': 'مقياس وكسلر للذكاء للأطفال الإصدار الخامس - مناسب للأعمار من 6 إلى 16 سنة و 11 شهر',
        'WAIS-IV': 'مقياس وكسلر للذكاء للراشدين الإصدار الرابع - مناسب للأعمار من 16 إلى 90 سنة',
        'WPPSI-IV': 'مقياس وكسلر للذكاء لما قبل المدرسة الإصدار الرابع - مناسب للأعمار من 2 سنة و 6 أشهر إلى 7 سنوات و 7 أشهر'
    };
    
    if (scaleType && scaleInfo[scaleType]) {
        infoText.textContent = scaleInfo[scaleType];
        infoAlert.style.display = 'block';
    } else {
        infoAlert.style.display = 'none';
    }
}

// Initialize when DOM is loaded
let wechsler;
document.addEventListener('DOMContentLoaded', function() {
    wechsler = new WechslerManager();
});
