class RiskManager {
    constructor() {
        this.currentPage = 1;
        this.perPage = 10;
        this.charts = {};
        this.filters = {
            risk_level: '',
            status: '',
            category_id: ''
        };
    }

    async init() {
        await this.loadDashboardData();
        await this.loadRiskCategories();
        await this.loadRisks();
        this.setupEventListeners();
        this.initializeCharts();
    }

    setupEventListeners() {
        // Tab change events
        document.querySelectorAll('#mainTabs button[data-bs-toggle="pill"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (event) => {
                const target = event.target.getAttribute('data-bs-target');
                this.handleTabChange(target);
            });
        });

        // Filter events
        document.getElementById('riskLevelFilter').addEventListener('change', (e) => {
            this.filters.risk_level = e.target.value;
            this.loadRisks();
        });

        document.getElementById('riskStatusFilter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.loadRisks();
        });

        document.getElementById('riskCategoryFilter').addEventListener('change', (e) => {
            this.filters.category_id = e.target.value;
            this.loadRisks();
        });
    }

    async handleTabChange(target) {
        switch(target) {
            case '#risks':
                await this.loadRisks();
                break;
            case '#emergency':
                await this.loadEmergencyPlans();
                break;
            case '#incidents':
                await this.loadIncidents();
                break;
            case '#inspections':
                await this.loadInspections();
                break;
            case '#preventive':
                await this.loadPreventiveMeasures();
                break;
            case '#analytics':
                await this.loadAnalytics();
                break;
        }
    }

    async loadDashboardData() {
        try {
            const response = await fetch('/api/risk-management-dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateStatistics(data.statistics);
                this.updateCharts(data.charts);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('خطأ في تحميل بيانات لوحة التحكم', 'danger');
        }
    }

    updateStatistics(stats) {
        document.getElementById('criticalRisksCount').textContent = stats.risks.critical;
        document.getElementById('highRisksCount').textContent = stats.risks.high;
        document.getElementById('totalIncidentsCount').textContent = stats.incidents.total;
        document.getElementById('emergencyPlansCount').textContent = stats.emergency_plans.total;
    }

    async loadRiskCategories() {
        try {
            const response = await fetch('/api/risk-categories', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.populateCategorySelects(data.categories);
            }
        } catch (error) {
            console.error('Error loading risk categories:', error);
        }
    }

    populateCategorySelects(categories) {
        const selects = ['riskCategoryFilter'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // Clear existing options except the first one
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }
                
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    select.appendChild(option);
                });
            }
        });
    }

    async loadRisks() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.perPage,
                ...this.filters
            });

            const response = await fetch(`/api/risk-assessments?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderRisksTable(data.risks);
                this.renderPagination(data.pagination, 'risksPagination');
            }
        } catch (error) {
            console.error('Error loading risks:', error);
            this.showAlert('خطأ في تحميل المخاطر', 'danger');
        }
    }

    renderRisksTable(risks) {
        const tbody = document.getElementById('risksTableBody');
        tbody.innerHTML = '';

        risks.forEach(risk => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${risk.risk_code}</td>
                <td>${risk.title}</td>
                <td>${risk.category_name || '-'}</td>
                <td>${risk.location || '-'}</td>
                <td>
                    <span class="badge risk-level-${risk.risk_level}">
                        ${this.getRiskLevelText(risk.risk_level)}
                    </span>
                </td>
                <td>${risk.risk_score}</td>
                <td>
                    <span class="badge bg-${this.getStatusColor(risk.status)}">
                        ${this.getStatusText(risk.status)}
                    </span>
                </td>
                <td>${risk.assigned_to || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="riskManager.viewRisk(${risk.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="riskManager.editRisk(${risk.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadEmergencyPlans() {
        try {
            const response = await fetch('/api/emergency-plans', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderEmergencyPlansTable(data.plans);
            }
        } catch (error) {
            console.error('Error loading emergency plans:', error);
            this.showAlert('خطأ في تحميل خطط الطوارئ', 'danger');
        }
    }

    renderEmergencyPlansTable(plans) {
        const tbody = document.getElementById('emergencyPlansTableBody');
        tbody.innerHTML = '';

        plans.forEach(plan => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${plan.plan_code}</td>
                <td>${plan.title}</td>
                <td>${this.getEmergencyTypeText(plan.emergency_type)}</td>
                <td>${plan.scope || '-'}</td>
                <td>${plan.version}</td>
                <td>
                    <span class="badge bg-${this.getApprovalStatusColor(plan.approval_status)}">
                        ${this.getApprovalStatusText(plan.approval_status)}
                    </span>
                </td>
                <td>${plan.coordinator || '-'}</td>
                <td>${plan.last_drill_date ? new Date(plan.last_drill_date).toLocaleDateString('ar-SA') : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="riskManager.viewEmergencyPlan(${plan.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="riskManager.editEmergencyPlan(${plan.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadIncidents() {
        try {
            const response = await fetch('/api/incident-reports', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderIncidentsTable(data.incidents);
            }
        } catch (error) {
            console.error('Error loading incidents:', error);
            this.showAlert('خطأ في تحميل الحوادث', 'danger');
        }
    }

    renderIncidentsTable(incidents) {
        const tbody = document.getElementById('incidentsTableBody');
        tbody.innerHTML = '';

        incidents.forEach(incident => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${incident.incident_number}</td>
                <td>${incident.title}</td>
                <td>${this.getIncidentTypeText(incident.incident_type)}</td>
                <td>
                    <span class="badge bg-${this.getSeverityColor(incident.severity)}">
                        ${this.getSeverityText(incident.severity)}
                    </span>
                </td>
                <td>${new Date(incident.incident_date).toLocaleDateString('ar-SA')}</td>
                <td>${incident.location}</td>
                <td>${incident.injured_count}</td>
                <td>
                    <span class="badge bg-${this.getStatusColor(incident.status)}">
                        ${this.getStatusText(incident.status)}
                    </span>
                </td>
                <td>${incident.reported_by || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="riskManager.viewIncident(${incident.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="riskManager.editIncident(${incident.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadInspections() {
        try {
            const response = await fetch('/api/safety-inspections', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderInspectionsTable(data.inspections);
            }
        } catch (error) {
            console.error('Error loading inspections:', error);
            this.showAlert('خطأ في تحميل التفتيشات', 'danger');
        }
    }

    renderInspectionsTable(inspections) {
        const tbody = document.getElementById('inspectionsTableBody');
        tbody.innerHTML = '';

        inspections.forEach(inspection => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${inspection.inspection_number}</td>
                <td>${inspection.title}</td>
                <td>${this.getInspectionTypeText(inspection.inspection_type)}</td>
                <td>${new Date(inspection.inspection_date).toLocaleDateString('ar-SA')}</td>
                <td>${inspection.overall_rating || '-'}</td>
                <td>${inspection.compliance_percentage}%</td>
                <td>${inspection.lead_inspector || '-'}</td>
                <td>
                    <span class="badge bg-${this.getStatusColor(inspection.status)}">
                        ${this.getStatusText(inspection.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="riskManager.viewInspection(${inspection.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="riskManager.editInspection(${inspection.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadPreventiveMeasures() {
        try {
            const response = await fetch('/api/preventive-measures', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderPreventiveMeasuresTable(data.measures);
            }
        } catch (error) {
            console.error('Error loading preventive measures:', error);
            this.showAlert('خطأ في تحميل التدابير الوقائية', 'danger');
        }
    }

    renderPreventiveMeasuresTable(measures) {
        const tbody = document.getElementById('preventiveMeasuresTableBody');
        tbody.innerHTML = '';

        measures.forEach(measure => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${measure.measure_code}</td>
                <td>${measure.title}</td>
                <td>${this.getMeasureCategoryText(measure.category)}</td>
                <td>${this.getMeasureTypeText(measure.type)}</td>
                <td>
                    <span class="badge bg-${this.getStatusColor(measure.status)}">
                        ${this.getStatusText(measure.status)}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${this.getPriorityColor(measure.priority)}">
                        ${this.getPriorityText(measure.priority)}
                    </span>
                </td>
                <td>${measure.responsible_person || '-'}</td>
                <td>${measure.implementation_date ? new Date(measure.implementation_date).toLocaleDateString('ar-SA') : '-'}</td>
                <td>${measure.estimated_cost ? measure.estimated_cost.toLocaleString('ar-SA') + ' ريال' : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="riskManager.viewPreventiveMeasure(${measure.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="riskManager.editPreventiveMeasure(${measure.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadAnalytics() {
        // Analytics are loaded with dashboard data
        this.renderAnalyticsCharts();
    }

    initializeCharts() {
        // Initialize empty charts
        const ctx1 = document.getElementById('riskByCategoryChart');
        const ctx2 = document.getElementById('incidentsTrendChart');

        if (ctx1) {
            this.charts.riskByCategory = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#4BC0C0',
                            '#9966FF',
                            '#FF9F40'
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

        if (ctx2) {
            this.charts.incidentsTrend = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'عدد الحوادث',
                        data: [],
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    updateCharts(chartData) {
        if (this.charts.riskByCategory && chartData.risk_by_category) {
            this.charts.riskByCategory.data.labels = chartData.risk_by_category.map(item => item.name);
            this.charts.riskByCategory.data.datasets[0].data = chartData.risk_by_category.map(item => item.count);
            this.charts.riskByCategory.update();
        }

        if (this.charts.incidentsTrend && chartData.incidents_trend) {
            this.charts.incidentsTrend.data.labels = chartData.incidents_trend.map(item => item.month);
            this.charts.incidentsTrend.data.datasets[0].data = chartData.incidents_trend.map(item => item.count);
            this.charts.incidentsTrend.update();
        }
    }

    renderAnalyticsCharts() {
        // Charts are updated in updateCharts method
    }

    renderPagination(pagination, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        if (pagination.pages <= 1) return;

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${pagination.page === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `
            <a class="page-link" href="#" onclick="riskManager.changePage(${pagination.page - 1})">
                السابق
            </a>
        `;
        container.appendChild(prevLi);

        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === pagination.page ? 'active' : ''}`;
            li.innerHTML = `
                <a class="page-link" href="#" onclick="riskManager.changePage(${i})">
                    ${i}
                </a>
            `;
            container.appendChild(li);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`;
        nextLi.innerHTML = `
            <a class="page-link" href="#" onclick="riskManager.changePage(${pagination.page + 1})">
                التالي
            </a>
        `;
        container.appendChild(nextLi);
    }

    changePage(page) {
        this.currentPage = page;
        this.loadRisks();
    }

    // Helper methods for text conversion
    getRiskLevelText(level) {
        const levels = {
            'critical': 'حرجة',
            'high': 'عالية',
            'medium': 'متوسطة',
            'low': 'منخفضة'
        };
        return levels[level] || level;
    }

    getStatusText(status) {
        const statuses = {
            'identified': 'محددة',
            'assessed': 'مقيمة',
            'mitigated': 'مخففة',
            'closed': 'مغلقة',
            'active': 'نشطة',
            'inactive': 'غير نشطة',
            'pending': 'معلقة',
            'approved': 'موافق عليها',
            'rejected': 'مرفوضة',
            'scheduled': 'مجدولة',
            'completed': 'مكتملة',
            'in_progress': 'قيد التنفيذ'
        };
        return statuses[status] || status;
    }

    getStatusColor(status) {
        const colors = {
            'identified': 'warning',
            'assessed': 'info',
            'mitigated': 'success',
            'closed': 'secondary',
            'active': 'success',
            'inactive': 'secondary',
            'pending': 'warning',
            'approved': 'success',
            'rejected': 'danger',
            'scheduled': 'info',
            'completed': 'success',
            'in_progress': 'primary'
        };
        return colors[status] || 'secondary';
    }

    getEmergencyTypeText(type) {
        const types = {
            'fire': 'حريق',
            'earthquake': 'زلزال',
            'flood': 'فيضان',
            'medical': 'طبي',
            'security': 'أمني',
            'evacuation': 'إخلاء',
            'other': 'أخرى'
        };
        return types[type] || type;
    }

    getApprovalStatusText(status) {
        return this.getStatusText(status);
    }

    getApprovalStatusColor(status) {
        return this.getStatusColor(status);
    }

    getIncidentTypeText(type) {
        const types = {
            'injury': 'إصابة',
            'property_damage': 'تلف في الممتلكات',
            'near_miss': 'كاد أن يحدث',
            'environmental': 'بيئي',
            'security': 'أمني',
            'other': 'أخرى'
        };
        return types[type] || type;
    }

    getSeverityText(severity) {
        const severities = {
            'minor': 'طفيف',
            'moderate': 'متوسط',
            'major': 'كبير',
            'critical': 'حرج'
        };
        return severities[severity] || severity;
    }

    getSeverityColor(severity) {
        const colors = {
            'minor': 'success',
            'moderate': 'warning',
            'major': 'danger',
            'critical': 'dark'
        };
        return colors[severity] || 'secondary';
    }

    getInspectionTypeText(type) {
        const types = {
            'routine': 'روتيني',
            'special': 'خاص',
            'follow_up': 'متابعة',
            'compliance': 'امتثال',
            'other': 'أخرى'
        };
        return types[type] || type;
    }

    getMeasureCategoryText(category) {
        const categories = {
            'administrative': 'إدارية',
            'engineering': 'هندسية',
            'ppe': 'معدات الحماية الشخصية',
            'training': 'تدريب',
            'procedural': 'إجرائية',
            'other': 'أخرى'
        };
        return categories[category] || category;
    }

    getMeasureTypeText(type) {
        const types = {
            'preventive': 'وقائية',
            'corrective': 'تصحيحية',
            'detective': 'كشفية',
            'compensating': 'تعويضية'
        };
        return types[type] || type;
    }

    getPriorityText(priority) {
        const priorities = {
            'low': 'منخفضة',
            'medium': 'متوسطة',
            'high': 'عالية',
            'critical': 'حرجة'
        };
        return priorities[priority] || priority;
    }

    getPriorityColor(priority) {
        const colors = {
            'low': 'success',
            'medium': 'info',
            'high': 'warning',
            'critical': 'danger'
        };
        return colors[priority] || 'secondary';
    }

    // Action methods (placeholders for future implementation)
    viewRisk(id) {
        console.log('View risk:', id);
        // TODO: Implement view risk modal
    }

    editRisk(id) {
        console.log('Edit risk:', id);
        // TODO: Implement edit risk modal
    }

    viewEmergencyPlan(id) {
        console.log('View emergency plan:', id);
        // TODO: Implement view emergency plan modal
    }

    editEmergencyPlan(id) {
        console.log('Edit emergency plan:', id);
        // TODO: Implement edit emergency plan modal
    }

    viewIncident(id) {
        console.log('View incident:', id);
        // TODO: Implement view incident modal
    }

    editIncident(id) {
        console.log('Edit incident:', id);
        // TODO: Implement edit incident modal
    }

    viewInspection(id) {
        console.log('View inspection:', id);
        // TODO: Implement view inspection modal
    }

    editInspection(id) {
        console.log('Edit inspection:', id);
        // TODO: Implement edit inspection modal
    }

    viewPreventiveMeasure(id) {
        console.log('View preventive measure:', id);
        // TODO: Implement view preventive measure modal
    }

    editPreventiveMeasure(id) {
        console.log('Edit preventive measure:', id);
        // TODO: Implement edit preventive measure modal
    }

    showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}
