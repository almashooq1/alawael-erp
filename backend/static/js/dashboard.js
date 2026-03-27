// Dashboard JavaScript
$(document).ready(function() {
    // Initialize dashboard
    initializeDashboard();
    
    // Set up navigation
    setupNavigation();
    
    // Load initial data
    loadDashboardData();
    
    // Update current date
    updateCurrentDate();
});

function initializeDashboard() {
    // Check authentication
    const user = getFromLocalStorage('user');
    if (!user) {
        window.location.href = '/login';
        return;
    }
    
    // Update user info
    $('#userName').text(user.name);
    $('#userRole').text(getRoleText(user.role));
}

function setupNavigation() {
    // Handle sidebar navigation
    $('.sidebar .nav-link').click(function(e) {
        e.preventDefault();
        
        const section = $(this).data('section');
        if (section) {
        }
    });
}

function showSection(sectionId) {
    // Hide all sections
    hideAllSections();
    
    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
        
        // Update active links
        updateActiveLinks(sectionId);
        
        // Load section-specific data
        loadSectionData(sectionId);
        
        // Call loading functions for new systems
        switch(sectionId) {
            case 'notifications':
                if (typeof communicationsManager !== 'undefined') {
                    communicationsManager.loadNotifications();
                }
                break;
            case 'messages':
                if (typeof communicationsManager !== 'undefined') {
                    communicationsManager.loadMessages();
                }
                break;
            case 'content-library':
                if (typeof contentManager !== 'undefined') {
                    contentManager.loadCategories();
                    contentManager.loadContent();
                }
                break;
            case 'assets':
                if (typeof assetsManager !== 'undefined') {
                    assetsManager.loadAssets();
                    assetsManager.loadAssetCategories();
                }
                break;
            case 'inventory':
                if (typeof assetsManager !== 'undefined') {
                    assetsManager.loadInventory();
                }
                break;
            case 'activities':
                if (typeof activitiesManager !== 'undefined') {
                    activitiesManager.loadActivities();
                }
                break;
            case 'employees':
                if (typeof hrManager !== 'undefined') {
                    hrManager.loadEmployees();
                    hrManager.loadAttendance();
                    hrManager.loadLeaveRequests();
                }
                break;
            case 'finance':
                if (typeof financeManager !== 'undefined') {
                    financeManager.loadFeeTypes();
                    financeManager.loadStudentFees();
                    financeManager.loadPayments();
                    financeManager.loadExpenses();
                }
                break;
            case 'quality':
                if (typeof qualityManager !== 'undefined') {
                    qualityManager.loadQualityStandards();
                    qualityManager.loadQualityAudits();
                    qualityManager.loadCorrectiveActions();
                    qualityManager.loadComplianceChecklists();
                }
                break;
            case 'documents':
                if (typeof documentsManager !== 'undefined') {
                    documentsManager.loadDocuments();
                    documentsManager.loadCategories();
                }
                break;
            case 'branding':
                if (typeof brandingManager !== 'undefined') {
                    brandingManager.loadLogos();
                    brandingManager.loadThemes();
                    brandingManager.loadBrandingSettings();
                }
                break;
            case 'icons':
                if (typeof iconsManager !== 'undefined') {
                    iconsManager.loadIcons();
                    iconsManager.loadCategories();
                }
                break;
            case 'forms':
                if (typeof formsManager !== 'undefined') {
                    formsManager.loadTemplates();
                    formsManager.loadFormCategories();
                }
                break;
            case 'messaging':
                if (typeof messagingManager !== 'undefined') {
                    messagingManager.init();
                }
                break;
            case 'tasks':
                if (typeof tasksManager !== 'undefined') {
                    tasksManager.init();
                }
                break;
            case 'ai-assistant':
                if (typeof aiManager !== 'undefined') {
                    aiManager.init();
                }
                break;
        }
    }
}

function updateActiveNavLink(sectionId) {
    // Remove active class from all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to current section link
    const activeLink = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

function updatePageHeader(sectionName) {
    const titles = {
        'dashboard': 'لوحة التحكم',
        'students': 'إدارة الطلاب',
        'teachers': 'إدارة المعلمين',
        'classrooms': 'إدارة الفصول',
        'skills': 'إدارة المهارات',
        'assessments': 'التقييمات',
        'vehicles': 'إدارة المركبات',
        'student-transport': 'نقل الطلاب',
        'student-tracking': 'تتبع الطلاب',
        'attendance': 'الحضور والانصراف',
        'individual-plans': 'الخطط الفردية',
        'weekly-plans': 'الخطط الأسبوعية',
        'daily-followup': 'المتابعة اليومية',
        'reports': 'التقارير',
        'settings': 'الإعدادات'
    };
    
    const title = titles[sectionName] || 'لوحة التحكم';
    $('#pageTitle').text(title);
    $('#breadcrumbActive').text(title);
}

function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'students':
            loadStudents();
            break;
        case 'teachers':
            loadTeachers();
            break;
        case 'classrooms':
            loadClassrooms();
            break;
        case 'skills':
            loadSkills();
            break;
        case 'assessments':
            loadAssessments();
            break;
        case 'vehicles':
            if (typeof initVehiclesPage === 'function') {
                initVehiclesPage();
            }
            break;
        case 'student-transport':
            if (typeof loadStudentTransports === 'function') {
                loadStudentTransports();
            }
            break;
        case 'student-tracking':
            if (typeof loadTrackingData === 'function') {
                loadTrackingData();
            }
            break;
        case 'attendance':
            if (typeof loadTrackingData === 'function') {
                loadTrackingData();
            }
            break;
        case 'levels':
            showLevelsSection();
            break;
        case 'final-evaluations':
            loadFinalEvaluationsContent();
            break;
        case 'reports':
            loadReportsContent();
            break;
        case 'settings':
            loadSettingsContent();
            break;
    }
}

function loadSectionContent(sectionName) {
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'transfers':
            loadTransfersContent();
            break;
        case 'assessments':
            loadAssessmentsContent();
            break;
        case 'individual-plans':
            loadIndividualPlansContent();
            break;
        case 'weekly-plans':
            loadWeeklyPlansContent();
            break;
        case 'daily-followup':
            loadDailyFollowupContent();
            break;
        case 'levels':
            showLevelsSection();
            break;
        case 'final-evaluations':
            loadFinalEvaluationsContent();
            break;
        case 'reports':
            loadReportsContent();
            break;
        case 'settings':
            loadSettingsContent();
            break;
    }
}

function loadDashboardData() {
    // Load statistics
    loadStatistics();
    
    // Load recent activities
    loadRecentActivities();
    
    // Load current academic year
    loadCurrentAcademicYear();
}

function loadStatistics() {
    // Load students count
    $.get('/api/students', function(response) {
        if (response.success) {
            $('#totalStudents').text(response.students.length);
        }
    });
    
    // Load teachers count
    $.get('/api/teachers', function(response) {
        if (response.success) {
            const activeTeachers = response.teachers.filter(t => t.is_active).length;
            $('#activeTeachers').text(activeTeachers);
        }
    });
    
    // Load classrooms count
    $.get('/api/classrooms', function(response) {
        if (response.success) {
            $('#totalClassrooms').text(response.classrooms.length);
        }
    });
    
    // Load monthly assessments (mock data for now)
    $('#monthlyAssessments').text('45');
}

function loadRecentActivities() {
    // Mock recent activities data
    const activities = [
        {
            icon: 'fa-user-plus',
            text: 'تم تسجيل طالب جديد: أحمد محمد',
            time: 'منذ ساعتين',
            type: 'success'
        },
        {
            icon: 'fa-clipboard-check',
            text: 'تم إجراء تقييم للطالبة: فاطمة علي',
            time: 'منذ 3 ساعات',
            type: 'info'
        },
        {
            icon: 'fa-file-alt',
            text: 'تم إنشاء خطة فردية جديدة',
            time: 'منذ 5 ساعات',
            type: 'primary'
        },
        {
            icon: 'fa-calendar-day',
            text: 'تم تحديث المتابعة اليومية',
            time: 'أمس',
            type: 'warning'
        }
    ];
    
    let activitiesHtml = '';
    activities.forEach(activity => {
        activitiesHtml += `
            <div class="d-flex align-items-center mb-3">
                <div class="flex-shrink-0">
                    <div class="rounded-circle bg-${activity.type} text-white d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                        <i class="fas ${activity.icon}"></i>
                    </div>
                </div>
                <div class="flex-grow-1 me-3">
                    <div class="font-weight-bold">${activity.text}</div>
                    <div class="text-muted small">${activity.time}</div>
                </div>
            </div>
        `;
    });
    
    $('#recentActivities').html(activitiesHtml);
}

function loadCurrentAcademicYear() {
    $.get('/api/academic-years', function(response) {
        if (response.success) {
            const activeYear = response.years.find(year => year.is_active);
            if (activeYear) {
                const startDate = formatDateArabic(activeYear.start_date);
                const endDate = formatDateArabic(activeYear.end_date);
                
                $('#currentAcademicYear').html(`
                    <div class="text-center">
                        <h5 class="text-primary">${activeYear.name}</h5>
                        <p class="text-muted mb-1">من: ${startDate}</p>
                        <p class="text-muted">إلى: ${endDate}</p>
                        <span class="badge bg-success">نشطة</span>
                    </div>
                `);
            } else {
                $('#currentAcademicYear').html(`
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle fa-2x text-warning mb-2"></i>
                        <p class="text-warning">لا توجد سنة دراسية نشطة</p>
                        <button class="btn btn-sm btn-primary" onclick="showSection('settings')">
                            إنشاء سنة دراسية
                        </button>
                    </div>
                `);
            }
        }
    });
}

function loadStudentsContent() {
    const content = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>إدارة الطلاب</h3>
            <button class="btn btn-primary" onclick="showAddStudentModal()">
                <i class="fas fa-user-plus me-2"></i>
                إضافة طالب جديد
            </button>
        </div>
        
        <!-- Search and Filters -->
        <div class="card mb-4">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="studentSearch">البحث</label>
                            <input type="text" class="form-control" id="studentSearch" placeholder="البحث برقم الهوية أو الاسم">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="classroomFilter">الفصل</label>
                            <select class="form-select" id="classroomFilter">
                                <option value="">جميع الفصول</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label>&nbsp;</label>
                            <div>
                                <button class="btn btn-primary" onclick="searchStudents()">
                                    <i class="fas fa-search me-2"></i>
                                    بحث
                                </button>
                                <button class="btn btn-secondary" onclick="resetStudentFilters()">
                                    <i class="fas fa-undo me-2"></i>
                                    إعادة تعيين
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Students Table -->
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped" id="studentsTable">
                        <thead>
                            <tr>
                                <th>الطالب</th>
                                <th>الجنس</th>
                                <th>ولي الأمر</th>
                                <th>الفصل</th>
                                <th>تاريخ التسجيل</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="studentsTableBody">
                            <tr>
                                <td colspan="8" class="text-center">
                                    <i class="fas fa-spinner fa-spin fa-2x text-muted"></i>
                                    <p class="text-muted mt-2">جاري التحميل...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    $('#students-content').html(content);
    
    // Load students data
    loadStudentsTable();
    
    // Load classrooms for filter
    loadClassroomsFilter();
    
    // Setup search
    initializeSearch('#studentSearch', searchStudents);
}

function loadStudentsTable() {
    $.get('/api/students', function(response) {
        if (response.success) {
            let tableHtml = '';
            
            if (response.students.length === 0) {
                tableHtml = `
                    <tr>
                        <td colspan="8" class="text-center py-4">
                            <i class="fas fa-users fa-3x text-muted mb-3"></i>
                            <p class="text-muted">لا يوجد طلاب مسجلين</p>
                        </td>
                    </tr>
                `;
            } else {
                response.students.forEach(student => {
                    const statusBadge = student.is_active ? 
                        '<span class="badge bg-success">نشط</span>' : 
                        '<span class="badge bg-secondary">غير نشط</span>';
                    
                    const profileImageHtml = getProfileImageHtml(student.profile_image, student.name);
                    
                    tableHtml += `
                        <tr>
                            <td>
                                <div class="d-flex align-items-center">
                                    ${profileImageHtml}
                                    <div class="ms-2">
                                        <div class="fw-bold">${student.name}</div>
                                        <small class="text-muted">${student.national_id}</small>
                                    </div>
                                </div>
                            </td>
                            <td>${student.gender || '-'}</td>
                            <td>${student.guardian_name || '-'}</td>
                            <td>${student.classroom_name || 'غير محدد'}</td>
                            <td>${formatDateArabic(student.enrollment_date)}</td>
                            <td>${statusBadge}</td>
                            <td>
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-outline-primary" onclick="viewStudent(${student.id})" title="عرض">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-success" onclick="editStudent(${student.id})" title="تعديل">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-info" onclick="showImageUploadModal('student', ${student.id}, '${student.name}')" title="إدارة الصورة">
                                        <i class="fas fa-image"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-warning" onclick="transferStudent(${student.id})" title="نقل">
                                        <i class="fas fa-exchange-alt"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent(${student.id})" title="حذف">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#studentsTableBody').html(tableHtml);
        } else {
            showErrorMessage('فشل في تحميل بيانات الطلاب');
        }
    }).fail(function() {
        showErrorMessage('حدث خطأ في الاتصال');
    });
}

function loadClassroomsFilter() {
    $.get('/api/classrooms', function(response) {
        if (response.success) {
            let options = '<option value="">جميع الفصول</option>';
            response.classrooms.forEach(classroom => {
                options += `<option value="${classroom.id}">${classroom.name}</option>`;
            });
            $('#classroomFilter').html(options);
        }
    });
}

function searchStudents() {
    const search = $('#studentSearch').val();
    const classroomId = $('#classroomFilter').val();
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (classroomId) params.append('classroom_id', classroomId);
    
    $.get(`/api/students?${params.toString()}`, function(response) {
        if (response.success) {
            // Update table with filtered results
            loadStudentsTable();
        }
    });
}

function resetStudentFilters() {
    $('#studentSearch').val('');
    $('#classroomFilter').val('');
    loadStudentsTable();
}

function getRoleText(role) {
    const roles = {
        'admin': 'مدير',
        'teacher': 'معلم',
        'supervisor': 'مشرف'
    };
    return roles[role] || 'مستخدم';
}

function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateString = now.toLocaleDateString('ar-SA', options);
    $('#currentDate').text(dateString);
}

// ==================== Student Management Functions ====================

function showAddStudentModal() {
    const modalHtml = `
        <div class="modal fade" id="addStudentModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">إضافة طالب جديد</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addStudentForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">اسم الطالب *</label>
                                    <input type="text" class="form-control" name="name" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">رقم الهوية *</label>
                                    <input type="text" class="form-control" name="national_id" required 
                                           pattern="[0-9]{10}" title="يجب أن يكون رقم الهوية 10 أرقام">
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">الجنس *</label>
                                    <select class="form-select" name="gender" required>
                                        <option value="">اختر الجنس</option>
                                        <option value="ذكر">ذكر</option>
                                        <option value="أنثى">أنثى</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">تاريخ الميلاد</label>
                                    <input type="date" class="form-control" name="birth_date">
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">اسم ولي الأمر *</label>
                                    <input type="text" class="form-control" name="guardian_name" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">هاتف ولي الأمر</label>
                                    <input type="tel" class="form-control" name="guardian_phone">
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">الفصل</label>
                                    <select class="form-select" name="classroom_id">
                                        <option value="">اختر الفصل</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">تاريخ التسجيل</label>
                                    <input type="date" class="form-control" name="enrollment_date" 
                                           value="${new Date().toISOString().split('T')[0]}">
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">العنوان</label>
                                <textarea class="form-control" name="address" rows="2"></textarea>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">ملاحظات</label>
                                <textarea class="form-control" name="notes" rows="2"></textarea>
                            </div>
                            
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" name="is_active" checked>
                                <label class="form-check-label">
                                    الطالب نشط
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="submitAddStudent()">
                            <i class="fas fa-save me-2"></i>
                            حفظ الطالب
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#addStudentModal').remove();
    $('body').append(modalHtml);
    
    // Load classrooms
    loadClassroomsForSelect('#addStudentModal select[name="classroom_id"]');
    
    const modal = new bootstrap.Modal(document.getElementById('addStudentModal'));
    modal.show();
}

function submitAddStudent() {
    const form = document.getElementById('addStudentForm');
    const formData = new FormData(form);
    
    // Validate required fields
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const studentData = {
        name: formData.get('name'),
        national_id: formData.get('national_id'),
        gender: formData.get('gender'),
        birth_date: formData.get('birth_date') || null,
        guardian_name: formData.get('guardian_name'),
        guardian_phone: formData.get('guardian_phone') || null,
        classroom_id: formData.get('classroom_id') || null,
        enrollment_date: formData.get('enrollment_date'),
        address: formData.get('address') || null,
        notes: formData.get('notes') || null,
        is_active: formData.has('is_active')
    };
    
    fetch('/api/students', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(studentData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('تم إضافة الطالب بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addStudentModal')).hide();
            loadStudents(); // Refresh the students list
        } else {
            showAlert(data.error || 'حدث خطأ أثناء إضافة الطالب', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ في الاتصال', 'danger');
    });
}

function loadClassroomsForSelect(selector) {
    fetch('/api/classrooms', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let options = '<option value="">اختر الفصل</option>';
            data.classrooms.forEach(classroom => {
                options += `<option value="${classroom.id}">${classroom.name} - ${classroom.level_name}</option>`;
            });
            $(selector).html(options);
        }
    })
    .catch(error => {
        console.error('Error loading classrooms:', error);
    });
}

function viewStudent(studentId) {
    showInfoMessage(`عرض تفاصيل الطالب رقم: ${studentId}`);
}

function editStudent(studentId) {
    showInfoMessage(`تعديل بيانات الطالب رقم: ${studentId}`);
}

function transferStudent(studentId) {
    showInfoMessage(`نقل الطالب رقم: ${studentId}`);
}

function deleteStudent(studentId) {
    showConfirmDialog(
        'تأكيد الحذف',
        'هل أنت متأكد من حذف هذا الطالب؟',
        function() {
            // Delete student logic here
            showSuccessMessage('تم حذف الطالب بنجاح');
            loadStudentsTable();
        }
    );
}

// Teachers Management
function loadTeachersContent() {
    const content = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>إدارة المعلمين</h3>
            <button class="btn btn-primary" onclick="showAddTeacherModal()">
                <i class="fas fa-user-plus me-2"></i>
                إضافة معلم جديد
            </button>
        </div>
        
        <!-- Search and Filters -->
        <div class="card mb-4">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="teacherSearch">البحث</label>
                            <input type="text" class="form-control" id="teacherSearch" placeholder="البحث برقم الهوية أو الاسم أو التخصص">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label>&nbsp;</label>
                            <div>
                                <button class="btn btn-primary" onclick="searchTeachers()">
                                    <i class="fas fa-search me-2"></i>
                                    بحث
                                </button>
                                <button class="btn btn-secondary" onclick="resetTeacherFilters()">
                                    <i class="fas fa-undo me-2"></i>
                                    إعادة تعيين
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Teachers Table -->
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped" id="teachersTable">
                        <thead>
                            <tr>
                                <th>المعلم</th>
                                <th>التخصص</th>
                                <th>المؤهل</th>
                                <th>الفصول</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="teachersTableBody">
                            <tr>
                                <td colspan="8" class="text-center">
                                    <i class="fas fa-spinner fa-spin fa-2x text-muted"></i>
                                    <p class="text-muted mt-2">جاري التحميل...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    $('#teachers-content').html(content);
    
    // Load teachers data
    loadTeachersTable();
    
    // Setup search
    initializeSearch('#teacherSearch', searchTeachers);
}

function loadTeachersTable() {
    const search = $('#teacherSearch').val() || '';
    
    $.ajax({
        url: '/api/teachers',
        method: 'GET',
        data: { search: search },
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                renderTeachersTable(response.teachers);
            } else {
                showErrorMessage('فشل في تحميل بيانات المعلمين');
            }
        },
        error: function(xhr) {
            console.error('Error loading teachers:', xhr);
            showErrorMessage('حدث خطأ في الاتصال');
        }
    });
}

function renderTeachersTable(teachers) {
    let tableHtml = '';
    
    if (teachers.length === 0) {
        tableHtml = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="fas fa-chalkboard-teacher fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا يوجد معلمين مسجلين</p>
                </td>
            </tr>
        `;
    } else {
        teachers.forEach(teacher => {
            const statusBadge = teacher.is_active ? 
                '<span class="badge bg-success">نشط</span>' : 
                '<span class="badge bg-secondary">غير نشط</span>';
            
            const profileImageHtml = getProfileImageHtml(teacher.profile_image, teacher.name);
            
            tableHtml += `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            ${profileImageHtml}
                            <div class="ms-2">
                                <div class="fw-bold">${teacher.name}</div>
                                <small class="text-muted">${teacher.national_id}</small>
                            </div>
                        </div>
                    </td>
                    <td>${teacher.specialization || '-'}</td>
                    <td>${teacher.qualification || '-'}</td>
                    <td>
                        ${teacher.classrooms && teacher.classrooms.length > 0 
                            ? teacher.classrooms.map(c => c.name).join(', ') 
                            : 'لا يوجد'}
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewTeacher(${teacher.id})" title="عرض">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="editTeacher(${teacher.id})" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="showImageUploadModal('teacher', ${teacher.id}, '${teacher.name}')" title="إدارة الصورة">
                                <i class="fas fa-image"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteTeacher(${teacher.id}, '${teacher.name}')" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    $('#teachersTableBody').html(tableHtml);
}

function searchTeachers() {
    loadTeachersTable();
}

function resetTeacherFilters() {
    $('#teacherSearch').val('');
    loadTeachersTable();
}

function showAddTeacherModal() {
    const modalHtml = `
        <div class="modal fade" id="addTeacherModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">إضافة معلم جديد</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addTeacherForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">الاسم الكامل *</label>
                                    <input type="text" class="form-control" name="name" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">رقم الهوية *</label>
                                    <input type="text" class="form-control" name="national_id" required>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">البريد الإلكتروني *</label>
                                    <input type="email" class="form-control" name="email" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">رقم الهاتف</label>
                                    <input type="text" class="form-control" name="phone">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">التخصص</label>
                                    <input type="text" class="form-control" name="specialization">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">المؤهل العلمي</label>
                                    <select class="form-control" name="qualification">
                                        <option value="">اختر المؤهل</option>
                                        <option value="دبلوم">دبلوم</option>
                                        <option value="بكالوريوس">بكالوريوس</option>
                                        <option value="ماجستير">ماجستير</option>
                                        <option value="دكتوراه">دكتوراه</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">سنوات الخبرة</label>
                                    <input type="number" class="form-control" name="experience_years" min="0">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">تاريخ التوظيف</label>
                                    <input type="date" class="form-control" name="hire_date">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">الراتب</label>
                                    <input type="number" class="form-control" name="salary" min="0" step="0.01">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">العنوان</label>
                                    <textarea class="form-control" name="address" rows="2"></textarea>
                                </div>
                            </div>
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle"></i>
                                كلمة المرور الافتراضية ستكون رقم الهوية، يمكن للمعلم تغييرها لاحقاً
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="saveTeacher()">حفظ</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);
    $('#addTeacherModal').modal('show');
    
    $('#addTeacherModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });
}

function saveTeacher() {
    const form = document.getElementById('addTeacherForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.name || !data.national_id || !data.email) {
        showWarningMessage('يرجى ملء جميع الحقول المطلوبة');
        return;
    }

    $.ajax({
        url: '/api/teachers',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                $('#addTeacherModal').modal('hide');
                showSuccessMessage('تم إضافة المعلم بنجاح');
                loadTeachersTable();
            } else {
                showErrorMessage(response.error || 'حدث خطأ أثناء الحفظ');
            }
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            showErrorMessage(response?.error || 'خطأ في الاتصال بالخادم');
        }
    });
}

function viewTeacher(teacherId) {
    $.ajax({
        url: `/api/teachers/${teacherId}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                showTeacherDetailsModal(response.teacher);
            } else {
                showErrorMessage('خطأ في تحميل بيانات المعلم');
            }
        },
        error: function(xhr) {
            showErrorMessage('خطأ في الاتصال بالخادم');
        }
    });
}

