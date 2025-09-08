// مقياس رسم الرجل - JavaScript

// متغيرات عامة
let currentAssessmentId = null;
let currentDrawingType = 'man';
let canvas = null;
let ctx = null;
let isDrawing = false;
let currentTool = 'pen';
let assessments = [];
let students = [];
let assessors = [];
let scoringItems = [];

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
});

// تهيئة الصفحة
function initializePage() {
    loadStatistics();
    loadAssessments();
    loadStudents();
    loadAssessors();
    loadScoringItems();
    
    // تعيين التاريخ الحالي
    document.getElementById('assessmentDate').value = new Date().toISOString().split('T')[0];
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // فلاتر البحث
    document.getElementById('studentFilter').addEventListener('change', applyFilters);
    document.getElementById('assessorFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('versionFilter').addEventListener('change', applyFilters);
}

// تحميل الإحصائيات
async function loadStatistics() {
    try {
        showLoading(true);
        const response = await fetch('/api/dap/statistics', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalAssessments').textContent = stats.total || 0;
            document.getElementById('completedAssessments').textContent = stats.completed || 0;
            document.getElementById('inProgressAssessments').textContent = stats.in_progress || 0;
            document.getElementById('averageScore').textContent = stats.average_score || 0;
        }
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
        showNotification('خطأ في تحميل الإحصائيات', 'error');
    } finally {
        showLoading(false);
    }
}

// تحميل التقييمات
async function loadAssessments() {
    try {
        showLoading(true);
        const response = await fetch('/api/dap/assessments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            assessments = await response.json();
            displayAssessments(assessments);
        }
    } catch (error) {
        console.error('خطأ في تحميل التقييمات:', error);
        showNotification('خطأ في تحميل التقييمات', 'error');
    } finally {
        showLoading(false);
    }
}

// عرض التقييمات
function displayAssessments(assessmentsList) {
    const tbody = document.getElementById('assessmentsTableBody');
    tbody.innerHTML = '';
    
    if (assessmentsList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد تقييمات متاحة</p>
                </td>
            </tr>
        `;
        return;
    }
    
    assessmentsList.forEach(assessment => {
        const row = document.createElement('tr');
        row.className = 'assessment-row';
        
        const statusBadge = getStatusBadge(assessment.status);
        const versionText = getVersionText(assessment.test_version);
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="flex-shrink-0 me-2">
                        <div class="bg-primary bg-opacity-10 rounded-circle p-2">
                            <i class="fas fa-user text-primary"></i>
                        </div>
                    </div>
                    <div>
                        <div class="fw-medium">${assessment.student_name}</div>
                        <small class="text-muted">${assessment.student_id_number || ''}</small>
                    </div>
                </div>
            </td>
            <td>${assessment.assessor_name}</td>
            <td>${formatDate(assessment.assessment_date)}</td>
            <td>${versionText}</td>
            <td>${statusBadge}</td>
            <td>
                <span class="badge bg-info score-badge">
                    ${assessment.total_raw_score || 0} نقطة
                </span>
            </td>
            <td>
                ${assessment.iq_estimate ? 
                    `<span class="badge bg-success score-badge">${assessment.iq_estimate}</span>` : 
                    '<span class="text-muted">غير محسوب</span>'
                }
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewAssessment(${assessment.id})" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${assessment.status === 'in_progress' ? 
                        `<button class="btn btn-outline-success" onclick="continueAssessment(${assessment.id})" title="متابعة التقييم">
                            <i class="fas fa-play"></i>
                        </button>` : ''
                    }
                    ${assessment.status === 'completed' ? 
                        `<button class="btn btn-outline-info" onclick="generateReport(${assessment.id})" title="إنشاء تقرير">
                            <i class="fas fa-file-alt"></i>
                        </button>` : ''
                    }
                    <button class="btn btn-outline-danger" onclick="deleteAssessment(${assessment.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// تحميل الطلاب
async function loadStudents() {
    try {
        const response = await fetch('/api/students', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            students = await response.json();
            populateStudentSelects();
        }
    } catch (error) {
        console.error('خطأ في تحميل الطلاب:', error);
    }
}

// تحميل المقيمين
async function loadAssessors() {
    try {
        const response = await fetch('/api/employees', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            assessors = await response.json();
            populateAssessorSelects();
        }
    } catch (error) {
        console.error('خطأ في تحميل المقيمين:', error);
    }
}

// تحميل عناصر التسجيل
async function loadScoringItems() {
    try {
        const response = await fetch('/api/dap/scoring-items', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            scoringItems = await response.json();
        }
    } catch (error) {
        console.error('خطأ في تحميل عناصر التسجيل:', error);
    }
}

// ملء قوائم الطلاب
function populateStudentSelects() {
    const selects = ['studentSelect', 'studentFilter'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // الاحتفاظ بالخيار الأول
            const firstOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (firstOption) {
                select.appendChild(firstOption);
            }
            
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.name} (${student.id_number || student.id})`;
                select.appendChild(option);
            });
        }
    });
}

