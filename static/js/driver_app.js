// تطبيق السائق - JavaScript

// متغيرات عامة
let currentLocation = null;
let watchId = null;
let students = [];
let currentVehicle = null;
let vehicleTracking = null;
let trackingInterval = null;
let currentDate = new Date().toISOString().split('T')[0];

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    // تعيين التاريخ الحالي
    document.getElementById('selectedDate').value = currentDate;
    
    // إعداد مستمعي الأحداث
    setupEventListeners();
    
    // فحص حالة تسجيل الدخول
    checkLoginStatus();
    
    // طلب إذن الموقع
    requestLocationPermission();
    
    // فحص حالة الاتصال
    checkOnlineStatus();
});

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // تسجيل الدخول
    document.getElementById('loginBtn').addEventListener('click', login);
    
    // تسجيل الخروج
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // تحديث قائمة الطلاب
    document.getElementById('refreshBtn').addEventListener('click', loadStudents);
    
    // تغيير التاريخ
    document.getElementById('selectedDate').addEventListener('change', function() {
        currentDate = this.value;
        if (isLoggedIn()) {
            loadStudents();
        }
    });
    
    // أزرار الإجراءات في النافذة المنبثقة
    document.getElementById('pickupBtn').addEventListener('click', () => performAction('pickup'));
    document.getElementById('dropoffBtn').addEventListener('click', () => performAction('dropoff'));
    document.getElementById('absentBtn').addEventListener('click', () => performAction('absent'));
    
    // أزرار تتبع المركبة
    const startTrackingBtn = document.getElementById('startTrackingBtn');
    const endTrackingBtn = document.getElementById('endTrackingBtn');
    const emergencyBtn = document.getElementById('emergencyBtn');
    
    if (startTrackingBtn) startTrackingBtn.addEventListener('click', startVehicleTracking);
    if (endTrackingBtn) endTrackingBtn.addEventListener('click', endVehicleTracking);
    if (emergencyBtn) emergencyBtn.addEventListener('click', sendEmergencyAlert);
    
    // فحص حالة الاتصال
    window.addEventListener('online', () => {
        document.getElementById('offlineIndicator').style.display = 'none';
        loadStudents();
    });
    
    window.addEventListener('offline', () => {
        document.getElementById('offlineIndicator').style.display = 'block';
    });
}

// فحص حالة تسجيل الدخول
function checkLoginStatus() {
    const savedDriver = localStorage.getItem('driverData');
    if (savedDriver) {
        driverData = JSON.parse(savedDriver);
        showAppScreen();
        loadStudents();
    } else {
        showLoginScreen();
    }
}

// عرض شاشة تسجيل الدخول
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('appScreen').style.display = 'none';
}

// عرض شاشة التطبيق الرئيسية
function showAppScreen() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    
    if (driverData) {
        document.getElementById('driverName').textContent = driverData.driver_name;
        document.getElementById('vehicleInfo').textContent = `${driverData.vehicle_plate} - ${driverData.vehicle_type}`;
    }
}

// معالجة تسجيل الدخول
async function handleLogin(event) {
    event.preventDefault();
    
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const alertDiv = document.getElementById('loginAlert');
    
    if (!phoneNumber) {
        showAlert('يرجى إدخال رقم الهاتف', 'danger', alertDiv);
        return;
    }
    
    try {
        const response = await fetch('/api/driver/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone_number: phoneNumber
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            driverData = data.driver_info;
            localStorage.setItem('driverData', JSON.stringify(driverData));
            showAppScreen();
            loadStudents();
            showAlert('تم تسجيل الدخول بنجاح', 'success', alertDiv);
        } else {
            showAlert(data.error || 'خطأ في تسجيل الدخول', 'danger', alertDiv);
        }
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger', alertDiv);
    }
}