function showTeacherDetailsModal(teacher) {
    const modalHtml = `
        <div class="modal fade" id="teacherDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تفاصيل المعلم</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-4 text-center mb-3">
                                <div class="avatar-lg mx-auto mb-3">
                                    <i class="fas fa-user-circle fa-5x text-primary"></i>
                                </div>
                                <h5>${teacher.name}</h5>
                                <p class="text-muted">${teacher.specialization || 'غير محدد'}</p>
                            </div>
                            <div class="col-md-8">
                                <div class="row">
                                    <div class="col-sm-6 mb-2">
                                        <strong>رقم الهوية:</strong> ${teacher.national_id}
                                    </div>
                                    <div class="col-sm-6 mb-2">
                                        <strong>البريد الإلكتروني:</strong> ${teacher.email}
                                    </div>
                                    <div class="col-sm-6 mb-2">
                                        <strong>الهاتف:</strong> ${teacher.phone || 'غير محدد'}
                                    </div>
                                    <div class="col-sm-6 mb-2">
                                        <strong>المؤهل:</strong> ${teacher.qualification || 'غير محدد'}
                                    </div>
                                    <div class="col-sm-6 mb-2">
                                        <strong>سنوات الخبرة:</strong> ${teacher.experience_years || 0} سنة
                                    </div>
                                    <div class="col-sm-6 mb-2">
                                        <strong>تاريخ التوظيف:</strong> ${teacher.hire_date ? formatDateArabic(teacher.hire_date) : 'غير محدد'}
                                    </div>
                                    <div class="col-sm-6 mb-2">
                                        <strong>الراتب:</strong> ${teacher.salary ? teacher.salary + ' ريال' : 'غير محدد'}
                                    </div>
                                    <div class="col-sm-6 mb-2">
                                        <strong>الحالة:</strong> 
                                        ${teacher.is_active ? '<span class="badge bg-success">نشط</span>' : '<span class="badge bg-secondary">غير نشط</span>'}
                                    </div>
                                </div>
                                ${teacher.address ? `<div class="mt-3"><strong>العنوان:</strong><br>${teacher.address}</div>` : ''}
                            </div>
                        </div>
                        
                        ${teacher.classrooms && teacher.classrooms.length > 0 ? `
                            <hr>
                            <h6>الفصول المسؤول عنها:</h6>
                            <div class="row">
                                ${teacher.classrooms.map(classroom => `
                                    <div class="col-md-4 mb-2">
                                        <div class="card card-body">
                                            <h6 class="card-title">${classroom.name}</h6>
                                            <p class="card-text">
                                                <small class="text-muted">المستوى: ${classroom.level}</small><br>
                                                <small class="text-muted">عدد الطلاب: ${classroom.student_count}</small>
                                            </p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<hr><p class="text-muted">لا يوجد فصول مسؤول عنها حالياً</p>'}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        <button type="button" class="btn btn-warning" onclick="editTeacher(${teacher.id})">تعديل</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);
    $('#teacherDetailsModal').modal('show');
    
    $('#teacherDetailsModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });
}

function editTeacher(teacherId) {
    // Close any open modals first
    $('.modal').modal('hide');
    
    $.ajax({
        url: `/api/teachers/${teacherId}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                showEditTeacherModal(response.teacher);
            } else {
                showErrorMessage('خطأ في تحميل بيانات المعلم');
            }
        },
        error: function(xhr) {
            showErrorMessage('خطأ في الاتصال بالخادم');
        }
    });
}

function showEditTeacherModal(teacher) {
    const modalHtml = `
        <div class="modal fade" id="editTeacherModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تعديل بيانات المعلم</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editTeacherForm">
                            <input type="hidden" name="teacher_id" value="${teacher.id}">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">الاسم الكامل *</label>
                                    <input type="text" class="form-control" name="name" value="${teacher.name}" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">رقم الهوية *</label>
                                    <input type="text" class="form-control" name="national_id" value="${teacher.national_id}" required>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">البريد الإلكتروني *</label>
                                    <input type="email" class="form-control" name="email" value="${teacher.email}" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">رقم الهاتف</label>
                                    <input type="text" class="form-control" name="phone" value="${teacher.phone || ''}">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">التخصص</label>
                                    <input type="text" class="form-control" name="specialization" value="${teacher.specialization || ''}">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">المؤهل العلمي</label>
                                    <select class="form-control" name="qualification">
                                        <option value="">اختر المؤهل</option>
                                        <option value="دبلوم" ${teacher.qualification === 'دبلوم' ? 'selected' : ''}>دبلوم</option>
                                        <option value="بكالوريوس" ${teacher.qualification === 'بكالوريوس' ? 'selected' : ''}>بكالوريوس</option>
                                        <option value="ماجستير" ${teacher.qualification === 'ماجستير' ? 'selected' : ''}>ماجستير</option>
                                        <option value="دكتوراه" ${teacher.qualification === 'دكتوراه' ? 'selected' : ''}>دكتوراه</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">سنوات الخبرة</label>
                                    <input type="number" class="form-control" name="experience_years" value="${teacher.experience_years || ''}" min="0">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">تاريخ التوظيف</label>
                                    <input type="date" class="form-control" name="hire_date" value="${teacher.hire_date || ''}">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">الراتب</label>
                                    <input type="number" class="form-control" name="salary" value="${teacher.salary || ''}" min="0" step="0.01">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">الحالة</label>
                                    <select class="form-control" name="is_active">
                                        <option value="true" ${teacher.is_active ? 'selected' : ''}>نشط</option>
                                        <option value="false" ${!teacher.is_active ? 'selected' : ''}>غير نشط</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">العنوان</label>
                                <textarea class="form-control" name="address" rows="2">${teacher.address || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="updateTeacher()">حفظ التغييرات</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);
    $('#editTeacherModal').modal('show');
    
    $('#editTeacherModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });
}

function updateTeacher() {
    const form = document.getElementById('editTeacherForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const teacherId = data.teacher_id;
    delete data.teacher_id;

    // Convert is_active to boolean
    data.is_active = data.is_active === 'true';

    if (!data.name || !data.national_id || !data.email) {
        showWarningMessage('يرجى ملء جميع الحقول المطلوبة');
        return;
    }

    $.ajax({
        url: `/api/teachers/${teacherId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                $('#editTeacherModal').modal('hide');
                showSuccessMessage('تم تحديث بيانات المعلم بنجاح');
                loadTeachersTable();
            } else {
                showErrorMessage(response.error || 'حدث خطأ أثناء التحديث');
            }
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            showErrorMessage(response?.error || 'خطأ في الاتصال بالخادم');
        }
    });
}

function deleteTeacher(teacherId, teacherName) {
    showConfirmDialog(
        'تأكيد الحذف',
        `هل أنت متأكد من حذف المعلم "${teacherName}"؟\n\nسيتم حذف جميع البيانات المرتبطة به نهائياً.`,
        function() {
            $.ajax({
                url: `/api/teachers/${teacherId}`,
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                success: function(response) {
                    if (response.success) {
                        showSuccessMessage('تم حذف المعلم بنجاح');
                        loadTeachersTable();
                    } else {
                        showErrorMessage(response.error || 'حدث خطأ أثناء الحذف');
                    }
                },
                error: function(xhr) {
                    const response = xhr.responseJSON;
                    showErrorMessage(response?.error || 'خطأ في الاتصال بالخادم');
                }
            });
        }
    );
}

function loadClassroomsContent() {
    $('#classrooms-content').html('<div class="text-center py-5"><h3>إدارة الفصول</h3><p class="text-muted">قيد التطوير...</p></div>');
}

function loadSkillsContent() {
    const content = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>إدارة المهارات</h3>
            <div>
                <button class="btn btn-success me-2" onclick="showAddDomainModal()">
                    <i class="fas fa-plus me-2"></i>
                    إضافة مجال جديد
                </button>
                <button class="btn btn-primary" onclick="showAddSkillModal()">
                    <i class="fas fa-plus me-2"></i>
                    إضافة مهارة جديدة
                </button>
            </div>
        </div>
        
        <!-- Domain Tabs -->
        <div class="card mb-4">
            <div class="card-header">
                <ul class="nav nav-tabs card-header-tabs" id="domainTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="all-skills-tab" data-bs-toggle="tab" data-bs-target="#all-skills" type="button" role="tab">
                            جميع المهارات
                        </button>
                    </li>
                </ul>
            </div>
            <div class="card-body">
                <div class="tab-content" id="domainTabsContent">
                    <div class="tab-pane fade show active" id="all-skills" role="tabpanel">
                        <!-- Search and Filters -->
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <input type="text" class="form-control" id="skillSearch" placeholder="البحث برقم المهارة أو الاسم...">
                            </div>
                            <div class="col-md-4">
                                <select class="form-select" id="domainFilter">
                                    <option value="">جميع المجالات</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <button class="btn btn-primary" onclick="searchSkills()">
                                    <i class="fas fa-search me-2"></i>
                                    بحث
                                </button>
                                <button class="btn btn-secondary" onclick="resetSkillFilters()">
                                    <i class="fas fa-undo me-2"></i>
                                    إعادة تعيين
                                </button>
                            </div>
                        </div>
                        
                        <!-- Skills Table -->
                        <div class="table-responsive">
                            <table class="table table-striped" id="skillsTable">
                                <thead>
                                    <tr>
                                        <th>رقم المهارة</th>
                                        <th>اسم المهارة</th>
                                        <th>المجال</th>
                                        <th>المستوى</th>
                                        <th>الترتيب</th>
                                        <th>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody id="skillsTableBody">
                                    <tr>
                                        <td colspan="6" class="text-center">
                                            <i class="fas fa-spinner fa-spin fa-2x text-muted"></i>
                                            <p class="text-muted mt-2">جاري التحميل...</p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#skills-content').html(content);
    
    // Load data
    loadSkillDomains();
    loadSkillsTable();
    
    // Setup search
    initializeSearch('#skillSearch', searchSkills);
}

function loadSkillDomains() {
    $.ajax({
        url: '/api/skill-domains',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                // Update domain filter
                let options = '<option value="">جميع المجالات</option>';
                response.domains.forEach(domain => {
                    options += `<option value="${domain.id}">${domain.name}</option>`;
                });
                $('#domainFilter').html(options);
                
                // Update domain tabs
                let tabs = `
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="all-skills-tab" data-bs-toggle="tab" data-bs-target="#all-skills" type="button" role="tab">
                            جميع المهارات
                        </button>
                    </li>
                `;
                
                response.domains.forEach(domain => {
                    tabs += `
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="domain-${domain.id}-tab" data-bs-toggle="tab" data-bs-target="#domain-${domain.id}" type="button" role="tab">
                                ${domain.name} (${domain.skills_count})
                            </button>
                        </li>
                    `;
                });
                
                $('#domainTabs').html(tabs);
            }
        },
        error: function(xhr) {
            console.error('Error loading domains:', xhr);
        }
    });
}

function loadSkillsTable() {
    const search = $('#skillSearch').val() || '';
    const domainId = $('#domainFilter').val() || '';
    
    $.ajax({
        url: '/api/skills',
        method: 'GET',
        data: { search: search, domain_id: domainId },
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                renderSkillsTable(response.skills);
            } else {
                showErrorMessage('فشل في تحميل بيانات المهارات');
            }
        },
        error: function(xhr) {
            console.error('Error loading skills:', xhr);
            showErrorMessage('حدث خطأ في الاتصال');
        }
    });
}

function renderSkillsTable(skills) {
    let tableHtml = '';
    
    if (skills.length === 0) {
        tableHtml = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-tasks fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد مهارات مسجلة</p>
                </td>
            </tr>
        `;
    } else {
        skills.forEach(skill => {
            tableHtml += `
                <tr>
                    <td>
                        <span class="badge bg-primary">${skill.skill_number}</span>
                    </td>
                    <td>
                        <strong>${skill.name}</strong>
                        ${skill.description ? `<br><small class="text-muted">${skill.description}</small>` : ''}
                    </td>
                    <td>
                        <span class="badge bg-info">${skill.domain_name}</span>
                    </td>
                    <td>${skill.level || '-'}</td>
                    <td>
                        <span class="badge bg-secondary">${skill.order_index}</span>
                    </td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewSkill(${skill.id})" title="عرض">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="editSkill(${skill.id})" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteSkill(${skill.id}, '${skill.name}')" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    $('#skillsTableBody').html(tableHtml);
}

function searchSkills() {
    loadSkillsTable();
}

function resetSkillFilters() {
    $('#skillSearch').val('');
    $('#domainFilter').val('');
    loadSkillsTable();
}

function showAddDomainModal() {
    const modalHtml = `
        <div class="modal fade" id="addDomainModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">إضافة مجال جديد</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addDomainForm">
                            <div class="mb-3">
                                <label class="form-label">اسم المجال *</label>
                                <input type="text" class="form-control" name="name" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">الوصف</label>
                                <textarea class="form-control" name="description" rows="3"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">ترتيب العرض</label>
                                <input type="number" class="form-control" name="order_index" value="0" min="0">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-success" onclick="saveDomain()">حفظ</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);
    $('#addDomainModal').modal('show');
    
    $('#addDomainModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });
}

function saveDomain() {
    const form = document.getElementById('addDomainForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.name) {
        showWarningMessage('يرجى إدخال اسم المجال');
        return;
    }

    $.ajax({
        url: '/api/skill-domains',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                $('#addDomainModal').modal('hide');
                showSuccessMessage('تم إضافة المجال بنجاح');
                loadSkillDomains();
                loadSkillsTable();
            } else {
                showErrorMessage(response.error || 'حدث خطأ أثناء الحفظ');
            }
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            showErrorMessage(response?.error || 'خطأ في الاتصال بالخادم');
        }
    });
}

function showAddSkillModal() {
    // First load domains for the dropdown
    $.ajax({
        url: '/api/skill-domains',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                let domainOptions = '<option value="">اختر المجال</option>';
                response.domains.forEach(domain => {
                    domainOptions += `<option value="${domain.id}">${domain.name}</option>`;
                });
                
                const modalHtml = `
                    <div class="modal fade" id="addSkillModal" tabindex="-1">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">إضافة مهارة جديدة</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <form id="addSkillForm">
                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">رقم المهارة *</label>
                                                <input type="text" class="form-control" name="skill_number" required>
                                                <small class="form-text text-muted">مثال: 1.1, 2.3, A1</small>
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">المجال *</label>
                                                <select class="form-select" name="domain_id" required>
                                                    ${domainOptions}
                                                </select>
                                            </div>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">اسم المهارة *</label>
                                            <input type="text" class="form-control" name="name" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">وصف المهارة</label>
                                            <textarea class="form-control" name="description" rows="3"></textarea>
                                        </div>
                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">المستوى</label>
                                                <select class="form-select" name="level">
                                                    <option value="">اختر المستوى</option>
                                                    <option value="مبتدئ">مبتدئ</option>
                                                    <option value="متوسط">متوسط</option>
                                                    <option value="متقدم">متقدم</option>
                                                </select>
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <label class="form-label">ترتيب العرض</label>
                                                <input type="number" class="form-control" name="order_index" value="0" min="0">
                                            </div>
                                        </div>
                                    </form>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                                    <button type="button" class="btn btn-primary" onclick="saveSkill()">حفظ</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                $('body').append(modalHtml);
                $('#addSkillModal').modal('show');
                
                $('#addSkillModal').on('hidden.bs.modal', function () {
                    $(this).remove();
                });
            } else {
                showErrorMessage('فشل في تحميل المجالات');
            }
        },
        error: function(xhr) {
            showErrorMessage('خطأ في الاتصال بالخادم');
        }
    });
}

function saveSkill() {
    const form = document.getElementById('addSkillForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.skill_number || !data.name || !data.domain_id) {
        showWarningMessage('يرجى ملء جميع الحقول المطلوبة');
        return;
    }

    $.ajax({
        url: '/api/skills',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                $('#addSkillModal').modal('hide');
                showSuccessMessage('تم إضافة المهارة بنجاح');
                loadSkillDomains();
                loadSkillsTable();
            } else {
                showErrorMessage(response.error || 'حدث خطأ أثناء الحفظ');
            }
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            showErrorMessage(response?.error || 'خطأ في الاتصال بالخادم');
        }
    });
}

function viewSkill(skillId) {
    showInfoMessage(`عرض تفاصيل المهارة رقم: ${skillId}`);
}

