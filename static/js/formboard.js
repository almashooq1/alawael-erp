/**
 * Formboard Test Management System
 * نظام إدارة مقياس لوحة الأشكال
 */

class FormboardManager {
    constructor() {
        this.currentAssessmentId = null;
        this.currentShapeIndex = 0;
        this.currentTrial = 1;
        this.assessments = [];
        this.students = [];
        this.assessors = [];
        this.shapes = [];
        this.timer = null;
        this.startTime = null;
        this.elapsedTime = 0;
        this.isTimerRunning = false;
        this.init();
    }

    init() {
        this.loadStatistics();
        this.loadAssessments();
        this.loadStudents();
        this.loadAssessors();
        this.loadShapes();
        this.setupEventListeners();
        this.setDefaultDate();
    }

    setupEventListeners() {
        document.getElementById('studentFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('assessorFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('ageRangeFilter').addEventListener('change', () => this.applyFilters());
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('assessmentDate').value = today;
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/formboard/statistics', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('totalAssessments').textContent = stats.total_assessments || 0;
                document.getElementById('completedAssessments').textContent = stats.completed_assessments || 0;
                document.getElementById('inProgressAssessments').textContent = stats.in_progress_assessments || 0;
                document.getElementById('averageTime').textContent = stats.average_completion_time || 0;
            }
        } catch (error) {
            console.error('خطأ في تحميل الإحصائيات:', error);
        }
    }

    async loadAssessments() {
        try {
            this.showLoading();
            const response = await fetch('/api/formboard/assessments', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                this.assessments = await response.json();
                this.displayAssessments(this.assessments);
            } else {
                this.showError('فشل في تحميل التقييمات');
            }
        } catch (error) {
            console.error('خطأ في تحميل التقييمات:', error);
            this.showError('حدث خطأ في تحميل التقييمات');
        } finally {
            this.hideLoading();
        }
    }

    async loadStudents() {
        try {
            const response = await fetch('/api/students', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                this.students = await response.json();
                this.populateStudentSelects();
            }
        } catch (error) {
            console.error('خطأ في تحميل الطلاب:', error);
        }
    }

    async loadAssessors() {
        try {
            const response = await fetch('/api/employees', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                this.assessors = await response.json();
                this.populateAssessorSelects();
            }
        } catch (error) {
            console.error('خطأ في تحميل المقيمين:', error);
        }
    }

    async loadShapes() {
        try {
            const response = await fetch('/api/formboard/shapes', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                this.shapes = await response.json();
            }
        } catch (error) {
            console.error('خطأ في تحميل الأشكال:', error);
        }
    }

    populateStudentSelects() {
        const selects = ['studentSelect', 'studentFilter'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const defaultOption = select.querySelector('option[value=""]');
                select.innerHTML = '';
                if (defaultOption) select.appendChild(defaultOption);
                this.students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = `${student.first_name} ${student.last_name}`;
                    select.appendChild(option);
                });
            }
        });
    }

    populateAssessorSelects() {
        const selects = ['assessorSelect', 'assessorFilter'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const defaultOption = select.querySelector('option[value=""]');
                select.innerHTML = '';
                if (defaultOption) select.appendChild(defaultOption);
                this.assessors.forEach(assessor => {
                    const option = document.createElement('option');
                    option.value = assessor.id;
                    option.textContent = `${assessor.first_name} ${assessor.last_name}`;
                    select.appendChild(option);
                });
            }
        });
    }

    displayAssessments(assessments) {
        const tbody = document.getElementById('assessmentsTableBody');
        tbody.innerHTML = '';

        if (assessments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted">
                        <i class="fas fa-inbox fa-2x mb-2"></i>
                        <br>لا توجد تقييمات متاحة
                    </td>
                </tr>
            `;
            return;
        }

        assessments.forEach(assessment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${assessment.id}</td>
                <td>${assessment.student_name || 'غير محدد'}</td>
                <td>${this.calculateAge(assessment.chronological_age_years, assessment.chronological_age_months)}</td>
                <td>${assessment.assessor_name || 'غير محدد'}</td>
                <td>${this.formatDate(assessment.assessment_date)}</td>
                <td>${assessment.shapes_count || 0}</td>
                <td>${this.formatTime(assessment.total_time)}</td>
                <td>${this.getStatusBadge(assessment.status)}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="formboardManager.viewAssessment(${assessment.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="formboardManager.continueAssessment(${assessment.id})">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="formboardManager.generateReport(${assessment.id})">
                            <i class="fas fa-file-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="formboardManager.deleteAssessment(${assessment.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    calculateAge(years, months) {
        if (!years && !months) return 'غير محدد';
        return `${years || 0} سنة ${months || 0} شهر`;
    }

    formatTime(seconds) {
        if (!seconds) return '00:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    getStatusBadge(status) {
        const badges = {
            'in_progress': '<span class="badge bg-warning">قيد التنفيذ</span>',
            'completed': '<span class="badge bg-success">مكتمل</span>',
            'cancelled': '<span class="badge bg-danger">ملغي</span>'
        };
        return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
    }

    formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    async createAssessment() {
        const form = document.getElementById('newAssessmentForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const assessmentData = {
            student_id: document.getElementById('studentSelect').value,
            assessor_id: document.getElementById('assessorSelect').value,
            assessment_date: document.getElementById('assessmentDate').value,
            assessment_type: document.getElementById('assessmentType').value,
            assessment_environment: document.getElementById('assessmentEnvironment').value,
            lighting_conditions: document.getElementById('lightingConditions').value,
            seating_arrangement: document.getElementById('seatingArrangement').value,
            notes: document.getElementById('assessmentNotes').value
        };

        try {
            this.showLoading();
            const response = await fetch('/api/formboard/assessments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(assessmentData)
            });

            if (response.ok) {
                this.showSuccess('تم إنشاء التقييم بنجاح');
                const modal = bootstrap.Modal.getInstance(document.getElementById('newAssessmentModal'));
                modal.hide();
                form.reset();
                this.setDefaultDate();
                await this.loadAssessments();
                await this.loadStatistics();
            } else {
                const error = await response.json();
                this.showError(error.message || 'فشل في إنشاء التقييم');
            }
        } catch (error) {
            console.error('خطأ في إنشاء التقييم:', error);
            this.showError('حدث خطأ في إنشاء التقييم');
        } finally {
            this.hideLoading();
        }
    }

    applyFilters() {
        const studentId = document.getElementById('studentFilter').value;
        const assessorId = document.getElementById('assessorFilter').value;
        const status = document.getElementById('statusFilter').value;
        const ageRange = document.getElementById('ageRangeFilter').value;

        let filteredAssessments = [...this.assessments];

        if (studentId) filteredAssessments = filteredAssessments.filter(a => a.student_id == studentId);
        if (assessorId) filteredAssessments = filteredAssessments.filter(a => a.assessor_id == assessorId);
        if (status) filteredAssessments = filteredAssessments.filter(a => a.status === status);
        if (ageRange) filteredAssessments = filteredAssessments.filter(a => this.matchesAgeRange(a, ageRange));

        this.displayAssessments(filteredAssessments);
    }

    matchesAgeRange(assessment, range) {
        const years = assessment.chronological_age_years || 0;
        switch (range) {
            case '2-4': return years >= 2 && years < 4;
            case '4-6': return years >= 4 && years < 6;
            case '6-8': return years >= 6 && years < 8;
            case '8+': return years >= 8;
            default: return true;
        }
    }

    clearFilters() {
        document.getElementById('studentFilter').value = '';
        document.getElementById('assessorFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('ageRangeFilter').value = '';
        this.displayAssessments(this.assessments);
    }

    showLoading() {
        const modal = new bootstrap.Modal(document.getElementById('loadingModal'));
        modal.show();
    }

    hideLoading() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('loadingModal'));
        if (modal) modal.hide();
    }

    showSuccess(message) {
        alert(message);
    }

    showError(message) {
        alert(message);
    }
}

// إنشاء مثيل عام للمدير
let formboardManager;

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    formboardManager = new FormboardManager();
});

// دوال عامة للاستخدام من HTML
function createAssessment() {
    formboardManager.createAssessment();
}

function applyFilters() {
    formboardManager.applyFilters();
}

function clearFilters() {
    formboardManager.clearFilters();
}