// تحميل قائمة الطلاب
async function loadStudents() {
    if (!driverData) return;
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    const emptyState = document.getElementById('emptyState');
    const studentsList = document.getElementById('studentsList');
    
    loadingIndicator.style.display = 'block';
    emptyState.style.display = 'none';
    studentsList.innerHTML = '';
    
    try {
        const response = await fetch(`/api/driver/students?vehicle_id=${driverData.vehicle_id}&date=${currentDate}`);
        const data = await response.json();
        
        if (data.success) {
            studentsData = data.students;
            renderStudents();
            updateStatistics();
        } else {
            showAlert(data.error || 'خطأ في تحميل البيانات', 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل الطلاب:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// عرض قائمة الطلاب
function renderStudents() {
    const studentsList = document.getElementById('studentsList');
    const emptyState = document.getElementById('emptyState');
    
    if (studentsData.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    studentsList.innerHTML = '';
    
    studentsData.forEach(student => {
        const studentCard = createStudentCard(student);
        studentsList.appendChild(studentCard);
    });
}

// إنشاء بطاقة طالب
function createStudentCard(student) {
    const card = document.createElement('div');
    card.className = 'student-card';
    
    const pickupStatusClass = getStatusClass(student.tracking.pickup_status);
    const dropoffStatusClass = getStatusClass(student.tracking.dropoff_status);
    
    card.innerHTML = `
        <div class="student-name">${student.name}</div>
        <div class="student-info">
            <div><i class="fas fa-id-card me-1"></i> ${student.national_id}</div>
            <div><i class="fas fa-user me-1"></i> ${student.guardian_name}</div>
            <div><i class="fas fa-phone me-1"></i> ${student.guardian_phone}</div>
            <div><i class="fas fa-map-marker-alt me-1"></i> ${student.pickup_location}</div>
            ${student.pickup_time ? `<div><i class="fas fa-clock me-1"></i> موعد الاستلام: ${student.pickup_time}</div>` : ''}
            ${student.special_needs ? `<div><i class="fas fa-exclamation-circle me-1"></i> ${student.special_needs}</div>` : ''}
        </div>
        
        <div class="mb-2">
            <span class="status-badge ${pickupStatusClass}">
                استلام: ${student.tracking.pickup_status}
            </span>
            <span class="status-badge ${dropoffStatusClass}">
                توصيل: ${student.tracking.dropoff_status}
            </span>
        </div>
        
        ${student.tracking.pickup_time ? `<div class="text-muted small">وقت الاستلام: ${student.tracking.pickup_time}</div>` : ''}
        ${student.tracking.dropoff_time ? `<div class="text-muted small">وقت التوصيل: ${student.tracking.dropoff_time}</div>` : ''}
        ${student.tracking.driver_notes ? `<div class="text-muted small">ملاحظات: ${student.tracking.driver_notes}</div>` : ''}
        
        <div class="action-buttons">
            ${student.tracking.pickup_status === 'منتظر' ? `
                <button class="btn btn-pickup" onclick="openActionModal(${student.student_id}, 'pickup', '${student.name}')">
                    <i class="fas fa-hand-paper me-1"></i> استلام
                </button>
                <button class="btn btn-absent" onclick="markAbsent(${student.student_id}, '${student.name}')">
                    <i class="fas fa-times me-1"></i> غائب
                </button>
            ` : ''}
            
            ${student.tracking.pickup_status === 'تم الاستلام' && student.tracking.dropoff_status === 'منتظر' ? `
                <button class="btn btn-dropoff" onclick="openActionModal(${student.student_id}, 'dropoff', '${student.name}')">
                    <i class="fas fa-home me-1"></i> توصيل
                </button>
            ` : ''}
        </div>
    `;
    
    return card;
}

// الحصول على فئة CSS للحالة
function getStatusClass(status) {
    switch (status) {
        case 'تم الاستلام':
        case 'تم التوصيل':
            return 'status-picked';
        case 'متأخر':
            return 'status-late';
        case 'غائب':
            return 'status-absent';
        case 'منتظر':
        default:
            return 'status-waiting';
    }
}

// فتح نافذة الإجراء
function openActionModal(studentId, actionType, studentName) {
    document.getElementById('actionStudentId').value = studentId;
    document.getElementById('actionType').value = actionType;
    document.getElementById('actionStudentName').textContent = studentName;
    
    const modalTitle = actionType === 'pickup' ? 'تسجيل الاستلام' : 'تسجيل التوصيل';
    document.getElementById('actionModalTitle').textContent = modalTitle;
    
    // تعيين الحالة الافتراضية
    const statusSelect = document.getElementById('actionStatus');
    statusSelect.value = actionType === 'pickup' ? 'تم الاستلام' : 'تم التوصيل';
    
    // عرض الموقع الحالي
    updateLocationDisplay();
    
    const modal = new bootstrap.Modal(document.getElementById('actionModal'));
    modal.show();
}

// تحديث عرض الموقع
function updateLocationDisplay() {
    const gpsLocationDiv = document.getElementById('gpsLocation');
    const useGPSCheckbox = document.getElementById('useGPS');
    
    if (currentLocation && useGPSCheckbox.checked) {
        gpsLocationDiv.innerHTML = `
            <i class="fas fa-map-marker-alt text-success"></i>
            الموقع الحالي: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}
        `;
    } else {
        gpsLocationDiv.innerHTML = '<i class="fas fa-map-marker-alt text-muted"></i> الموقع غير متاح';
    }
}

// تنفيذ الإجراء
async function submitAction() {
    const studentId = document.getElementById('actionStudentId').value;
    const actionType = document.getElementById('actionType').value;
    const status = document.getElementById('actionStatus').value;
    const notes = document.getElementById('actionNotes').value;
    const useGPS = document.getElementById('useGPS').checked;
    
    if (!status) {
        showAlert('يرجى اختيار الحالة', 'warning');
        return;
    }
    
    const requestData = {
        student_id: parseInt(studentId),
        vehicle_id: driverData.vehicle_id,
        driver_phone: driverData.phone_number,
        notes: notes
    };
    
    if (actionType === 'pickup') {
        requestData.pickup_status = status;
    } else {
        requestData.dropoff_status = status;
    }
    
    if (useGPS && currentLocation) {
        requestData.gps_location = `${currentLocation.latitude},${currentLocation.longitude}`;
    }
    
    try {
        const endpoint = actionType === 'pickup' ? '/api/driver/pickup' : '/api/driver/dropoff';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('actionModal')).hide();
            loadStudents(); // إعادة تحميل البيانات
            
            // مسح النموذج
            document.getElementById('actionForm').reset();
        } else {
            showAlert(data.error || 'خطأ في تنفيذ الإجراء', 'danger');
        }
    } catch (error) {
        console.error('خطأ في تنفيذ الإجراء:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// تسجيل غياب طالب
async function markAbsent(studentId, studentName) {
    if (!confirm(`هل أنت متأكد من تسجيل غياب الطالب ${studentName}؟`)) {
        return;
    }
    
    const requestData = {
        student_id: studentId,
        vehicle_id: driverData.vehicle_id,
        driver_phone: driverData.phone_number,
        pickup_status: 'غائب',
        notes: 'تم تسجيل الغياب من قبل السائق'
    };
    
    try {
        const response = await fetch('/api/driver/pickup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`تم تسجيل غياب الطالب ${studentName}`, 'info');
            loadStudents();
        } else {
            showAlert(data.error || 'خطأ في تسجيل الغياب', 'danger');
        }
    } catch (error) {
        console.error('خطأ في تسجيل الغياب:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// تحديث الإحصائيات
function updateStatistics() {
    const totalStudents = studentsData.length;
    const pickedStudents = studentsData.filter(s => s.tracking.pickup_status === 'تم الاستلام').length;
    const droppedStudents = studentsData.filter(s => s.tracking.dropoff_status === 'تم التوصيل').length;
    
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('pickedStudents').textContent = pickedStudents;
    document.getElementById('droppedStudents').textContent = droppedStudents;
}

// طلب إذن الموقع
function requestLocationPermission() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            position => {
                currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                document.getElementById('gpsStatus').innerHTML = 
                    '<i class="fas fa-map-marker-alt"></i> تحديد الموقع متاح';
            },
            error => {
                console.error('خطأ في الحصول على الموقع:', error);
                document.getElementById('gpsStatus').innerHTML = 
                    '<i class="fas fa-map-marker-alt text-warning"></i> الموقع غير متاح';
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
        
        // تحديث الموقع كل 5 دقائق
        setInterval(() => {
            navigator.geolocation.getCurrentPosition(
                position => {
                    currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                },
                error => console.error('خطأ في تحديث الموقع:', error),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
            );
        }, 300000);
    } else {
        document.getElementById('gpsStatus').innerHTML = 
            '<i class="fas fa-map-marker-alt text-danger"></i> الموقع غير مدعوم';
    }
}

// تحديث البيانات
function refreshData() {
    const refreshBtn = document.querySelector('.floating-btn i');
    refreshBtn.classList.add('fa-spin');
    
    loadStudents().finally(() => {
        refreshBtn.classList.remove('fa-spin');
    });
}

// فحص حالة الاتصال
function checkOnlineStatus() {
    if (!navigator.onLine) {
        document.getElementById('offlineIndicator').style.display = 'block';
    }
}

// عرض التنبيهات
function showAlert(message, type = 'info', container = null) {
    const alertDiv = container || createFloatingAlert();
    
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)} me-2"></i>
        ${message}
    `;
    alertDiv.style.display = 'block';
    
    if (!container) {
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 5000);
    }
}

// إنشاء تنبيه عائم
function createFloatingAlert() {
    let alertDiv = document.getElementById('floatingAlert');
    if (!alertDiv) {
        alertDiv = document.createElement('div');
        alertDiv.id = 'floatingAlert';
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            min-width: 300px;
            max-width: 90%;
        `;
        document.body.appendChild(alertDiv);
    }
    return alertDiv;
}

// الحصول على أيقونة التنبيه
function getAlertIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'danger': return 'exclamation-triangle';
        case 'warning': return 'exclamation-circle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

// تسجيل الخروج
function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('driverData');
        driverData = null;
        studentsData = [];
        showLoginScreen();
    }
}

// إضافة زر تسجيل الخروج للهيدر
document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('.app-header');
    if (header) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-outline-light btn-sm mt-2';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i> تسجيل الخروج';
        logoutBtn.onclick = logout;
        
        const driverInfo = header.querySelector('.driver-info');
        if (driverInfo) {
            driverInfo.appendChild(logoutBtn);
        }
    }
});