function editSkill(skillId) {
    showInfoMessage(`تعديل المهارة رقم: ${skillId}`);
}

function deleteSkill(skillId, skillName) {
    showConfirmDialog(
        'تأكيد الحذف',
        `هل أنت متأكد من حذف المهارة "${skillName}"؟`,
        function() {
            showSuccessMessage('تم حذف المهارة بنجاح');
            loadSkillsTable();
        }
    );
}

function loadAssessmentsContent() {
    const content = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>إدارة التقييمات</h3>
            <button class="btn btn-primary" onclick="showNewAssessmentModal()">
                <i class="fas fa-plus me-2"></i>
                تقييم جديد
            </button>
        </div>
        
        <!-- Search and Filters -->
        <div class="card mb-4">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-4">
                        <label class="form-label">البحث بالطالب</label>
                        <input type="text" class="form-control" id="assessmentStudentSearch" placeholder="البحث برقم الهوية أو الاسم...">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">السنة الدراسية</label>
                        <select class="form-select" id="assessmentYearFilter">
                            <option value="">جميع السنوات</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label>&nbsp;</label>
                        <div>
                            <button class="btn btn-primary" onclick="searchAssessments()">
                                <i class="fas fa-search me-2"></i>
                                بحث
                            </button>
                            <button class="btn btn-secondary" onclick="resetAssessmentFilters()">
                                <i class="fas fa-undo me-2"></i>
                                إعادة تعيين
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Assessments Table -->
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped" id="assessmentsTable">
                        <thead>
                            <tr>
                                <th>الطالب</th>
                                <th>رقم الهوية</th>
                                <th>تاريخ التقييم</th>
                                <th>القائم بالتقييم</th>
                                <th>عدد المهارات</th>
                                <th>السنة الدراسية</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="assessmentsTableBody">
                            <tr>
                                <td colspan="7" class="text-center">
                                    <i class="fas fa-spinner fa-spin fa-2x text-muted"></i>
                                    <p class="text-muted mt-2">جاري التحميل...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    $('#assessments-content').html(content);
    
    // Load data
    loadAssessmentsTable();
    loadAcademicYearsFilter();
    
    // Setup search
    initializeSearch('#assessmentStudentSearch', searchAssessments);
}

function loadAssessmentsTable() {
    const studentSearch = $('#assessmentStudentSearch').val() || '';
    const yearId = $('#assessmentYearFilter').val() || '';
    
    $.ajax({
        url: '/api/assessments',
        method: 'GET',
        data: { 
            student_search: studentSearch,
            academic_year_id: yearId
        },
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                renderAssessmentsTable(response.assessments);
            } else {
                showErrorMessage('فشل في تحميل بيانات التقييمات');
            }
        },
        error: function(xhr) {
            console.error('Error loading assessments:', xhr);
            showErrorMessage('حدث خطأ في الاتصال');
        }
    });
}

function renderAssessmentsTable(assessments) {
    let tableHtml = '';
    
    if (assessments.length === 0) {
        tableHtml = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-clipboard-check fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد تقييمات مسجلة</p>
                </td>
            </tr>
        `;
    } else {
        assessments.forEach(assessment => {
            tableHtml += `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar-sm me-2">
                                <i class="fas fa-user-circle fa-2x text-info"></i>
                            </div>
                            <strong>${assessment.student_name}</strong>
                        </div>
                    </td>
                    <td>${assessment.student_national_id}</td>
                    <td>${formatDateArabic(assessment.assessment_date)}</td>
                    <td>${assessment.evaluator_name}</td>
                    <td>
                        <span class="badge bg-primary">${assessment.skill_evaluations_count}</span>
                    </td>
                    <td>
                        <span class="badge bg-info">${assessment.academic_year_name || 'غير محدد'}</span>
                    </td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewAssessment(${assessment.id})" title="عرض">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="editAssessment(${assessment.id})" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="printAssessment(${assessment.id})" title="طباعة">
                                <i class="fas fa-print"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="showEmailModal('assessment', ${assessment.id}, '${assessment.student_name}')" title="إرسال بالإيميل">
                                <i class="fas fa-envelope"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteAssessment(${assessment.id}, '${assessment.student_name}')" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    $('#assessmentsTableBody').html(tableHtml);
}

function loadAcademicYearsFilter() {
    $.ajax({
        url: '/api/academic-years',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                let options = '<option value="">جميع السنوات</option>';
                response.years.forEach(year => {
                    options += `<option value="${year.id}">${year.name}</option>`;
                });
                $('#assessmentYearFilter').html(options);
            }
        },
        error: function(xhr) {
            console.error('Error loading academic years:', xhr);
        }
    });
}

function searchAssessments() {
    loadAssessmentsTable();
}

function resetAssessmentFilters() {
    $('#assessmentStudentSearch').val('');
    $('#assessmentYearFilter').val('');
    loadAssessmentsTable();
}

function showNewAssessmentModal() {
    // First load students and domains
    Promise.all([
        $.ajax({
            url: '/api/students',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        }),
        $.ajax({
            url: '/api/skill-domains',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        })
    ]).then(([studentsResponse, domainsResponse]) => {
        if (studentsResponse.success && domainsResponse.success) {
            let studentOptions = '<option value="">اختر الطالب</option>';
            studentsResponse.students.forEach(student => {
                studentOptions += `<option value="${student.id}">${student.name} - ${student.national_id}</option>`;
            });
            
            let domainTabs = '';
            let domainContent = '';
            
            domainsResponse.domains.forEach((domain, index) => {
                const isActive = index === 0 ? 'active' : '';
                domainTabs += `
                    <li class="nav-item" role="presentation">
                        <button class="nav-link ${isActive}" id="domain-${domain.id}-tab" data-bs-toggle="tab" 
                                data-bs-target="#domain-${domain.id}-content" type="button" role="tab"
                                onclick="loadDomainSkills(${domain.id})">
                            ${domain.name}
                        </button>
                    </li>
                `;
                
                domainContent += `
                    <div class="tab-pane fade ${isActive ? 'show active' : ''}" id="domain-${domain.id}-content" role="tabpanel">
                        <div id="skills-${domain.id}" class="skills-container">
                            <div class="text-center">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p class="text-muted mt-2">جاري تحميل المهارات...</p>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            const modalHtml = `
                <div class="modal fade" id="newAssessmentModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">تقييم جديد</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="newAssessmentForm">
                                    <div class="row mb-4">
                                        <div class="col-md-6">
                                            <label class="form-label">الطالب *</label>
                                            <select class="form-select" name="student_id" required>
                                                ${studentOptions}
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">ملاحظات</label>
                                            <textarea class="form-control" name="notes" rows="2"></textarea>
                                        </div>
                                    </div>
                                    
                                    <h6 class="mb-3">تقييم المهارات</h6>
                                    
                                    <!-- Domain Tabs -->
                                    <ul class="nav nav-tabs" id="domainTabs" role="tablist">
                                        ${domainTabs}
                                    </ul>
                                    
                                    <!-- Domain Content -->
                                    <div class="tab-content mt-3" id="domainTabsContent">
                                        ${domainContent}
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                                <button type="button" class="btn btn-primary" onclick="saveAssessment()">حفظ التقييم</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(modalHtml);
            $('#newAssessmentModal').modal('show');
            
            // Load skills for first domain
            if (domainsResponse.domains.length > 0) {
                loadDomainSkills(domainsResponse.domains[0].id);
            }
            
            $('#newAssessmentModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        } else {
            showErrorMessage('فشل في تحميل البيانات المطلوبة');
        }
    }).catch(error => {
        console.error('Error loading data:', error);
        showErrorMessage('خطأ في الاتصال بالخادم');
    });
}

function loadDomainSkills(domainId) {
    $.ajax({
        url: `/api/skills/by-domain/${domainId}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                let skillsHtml = '';
                
                if (response.skills.length === 0) {
                    skillsHtml = '<p class="text-muted text-center">لا توجد مهارات في هذا المجال</p>';
                } else {
                    skillsHtml = '<div class="row">';
                    response.skills.forEach(skill => {
                        skillsHtml += `
                            <div class="col-md-6 mb-3">
                                <div class="card">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span class="badge bg-primary me-2">${skill.skill_number}</span>
                                                <strong>${skill.name}</strong>
                                            </div>
                                        </div>
                                        ${skill.description ? `<p class="text-muted small mb-2">${skill.description}</p>` : ''}
                                        <div class="skill-evaluation" data-skill-id="${skill.id}">
                                            <div class="btn-group w-100" role="group">
                                                <input type="radio" class="btn-check" name="skill_${skill.id}" id="skill_${skill.id}_yes" value="نعم">
                                                <label class="btn btn-outline-success" for="skill_${skill.id}_yes">نعم</label>
                                                
                                                <input type="radio" class="btn-check" name="skill_${skill.id}" id="skill_${skill.id}_somewhat" value="نوعاً ما">
                                                <label class="btn btn-outline-warning" for="skill_${skill.id}_somewhat">نوعاً ما</label>
                                                
                                                <input type="radio" class="btn-check" name="skill_${skill.id}" id="skill_${skill.id}_no" value="لا">
                                                <label class="btn btn-outline-danger" for="skill_${skill.id}_no">لا</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    skillsHtml += '</div>';
                }
                
                $(`#skills-${domainId}`).html(skillsHtml);
            } else {
                $(`#skills-${domainId}`).html('<p class="text-danger text-center">فشل في تحميل المهارات</p>');
            }
        },
        error: function(xhr) {
            console.error('Error loading domain skills:', xhr);
            $(`#skills-${domainId}`).html('<p class="text-danger text-center">خطأ في الاتصال</p>');
        }
    });
}

function saveAssessment() {
    const form = document.getElementById('newAssessmentForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.student_id) {
        showWarningMessage('يرجى اختيار الطالب');
        return;
    }

    // Collect skill evaluations
    const skillEvaluations = [];
    $('.skill-evaluation').each(function() {
        const skillId = $(this).data('skill-id');
        const selectedValue = $(`input[name="skill_${skillId}"]:checked`).val();
        
        if (selectedValue) {
            skillEvaluations.push({
                skill_id: skillId,
                evaluation_result: selectedValue
            });
        }
    });

    if (skillEvaluations.length === 0) {
        showWarningMessage('يرجى تقييم مهارة واحدة على الأقل');
        return;
    }

    const assessmentData = {
        student_id: data.student_id,
        notes: data.notes || '',
        skill_evaluations: skillEvaluations
    };

    $.ajax({
        url: '/api/assessments',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(assessmentData),
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                $('#newAssessmentModal').modal('hide');
                showSuccessMessage('تم حفظ التقييم بنجاح');
                loadAssessmentsTable();
            } else {
                showErrorMessage(response.error || 'حدث خطأ أثناء الحفظ');
            }
        },
        error: function(xhr) {
            const response = xhr.responseJSON;
            showErrorMessage(response?.error || 'خطأ في الاتصال بالخادم');
        }
    });
}

function viewAssessment(assessmentId) {
    $.ajax({
        url: `/api/assessments/${assessmentId}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            if (response.success) {
                showAssessmentDetailsModal(response.assessment);
            } else {
                showErrorMessage('خطأ في تحميل بيانات التقييم');
            }
        },
        error: function(xhr) {
            showErrorMessage('خطأ في الاتصال بالخادم');
        }
    });
}

function showAssessmentDetailsModal(assessment) {
    let skillsHtml = '';
    
    // Group skills by domain
    const skillsByDomain = {};
    assessment.skill_evaluations.forEach(skillEval => {
        if (!skillsByDomain[skillEval.skill_domain]) {
            skillsByDomain[skillEval.skill_domain] = [];
        }
        skillsByDomain[skillEval.skill_domain].push(skillEval);
    });
    
    Object.keys(skillsByDomain).forEach(domain => {
        skillsHtml += `
            <h6 class="mt-3 mb-2">${domain}</h6>
            <div class="table-responsive">
                <table class="table table-sm table-bordered">
                    <thead>
                        <tr>
                            <th>رقم المهارة</th>
                            <th>اسم المهارة</th>
                            <th>النتيجة</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        skillsByDomain[domain].forEach(skillEval => {
            const resultBadge = skillEval.evaluation_result === 'نعم' ? 'bg-success' :
                               skillEval.evaluation_result === 'نوعاً ما' ? 'bg-warning' : 'bg-danger';
            
            skillsHtml += `
                <tr>
                    <td><span class="badge bg-primary">${skillEval.skill_number}</span></td>
                    <td>${skillEval.skill_name}</td>
                    <td><span class="badge ${resultBadge}">${skillEval.evaluation_result}</span></td>
                </tr>
            `;
        });
        
        skillsHtml += `
                    </tbody>
                </table>
            </div>
        `;
    });
    
    const modalHtml = `
        <div class="modal fade" id="assessmentDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تفاصيل التقييم</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <strong>الطالب:</strong> ${assessment.student_name}
                            </div>
                            <div class="col-md-6">
                                <strong>رقم الهوية:</strong> ${assessment.student_national_id}
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <strong>تاريخ التقييم:</strong> ${formatDateArabic(assessment.assessment_date)}
                            </div>
                            <div class="col-md-6">
                                <strong>القائم بالتقييم:</strong> ${assessment.evaluator_name}
                            </div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <strong>السنة الدراسية:</strong> ${assessment.academic_year_name || 'غير محدد'}
                            </div>
                            <div class="col-md-6">
                                <strong>عدد المهارات:</strong> ${assessment.skill_evaluations.length}
                            </div>
                        </div>
                        ${assessment.notes ? `
                            <div class="mb-3">
                                <strong>الملاحظات:</strong>
                                <p class="text-muted">${assessment.notes}</p>
                            </div>
                        ` : ''}
                        
                        <hr>
                        <h6>نتائج التقييم</h6>
                        ${skillsHtml}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        <button type="button" class="btn btn-warning" onclick="editAssessment(${assessment.id})">تعديل</button>
                        <button type="button" class="btn btn-info" onclick="printAssessment(${assessment.id})">طباعة</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    $('body').append(modalHtml);
    $('#assessmentDetailsModal').modal('show');
    
    $('#assessmentDetailsModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });
}

function editAssessment(assessmentId) {
    showInfoMessage(`تعديل التقييم رقم: ${assessmentId}`);
}

function printAssessment(assessmentId) {
    showInfoMessage(`طباعة التقييم رقم: ${assessmentId}`);
}

function deleteAssessment(assessmentId, studentName) {
    showConfirmDialog(
        'تأكيد الحذف',
        `هل أنت متأكد من حذف تقييم الطالب "${studentName}"؟\n\nسيتم حذف جميع البيانات المرتبطة به نهائياً.`,
        function() {
            $.ajax({
                url: `/api/assessments/${assessmentId}`,
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                },
                success: function(response) {
                    if (response.success) {
                        showSuccessMessage('تم حذف التقييم بنجاح');
                        loadAssessmentsTable();
                    } else {
                        showErrorMessage(response.error || 'حدث خطأ أثناء الحذف');
                    }
                },
                error: function(xhr) {
                    const response = xhr.responseJSON;
                    showErrorMessage(response?.error || 'خطأ في الاتصال بالخادم');
                }
            });
        }
    );
}

function loadIndividualPlansContent() {
    $('#individual-plans-content').html('<div class="text-center py-5"><h3>الخطط الفردية</h3><p class="text-muted">قيد التطوير...</p></div>');
}

function loadWeeklyPlansContent() {
    $('#weekly-plans-content').html('<div class="text-center py-5"><h3>الخطط الأسبوعية</h3><p class="text-muted">قيد التطوير...</p></div>');
}

function loadDailyFollowupContent() {
    $('#daily-followup-content').html('<div class="text-center py-5"><h3>المتابعة اليومية</h3><p class="text-muted">قيد التطوير...</p></div>');
}

function loadReportsContent() {
    $('#reports-content').html('<div class="text-center py-5"><h3>التقارير</h3><p class="text-muted">قيد التطوير...</p></div>');
}

function loadSettingsContent() {
    $('#settings-content').html('<div class="text-center py-5"><h3>الإعدادات</h3><p class="text-muted">قيد التطوير...</p></div>');
}

// ==================== نظام نقل الطلاب ====================

function loadTransfersContent() {
    const content = `
        <div class="row mb-4">
            <div class="col-md-8">
                <div class="input-group">
                    <input type="text" class="form-control" id="transfersSearch" placeholder="البحث بالاسم أو رقم الهوية...">
                    <button class="btn btn-outline-secondary" type="button" onclick="searchTransfers()">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>
            <div class="col-md-4 text-end">
                <button class="btn btn-primary" onclick="showNewTransferModal()">
                    <i class="fas fa-plus"></i> نقل طالب جديد
                </button>
            </div>
        </div>

        <div class="row mb-3">
            <div class="col-md-3">
                <select class="form-select" id="studentFilter" onchange="filterTransfers()">
                    <option value="">جميع الطلاب</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select" id="fromClassroomFilter" onchange="filterTransfers()">
                    <option value="">من جميع الفصول</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select" id="toClassroomFilter" onchange="filterTransfers()">
                    <option value="">إلى جميع الفصول</option>
                </select>
            </div>
            <div class="col-md-3">
                <button class="btn btn-secondary" onclick="resetTransferFilters()">
                    <i class="fas fa-undo"></i> إعادة تعيين
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>اسم الطالب</th>
                                <th>رقم الهوية</th>
                                <th>من الفصل</th>
                                <th>إلى الفصل</th>
                                <th>تاريخ النقل</th>
                                <th>السبب</th>
                                <th>نقل بواسطة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="transfersTableBody">
                            <tr>
                                <td colspan="8" class="text-center">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">جاري التحميل...</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Modal نقل طالب جديد -->
        <div class="modal fade" id="newTransferModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">نقل طالب جديد</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="newTransferForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="transferStudentId" class="form-label">الطالب *</label>
                                    <select class="form-select" id="transferStudentId" required>
                                        <option value="">اختر الطالب</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="transferToClassroom" class="form-label">إلى الفصل *</label>
                                    <select class="form-select" id="transferToClassroom" required>
                                        <option value="">اختر الفصل</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="transferFromClassroom" class="form-label">من الفصل</label>
                                    <select class="form-select" id="transferFromClassroom">
                                        <option value="">غير محدد</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="transferReason" class="form-label">سبب النقل</label>
                                    <input type="text" class="form-control" id="transferReason">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="transferNotes" class="form-label">ملاحظات</label>
                                <textarea class="form-control" id="transferNotes" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="saveTransfer()">حفظ النقل</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#mainContent').html(content);
    loadTransfersData();
    loadStudentsForTransfer();
    loadClassroomsForTransfer();
}

function loadTransfersData() {
    const search = $('#transfersSearch').val() || '';
    const studentId = $('#studentFilter').val() || '';
    const fromClassroom = $('#fromClassroomFilter').val() || '';
    const toClassroom = $('#toClassroomFilter').val() || '';
    
    const params = new URLSearchParams({
        search: search,
        student_id: studentId,
        from_classroom: fromClassroom,
        to_classroom: toClassroom
    });
    
    $.ajax({
        url: `/api/student-transfers?${params}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                displayTransfers(response.transfers);
            }
        },
        error: function() {
            $('#transfersTableBody').html('<tr><td colspan="8" class="text-center text-danger">خطأ في تحميل البيانات</td></tr>');
        }
    });
}

function displayTransfers(transfers) {
    const tbody = $('#transfersTableBody');
    
    if (transfers.length === 0) {
        tbody.html('<tr><td colspan="8" class="text-center text-muted">لا توجد عمليات نقل</td></tr>');
        return;
    }
    
    const rows = transfers.map(transfer => `
        <tr>
            <td>${transfer.student_name}</td>
            <td>${transfer.student_national_id}</td>
            <td>${transfer.from_classroom_name || 'غير محدد'}</td>
            <td>${transfer.to_classroom_name}</td>
            <td>${new Date(transfer.transfer_date).toLocaleDateString('ar-SA')}</td>
            <td>${transfer.reason || '-'}</td>
            <td>${transfer.transferred_by}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTransfer(${transfer.id}, '${transfer.student_name}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.html(rows);
}

function loadStudentsForTransfer() {
    $.ajax({
        url: '/api/students',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                const studentSelect = $('#transferStudentId');
                const filterSelect = $('#studentFilter');
                
                studentSelect.empty().append('<option value="">اختر الطالب</option>');
                filterSelect.empty().append('<option value="">جميع الطلاب</option>');
                
                response.students.forEach(student => {
                    const option = `<option value="${student.id}">${student.name} - ${student.national_id}</option>`;
                    studentSelect.append(option);
                    filterSelect.append(option);
                });
            }
        }
    });
}

function loadClassroomsForTransfer() {
    $.ajax({
        url: '/api/classrooms',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                const fromSelect = $('#transferFromClassroom');
                const toSelect = $('#transferToClassroom');
                const fromFilter = $('#fromClassroomFilter');
                const toFilter = $('#toClassroomFilter');
                
                fromSelect.empty().append('<option value="">غير محدد</option>');
                toSelect.empty().append('<option value="">اختر الفصل</option>');
                fromFilter.empty().append('<option value="">من جميع الفصول</option>');
                toFilter.empty().append('<option value="">إلى جميع الفصول</option>');
                
                response.classrooms.forEach(classroom => {
                    const option = `<option value="${classroom.id}">${classroom.name} - ${classroom.level}</option>`;
                    fromSelect.append(option);
                    toSelect.append(option);
                    fromFilter.append(option);
                    toFilter.append(option);
                });
            }
        }
    });
}

