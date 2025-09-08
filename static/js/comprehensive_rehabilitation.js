class ComprehensiveRehabilitationManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.currentFilters = {};
        this.charts = {};
        this.selectedBeneficiaryId = null;
        this.init();
    }

    init() {
        this.loadDashboard();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab change events
        document.querySelectorAll('#rehabTabs button').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                if (target === '#assessments') {
                    this.loadAssessments();
                } else if (target === '#plans') {
                    this.loadPlans();
                } else if (target === '#sessions') {
                    this.loadSessions();
                } else if (target === '#reports') {
                    this.loadReports();
                }
            });
        });
    }

    async loadDashboard() {
        try {
            this.showLoading(true);
            const response = await this.makeRequest('/api/comprehensive-rehab/dashboard');
            
            if (response.success) {
                this.updateStatistics(response.data);
                this.loadBeneficiaries();
                this.loadCharts(response.data);
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل لوحة التحكم', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    updateStatistics(data) {
        document.getElementById('totalBeneficiaries').textContent = data.beneficiaries?.total || 0;
        document.getElementById('activePlans').textContent = data.plans?.active || 0;
        document.getElementById('totalSessions').textContent = data.sessions?.total || 0;
        document.getElementById('completionRate').textContent = `${data.sessions?.completion_rate || 0}%`;
    }

    async loadBeneficiaries(page = 1) {
        try {
            const params = new URLSearchParams({
                page: page,
                per_page: this.itemsPerPage,
                ...this.currentFilters
            });

            const response = await this.makeRequest(`/api/comprehensive-rehab/beneficiaries?${params}`);
            
            if (response.success) {
                this.renderBeneficiaries(response.data.beneficiaries);
                this.renderPagination(response.data.pagination, 'beneficiariesPagination');
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل المستفيدين', 'error');
        }
    }

    renderBeneficiaries(beneficiaries) {
        const container = document.getElementById('beneficiariesList');
        
        if (!beneficiaries || beneficiaries.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا يوجد مستفيدين</h5>
                </div>
            `;
            return;
        }

        container.innerHTML = beneficiaries.map(beneficiary => `
            <div class="col-md-6 col-lg-4">
                <div class="card beneficiary-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h6 class="card-title mb-1">${beneficiary.full_name}</h6>
                                <small class="text-muted">${beneficiary.beneficiary_code}</small>
                            </div>
                            <span class="badge bg-primary">${beneficiary.age || 0} سنة</span>
                        </div>
                        
                        <div class="mb-3">
                            <span class="disability-badge bg-info text-white">
                                ${this.getDisabilityLabel(beneficiary.primary_disability)}
                            </span>
                            <span class="severity-badge bg-warning text-dark ms-2">
                                ${this.getSeverityLabel(beneficiary.severity_level)}
                            </span>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>
                                ${this.formatDate(beneficiary.registration_date)}
                            </small>
                            <div>
                                <button class="btn btn-outline-primary btn-sm" onclick="rehab.showBeneficiaryDetails(${beneficiary.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-outline-success btn-sm ms-1" onclick="rehab.createAssessmentForBeneficiary(${beneficiary.id})">
                                    <i class="fas fa-clipboard-check"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async showBeneficiaryDetails(beneficiaryId) {
        try {
            this.showLoading(true);
            const response = await this.makeRequest(`/api/comprehensive-rehab/beneficiaries/${beneficiaryId}`);
            
            if (response.success) {
                this.renderBeneficiaryDetails(response.data);
                this.selectedBeneficiaryId = beneficiaryId;
                new bootstrap.Modal(document.getElementById('beneficiaryDetailsModal')).show();
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل تفاصيل المستفيد', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    renderBeneficiaryDetails(beneficiary) {
        document.getElementById('beneficiaryDetailsTitle').textContent = `تفاصيل المستفيد: ${beneficiary.first_name} ${beneficiary.last_name}`;
        
        const content = document.getElementById('beneficiaryDetailsContent');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <div class="row">
                        <div class="col-md-6">
                            <h6>المعلومات الشخصية</h6>
                            <table class="table table-sm">
                                <tr><td><strong>الاسم الكامل:</strong></td><td>${beneficiary.first_name} ${beneficiary.last_name}</td></tr>
                                <tr><td><strong>الاسم بالعربية:</strong></td><td>${beneficiary.arabic_name || 'غير محدد'}</td></tr>
                                <tr><td><strong>رقم الهوية:</strong></td><td>${beneficiary.national_id || 'غير محدد'}</td></tr>
                                <tr><td><strong>العمر:</strong></td><td>${beneficiary.age || 0} سنة</td></tr>
                                <tr><td><strong>الجنس:</strong></td><td>${beneficiary.gender === 'male' ? 'ذكر' : 'أنثى'}</td></tr>
                                <tr><td><strong>الجنسية:</strong></td><td>${beneficiary.nationality || 'غير محدد'}</td></tr>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <h6>معلومات الإعاقة</h6>
                            <table class="table table-sm">
                                <tr><td><strong>نوع الإعاقة:</strong></td><td>${this.getDisabilityLabel(beneficiary.primary_disability)}</td></tr>
                                <tr><td><strong>مستوى الشدة:</strong></td><td>${this.getSeverityLabel(beneficiary.severity_level)}</td></tr>
                                <tr><td><strong>تاريخ التشخيص:</strong></td><td>${this.formatDate(beneficiary.diagnosis_date)}</td></tr>
                                <tr><td><strong>التشخيص الطبي:</strong></td><td>${beneficiary.medical_diagnosis || 'غير محدد'}</td></tr>
                            </table>
                        </div>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-6">
                            <h6>معلومات الاتصال</h6>
                            <table class="table table-sm">
                                <tr><td><strong>الهاتف:</strong></td><td>${beneficiary.phone || 'غير محدد'}</td></tr>
                                <tr><td><strong>البريد الإلكتروني:</strong></td><td>${beneficiary.email || 'غير محدد'}</td></tr>
                                <tr><td><strong>العنوان:</strong></td><td>${beneficiary.address || 'غير محدد'}</td></tr>
                                <tr><td><strong>المدينة:</strong></td><td>${beneficiary.city || 'غير محدد'}</td></tr>
                            </table>
                        </div>
                        <div class="col-md-6">
                            <h6>جهة الاتصال للطوارئ</h6>
                            <table class="table table-sm">
                                <tr><td><strong>الاسم:</strong></td><td>${beneficiary.emergency_contact_name || 'غير محدد'}</td></tr>
                                <tr><td><strong>الهاتف:</strong></td><td>${beneficiary.emergency_contact_phone || 'غير محدد'}</td></tr>
                                <tr><td><strong>صلة القرابة:</strong></td><td>${beneficiary.emergency_contact_relation || 'غير محدد'}</td></tr>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <h6>إحصائيات المستفيد</h6>
                            <div class="row">
                                <div class="col-6">
                                    <div class="progress-circle bg-primary">
                                        ${beneficiary.assessments_count || 0}
                                    </div>
                                    <small>التقييمات</small>
                                </div>
                                <div class="col-6">
                                    <div class="progress-circle bg-success">
                                        ${beneficiary.active_plans_count || 0}
                                    </div>
                                    <small>الخطط النشطة</small>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-12">
                                    <div class="progress-circle bg-info mx-auto">
                                        ${beneficiary.total_sessions || 0}
                                    </div>
                                    <small>إجمالي الجلسات</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${beneficiary.notes ? `
                    <div class="card mt-3">
                        <div class="card-body">
                            <h6>ملاحظات</h6>
                            <p class="small">${beneficiary.notes}</p>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async createBeneficiary() {
        try {
            const form = document.getElementById('addBeneficiaryForm');
            const formData = new FormData(form);
            
            const beneficiaryData = {
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                arabic_name: formData.get('arabic_name'),
                national_id: formData.get('national_id'),
                date_of_birth: formData.get('date_of_birth'),
                gender: formData.get('gender'),
                nationality: formData.get('nationality'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                address: formData.get('address'),
                city: formData.get('city'),
                primary_disability: formData.get('primary_disability'),
                severity_level: formData.get('severity_level'),
                diagnosis_date: formData.get('diagnosis_date'),
                medical_diagnosis: formData.get('medical_diagnosis'),
                emergency_contact_name: formData.get('emergency_contact_name'),
                emergency_contact_phone: formData.get('emergency_contact_phone'),
                emergency_contact_relation: formData.get('emergency_contact_relation'),
                notes: formData.get('notes')
            };

            this.showLoading(true);
            const response = await this.makeRequest('/api/comprehensive-rehab/beneficiaries', 'POST', beneficiaryData);
            
            if (response.success) {
                this.showAlert('تم إضافة المستفيد بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addBeneficiaryModal')).hide();
                form.reset();
                this.loadBeneficiaries();
                this.loadDashboard();
            }
        } catch (error) {
            this.showAlert('خطأ في إضافة المستفيد', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    filterBeneficiaries() {
        const disability = document.getElementById('disabilityFilter').value;
        const severity = document.getElementById('severityFilter').value;
        
        this.currentFilters = {};
        if (disability) this.currentFilters.disability_type = disability;
        if (severity) this.currentFilters.severity = severity;
        
        this.currentPage = 1;
        this.loadBeneficiaries(1);
    }

    searchBeneficiaries() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        
        if (searchTerm) {
            this.currentFilters.search = searchTerm;
        } else {
            delete this.currentFilters.search;
        }
        
        this.currentPage = 1;
        this.loadBeneficiaries(1);
    }

    loadCharts(data) {
        // Disability Distribution Chart
        if (data.disability_distribution) {
            this.renderDisabilityChart(data.disability_distribution);
        }
        
        // Therapy Distribution Chart
        if (data.therapy_distribution) {
            this.renderTherapyChart(data.therapy_distribution);
        }
    }

    renderDisabilityChart(data) {
        const ctx = document.getElementById('disabilityDistributionChart');
        if (!ctx) return;

        if (this.charts.disabilityChart) {
            this.charts.disabilityChart.destroy();
        }

        this.charts.disabilityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    data: data.map(item => item.count),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderTherapyChart(data) {
        const ctx = document.getElementById('therapyDistributionChart');
        if (!ctx) return;

        if (this.charts.therapyChart) {
            this.charts.therapyChart.destroy();
        }

        this.charts.therapyChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    data: data.map(item => item.count),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Utility methods
    getDisabilityLabel(type) {
        const labels = {
            'physical': 'حركية',
            'intellectual': 'ذهنية/فكرية',
            'sensory': 'حسية',
            'speech_language': 'نطق ولغة',
            'autism_spectrum': 'طيف التوحد',
            'learning_difficulties': 'صعوبات التعلم',
            'behavioral': 'سلوكية',
            'multiple': 'متعددة',
            'rare_diseases': 'أمراض نادرة'
        };
        return labels[type] || 'غير محدد';
    }

    getSeverityLabel(level) {
        const labels = {
            'mild': 'بسيطة',
            'moderate': 'متوسطة',
            'severe': 'شديدة',
            'profound': 'شديدة جداً'
        };
        return labels[level] || 'غير محدد';
    }

    formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    renderPagination(pagination, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !pagination) return;

        const { page, pages, has_prev, has_next } = pagination;
        
        if (pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<ul class="pagination justify-content-center">';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${!has_prev ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="rehab.loadBeneficiaries(${page - 1}); return false;">السابق</a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(pages, page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="rehab.loadBeneficiaries(${i}); return false;">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${!has_next ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="rehab.loadBeneficiaries(${page + 1}); return false;">التالي</a>
            </li>
        `;
        
        paginationHTML += '</ul>';
        container.innerHTML = paginationHTML;
    }

    async makeRequest(url, method = 'GET', data = null) {
        const token = localStorage.getItem('token');
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return await response.json();
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.toggle('d-none', !show);
        }
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    refreshDashboard() {
        this.loadDashboard();
    }

    showAddBeneficiaryModal() {
        new bootstrap.Modal(document.getElementById('addBeneficiaryModal')).show();
    }

    // Enhanced methods with AI integration
    async loadAssessments() {
        try {
            const response = await this.makeRequest('/api/comprehensive-rehab/assessments');
            if (response.success) {
                this.renderAssessments(response.data.assessments);
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل التقييمات', 'error');
        }
    }

    async loadPlans() {
        try {
            const response = await this.makeRequest('/api/comprehensive-rehab/plans');
            if (response.success) {
                this.renderPlans(response.data.plans);
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل الخطط', 'error');
        }
    }

    async loadSessions() {
        try {
            const response = await this.makeRequest('/api/comprehensive-rehab/sessions');
            if (response.success) {
                this.renderSessions(response.data.sessions);
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل الجلسات', 'error');
        }
    }

    async loadReports() {
        try {
            const response = await this.makeRequest('/api/enhanced-rehab/advanced-analytics');
            if (response.success) {
                this.renderAdvancedAnalytics(response.data);
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل التقارير', 'error');
        }
    }

    // AI-Enhanced Features
    async runAIAssessment(assessmentId) {
        try {
            this.showLoading(true);
            const response = await this.makeRequest(`/api/enhanced-rehab/ai-assessment/${assessmentId}`, 'POST');
            
            if (response.success) {
                this.showAlert('تم تحليل التقييم بالذكاء الاصطناعي بنجاح', 'success');
                this.showAIAnalysisResults(response.data);
            }
        } catch (error) {
            this.showAlert('خطأ في تحليل التقييم', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async predictProgress(beneficiaryId, months = 6) {
        try {
            this.showLoading(true);
            const response = await this.makeRequest(`/api/enhanced-rehab/progress-prediction/${beneficiaryId}?months=${months}`);
            
            if (response.success) {
                this.showProgressPrediction(response.data);
            }
        } catch (error) {
            this.showAlert('خطأ في التنبؤ بالتقدم', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async getSmartRecommendations(beneficiaryId) {
        try {
            const response = await this.makeRequest(`/api/enhanced-rehab/smart-recommendations/${beneficiaryId}`);
            
            if (response.success) {
                this.showSmartRecommendations(response.data);
            }
        } catch (error) {
            this.showAlert('خطأ في جلب التوصيات الذكية', 'error');
        }
    }

    async checkNotifications(beneficiaryId) {
        try {
            const response = await this.makeRequest(`/api/enhanced-rehab/notifications/${beneficiaryId}`);
            
            if (response.success && response.data.alerts.length > 0) {
                this.showNotifications(response.data.alerts);
            }
        } catch (error) {
            console.error('خطأ في جلب الإشعارات:', error);
        }
    }

    // UI Enhancement Methods
    showAIAnalysisResults(analysis) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">نتائج التحليل بالذكاء الاصطناعي</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>النتيجة الإجمالية</h6>
                                <div class="progress mb-3">
                                    <div class="progress-bar" style="width: ${analysis.overall_score}%">${analysis.overall_score}%</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h6>نقاط القوة</h6>
                                <ul class="list-unstyled">
                                    ${analysis.strengths.map(strength => `<li><i class="fas fa-check text-success me-2"></i>${this.translateSkill(strength)}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-md-6">
                                <h6>نقاط الضعف</h6>
                                <ul class="list-unstyled">
                                    ${analysis.weaknesses.map(weakness => `<li><i class="fas fa-exclamation-triangle text-warning me-2"></i>${this.translateSkill(weakness)}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <h6>التدخلات المقترحة</h6>
                                <ul class="list-unstyled">
                                    ${analysis.recommended_interventions.map(intervention => `<li><i class="fas fa-lightbulb text-info me-2"></i>${intervention}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        new bootstrap.Modal(modal).show();
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    showProgressPrediction(prediction) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">التنبؤ بالتقدم - ${prediction.prediction_period_months} أشهر</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-8">
                                <canvas id="predictionChart" width="400" height="200"></canvas>
                            </div>
                            <div class="col-md-4">
                                <h6>مستوى الثقة: <span class="badge bg-info">${prediction.confidence_level}</span></h6>
                                <h6 class="mt-3">عوامل المخاطر:</h6>
                                <ul class="list-unstyled">
                                    ${prediction.risk_factors.map(factor => `<li><i class="fas fa-exclamation-triangle text-warning me-2"></i>${factor}</li>`).join('')}
                                </ul>
                                <h6 class="mt-3">الإجراءات المقترحة:</h6>
                                <ul class="list-unstyled">
                                    ${prediction.recommended_actions.map(action => `<li><i class="fas fa-arrow-right text-primary me-2"></i>${action}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
        
        // رسم الرسم البياني للتنبؤ
        setTimeout(() => {
            this.renderPredictionChart(prediction);
        }, 500);
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    renderPredictionChart(prediction) {
        const ctx = document.getElementById('predictionChart');
        if (!ctx) return;

        const skills = Object.keys(prediction.current_scores);
        const currentScores = skills.map(skill => prediction.current_scores[skill]);
        const predictedScores = skills.map(skill => prediction.predicted_scores[skill] || 0);

        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: skills.map(skill => this.translateSkill(skill)),
                datasets: [{
                    label: 'النتائج الحالية',
                    data: currentScores,
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)'
                }, {
                    label: 'التنبؤات',
                    data: predictedScores,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    showNotifications(alerts) {
        const notificationContainer = document.createElement('div');
        notificationContainer.className = 'position-fixed top-0 end-0 p-3';
        notificationContainer.style.zIndex = '9999';
        
        alerts.forEach((alert, index) => {
            setTimeout(() => {
                const toast = document.createElement('div');
                toast.className = `toast show align-items-center text-white bg-${alert.type === 'warning' ? 'warning' : 'info'} border-0`;
                toast.innerHTML = `
                    <div class="d-flex">
                        <div class="toast-body">
                            <strong>${alert.title}</strong><br>
                            ${alert.message}
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                `;
                
                notificationContainer.appendChild(toast);
                
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 5000);
            }, index * 1000);
        });
        
        document.body.appendChild(notificationContainer);
        
        setTimeout(() => {
            if (notificationContainer.parentNode) {
                notificationContainer.remove();
            }
        }, alerts.length * 1000 + 5000);
    }

    translateSkill(skill) {
        const translations = {
            'motor': 'المهارات الحركية',
            'cognitive': 'المهارات المعرفية',
            'communication': 'مهارات التواصل',
            'social': 'المهارات الاجتماعية',
            'sensory': 'المهارات الحسية',
            'daily_living': 'مهارات الحياة اليومية'
        };
        return translations[skill] || skill;
    }

    renderAdvancedAnalytics(data) {
        // تحديث الإحصائيات المتقدمة
        const analyticsContainer = document.getElementById('reportsContent');
        if (!analyticsContainer) return;

        analyticsContainer.innerHTML = `
            <div class="row">
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">معدل التحسن الشهري</h5>
                            <h2 class="text-primary">${data.overview.attendance_rate}%</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">مستفيدين عالي الإمكانات</h5>
                            <h2 class="text-success">${data.predictions_summary.high_potential_beneficiaries}</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">مستفيدين في خطر</h5>
                            <h2 class="text-warning">${data.predictions_summary.at_risk_beneficiaries}</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">تقدم مستقر</h5>
                            <h2 class="text-info">${data.predictions_summary.stable_progress_beneficiaries}</h2>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row mt-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6>فعالية العلاجات</h6>
                        </div>
                        <div class="card-body">
                            <canvas id="therapyEffectivenessChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6>التقدم حسب نوع الإعاقة</h6>
                        </div>
                        <div class="card-body">
                            <canvas id="disabilityProgressChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // رسم الرسوم البيانية المتقدمة
        setTimeout(() => {
            this.renderTherapyEffectivenessChart(data.therapy_effectiveness);
            this.renderDisabilityProgressChart(data.disability_progress);
        }, 500);
    }

    renderTherapyEffectivenessChart(data) {
        const ctx = document.getElementById('therapyEffectivenessChart');
        if (!ctx || !data) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => this.translateTherapyType(item.therapy_type)),
                datasets: [{
                    label: 'متوسط التقدم (%)',
                    data: data.map(item => item.average_progress),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    renderDisabilityProgressChart(data) {
        const ctx = document.getElementById('disabilityProgressChart');
        if (!ctx || !data) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => this.getDisabilityLabel(item.disability_type)),
                datasets: [{
                    data: data.map(item => item.average_score),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    translateTherapyType(type) {
        const translations = {
            'physical_therapy': 'العلاج الطبيعي',
            'occupational_therapy': 'العلاج الوظيفي',
            'speech_therapy': 'علاج النطق',
            'behavioral_therapy': 'العلاج السلوكي'
        };
        return translations[type] || type;
    }

    showCreateAssessmentModal() {
        this.showAlert('ميزة إضافة التقييمات قيد التطوير', 'info');
    }

    showCreatePlanModal() {
        this.showAlert('ميزة إنشاء الخطط قيد التطوير', 'info');
    }

    showCreateSessionModal() {
        this.showAlert('ميزة جدولة الجلسات قيد التطوير', 'info');
    }

    createAssessmentForBeneficiary(beneficiaryId) {
        this.selectedBeneficiaryId = beneficiaryId;
        this.showAlert('ميزة إنشاء التقييم للمستفيد قيد التطوير', 'info');
    }

    showCreatePlanForBeneficiary() {
        this.showAlert('ميزة إنشاء خطة التأهيل قيد التطوير', 'info');
    }

    // Utility functions
    async makeRequest(url, options = {}) {
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            };

            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer') || document.body;
        const alertId = 'alert-' + Date.now();
        
        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show" role="alert">
                <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.insertAdjacentHTML('afterbegin', alertHTML);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    showLoading(show = true) {
        const loadingElement = document.getElementById('loadingSpinner');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    }

    renderPagination(pagination, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !pagination) return;

        const { current_page, total_pages, has_prev, has_next } = pagination;
        
        let paginationHTML = '<nav><ul class="pagination justify-content-center">';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${!has_prev ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="rehabManager.loadBeneficiaries(${current_page - 1})" ${!has_prev ? 'tabindex="-1"' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        // Page numbers
        for (let i = Math.max(1, current_page - 2); i <= Math.min(total_pages, current_page + 2); i++) {
            paginationHTML += `
                <li class="page-item ${i === current_page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="rehabManager.loadBeneficiaries(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${!has_next ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="rehabManager.loadBeneficiaries(${current_page + 1})" ${!has_next ? 'tabindex="-1"' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        paginationHTML += '</ul></nav>';
        container.innerHTML = paginationHTML;
    }

    getDisabilityLabel(type) {
        const labels = {
            'physical': 'حركية',
            'intellectual': 'ذهنية',
            'sensory': 'حسية',
            'speech_language': 'نطق ولغة',
            'autism_spectrum': 'طيف التوحد',
            'learning_difficulties': 'صعوبات التعلم',
            'behavioral': 'سلوكية',
            'multiple': 'متعددة'
        };
        return labels[type] || type;
    }
}

// Initialize the manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.rehabManager = new ComprehensiveRehabilitationManager();
});
