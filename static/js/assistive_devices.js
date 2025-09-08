class AssistiveDeviceManager {
    constructor() {
        this.devices = [];
        this.categories = [];
        this.beneficiaries = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.totalPages = 1;
        this.filters = {
            search: '',
            category: '',
            status: '',
            condition: ''
        };
        this.viewMode = 'grid'; // grid or list
    }

    async init() {
        try {
            await this.loadCategories();
            await this.loadBeneficiaries();
            await this.loadDevices();
            this.setupEventListeners();
            this.updateStatistics();
        } catch (error) {
            console.error('Error initializing device manager:', error);
            this.showAlert('خطأ في تحميل البيانات', 'error');
        }
    }

    setupEventListeners() {
        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.debounceSearch();
        });

        // Filter selects
        ['categoryFilter', 'statusFilter', 'conditionFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const filterType = id.replace('Filter', '');
                this.filters[filterType] = e.target.value;
                this.applyFilters();
            });
        });

        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        document.querySelectorAll('input[name="assignment_date"], input[name="maintenance_date"]').forEach(input => {
            input.value = today;
        });
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.applyFilters();
        }, 500);
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/assistive-devices/categories', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.categories = await response.json();
                this.populateCategorySelects();
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadBeneficiaries() {
        try {
            const response = await fetch('/api/rehabilitation/beneficiaries', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
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

    async loadDevices(page = 1) {
        try {
            const params = new URLSearchParams({
                page: page,
                per_page: this.itemsPerPage,
                ...this.filters
            });

            const response = await fetch(`/api/assistive-devices?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.devices = data.devices || [];
                this.currentPage = data.pagination?.page || 1;
                this.totalPages = data.pagination?.pages || 1;
                
                this.renderDevices();
                this.renderPagination();
                this.updateStatistics();
            }
        } catch (error) {
            console.error('Error loading devices:', error);
            this.showAlert('خطأ في تحميل الأجهزة', 'error');
        }
    }

    populateCategorySelects() {
        const selects = document.querySelectorAll('select[name="category_id"], #categoryFilter');
        selects.forEach(select => {
            // Clear existing options except first one
            const firstOption = select.querySelector('option');
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);

            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });
        });
    }

    populateBeneficiarySelects() {
        const selects = document.querySelectorAll('select[name="beneficiary_id"]');
        selects.forEach(select => {
            // Clear existing options except first one
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

    renderDevices() {
        const container = document.getElementById('devicesContainer');
        
        if (this.devices.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-wheelchair fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد أجهزة</h5>
                    <p class="text-muted">لم يتم العثور على أجهزة مطابقة للمعايير المحددة</p>
                </div>
            `;
            return;
        }

        if (this.viewMode === 'grid') {
            this.renderGridView(container);
        } else {
            this.renderListView(container);
        }
    }

    renderGridView(container) {
        const devicesHtml = this.devices.map(device => `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="device-card h-100">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0">${device.name}</h6>
                        <span class="device-status status-${device.status}">
                            ${this.getStatusText(device.status)}
                        </span>
                    </div>
                    
                    <div class="mb-2">
                        <small class="text-muted">الفئة:</small>
                        <span class="badge bg-secondary">${device.category.name}</span>
                    </div>
                    
                    <div class="mb-2">
                        <small class="text-muted">الطراز:</small> ${device.model || 'غير محدد'}
                    </div>
                    
                    <div class="mb-2">
                        <small class="text-muted">الحالة الفنية:</small>
                        <span class="condition-${device.condition}">
                            <i class="fas fa-circle me-1"></i>
                            ${this.getConditionText(device.condition)}
                        </span>
                    </div>
                    
                    ${device.current_assignment ? `
                        <div class="assignment-info">
                            <small><i class="fas fa-user me-1"></i>
                            مخصص لـ: ${device.current_assignment.beneficiary_name}</small>
                        </div>
                    ` : ''}
                    
                    ${this.needsMaintenance(device) ? `
                        <div class="maintenance-alert">
                            <small><i class="fas fa-exclamation-triangle me-1"></i>
                            يحتاج صيانة</small>
                        </div>
                    ` : ''}
                    
                    <div class="mt-3 d-flex gap-1">
                        <button class="btn btn-sm btn-outline-primary" onclick="deviceManager.viewDevice(${device.id})" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="deviceManager.editDevice(${device.id})" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${device.status === 'available' ? `
                            <button class="btn btn-sm btn-outline-success" onclick="deviceManager.showAssignModal(${device.id})" title="تخصيص">
                                <i class="fas fa-user-plus"></i>
                            </button>
                        ` : ''}
                        ${device.status === 'assigned' ? `
                            <button class="btn btn-sm btn-outline-warning" onclick="deviceManager.showReturnModal(${device.id})" title="إرجاع">
                                <i class="fas fa-undo"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-outline-info" onclick="deviceManager.showMaintenanceModal(${device.id})" title="صيانة">
                            <i class="fas fa-tools"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `<div class="row">${devicesHtml}</div>`;
    }

    renderListView(container) {
        const devicesHtml = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>الجهاز</th>
                            <th>الفئة</th>
                            <th>الحالة</th>
                            <th>الحالة الفنية</th>
                            <th>المخصص له</th>
                            <th>الموقع</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.devices.map(device => `
                            <tr>
                                <td>
                                    <div>
                                        <strong>${device.name}</strong>
                                        <br><small class="text-muted">${device.model || 'غير محدد'}</small>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge bg-secondary">${device.category.name}</span>
                                </td>
                                <td>
                                    <span class="device-status status-${device.status}">
                                        ${this.getStatusText(device.status)}
                                    </span>
                                </td>
                                <td>
                                    <span class="condition-${device.condition}">
                                        <i class="fas fa-circle me-1"></i>
                                        ${this.getConditionText(device.condition)}
                                    </span>
                                </td>
                                <td>
                                    ${device.current_assignment ? 
                                        device.current_assignment.beneficiary_name : 
                                        '<span class="text-muted">غير مخصص</span>'
                                    }
                                </td>
                                <td>${device.location || 'غير محدد'}</td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" onclick="deviceManager.viewDevice(${device.id})" title="عرض">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-outline-secondary" onclick="deviceManager.editDevice(${device.id})" title="تعديل">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ${device.status === 'available' ? `
                                            <button class="btn btn-outline-success" onclick="deviceManager.showAssignModal(${device.id})" title="تخصيص">
                                                <i class="fas fa-user-plus"></i>
                                            </button>
                                        ` : ''}
                                        ${device.status === 'assigned' ? `
                                            <button class="btn btn-outline-warning" onclick="deviceManager.showReturnModal(${device.id})" title="إرجاع">
                                                <i class="fas fa-undo"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-outline-info" onclick="deviceManager.showMaintenanceModal(${device.id})" title="صيانة">
                                            <i class="fas fa-tools"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = devicesHtml;
    }

    renderPagination() {
        const pagination = document.getElementById('devicesPagination');
        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHtml = '';
        
        // Previous button
        paginationHtml += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="deviceManager.loadDevices(${this.currentPage - 1})">السابق</a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="deviceManager.loadDevices(${i})">${i}</a>
                </li>
            `;
        }

        // Next button
        paginationHtml += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="deviceManager.loadDevices(${this.currentPage + 1})">التالي</a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;
    }

    updateStatistics() {
        const stats = {
            total: this.devices.length,
            available: this.devices.filter(d => d.status === 'available').length,
            assigned: this.devices.filter(d => d.status === 'assigned').length,
            maintenance: this.devices.filter(d => d.status === 'maintenance').length
        };

        document.getElementById('totalDevices').textContent = stats.total;
        document.getElementById('availableDevices').textContent = stats.available;
        document.getElementById('assignedDevices').textContent = stats.assigned;
        document.getElementById('maintenanceDevices').textContent = stats.maintenance;
    }

    getStatusText(status) {
        const statusMap = {
            'available': 'متاح',
            'assigned': 'مخصص',
            'maintenance': 'تحت الصيانة',
            'retired': 'متقاعد'
        };
        return statusMap[status] || status;
    }

    getConditionText(condition) {
        const conditionMap = {
            'excellent': 'ممتاز',
            'good': 'جيد',
            'fair': 'مقبول',
            'poor': 'ضعيف'
        };
        return conditionMap[condition] || condition;
    }

    needsMaintenance(device) {
        if (!device.next_maintenance) return false;
        const nextMaintenance = new Date(device.next_maintenance);
        const today = new Date();
        const daysUntilMaintenance = Math.ceil((nextMaintenance - today) / (1000 * 60 * 60 * 24));
        return daysUntilMaintenance <= 7;
    }

    applyFilters() {
        this.currentPage = 1;
        this.loadDevices();
    }

    clearFilters() {
        this.filters = {
            search: '',
            category: '',
            status: '',
            condition: ''
        };
        
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('conditionFilter').value = '';
        
        this.loadDevices();
    }

    toggleView() {
        this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
        this.renderDevices();
    }

    showAddDeviceModal() {
        document.getElementById('addDeviceForm').reset();
        const modal = new bootstrap.Modal(document.getElementById('addDeviceModal'));
        modal.show();
    }

    async saveDevice() {
        const form = document.getElementById('addDeviceForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Process specifications and features
        if (data.specifications) {
            try {
                data.specifications = JSON.parse(data.specifications);
            } catch {
                data.specifications = { description: data.specifications };
            }
        }

        if (data.features) {
            data.features = data.features.split(',').map(f => f.trim()).filter(f => f);
        }

        try {
            const response = await fetch('/api/assistive-devices', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم إضافة الجهاز بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addDeviceModal')).hide();
                this.loadDevices();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إضافة الجهاز', 'error');
            }
        } catch (error) {
            console.error('Error saving device:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    showAssignModal(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) return;

        document.getElementById('assignDeviceForm').reset();
        document.querySelector('#assignDeviceForm input[name="device_id"]').value = deviceId;
        
        const modal = new bootstrap.Modal(document.getElementById('assignDeviceModal'));
        modal.show();
    }

    async assignDevice() {
        const form = document.getElementById('assignDeviceForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const deviceId = data.device_id;
        delete data.device_id;

        try {
            const response = await fetch(`/api/assistive-devices/${deviceId}/assign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم تخصيص الجهاز بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('assignDeviceModal')).hide();
                this.loadDevices();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في تخصيص الجهاز', 'error');
            }
        } catch (error) {
            console.error('Error assigning device:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    showReturnModal(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) return;

        document.getElementById('returnDeviceForm').reset();
        document.querySelector('#returnDeviceForm input[name="device_id"]').value = deviceId;
        
        const modal = new bootstrap.Modal(document.getElementById('returnDeviceModal'));
        modal.show();
    }

    async returnDevice() {
        const form = document.getElementById('returnDeviceForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const deviceId = data.device_id;
        delete data.device_id;

        try {
            const response = await fetch(`/api/assistive-devices/${deviceId}/return`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم إرجاع الجهاز بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('returnDeviceModal')).hide();
                this.loadDevices();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إرجاع الجهاز', 'error');
            }
        } catch (error) {
            console.error('Error returning device:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    showMaintenanceModal(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) return;

        document.getElementById('maintenanceForm').reset();
        document.querySelector('#maintenanceForm input[name="device_id"]').value = deviceId;
        
        const modal = new bootstrap.Modal(document.getElementById('maintenanceModal'));
        modal.show();
    }

    async saveMaintenance() {
        const form = document.getElementById('maintenanceForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const deviceId = data.device_id;
        delete data.device_id;

        // Process parts_replaced
        if (data.parts_replaced) {
            data.parts_replaced = data.parts_replaced.split(',').map(p => p.trim()).filter(p => p);
        }

        try {
            const response = await fetch(`/api/assistive-devices/${deviceId}/maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showAlert('تم إضافة سجل الصيانة بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('maintenanceModal')).hide();
                this.loadDevices();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إضافة سجل الصيانة', 'error');
            }
        } catch (error) {
            console.error('Error saving maintenance:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'error');
        }
    }

    viewDevice(deviceId) {
        // Implement device details view
        console.log('View device:', deviceId);
    }

    editDevice(deviceId) {
        // Implement device editing
        console.log('Edit device:', deviceId);
    }

    exportDevices() {
        // Implement export functionality
        console.log('Export devices');
    }

    showAddCategoryModal() {
        // Implement category management
        console.log('Add category');
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
        
        // Insert alert at the top of the page
        const container = document.querySelector('.container-fluid');
        container.insertAdjacentHTML('afterbegin', alertHtml);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

// Initialize the device manager
const deviceManager = new AssistiveDeviceManager();
