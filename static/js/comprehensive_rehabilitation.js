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
      tab.addEventListener('shown.bs.tab', e => {
        const target = e.target.getAttribute('data-bs-target');
        if (target === '#assessments') {
          this.loadAssessments();
        } else if (target === '#plans') {
          this.loadPlans();
        } else if (target === '#sessions') {
          this.loadSessions();
        } else if (target === '#reports') {
          this.loadReports();
        } else if (target === '#riskAssessment') {
          this.loadRiskAssessments();
        } else if (target === '#qualityOfLife') {
          this.loadQualityOfLife();
        } else if (target === '#medications') {
          this.loadMedications();
        } else if (target === '#vitals') {
          this.loadVitals();
        } else if (target === '#homeProgram') {
          this.loadHomeProgram();
        } else if (target === '#teamComm') {
          this.loadTeamCommunications();
        } else if (target === '#waitingList') {
          this.loadWaitingList();
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

  updateStatisticsLegacy(data) {
    // Delegated to the enhanced updateStatistics method
    this.updateStatistics(data);
  }

  async loadBeneficiaries(page = 1) {
    try {
      const params = new URLSearchParams({
        page: page,
        per_page: this.itemsPerPage,
        ...this.currentFilters,
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

    container.innerHTML = beneficiaries
      .map(
        beneficiary => `
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
        `,
      )
      .join('');
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

                    ${
                      beneficiary.notes
                        ? `
                    <div class="card mt-3">
                        <div class="card-body">
                            <h6>ملاحظات</h6>
                            <p class="small">${beneficiary.notes}</p>
                        </div>
                    </div>
                    `
                        : ''
                    }
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
        notes: formData.get('notes'),
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
        datasets: [
          {
            data: data.map(item => item.count),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
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
        datasets: [
          {
            data: data.map(item => item.count),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  }

  // Utility methods
  getDisabilityLabel(type) {
    const labels = {
      physical: 'حركية',
      intellectual: 'ذهنية/فكرية',
      sensory: 'حسية',
      speech_language: 'نطق ولغة',
      autism_spectrum: 'طيف التوحد',
      learning_difficulties: 'صعوبات التعلم',
      behavioral: 'سلوكية',
      multiple: 'متعددة',
      rare_diseases: 'أمراض نادرة',
      cerebral_palsy: 'شلل دماغي',
      down_syndrome: 'متلازمة داون',
      adhd: 'اضطراب فرط الحركة',
      epilepsy: 'صرع',
      spinal_cord_injury: 'إصابة الحبل الشوكي',
      chronic_illness: 'مرض مزمن',
      genetic_disorder: 'اضطراب جيني',
      traumatic_brain_injury: 'إصابة دماغية رضية',
      muscular_dystrophy: 'ضمور عضلي',
      rare_disease: 'مرض نادر',
    };
    return labels[type] || 'غير محدد';
  }

  getSeverityLabel(level) {
    const labels = {
      mild: 'بسيطة',
      moderate: 'متوسطة',
      severe: 'شديدة',
      profound: 'شديدة جداً',
    };
    return labels[level] || 'غير محدد';
  }

  getServiceTypeLabel(type) {
    const labels = {
      physical_therapy: 'علاج طبيعي',
      occupational_therapy: 'علاج وظيفي',
      speech_therapy: 'علاج نطق',
      behavioral_therapy: 'علاج سلوكي',
      psychological_therapy: 'علاج نفسي',
      hydrotherapy: 'علاج مائي',
      music_therapy: 'علاج بالموسيقى',
      art_therapy: 'علاج بالفن',
      hippotherapy: 'علاج بالخيل',
      sensory_integration: 'تكامل حسي',
      early_intervention: 'تدخل مبكر',
      group_therapy: 'علاج جماعي',
      telerehabilitation: 'تأهيل عن بعد',
      recreational_therapy: 'علاج ترفيهي',
      nutrition_counseling: 'إرشاد غذائي',
      cognitive_therapy: 'علاج معرفي',
      play_therapy: 'علاج باللعب',
      aquatic_therapy: 'علاج مائي متقدم',
      robotic_therapy: 'علاج روبوتي',
      virtual_reality_therapy: 'واقع افتراضي علاجي',
    };
    return labels[type] || type;
  }

  getRiskLevelLabel(level) {
    const labels = { low: 'منخفض', medium: 'متوسط', high: 'مرتفع', critical: 'حرج' };
    return labels[level] || level;
  }

  getRiskLevelClass(level) {
    const classes = { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' };
    return classes[level] || 'secondary';
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
        Authorization: `Bearer ${token}`,
      },
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
        datasets: [
          {
            label: 'النتائج الحالية',
            data: currentScores,
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
          },
          {
            label: 'التنبؤات',
            data: predictedScores,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
          },
        },
      },
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

    setTimeout(
      () => {
        if (notificationContainer.parentNode) {
          notificationContainer.remove();
        }
      },
      alerts.length * 1000 + 5000,
    );
  }

  translateSkill(skill) {
    const translations = {
      motor: 'المهارات الحركية',
      cognitive: 'المهارات المعرفية',
      communication: 'مهارات التواصل',
      social: 'المهارات الاجتماعية',
      sensory: 'المهارات الحسية',
      daily_living: 'مهارات الحياة اليومية',
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
        datasets: [
          {
            label: 'متوسط التقدم (%)',
            data: data.map(item => item.average_progress),
            backgroundColor: ['rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 205, 86, 0.8)', 'rgba(75, 192, 192, 0.8)'],
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });
  }

  renderDisabilityProgressChart(data) {
    const ctx = document.getElementById('disabilityProgressChart');
    if (!ctx || !data) return;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(item => this.getDisabilityLabel(item.disability_type)),
        datasets: [
          {
            data: data.map(item => item.average_score),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  }

  translateTherapyType(type) {
    const translations = {
      physical_therapy: 'العلاج الطبيعي',
      occupational_therapy: 'العلاج الوظيفي',
      speech_therapy: 'علاج النطق',
      behavioral_therapy: 'العلاج السلوكي',
      hydrotherapy: 'العلاج المائي',
      music_therapy: 'العلاج بالموسيقى',
      art_therapy: 'العلاج بالفن',
      hippotherapy: 'العلاج بالخيل',
      sensory_integration: 'التكامل الحسي',
      early_intervention: 'التدخل المبكر',
      group_therapy: 'العلاج الجماعي',
      telerehabilitation: 'التأهيل عن بعد',
      recreational_therapy: 'العلاج الترفيهي',
      cognitive_therapy: 'العلاج المعرفي',
      play_therapy: 'العلاج باللعب',
      robotic_therapy: 'العلاج الروبوتي',
      virtual_reality_therapy: 'الواقع الافتراضي',
    };
    return translations[type] || type;
  }

  // =============================================
  // Risk Assessment Methods
  // =============================================
  async loadRiskAssessments() {
    try {
      const response = await this.makeRequest('/api/disability-rehab/dashboard');
      if (response.success) {
        const data = response.data;
        const riskData = data.risk_summary || { low: 0, medium: 0, high: 0, critical: 0 };
        document.getElementById('riskLowCount').textContent = riskData.low || 0;
        document.getElementById('riskMediumCount').textContent = riskData.medium || 0;
        document.getElementById('riskHighCount').textContent = riskData.high || 0;
        document.getElementById('riskCriticalCount').textContent = riskData.critical || 0;
      }
      this.renderRiskList();
    } catch (error) {
      this.showAlert('خطأ في تحميل بيانات المخاطر', 'error');
    }
  }

  async renderRiskList() {
    try {
      const response = await this.makeRequest('/api/disability-rehab/?status=active');
      const container = document.getElementById('riskAssessmentList');
      if (response.success && response.data && response.data.length > 0) {
        container.innerHTML =
          response.data
            .filter(p => p.risk_assessment)
            .map(program => {
              const risk = program.risk_assessment || {};
              return `
                        <div class="card mb-2">
                            <div class="card-body d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1">${program.beneficiary_name || 'مستفيد'}</h6>
                                    <small class="text-muted">آخر تقييم: ${this.formatDate(risk.last_assessment_date)}</small>
                                </div>
                                <div class="d-flex align-items-center">
                                    <span class="badge bg-${this.getRiskLevelClass(risk.overall_risk)} me-2">
                                        ${this.getRiskLevelLabel(risk.overall_risk)}
                                    </span>
                                    <button class="btn btn-outline-warning btn-sm" onclick="rehab.editRiskAssessment('${program._id}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
            })
            .join('') || '<div class="text-center py-3 text-muted">لا توجد تقييمات مخاطر مسجلة</div>';
      } else {
        container.innerHTML = '<div class="text-center py-3 text-muted">لا توجد تقييمات مخاطر مسجلة</div>';
      }
    } catch (error) {
      console.error('Error loading risk list:', error);
    }
  }

  showAddRiskAssessmentModal() {
    this.populateBeneficiarySelect('riskBeneficiarySelect');
    new bootstrap.Modal(document.getElementById('addRiskAssessmentModal')).show();
  }

  async saveRiskAssessment() {
    try {
      const form = document.getElementById('riskAssessmentForm');
      const formData = new FormData(form);
      const programId = formData.get('program_id');

      if (!programId) {
        this.showAlert('يرجى اختيار المستفيد', 'error');
        return;
      }

      const riskData = {
        fall_risk: {
          level: formData.get('fall_risk_level'),
          preventive_measures:
            formData
              .get('fall_preventive_measures')
              ?.split(',')
              .map(s => s.trim()) || [],
        },
        behavioral_risk: {
          level: formData.get('behavioral_risk_level'),
          triggers:
            formData
              .get('behavioral_triggers')
              ?.split(',')
              .map(s => s.trim()) || [],
        },
        medical_risk: {
          level: formData.get('medical_risk_level'),
          conditions:
            formData
              .get('medical_conditions')
              ?.split(',')
              .map(s => s.trim()) || [],
        },
        overall_risk: formData.get('overall_risk'),
        notes: formData.get('risk_notes'),
      };

      this.showLoading(true);
      const response = await this.makeRequest(`/api/disability-rehab/${programId}/risk-assessment`, 'PUT', riskData);
      if (response.success) {
        this.showAlert('تم حفظ تقييم المخاطر بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addRiskAssessmentModal')).hide();
        form.reset();
        this.loadRiskAssessments();
      }
    } catch (error) {
      this.showAlert('خطأ في حفظ تقييم المخاطر', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  editRiskAssessment(programId) {
    this.showAddRiskAssessmentModal();
    const select = document.getElementById('riskBeneficiarySelect');
    if (select) select.value = programId;
  }

  // =============================================
  // Quality of Life Methods
  // =============================================
  async loadQualityOfLife() {
    try {
      const response = await this.makeRequest('/api/disability-rehab/dashboard');
      if (response.success && response.data) {
        const qol = response.data.avg_qol || {};
        const domains = [
          'physical_health',
          'psychological',
          'social',
          'environment',
          'independence',
          'community',
          'emotional',
          'satisfaction',
        ];
        const domainIds = [
          'physical_health',
          'psychological',
          'social',
          'environment',
          'independence',
          'community',
          'emotional',
          'satisfaction',
        ];

        domainIds.forEach((id, idx) => {
          const val = qol[domains[idx]] || 0;
          const fill = document.getElementById(`qol_${id}`);
          const valEl = document.getElementById(`qol_${id}_val`);
          if (fill) fill.style.width = `${val}%`;
          if (valEl) valEl.textContent = `${val}%`;
        });

        this.renderQoLRadarChart(qol);
      }
    } catch (error) {
      this.showAlert('خطأ في تحميل مؤشرات جودة الحياة', 'error');
    }
  }

  renderQoLRadarChart(qol) {
    const ctx = document.getElementById('qolRadarChart');
    if (!ctx) return;

    if (this.charts.qolRadar) this.charts.qolRadar.destroy();

    this.charts.qolRadar = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: [
          'الصحة الجسدية',
          'الصحة النفسية',
          'العلاقات الاجتماعية',
          'البيئة',
          'الاستقلالية',
          'المشاركة المجتمعية',
          'الرفاهية العاطفية',
          'الرضا العام',
        ],
        datasets: [
          {
            label: 'جودة الحياة',
            data: [
              qol.physical_health || 0,
              qol.psychological || 0,
              qol.social || 0,
              qol.environment || 0,
              qol.independence || 0,
              qol.community || 0,
              qol.emotional || 0,
              qol.satisfaction || 0,
            ],
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
          },
        ],
      },
      options: {
        responsive: true,
        scales: { r: { beginAtZero: true, max: 100 } },
        plugins: { legend: { display: false } },
      },
    });
  }

  showUpdateQoLModal() {
    this.populateBeneficiarySelect('qolBeneficiarySelect');
    new bootstrap.Modal(document.getElementById('updateQoLModal')).show();
  }

  async saveQualityOfLife() {
    try {
      const form = document.getElementById('qolForm');
      const formData = new FormData(form);
      const programId = formData.get('program_id');

      if (!programId) {
        this.showAlert('يرجى اختيار المستفيد', 'error');
        return;
      }

      const qolData = {
        physical_health: parseInt(formData.get('physical_health')),
        psychological: parseInt(formData.get('psychological')),
        social_relationships: parseInt(formData.get('social_relationships')),
        environment: parseInt(formData.get('environment')),
        independence: parseInt(formData.get('independence')),
        community_participation: parseInt(formData.get('community_participation')),
        emotional_wellbeing: parseInt(formData.get('emotional_wellbeing')),
        overall_satisfaction: parseInt(formData.get('overall_satisfaction')),
        notes: formData.get('qol_notes'),
      };

      this.showLoading(true);
      const response = await this.makeRequest(`/api/disability-rehab/${programId}/quality-of-life`, 'PUT', qolData);
      if (response.success) {
        this.showAlert('تم تحديث مؤشرات جودة الحياة بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('updateQoLModal')).hide();
        form.reset();
        this.loadQualityOfLife();
      }
    } catch (error) {
      this.showAlert('خطأ في حفظ مؤشرات جودة الحياة', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // =============================================
  // Medications Methods
  // =============================================
  async loadMedications() {
    try {
      const response = await this.makeRequest('/api/disability-rehab/?status=active');
      const container = document.getElementById('medicationsList');

      if (response.success && response.data) {
        let allMeds = [];
        response.data.forEach(program => {
          if (program.medications && program.medications.length > 0) {
            program.medications.forEach(med => {
              allMeds.push({ ...med, beneficiary_name: program.beneficiary_name || 'مستفيد', program_id: program._id });
            });
          }
        });

        if (allMeds.length === 0) {
          container.innerHTML =
            '<div class="text-center py-4 text-muted"><i class="fas fa-pills fa-3x mb-3"></i><p>لا توجد أدوية مسجلة</p></div>';
          return;
        }

        container.innerHTML = allMeds
          .map(
            med => `
                    <div class="card medication-card" ${med.status === 'discontinued' ? 'style="opacity:0.6;"' : ''}>
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1"><i class="fas fa-pill text-primary me-2"></i>${med.medication_name || med.name}</h6>
                                    <small class="text-muted">${med.beneficiary_name}</small>
                                </div>
                                <span class="badge bg-${med.status === 'active' ? 'success' : med.status === 'on_hold' ? 'warning' : 'secondary'}">${med.status === 'active' ? 'نشط' : med.status === 'on_hold' ? 'معلّق' : 'متوقف'}</span>
                            </div>
                            <div class="row mt-2">
                                <div class="col-md-3"><small><strong>الجرعة:</strong> ${med.dosage || '--'}</small></div>
                                <div class="col-md-3"><small><strong>التكرار:</strong> ${med.frequency || '--'}</small></div>
                                <div class="col-md-3"><small><strong>طريقة الإعطاء:</strong> ${med.route || '--'}</small></div>
                                <div class="col-md-3"><small><strong>الطبيب:</strong> ${med.prescribing_doctor || '--'}</small></div>
                            </div>
                        </div>
                    </div>
                `,
          )
          .join('');

        document.getElementById('activeMedications').textContent = allMeds.filter(m => m.status === 'active').length;
      }
    } catch (error) {
      this.showAlert('خطأ في تحميل الأدوية', 'error');
    }
  }

  showAddMedicationModal() {
    this.populateBeneficiarySelect('medBeneficiarySelect');
    new bootstrap.Modal(document.getElementById('addMedicationModal')).show();
  }

  async saveMedication() {
    try {
      const form = document.getElementById('medicationForm');
      const formData = new FormData(form);
      const programId = formData.get('program_id');

      if (!programId) {
        this.showAlert('يرجى اختيار المستفيد', 'error');
        return;
      }

      const medData = {
        action: 'add',
        medication: {
          medication_name: formData.get('medication_name'),
          dosage: formData.get('dosage'),
          frequency: formData.get('frequency'),
          route: formData.get('route'),
          prescribing_doctor: formData.get('prescribing_doctor'),
          start_date: formData.get('start_date'),
          end_date: formData.get('end_date'),
          side_effects: formData.get('side_effects'),
          notes: formData.get('med_notes'),
          status: 'active',
        },
      };

      this.showLoading(true);
      const response = await this.makeRequest(`/api/disability-rehab/${programId}/medications`, 'PUT', medData);
      if (response.success) {
        this.showAlert('تم إضافة الدواء بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addMedicationModal')).hide();
        form.reset();
        this.loadMedications();
      }
    } catch (error) {
      this.showAlert('خطأ في إضافة الدواء', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  filterMedications() {
    // Client-side filter on currently loaded medications
    const status = document.getElementById('medStatusFilter')?.value;
    const cards = document.querySelectorAll('#medicationsList .medication-card');
    cards.forEach(card => {
      if (!status) {
        card.style.display = '';
        return;
      }
      const badge = card.querySelector('.badge');
      const isMatch =
        (status === 'active' && badge?.classList.contains('bg-success')) ||
        (status === 'discontinued' && badge?.classList.contains('bg-secondary')) ||
        (status === 'on_hold' && badge?.classList.contains('bg-warning'));
      card.style.display = isMatch ? '' : 'none';
    });
  }

  searchMedications() {
    const term = document.getElementById('medSearch')?.value?.toLowerCase() || '';
    const cards = document.querySelectorAll('#medicationsList .medication-card');
    cards.forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  }

  // =============================================
  // Vitals Methods
  // =============================================
  async loadVitals() {
    try {
      const response = await this.makeRequest('/api/disability-rehab/?status=active');
      if (response.success && response.data) {
        let allVitals = [];
        response.data.forEach(program => {
          if (program.vitals_tracking && program.vitals_tracking.length > 0) {
            program.vitals_tracking.forEach(v => {
              allVitals.push({ ...v, beneficiary_name: program.beneficiary_name || 'مستفيد' });
            });
          }
        });

        allVitals.sort((a, b) => new Date(b.recorded_at || b.date) - new Date(a.recorded_at || a.date));

        if (allVitals.length > 0) {
          const latest = allVitals[0];
          document.getElementById('lastTemp').textContent = latest.temperature || '--';
          document.getElementById('lastPulse').textContent = latest.pulse || '--';
          document.getElementById('lastBP').textContent = latest.blood_pressure
            ? `${latest.blood_pressure.systolic}/${latest.blood_pressure.diastolic}`
            : '--';
          document.getElementById('lastO2').textContent = latest.oxygen_saturation || '--';
          document.getElementById('lastWeight').textContent = latest.weight || '--';
          document.getElementById('lastBMI').textContent = latest.bmi ? latest.bmi.toFixed(1) : '--';
        }

        this.renderVitalsChart(allVitals);
        this.renderVitalsHistory(allVitals);
      }
    } catch (error) {
      this.showAlert('خطأ في تحميل العلامات الحيوية', 'error');
    }
  }

  renderVitalsChart(vitals) {
    const ctx = document.getElementById('vitalsChart');
    if (!ctx || vitals.length === 0) return;

    if (this.charts.vitals) this.charts.vitals.destroy();

    const last10 = vitals.slice(0, 10).reverse();
    this.charts.vitals = new Chart(ctx, {
      type: 'line',
      data: {
        labels: last10.map(v => this.formatDate(v.recorded_at || v.date)),
        datasets: [
          {
            label: 'النبض',
            data: last10.map(v => v.pulse || null),
            borderColor: '#dc3545',
            tension: 0.3,
            fill: false,
          },
          {
            label: 'الحرارة',
            data: last10.map(v => v.temperature || null),
            borderColor: '#fd7e14',
            tension: 0.3,
            fill: false,
          },
          {
            label: 'الأوكسجين',
            data: last10.map(v => v.oxygen_saturation || null),
            borderColor: '#0dcaf0',
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options: { responsive: true, scales: { y: { beginAtZero: false } } },
    });
  }

  renderVitalsHistory(vitals) {
    const container = document.getElementById('vitalsHistory');
    if (!container) return;

    if (vitals.length === 0) {
      container.innerHTML = '<div class="text-center text-muted py-3">لا توجد قراءات مسجلة</div>';
      return;
    }

    container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-striped">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>المستفيد</th>
                            <th>الحرارة</th>
                            <th>النبض</th>
                            <th>ضغط الدم</th>
                            <th>الأوكسجين</th>
                            <th>الوزن</th>
                            <th>BMI</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vitals
                          .slice(0, 20)
                          .map(
                            v => `
                            <tr>
                                <td>${this.formatDate(v.recorded_at || v.date)}</td>
                                <td>${v.beneficiary_name}</td>
                                <td>${v.temperature || '--'}</td>
                                <td>${v.pulse || '--'}</td>
                                <td>${v.blood_pressure ? `${v.blood_pressure.systolic}/${v.blood_pressure.diastolic}` : '--'}</td>
                                <td>${v.oxygen_saturation || '--'}</td>
                                <td>${v.weight || '--'}</td>
                                <td>${v.bmi ? v.bmi.toFixed(1) : '--'}</td>
                            </tr>
                        `,
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>
        `;
  }

  showAddVitalsModal() {
    this.populateBeneficiarySelect('vitalsBeneficiarySelect');
    new bootstrap.Modal(document.getElementById('addVitalsModal')).show();
  }

  async saveVitals() {
    try {
      const form = document.getElementById('vitalsForm');
      const formData = new FormData(form);
      const programId = formData.get('program_id');

      if (!programId) {
        this.showAlert('يرجى اختيار المستفيد', 'error');
        return;
      }

      const vitalsData = {
        temperature: parseFloat(formData.get('temperature')) || undefined,
        pulse: parseInt(formData.get('pulse')) || undefined,
        blood_pressure: {
          systolic: parseInt(formData.get('bp_systolic')) || undefined,
          diastolic: parseInt(formData.get('bp_diastolic')) || undefined,
        },
        oxygen_saturation: parseInt(formData.get('oxygen_saturation')) || undefined,
        respiratory_rate: parseInt(formData.get('respiratory_rate')) || undefined,
        weight: parseFloat(formData.get('weight')) || undefined,
        height: parseFloat(formData.get('height')) || undefined,
        notes: formData.get('vital_notes'),
      };

      this.showLoading(true);
      const response = await this.makeRequest(`/api/disability-rehab/${programId}/vitals`, 'POST', vitalsData);
      if (response.success) {
        this.showAlert('تم تسجيل العلامات الحيوية بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addVitalsModal')).hide();
        form.reset();
        this.loadVitals();
      }
    } catch (error) {
      this.showAlert('خطأ في تسجيل العلامات الحيوية', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // =============================================
  // Home Program Methods
  // =============================================
  async loadHomeProgram() {
    try {
      const response = await this.makeRequest('/api/disability-rehab/?status=active');
      const container = document.getElementById('exercisesList');

      if (response.success && response.data) {
        let allExercises = [];
        response.data.forEach(program => {
          if (program.home_program && program.home_program.exercises && program.home_program.exercises.length > 0) {
            program.home_program.exercises.forEach(ex => {
              allExercises.push({ ...ex, beneficiary_name: program.beneficiary_name || 'مستفيد', program_id: program._id });
            });
          }
        });

        document.getElementById('totalExercises').textContent = allExercises.length;
        const avgComp =
          allExercises.length > 0 ? Math.round(allExercises.reduce((s, e) => s + (e.compliance_rate || 0), 0) / allExercises.length) : 0;
        document.getElementById('avgCompliance').textContent = `${avgComp}%`;

        if (allExercises.length === 0) {
          container.innerHTML =
            '<div class="text-center py-4 text-muted"><i class="fas fa-dumbbell fa-3x mb-3"></i><p>لا توجد تمارين مسجلة</p></div>';
          return;
        }

        container.innerHTML = allExercises
          .map(
            ex => `
                    <div class="exercise-card">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-1"><i class="fas fa-running text-primary me-2"></i>${ex.exercise_name || ex.name}</h6>
                                <small class="text-muted">${ex.beneficiary_name} | ${ex.category || 'عام'}</small>
                            </div>
                            <div class="text-end">
                                <span class="badge bg-info">${ex.repetitions || 0} × ${ex.sets || 0}</span>
                                <div class="mt-1">
                                    <small class="text-muted">التزام: </small>
                                    <span class="badge bg-${(ex.compliance_rate || 0) >= 70 ? 'success' : (ex.compliance_rate || 0) >= 40 ? 'warning' : 'danger'}">${ex.compliance_rate || 0}%</span>
                                </div>
                            </div>
                        </div>
                        ${ex.instructions ? `<p class="small text-muted mt-2 mb-0">${ex.instructions}</p>` : ''}
                    </div>
                `,
          )
          .join('');
      }
    } catch (error) {
      this.showAlert('خطأ في تحميل البرنامج المنزلي', 'error');
    }
  }

  showAddExerciseModal() {
    this.populateBeneficiarySelect('exerciseBeneficiarySelect');
    new bootstrap.Modal(document.getElementById('addExerciseModal')).show();
  }

  async saveExercise() {
    try {
      const form = document.getElementById('exerciseForm');
      const formData = new FormData(form);
      const programId = formData.get('program_id');

      if (!programId) {
        this.showAlert('يرجى اختيار المستفيد', 'error');
        return;
      }

      const exerciseData = {
        exercises: [
          {
            exercise_name: formData.get('exercise_name'),
            category: formData.get('exercise_category'),
            repetitions: parseInt(formData.get('repetitions')) || 10,
            sets: parseInt(formData.get('sets')) || 3,
            frequency: formData.get('weekly_frequency'),
            instructions: formData.get('exercise_instructions'),
            precautions: formData.get('precautions'),
          },
        ],
      };

      this.showLoading(true);
      const response = await this.makeRequest(`/api/disability-rehab/${programId}/home-program`, 'PUT', exerciseData);
      if (response.success) {
        this.showAlert('تم إضافة التمرين بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addExerciseModal')).hide();
        form.reset();
        this.loadHomeProgram();
      }
    } catch (error) {
      this.showAlert('خطأ في إضافة التمرين', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  printHomeProgram() {
    window.print();
  }

  // =============================================
  // Team Communication Methods
  // =============================================
  async loadTeamCommunications() {
    try {
      const response = await this.makeRequest('/api/disability-rehab/?status=active');
      const container = document.getElementById('teamMessagesList');

      if (response.success && response.data) {
        let allMessages = [];
        response.data.forEach(program => {
          if (program.team_communications && program.team_communications.length > 0) {
            program.team_communications.forEach(msg => {
              allMessages.push({ ...msg, beneficiary_name: program.beneficiary_name || 'مستفيد' });
            });
          }
        });

        allMessages.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

        if (allMessages.length === 0) {
          container.innerHTML =
            '<div class="text-center py-4 text-muted"><i class="fas fa-comments fa-3x mb-3"></i><p>لا توجد رسائل مسجلة</p></div>';
          return;
        }

        container.innerHTML = allMessages
          .slice(0, 30)
          .map(msg => {
            const typeIcons = {
              update: 'sync',
              concern: 'exclamation-circle',
              recommendation: 'lightbulb',
              alert: 'bell',
              progress_note: 'chart-line',
            };
            const typeColors = {
              update: '#0d6efd',
              concern: '#fd7e14',
              recommendation: '#198754',
              alert: '#dc3545',
              progress_note: '#6f42c1',
            };
            return `
                        <div class="team-msg" style="border-right-color: ${typeColors[msg.message_type] || '#6f42c1'}">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <i class="fas fa-${typeIcons[msg.message_type] || 'comment'} me-2" style="color: ${typeColors[msg.message_type] || '#6f42c1'}"></i>
                                    <strong>${msg.subject || msg.message_type}</strong>
                                    <small class="text-muted ms-2">${msg.beneficiary_name}</small>
                                </div>
                                <div>
                                    <span class="badge bg-${msg.priority === 'high' ? 'danger' : msg.priority === 'medium' ? 'warning' : 'secondary'} me-1">${msg.priority === 'high' ? 'عالية' : msg.priority === 'medium' ? 'متوسطة' : 'منخفضة'}</span>
                                    <small class="text-muted">${this.formatDate(msg.date || msg.created_at)}</small>
                                </div>
                            </div>
                            <p class="mb-0 mt-2 small">${msg.message || msg.content}</p>
                            ${msg.from_member ? `<small class="text-muted"><i class="fas fa-user me-1"></i>${msg.from_member}</small>` : ''}
                        </div>
                    `;
          })
          .join('');
      }
    } catch (error) {
      this.showAlert('خطأ في تحميل رسائل الفريق', 'error');
    }
  }

  showAddTeamMessageModal() {
    this.populateBeneficiarySelect('teamMsgBeneficiarySelect');
    new bootstrap.Modal(document.getElementById('addTeamMessageModal')).show();
  }

  async saveTeamMessage() {
    try {
      const form = document.getElementById('teamMessageForm');
      const formData = new FormData(form);
      const programId = formData.get('program_id');

      if (!programId) {
        this.showAlert('يرجى اختيار المستفيد', 'error');
        return;
      }

      const msgData = {
        message_type: formData.get('message_type'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        priority: formData.get('priority'),
      };

      this.showLoading(true);
      const response = await this.makeRequest(`/api/disability-rehab/${programId}/team-communication`, 'POST', msgData);
      if (response.success) {
        this.showAlert('تم إرسال الرسالة بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addTeamMessageModal')).hide();
        form.reset();
        this.loadTeamCommunications();
      }
    } catch (error) {
      this.showAlert('خطأ في إرسال الرسالة', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  filterTeamMessages() {
    const type = document.getElementById('msgTypeFilter')?.value;
    const priority = document.getElementById('msgPriorityFilter')?.value;
    const msgs = document.querySelectorAll('#teamMessagesList .team-msg');
    msgs.forEach(msg => {
      let show = true;
      if (type && !msg.innerHTML.includes(type)) show = false;
      if (priority) {
        const badge = msg.querySelector('.badge');
        if (priority === 'high' && !badge?.classList.contains('bg-danger')) show = false;
        if (priority === 'medium' && !badge?.classList.contains('bg-warning')) show = false;
        if (priority === 'low' && !badge?.classList.contains('bg-secondary')) show = false;
      }
      msg.style.display = show ? '' : 'none';
    });
  }

  // =============================================
  // Waiting List Methods
  // =============================================
  async loadWaitingList() {
    try {
      const response = await this.makeRequest('/api/disability-rehab/waiting-list');
      const tbody = document.getElementById('waitingListBody');

      if (response.success && response.data && response.data.length > 0) {
        document.getElementById('waitingTotalBadge').textContent = `${response.data.length} في الانتظار`;
        document.getElementById('waitingListCount').textContent = response.data.length;

        tbody.innerHTML = response.data
          .map((item, idx) => {
            const waitDays = Math.floor((new Date() - new Date(item.registration_date || item.added_date)) / (1000 * 60 * 60 * 24));
            const priorityColors = { urgent: 'danger', high: 'warning', normal: 'info', low: 'secondary' };
            const priorityLabels = { urgent: 'عاجل', high: 'مرتفع', normal: 'عادي', low: 'منخفض' };
            return `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${item.beneficiary_name || item.name || 'مستفيد'}</td>
                            <td>${this.getServiceTypeLabel(item.requested_service) || item.service || '--'}</td>
                            <td><span class="badge bg-${priorityColors[item.priority] || 'secondary'}">${priorityLabels[item.priority] || item.priority}</span></td>
                            <td>${this.formatDate(item.registration_date || item.added_date)}</td>
                            <td><span class="badge bg-light text-dark">${waitDays} يوم</span></td>
                            <td>
                                <button class="btn btn-outline-success btn-sm" onclick="rehab.admitFromWaitingList('${item._id || item.id}')" title="قبول">
                                    <i class="fas fa-check"></i>
                                </button>
                            </td>
                        </tr>
                    `;
          })
          .join('');
      } else {
        tbody.innerHTML =
          '<tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-check-circle fa-2x text-success mb-2"></i><br>لا يوجد أحد في قائمة الانتظار</td></tr>';
        document.getElementById('waitingTotalBadge').textContent = '0 في الانتظار';
      }
    } catch (error) {
      this.showAlert('خطأ في تحميل قائمة الانتظار', 'error');
    }
  }

  refreshWaitingList() {
    this.loadWaitingList();
  }

  filterWaitingList() {
    // Client-side filtering for waiting list
    const priority = document.getElementById('waitPriorityFilter')?.value;
    const service = document.getElementById('waitServiceFilter')?.value;
    const rows = document.querySelectorAll('#waitingListBody tr');
    rows.forEach(row => {
      let show = true;
      if (priority && !row.innerHTML.toLowerCase().includes(priority)) show = false;
      if (service && !row.innerHTML.includes(this.getServiceTypeLabel(service))) show = false;
      row.style.display = show ? '' : 'none';
    });
  }

  async admitFromWaitingList(itemId) {
    try {
      this.showLoading(true);
      const response = await this.makeRequest(`/api/disability-rehab/waiting-list/${itemId}/admit`, 'POST');
      if (response.success) {
        this.showAlert('تم قبول المستفيد من قائمة الانتظار', 'success');
        this.loadWaitingList();
      }
    } catch (error) {
      this.showAlert('خطأ في عملية القبول', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // =============================================
  // Utility: Populate Beneficiary Selects
  // =============================================
  async populateBeneficiarySelect(selectId) {
    try {
      const response = await this.makeRequest('/api/disability-rehab/?status=active');
      const select = document.getElementById(selectId);
      if (!select) return;

      // Keep first option
      select.innerHTML = '<option value="">-- اختر المستفيد --</option>';

      if (response.success && response.data) {
        response.data.forEach(program => {
          const option = document.createElement('option');
          option.value = program._id || program.id;
          option.textContent =
            program.beneficiary_name || `${program.first_name || ''} ${program.last_name || ''}`.trim() || `برنامج #${program._id}`;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error populating beneficiary select:', error);
    }
  }

  // =============================================
  // Enhanced Dashboard Update
  // =============================================
  updateStatistics(data) {
    document.getElementById('totalBeneficiaries').textContent = data.beneficiaries?.total || data.total_programs || 0;
    document.getElementById('activePlans').textContent = data.plans?.active || data.active_programs || 0;
    document.getElementById('totalSessions').textContent = data.sessions?.total || data.total_sessions || 0;
    document.getElementById('completionRate').textContent = `${data.sessions?.completion_rate || data.completion_rate || 0}%`;

    // New stat cards
    if (document.getElementById('waitingListCount')) {
      document.getElementById('waitingListCount').textContent = data.waiting_list_count || 0;
    }
    if (document.getElementById('highRiskCount')) {
      document.getElementById('highRiskCount').textContent = data.high_risk_count || 0;
    }
    if (document.getElementById('activeMedications')) {
      document.getElementById('activeMedications').textContent = data.active_medications || 0;
    }
    if (document.getElementById('avgQolScore')) {
      document.getElementById('avgQolScore').textContent = `${data.avg_qol_score || 0}%`;
    }
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
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
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
      physical: 'حركية',
      intellectual: 'ذهنية',
      sensory: 'حسية',
      speech_language: 'نطق ولغة',
      autism_spectrum: 'طيف التوحد',
      learning_difficulties: 'صعوبات التعلم',
      behavioral: 'سلوكية',
      multiple: 'متعددة',
      cerebral_palsy: 'شلل دماغي',
      down_syndrome: 'متلازمة داون',
      adhd: 'اضطراب فرط الحركة',
      epilepsy: 'صرع',
      spinal_cord_injury: 'إصابة الحبل الشوكي',
      chronic_illness: 'مرض مزمن',
      genetic_disorder: 'اضطراب جيني',
      traumatic_brain_injury: 'إصابة دماغية رضية',
      muscular_dystrophy: 'ضمور عضلي',
      rare_disease: 'مرض نادر',
    };
    return labels[type] || type;
  }
}

// Initialize the manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  window.rehabManager = new ComprehensiveRehabilitationManager();
});