function showNewTransferModal() {
    $('#newTransferForm')[0].reset();
    $('#newTransferModal').modal('show');
}

function saveTransfer() {
    const studentId = $('#transferStudentId').val();
    const toClassroomId = $('#transferToClassroom').val();
    const fromClassroomId = $('#transferFromClassroom').val();
    const reason = $('#transferReason').val();
    const notes = $('#transferNotes').val();
    
    if (!studentId || !toClassroomId) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    const transferData = {
        student_id: parseInt(studentId),
        to_classroom_id: parseInt(toClassroomId),
        from_classroom_id: fromClassroomId ? parseInt(fromClassroomId) : null,
        reason: reason,
        notes: notes
    };
    
    $.ajax({
        url: '/api/student-transfers',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(transferData),
        success: function(response) {
            if (response.success) {
                $('#newTransferModal').modal('hide');
                loadTransfersData();
                alert('تم نقل الطالب بنجاح');
            } else {
                alert('خطأ: ' + response.error);
            }
        },
        error: function() {
            alert('خطأ في الاتصال بالخادم');
        }
    });
}

function searchTransfers() {
    loadTransfersData();
}

function filterTransfers() {
    loadTransfersData();
}

function resetTransferFilters() {
    $('#transfersSearch').val('');
    $('#studentFilter').val('');
    $('#fromClassroomFilter').val('');
    $('#toClassroomFilter').val('');
    loadTransfersData();
}

function deleteTransfer(transferId, studentName) {
    if (confirm(`هل أنت متأكد من حذف سجل نقل الطالب "${studentName}"؟`)) {
        $.ajax({
            url: `/api/student-transfers/${transferId}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            success: function(response) {
                if (response.success) {
                    loadTransfersData();
                    alert('تم حذف سجل النقل بنجاح');
                } else {
                    alert('خطأ: ' + response.error);
                }
            },
            error: function() {
                alert('خطأ في الاتصال بالخادم');
            }
        });
    }
}

// ==================== نظام الخطة الفردية ====================

function loadIndividualPlansContent() {
    const content = `
        <div class="row mb-4">
            <div class="col-md-8">
                <div class="input-group">
                    <input type="text" class="form-control" id="plansSearch" placeholder="البحث باسم الخطة أو الطالب...">
                    <button class="btn btn-outline-secondary" type="button" onclick="searchPlans()">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>
            <div class="col-md-4 text-end">
                <button class="btn btn-primary" onclick="showNewPlanModal()">
                    <i class="fas fa-plus"></i> خطة فردية جديدة
                </button>
            </div>
        </div>

        <div class="row mb-3">
            <div class="col-md-3">
                <select class="form-select" id="studentPlanFilter" onchange="filterPlans()">
                    <option value="">جميع الطلاب</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select" id="teacherPlanFilter" onchange="filterPlans()">
                    <option value="">جميع المعلمين</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select" id="statusPlanFilter" onchange="filterPlans()">
                    <option value="">جميع الحالات</option>
                    <option value="نشط">نشط</option>
                    <option value="مكتمل">مكتمل</option>
                    <option value="متوقف">متوقف</option>
                </select>
            </div>
            <div class="col-md-3">
                <button class="btn btn-secondary" onclick="resetPlanFilters()">
                    <i class="fas fa-undo"></i> إعادة تعيين
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>اسم الخطة</th>
                                <th>الطالب</th>
                                <th>المعلم</th>
                                <th>الفصل</th>
                                <th>تاريخ البداية</th>
                                <th>تاريخ النهاية</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="plansTableBody">
                            <tr>
                                <td colspan="8" class="text-center">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">جاري التحميل...</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Modal خطة فردية جديدة -->
        <div class="modal fade" id="newPlanModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">خطة فردية جديدة</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="newPlanForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="planName" class="form-label">اسم الخطة *</label>
                                    <input type="text" class="form-control" id="planName" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="planStudentId" class="form-label">الطالب *</label>
                                    <select class="form-select" id="planStudentId" required>
                                        <option value="">اختر الطالب</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label for="planTeacherId" class="form-label">المعلم</label>
                                    <select class="form-select" id="planTeacherId">
                                        <option value="">اختر المعلم</option>
                                    </select>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="planClassroomId" class="form-label">الفصل</label>
                                    <select class="form-select" id="planClassroomId">
                                        <option value="">اختر الفصل</option>
                                    </select>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="planStatus" class="form-label">الحالة</label>
                                    <select class="form-select" id="planStatus">
                                        <option value="نشط">نشط</option>
                                        <option value="مكتمل">مكتمل</option>
                                        <option value="متوقف">متوقف</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="planStartDate" class="form-label">تاريخ البداية</label>
                                    <input type="date" class="form-control" id="planStartDate">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="planEndDate" class="form-label">تاريخ النهاية</label>
                                    <input type="date" class="form-control" id="planEndDate">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="planNotes" class="form-label">ملاحظات</label>
                                <textarea class="form-control" id="planNotes" rows="3"></textarea>
                            </div>
                            
                            <h6>مهارات الخطة</h6>
                            <div class="mb-3">
                                <button type="button" class="btn btn-outline-primary btn-sm" onclick="addPlanSkill()">
                                    <i class="fas fa-plus"></i> إضافة مهارة
                                </button>
                            </div>
                            <div id="planSkillsContainer">
                                <!-- سيتم إضافة المهارات هنا -->
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="savePlan()">حفظ الخطة</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal عرض تفاصيل الخطة -->
        <div class="modal fade" id="viewPlanModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تفاصيل الخطة الفردية</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="planDetailsBody">
                        <!-- سيتم تحميل التفاصيل هنا -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#mainContent').html(content);
    loadPlansData();
    loadStudentsForPlan();
    loadTeachersForPlan();
    loadClassroomsForPlan();
    loadSkillsForPlan();
}

function loadPlansData() {
    const search = $('#plansSearch').val() || '';
    const studentId = $('#studentPlanFilter').val() || '';
    const teacherId = $('#teacherPlanFilter').val() || '';
    const status = $('#statusPlanFilter').val() || '';
    
    const params = new URLSearchParams({
        search: search,
        student_id: studentId,
        teacher_id: teacherId,
        status: status
    });
    
    $.ajax({
        url: `/api/individual-plans?${params}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                displayPlans(response.plans);
            }
        },
        error: function() {
            $('#plansTableBody').html('<tr><td colspan="8" class="text-center text-danger">خطأ في تحميل البيانات</td></tr>');
        }
    });
}

function displayPlans(plans) {
    const tbody = $('#plansTableBody');
    
    if (plans.length === 0) {
        tbody.html('<tr><td colspan="8" class="text-center text-muted">لا توجد خطط فردية</td></tr>');
        return;
    }
    
    const rows = plans.map(plan => `
        <tr>
            <td>${plan.plan_name}</td>
            <td>${plan.student_name} - ${plan.student_national_id}</td>
            <td>${plan.teacher_name || 'غير محدد'}</td>
            <td>${plan.classroom_name || 'غير محدد'}</td>
            <td>${plan.start_date ? new Date(plan.start_date).toLocaleDateString('ar-SA') : '-'}</td>
            <td>${plan.end_date ? new Date(plan.end_date).toLocaleDateString('ar-SA') : '-'}</td>
            <td>
                <span class="badge ${plan.status === 'نشط' ? 'bg-success' : plan.status === 'مكتمل' ? 'bg-primary' : 'bg-secondary'}">
                    ${plan.status}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-info me-1" onclick="viewPlan(${plan.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editPlan(${plan.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePlan(${plan.id}, '${plan.plan_name}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.html(rows);
}

function loadStudentsForPlan() {
    $.ajax({
        url: '/api/students',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                const studentSelect = $('#planStudentId');
                const filterSelect = $('#studentPlanFilter');
                
                studentSelect.empty().append('<option value="">اختر الطالب</option>');
                filterSelect.empty().append('<option value="">جميع الطلاب</option>');
                
                response.students.forEach(student => {
                    const option = `<option value="${student.id}">${student.name} - ${student.national_id}</option>`;
                    studentSelect.append(option);
                    filterSelect.append(option);
                });
            }
        }
    });
}

function loadTeachersForPlan() {
    $.ajax({
        url: '/api/teachers',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                const teacherSelect = $('#planTeacherId');
                const filterSelect = $('#teacherPlanFilter');
                
                teacherSelect.empty().append('<option value="">اختر المعلم</option>');
                filterSelect.empty().append('<option value="">جميع المعلمين</option>');
                
                response.teachers.forEach(teacher => {
                    const option = `<option value="${teacher.id}">${teacher.name}</option>`;
                    teacherSelect.append(option);
                    filterSelect.append(option);
                });
            }
        }
    });
}

function loadClassroomsForPlan() {
    $.ajax({
        url: '/api/classrooms',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                const classroomSelect = $('#planClassroomId');
                
                classroomSelect.empty().append('<option value="">اختر الفصل</option>');
                
                response.classrooms.forEach(classroom => {
                    const option = `<option value="${classroom.id}">${classroom.name} - ${classroom.level}</option>`;
                    classroomSelect.append(option);
                });
            }
        }
    });
}

let availableSkills = [];

function loadSkillsForPlan() {
    $.ajax({
        url: '/api/skills',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                availableSkills = response.skills;
            }
        }
    });
}

function showNewPlanModal() {
    $('#newPlanForm')[0].reset();
    $('#planSkillsContainer').empty();
    $('#newPlanModal').modal('show');
}

function addPlanSkill() {
    const skillIndex = $('#planSkillsContainer .plan-skill-row').length;
    const skillRow = `
        <div class="plan-skill-row border rounded p-3 mb-3">
            <div class="row">
                <div class="col-md-4 mb-2">
                    <label class="form-label">المهارة</label>
                    <select class="form-select skill-select" name="skill_id_${skillIndex}">
                        <option value="">اختر المهارة</option>
                        ${availableSkills.map(skill => `<option value="${skill.id}">${skill.skill_number} - ${skill.name}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3 mb-2">
                    <label class="form-label">المستوى الحالي</label>
                    <input type="text" class="form-control" name="current_level_${skillIndex}" placeholder="المستوى الحالي">
                </div>
                <div class="col-md-3 mb-2">
                    <label class="form-label">المستوى المستهدف</label>
                    <input type="text" class="form-control" name="target_level_${skillIndex}" placeholder="المستوى المستهدف">
                </div>
                <div class="col-md-2 mb-2">
                    <label class="form-label">&nbsp;</label>
                    <button type="button" class="btn btn-outline-danger d-block" onclick="removePlanSkill(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    <label class="form-label">ملاحظات</label>
                    <textarea class="form-control" name="skill_notes_${skillIndex}" rows="2" placeholder="ملاحظات حول المهارة"></textarea>
                </div>
            </div>
        </div>
    `;
    
    $('#planSkillsContainer').append(skillRow);
}

function removePlanSkill(button) {
    $(button).closest('.plan-skill-row').remove();
}

function savePlan() {
    const planName = $('#planName').val();
    const studentId = $('#planStudentId').val();
    const teacherId = $('#planTeacherId').val();
    const classroomId = $('#planClassroomId').val();
    const status = $('#planStatus').val();
    const startDate = $('#planStartDate').val();
    const endDate = $('#planEndDate').val();
    const notes = $('#planNotes').val();
    
    if (!planName || !studentId) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    // جمع بيانات المهارات
    const planSkills = [];
    $('#planSkillsContainer .plan-skill-row').each(function(index) {
        const skillId = $(this).find(`[name="skill_id_${index}"]`).val();
        const currentLevel = $(this).find(`[name="current_level_${index}"]`).val();
        const targetLevel = $(this).find(`[name="target_level_${index}"]`).val();
        const skillNotes = $(this).find(`[name="skill_notes_${index}"]`).val();
        
        if (skillId) {
            planSkills.push({
                skill_id: parseInt(skillId),
                current_level: currentLevel,
                target_level: targetLevel,
                notes: skillNotes
            });
        }
    });
    
    const planData = {
        plan_name: planName,
        student_id: parseInt(studentId),
        teacher_id: teacherId ? parseInt(teacherId) : null,
        classroom_id: classroomId ? parseInt(classroomId) : null,
        status: status,
        start_date: startDate,
        end_date: endDate,
        notes: notes,
        plan_skills: planSkills
    };
    
    $.ajax({
        url: '/api/individual-plans',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(planData),
        success: function(response) {
            if (response.success) {
                $('#newPlanModal').modal('hide');
                loadPlansData();
                alert('تم حفظ الخطة الفردية بنجاح');
            } else {
                alert('خطأ: ' + response.error);
            }
        },
        error: function() {
            alert('خطأ في الاتصال بالخادم');
        }
    });
}

function viewPlan(planId) {
    $.ajax({
        url: `/api/individual-plans/${planId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                displayPlanDetails(response.plan);
                $('#viewPlanModal').modal('show');
            }
        },
        error: function() {
            alert('خطأ في تحميل تفاصيل الخطة');
        }
    });
}

function displayPlanDetails(plan) {
    const skillsTable = plan.plan_skills.length > 0 ? `
        <table class="table table-sm">
            <thead>
                <tr>
                    <th>رقم المهارة</th>
                    <th>اسم المهارة</th>
                    <th>المجال</th>
                    <th>المستوى الحالي</th>
                    <th>المستوى المستهدف</th>
                    <th>ملاحظات</th>
                </tr>
            </thead>
            <tbody>
                ${plan.plan_skills.map(skill => `
                    <tr>
                        <td>${skill.skill_number}</td>
                        <td>${skill.skill_name}</td>
                        <td>${skill.skill_domain}</td>
                        <td>${skill.current_level || '-'}</td>
                        <td>${skill.target_level || '-'}</td>
                        <td>${skill.notes || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : '<p class="text-muted">لا توجد مهارات مضافة لهذه الخطة</p>';
    
    const content = `
        <div class="row">
            <div class="col-md-6">
                <h6>معلومات الخطة</h6>
                <p><strong>اسم الخطة:</strong> ${plan.plan_name}</p>
                <p><strong>الطالب:</strong> ${plan.student_name} - ${plan.student_national_id}</p>
                <p><strong>المعلم:</strong> ${plan.teacher_name || 'غير محدد'}</p>
                <p><strong>الفصل:</strong> ${plan.classroom_name || 'غير محدد'}</p>
            </div>
            <div class="col-md-6">
                <h6>التواريخ والحالة</h6>
                <p><strong>تاريخ البداية:</strong> ${plan.start_date ? new Date(plan.start_date).toLocaleDateString('ar-SA') : 'غير محدد'}</p>
                <p><strong>تاريخ النهاية:</strong> ${plan.end_date ? new Date(plan.end_date).toLocaleDateString('ar-SA') : 'غير محدد'}</p>
                <p><strong>الحالة:</strong> <span class="badge ${plan.status === 'نشط' ? 'bg-success' : plan.status === 'مكتمل' ? 'bg-primary' : 'bg-secondary'}">${plan.status}</span></p>
                <p><strong>تاريخ الإنشاء:</strong> ${new Date(plan.created_date).toLocaleDateString('ar-SA')}</p>
                <p><strong>أنشئت بواسطة:</strong> ${plan.created_by}</p>
            </div>
        </div>
        
        ${plan.notes ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>ملاحظات</h6>
                    <p>${plan.notes}</p>
                </div>
            </div>
        ` : ''}
        
        <div class="row mt-3">
            <div class="col-12">
                <h6>مهارات الخطة</h6>
                ${skillsTable}
            </div>
        </div>
    `;
    
    $('#planDetailsBody').html(content);
}

function editPlan(planId) {
    // سيتم تطوير هذه الوظيفة لاحقاً
    alert('وظيفة التعديل قيد التطوير');
}

function deletePlan(planId, planName) {
    if (confirm(`هل أنت متأكد من حذف الخطة "${planName}"؟`)) {
        $.ajax({
            url: `/api/individual-plans/${planId}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            success: function(response) {
                if (response.success) {
                    loadPlansData();
                    alert('تم حذف الخطة بنجاح');
                } else {
                    alert('خطأ: ' + response.error);
                }
            },
            error: function() {
                alert('خطأ في الاتصال بالخادم');
            }
        });
    }
}

function searchPlans() {
    loadPlansData();
}

function filterPlans() {
    loadPlansData();
}

function resetPlanFilters() {
    $('#plansSearch').val('');
    $('#studentPlanFilter').val('');
    $('#teacherPlanFilter').val('');
    $('#statusPlanFilter').val('');
    loadPlansData();
}

// ==================== نظام الخطة الأسبوعية ====================

function loadWeeklyPlansContent() {
    const content = `
        <div class="row mb-4">
            <div class="col-md-8">
                <div class="input-group">
                    <input type="text" class="form-control" id="weeklyPlansSearch" placeholder="البحث باسم الطالب...">
                    <button class="btn btn-outline-secondary" type="button" onclick="searchWeeklyPlans()">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>
            <div class="col-md-4 text-end">
                <button class="btn btn-primary" onclick="showNewWeeklyPlanModal()">
                    <i class="fas fa-plus"></i> خطة أسبوعية جديدة
                </button>
            </div>
        </div>

        <div class="row mb-3">
            <div class="col-md-3">
                <select class="form-select" id="studentWeeklyFilter" onchange="filterWeeklyPlans()">
                    <option value="">جميع الطلاب</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select" id="teacherWeeklyFilter" onchange="filterWeeklyPlans()">
                    <option value="">جميع المعلمين</option>
                </select>
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control" id="weekNumberFilter" placeholder="رقم الأسبوع" onchange="filterWeeklyPlans()">
            </div>
            <div class="col-md-3">
                <button class="btn btn-secondary" onclick="resetWeeklyPlanFilters()">
                    <i class="fas fa-undo"></i> إعادة تعيين
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>الطالب</th>
                                <th>المعلم</th>
                                <th>رقم الأسبوع</th>
                                <th>من تاريخ</th>
                                <th>إلى تاريخ</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="weeklyPlansTableBody">
                            <tr>
                                <td colspan="7" class="text-center">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">جاري التحميل...</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Modal خطة أسبوعية جديدة -->
        <div class="modal fade" id="newWeeklyPlanModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">خطة أسبوعية جديدة</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="newWeeklyPlanForm">
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label for="weeklyPlanStudentId" class="form-label">الطالب *</label>
                                    <select class="form-select" id="weeklyPlanStudentId" required>
                                        <option value="">اختر الطالب</option>
                                    </select>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="weeklyPlanTeacherId" class="form-label">المعلم</label>
                                    <select class="form-select" id="weeklyPlanTeacherId">
                                        <option value="">اختر المعلم</option>
                                    </select>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="weeklyPlanNumber" class="form-label">رقم الأسبوع *</label>
                                    <input type="number" class="form-control" id="weeklyPlanNumber" min="1" required>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label for="weeklyPlanStartDate" class="form-label">تاريخ بداية الأسبوع *</label>
                                    <input type="date" class="form-control" id="weeklyPlanStartDate" required>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="weeklyPlanEndDate" class="form-label">تاريخ نهاية الأسبوع *</label>
                                    <input type="date" class="form-control" id="weeklyPlanEndDate" required>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="weeklyPlanStatus" class="form-label">الحالة</label>
                                    <select class="form-select" id="weeklyPlanStatus">
                                        <option value="نشط">نشط</option>
                                        <option value="مكتمل">مكتمل</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="weeklyPlanNotes" class="form-label">ملاحظات</label>
                                <textarea class="form-control" id="weeklyPlanNotes" rows="3"></textarea>
                            </div>
                            
                            <h6>مهارات الأسبوع</h6>
                            <div class="mb-3">
                                <button type="button" class="btn btn-outline-primary btn-sm" onclick="addWeeklySkill()">
                                    <i class="fas fa-plus"></i> إضافة مهارة
                                </button>
                            </div>
                            <div id="weeklySkillsContainer">
                                <!-- سيتم إضافة المهارات هنا -->
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="saveWeeklyPlan()">حفظ الخطة</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal عرض تفاصيل الخطة الأسبوعية -->
        <div class="modal fade" id="viewWeeklyPlanModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تفاصيل الخطة الأسبوعية</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="weeklyPlanDetailsBody">
                        <!-- سيتم تحميل التفاصيل هنا -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#mainContent').html(content);
    loadWeeklyPlansData();
    loadStudentsForWeeklyPlan();
    loadTeachersForWeeklyPlan();
    loadSkillsForWeeklyPlan();
}

function loadWeeklyPlansData() {
    const search = $('#weeklyPlansSearch').val() || '';
    const studentId = $('#studentWeeklyFilter').val() || '';
    const teacherId = $('#teacherWeeklyFilter').val() || '';
    const weekNumber = $('#weekNumberFilter').val() || '';
    
    const params = new URLSearchParams({
        search: search,
        student_id: studentId,
        teacher_id: teacherId,
        week_number: weekNumber
    });
    
    $.ajax({
        url: `/api/weekly-plans?${params}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                displayWeeklyPlans(response.plans);
            }
        },
        error: function() {
            $('#weeklyPlansTableBody').html('<tr><td colspan="7" class="text-center text-danger">خطأ في تحميل البيانات</td></tr>');
        }
    });
}