// ملء قوائم المقيمين
function populateAssessorSelects() {
    const selects = ['assessorSelect', 'assessorFilter'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // الاحتفاظ بالخيار الأول
            const firstOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (firstOption) {
                select.appendChild(firstOption);
            }
            
            assessors.forEach(assessor => {
                const option = document.createElement('option');
                option.value = assessor.id;
                option.textContent = assessor.name;
                select.appendChild(option);
            });
        }
    });
}

// عرض نموذج تقييم جديد
function showNewAssessmentModal() {
    const modal = new bootstrap.Modal(document.getElementById('newAssessmentModal'));
    modal.show();
}

// إنشاء تقييم جديد
async function createAssessment() {
    const form = document.getElementById('newAssessmentForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const data = {
        student_id: document.getElementById('studentSelect').value,
        assessor_id: document.getElementById('assessorSelect').value,
        assessment_date: document.getElementById('assessmentDate').value,
        test_version: document.getElementById('testVersion').value,
        chronological_age_years: document.getElementById('ageYears').value || null,
        chronological_age_months: document.getElementById('ageMonths').value || null,
        assessment_environment: document.getElementById('assessmentEnvironment').value,
        seating_arrangement: document.getElementById('seatingArrangement').value,
        materials_used: document.getElementById('materialsUsed').value,
        notes: document.getElementById('initialNotes').value
    };
    
    try {
        showLoading(true);
        const response = await fetch('/api/dap/assessments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('تم إنشاء التقييم بنجاح', 'success');
            
            // إغلاق النموذج
            const modal = bootstrap.Modal.getInstance(document.getElementById('newAssessmentModal'));
            modal.hide();
            
            // إعادة تحميل البيانات
            loadAssessments();
            loadStatistics();
            
            // بدء التقييم مباشرة
            continueAssessment(result.id);
        } else {
            const error = await response.json();
            showNotification(error.message || 'خطأ في إنشاء التقييم', 'error');
        }
    } catch (error) {
        console.error('خطأ في إنشاء التقييم:', error);
        showNotification('خطأ في إنشاء التقييم', 'error');
    } finally {
        showLoading(false);
    }
}

