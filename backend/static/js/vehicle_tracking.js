// نظام تتبع المركبات - JavaScript

// متغيرات عامة
let trackingData = [];
let alertsData = [];
let trackingFilters = {
    vehicle_id: '',
    start_date: '',
    end_date: '',
    status: ''
};

// تهيئة صفحة تتبع المركبات
function initVehicleTrackingPage() {
    // تعيين التاريخ الافتراضي
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trackingStartDate').value = today;
    document.getElementById('trackingEndDate').value = today;
    
    // تحميل البيانات
    loadVehicleTrackingData();
    loadVehicleAlertsData();
    loadVehiclesForTracking();
    
    // إعداد مستمعي الأحداث
    setupTrackingEventListeners();
    
    // تحديث تلقائي كل دقيقة
    setInterval(loadVehicleTrackingData, 60000);
}

// إعداد مستمعي الأحداث
function setupTrackingEventListeners() {
    // فلاتر التتبع
    document.getElementById('trackingVehicleFilter').addEventListener('change', filterVehicleTracking);
    document.getElementById('trackingStartDate').addEventListener('change', filterVehicleTracking);
    document.getElementById('trackingEndDate').addEventListener('change', filterVehicleTracking);
    document.getElementById('trackingStatusFilter').addEventListener('change', filterVehicleTracking);
}

