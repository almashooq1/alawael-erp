// نظام إدارة المركبات

// متغيرات عامة
let vehiclesData = [];
let branchesData = [];
let filteredVehicles = [];

// تحميل بيانات المركبات
async function loadVehicles() {
    try {
        const response = await fetch('/api/vehicles', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            vehiclesData = data.vehicles;
            filteredVehicles = [...vehiclesData];
            renderVehiclesTable();
            updateVehiclesStatistics();
        } else {
            showAlert('خطأ في تحميل المركبات: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل المركبات:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// تحميل بيانات الفروع
async function loadBranches() {
    try {
        const response = await fetch('/api/branches', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            branchesData = data.branches;
            populateBranchSelects();
        }
    } catch (error) {
        console.error('خطأ في تحميل الفروع:', error);
    }
}

// ملء قوائم الفروع
function populateBranchSelects() {
    const selects = ['vehicleBranchFilter', 'vehicleBranchId'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // الاحتفاظ بالخيار الأول
            const firstOption = select.querySelector('option');
            select.innerHTML = '';
            if (firstOption) {
                select.appendChild(firstOption);
            }
            
            branchesData.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.id;
                option.textContent = branch.name;
                select.appendChild(option);
            });
        }
    });
}

// عرض جدول المركبات
function renderVehiclesTable() {
    const tbody = document.getElementById('vehiclesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    filteredVehicles.forEach(vehicle => {
        const row = document.createElement('tr');
        
        const statusBadge = getVehicleStatusBadge(vehicle);
        const insuranceStatus = getExpiryStatus(vehicle.insurance_expiry);
        const licenseStatus = getExpiryStatus(vehicle.license_expiry);
        
        row.innerHTML = `
            <td>
                <strong>${vehicle.plate_number}</strong>
            </td>
            <td>${vehicle.vehicle_type}</td>
            <td>${vehicle.brand || ''} ${vehicle.model || ''}</td>
            <td>
                ${vehicle.driver_name ? `
                    <div>${vehicle.driver_name}</div>
                    <small class="text-muted">${vehicle.driver_phone || ''}</small>
                ` : '<span class="text-muted">غير محدد</span>'}
            </td>
            <td>${vehicle.branch_name || '<span class="text-muted">غير محدد</span>'}</td>
            <td>
                ${vehicle.capacity ? `
                    <span class="badge bg-info">${vehicle.capacity} راكب</span>
                ` : '<span class="text-muted">غير محدد</span>'}
            </td>
            <td>${statusBadge}</td>
            <td>
                <span class="badge ${insuranceStatus.class}">${insuranceStatus.text}</span>
            </td>
            <td>
                <span class="badge ${licenseStatus.class}">${licenseStatus.text}</span>
            </td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary" onclick="showVehicleDetails(${vehicle.id})" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editVehicle(${vehicle.id})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteVehicle(${vehicle.id}, '${vehicle.plate_number}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// الحصول على شارة حالة المركبة
function getVehicleStatusBadge(vehicle) {
    if (!vehicle.is_active) {
        return '<span class="badge bg-secondary">غير نشط</span>';
    }
    
    const today = new Date();
    const insuranceExpiry = new Date(vehicle.insurance_expiry);
    const licenseExpiry = new Date(vehicle.license_expiry);
    
    if (insuranceExpiry < today || licenseExpiry < today) {
        return '<span class="badge bg-danger">منتهي الصلاحية</span>';
    }
    
    const warningDays = 30;
    const insuranceWarning = (insuranceExpiry - today) / (1000 * 60 * 60 * 24) < warningDays;
    const licenseWarning = (licenseExpiry - today) / (1000 * 60 * 60 * 24) < warningDays;
    
    if (insuranceWarning || licenseWarning) {
        return '<span class="badge bg-warning">يحتاج تجديد</span>';
    }
    
    return '<span class="badge bg-success">نشط</span>';
}

// الحصول على حالة انتهاء الصلاحية
function getExpiryStatus(expiryDate) {
    if (!expiryDate) {
        return { class: 'bg-secondary', text: 'غير محدد' };
    }
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
        return { class: 'bg-danger', text: `منتهي منذ ${Math.abs(daysUntilExpiry)} يوم` };
    } else if (daysUntilExpiry <= 30) {
        return { class: 'bg-warning', text: `${daysUntilExpiry} يوم متبقي` };
    } else {
        return { class: 'bg-success', text: expiry.toLocaleDateString('ar-SA') };
    }
}

// تحديث إحصائيات المركبات
function updateVehiclesStatistics() {
    const total = vehiclesData.length;
    const active = vehiclesData.filter(v => v.is_active).length;
    
    const today = new Date();
    const needsMaintenance = vehiclesData.filter(v => {
        if (!v.is_active) return false;
        const insuranceExpiry = new Date(v.insurance_expiry);
        const licenseExpiry = new Date(v.license_expiry);
        const warningDays = 30;
        
        const insuranceWarning = (insuranceExpiry - today) / (1000 * 60 * 60 * 24) < warningDays && insuranceExpiry > today;
        const licenseWarning = (licenseExpiry - today) / (1000 * 60 * 60 * 24) < warningDays && licenseExpiry > today;
        
        return insuranceWarning || licenseWarning;
    }).length;
    
    const expired = vehiclesData.filter(v => {
        if (!v.is_active) return false;
        const insuranceExpiry = new Date(v.insurance_expiry);
        const licenseExpiry = new Date(v.license_expiry);
        return insuranceExpiry < today || licenseExpiry < today;
    }).length;
    
    document.getElementById('totalVehicles').textContent = total;
    document.getElementById('activeVehicles').textContent = active;
    document.getElementById('maintenanceVehicles').textContent = needsMaintenance;
    document.getElementById('expiredVehicles').textContent = expired;
}

// تصفية المركبات
function filterVehicles() {
    const typeFilter = document.getElementById('vehicleTypeFilter').value;
    const branchFilter = document.getElementById('vehicleBranchFilter').value;
    const statusFilter = document.getElementById('vehicleStatusFilter').value;
    
    filteredVehicles = vehiclesData.filter(vehicle => {
        const typeMatch = !typeFilter || vehicle.vehicle_type === typeFilter;
        const branchMatch = !branchFilter || vehicle.branch_id == branchFilter;
        
        let statusMatch = true;
        if (statusFilter) {
            if (statusFilter === 'نشط') {
                statusMatch = vehicle.is_active;
            } else if (statusFilter === 'غير نشط') {
                statusMatch = !vehicle.is_active;
            } else if (statusFilter === 'صيانة') {
                const today = new Date();
                const insuranceExpiry = new Date(vehicle.insurance_expiry);
                const licenseExpiry = new Date(vehicle.license_expiry);
                const warningDays = 30;
                
                const insuranceWarning = (insuranceExpiry - today) / (1000 * 60 * 60 * 24) < warningDays;
                const licenseWarning = (licenseExpiry - today) / (1000 * 60 * 60 * 24) < warningDays;
                
                statusMatch = insuranceWarning || licenseWarning;
            }
        }
        
        return typeMatch && branchMatch && statusMatch;
    });
    
    renderVehiclesTable();
}

// البحث في المركبات
function searchVehicles() {
    const searchTerm = document.getElementById('vehicleSearchInput').value.toLowerCase();
    
    if (!searchTerm) {
        filterVehicles();
        return;
    }
    
    filteredVehicles = vehiclesData.filter(vehicle => {
        return vehicle.plate_number.toLowerCase().includes(searchTerm) ||
               (vehicle.driver_name && vehicle.driver_name.toLowerCase().includes(searchTerm)) ||
               (vehicle.driver_phone && vehicle.driver_phone.includes(searchTerm)) ||
               (vehicle.brand && vehicle.brand.toLowerCase().includes(searchTerm)) ||
               (vehicle.model && vehicle.model.toLowerCase().includes(searchTerm));
    });
    
    renderVehiclesTable();
}

// عرض نافذة إضافة مركبة
function showAddVehicleModal() {
    document.getElementById('vehicleModalTitle').textContent = 'إضافة مركبة جديدة';
    document.getElementById('vehicleForm').reset();
    document.getElementById('vehicleId').value = '';
    document.getElementById('vehicleIsActive').checked = true;
    
    const modal = new bootstrap.Modal(document.getElementById('vehicleModal'));
    modal.show();
}

// تعديل مركبة
function editVehicle(vehicleId) {
    const vehicle = vehiclesData.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    document.getElementById('vehicleModalTitle').textContent = 'تعديل المركبة';
    document.getElementById('vehicleId').value = vehicle.id;
    document.getElementById('plateNumber').value = vehicle.plate_number;
    document.getElementById('vehicleType').value = vehicle.vehicle_type;
    document.getElementById('vehicleBrand').value = vehicle.brand || '';
    document.getElementById('vehicleModel').value = vehicle.model || '';
    document.getElementById('vehicleYear').value = vehicle.year || '';
    document.getElementById('vehicleColor').value = vehicle.color || '';
    document.getElementById('vehicleCapacity').value = vehicle.capacity || '';
    document.getElementById('driverName').value = vehicle.driver_name || '';
    document.getElementById('driverPhone').value = vehicle.driver_phone || '';
    document.getElementById('driverLicense').value = vehicle.driver_license || '';
    document.getElementById('vehicleBranchId').value = vehicle.branch_id || '';
    document.getElementById('insuranceExpiry').value = vehicle.insurance_expiry || '';
    document.getElementById('licenseExpiry').value = vehicle.license_expiry || '';
    document.getElementById('vehicleNotes').value = vehicle.notes || '';
    document.getElementById('vehicleIsActive').checked = vehicle.is_active;
    
    const modal = new bootstrap.Modal(document.getElementById('vehicleModal'));
    modal.show();
}

// حفظ المركبة
async function saveVehicle() {
    const vehicleId = document.getElementById('vehicleId').value;
    const isEdit = vehicleId !== '';
    
    const vehicleData = {
        plate_number: document.getElementById('plateNumber').value,
        vehicle_type: document.getElementById('vehicleType').value,
        brand: document.getElementById('vehicleBrand').value,
        model: document.getElementById('vehicleModel').value,
        year: parseInt(document.getElementById('vehicleYear').value) || null,
        color: document.getElementById('vehicleColor').value,
        capacity: parseInt(document.getElementById('vehicleCapacity').value) || null,
        driver_name: document.getElementById('driverName').value,
        driver_phone: document.getElementById('driverPhone').value,
        driver_license: document.getElementById('driverLicense').value,
        branch_id: parseInt(document.getElementById('vehicleBranchId').value) || null,
        insurance_expiry: document.getElementById('insuranceExpiry').value || null,
        license_expiry: document.getElementById('licenseExpiry').value || null,
        notes: document.getElementById('vehicleNotes').value,
        is_active: document.getElementById('vehicleIsActive').checked
    };
    
    // التحقق من صحة البيانات
    if (!vehicleData.plate_number || !vehicleData.vehicle_type) {
        showAlert('يرجى ملء الحقول المطلوبة', 'warning');
        return;
    }
    
    try {
        const url = isEdit ? `/api/vehicles/${vehicleId}` : '/api/vehicles';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(vehicleData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(isEdit ? 'تم تحديث المركبة بنجاح' : 'تم إضافة المركبة بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('vehicleModal')).hide();
            loadVehicles();
        } else {
            showAlert('خطأ في حفظ المركبة: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('خطأ في حفظ المركبة:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// عرض تفاصيل المركبة
function showVehicleDetails(vehicleId) {
    const vehicle = vehiclesData.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    const detailsContent = document.getElementById('vehicleDetailsContent');
    
    detailsContent.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary">معلومات المركبة</h6>
                <table class="table table-sm">
                    <tr><td><strong>رقم اللوحة:</strong></td><td>${vehicle.plate_number}</td></tr>
                    <tr><td><strong>النوع:</strong></td><td>${vehicle.vehicle_type}</td></tr>
                    <tr><td><strong>الماركة:</strong></td><td>${vehicle.brand || 'غير محدد'}</td></tr>
                    <tr><td><strong>الموديل:</strong></td><td>${vehicle.model || 'غير محدد'}</td></tr>
                    <tr><td><strong>سنة الصنع:</strong></td><td>${vehicle.year || 'غير محدد'}</td></tr>
                    <tr><td><strong>اللون:</strong></td><td>${vehicle.color || 'غير محدد'}</td></tr>
                    <tr><td><strong>السعة:</strong></td><td>${vehicle.capacity ? vehicle.capacity + ' راكب' : 'غير محدد'}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="text-primary">معلومات السائق</h6>
                <table class="table table-sm">
                    <tr><td><strong>اسم السائق:</strong></td><td>${vehicle.driver_name || 'غير محدد'}</td></tr>
                    <tr><td><strong>رقم الهاتف:</strong></td><td>${vehicle.driver_phone || 'غير محدد'}</td></tr>
                    <tr><td><strong>رقم الرخصة:</strong></td><td>${vehicle.driver_license || 'غير محدد'}</td></tr>
                </table>
                
                <h6 class="text-primary">معلومات إضافية</h6>
                <table class="table table-sm">
                    <tr><td><strong>الفرع:</strong></td><td>${vehicle.branch_name || 'غير محدد'}</td></tr>
                    <tr><td><strong>انتهاء التأمين:</strong></td><td>${vehicle.insurance_expiry || 'غير محدد'}</td></tr>
                    <tr><td><strong>انتهاء الرخصة:</strong></td><td>${vehicle.license_expiry || 'غير محدد'}</td></tr>
                    <tr><td><strong>الحالة:</strong></td><td>${vehicle.is_active ? 'نشط' : 'غير نشط'}</td></tr>
                </table>
            </div>
        </div>
        
        ${vehicle.notes ? `
            <div class="mt-3">
                <h6 class="text-primary">ملاحظات</h6>
                <p class="text-muted">${vehicle.notes}</p>
            </div>
        ` : ''}
        
        <div class="mt-3">
            <h6 class="text-primary">إحصائيات النقل</h6>
            <p class="text-muted">عدد الطلاب المسجلين: <strong>${vehicle.active_transports || 0}</strong></p>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('vehicleDetailsModal'));
    modal.show();
}

// حذف مركبة
async function deleteVehicle(vehicleId, plateNumber) {
    if (!confirm(`هل أنت متأكد من حذف المركبة ${plateNumber}؟`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('تم حذف المركبة بنجاح', 'success');
            loadVehicles();
        } else {
            showAlert('خطأ في حذف المركبة: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('خطأ في حذف المركبة:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// تهيئة صفحة المركبات
function initVehiclesPage() {
    loadBranches();
    loadVehicles();
}

// تحديث وظائف التحميل في dashboard.js
if (typeof loadSectionData !== 'undefined') {
    const originalLoadSectionData = loadSectionData;
    loadSectionData = function(sectionId) {
        if (sectionId === 'vehicles') {
            initVehiclesPage();
        } else {
            originalLoadSectionData(sectionId);
        }
    };
}
