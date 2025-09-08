class MedicalFollowupManager {
    constructor() {
        this.medicalRecords = [];
        this.therapySessions = [];
        this.medications = [];
        this.beneficiaries = [];
        this.doctors = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.currentSection = 'medical-records';
        this.filters = {
            search: '',
            type: '',
            status: '',
            priority: '',
            doctor: ''
        };
    }

    async init() {
        try {
            await this.loadBeneficiaries();
            await this.loadDoctors();
            await this.loadMedicalRecords();
            this.setupEventListeners();
            this.updateStatistics();
        } catch (error) {
            console.error('Error initializing medical manager:', error);
            this.showAlert('خطأ في تحميل البيانات', 'error');
        }
    }

    setupEventListeners() {
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.debounceSearch();
        });

        ['typeFilter', 'statusFilter', 'priorityFilter', 'doctorFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const filterType = id.replace('Filter', '');
                this.filters[filterType] = e.target.value;
                this.applyFilters();
            });
        });

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const defaultDateTime = now.toISOString().slice(0, 16);
        document.querySelectorAll('input[name="record_date"], input[name="session_date"]').forEach(input => {
            input.value = defaultDateTime;
        });
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.applyFilters();
        }, 500);
    }

    async loadBeneficiaries() {
        try {
            const response = await fetch('/api/rehabilitation/beneficiaries', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                this.beneficiaries = data.data || [];
                this.populateBeneficiarySelects();
            }
        } catch (error) {
            console.error('Error loading beneficiaries:', error);
        }
    }

    async loadDoctors() {
        try {
            const response = await fetch('/api/users?role=doctor,therapist', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                this.doctors = data.users || [];
                this.populateDoctorSelects();
            }
        } catch (error) {
            console.error('Error loading doctors:', error);
        }
    }

    async loadMedicalRecords(page = 1) {
        try {
            const params = new URLSearchParams({
                page: page,
                per_page: this.itemsPerPage,
                ...this.filters
            });

            const response = await fetch(`/api/medical-followup/records?${params}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.medicalRecords = data.records || [];
                this.currentPage = data.pagination?.page || 1;
                this.totalPages = data.pagination?.pages || 1;
                
                this.renderMedicalRecords();
                this.renderPagination();
                this.updateStatistics();
            }
        } catch (error) {
            console.error('Error loading medical records:', error);
            this.showAlert('خطأ في تحميل السجلات الطبية', 'error');
        }
    }

    populateBeneficiarySelects() {
        const selects = document.querySelectorAll('select[name="beneficiary_id"]');
        selects.forEach(select => {
            const firstOption = select.querySelector('option');
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);

            this.beneficiaries.forEach(beneficiary => {
                const option = document.createElement('option');
                option.value = beneficiary.id;
                option.textContent = `${beneficiary.first_name} ${beneficiary.last_name}`;
                select.appendChild(option);
            });
        });
    }

    populateDoctorSelects() {
        const select = document.getElementById('doctorFilter');
        const firstOption = select.querySelector('option');
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);

        this.doctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.id;
            option.textContent = `${doctor.first_name} ${doctor.last_name}`;
            select.appendChild(option);
        });
    }

    renderMedicalRecords() {
        const container = document.getElementById('contentContainer');
        
        if (this.medicalRecords.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-file-medical fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد سجلات طبية</h5>
                    <p class="text-muted">لم يتم العثور على سجلات مطابقة للمعايير المحددة</p>
                </div>
            `;
            return;
        }

        const recordsHtml = this.medicalRecords.map(record => `
            <div class="medical-card position-relative">
                <div class="priority-indicator priority-${record.priority}"></div>
                
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="mb-1">${record.beneficiary_name}</h5>
                        <span class="record-type type-${record.record_type}">
                            ${this.getRecordTypeText(record.record_type)}
                        </span>
                    </div>
                    <div class="text-end">
                        <span class="status-indicator status-${record.status || 'completed'}">
                            ${this.getStatusText(record.status || 'completed')}
                        </span>
                        <br>
                        <small class="text-muted">${this.formatDateTime(record.record_date)}</small>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <small class="text-muted">الطبيب:</small>
                        <span>${record.doctor_name}</span>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">التشخيص:</small>
                        <span>${record.diagnosis}</span>
                    </div>
                </div>
                
                <div class="mb-3">
                    <small class="text-muted">العلاج:</small>
                    <p class="mb-0">${record.treatment}</p>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-sm btn-outline-primary" onclick="medicalManager.viewRecord(${record.id})" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="medicalManager.editRecord(${record.id})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="medicalManager.deleteRecord(${record.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = recordsHtml;
    }

    renderPagination() {
        const pagination = document.getElementById('recordsPagination');
        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHtml = `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="medicalManager.loadMedicalRecords(${this.currentPage - 1})">السابق</a>
            </li>
        `;

        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="medicalManager.loadMedicalRecords(${i})">${i}</a>
                </li>
            `;
        }

        paginationHtml += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="medicalManager.loadMedicalRecords(${this.currentPage + 1})">التالي</a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;
    }

    updateStatistics() {
        const totalRecords = this.medicalRecords.length;
        document.getElementById('totalRecords').textContent = totalRecords;
        document.getElementById('totalSessions').textContent = 0;
        document.getElementById('activeMedications').textContent = 0;
        document.getElementById('upcomingAppointments').textContent = 0;
    }

    getRecordTypeText(type) {
        const typeMap = {
            'medical': 'فحص طبي',
            'therapy': 'علاج طبيعي',
            'consultation': 'استشارة',
            'emergency': 'طوارئ'
        };
        return typeMap[type] || type;
    }

    getStatusText(status) {
        const statusMap = {
            'scheduled': 'مجدول',
            'completed': 'مكتمل',
            'cancelled': 'ملغي',
            'ongoing': 'جاري'
        };
        return statusMap[status] || status;
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('ar-SA');
    }

    applyFilters() {
        this.currentPage = 1;
        this.loadMedicalRecords();
    }

    clearFilters() {
        this.filters = { search: '', type: '', status: '', priority: '', doctor: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('typeFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('priorityFilter').value = '';
        document.getElementById('doctorFilter').value = '';
        this.loadMedicalRecords();
    }

    showAddRecordModal() {
        document.getElementById('addRecordForm').reset();
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.querySelector('#addRecordForm input[name="record_date"]').value = now.toISOString().slice(0, 16);
        
        const modal = new bootstrap.Modal(document.getElementById('addRecordModal'));
        modal.show();
    }

    showAddSessionModal() {
        document.getElementById('addSessionForm').reset();
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.querySelector('#addSessionForm input[name="session_date"]').value = now.toISOString().slice(0, 16);
        
        const modal = new bootstrap.Modal(document.getElementById('addSessionModal'));
        modal.show();
    }

    async saveRecord() {
        const form = document.getElementById('addRecordForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (data.medications) {
            try {
                data.medications = JSON.parse(data.medications);
            } catch {
                // Keep as string if not valid JSON
            }
        }

        try {
            const response = await fetch('/api/medical-followup/records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم إضافة السجل الطبي بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addRecordModal')).hide();
                this.loadMedicalRecords();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إضافة السجل', 'error');
            }
        } catch (error) {
            console.error('Error saving record:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    async saveSession() {
        const form = document.getElementById('addSessionForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/medical-followup/therapy-sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم إضافة جلسة العلاج بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addSessionModal')).hide();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إضافة الجلسة', 'error');
            }
        } catch (error) {
            console.error('Error saving session:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    viewRecord(recordId) {
        console.log('View record:', recordId);
    }

    editRecord(recordId) {
        console.log('Edit record:', recordId);
    }

    async deleteRecord(recordId) {
        if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;

        try {
            const response = await fetch(`/api/medical-followup/records/${recordId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                this.showAlert('تم حذف السجل بنجاح', 'success');
                this.loadMedicalRecords();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في حذف السجل', 'error');
            }
        } catch (error) {
            console.error('Error deleting record:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    loadTherapySessions() {
        this.currentSection = 'therapy-sessions';
        console.log('Load therapy sessions');
    }

    loadMedications() {
        this.currentSection = 'medications';
        console.log('Load medications');
    }

    loadAppointments() {
        this.currentSection = 'appointments';
        console.log('Load appointments');
    }

    showReportsSection() {
        this.currentSection = 'reports';
        console.log('Show reports section');
    }

    exportRecords() {
        console.log('Export records');
    }

    showAlert(message, type = 'info') {
        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'success' ? 'alert-success' : 'alert-info';
        
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        const container = document.querySelector('.main-content');
        container.insertAdjacentHTML('afterbegin', alertHtml);
        
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

const medicalManager = new MedicalFollowupManager();