// تحميل بيانات تتبع المركبات
async function loadVehicleTrackingData() {
    try {
        const params = new URLSearchParams();
        if (trackingFilters.vehicle_id) params.append('vehicle_id', trackingFilters.vehicle_id);
        if (trackingFilters.start_date) params.append('start_date', trackingFilters.start_date);
        if (trackingFilters.end_date) params.append('end_date', trackingFilters.end_date);
        
        const response = await fetch(`/api/vehicle/tracking/reports?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            trackingData = await response.json();
            renderTrackingTable();
            updateTrackingStatistics();
        } else {
            console.error('فشل في تحميل بيانات التتبع');
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات التتبع:', error);
    }
}

// تحميل بيانات تنبيهات المركبات
async function loadVehicleAlertsData() {
    try {
        const response = await fetch('/api/vehicle/alerts', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            alertsData = await response.json();
            renderAlertsTable();
        } else {
            console.error('فشل في تحميل بيانات التنبيهات');
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات التنبيهات:', error);
    }
}

// تحميل قائمة المركبات للفلترة
async function loadVehiclesForTracking() {
    try {
        const response = await fetch('/api/vehicles');
        if (response.ok) {
            const vehicles = await response.json();
            const select = document.getElementById('trackingVehicleFilter');
            
            // مسح الخيارات الحالية
            select.innerHTML = '<option value="">جميع المركبات</option>';
            
            // إضافة المركبات
            vehicles.forEach(vehicle => {
                const option = document.createElement('option');
                option.value = vehicle.id;
                option.textContent = `${vehicle.plate_number} - ${vehicle.vehicle_type}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('خطأ في تحميل قائمة المركبات:', error);
    }
}

// عرض جدول التتبع
function renderTrackingTable() {
    const tbody = document.getElementById('trackingTableBody');
    
    if (!trackingData || trackingData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">لا توجد بيانات تتبع</td></tr>';
        return;
    }
    
    tbody.innerHTML = trackingData.map(record => `
        <tr>
            <td>${record.vehicle_plate}</td>
            <td>${record.driver_phone}</td>
            <td>${record.tracking_date}</td>
            <td>${record.start_time || 'غير محدد'}</td>
            <td>${record.end_time || 'غير محدد'}</td>
            <td>${record.total_distance || 'غير محدد'}</td>
            <td>${record.max_speed || 'غير محدد'} كم/س</td>
            <td>
                <span class="badge ${getTrackingStatusClass(record.route_status)}">
                    ${record.route_status}
                </span>
            </td>
            <td>
                ${record.emergency_alerts > 0 ? 
                    `<span class="badge bg-danger">${record.emergency_alerts}</span>` : 
                    '<span class="badge bg-success">0</span>'
                }
            </td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewTrackingDetails(${record.id})">
                    <i class="fas fa-eye"></i>
                </button>
                ${record.gps_points_count > 0 ? 
                    `<button class="btn btn-sm btn-primary" onclick="viewTrackingMap(${record.id})">
                        <i class="fas fa-map"></i>
                    </button>` : ''
                }
            </td>
        </tr>
    `).join('');
}

// عرض جدول التنبيهات
function renderAlertsTable() {
    const tbody = document.getElementById('alertsTableBody');
    
    if (!alertsData || alertsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">لا توجد تنبيهات</td></tr>';
        return;
    }
    
    tbody.innerHTML = alertsData.map(alert => `
        <tr>
            <td>${alert.vehicle_plate}</td>
            <td>${alert.alert_type}</td>
            <td>
                <span class="badge ${getSeverityClass(alert.severity)}">
                    ${alert.severity}
                </span>
            </td>
            <td>${alert.message}</td>
            <td>${alert.location || 'غير محدد'}</td>
            <td>${alert.created_at}</td>
            <td>
                <span class="badge ${alert.is_resolved ? 'bg-success' : 'bg-warning'}">
                    ${alert.is_resolved ? 'تم الحل' : 'غير محلول'}
                </span>
            </td>
            <td>
                ${!alert.is_resolved ? 
                    `<button class="btn btn-sm btn-success" onclick="resolveAlert(${alert.id})">
                        <i class="fas fa-check"></i> حل
                    </button>` : 
                    `<small class="text-muted">تم الحل بواسطة: ${alert.resolved_by}</small>`
                }
            </td>
        </tr>
    `).join('');
}

// تحديث إحصائيات التتبع
function updateTrackingStatistics() {
    const activeCount = trackingData.filter(r => r.route_status === 'جاري').length;
    const completedCount = trackingData.filter(r => r.route_status === 'مكتمل').length;
    const totalAlerts = alertsData.filter(a => !a.is_resolved).length;
    const totalDistance = trackingData.reduce((sum, r) => sum + (r.total_distance || 0), 0);
    
    document.getElementById('activeTrackingCount').textContent = activeCount;
    document.getElementById('completedTripsCount').textContent = completedCount;
    document.getElementById('alertsCount').textContent = totalAlerts;
    document.getElementById('totalDistanceToday').textContent = totalDistance.toFixed(1);
}

// فلترة بيانات التتبع
function filterVehicleTracking() {
    trackingFilters.vehicle_id = document.getElementById('trackingVehicleFilter').value;
    trackingFilters.start_date = document.getElementById('trackingStartDate').value;
    trackingFilters.end_date = document.getElementById('trackingEndDate').value;
    trackingFilters.status = document.getElementById('trackingStatusFilter').value;
    
    loadVehicleTrackingData();
}

// مسح الفلاتر
function clearTrackingFilters() {
    document.getElementById('trackingVehicleFilter').value = '';
    document.getElementById('trackingStartDate').value = '';
    document.getElementById('trackingEndDate').value = '';
    document.getElementById('trackingStatusFilter').value = '';
    
    trackingFilters = {
        vehicle_id: '',
        start_date: '',
        end_date: '',
        status: ''
    };
    
    loadVehicleTrackingData();
}

// تحديث بيانات التتبع
function refreshVehicleTracking() {
    loadVehicleTrackingData();
    loadVehicleAlertsData();
    showAlert('تم تحديث البيانات بنجاح', 'success');
}

// عرض تفاصيل التتبع
function viewTrackingDetails(trackingId) {
    const record = trackingData.find(r => r.id === trackingId);
    if (!record) return;
    
    const details = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>المركبة:</strong> ${record.vehicle_plate}</p>
                <p><strong>النوع:</strong> ${record.vehicle_type}</p>
                <p><strong>السائق:</strong> ${record.driver_phone}</p>
                <p><strong>التاريخ:</strong> ${record.tracking_date}</p>
            </div>
            <div class="col-md-6">
                <p><strong>وقت البداية:</strong> ${record.start_time || 'غير محدد'}</p>
                <p><strong>وقت النهاية:</strong> ${record.end_time || 'غير محدد'}</p>
                <p><strong>المسافة:</strong> ${record.total_distance || 'غير محدد'} كم</p>
                <p><strong>السرعة القصوى:</strong> ${record.max_speed || 'غير محدد'} كم/س</p>
            </div>
        </div>
        <div class="row">
            <div class="col-12">
                <p><strong>متوسط السرعة:</strong> ${record.avg_speed || 'غير محدد'} كم/س</p>
                <p><strong>استهلاك الوقود:</strong> ${record.fuel_consumption || 'غير محدد'} لتر</p>
                <p><strong>تنبيهات الطوارئ:</strong> ${record.emergency_alerts || 0}</p>
                <p><strong>نقاط GPS:</strong> ${record.gps_points_count || 0}</p>
            </div>
        </div>
    `;
    
    showModal('تفاصيل التتبع', details);
}

// عرض خريطة التتبع
function viewTrackingMap(trackingId) {
    // يمكن تطوير هذه الوظيفة لعرض خريطة تفاعلية
    showAlert('ميزة الخريطة قيد التطوير', 'info');
}

// حل تنبيه
async function resolveAlert(alertId) {
    if (!confirm('هل أنت متأكد من حل هذا التنبيه؟')) return;
    
    try {
        const response = await fetch(`/api/vehicle/alerts/${alertId}/resolve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showAlert('تم حل التنبيه بنجاح', 'success');
            loadVehicleAlertsData();
            updateTrackingStatistics();
        } else {
            const data = await response.json();
            showAlert(data.error || 'فشل في حل التنبيه', 'error');
        }
    } catch (error) {
        console.error('خطأ في حل التنبيه:', error);
        showAlert('خطأ في الاتصال بالخادم', 'error');
    }
}

// الحصول على فئة CSS لحالة التتبع
function getTrackingStatusClass(status) {
    switch (status) {
        case 'جاري': return 'bg-primary';
        case 'مكتمل': return 'bg-success';
        case 'متوقف': return 'bg-warning';
        default: return 'bg-secondary';
    }
}

// الحصول على فئة CSS لخطورة التنبيه
function getSeverityClass(severity) {
    switch (severity) {
        case 'حرج': return 'bg-danger';
        case 'عالي': return 'bg-warning';
        case 'متوسط': return 'bg-info';
        case 'منخفض': return 'bg-secondary';
        default: return 'bg-secondary';
    }
}

// عرض نافذة منبثقة
function showModal(title, content) {
    // إنشاء نافذة منبثقة بسيطة
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // إزالة النافذة بعد الإغلاق
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// عرض التنبيهات
function showAlert(message, type = 'info') {
    // يمكن استخدام نظام التنبيهات الموجود في dashboard.js
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, type);
    } else {
        alert(message);
    }
}
