/**
 * مدير التوصيات الذكية للبرامج العلاجية
 * نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
 */

class SmartTherapyRecommendationsManager {
    constructor() {
        this.currentStudentId = null;
        this.currentRecommendationId = null;
        this.recommendations = [];
        this.filteredRecommendations = [];
        this.currentFilter = 'all';
        this.dashboardChart = null;
        this.effectivenessChart = null;
        
        this.init();
    }

    init() {
        this.loadStudents();
        this.setupEventListeners();
        console.log('✅ تم تهيئة مدير التوصيات الذكية للبرامج العلاجية');
    }

    setupEventListeners() {
        // Student selection change
        document.getElementById('studentSelect').addEventListener('change', (e) => {
            this.currentStudentId = e.target.value;
            if (this.currentStudentId) {
                this.loadStudentRecommendations();
            } else {
                this.clearRecommendations();
            }
        });

        // Recommendation type filter
        document.getElementById('recommendationType').addEventListener('change', () => {
            this.filterRecommendations(this.currentFilter);
        });
    }

    async loadStudents() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.showError('لم يتم العثور على رمز المصادقة');
                return;
            }

            const response = await fetch('/api/students', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const students = await response.json();
                this.populateStudentSelect(students);
            } else {
                console.error('خطأ في تحميل قائمة الطلاب');
            }
        } catch (error) {
            console.error('خطأ في الاتصال:', error);
        }
    }

    populateStudentSelect(students) {
        const select = document.getElementById('studentSelect');
        select.innerHTML = '<option value="">-- اختر طالب --</option>';
        
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.first_name} ${student.last_name}`;
            select.appendChild(option);
        });
    }

    async generateRecommendations() {
        if (!this.currentStudentId) {
            this.showError('يرجى اختيار طالب أولاً');
            return;
        }

        this.showLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/smart-therapy/generate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    student_id: this.currentStudentId,
                    recommendation_type: document.getElementById('recommendationType').value || null
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccess('تم إنشاء التوصيات بنجاح');
                await this.loadStudentRecommendations();
            } else {
                const error = await response.json();
                this.showError(error.message || 'خطأ في إنشاء التوصيات');
            }
        } catch (error) {
            console.error('خطأ في إنشاء التوصيات:', error);
            this.showError('خطأ في الاتصال بالخادم');
        } finally {
            this.showLoading(false);
        }
    }

    async loadStudentRecommendations() {
        if (!this.currentStudentId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/smart-therapy/student/${this.currentStudentId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.recommendations = data.recommendations || [];
                this.displayRecommendations();
                this.showFilterTabs(true);
            } else {
                console.error('خطأ في تحميل التوصيات');
            }
        } catch (error) {
            console.error('خطأ في تحميل التوصيات:', error);
        }
    }

    displayRecommendations() {
        const container = document.getElementById('recommendationsContainer');
        
        if (!this.recommendations || this.recommendations.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="fas fa-lightbulb"></i>
                        <h3>لا توجد توصيات حالياً</h3>
                        <p>اضغط على "إنشاء توصيات ذكية" للحصول على توصيات مخصصة لهذا الطالب</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        this.filteredRecommendations.forEach(recommendation => {
            html += this.createRecommendationCard(recommendation);
        });

        container.innerHTML = html;
    }

    createRecommendationCard(recommendation) {
        const priorityClass = `priority-${recommendation.priority_level}`;
        const statusClass = `status-${recommendation.status}`;
        const typeClass = `type-${recommendation.recommendation_type}`;
        
        const typeIcons = {
            'therapy_program': 'fas fa-user-md',
            'intervention': 'fas fa-hands-helping',
            'activity': 'fas fa-puzzle-piece',
            'assessment': 'fas fa-clipboard-check'
        };

        const typeNames = {
            'therapy_program': 'برنامج علاجي',
            'intervention': 'تدخل سلوكي',
            'activity': 'نشاط تعليمي',
            'assessment': 'تقييم شامل'
        };

        const priorityNames = {
            'low': 'منخفضة',
            'medium': 'متوسطة',
            'high': 'عالية',
            'urgent': 'عاجلة'
        };

        const statusNames = {
            'pending': 'قيد المراجعة',
            'approved': 'معتمدة',
            'rejected': 'مرفوضة',
            'implemented': 'قيد التنفيذ',
            'completed': 'مكتملة'
        };

        return `
            <div class="col-md-6 col-lg-4 recommendation-item-wrapper" data-status="${recommendation.status}" data-type="${recommendation.recommendation_type}">
                <div class="recommendation-item" onclick="showRecommendationDetails(${recommendation.id})">
                    <div class="d-flex align-items-start mb-3">
                        <div class="recommendation-type-icon ${typeClass}">
                            <i class="${typeIcons[recommendation.recommendation_type] || 'fas fa-lightbulb'}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h5 class="mb-2">${recommendation.title}</h5>
                            <p class="text-muted mb-2">${typeNames[recommendation.recommendation_type] || recommendation.recommendation_type}</p>
                            <div class="d-flex gap-2 mb-2">
                                <span class="priority-badge ${priorityClass}">
                                    ${priorityNames[recommendation.priority_level] || recommendation.priority_level}
                                </span>
                                <span class="status-badge ${statusClass}">
                                    ${statusNames[recommendation.status] || recommendation.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <p class="mb-3">${recommendation.description}</p>
                    
                    <div class="mb-3">
                        <small class="text-muted">مستوى الثقة:</small>
                        <div class="confidence-bar mt-1">
                            <div class="confidence-fill" style="width: ${(recommendation.confidence_score * 100).toFixed(0)}%"></div>
                        </div>
                        <small class="text-muted">${(recommendation.confidence_score * 100).toFixed(0)}%</small>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>
                            ${new Date(recommendation.generated_at).toLocaleDateString('ar-SA')}
                        </small>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="event.stopPropagation(); showRecommendationDetails(${recommendation.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${recommendation.status === 'pending' ? `
                                <button class="btn btn-outline-success" onclick="event.stopPropagation(); quickApprove(${recommendation.id})">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : ''}
                            ${recommendation.status === 'approved' ? `
                                <button class="btn btn-outline-info" onclick="event.stopPropagation(); quickImplement(${recommendation.id})">
                                    <i class="fas fa-play"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-outline-secondary" onclick="event.stopPropagation(); showFeedbackModal(${recommendation.id})">
                                <i class="fas fa-comment"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    filterRecommendations(status) {
        this.currentFilter = status;
        const typeFilter = document.getElementById('recommendationType').value;
        
        this.filteredRecommendations = this.recommendations.filter(rec => {
            const statusMatch = status === 'all' || rec.status === status;
            const typeMatch = !typeFilter || rec.recommendation_type === typeFilter;
            return statusMatch && typeMatch;
        });

        this.displayRecommendations();
        
        // Update active tab
        document.querySelectorAll('#statusTabs .nav-link').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${status}-tab`).classList.add('active');
    }

    async showRecommendationDetails(recommendationId) {
        this.currentRecommendationId = recommendationId;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/smart-therapy/recommendation/${recommendationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const recommendation = await response.json();
                this.displayRecommendationModal(recommendation);
            } else {
                this.showError('خطأ في تحميل تفاصيل التوصية');
            }
        } catch (error) {
            console.error('خطأ في تحميل التفاصيل:', error);
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    displayRecommendationModal(recommendation) {
        const modal = document.getElementById('recommendationModal');
        const title = document.getElementById('recommendationModalTitle');
        const body = document.getElementById('recommendationModalBody');

        title.textContent = recommendation.title;

        const targetSkills = JSON.parse(recommendation.target_skills || '[]');
        const expectedOutcomes = JSON.parse(recommendation.expected_outcomes || '[]');
        const implementationSteps = JSON.parse(recommendation.implementation_steps || '[]');
        const requiredResources = JSON.parse(recommendation.required_resources || '[]');
        const successMetrics = JSON.parse(recommendation.success_metrics || '[]');

        body.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>معلومات أساسية:</h6>
                    <p><strong>النوع:</strong> ${recommendation.recommendation_type}</p>
                    <p><strong>الأولوية:</strong> ${recommendation.priority_level}</p>
                    <p><strong>مستوى الثقة:</strong> ${(recommendation.confidence_score * 100).toFixed(0)}%</p>
                    <p><strong>الحالة:</strong> ${recommendation.status}</p>
                </div>
                <div class="col-md-6">
                    <h6>التوقيت:</h6>
                    <p><strong>المدة المقدرة:</strong> ${recommendation.estimated_duration} أسبوع</p>
                    <p><strong>عدد الجلسات أسبوعياً:</strong> ${recommendation.frequency_per_week}</p>
                    <p><strong>مدة الجلسة:</strong> ${recommendation.session_duration} دقيقة</p>
                </div>
            </div>
            
            <hr>
            
            <div class="mb-3">
                <h6>الوصف:</h6>
                <p>${recommendation.description}</p>
            </div>
            
            <div class="mb-3">
                <h6>المبرر العلمي:</h6>
                <p>${recommendation.rationale}</p>
            </div>
            
            ${targetSkills.length > 0 ? `
                <div class="mb-3">
                    <h6>المهارات المستهدفة:</h6>
                    <ul>
                        ${targetSkills.map(skill => `<li>${skill}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${expectedOutcomes.length > 0 ? `
                <div class="mb-3">
                    <h6>النتائج المتوقعة:</h6>
                    <ul>
                        ${expectedOutcomes.map(outcome => `<li>${outcome}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${implementationSteps.length > 0 ? `
                <div class="mb-3">
                    <h6>خطوات التنفيذ:</h6>
                    <ol>
                        ${implementationSteps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
            ` : ''}
            
            ${requiredResources.length > 0 ? `
                <div class="mb-3">
                    <h6>الموارد المطلوبة:</h6>
                    <ul>
                        ${requiredResources.map(resource => `<li>${resource}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${successMetrics.length > 0 ? `
                <div class="mb-3">
                    <h6>مقاييس النجاح:</h6>
                    <ul>
                        ${successMetrics.map(metric => `<li>${metric}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;

        // Show/hide action buttons based on status
        const approveBtn = document.getElementById('approveBtn');
        const rejectBtn = document.getElementById('rejectBtn');
        const implementBtn = document.getElementById('implementBtn');

        approveBtn.style.display = recommendation.status === 'pending' ? 'inline-block' : 'none';
        rejectBtn.style.display = recommendation.status === 'pending' ? 'inline-block' : 'none';
        implementBtn.style.display = recommendation.status === 'approved' ? 'inline-block' : 'none';

        new bootstrap.Modal(modal).show();
    }

    async approveRecommendation() {
        await this.updateRecommendationStatus('approved');
    }

    async rejectRecommendation() {
        await this.updateRecommendationStatus('rejected');
    }

    async implementRecommendation() {
        await this.updateRecommendationStatus('implemented');
    }

    async updateRecommendationStatus(status) {
        if (!this.currentRecommendationId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/smart-therapy/recommendation/${this.currentRecommendationId}/${status}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showSuccess(`تم ${status === 'approved' ? 'اعتماد' : status === 'rejected' ? 'رفض' : 'تنفيذ'} التوصية بنجاح`);
                bootstrap.Modal.getInstance(document.getElementById('recommendationModal')).hide();
                await this.loadStudentRecommendations();
            } else {
                const error = await response.json();
                this.showError(error.message || 'خطأ في تحديث حالة التوصية');
            }
        } catch (error) {
            console.error('خطأ في تحديث الحالة:', error);
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    async quickApprove(recommendationId) {
        this.currentRecommendationId = recommendationId;
        await this.updateRecommendationStatus('approved');
    }

    async quickImplement(recommendationId) {
        this.currentRecommendationId = recommendationId;
        await this.updateRecommendationStatus('implemented');
    }

    showFeedbackModal(recommendationId) {
        this.currentRecommendationId = recommendationId;
        new bootstrap.Modal(document.getElementById('feedbackModal')).show();
    }

    async submitFeedback() {
        if (!this.currentRecommendationId) return;

        const form = document.getElementById('feedbackForm');
        const formData = new FormData(form);
        
        const feedbackData = {
            recommendation_id: this.currentRecommendationId,
            evaluator_role: document.getElementById('evaluatorRole').value,
            feedback_type: document.getElementById('feedbackType').value,
            rating: parseFloat(document.getElementById('rating').value),
            feedback_text: document.getElementById('feedbackText').value,
            would_recommend: document.getElementById('wouldRecommend').checked
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/smart-therapy/feedback', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedbackData)
            });

            if (response.ok) {
                this.showSuccess('تم حفظ التقييم بنجاح');
                bootstrap.Modal.getInstance(document.getElementById('feedbackModal')).hide();
                form.reset();
            } else {
                const error = await response.json();
                this.showError(error.message || 'خطأ في حفظ التقييم');
            }
        } catch (error) {
            console.error('خطأ في حفظ التقييم:', error);
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    async showDashboard() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/smart-therapy/dashboard', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayDashboard(data);
            } else {
                this.showError('خطأ في تحميل بيانات لوحة التحكم');
            }
        } catch (error) {
            console.error('خطأ في تحميل لوحة التحكم:', error);
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    displayDashboard(data) {
        const metricsContainer = document.getElementById('dashboardMetrics');
        
        metricsContainer.innerHTML = `
            <div class="metric-card">
                <div class="metric-value">${data.total_recommendations || 0}</div>
                <div class="metric-label">إجمالي التوصيات</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.pending_recommendations || 0}</div>
                <div class="metric-label">قيد المراجعة</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.approved_recommendations || 0}</div>
                <div class="metric-label">معتمدة</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.implemented_recommendations || 0}</div>
                <div class="metric-label">قيد التنفيذ</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(data.average_confidence * 100).toFixed(0)}%</div>
                <div class="metric-label">متوسط مستوى الثقة</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.average_rating.toFixed(1)}</div>
                <div class="metric-label">متوسط التقييم</div>
            </div>
        `;

        this.createDashboardCharts(data);
        new bootstrap.Modal(document.getElementById('dashboardModal')).show();
    }

    createDashboardCharts(data) {
        // Recommendations by Status Chart
        const ctx1 = document.getElementById('recommendationsChart').getContext('2d');
        if (this.dashboardChart) {
            this.dashboardChart.destroy();
        }
        
        this.dashboardChart = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['قيد المراجعة', 'معتمدة', 'مرفوضة', 'قيد التنفيذ', 'مكتملة'],
                datasets: [{
                    data: [
                        data.pending_recommendations || 0,
                        data.approved_recommendations || 0,
                        data.rejected_recommendations || 0,
                        data.implemented_recommendations || 0,
                        data.completed_recommendations || 0
                    ],
                    backgroundColor: [
                        '#6c757d',
                        '#28a745',
                        '#dc3545',
                        '#007bff',
                        '#17a2b8'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'توزيع التوصيات حسب الحالة'
                    }
                }
            }
        });

        // Effectiveness Chart
        const ctx2 = document.getElementById('effectivenessChart').getContext('2d');
        if (this.effectivenessChart) {
            this.effectivenessChart.destroy();
        }
        
        this.effectivenessChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['برنامج علاجي', 'تدخل سلوكي', 'نشاط تعليمي', 'تقييم شامل'],
                datasets: [{
                    label: 'متوسط التقييم',
                    data: [
                        data.therapy_program_rating || 0,
                        data.intervention_rating || 0,
                        data.activity_rating || 0,
                        data.assessment_rating || 0
                    ],
                    backgroundColor: '#007bff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'فعالية أنواع التوصيات'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5
                    }
                }
            }
        });
    }

    showFilterTabs(show) {
        const filterTabs = document.getElementById('filterTabs');
        filterTabs.style.display = show ? 'block' : 'none';
    }

    clearRecommendations() {
        this.recommendations = [];
        this.filteredRecommendations = [];
        this.displayRecommendations();
        this.showFilterTabs(false);
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        const container = document.getElementById('recommendationsContainer');
        
        if (show) {
            spinner.style.display = 'block';
            container.style.display = 'none';
        } else {
            spinner.style.display = 'none';
            container.style.display = 'block';
        }
    }

    showSuccess(message) {
        // Create and show success toast
        this.showToast(message, 'success');
    }

    showError(message) {
        // Create and show error toast
        this.showToast(message, 'error');
    }

    showToast(message, type) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        // Add to page
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.appendChild(toast);
        
        // Show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Global functions for onclick events
let smartTherapyManager;

function generateRecommendations() {
    smartTherapyManager.generateRecommendations();
}

function filterRecommendations(status) {
    smartTherapyManager.filterRecommendations(status);
}

function showRecommendationDetails(id) {
    smartTherapyManager.showRecommendationDetails(id);
}

function approveRecommendation() {
    smartTherapyManager.approveRecommendation();
}

function rejectRecommendation() {
    smartTherapyManager.rejectRecommendation();
}

function implementRecommendation() {
    smartTherapyManager.implementRecommendation();
}

function quickApprove(id) {
    smartTherapyManager.quickApprove(id);
}

function quickImplement(id) {
    smartTherapyManager.quickImplement(id);
}

function showFeedbackModal(id) {
    smartTherapyManager.showFeedbackModal(id);
}

function submitFeedback() {
    smartTherapyManager.submitFeedback();
}

function showDashboard() {
    smartTherapyManager.showDashboard();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    smartTherapyManager = new SmartTherapyRecommendationsManager();
});