// وظائف تتبع المركبة
async function startVehicleTracking() {
    if (!currentLocation) {
        showAlert('يرجى تفعيل خدمة الموقع أولاً', 'warning');
        return;
    }
    
    if (!driverData || !driverData.vehicle_id) {
        showAlert('لم يتم تحديد المركبة', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/vehicle/tracking/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                vehicle_id: driverData.vehicle_id,
                driver_phone: driverData.phone_number,
                start_location: `${currentLocation.latitude},${currentLocation.longitude}`
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            vehicleTracking = {
                id: data.tracking_id,
                vehicle_id: driverData.vehicle_id,
                status: 'جاري'
            };
            
            // بدء تتبع الموقع التلقائي
            startLocationTracking();
            
            // تحديث واجهة المستخدم
            updateTrackingUI(true);
            
            showAlert('تم بدء تتبع المركبة بنجاح', 'success');
        } else {
            showAlert(data.error || 'فشل في بدء التتبع', 'danger');
        }
    } catch (error) {
        console.error('خطأ في بدء التتبع:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

async function endVehicleTracking() {
    if (!vehicleTracking) {
        showAlert('لا يوجد تتبع نشط', 'warning');
        return;
    }
    
    const notes = prompt('ملاحظات الرحلة (اختياري):');
    const fuelConsumption = prompt('استهلاك الوقود (لتر):');
    
    try {
        const response = await fetch('/api/vehicle/tracking/end', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                tracking_id: vehicleTracking.id,
                end_location: currentLocation ? `${currentLocation.latitude},${currentLocation.longitude}` : null,
                driver_notes: notes,
                fuel_consumption: fuelConsumption ? parseFloat(fuelConsumption) : null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // إيقاف تتبع الموقع
            stopLocationTracking();
            
            // مسح بيانات التتبع
            vehicleTracking = null;
            
            // تحديث واجهة المستخدم
            updateTrackingUI(false);
            
            showAlert(`تم إنهاء التتبع بنجاح. المسافة: ${data.total_distance || 'غير محدد'} كم`, 'success');
        } else {
            showAlert(data.error || 'فشل في إنهاء التتبع', 'danger');
        }
    } catch (error) {
        console.error('خطأ في إنهاء التتبع:', error);
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

async function sendEmergencyAlert() {
    if (!driverData || !driverData.vehicle_id || !currentLocation) {
        showAlert('تعذر إرسال تنبيه الطوارئ', 'danger');
        return;
    }
    
    const message = prompt('وصف حالة الطوارئ:') || 'تنبيه طوارئ من السائق';
    
    if (confirm('هل أنت متأكد من إرسال تنبيه الطوارئ؟')) {
        try {
            const response = await fetch('/api/vehicle/tracking/emergency', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    vehicle_id: driverData.vehicle_id,
                    location: `${currentLocation.latitude},${currentLocation.longitude}`,
                    message: message,
                    driver_phone: driverData.phone_number
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAlert('تم إرسال تنبيه الطوارئ بنجاح', 'success');
            } else {
                showAlert(data.error || 'فشل في إرسال التنبيه', 'danger');
            }
        } catch (error) {
            console.error('خطأ في إرسال تنبيه الطوارئ:', error);
            showAlert('خطأ في الاتصال بالخادم', 'danger');
        }
    }
}

function startLocationTracking() {
    // إرسال الموقع كل 30 ثانية
    trackingInterval = setInterval(async () => {
        if (vehicleTracking && currentLocation) {
            try {
                await fetch('/api/vehicle/tracking/update-location', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        tracking_id: vehicleTracking.id,
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                        speed: currentLocation.speed || 0,
                        heading: currentLocation.heading || 0,
                        accuracy: currentLocation.accuracy || 0
                    })
                });
            } catch (error) {
                console.error('خطأ في تحديث الموقع:', error);
            }
        }
    }, 30000); // كل 30 ثانية
}

function stopLocationTracking() {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
}

function updateTrackingUI(isTracking) {
    const startBtn = document.getElementById('startTrackingBtn');
    const endBtn = document.getElementById('endTrackingBtn');
    const trackingStatus = document.getElementById('trackingStatus');
    
    if (startBtn) startBtn.style.display = isTracking ? 'none' : 'inline-block';
    if (endBtn) endBtn.style.display = isTracking ? 'inline-block' : 'none';
    if (trackingStatus) {
        trackingStatus.textContent = isTracking ? 'التتبع نشط' : 'التتبع متوقف';
        trackingStatus.className = `badge ${isTracking ? 'bg-success' : 'bg-secondary'}`;
    }
}
