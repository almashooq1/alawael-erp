// نظام التتبع والحضور والانصراف

// متغيرات عامة
let currentTrackingDate = new Date().toISOString().split('T')[0];
let selectedVehicle = null;
let trackingData = [];
let attendanceData = [];

// تحميل بيانات التتبع
async function loadTrackingData(date = null, vehicleId = null) {
    try {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (vehicleId) params.append('vehicle_id', vehicleId);
        
        const response = await fetch(`/api/tracking-reports?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            trackingData = data.tracking_records;
            attendanceData = data.attendance_records;
            updateTrackingStats(data.statistics);
            renderTrackingTable();
            renderAttendanceTable();
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات التتبع:', error);
    }
}

// تحديث إحصائيات التتبع
function updateTrackingStats(stats) {
    document.getElementById('totalTransported').textContent = stats.total_students_transported || 0;
    document.getElementById('pickedUp').textContent = stats.picked_up || 0;
    document.getElementById('droppedOff').textContent = stats.dropped_off || 0;
    document.getElementById('latePickup').textContent = stats.late_pickup || 0;
    document.getElementById('absentStudents').textContent = stats.absent || 0;
    document.getElementById('totalAttendance').textContent = stats.total_attendance || 0;
    document.getElementById('presentStudents').textContent = stats.present || 0;
    document.getElementById('lateArrival').textContent = stats.late_arrival || 0;
}

// عرض جدول التتبع
function renderTrackingTable() {
    const tbody = document.getElementById('trackingTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    trackingData.forEach(record => {
        const row = document.createElement('tr');
        
        const pickupStatusClass = getStatusClass(record.pickup_status);
        const dropoffStatusClass = getStatusClass(record.dropoff_status);
        
        row.innerHTML = `
            <td>${record.student_name}</td>
            <td>${record.vehicle_plate}</td>
            <td>
                <span class="badge ${pickupStatusClass}">
                    ${record.pickup_status}
                </span>
            </td>
            <td>${record.pickup_time || '-'}</td>
            <td>
                <span class="badge ${dropoffStatusClass}">
                    ${record.dropoff_status}
                </span>
            </td>
            <td>${record.dropoff_time || '-'}</td>
            <td>
                <small class="text-muted">${record.notes || '-'}</small>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// عرض جدول الحضور
function renderAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    attendanceData.forEach(record => {
        const row = document.createElement('tr');
        
        const statusClass = getStatusClass(record.status);
        
        row.innerHTML = `
            <td>${record.student_name}</td>
            <td>
                <span class="badge ${statusClass}">
                    ${record.status}
                </span>
            </td>
            <td>${record.arrival_time || '-'}</td>
            <td>${record.departure_time || '-'}</td>
            <td>${record.arrival_method || '-'}</td>
            <td>${record.departure_method || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editAttendance('${record.student_name}')">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// الحصول على فئة CSS للحالة
function getStatusClass(status) {
    switch (status) {
        case 'تم الاستلام':
        case 'تم التوصيل':
        case 'حاضر':
            return 'bg-success';
        case 'متأخر':
            return 'bg-warning';
        case 'غائب':
            return 'bg-danger';
        case 'منتظر':
            return 'bg-secondary';
        default:
            return 'bg-light text-dark';
    }
}

// تحميل قائمة المركبات
async function loadVehicles() {
    try {
        const response = await fetch('/api/vehicles', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            const select = document.getElementById('vehicleFilter');
            if (select) {
                select.innerHTML = '<option value="">جميع المركبات</option>';
                data.vehicles.forEach(vehicle => {
                    const option = document.createElement('option');
                    option.value = vehicle.id;
                    option.textContent = `${vehicle.plate_number} - ${vehicle.vehicle_type}`;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('خطأ في تحميل المركبات:', error);
    }
}

// تصفية البيانات حسب المركبة
function filterByVehicle() {
    const vehicleId = document.getElementById('vehicleFilter').value;
    const date = document.getElementById('trackingDate').value;
    loadTrackingData(date, vehicleId);
}

// تغيير التاريخ
function changeTrackingDate() {
    const date = document.getElementById('trackingDate').value;
    const vehicleId = document.getElementById('vehicleFilter').value;
    currentTrackingDate = date;
    loadTrackingData(date, vehicleId);
}

// تسجيل حضور طالب
async function recordStudentAttendance(studentId, action, method = 'نقل المركز', vehicleId = null) {
    try {
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                student_id: studentId,
                action: action,
                method: method,
                vehicle_id: vehicleId,
                status: action === 'arrival' ? 'حاضر' : null
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showAlert('تم تسجيل الحضور بنجاح', 'success');
            loadTrackingData(currentTrackingDate);
        } else {
            showAlert('خطأ في تسجيل الحضور: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تسجيل الحضور:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// تحديث حضور طالب
function editAttendance(studentName) {
    // فتح نافذة تحرير الحضور
    const modal = new bootstrap.Modal(document.getElementById('editAttendanceModal'));
    document.getElementById('editStudentName').textContent = studentName;
    modal.show();
}

// حفظ تعديل الحضور
async function saveAttendanceEdit() {
    const studentId = document.getElementById('editStudentId').value;
    const arrivalTime = document.getElementById('editArrivalTime').value;
    const departureTime = document.getElementById('editDepartureTime').value;
    const status = document.getElementById('editAttendanceStatus').value;
    const notes = document.getElementById('editAttendanceNotes').value;
    
    try {
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                student_id: studentId,
                arrival_time: arrivalTime,
                departure_time: departureTime,
                status: status,
                notes: notes
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showAlert('تم تحديث الحضور بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editAttendanceModal')).hide();
            loadTrackingData(currentTrackingDate);
        } else {
            showAlert('خطأ في تحديث الحضور: ' + data.error, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحديث الحضور:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// تصدير تقرير التتبع
function exportTrackingReport() {
    const date = currentTrackingDate;
    const vehicleId = document.getElementById('vehicleFilter').value;
    
    // إنشاء محتوى CSV
    let csvContent = 'اسم الطالب,رقم المركبة,حالة الاستلام,وقت الاستلام,حالة التوصيل,وقت التوصيل,ملاحظات\n';
    
    trackingData.forEach(record => {
        csvContent += `"${record.student_name}","${record.vehicle_plate}","${record.pickup_status}","${record.pickup_time || ''}","${record.dropoff_status}","${record.dropoff_time || ''}","${record.notes || ''}"\n`;
    });
    
    // تنزيل الملف
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_التتبع_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// تصدير تقرير الحضور
function exportAttendanceReport() {
    const date = currentTrackingDate;
    
    // إنشاء محتوى CSV
    let csvContent = 'اسم الطالب,الحالة,وقت الوصول,وقت المغادرة,طريقة الوصول,طريقة المغادرة\n';
    
    attendanceData.forEach(record => {
        csvContent += `"${record.student_name}","${record.status}","${record.arrival_time || ''}","${record.departure_time || ''}","${record.arrival_method || ''}","${record.departure_method || ''}"\n`;
    });
    
    // تنزيل الملف
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_الحضور_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// تحديث البيانات تلقائياً كل دقيقة
setInterval(() => {
    if (document.getElementById('student-tracking') && document.getElementById('student-tracking').style.display !== 'none') {
        loadTrackingData(currentTrackingDate, document.getElementById('vehicleFilter')?.value);
    }
}, 60000);

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // تعيين التاريخ الحالي
    const dateInput = document.getElementById('trackingDate');
    if (dateInput) {
        dateInput.value = currentTrackingDate;
    }
    
    // تحميل البيانات الأولية
    loadVehicles();
    loadTrackingData();
});
