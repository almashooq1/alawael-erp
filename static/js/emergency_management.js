class EmergencyManager {
    constructor() {
        this.incidents = [];
        this.protocols = [];
        this.responseTeams = [];
        this.drills = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.currentSection = 'incidents';
        this.filters = {
            search: '',
            level: '',
            status: '',
            type: '',
            responsible: ''
        };
        this.emergencyActive = false;
    }

    async init() {
        try {
            await this.loadIncidents();
            await this.loadResponseTeams();
            this.setupEventListeners();
            this.updateStatistics();
            this.checkActiveEmergencies();
        } catch (error) {
            console.error('Error initializing emergency manager:', error);
            this.showAlert('خطأ في تحميل البيانات', 'error');
        }
    }

    setupEventListeners() {
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.debounceSearch();
        });

        ['levelFilter', 'statusFilter', 'typeFilter', 'responsibleFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const filterType = id.replace('Filter', '');
                this.filters[filterType] = e.target.value;
                this.applyFilters();
            });
        });

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const defaultDateTime = now.toISOString().slice(0, 16);
        document.querySelectorAll('input[name="incident_time"], input[name="drill_datetime"]').forEach(input => {
            input.value = defaultDateTime;
        });
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.applyFilters();
        }, 500);
    }

    async loadIncidents(page = 1) {
        try {
            const params = new URLSearchParams({
                page: page,
                per_page: this.itemsPerPage,
                ...this.filters
            });

            const response = await fetch(`/api/emergency/incidents?${params}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.incidents = data.incidents || [];
                this.currentPage = data.pagination?.page || 1;
                this.totalPages = data.pagination?.pages || 1;
                
                this.renderIncidents();
                this.renderPagination();
                this.updateStatistics();
            }
        } catch (error) {
            console.error('Error loading incidents:', error);
            this.showAlert('خطأ في تحميل الحوادث', 'error');
        }
    }

    async loadResponseTeams() {
        try {
            const response = await fetch('/api/emergency/response-teams', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                this.responseTeams = await response.json();
                this.populateResponsibleFilter();
            }
        } catch (error) {
            console.error('Error loading response teams:', error);
        }
    }

    populateResponsibleFilter() {
        const select = document.getElementById('responsibleFilter');
        const firstOption = select.querySelector('option');
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);

        this.responseTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.leader_id;
            option.textContent = team.name;
            select.appendChild(option);
        });
    }

    renderIncidents() {
        const container = document.getElementById('contentContainer');
        
        if (this.incidents.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-shield-alt fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد حوادث</h5>
                    <p class="text-muted">لم يتم العثور على حوادث مطابقة للمعايير المحددة</p>
                </div>
            `;
            return;
        }

        const incidentsHtml = this.incidents.map(incident => `
            <div class="emergency-card position-relative">
                <div class="priority-indicator priority-${incident.emergency_level}"></div>
                
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="mb-1">${this.getIncidentTypeText(incident.incident_type)}</h5>
                        <span class="emergency-level level-${incident.emergency_level}">
                            ${this.getLevelText(incident.emergency_level)}
                        </span>
                    </div>
                    <div class="text-end">
                        <span class="status-indicator status-${incident.status}">
                            ${this.getStatusText(incident.status)}
                        </span>
                        <br>
                        <small class="text-muted">${this.formatDateTime(incident.incident_time)}</small>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <small class="text-muted">الموقع:</small>
                        <span>${incident.location}</span>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">المتأثرون:</small>
                        <span>${incident.affected_persons || 0} شخص</span>
                    </div>
                </div>
                
                <div class="mb-3">
                    <small class="text-muted">الوصف:</small>
                    <p class="mb-0">${incident.description}</p>
                </div>
                
                ${incident.actions_taken ? `
                    <div class="mb-3">
                        <small class="text-muted">الإجراءات المتخذة:</small>
                        <p class="mb-0">${incident.actions_taken}</p>
                    </div>
                ` : ''}
                
                ${incident.response_team ? `
                    <div class="response-team">
                        <h6>فريق الاستجابة:</h6>
                        <div>${this.renderResponseTeam(incident.response_team)}</div>
                    </div>
                ` : ''}
                
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-sm btn-outline-primary" onclick="emergencyManager.viewIncident(${incident.id})" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="emergencyManager.updateIncidentStatus(${incident.id})" title="تحديث الحالة">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${incident.status !== 'resolved' ? `
                        <button class="btn btn-sm btn-outline-success" onclick="emergencyManager.resolveIncident(${incident.id})" title="حل الحادث">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-warning" onclick="emergencyManager.escalateIncident(${incident.id})" title="تصعيد">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="emergencyManager.generateIncidentReport(${incident.id})" title="تقرير">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = incidentsHtml;
    }

    renderResponseTeam(teamData) {
        if (typeof teamData === 'string') {
            return teamData.split(',').map(member => 
                `<span class="team-member">${member.trim()}</span>`
            ).join(' ');
        }
        return teamData;
    }

    renderPagination() {
        const pagination = document.getElementById('incidentsPagination');
        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHtml = `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="emergencyManager.loadIncidents(${this.currentPage - 1})">السابق</a>
            </li>
        `;

        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="emergencyManager.loadIncidents(${i})">${i}</a>
                </li>
            `;
        }

        paginationHtml += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="emergencyManager.loadIncidents(${this.currentPage + 1})">التالي</a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;
    }

    updateStatistics() {
        const activeIncidents = this.incidents.filter(i => i.status === 'active').length;
        const resolvedIncidents = this.incidents.filter(i => i.status === 'resolved').length;
        const avgResponseTime = this.calculateAverageResponseTime();
        const trainedPersonnel = this.responseTeams.reduce((total, team) => total + (team.members?.length || 0), 0);

        document.getElementById('activeIncidents').textContent = activeIncidents;
        document.getElementById('resolvedIncidents').textContent = resolvedIncidents;
        document.getElementById('responseTime').textContent = avgResponseTime;
        document.getElementById('trainedPersonnel').textContent = trainedPersonnel;
    }

    calculateAverageResponseTime() {
        const resolvedIncidents = this.incidents.filter(i => i.status === 'resolved' && i.response_time);
        if (resolvedIncidents.length === 0) return 0;
        
        const totalTime = resolvedIncidents.reduce((sum, incident) => sum + (incident.response_time || 0), 0);
        return Math.round(totalTime / resolvedIncidents.length);
    }

    checkActiveEmergencies() {
        const activeEmergencies = this.incidents.filter(i => 
            i.status === 'active' && ['critical', 'high'].includes(i.emergency_level)
        );
        
        if (activeEmergencies.length > 0) {
            this.showEmergencyAlert(`يوجد ${activeEmergencies.length} حالة طوارئ نشطة`);
        }
    }

    showEmergencyAlert(message) {
        const banner = document.getElementById('emergencyAlertBanner');
        const messageElement = document.getElementById('alertMessage');
        messageElement.textContent = message;
        banner.classList.remove('d-none');
        this.emergencyActive = true;
    }

    dismissAlert() {
        const banner = document.getElementById('emergencyAlertBanner');
        banner.classList.add('d-none');
        this.emergencyActive = false;
    }

    getIncidentTypeText(type) {
        const typeMap = {
            'fire': 'حريق',
            'medical': 'طوارئ طبية',
            'security': 'حادث أمني',
            'natural': 'كارثة طبيعية',
            'technical': 'عطل تقني',
            'accident': 'حادث'
        };
        return typeMap[type] || type;
    }

    getLevelText(level) {
        const levelMap = {
            'critical': 'حرج',
            'high': 'عالي',
            'medium': 'متوسط',
            'low': 'منخفض'
        };
        return levelMap[level] || level;
    }

    getStatusText(status) {
        const statusMap = {
            'active': 'نشط',
            'investigating': 'قيد التحقيق',
            'monitoring': 'مراقبة',
            'resolved': 'محلول'
        };
        return statusMap[status] || status;
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('ar-SA');
    }

    applyFilters() {
        this.currentPage = 1;
        this.loadIncidents();
    }

    clearFilters() {
        this.filters = { search: '', level: '', status: '', type: '', responsible: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('levelFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('typeFilter').value = '';
        document.getElementById('responsibleFilter').value = '';
        this.loadIncidents();
    }

    triggerEmergencyAlert() {
        if (confirm('هل أنت متأكد من تفعيل إنذار الطوارئ؟ سيتم إشعار جميع الموظفين والفرق المختصة.')) {
            this.activateEmergencyAlert();
        }
    }

    async activateEmergencyAlert() {
        try {
            const response = await fetch('/api/emergency/alert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    alert_type: 'general',
                    message: 'تم تفعيل إنذار طوارئ عام'
                })
            });

            if (response.ok) {
                this.showAlert('تم تفعيل إنذار الطوارئ بنجاح', 'warning');
                this.showEmergencyAlert('تم تفعيل إنذار طوارئ عام');
            }
        } catch (error) {
            console.error('Error activating emergency alert:', error);
            this.showAlert('خطأ في تفعيل إنذار الطوارئ', 'error');
        }
    }

    showReportIncidentModal() {
        document.getElementById('reportIncidentForm').reset();
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.querySelector('#reportIncidentForm input[name="incident_time"]').value = now.toISOString().slice(0, 16);
        
        const modal = new bootstrap.Modal(document.getElementById('reportIncidentModal'));
        modal.show();
    }

    async saveIncident() {
        const form = document.getElementById('reportIncidentForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/emergency/incidents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم تسجيل الحادث بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('reportIncidentModal')).hide();
                this.loadIncidents();
                
                if (['critical', 'high'].includes(data.emergency_level)) {
                    this.showEmergencyAlert(`تم تسجيل حادث ${this.getLevelText(data.emergency_level)} الأولوية`);
                }
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في تسجيل الحادث', 'error');
            }
        } catch (error) {
            console.error('Error saving incident:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    showDrillModal() {
        document.getElementById('drillForm').reset();
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.querySelector('#drillForm input[name="drill_datetime"]').value = now.toISOString().slice(0, 16);
        
        const modal = new bootstrap.Modal(document.getElementById('drillModal'));
        modal.show();
    }

    async scheduleDrill() {
        const form = document.getElementById('drillForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/emergency/drills', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم جدولة التدريب بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('drillModal')).hide();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في جدولة التدريب', 'error');
            }
        } catch (error) {
            console.error('Error scheduling drill:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    activateFireProtocol() {
        this.activateProtocol('fire', 'تم تفعيل بروتوكول الحريق');
    }

    activateMedicalEmergency() {
        this.activateProtocol('medical', 'تم تفعيل بروتوكول الطوارئ الطبية');
    }

    activateEvacuation() {
        this.activateProtocol('evacuation', 'تم تفعيل بروتوكول الإخلاء الفوري');
    }

    activateLockdown() {
        this.activateProtocol('lockdown', 'تم تفعيل بروتوكول الإغلاق الأمني');
    }

    async activateProtocol(protocolType, message) {
        if (confirm(`هل أنت متأكد من تفعيل ${message}؟`)) {
            try {
                const response = await fetch('/api/emergency/protocols/activate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ protocol_type: protocolType })
                });

                if (response.ok) {
                    this.showAlert(message, 'warning');
                    this.showEmergencyAlert(message);
                }
            } catch (error) {
                console.error('Error activating protocol:', error);
                this.showAlert('خطأ في تفعيل البروتوكول', 'error');
            }
        }
    }

    viewIncident(incidentId) {
        console.log('View incident:', incidentId);
    }

    updateIncidentStatus(incidentId) {
        console.log('Update incident status:', incidentId);
    }

    async resolveIncident(incidentId) {
        if (!confirm('هل أنت متأكد من حل هذا الحادث؟')) return;

        try {
            const response = await fetch(`/api/emergency/incidents/${incidentId}/resolve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                this.showAlert('تم حل الحادث بنجاح', 'success');
                this.loadIncidents();
            }
        } catch (error) {
            console.error('Error resolving incident:', error);
            this.showAlert('خطأ في حل الحادث', 'error');
        }
    }

    escalateIncident(incidentId) {
        console.log('Escalate incident:', incidentId);
    }

    generateIncidentReport(incidentId) {
        console.log('Generate incident report:', incidentId);
    }

    showProtocolsSection() {
        this.currentSection = 'protocols';
        console.log('Show protocols section');
    }

    showEvacuationSection() {
        this.currentSection = 'evacuation';
        console.log('Show evacuation section');
    }

    showResponseTeamsSection() {
        this.currentSection = 'response-teams';
        console.log('Show response teams section');
    }

    showDrillsSection() {
        this.currentSection = 'drills';
        console.log('Show drills section');
    }

    showReportsSection() {
        this.currentSection = 'reports';
        console.log('Show reports section');
    }

    exportReports() {
        console.log('Export emergency reports');
    }

    showAlert(message, type = 'info') {
        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'success' ? 'alert-success' : 
                          type === 'warning' ? 'alert-warning' : 'alert-info';
        
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

const emergencyManager = new EmergencyManager();