// عرض تفاصيل التقييم
async function viewAssessment(assessmentId) {
    try {
        showLoading(true);
        const response = await fetch(`/api/dap/assessments/${assessmentId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const assessment = await response.json();
            displayAssessmentDetails(assessment);
            
            const modal = new bootstrap.Modal(document.getElementById('assessmentDetailsModal'));
            modal.show();
        }
    } catch (error) {
        console.error('خطأ في تحميل تفاصيل التقييم:', error);
        showNotification('خطأ في تحميل تفاصيل التقييم', 'error');
    } finally {
        showLoading(false);
    }
}

// عرض تفاصيل التقييم
function displayAssessmentDetails(assessment) {
    const content = document.getElementById('assessmentDetailsContent');
    
    content.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>معلومات أساسية</h6>
                <table class="table table-sm">
                    <tr><td><strong>الطالب:</strong></td><td>${assessment.student_name}</td></tr>
                    <tr><td><strong>المقيم:</strong></td><td>${assessment.assessor_name}</td></tr>
                    <tr><td><strong>تاريخ التقييم:</strong></td><td>${formatDate(assessment.assessment_date)}</td></tr>
                    <tr><td><strong>نوع الاختبار:</strong></td><td>${getVersionText(assessment.test_version)}</td></tr>
                    <tr><td><strong>العمر الزمني:</strong></td><td>${assessment.chronological_age_years || 0} سنة ${assessment.chronological_age_months || 0} شهر</td></tr>
                    <tr><td><strong>الحالة:</strong></td><td>${getStatusBadge(assessment.status)}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6>نتائج التسجيل</h6>
                <table class="table table-sm">
                    <tr><td><strong>درجة رسم الرجل:</strong></td><td>${assessment.man_raw_score || 0}</td></tr>
                    <tr><td><strong>درجة رسم المرأة:</strong></td><td>${assessment.woman_raw_score || 0}</td></tr>
                    <tr><td><strong>درجة رسم الذات:</strong></td><td>${assessment.self_raw_score || 0}</td></tr>
                    <tr><td><strong>الدرجة الإجمالية:</strong></td><td><strong>${assessment.total_raw_score || 0}</strong></td></tr>
                    <tr><td><strong>معدل الذكاء المقدر:</strong></td><td>${assessment.iq_estimate || 'غير محسوب'}</td></tr>
                    <tr><td><strong>الرتبة المئوية:</strong></td><td>${assessment.percentile_rank || 'غير محسوب'}</td></tr>
                </table>
            </div>
        </div>
        
        ${assessment.behavioral_observations ? `
            <div class="mt-4">
                <h6>الملاحظات السلوكية</h6>
                <p class="text-muted">${assessment.behavioral_observations}</p>
            </div>
        ` : ''}
        
        ${assessment.recommendations ? `
            <div class="mt-4">
                <h6>التوصيات</h6>
                <p class="text-muted">${assessment.recommendations}</p>
            </div>
        ` : ''}
        
        <div class="mt-4">
            <h6>الرسوم</h6>
            <div class="row" id="drawingPreviews">
                <!-- سيتم تحميل معاينات الرسوم هنا -->
            </div>
        </div>
    `;
    
    // تحميل معاينات الرسوم
    loadDrawingPreviews(assessment.id);
}

// متابعة التقييم
function continueAssessment(assessmentId) {
    currentAssessmentId = assessmentId;
    setupDrawingCanvas();
    loadCurrentAssessmentData();
    
    const modal = new bootstrap.Modal(document.getElementById('drawingAssessmentModal'));
    modal.show();
}

// إعداد لوحة الرسم
function setupDrawingCanvas() {
    canvas = document.getElementById('drawingCanvas');
    ctx = canvas.getContext('2d');
    
    // إعداد خصائص الرسم
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // مستمعي الأحداث للرسم
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // مستمعي الأحداث للأدوات
    document.getElementById('penTool').addEventListener('click', () => selectTool('pen'));
    document.getElementById('eraserTool').addEventListener('click', () => selectTool('eraser'));
    document.getElementById('clearCanvas').addEventListener('click', clearCanvas);
    document.getElementById('saveDrawing').addEventListener('click', saveCurrentDrawing);
    document.getElementById('uploadDrawing').addEventListener('click', () => document.getElementById('imageUpload').click());
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
}

// بدء الرسم
function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// الرسم
function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (currentTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
    } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 10;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
}

// إيقاف الرسم
function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
}

// اختيار الأداة
function selectTool(tool) {
    currentTool = tool;
    
    // تحديث واجهة المستخدم
    document.querySelectorAll('.drawing-tools .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (tool === 'pen') {
        document.getElementById('penTool').classList.add('active');
        canvas.style.cursor = 'crosshair';
    } else if (tool === 'eraser') {
        document.getElementById('eraserTool').classList.add('active');
        canvas.style.cursor = 'grab';
    }
}

