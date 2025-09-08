/**
 * نظام إدارة برامج تأهيل ذوي الاحتياجات الخاصة
 * Rehabilitation Programs Management System
 */

class RehabilitationManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.disabilityChart = null;
        this.programChart = null;
        this.apiBaseUrl = '/api/rehabilitation';
    }

    /**
     * تهيئة النظام
     */
    init() {
        this.loadDashboardData();
        this.loadBeneficiaries();
        this.loadPrograms();
        this.setupEventListeners();
        this.initializeCharts();
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // البحث في المستفيدين
        document.getElementById('beneficiarySearch')?.addEventListener('input', (e) => {
            this.searchBeneficiaries(e.target.value);
        });

        // فلترة حسب نوع الإعاقة
        document.getElementById('disabilityFilter')?.addEventListener('change', (e) => {
            this.filterBeneficiaries(e.target.value);
        });

        // فلترة البرامج
        document.getElementById('programTypeFilter')?.addEventListener('change', (e) => {
            this.filterPrograms(e.target.value);
        });

        // تبويبات الواجهة
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('href').substring(1);
                this.handleTabChange(target);
            });
        });
    }

    /**
     * تحميل بيانات لوحة التحكم
     */
    async loadDashboardData() {
        try {
            const response = await this.apiCall('/dashboard');
            if (response.success) {
                this.updateDashboardStats(response.statistics);
                this.updateCharts(response.statistics);
            }
        } catch (error) {
            console.error('خطأ في تحميل بيانات لوحة التحكم:', error);
        }
    }

    /**
     * تحديث إحصائيات لوحة التحكم
     */
    updateDashboardStats(stats) {
        document.getElementById('totalBeneficiaries').textContent = stats.total_beneficiaries || 0;
        document.getElementById('totalPrograms').textContent = stats.total_programs || 0;
        document.getElementById('todaySessions').textContent = stats.today_sessions || 0;
        document.getElementById('activeEnrollments').textContent = stats.active_enrollments || 0;
    }

    /**
     * تهيئة الرسوم البيانية
     */
    initializeCharts() {
        // رسم بياني لتوزيع أنواع الإعاقة
        const disabilityCtx = document.getElementById('disabilityChart');
        if (disabilityCtx) {
            this.disabilityChart = new Chart(disabilityCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
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

        // رسم بياني لتوزيع البرامج
        const programCtx = document.getElementById('programChart');
        if (programCtx) {
            this.programChart = new Chart(programCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'عدد المسجلين',
                        data: [],
                        backgroundColor: '#36A2EB'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    /**
     * تحديث الرسوم البيانية
     */
    updateCharts(stats) {
        // تحديث رسم أنواع الإعاقة
        if (this.disabilityChart && stats.disability_distribution) {
            const disabilityLabels = stats.disability_distribution.map(item => this.translateDisabilityType(item.type));
            const disabilityData = stats.disability_distribution.map(item => item.count);
            
            this.disabilityChart.data.labels = disabilityLabels;
            this.disabilityChart.data.datasets[0].data = disabilityData;
            this.disabilityChart.update();
        }

        // تحديث رسم البرامج
        if (this.programChart && stats.program_distribution) {
            const programLabels = stats.program_distribution.map(item => this.translateProgramType(item.type));
            const programData = stats.program_distribution.map(item => item.count);
            
            this.programChart.data.labels = programLabels;
            this.programChart.data.datasets[0].data = programData;
            this.programChart.update();
        }
    }

    /**
     * تحميل قائمة المستفيدين
     */
    async loadBeneficiaries(page = 1, search = '', disabilityType = '') {
        try {
            this.showLoading();
            const params = new URLSearchParams({
                page: page,
                per_page: this.itemsPerPage,
                search: search,
                disability_type: disabilityType
            });

            const response = await this.apiCall(`/beneficiaries?${params}`);
            if (response.success) {
                this.displayBeneficiaries(response.beneficiaries);
                this.updatePagination('beneficiaries', response.pagination);
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل المستفيدين', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * عرض قائمة المستفيدين
     */
    displayBeneficiaries(beneficiaries) {
        const container = document.getElementById('beneficiariesList');
        if (!container) return;

        if (beneficiaries.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-users fa-4x text-muted mb-3"></i>
                    <h5>لا توجد مستفيدون</h5>
                    <p class="text-muted">لم يتم العثور على أي مستفيدين</p>
                </div>
            `;
            return;
        }

        container.innerHTML = beneficiaries.map(beneficiary => `
            <div class="col-md-6 col-lg-4">
                <div class="card beneficiary-card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <h6 class="card-title mb-0">${beneficiary.full_name}</h6>
                            <span class="badge ${this.getDisabilityBadgeClass(beneficiary.disability_type)}">
                                ${this.translateDisabilityType(beneficiary.disability_type)}
                            </span>
                        </div>
                        
                        <div class="mb-2">
                            <small class="text-muted">رقم المستفيد:</small>
                            <span class="fw-bold">${beneficiary.beneficiary_number}</span>
                        </div>
                        
                        <div class="mb-2">
                            <small class="text-muted">العمر:</small>
                            <span>${beneficiary.age || 'غير محدد'} سنة</span>
                        </div>
                        
                        <div class="mb-3">
                            <small class="text-muted">الهاتف:</small>
                            <span>${beneficiary.phone || 'غير محدد'}</span>
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary flex-fill" 
                                    onclick="rehabilitationManager.viewBeneficiary(${beneficiary.id})"
                                    title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success flex-fill" 
                                    onclick="rehabilitationManager.showEnrollModal(${beneficiary.id})"
                                    title="تسجيل في برنامج">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary flex-fill" 
                                    onclick="rehabilitationManager.editBeneficiary(${beneficiary.id})"
                                    title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * تحميل قائمة البرامج
     */
    async loadPrograms(programType = '') {
        try {
            this.showLoading();
            const params = new URLSearchParams({
                program_type: programType,
                is_active: 'true'
            });

            const response = await this.apiCall(`/programs?${params}`);
            if (response.success) {
                this.displayPrograms(response.programs);
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل البرامج', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * عرض قائمة البرامج
     */
    displayPrograms(programs) {
        const container = document.getElementById('programsList');
        if (!container) return;

        if (programs.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-clipboard-list fa-4x text-muted mb-3"></i>
                    <h5>لا توجد برامج</h5>
                    <p class="text-muted">لم يتم العثور على أي برامج</p>
                </div>
            `;
            return;
        }

        container.innerHTML = programs.map(program => `
            <div class="col-md-6 col-lg-4">
                <div class="card program-card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <h6 class="card-title mb-0">${program.name}</h6>
                            <span class="badge bg-primary">${program.program_code}</span>
                        </div>
                        
                        <div class="mb-2">
                            <small class="text-muted">النوع:</small>
                            <span>${this.translateProgramType(program.program_type)}</span>
                        </div>
                        
                        <div class="mb-2">
                            <small class="text-muted">المدة:</small>
                            <span>${program.duration_weeks || 'غير محدد'} أسبوع</span>
                        </div>
                        
                        <div class="mb-2">
                            <small class="text-muted">الجلسات الأسبوعية:</small>
                            <span>${program.sessions_per_week || 'غير محدد'}</span>
                        </div>
                        
                        <div class="mb-3">
                            <small class="text-muted">مدة الجلسة:</small>
                            <span>${program.session_duration_minutes || 'غير محدد'} دقيقة</span>
                        </div>
                        
                        <p class="card-text small text-muted">${program.description || 'لا يوجد وصف'}</p>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary flex-fill" 
                                    onclick="rehabilitationManager.viewProgram(${program.id})"
                                    title="عرض التفاصيل">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary flex-fill" 
                                    onclick="rehabilitationManager.editProgram(${program.id})"
                                    title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * عرض نافذة إضافة مستفيد جديد
     */
    showAddBeneficiaryModal() {
        const modal = new bootstrap.Modal(document.getElementById('addBeneficiaryModal'));
        document.getElementById('addBeneficiaryForm').reset();
        modal.show();
    }

    /**
     * حفظ بيانات المستفيد الجديد
     */
    async saveBeneficiary() {
        try {
            const form = document.getElementById('addBeneficiaryForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // التحقق من صحة البيانات
            if (!data.first_name || !data.last_name || !data.date_of_birth || !data.gender || !data.disability_type) {
                this.showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
                return;
            }

            this.showLoading();
            const response = await this.apiCall('/beneficiaries', 'POST', data);
            
            if (response.success) {
                this.showAlert('تم إضافة المستفيد بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addBeneficiaryModal')).hide();
                this.loadBeneficiaries();
                this.loadDashboardData();
            } else {
                this.showAlert(response.message || 'حدث خطأ أثناء الحفظ', 'error');
            }
        } catch (error) {
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * البحث في المستفيدين
     */
    searchBeneficiaries(searchTerm) {
        const disabilityType = document.getElementById('disabilityFilter')?.value || '';
        this.loadBeneficiaries(1, searchTerm, disabilityType);
    }

    /**
     * فلترة المستفيدين حسب نوع الإعاقة
     */
    filterBeneficiaries(disabilityType) {
        const searchTerm = document.getElementById('beneficiarySearch')?.value || '';
        this.loadBeneficiaries(1, searchTerm, disabilityType);
    }

    /**
     * فلترة البرامج حسب النوع
     */
    filterPrograms(programType) {
        this.loadPrograms(programType);
    }

    /**
     * التعامل مع تغيير التبويبات
     */
    handleTabChange(tabName) {
        switch (tabName) {
            case 'beneficiaries':
                this.loadBeneficiaries();
                break;
            case 'programs':
                this.loadPrograms();
                break;
            case 'sessions':
                this.loadSessions();
                break;
        }
    }

    /**
     * ترجمة نوع الإعاقة
     */
    translateDisabilityType(type) {
        const translations = {
            'physical': 'حركية',
            'intellectual': 'ذهنية',
            'sensory': 'حسية',
            'speech': 'نطقية',
            'autism': 'طيف التوحد',
            'learning': 'صعوبات التعلم',
            'multiple': 'متعددة'
        };
        return translations[type] || type;
    }

    /**
     * ترجمة نوع البرنامج
     */
    translateProgramType(type) {
        const translations = {
            'physical_therapy': 'العلاج الطبيعي',
            'occupational_therapy': 'العلاج الوظيفي',
            'speech_therapy': 'علاج النطق',
            'behavioral_therapy': 'العلاج السلوكي',
            'educational': 'تعليمي',
            'vocational': 'مهني',
            'social': 'اجتماعي',
            'psychological': 'نفسي'
        };
        return translations[type] || type;
    }

    /**
     * الحصول على فئة CSS لشارة نوع الإعاقة
     */
    getDisabilityBadgeClass(type) {
        const classes = {
            'physical': 'disability-physical',
            'intellectual': 'disability-intellectual',
            'sensory': 'disability-sensory',
            'speech': 'disability-speech',
            'autism': 'disability-autism'
        };
        return classes[type] || 'bg-secondary';
    }

    /**
     * استدعاء API
     */
    async apiCall(endpoint, method = 'GET', data = null) {
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

        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
        return await response.json();
    }

    /**
     * عرض رسالة تنبيه
     */
    showAlert(message, type = 'info') {
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // إضافة التنبيه في أعلى الصفحة
        const container = document.querySelector('.container-fluid');
        container.insertAdjacentHTML('afterbegin', alertHtml);

        // إزالة التنبيه تلقائياً بعد 5 ثوانٍ
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    /**
     * عرض مؤشر التحميل
     */
    showLoading() {
        // يمكن تطوير مؤشر تحميل مخصص هنا
    }

    /**
     * إخفاء مؤشر التحميل
     */
    hideLoading() {
        // يمكن تطوير إخفاء مؤشر التحميل هنا
    }

    /**
     * تحديث ترقيم الصفحات
     */
    updatePagination(type, pagination) {
        const container = document.getElementById(`${type}Pagination`);
        if (!container || !pagination) return;

        if (pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHtml = '<ul class="pagination justify-content-center">';
        
        // الصفحة السابقة
        if (pagination.page > 1) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="rehabilitationManager.loadBeneficiaries(${pagination.page - 1})">السابق</a>
                </li>
            `;
        }

        // أرقام الصفحات
        for (let i = 1; i <= pagination.pages; i++) {
            const activeClass = i === pagination.page ? 'active' : '';
            paginationHtml += `
                <li class="page-item ${activeClass}">
                    <a class="page-link" href="#" onclick="rehabilitationManager.loadBeneficiaries(${i})">${i}</a>
                </li>
            `;
        }

        // الصفحة التالية
        if (pagination.page < pagination.pages) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="rehabilitationManager.loadBeneficiaries(${pagination.page + 1})">التالي</a>
                </li>
            `;
        }

        paginationHtml += '</ul>';
        container.innerHTML = paginationHtml;
    }
}

// إنشاء مثيل من مدير النظام
const rehabilitationManager = new RehabilitationManager();