function displayWeeklyPlans(plans) {
    const tbody = $('#weeklyPlansTableBody');
    
    if (plans.length === 0) {
        tbody.html('<tr><td colspan="7" class="text-center text-muted">لا توجد خطط أسبوعية</td></tr>');
        return;
    }
    
    const rows = plans.map(plan => `
        <tr>
            <td>${plan.student_name} - ${plan.student_national_id}</td>
            <td>${plan.teacher_name || 'غير محدد'}</td>
            <td>${plan.week_number}</td>
            <td>${new Date(plan.week_start_date).toLocaleDateString('ar-SA')}</td>
            <td>${new Date(plan.week_end_date).toLocaleDateString('ar-SA')}</td>
            <td>
                <span class="badge ${plan.status === 'نشط' ? 'bg-success' : 'bg-primary'}">
                    ${plan.status}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-info me-1" onclick="viewWeeklyPlan(${plan.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editWeeklyPlan(${plan.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteWeeklyPlan(${plan.id}, '${plan.student_name}', ${plan.week_number})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.html(rows);
}

function loadStudentsForWeeklyPlan() {
    $.ajax({
        url: '/api/students',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                const studentSelect = $('#weeklyPlanStudentId');
                const filterSelect = $('#studentWeeklyFilter');
                
                studentSelect.empty().append('<option value="">اختر الطالب</option>');
                filterSelect.empty().append('<option value="">جميع الطلاب</option>');
                
                response.students.forEach(student => {
                    const option = `<option value="${student.id}">${student.name} - ${student.national_id}</option>`;
                    studentSelect.append(option);
                    filterSelect.append(option);
                });
            }
        }
    });
}

function loadTeachersForWeeklyPlan() {
    $.ajax({
        url: '/api/teachers',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                const teacherSelect = $('#weeklyPlanTeacherId');
                const filterSelect = $('#teacherWeeklyFilter');
                
                teacherSelect.empty().append('<option value="">اختر المعلم</option>');
                filterSelect.empty().append('<option value="">جميع المعلمين</option>');
                
                response.teachers.forEach(teacher => {
                    const option = `<option value="${teacher.id}">${teacher.name}</option>`;
                    teacherSelect.append(option);
                    filterSelect.append(option);
                });
            }
        }
    });
}

let availableWeeklySkills = [];

function loadSkillsForWeeklyPlan() {
    $.ajax({
        url: '/api/skills',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                availableWeeklySkills = response.skills;
            }
        }
    });
}

function showNewWeeklyPlanModal() {
    $('#newWeeklyPlanForm')[0].reset();
    $('#weeklySkillsContainer').empty();
    $('#newWeeklyPlanModal').modal('show');
}

function addWeeklySkill() {
    const skillIndex = $('#weeklySkillsContainer .weekly-skill-row').length;
    const skillRow = `
        <div class="weekly-skill-row border rounded p-3 mb-3">
            <div class="row">
                <div class="col-md-4 mb-2">
                    <label class="form-label">المهارة</label>
                    <select class="form-select skill-select" name="weekly_skill_id_${skillIndex}">
                        <option value="">اختر المهارة</option>
                        ${availableWeeklySkills.map(skill => `<option value="${skill.id}">${skill.skill_number} - ${skill.name}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3 mb-2">
                    <label class="form-label">الاستجابة المستهدفة</label>
                    <input type="text" class="form-control" name="target_response_${skillIndex}" placeholder="الاستجابة المستهدفة">
                </div>
                <div class="col-md-3 mb-2">
                    <label class="form-label">الاستجابة الفعلية</label>
                    <input type="text" class="form-control" name="actual_response_${skillIndex}" placeholder="الاستجابة الفعلية">
                </div>
                <div class="col-md-2 mb-2">
                    <label class="form-label">&nbsp;</label>
                    <button type="button" class="btn btn-outline-danger d-block" onclick="removeWeeklySkill(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    <label class="form-label">ملاحظات</label>
                    <textarea class="form-control" name="weekly_skill_notes_${skillIndex}" rows="2" placeholder="ملاحظات حول المهارة"></textarea>
                </div>
            </div>
        </div>
    `;
    
    $('#weeklySkillsContainer').append(skillRow);
}

function removeWeeklySkill(button) {
    $(button).closest('.weekly-skill-row').remove();
}

function saveWeeklyPlan() {
    const studentId = $('#weeklyPlanStudentId').val();
    const teacherId = $('#weeklyPlanTeacherId').val();
    const weekNumber = $('#weeklyPlanNumber').val();
    const startDate = $('#weeklyPlanStartDate').val();
    const endDate = $('#weeklyPlanEndDate').val();
    const status = $('#weeklyPlanStatus').val();
    const notes = $('#weeklyPlanNotes').val();
    
    if (!studentId || !weekNumber || !startDate || !endDate) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    // جمع بيانات المهارات
    const weeklySkills = [];
    $('#weeklySkillsContainer .weekly-skill-row').each(function(index) {
        const skillId = $(this).find(`[name="weekly_skill_id_${index}"]`).val();
        const targetResponse = $(this).find(`[name="target_response_${index}"]`).val();
        const actualResponse = $(this).find(`[name="actual_response_${index}"]`).val();
        const skillNotes = $(this).find(`[name="weekly_skill_notes_${index}"]`).val();
        
        if (skillId) {
            weeklySkills.push({
                skill_id: parseInt(skillId),
                target_response: targetResponse,
                actual_response: actualResponse,
                notes: skillNotes
            });
        }
    });
    
    const planData = {
        student_id: parseInt(studentId),
        teacher_id: teacherId ? parseInt(teacherId) : null,
        week_number: parseInt(weekNumber),
        week_start_date: startDate,
        week_end_date: endDate,
        status: status,
        notes: notes,
        weekly_skills: weeklySkills
    };
    
    $.ajax({
        url: '/api/weekly-plans',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(planData),
        success: function(response) {
            if (response.success) {
                $('#newWeeklyPlanModal').modal('hide');
                loadWeeklyPlansData();
                alert('تم حفظ الخطة الأسبوعية بنجاح');
            } else {
                alert('خطأ: ' + response.error);
            }
        },
        error: function() {
            alert('خطأ في الاتصال بالخادم');
        }
    });
}

function viewWeeklyPlan(planId) {
    $.ajax({
        url: `/api/weekly-plans/${planId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                displayWeeklyPlanDetails(response.plan);
                $('#viewWeeklyPlanModal').modal('show');
            }
        },
        error: function() {
            alert('خطأ في تحميل تفاصيل الخطة');
        }
    });
}

function displayWeeklyPlanDetails(plan) {
    const skillsTable = plan.weekly_skills.length > 0 ? `
        <table class="table table-sm">
            <thead>
                <tr>
                    <th>رقم المهارة</th>
                    <th>اسم المهارة</th>
                    <th>المجال</th>
                    <th>الاستجابة المستهدفة</th>
                    <th>الاستجابة الفعلية</th>
                    <th>ملاحظات</th>
                </tr>
            </thead>
            <tbody>
                ${plan.weekly_skills.map(skill => `
                    <tr>
                        <td>${skill.skill_number}</td>
                        <td>${skill.skill_name}</td>
                        <td>${skill.skill_domain}</td>
                        <td>${skill.target_response || '-'}</td>
                        <td>${skill.actual_response || '-'}</td>
                        <td>${skill.notes || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : '<p class="text-muted">لا توجد مهارات مضافة لهذه الخطة</p>';
    
    const content = `
        <div class="row">
            <div class="col-md-6">
                <h6>معلومات الخطة</h6>
                <p><strong>الطالب:</strong> ${plan.student_name} - ${plan.student_national_id}</p>
                <p><strong>المعلم:</strong> ${plan.teacher_name || 'غير محدد'}</p>
                <p><strong>رقم الأسبوع:</strong> ${plan.week_number}</p>
            </div>
            <div class="col-md-6">
                <h6>التواريخ والحالة</h6>
                <p><strong>من تاريخ:</strong> ${new Date(plan.week_start_date).toLocaleDateString('ar-SA')}</p>
                <p><strong>إلى تاريخ:</strong> ${new Date(plan.week_end_date).toLocaleDateString('ar-SA')}</p>
                <p><strong>الحالة:</strong> <span class="badge ${plan.status === 'نشط' ? 'bg-success' : 'bg-primary'}">${plan.status}</span></p>
                <p><strong>تاريخ الإنشاء:</strong> ${new Date(plan.created_date).toLocaleDateString('ar-SA')}</p>
                <p><strong>أنشئت بواسطة:</strong> ${plan.created_by}</p>
            </div>
        </div>
        
        ${plan.notes ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>ملاحظات</h6>
                    <p>${plan.notes}</p>
                </div>
            </div>
        ` : ''}
        
        <div class="row mt-3">
            <div class="col-12">
                <h6>مهارات الأسبوع</h6>
                ${skillsTable}
            </div>
        </div>
    `;
    
    $('#weeklyPlanDetailsBody').html(content);
}

function editWeeklyPlan(planId) {
    alert('وظيفة التعديل قيد التطوير');
}

function deleteWeeklyPlan(planId, studentName, weekNumber) {
    if (confirm(`هل أنت متأكد من حذف الخطة الأسبوعية للطالب "${studentName}" - الأسبوع ${weekNumber}؟`)) {
        $.ajax({
            url: `/api/weekly-plans/${planId}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            success: function(response) {
                if (response.success) {
                    loadWeeklyPlansData();
                    alert('تم حذف الخطة الأسبوعية بنجاح');
                } else {
                    alert('خطأ: ' + response.error);
                }
            },
            error: function() {
                alert('خطأ في الاتصال بالخادم');
            }
        });
    }
}

function searchWeeklyPlans() {
    loadWeeklyPlansData();
}

function filterWeeklyPlans() {
    loadWeeklyPlansData();
}

function resetWeeklyPlanFilters() {
    $('#weeklyPlansSearch').val('');
    $('#studentWeeklyFilter').val('');
    $('#teacherWeeklyFilter').val('');
    $('#weekNumberFilter').val('');
    loadWeeklyPlansData();
}

// ==================== نظام المتابعة اليومية ====================

function loadDailyFollowupContent() {
    const content = `
        <div class="row mb-4">
            <div class="col-md-8">
                <div class="input-group">
                    <input type="text" class="form-control" id="dailyFollowupSearch" placeholder="البحث باسم الطالب...">
                    <button class="btn btn-outline-secondary" type="button" onclick="searchDailyFollowup()">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>
            <div class="col-md-4 text-end">
                <button class="btn btn-primary" onclick="showNewDailyFollowupModal()">
                    <i class="fas fa-plus"></i> استمارة متابعة جديدة
                </button>
            </div>
        </div>

        <div class="row mb-3">
            <div class="col-md-3">
                <select class="form-select" id="studentDailyFilter" onchange="filterDailyFollowup()">
                    <option value="">جميع الطلاب</option>
                </select>
            </div>
            <div class="col-md-3">
                <input type="date" class="form-control" id="followupDateFilter" onchange="filterDailyFollowup()">
            </div>
            <div class="col-md-3">
                <select class="form-select" id="behaviorFilter" onchange="filterDailyFollowup()">
                    <option value="">جميع السلوكيات</option>
                    <option value="ممتاز">ممتاز</option>
                    <option value="جيد جداً">جيد جداً</option>
                    <option value="جيد">جيد</option>
                    <option value="مقبول">مقبول</option>
                    <option value="يحتاج تحسين">يحتاج تحسين</option>
                </select>
            </div>
            <div class="col-md-3">
                <button class="btn btn-secondary" onclick="resetDailyFollowupFilters()">
                    <i class="fas fa-undo"></i> إعادة تعيين
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>الطالب</th>
                                <th>التاريخ</th>
                                <th>الحضور</th>
                                <th>السلوك العام</th>
                                <th>التفاعل</th>
                                <th>الأنشطة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="dailyFollowupTableBody">
                            <tr>
                                <td colspan="7" class="text-center">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">جاري التحميل...</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Modal استمارة متابعة جديدة -->
        <div class="modal fade" id="newDailyFollowupModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">استمارة متابعة يومية جديدة</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="newDailyFollowupForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="followupStudentId" class="form-label">الطالب *</label>
                                    <select class="form-select" id="followupStudentId" required>
                                        <option value="">اختر الطالب</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="followupDate" class="form-label">تاريخ المتابعة *</label>
                                    <input type="date" class="form-control" id="followupDate" required>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label for="attendanceStatus" class="form-label">حالة الحضور *</label>
                                    <select class="form-select" id="attendanceStatus" required>
                                        <option value="">اختر الحالة</option>
                                        <option value="حاضر">حاضر</option>
                                        <option value="غائب">غائب</option>
                                        <option value="متأخر">متأخر</option>
                                        <option value="انصراف مبكر">انصراف مبكر</option>
                                    </select>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="generalBehavior" class="form-label">السلوك العام</label>
                                    <select class="form-select" id="generalBehavior">
                                        <option value="">اختر التقييم</option>
                                        <option value="ممتاز">ممتاز</option>
                                        <option value="جيد جداً">جيد جداً</option>
                                        <option value="جيد">جيد</option>
                                        <option value="مقبول">مقبول</option>
                                        <option value="يحتاج تحسين">يحتاج تحسين</option>
                                    </select>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="interactionLevel" class="form-label">مستوى التفاعل</label>
                                    <select class="form-select" id="interactionLevel">
                                        <option value="">اختر المستوى</option>
                                        <option value="عالي">عالي</option>
                                        <option value="متوسط">متوسط</option>
                                        <option value="منخفض">منخفض</option>
                                    </select>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="activitiesParticipation" class="form-label">المشاركة في الأنشطة</label>
                                    <select class="form-select" id="activitiesParticipation">
                                        <option value="">اختر المستوى</option>
                                        <option value="مشارك بفعالية">مشارك بفعالية</option>
                                        <option value="مشارك جزئياً">مشارك جزئياً</option>
                                        <option value="غير مشارك">غير مشارك</option>
                                        <option value="يحتاج تشجيع">يحتاج تشجيع</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="moodStatus" class="form-label">الحالة المزاجية</label>
                                    <select class="form-select" id="moodStatus">
                                        <option value="">اختر الحالة</option>
                                        <option value="سعيد">سعيد</option>
                                        <option value="هادئ">هادئ</option>
                                        <option value="متعب">متعب</option>
                                        <option value="منزعج">منزعج</option>
                                        <option value="متحمس">متحمس</option>
                                    </select>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="dailyAchievements" class="form-label">الإنجازات اليومية</label>
                                <textarea class="form-control" id="dailyAchievements" rows="3" placeholder="اذكر الإنجازات والتطورات الإيجابية..."></textarea>
                            </div>

                            <div class="mb-3">
                                <label for="challengesFaced" class="form-label">التحديات المواجهة</label>
                                <textarea class="form-control" id="challengesFaced" rows="3" placeholder="اذكر أي تحديات أو صعوبات واجهها الطالب..."></textarea>
                            </div>

                            <div class="mb-3">
                                <label for="recommendedActions" class="form-label">الإجراءات المقترحة</label>
                                <textarea class="form-control" id="recommendedActions" rows="3" placeholder="اقترح إجراءات للتحسين أو المتابعة..."></textarea>
                            </div>

                            <div class="mb-3">
                                <label for="parentCommunication" class="form-label">التواصل مع الأهل</label>
                                <select class="form-select" id="parentCommunication">
                                    <option value="">لا يوجد</option>
                                    <option value="مكالمة هاتفية">مكالمة هاتفية</option>
                                    <option value="رسالة نصية">رسالة نصية</option>
                                    <option value="لقاء شخصي">لقاء شخصي</option>
                                    <option value="تقرير مكتوب">تقرير مكتوب</option>
                                </select>
                            </div>

                            <div class="mb-3">
                                <label for="additionalNotes" class="form-label">ملاحظات إضافية</label>
                                <textarea class="form-control" id="additionalNotes" rows="3" placeholder="أي ملاحظات أخرى..."></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="saveDailyFollowup()">حفظ الاستمارة</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal عرض تفاصيل المتابعة اليومية -->
        <div class="modal fade" id="viewDailyFollowupModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تفاصيل المتابعة اليومية</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="dailyFollowupDetailsBody">
                        <!-- سيتم تحميل التفاصيل هنا -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#mainContent').html(content);
    // تعيين التاريخ الحالي كافتراضي
    $('#followupDate').val(new Date().toISOString().split('T')[0]);
    loadDailyFollowupData();
    loadStudentsForDailyFollowup();
}

function loadDailyFollowupData() {
    const search = $('#dailyFollowupSearch').val() || '';
    const studentId = $('#studentDailyFilter').val() || '';
    const followupDate = $('#followupDateFilter').val() || '';
    const behavior = $('#behaviorFilter').val() || '';
    
    const params = new URLSearchParams({
        search: search,
        student_id: studentId,
        followup_date: followupDate,
        behavior: behavior
    });
    
    $.ajax({
        url: `/api/daily-followup?${params}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                displayDailyFollowup(response.followups);
            }
        },
        error: function() {
            $('#dailyFollowupTableBody').html('<tr><td colspan="7" class="text-center text-danger">خطأ في تحميل البيانات</td></tr>');
        }
    });
}

function displayDailyFollowup(followups) {
    const tbody = $('#dailyFollowupTableBody');
    
    if (followups.length === 0) {
        tbody.html('<tr><td colspan="7" class="text-center text-muted">لا توجد استمارات متابعة</td></tr>');
        return;
    }
    
    const rows = followups.map(followup => `
        <tr>
            <td>${followup.student_name} - ${followup.student_national_id}</td>
            <td>${new Date(followup.followup_date).toLocaleDateString('ar-SA')}</td>
            <td>
                <span class="badge ${getAttendanceBadgeClass(followup.attendance_status)}">
                    ${followup.attendance_status}
                </span>
            </td>
            <td>
                <span class="badge ${getBehaviorBadgeClass(followup.general_behavior)}">
                    ${followup.general_behavior || '-'}
                </span>
            </td>
            <td>${followup.interaction_level || '-'}</td>
            <td>${followup.activities_participation || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-info me-1" onclick="viewDailyFollowup(${followup.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editDailyFollowup(${followup.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteDailyFollowup(${followup.id}, '${followup.student_name}', '${followup.followup_date}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.html(rows);
}

function getAttendanceBadgeClass(status) {
    const classes = {
        'حاضر': 'bg-success',
        'غائب': 'bg-danger',
        'متأخر': 'bg-warning',
        'انصراف مبكر': 'bg-info'
    };
    return classes[status] || 'bg-secondary';
}

function getBehaviorBadgeClass(behavior) {
    const classes = {
        'ممتاز': 'bg-success',
        'جيد جداً': 'bg-primary',
        'جيد': 'bg-info',
        'مقبول': 'bg-warning',
        'يحتاج تحسين': 'bg-danger'
    };
    return classes[behavior] || 'bg-secondary';
}

function loadStudentsForDailyFollowup() {
    $.ajax({
        url: '/api/students',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                const studentSelect = $('#followupStudentId');
                const filterSelect = $('#studentDailyFilter');
                
                studentSelect.empty().append('<option value="">اختر الطالب</option>');
                filterSelect.empty().append('<option value="">جميع الطلاب</option>');
                
                response.students.forEach(student => {
                    const option = `<option value="${student.id}">${student.name} - ${student.national_id}</option>`;
                    studentSelect.append(option);
                    filterSelect.append(option);
                });
            }
        }
    });
}

function showNewDailyFollowupModal() {
    $('#newDailyFollowupForm')[0].reset();
    $('#followupDate').val(new Date().toISOString().split('T')[0]);
    $('#newDailyFollowupModal').modal('show');
}

function saveDailyFollowup() {
    const studentId = $('#followupStudentId').val();
    const followupDate = $('#followupDate').val();
    const attendanceStatus = $('#attendanceStatus').val();
    const generalBehavior = $('#generalBehavior').val();
    const interactionLevel = $('#interactionLevel').val();
    const activitiesParticipation = $('#activitiesParticipation').val();
    const moodStatus = $('#moodStatus').val();
    const dailyAchievements = $('#dailyAchievements').val();
    const challengesFaced = $('#challengesFaced').val();
    const recommendedActions = $('#recommendedActions').val();
    const parentCommunication = $('#parentCommunication').val();
    const additionalNotes = $('#additionalNotes').val();
    
    if (!studentId || !followupDate || !attendanceStatus) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    const followupData = {
        student_id: parseInt(studentId),
        followup_date: followupDate,
        attendance_status: attendanceStatus,
        general_behavior: generalBehavior,
        interaction_level: interactionLevel,
        activities_participation: activitiesParticipation,
        mood_status: moodStatus,
        daily_achievements: dailyAchievements,
        challenges_faced: challengesFaced,
        recommended_actions: recommendedActions,
        parent_communication: parentCommunication,
        additional_notes: additionalNotes
    };
    
    $.ajax({
        url: '/api/daily-followup',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(followupData),
        success: function(response) {
            if (response.success) {
                $('#newDailyFollowupModal').modal('hide');
                loadDailyFollowupData();
                alert('تم حفظ استمارة المتابعة بنجاح');
            } else {
                alert('خطأ: ' + response.error);
            }
        },
        error: function() {
            alert('خطأ في الاتصال بالخادم');
        }
    });
}

function viewDailyFollowup(followupId) {
    $.ajax({
        url: `/api/daily-followup/${followupId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                displayDailyFollowupDetails(response.followup);
                $('#viewDailyFollowupModal').modal('show');
            }
        },
        error: function() {
            alert('خطأ في تحميل تفاصيل المتابعة');
        }
    });
}

function displayDailyFollowupDetails(followup) {
    const content = `
        <div class="row">
            <div class="col-md-6">
                <h6>معلومات أساسية</h6>
                <p><strong>الطالب:</strong> ${followup.student_name} - ${followup.student_national_id}</p>
                <p><strong>تاريخ المتابعة:</strong> ${new Date(followup.followup_date).toLocaleDateString('ar-SA')}</p>
                <p><strong>حالة الحضور:</strong> <span class="badge ${getAttendanceBadgeClass(followup.attendance_status)}">${followup.attendance_status}</span></p>
            </div>
            <div class="col-md-6">
                <h6>التقييمات</h6>
                <p><strong>السلوك العام:</strong> <span class="badge ${getBehaviorBadgeClass(followup.general_behavior)}">${followup.general_behavior || '-'}</span></p>
                <p><strong>مستوى التفاعل:</strong> ${followup.interaction_level || '-'}</p>
                <p><strong>المشاركة في الأنشطة:</strong> ${followup.activities_participation || '-'}</p>
                <p><strong>الحالة المزاجية:</strong> ${followup.mood_status || '-'}</p>
            </div>
        </div>
        
        ${followup.daily_achievements ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>الإنجازات اليومية</h6>
                    <p>${followup.daily_achievements}</p>
                </div>
            </div>
        ` : ''}
        
        ${followup.challenges_faced ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>التحديات المواجهة</h6>
                    <p>${followup.challenges_faced}</p>
                </div>
            </div>
        ` : ''}
        
        ${followup.recommended_actions ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>الإجراءات المقترحة</h6>
                    <p>${followup.recommended_actions}</p>
                </div>
            </div>
        ` : ''}
        
        <div class="row mt-3">
            <div class="col-md-6">
                <h6>التواصل والملاحظات</h6>
                <p><strong>التواصل مع الأهل:</strong> ${followup.parent_communication || 'لا يوجد'}</p>
            </div>
            <div class="col-md-6">
                <p><strong>تاريخ الإنشاء:</strong> ${new Date(followup.created_date).toLocaleDateString('ar-SA')}</p>
                <p><strong>أنشئت بواسطة:</strong> ${followup.created_by}</p>
            </div>
        </div>
        
        ${followup.additional_notes ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>ملاحظات إضافية</h6>
                    <p>${followup.additional_notes}</p>
                </div>
            </div>
        ` : ''}
    `;
    
    $('#dailyFollowupDetailsBody').html(content);
}

function editDailyFollowup(followupId) {
    alert('وظيفة التعديل قيد التطوير');
}

function deleteDailyFollowup(followupId, studentName, followupDate) {
    if (confirm(`هل أنت متأكد من حذف استمارة المتابعة للطالب "${studentName}" بتاريخ ${new Date(followupDate).toLocaleDateString('ar-SA')}؟`)) {
        $.ajax({
            url: `/api/daily-followup/${followupId}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            success: function(response) {
                if (response.success) {
                    loadDailyFollowupData();
                    alert('تم حذف استمارة المتابعة بنجاح');
                } else {
                    alert('خطأ: ' + response.error);
                }
            },
            error: function() {
                alert('خطأ في الاتصال بالخادم');
            }
        });
    }
}

function searchDailyFollowup() {
    loadDailyFollowupData();
}

function filterDailyFollowup() {
    loadDailyFollowupData();
}

function resetDailyFollowupFilters() {
    $('#dailyFollowupSearch').val('');
    $('#studentDailyFilter').val('');
    $('#followupDateFilter').val('');
    $('#behaviorFilter').val('');
    loadDailyFollowupData();
}

// ==================== نظام التقييم النهائي ====================

function loadFinalEvaluationContent() {
    const content = `
        <div class="row mb-4">
            <div class="col-md-8">
                <div class="input-group">
                    <input type="text" class="form-control" id="finalEvaluationSearch" placeholder="البحث باسم الطالب...">
                    <button class="btn btn-outline-secondary" type="button" onclick="searchFinalEvaluations()">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>
            <div class="col-md-4 text-end">
                <button class="btn btn-primary" onclick="showNewFinalEvaluationModal()">
                    <i class="fas fa-plus"></i> تقييم نهائي جديد
                </button>
            </div>
        </div>

        <div class="row mb-3">
            <div class="col-md-3">
                <select class="form-select" id="studentFinalFilter" onchange="filterFinalEvaluations()">
                    <option value="">جميع الطلاب</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select" id="academicYearFinalFilter" onchange="filterFinalEvaluations()">
                    <option value="">جميع السنوات الدراسية</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select" id="statusFinalFilter" onchange="filterFinalEvaluations()">
                    <option value="">جميع الحالات</option>
                    <option value="مسودة">مسودة</option>
                    <option value="مكتمل">مكتمل</option>
                    <option value="مرسل">مرسل</option>
                </select>
            </div>
            <div class="col-md-3">
                <button class="btn btn-secondary" onclick="resetFinalEvaluationFilters()">
                    <i class="fas fa-undo"></i> إعادة تعيين
                </button>
            </div>
        </div>

        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>الطالب</th>
                                <th>السنة الدراسية</th>
                                <th>تاريخ التقييم</th>
                                <th>المقيم</th>
                                <th>الحالة</th>
                                <th>عدد المهارات</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="finalEvaluationTableBody">
                            <tr>
                                <td colspan="7" class="text-center">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">جاري التحميل...</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Modal تقييم نهائي جديد -->
        <div class="modal fade" id="newFinalEvaluationModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تقييم نهائي جديد</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="newFinalEvaluationForm">
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label for="finalEvaluationStudentId" class="form-label">الطالب *</label>
                                    <select class="form-select" id="finalEvaluationStudentId" required>
                                        <option value="">اختر الطالب</option>
                                    </select>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="finalEvaluationAcademicYearId" class="form-label">السنة الدراسية *</label>
                                    <select class="form-select" id="finalEvaluationAcademicYearId" required>
                                        <option value="">اختر السنة الدراسية</option>
                                    </select>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="finalEvaluationDate" class="form-label">تاريخ التقييم *</label>
                                    <input type="date" class="form-control" id="finalEvaluationDate" required>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="evaluatorName" class="form-label">اسم المقيم *</label>
                                    <input type="text" class="form-control" id="evaluatorName" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="finalEvaluationStatus" class="form-label">حالة التقييم</label>
                                    <select class="form-select" id="finalEvaluationStatus">
                                        <option value="مسودة">مسودة</option>
                                        <option value="مكتمل">مكتمل</option>
                                        <option value="مرسل">مرسل</option>
                                    </select>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="generalNotes" class="form-label">ملاحظات عامة</label>
                                <textarea class="form-control" id="generalNotes" rows="3" placeholder="ملاحظات عامة حول التقييم..."></textarea>
                            </div>

                            <div class="mb-3">
                                <label for="recommendations" class="form-label">التوصيات</label>
                                <textarea class="form-control" id="recommendations" rows="3" placeholder="التوصيات للفترة القادمة..."></textarea>
                            </div>
                            
                            <h6>تقييم المهارات</h6>
                            <div class="mb-3">
                                <button type="button" class="btn btn-outline-primary btn-sm" onclick="addFinalEvaluationSkill()">
                                    <i class="fas fa-plus"></i> إضافة مهارة
                                </button>
                            </div>
                            <div id="finalEvaluationSkillsContainer">
                                <!-- سيتم إضافة المهارات هنا -->
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="saveFinalEvaluation()">حفظ التقييم</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal عرض تفاصيل التقييم النهائي -->
        <div class="modal fade" id="viewFinalEvaluationModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تفاصيل التقييم النهائي</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="finalEvaluationDetailsBody">
                        <!-- سيتم تحميل التفاصيل هنا -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        <button type="button" class="btn btn-info" onclick="printFinalEvaluation()">
                            <i class="fas fa-print"></i> طباعة
                        </button>
                        <button type="button" class="btn btn-success" onclick="emailFinalEvaluation()">
                            <i class="fas fa-envelope"></i> إرسال بالإيميل
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#mainContent').html(content);
    // تعيين التاريخ الحالي كافتراضي
    $('#finalEvaluationDate').val(new Date().toISOString().split('T')[0]);
    loadFinalEvaluationData();
    loadStudentsForFinalEvaluation();
    loadAcademicYearsForFinalEvaluation();
    loadSkillsForFinalEvaluation();
}

function loadFinalEvaluationData() {
    const search = $('#finalEvaluationSearch').val() || '';
    const studentId = $('#studentFinalFilter').val() || '';
    const academicYearId = $('#academicYearFinalFilter').val() || '';
    const status = $('#statusFinalFilter').val() || '';
    
    const params = new URLSearchParams({
        search: search,
        student_id: studentId,
        academic_year_id: academicYearId,
        status: status
    });
    
    $.ajax({
        url: `/api/final-evaluations?${params}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                displayFinalEvaluations(response.evaluations);
            }
        },
        error: function() {
            $('#finalEvaluationTableBody').html('<tr><td colspan="7" class="text-center text-danger">خطأ في تحميل البيانات</td></tr>');
        }
    });
}

function displayFinalEvaluations(evaluations) {
    const tbody = $('#finalEvaluationTableBody');
    
    if (evaluations.length === 0) {
        tbody.html('<tr><td colspan="7" class="text-center text-muted">لا توجد تقييمات نهائية</td></tr>');
        return;
    }
    
    const rows = evaluations.map(evaluation => `
        <tr>
            <td>${evaluation.student_name} - ${evaluation.student_national_id}</td>
            <td>${evaluation.academic_year_name}</td>
            <td>${new Date(evaluation.evaluation_date).toLocaleDateString('ar-SA')}</td>
            <td>${evaluation.evaluator_name}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(evaluation.status)}">
                    ${evaluation.status}
                </span>
            </td>
            <td>${evaluation.skills_count || 0}</td>
            <td>
                <button class="btn btn-sm btn-outline-info me-1" onclick="viewFinalEvaluation(${evaluation.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editFinalEvaluation(${evaluation.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="showEmailModal('final_evaluation', ${evaluation.id}, '${evaluation.student_name}')" title="إرسال بالإيميل">
                    <i class="fas fa-envelope"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteFinalEvaluation(${evaluation.id}, '${evaluation.student_name}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.html(rows);
}

function getStatusBadgeClass(status) {
    const classes = {
        'مسودة': 'bg-warning',
        'مكتمل': 'bg-success',
        'مرسل': 'bg-primary'
    };
    return classes[status] || 'bg-secondary';
}

function loadStudentsForFinalEvaluation() {
    $.ajax({
        url: '/api/students',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                const studentSelect = $('#finalEvaluationStudentId');
                const filterSelect = $('#studentFinalFilter');
                
                studentSelect.empty().append('<option value="">اختر الطالب</option>');
                filterSelect.empty().append('<option value="">جميع الطلاب</option>');
                
                response.students.forEach(student => {
                    const option = `<option value="${student.id}">${student.name} - ${student.national_id}</option>`;
                    studentSelect.append(option);
                    filterSelect.append(option);
                });
            }
        }
    });
}

function loadAcademicYearsForFinalEvaluation() {
    $.ajax({
        url: '/api/academic-years',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                const yearSelect = $('#finalEvaluationAcademicYearId');
                const filterSelect = $('#academicYearFinalFilter');
                
                yearSelect.empty().append('<option value="">اختر السنة الدراسية</option>');
                filterSelect.empty().append('<option value="">جميع السنوات الدراسية</option>');
                
                response.academic_years.forEach(year => {
                    const option = `<option value="${year.id}">${year.name}</option>`;
                    yearSelect.append(option);
                    filterSelect.append(option);
                });
            }
        }
    });
}

let availableFinalEvaluationSkills = [];

function loadSkillsForFinalEvaluation() {
    $.ajax({
        url: '/api/skills',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                availableFinalEvaluationSkills = response.skills;
            }
        }
    });
}

function showNewFinalEvaluationModal() {
    $('#newFinalEvaluationForm')[0].reset();
    $('#finalEvaluationSkillsContainer').empty();
    $('#finalEvaluationDate').val(new Date().toISOString().split('T')[0]);
    $('#newFinalEvaluationModal').modal('show');
}

function addFinalEvaluationSkill() {
    const skillIndex = $('#finalEvaluationSkillsContainer .final-evaluation-skill-row').length;
    const skillRow = `
        <div class="final-evaluation-skill-row border rounded p-3 mb-3">
            <div class="row">
                <div class="col-md-4 mb-2">
                    <label class="form-label">المهارة</label>
                    <select class="form-select skill-select" name="final_skill_id_${skillIndex}">
                        <option value="">اختر المهارة</option>
                        ${availableFinalEvaluationSkills.map(skill => `<option value="${skill.id}">${skill.skill_number} - ${skill.name}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3 mb-2">
                    <label class="form-label">المستوى الحالي</label>
                    <select class="form-select" name="current_level_${skillIndex}">
                        <option value="">اختر المستوى</option>
                        <option value="ممتاز">ممتاز</option>
                        <option value="جيد جداً">جيد جداً</option>
                        <option value="جيد">جيد</option>
                        <option value="مقبول">مقبول</option>
                        <option value="ضعيف">ضعيف</option>
                        <option value="غير مكتسب">غير مكتسب</option>
                    </select>
                </div>
                <div class="col-md-3 mb-2">
                    <label class="form-label">التقدم المحرز</label>
                    <select class="form-select" name="progress_${skillIndex}">
                        <option value="">اختر التقدم</option>
                        <option value="تحسن ممتاز">تحسن ممتاز</option>
                        <option value="تحسن جيد">تحسن جيد</option>
                        <option value="تحسن طفيف">تحسن طفيف</option>
                        <option value="ثابت">ثابت</option>
                        <option value="يحتاج تطوير">يحتاج تطوير</option>
                    </select>
                </div>
                <div class="col-md-2 mb-2">
                    <label class="form-label">&nbsp;</label>
                    <button type="button" class="btn btn-outline-danger d-block" onclick="removeFinalEvaluationSkill(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    <label class="form-label">ملاحظات</label>
                    <textarea class="form-control" name="final_skill_notes_${skillIndex}" rows="2" placeholder="ملاحظات حول المهارة والتقدم المحرز"></textarea>
                </div>
            </div>
        </div>
    `;
    
    $('#finalEvaluationSkillsContainer').append(skillRow);
}

function removeFinalEvaluationSkill(button) {
    $(button).closest('.final-evaluation-skill-row').remove();
}

function saveFinalEvaluation() {
    const studentId = $('#finalEvaluationStudentId').val();
    const academicYearId = $('#finalEvaluationAcademicYearId').val();
    const evaluationDate = $('#finalEvaluationDate').val();
    const evaluatorName = $('#evaluatorName').val();
    const status = $('#finalEvaluationStatus').val();
    const generalNotes = $('#generalNotes').val();
    const recommendations = $('#recommendations').val();
    
    if (!studentId || !academicYearId || !evaluationDate || !evaluatorName) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    // جمع بيانات المهارات
    const evaluationSkills = [];
    $('#finalEvaluationSkillsContainer .final-evaluation-skill-row').each(function(index) {
        const skillId = $(this).find(`[name="final_skill_id_${index}"]`).val();
        const currentLevel = $(this).find(`[name="current_level_${index}"]`).val();
        const progress = $(this).find(`[name="progress_${index}"]`).val();
        const skillNotes = $(this).find(`[name="final_skill_notes_${index}"]`).val();
        
        if (skillId) {
            evaluationSkills.push({
                skill_id: parseInt(skillId),
                current_level: currentLevel,
                progress: progress,
                notes: skillNotes
            });
        }
    });
    
    const evaluationData = {
        student_id: parseInt(studentId),
        academic_year_id: parseInt(academicYearId),
        evaluation_date: evaluationDate,
        evaluator_name: evaluatorName,
        status: status,
        general_notes: generalNotes,
        recommendations: recommendations,
        evaluation_skills: evaluationSkills
    };
    
    $.ajax({
        url: '/api/final-evaluations',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(evaluationData),
        success: function(response) {
            if (response.success) {
                $('#newFinalEvaluationModal').modal('hide');
                loadFinalEvaluationData();
                alert('تم حفظ التقييم النهائي بنجاح');
            } else {
                alert('خطأ: ' + response.error);
            }
        },
        error: function() {
            alert('خطأ في الاتصال بالخادم');
        }
    });
}

function viewFinalEvaluation(evaluationId) {
    $.ajax({
        url: `/api/final-evaluations/${evaluationId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        success: function(response) {
            if (response.success) {
                displayFinalEvaluationDetails(response.evaluation);
                $('#viewFinalEvaluationModal').modal('show');
            }
        },
        error: function() {
            alert('خطأ في تحميل تفاصيل التقييم');
        }
    });
}

function displayFinalEvaluationDetails(evaluation) {
    const skillsTable = evaluation.evaluation_skills.length > 0 ? `
        <table class="table table-sm">
            <thead>
                <tr>
                    <th>رقم المهارة</th>
                    <th>اسم المهارة</th>
                    <th>المجال</th>
                    <th>المستوى الحالي</th>
                    <th>التقدم المحرز</th>
                    <th>ملاحظات</th>
                </tr>
            </thead>
            <tbody>
                ${evaluation.evaluation_skills.map(skill => `
                    <tr>
                        <td>${skill.skill_number}</td>
                        <td>${skill.skill_name}</td>
                        <td>${skill.skill_domain}</td>
                        <td><span class="badge ${getLevelBadgeClass(skill.current_level)}">${skill.current_level || '-'}</span></td>
                        <td><span class="badge ${getProgressBadgeClass(skill.progress)}">${skill.progress || '-'}</span></td>
                        <td>${skill.notes || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : '<p class="text-muted">لا توجد مهارات مضافة لهذا التقييم</p>';
    
    const content = `
        <div class="row">
            <div class="col-md-6">
                <h6>معلومات التقييم</h6>
                <p><strong>الطالب:</strong> ${evaluation.student_name} - ${evaluation.student_national_id}</p>
                <p><strong>السنة الدراسية:</strong> ${evaluation.academic_year_name}</p>
                <p><strong>تاريخ التقييم:</strong> ${new Date(evaluation.evaluation_date).toLocaleDateString('ar-SA')}</p>
                <p><strong>المقيم:</strong> ${evaluation.evaluator_name}</p>
            </div>
            <div class="col-md-6">
                <h6>حالة التقييم</h6>
                <p><strong>الحالة:</strong> <span class="badge ${getStatusBadgeClass(evaluation.status)}">${evaluation.status}</span></p>
                <p><strong>تاريخ الإنشاء:</strong> ${new Date(evaluation.created_date).toLocaleDateString('ar-SA')}</p>
                <p><strong>أنشئ بواسطة:</strong> ${evaluation.created_by}</p>
                <p><strong>عدد المهارات:</strong> ${evaluation.evaluation_skills.length}</p>
            </div>
        </div>
        
        ${evaluation.general_notes ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>ملاحظات عامة</h6>
                    <p>${evaluation.general_notes}</p>
                </div>
            </div>
        ` : ''}
        
        ${evaluation.recommendations ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>التوصيات</h6>
                    <p>${evaluation.recommendations}</p>
                </div>
            </div>
        ` : ''}
        
        <div class="row mt-3">
            <div class="col-12">
                <h6>تقييم المهارات</h6>
                ${skillsTable}
            </div>
        </div>
    `;
    
    $('#finalEvaluationDetailsBody').html(content);
}

function getLevelBadgeClass(level) {
    const classes = {
        'ممتاز': 'bg-success',
        'جيد جداً': 'bg-primary',
        'جيد': 'bg-info',
        'مقبول': 'bg-warning',
        'ضعيف': 'bg-danger',
        'غير مكتسب': 'bg-secondary'
    };
    return classes[level] || 'bg-secondary';
}

function getProgressBadgeClass(progress) {
    const classes = {
        'تحسن ممتاز': 'bg-success',
        'تحسن جيد': 'bg-primary',
        'تحسن طفيف': 'bg-info',
        'ثابت': 'bg-warning',
        'يحتاج تطوير': 'bg-danger'
    };
    return classes[progress] || 'bg-secondary';
}

function editFinalEvaluation(evaluationId) {
    alert('وظيفة التعديل قيد التطوير');
}

function deleteFinalEvaluation(evaluationId, studentName) {
    if (confirm(`هل أنت متأكد من حذف التقييم النهائي للطالب "${studentName}"؟`)) {
        $.ajax({
            url: `/api/final-evaluations/${evaluationId}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            success: function(response) {
                if (response.success) {
                    loadFinalEvaluationData();
                    alert('تم حذف التقييم النهائي بنجاح');
                } else {
                    alert('خطأ: ' + response.error);
                }
            },
            error: function() {
                alert('خطأ في الاتصال بالخادم');
            }
        });
    }
}

function printFinalEvaluation() {
    window.print();
}

function emailFinalEvaluation() {
    alert('وظيفة إرسال الإيميل قيد التطوير');
}

function searchFinalEvaluations() {
    loadFinalEvaluationData();
}

function filterFinalEvaluations() {
    loadFinalEvaluationData();
}

function resetFinalEvaluationFilters() {
    $('#finalEvaluationSearch').val('');
    $('#studentFinalFilter').val('');
    $('#academicYearFinalFilter').val('');
    $('#statusFinalFilter').val('');
    loadFinalEvaluationData();
}

// ==================== Image Management Functions ====================

function showImageUploadModal(entityType, entityId, entityName) {
    const modal = new bootstrap.Modal(document.getElementById('imageUploadModal'));
    
    // Set modal data
    document.getElementById('imageUploadModal').setAttribute('data-entity-type', entityType);
    document.getElementById('imageUploadModal').setAttribute('data-entity-id', entityId);
    document.getElementById('imageUploadModalLabel').textContent = `رفع صورة - ${entityName}`;
    
    // Reset form
    document.getElementById('imageUploadForm').reset();
    document.getElementById('imagePreview').style.display = 'none';
    
    modal.show();
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showAlert('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت', 'danger');
            input.value = '';
            return;
        }
        
        // Check file type
        const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showAlert('نوع الملف غير مدعوم. الأنواع المدعومة: PNG, JPG, JPEG, GIF, WEBP', 'danger');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function uploadImage() {
    const modal = document.getElementById('imageUploadModal');
    const entityType = modal.getAttribute('data-entity-type');
    const entityId = modal.getAttribute('data-entity-id');
    const fileInput = document.getElementById('imageFile');
    
    if (!fileInput.files || !fileInput.files[0]) {
        showAlert('يرجى اختيار ملف', 'warning');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('entity_type', entityType);
    formData.append('entity_id', entityId);
    
    // Show loading
    const uploadBtn = document.getElementById('uploadImageBtn');
    const originalText = uploadBtn.textContent;
    uploadBtn.textContent = 'جاري الرفع...';
    uploadBtn.disabled = true;
    
    fetch('/api/upload-image', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(modal).hide();
            
            // Refresh the current section to show updated image
            if (entityType === 'student') {
                loadStudents();
            } else if (entityType === 'teacher') {
                loadTeachers();
            }
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء رفع الصورة', 'danger');
    })
    .finally(() => {
        uploadBtn.textContent = originalText;
        uploadBtn.disabled = false;
    });
}

function deleteImage(entityType, entityId, entityName) {
    if (!confirm(`هل أنت متأكد من حذف صورة ${entityName}؟`)) {
        return;
    }
    
    fetch('/api/delete-image', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
            entity_type: entityType,
            entity_id: entityId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            
            // Refresh the current section to show updated image
            if (entityType === 'student') {
                loadStudents();
            } else if (entityType === 'teacher') {
                loadTeachers();
            }
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء حذف الصورة', 'danger');
    });
}

function getProfileImageHtml(profileImage, entityName) {
    if (profileImage) {
        return `<img src="/${profileImage}" alt="${entityName}" class="profile-image" style="width: 50px; height: 50px; object-fit: cover; border-radius: 50%;">`;
    } else {
        return `<div class="profile-placeholder d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; background-color: #f8f9fa; border-radius: 50%; color: #6c757d;">
                    <i class="fas fa-user"></i>
                </div>`;
    }
}

// ==================== Levels Management Functions ====================

function showLevelsSection() {
    const content = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-layer-group text-primary"></i> إدارة المستويات التعليمية</h2>
            <button class="btn btn-primary" onclick="showAddLevelModal()">
                <i class="fas fa-plus"></i> إضافة مستوى جديد
            </button>
        </div>
        
        <!-- Levels Table -->
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped" id="levelsTable">
                        <thead>
                            <tr>
                                <th>اسم المستوى</th>
                                <th>الوصف</th>
                                <th>الفئة العمرية</th>
                                <th>عدد الفصول</th>
                                <th>الترتيب</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="levelsTableBody">
                            <tr>
                                <td colspan="7" class="text-center">
                                    <i class="fas fa-spinner fa-spin fa-2x text-muted"></i>
                                    <p class="text-muted mt-2">جاري التحميل...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    $('#mainContent').html(content);
    loadLevelsData();
}

function loadLevelsData() {
    fetch('/api/levels', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayLevelsTable(data.levels);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء تحميل المستويات', 'danger');
    });
}

function displayLevelsTable(levels) {
    let tableHtml = '';
    
    if (!levels || levels.length === 0) {
        tableHtml = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-layer-group fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا يوجد مستويات تعليمية</p>
                </td>
            </tr>
        `;
    } else {
        levels.forEach(level => {
            const statusBadge = level.is_active ? 
                '<span class="badge bg-success">نشط</span>' : 
                '<span class="badge bg-secondary">غير نشط</span>';
            
            const ageRange = level.age_range_min && level.age_range_max ? 
                `${level.age_range_min} - ${level.age_range_max} سنة` : '-';
            
            tableHtml += `
                <tr>
                    <td>
                        <div class="fw-bold">${level.name}</div>
                    </td>
                    <td>${level.description || '-'}</td>
                    <td>${ageRange}</td>
                    <td>
                        <span class="badge bg-info">${level.classrooms_count}</span>
                    </td>
                    <td>
                        <span class="badge bg-secondary">${level.order_index}</span>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewLevel(${level.id})" title="عرض">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="editLevel(${level.id})" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteLevel(${level.id}, '${level.name}')" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    $('#levelsTableBody').html(tableHtml);
}

function showAddLevelModal() {
    const modalHtml = `
        <div class="modal fade" id="addLevelModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">إضافة مستوى تعليمي جديد</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addLevelForm">
                            <div class="mb-3">
                                <label class="form-label">اسم المستوى *</label>
                                <input type="text" class="form-control" name="name" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">الوصف</label>
                                <textarea class="form-control" name="description" rows="3"></textarea>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">العمر الأدنى</label>
                                    <input type="number" class="form-control" name="age_range_min" min="0" max="100">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">العمر الأعلى</label>
                                    <input type="number" class="form-control" name="age_range_max" min="0" max="100">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">ترتيب المستوى</label>
                                <input type="number" class="form-control" name="order_index" value="0" min="0">
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="is_active" checked>
                                    <label class="form-check-label">مستوى نشط</label>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="addLevel()">إضافة المستوى</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    $('#addLevelModal').remove();
    $('body').append(modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('addLevelModal'));
    modal.show();
}

function addLevel() {
    const form = document.getElementById('addLevelForm');
    const formData = new FormData(form);
    
    const levelData = {
        name: formData.get('name'),
        description: formData.get('description'),
        age_range_min: formData.get('age_range_min') ? parseInt(formData.get('age_range_min')) : null,
        age_range_max: formData.get('age_range_max') ? parseInt(formData.get('age_range_max')) : null,
        order_index: parseInt(formData.get('order_index')) || 0,
        is_active: formData.get('is_active') === 'on'
    };
    
    fetch('/api/levels', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(levelData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('تم إضافة المستوى بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addLevelModal')).hide();
            loadLevelsData();
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء إضافة المستوى', 'danger');
    });
}

function deleteLevel(levelId, levelName) {
    if (!confirm(`هل أنت متأكد من حذف المستوى "${levelName}"؟`)) {
        return;
    }
    
    fetch(`/api/levels/${levelId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('تم حذف المستوى بنجاح', 'success');
            loadLevelsData();
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء حذف المستوى', 'danger');
    });
}

// ==================== Academic Years Management Functions ====================

function showAcademicYearsSection() {
    const content = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-calendar-alt text-primary"></i> إدارة السنوات الدراسية</h2>
            <button class="btn btn-primary" onclick="showAddAcademicYearModal()">
                <i class="fas fa-plus"></i> إضافة سنة دراسية جديدة
            </button>
        </div>
        
        <!-- Academic Years Table -->
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped" id="academicYearsTable">
                        <thead>
                            <tr>
                                <th>السنة الدراسية</th>
                                <th>تاريخ البداية</th>
                                <th>تاريخ النهاية</th>
                                <th>عدد الطلاب</th>
                                <th>عدد الفصول</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="academicYearsTableBody">
                            <tr>
                                <td colspan="7" class="text-center">
                                    <i class="fas fa-spinner fa-spin fa-2x text-muted"></i>
                                    <p class="text-muted mt-2">جاري التحميل...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    $('#mainContent').html(content);
    loadAcademicYearsData();
}

function loadAcademicYearsData() {
    fetch('/api/academic-years', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayAcademicYearsTable(data.academic_years);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء تحميل السنوات الدراسية', 'danger');
    });
}

function displayAcademicYearsTable(academicYears) {
    let tableHtml = '';
    
    if (!academicYears || academicYears.length === 0) {
        tableHtml = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا يوجد سنوات دراسية</p>
                </td>
            </tr>
        `;
    } else {
        academicYears.forEach(year => {
            const statusBadge = year.is_active ? 
                '<span class="badge bg-success"><i class="fas fa-check"></i> نشطة</span>' : 
                '<span class="badge bg-secondary">غير نشطة</span>';
            
            const activateButton = !year.is_active ? 
                `<button class="btn btn-sm btn-outline-warning" onclick="activateAcademicYear(${year.id}, '${year.name}')" title="تفعيل">
                    <i class="fas fa-power-off"></i>
                </button>` : '';
            
            tableHtml += `
                <tr>
                    <td>
                        <div class="fw-bold">${year.name}</div>
                        <small class="text-muted">تم الإنشاء: ${formatDateArabic(year.created_at)}</small>
                    </td>
                    <td>${formatDateArabic(year.start_date)}</td>
                    <td>${formatDateArabic(year.end_date)}</td>
                    <td>
                        <span class="badge bg-info">${year.students_count}</span>
                    </td>
                    <td>
                        <span class="badge bg-info">${year.classrooms_count}</span>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewAcademicYear(${year.id})" title="عرض">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="editAcademicYear(${year.id})" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${activateButton}
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteAcademicYear(${year.id}, '${year.name}')" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    $('#academicYearsTableBody').html(tableHtml);
}

function showAddAcademicYearModal() {
    const modalHtml = `
        <div class="modal fade" id="addAcademicYearModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">إضافة سنة دراسية جديدة</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addAcademicYearForm">
                            <div class="mb-3">
                                <label class="form-label">اسم السنة الدراسية *</label>
                                <input type="text" class="form-control" name="name" placeholder="مثال: 2024-2025" required>
                                <div class="form-text">مثال: 2024-2025</div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">تاريخ البداية *</label>
                                    <input type="date" class="form-control" name="start_date" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">تاريخ النهاية *</label>
                                    <input type="date" class="form-control" name="end_date" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="is_active">
                                    <label class="form-check-label">تفعيل هذه السنة الدراسية</label>
                                    <div class="form-text">سيتم إلغاء تفعيل السنوات الأخرى تلقائياً</div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-primary" onclick="addAcademicYear()">إضافة السنة الدراسية</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    $('#addAcademicYearModal').remove();
    $('body').append(modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('addAcademicYearModal'));
    modal.show();
}

function addAcademicYear() {
    const form = document.getElementById('addAcademicYearForm');
    const formData = new FormData(form);
    
    const yearData = {
        name: formData.get('name'),
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date'),
        is_active: formData.get('is_active') === 'on'
    };
    
    fetch('/api/academic-years', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(yearData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('تم إضافة السنة الدراسية بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addAcademicYearModal')).hide();
            loadAcademicYearsData();
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء إضافة السنة الدراسية', 'danger');
    });
}

function activateAcademicYear(yearId, yearName) {
    if (!confirm(`هل أنت متأكد من تفعيل السنة الدراسية "${yearName}"؟\nسيتم إلغاء تفعيل السنوات الأخرى تلقائياً.`)) {
        return;
    }
    
    fetch(`/api/academic-years/${yearId}/activate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            loadAcademicYearsData();
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء تفعيل السنة الدراسية', 'danger');
    });
}

function deleteAcademicYear(yearId, yearName) {
    if (!confirm(`هل أنت متأكد من حذف السنة الدراسية "${yearName}"؟`)) {
        return;
    }
    
    fetch(`/api/academic-years/${yearId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('تم حذف السنة الدراسية بنجاح', 'success');
            loadAcademicYearsData();
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء حذف السنة الدراسية', 'danger');
    });
}

function editAcademicYear(yearId) {
    // Fetch academic year details
    fetch(`/api/academic-years/${yearId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showEditAcademicYearModal(data.academic_year);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء تحميل بيانات السنة الدراسية', 'danger');
    });
}

function showEditAcademicYearModal(year) {
    const modalHtml = `
        <div class="modal fade" id="editAcademicYearModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تعديل السنة الدراسية</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editAcademicYearForm">
                            <div class="mb-3">
                                <label class="form-label">اسم السنة الدراسية *</label>
                                <input type="text" class="form-control" name="name" value="${year.name}" required>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">تاريخ البداية *</label>
                                    <input type="date" class="form-control" name="start_date" value="${year.start_date}" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">تاريخ النهاية *</label>
                                    <input type="date" class="form-control" name="end_date" value="${year.end_date}" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="is_active" ${year.is_active ? 'checked' : ''}>
                                    <label class="form-check-label">تفعيل هذه السنة الدراسية</label>
                                    <div class="form-text">سيتم إلغاء تفعيل السنوات الأخرى تلقائياً</div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-success" onclick="updateAcademicYear(${year.id})">حفظ التغييرات</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    $('#editAcademicYearModal').remove();
    $('body').append(modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('editAcademicYearModal'));
    modal.show();
}

function updateAcademicYear(yearId) {
    const form = document.getElementById('editAcademicYearForm');
    const formData = new FormData(form);
    
    const yearData = {
        name: formData.get('name'),
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date'),
        is_active: formData.get('is_active') === 'on'
    };
    
    fetch(`/api/academic-years/${yearId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(yearData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('تم تحديث السنة الدراسية بنجاح', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editAcademicYearModal')).hide();
            loadAcademicYearsData();
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء تحديث السنة الدراسية', 'danger');
    });
}

function viewAcademicYear(yearId) {
    // Fetch academic year details
    fetch(`/api/academic-years/${yearId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showViewAcademicYearModal(data.academic_year);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء تحميل بيانات السنة الدراسية', 'danger');
    });
}

function showViewAcademicYearModal(year) {
    const statusBadge = year.is_active ? 
        '<span class="badge bg-success"><i class="fas fa-check"></i> نشطة</span>' : 
        '<span class="badge bg-secondary">غير نشطة</span>';
    
    const modalHtml = `
        <div class="modal fade" id="viewAcademicYearModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">عرض السنة الدراسية</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-12 mb-3">
                                <label class="form-label fw-bold">اسم السنة الدراسية:</label>
                                <p class="form-control-plaintext">${year.name}</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-bold">تاريخ البداية:</label>
                                <p class="form-control-plaintext">${formatDateArabic(year.start_date)}</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-bold">تاريخ النهاية:</label>
                                <p class="form-control-plaintext">${formatDateArabic(year.end_date)}</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-bold">الحالة:</label>
                                <p class="form-control-plaintext">${statusBadge}</p>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-bold">تاريخ الإنشاء:</label>
                                <p class="form-control-plaintext">${formatDateArabic(year.created_at)}</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        <button type="button" class="btn btn-success" onclick="editAcademicYear(${year.id}); bootstrap.Modal.getInstance(document.getElementById('viewAcademicYearModal')).hide();">تعديل</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    $('#viewAcademicYearModal').remove();
    $('body').append(modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('viewAcademicYearModal'));
    modal.show();
}

// ==================== Email System Functions ====================

function showEmailModal(type, itemId, itemName) {
    const modalTitle = type === 'assessment' ? 'إرسال التقييم بالإيميل' : 'إرسال التقييم النهائي بالإيميل';
    const modalHtml = `
        <div class="modal fade" id="emailModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${modalTitle}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            سيتم إرسال ${type === 'assessment' ? 'التقييم' : 'التقييم النهائي'} للطالب: <strong>${itemName}</strong>
                        </div>
                        
                        <form id="emailForm">
                            <div class="mb-3">
                                <label class="form-label">البريد الإلكتروني المستلم *</label>
                                <input type="email" class="form-control" name="recipient_email" placeholder="example@email.com" required>
                                <div class="form-text">أدخل البريد الإلكتروني الذي سيتم إرسال التقييم إليه</div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">نسخة إضافية (CC)</label>
                                <input type="email" class="form-control" name="cc_email" placeholder="cc@email.com">
                                <div class="form-text">اختياري: بريد إلكتروني إضافي لإرسال نسخة</div>
                            </div>
                            
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="includeRecommendations" name="include_recommendations">
                                    <label class="form-check-label" for="includeRecommendations">
                                        تضمين التوصيات في الإيميل
                                    </label>
                                </div>
                            </div>
                            
                            <div class="alert alert-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <strong>تأكد من إعداد البريد الإلكتروني:</strong>
                                يجب تكوين إعدادات SMTP في ملف البيئة (.env) قبل إرسال الإيميلات.
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-info" onclick="testEmailConfig()">
                            <i class="fas fa-vial"></i> اختبار الإعدادات
                        </button>
                        <button type="button" class="btn btn-primary" onclick="sendEmail('${type}', ${itemId})">
                            <i class="fas fa-paper-plane"></i> إرسال الإيميل
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    $('#emailModal').remove();
    $('body').append(modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('emailModal'));
    modal.show();
}

function sendEmail(type, itemId) {
    const form = document.getElementById('emailForm');
    const formData = new FormData(form);
    
    const emailData = {
        recipient_email: formData.get('recipient_email'),
        cc_emails: formData.get('cc_email') ? [formData.get('cc_email')] : null,
        include_recommendations: formData.get('include_recommendations') === 'on'
    };
    
    // Add the appropriate ID field
    if (type === 'assessment') {
        emailData.assessment_id = itemId;
    } else {
        emailData.evaluation_id = itemId;
    }
    
    const endpoint = type === 'assessment' ? '/api/send-assessment-email' : '/api/send-final-evaluation-email';
    
    // Show loading state
    const sendButton = document.querySelector('#emailModal .btn-primary');
    const originalText = sendButton.innerHTML;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    sendButton.disabled = true;
    
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(emailData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('emailModal')).hide();
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء إرسال الإيميل', 'danger');
    })
    .finally(() => {
        // Restore button state
        sendButton.innerHTML = originalText;
        sendButton.disabled = false;
    });
}

function testEmailConfig() {
    const form = document.getElementById('emailForm');
    const formData = new FormData(form);
    const testEmail = formData.get('recipient_email');
    
    if (!testEmail) {
        showAlert('يرجى إدخال بريد إلكتروني للاختبار', 'warning');
        return;
    }
    
    // Show loading state
    const testButton = document.querySelector('#emailModal .btn-info');
    const originalText = testButton.innerHTML;
    testButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الاختبار...';
    testButton.disabled = true;
    
    fetch('/api/test-email-config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ test_email: testEmail })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء اختبار الإعدادات', 'danger');
    })
    .finally(() => {
        // Restore button state
        testButton.innerHTML = originalText;
        testButton.disabled = false;
    });
}

function showEmailSettingsModal() {
    const modalHtml = `
        <div class="modal fade" id="emailSettingsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">إعدادات البريد الإلكتروني</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            <strong>تعليمات الإعداد:</strong>
                            يجب إضافة المتغيرات التالية في ملف .env في مجلد المشروع:
                        </div>
                        
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">متغيرات البيئة المطلوبة:</h6>
                            </div>
                            <div class="card-body">
                                <pre class="bg-light p-3 rounded">
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
                                </pre>
                            </div>
                        </div>
                        
                        <div class="mt-3">
                            <h6>خطوات الإعداد لـ Gmail:</h6>
                            <ol>
                                <li>قم بتسجيل الدخول إلى حساب Gmail الخاص بك</li>
                                <li>اذهب إلى إعدادات الحساب → الأمان</li>
                                <li>قم بتفعيل "التحقق بخطوتين"</li>
                                <li>أنشئ "كلمة مرور التطبيق" واستخدمها في MAIL_PASSWORD</li>
                                <li>أعد تشغيل الخادم بعد إضافة المتغيرات</li>
                            </ol>
                        </div>
                        
                        <div class="mt-3">
                            <h6>اختبار الإعدادات:</h6>
                            <div class="input-group">
                                <input type="email" class="form-control" id="testEmailInput" placeholder="أدخل بريد إلكتروني للاختبار">
                                <button class="btn btn-outline-primary" onclick="testEmailFromSettings()">
                                    <i class="fas fa-vial"></i> اختبار
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    $('#emailSettingsModal').remove();
    $('body').append(modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('emailSettingsModal'));
    modal.show();
}

function testEmailFromSettings() {
    const testEmail = document.getElementById('testEmailInput').value;
    
    if (!testEmail) {
        showAlert('يرجى إدخال بريد إلكتروني للاختبار', 'warning');
        return;
    }
    
    const testButton = document.querySelector('#emailSettingsModal .btn-outline-primary');
    const originalText = testButton.innerHTML;
    testButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الاختبار...';
    testButton.disabled = true;
    
    fetch('/api/test-email-config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ test_email: testEmail })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء اختبار الإعدادات', 'danger');
    })
    .finally(() => {
        testButton.innerHTML = originalText;
        testButton.disabled = false;
    });
}

// ==================== Reports and Statistics Functions ====================

function showReportsSection() {
    const content = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2><i class="fas fa-chart-bar text-primary"></i> التقارير والإحصائيات</h2>
        </div>
        
        <!-- Statistics Cards -->
        <div class="row mb-4" id="statisticsCards">
            <div class="col-md-3 mb-3">
                <div class="card bg-primary text-white">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h4 class="card-title" id="totalStudents">-</h4>
                                <p class="card-text">إجمالي الطلاب</p>
                            </div>
                            <div class="align-self-center">
                                <i class="fas fa-user-graduate fa-2x"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-success text-white">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h4 class="card-title" id="totalTeachers">-</h4>
                                <p class="card-text">إجمالي المعلمين</p>
                            </div>
                            <div class="align-self-center">
                                <i class="fas fa-chalkboard-teacher fa-2x"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-info text-white">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h4 class="card-title" id="totalClassrooms">-</h4>
                                <p class="card-text">إجمالي الفصول</p>
                            </div>
                            <div class="align-self-center">
                                <i class="fas fa-door-open fa-2x"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="card bg-warning text-white">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h4 class="card-title" id="totalSkills">-</h4>
                                <p class="card-text">إجمالي المهارات</p>
                            </div>
                            <div class="align-self-center">
                                <i class="fas fa-brain fa-2x"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Current Year Statistics -->
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">إحصائيات السنة الدراسية الحالية</h5>
                        <small class="text-muted" id="currentYearName">-</small>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-4 text-center">
                                <h3 class="text-primary" id="yearStudents">-</h3>
                                <p class="text-muted">طلاب السنة الحالية</p>
                            </div>
                            <div class="col-md-4 text-center">
                                <h3 class="text-success" id="yearAssessments">-</h3>
                                <p class="text-muted">التقييمات</p>
                            </div>
                            <div class="col-md-4 text-center">
                                <h3 class="text-info" id="yearFinalEvaluations">-</h3>
                                <p class="text-muted">التقييمات النهائية</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Reports Navigation -->
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">التقارير المتاحة</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <button class="btn btn-outline-primary w-100" onclick="showStudentProgressReport()">
                                    <i class="fas fa-chart-line fa-2x d-block mb-2"></i>
                                    تقرير تطور الطالب
                                </button>
                            </div>
                            <div class="col-md-4 mb-3">
                                <button class="btn btn-outline-success w-100" onclick="showClassroomSummaryReport()">
                                    <i class="fas fa-users fa-2x d-block mb-2"></i>
                                    ملخص الفصل
                                </button>
                            </div>
                            <div class="col-md-4 mb-3">
                                <button class="btn btn-outline-info w-100" onclick="showSkillsAnalysisReport()">
                                    <i class="fas fa-brain fa-2x d-block mb-2"></i>
                                    تحليل المهارات
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Report Results Container -->
        <div id="reportResults" class="mt-4"></div>
    `;
    
    $('#mainContent').html(content);
    loadDashboardStatistics();
}

function loadDashboardStatistics() {
    fetch('/api/reports/dashboard', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayDashboardStatistics(data.statistics);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء تحميل الإحصائيات', 'danger');
    });
}

function displayDashboardStatistics(stats) {
    // Update totals
    $('#totalStudents').text(stats.totals.students);
    $('#totalTeachers').text(stats.totals.teachers);
    $('#totalClassrooms').text(stats.totals.classrooms);
    $('#totalSkills').text(stats.totals.skills);
    
    // Update current year stats
    $('#currentYearName').text(stats.current_year.name);
    $('#yearStudents').text(stats.current_year.students);
    $('#yearAssessments').text(stats.current_year.assessments);
    $('#yearFinalEvaluations').text(stats.current_year.final_evaluations);
}

function showStudentProgressReport() {
    const modalHtml = `
        <div class="modal fade" id="studentProgressModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تقرير تطور الطالب</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="studentProgressForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">الطالب *</label>
                                    <select class="form-select" name="student_id" required>
                                        <option value="">اختر الطالب</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">السنة الدراسية</label>
                                    <select class="form-select" name="academic_year_id">
                                        <option value="">جميع السنوات</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                        <div id="progressResults" class="mt-3"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        <button type="button" class="btn btn-primary" onclick="generateStudentProgressReport()">إنشاء التقرير</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#studentProgressModal').remove();
    $('body').append(modalHtml);
    
    // Load students and academic years
    loadStudentsForReport('#studentProgressModal select[name="student_id"]');
    loadAcademicYearsForReport('#studentProgressModal select[name="academic_year_id"]');
    
    const modal = new bootstrap.Modal(document.getElementById('studentProgressModal'));
    modal.show();
}

function generateStudentProgressReport() {
    const form = document.getElementById('studentProgressForm');
    const formData = new FormData(form);
    
    const studentId = formData.get('student_id');
    const academicYearId = formData.get('academic_year_id');
    
    if (!studentId) {
        showAlert('يرجى اختيار الطالب', 'warning');
        return;
    }
    
    const params = new URLSearchParams();
    params.append('student_id', studentId);
    if (academicYearId) params.append('academic_year_id', academicYearId);
    
    fetch(`/api/reports/student-progress?${params}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayStudentProgressReport(data);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء إنشاء التقرير', 'danger');
    });
}

function displayStudentProgressReport(data) {
    const student = data.student;
    const progressData = data.progress_data;
    
    let resultsHtml = `
        <div class="alert alert-info">
            <h6>معلومات الطالب:</h6>
            <p><strong>الاسم:</strong> ${student.name}</p>
            <p><strong>رقم الهوية:</strong> ${student.national_id}</p>
            <p><strong>الفصل:</strong> ${student.classroom || 'غير محدد'}</p>
        </div>
        
        <h6>تطور الأداء:</h6>
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>التاريخ</th>
                        <th>نوع التقييم</th>
                        <th>المقيم</th>
                        <th>متقن</th>
                        <th>نوعاً ما</th>
                        <th>غير متقن</th>
                        <th>المجموع</th>
                        <th>نسبة الإتقان</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    progressData.forEach(item => {
        const percentage = item.total_skills > 0 ? 
            Math.round((item.achieved / item.total_skills) * 100) : 0;
        
        const typeText = item.type === 'assessment' ? 'تقييم دوري' : 'تقييم نهائي';
        
        resultsHtml += `
            <tr>
                <td>${formatDateArabic(item.date)}</td>
                <td>
                    <span class="badge ${item.type === 'assessment' ? 'bg-primary' : 'bg-success'}">
                        ${typeText}
                    </span>
                </td>
                <td>${item.evaluator}</td>
                <td><span class="badge bg-success">${item.achieved}</span></td>
                <td><span class="badge bg-warning">${item.partial}</span></td>
                <td><span class="badge bg-danger">${item.not_achieved}</span></td>
                <td>${item.total_skills}</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar bg-success" style="width: ${percentage}%">
                            ${percentage}%
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    resultsHtml += '</tbody></table></div>';
    
    $('#progressResults').html(resultsHtml);
}

function showClassroomSummaryReport() {
    const modalHtml = `
        <div class="modal fade" id="classroomSummaryModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">ملخص الفصل</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="classroomSummaryForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">الفصل *</label>
                                    <select class="form-select" name="classroom_id" required>
                                        <option value="">اختر الفصل</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">السنة الدراسية</label>
                                    <select class="form-select" name="academic_year_id">
                                        <option value="">جميع السنوات</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                        <div id="classroomResults" class="mt-3"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        <button type="button" class="btn btn-primary" onclick="generateClassroomSummaryReport()">إنشاء التقرير</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#classroomSummaryModal').remove();
    $('body').append(modalHtml);
    
    // Load classrooms and academic years
    loadClassroomsForReport('#classroomSummaryModal select[name="classroom_id"]');
    loadAcademicYearsForReport('#classroomSummaryModal select[name="academic_year_id"]');
    
    const modal = new bootstrap.Modal(document.getElementById('classroomSummaryModal'));
    modal.show();
}

function generateClassroomSummaryReport() {
    const form = document.getElementById('classroomSummaryForm');
    const formData = new FormData(form);
    
    const classroomId = formData.get('classroom_id');
    const academicYearId = formData.get('academic_year_id');
    
    if (!classroomId) {
        showAlert('يرجى اختيار الفصل', 'warning');
        return;
    }
    
    const params = new URLSearchParams();
    params.append('classroom_id', classroomId);
    if (academicYearId) params.append('academic_year_id', academicYearId);
    
    fetch(`/api/reports/classroom-summary?${params}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayClassroomSummaryReport(data.classroom_summary);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء إنشاء التقرير', 'danger');
    });
}

function displayClassroomSummaryReport(summary) {
    const classroom = summary.classroom;
    const students = summary.students;
    
    let resultsHtml = `
        <div class="alert alert-info">
            <h6>معلومات الفصل:</h6>
            <p><strong>اسم الفصل:</strong> ${classroom.name}</p>
            <p><strong>المستوى:</strong> ${classroom.level}</p>
            <p><strong>السعة:</strong> ${classroom.capacity}</p>
            <p><strong>عدد الطلاب الحالي:</strong> ${classroom.current_students}</p>
        </div>
        
        <h6>طلاب الفصل:</h6>
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>الطالب</th>
                        <th>رقم الهوية</th>
                        <th>آخر تقييم</th>
                        <th>آخر تقييم نهائي</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    students.forEach(student => {
        const lastAssessment = student.latest_assessment;
        const lastFinalEval = student.latest_final_evaluation;
        
        let assessmentInfo = 'لا يوجد';
        if (lastAssessment) {
            const percentage = lastAssessment.total_skills > 0 ? 
                Math.round((lastAssessment.achieved_skills / lastAssessment.total_skills) * 100) : 0;
            assessmentInfo = `
                <div>
                    <small class="text-muted">${formatDateArabic(lastAssessment.date)}</small><br>
                    <div class="progress" style="height: 15px;">
                        <div class="progress-bar bg-success" style="width: ${percentage}%">
                            ${percentage}%
                        </div>
                    </div>
                    <small>${lastAssessment.achieved_skills}/${lastAssessment.total_skills} مهارة</small>
                </div>
            `;
        }
        
        let finalEvalInfo = 'لا يوجد';
        if (lastFinalEval) {
            const percentage = lastFinalEval.total_skills > 0 ? 
                Math.round((lastFinalEval.achieved_skills / lastFinalEval.total_skills) * 100) : 0;
            finalEvalInfo = `
                <div>
                    <small class="text-muted">${formatDateArabic(lastFinalEval.date)}</small><br>
                    <span class="badge bg-info">${lastFinalEval.status}</span><br>
                    <div class="progress" style="height: 15px;">
                        <div class="progress-bar bg-success" style="width: ${percentage}%">
                            ${percentage}%
                        </div>
                    </div>
                    <small>${lastFinalEval.achieved_skills}/${lastFinalEval.total_skills} مهارة</small>
                </div>
            `;
        }
        
        resultsHtml += `
            <tr>
                <td><strong>${student.name}</strong></td>
                <td>${student.national_id}</td>
                <td>${assessmentInfo}</td>
                <td>${finalEvalInfo}</td>
            </tr>
        `;
    });
    
    resultsHtml += '</tbody></table></div>';
    
    $('#classroomResults').html(resultsHtml);
}

function showSkillsAnalysisReport() {
    const modalHtml = `
        <div class="modal fade" id="skillsAnalysisModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">تحليل المهارات</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="skillsAnalysisForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">السنة الدراسية</label>
                                    <select class="form-select" name="academic_year_id">
                                        <option value="">جميع السنوات</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">المجال</label>
                                    <select class="form-select" name="domain_id">
                                        <option value="">جميع المجالات</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                        <div id="skillsAnalysisResults" class="mt-3"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        <button type="button" class="btn btn-primary" onclick="generateSkillsAnalysisReport()">إنشاء التقرير</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $('#skillsAnalysisModal').remove();
    $('body').append(modalHtml);
    
    // Load academic years and domains
    loadAcademicYearsForReport('#skillsAnalysisModal select[name="academic_year_id"]');
    loadDomainsForReport('#skillsAnalysisModal select[name="domain_id"]');
    
    const modal = new bootstrap.Modal(document.getElementById('skillsAnalysisModal'));
    modal.show();
}

function generateSkillsAnalysisReport() {
    const form = document.getElementById('skillsAnalysisForm');
    const formData = new FormData(form);
    
    const academicYearId = formData.get('academic_year_id');
    const domainId = formData.get('domain_id');
    
    const params = new URLSearchParams();
    if (academicYearId) params.append('academic_year_id', academicYearId);
    if (domainId) params.append('domain_id', domainId);
    
    fetch(`/api/reports/skills-analysis?${params}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displaySkillsAnalysisReport(data.skills_analysis);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ أثناء إنشاء التقرير', 'danger');
    });
}

function displaySkillsAnalysisReport(skillsData) {
    let resultsHtml = `
        <h6>تحليل المهارات:</h6>
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>المهارة</th>
                        <th>المجال</th>
                        <th>إجمالي التقييمات</th>
                        <th>متقن</th>
                        <th>نوعاً ما</th>
                        <th>غير متقن</th>
                        <th>نسبة الإتقان</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    skillsData.forEach(skill => {
        resultsHtml += `
            <tr>
                <td><strong>${skill.skill_name}</strong></td>
                <td>${skill.domain_name}</td>
                <td>${skill.total_evaluations}</td>
                <td><span class="badge bg-success">${skill.achieved}</span></td>
                <td><span class="badge bg-warning">${skill.partial}</span></td>
                <td><span class="badge bg-danger">${skill.not_achieved}</span></td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar bg-success" style="width: ${skill.achieved_percentage || 0}%">
                            ${skill.achieved_percentage || 0}%
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    resultsHtml += '</tbody></table></div>';
    
    $('#skillsAnalysisResults').html(resultsHtml);
}

function loadStudentsForReport(selector) {
    fetch('/api/students', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let options = '<option value="">اختر الطالب</option>';
            data.students.forEach(student => {
                options += `<option value="${student.id}">${student.name} - ${student.national_id}</option>`;
            });
            $(selector).html(options);
        }
    })
    .catch(error => {
        console.error('Error loading students:', error);
    });
}

function loadClassroomsForReport(selector) {
    fetch('/api/classrooms', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let options = '<option value="">اختر الفصل</option>';
            data.classrooms.forEach(classroom => {
                options += `<option value="${classroom.id}">${classroom.name}</option>`;
            });
            $(selector).html(options);
        }
    })
    .catch(error => {
        console.error('Error loading classrooms:', error);
    });
}

function loadAcademicYearsForReport(selector) {
    fetch('/api/academic-years', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let options = '<option value="">جميع السنوات</option>';
            data.academic_years.forEach(year => {
                options += `<option value="${year.id}">${year.name}</option>`;
            });
            $(selector).html(options);
        }
    })
    .catch(error => {
        console.error('Error loading academic years:', error);
    });
}

function loadDomainsForReport(selector) {
    fetch('/api/skill-domains', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let options = '<option value="">جميع المجالات</option>';
            data.domains.forEach(domain => {
                options += `<option value="${domain.id}">${domain.name}</option>`;
            });
            $(selector).html(options);
        }
    })
    .catch(error => {
        console.error('Error loading domains:', error);
    });
}