// مسح اللوحة
function clearCanvas() {
    if (confirm('هل أنت متأكد من مسح الرسم؟')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// تطبيق الفلاتر
function applyFilters() {
    const studentId = document.getElementById('studentFilter').value;
    const assessorId = document.getElementById('assessorFilter').value;
    const status = document.getElementById('statusFilter').value;
    const version = document.getElementById('versionFilter').value;
    
    let filteredAssessments = assessments.filter(assessment => {
        return (!studentId || assessment.student_id == studentId) &&
               (!assessorId || assessment.assessor_id == assessorId) &&
               (!status || assessment.status === status) &&
               (!version || assessment.test_version === version);
    });
    
    displayAssessments(filteredAssessments);
}

// مسح الفلاتر
function clearFilters() {
    document.getElementById('studentFilter').value = '';
    document.getElementById('assessorFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('versionFilter').value = '';
    
    displayAssessments(assessments);
}

// الحصول على شارة الحالة
function getStatusBadge(status) {
    const badges = {
        'in_progress': '<span class="badge bg-warning">قيد التنفيذ</span>',
        'completed': '<span class="badge bg-success">مكتمل</span>',
        'cancelled': '<span class="badge bg-danger">ملغي</span>'
    };
    
    return badges[status] || '<span class="badge bg-secondary">غير محدد</span>';
}

// الحصول على نص نوع الاختبار
function getVersionText(version) {
    const versions = {
        'goodenough_harris': 'جودإنف-هاريس',
        'koppitz': 'كوبيتز',
        'naglieri': 'ناجليري'
    };
    
    return versions[version] || version;
}

// تنسيق التاريخ
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// عرض الإشعارات
function showNotification(message, type = 'info') {
    // يمكن تحسين هذا باستخدام مكتبة إشعارات
    if (type === 'success') {
        alert('✅ ' + message);
    } else if (type === 'error') {
        alert('❌ ' + message);
    } else {
        alert('ℹ️ ' + message);
    }
}

// عرض/إخفاء مؤشر التحميل
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
}

// وظائف مؤقتة للتطوير المستقبلي
function switchDrawing(drawingType) {
    currentDrawingType = drawingType;
    document.getElementById('currentDrawingType').textContent = 
        drawingType === 'man' ? 'رسم الرجل' : 
        drawingType === 'woman' ? 'رسم المرأة' : 'رسم الذات';
    
    // تحديث التبويبات
    document.querySelectorAll('#drawingTabs .nav-link').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-drawing="${drawingType}"]`).classList.add('active');
    
    // تحميل عناصر التسجيل للرسم الحالي
    loadScoringItemsForDrawing(drawingType);
}

function loadCurrentAssessmentData() {
    // تحميل بيانات التقييم الحالي
    console.log('تحميل بيانات التقييم:', currentAssessmentId);
}

function loadScoringItemsForDrawing(drawingType) {
    // تحميل عناصر التسجيل للرسم المحدد
    console.log('تحميل عناصر التسجيل للرسم:', drawingType);
}

function loadDrawingPreviews(assessmentId) {
    // تحميل معاينات الرسوم
    console.log('تحميل معاينات الرسوم للتقييم:', assessmentId);
}

function saveCurrentDrawing() {
    // حفظ الرسم الحالي
    console.log('حفظ الرسم الحالي');
    showNotification('تم حفظ الرسم بنجاح', 'success');
}

function handleImageUpload(event) {
    // رفع صورة رسم
    const file = event.target.files[0];
    if (file) {
        console.log('رفع صورة:', file.name);
        showNotification('تم رفع الصورة بنجاح', 'success');
    }
}

function completeDrawing() {
    // إكمال الرسم الحالي
    console.log('إكمال الرسم:', currentDrawingType);
    showNotification('تم إكمال الرسم', 'success');
}

function nextDrawing() {
    // الانتقال للرسم التالي
    const drawingOrder = ['man', 'woman', 'self'];
    const currentIndex = drawingOrder.indexOf(currentDrawingType);
    const nextIndex = (currentIndex + 1) % drawingOrder.length;
    
    switchDrawing(drawingOrder[nextIndex]);
}

function completeAssessment() {
    // إنهاء التقييم
    if (confirm('هل أنت متأكد من إنهاء التقييم؟')) {
        console.log('إنهاء التقييم:', currentAssessmentId);
        showNotification('تم إنهاء التقييم بنجاح', 'success');
        
        // إغلاق النموذج وإعادة تحميل البيانات
        const modal = bootstrap.Modal.getInstance(document.getElementById('drawingAssessmentModal'));
        modal.hide();
        
        loadAssessments();
        loadStatistics();
    }
}

function generateReport(assessmentId) {
    // إنشاء تقرير
    console.log('إنشاء تقرير للتقييم:', assessmentId);
    showNotification('جاري إنشاء التقرير...', 'info');
}

function deleteAssessment(assessmentId) {
    // حذف التقييم
    if (confirm('هل أنت متأكد من حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء.')) {
        console.log('حذف التقييم:', assessmentId);
        showNotification('تم حذف التقييم', 'success');
        loadAssessments();
        loadStatistics();
    }
}
