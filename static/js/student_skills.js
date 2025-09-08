// Student Skills Assessment JavaScript
let currentStudentId = null;
let skillsData = [];
let categoriesData = [];
let assessmentsData = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadStudents();
    loadCategories();
    setDefaultDate();
    loadNotifications();
});

// Set default assessment date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('assessmentDate').value = today;
}

// Load students list
async function loadStudents() {
    try {
        const response = await fetch('/api/students', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('studentSelect');
            select.innerHTML = '<option value="">-- اختر طالب --</option>';
            
            data.students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = student.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('خطأ في تحميل قائمة الطلاب', 'danger');
    }
}

// Load skill categories
async function loadCategories() {
    try {
        const response = await fetch('/api/skill-categories', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            categoriesData = data.categories;
            
            const select = document.getElementById('categoryFilter');
            select.innerHTML = '<option value="">جميع الفئات</option>';
            
            data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.category_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showAlert('خطأ في تحميل فئات المهارات', 'danger');
    }
}

// Load skills for selected student
async function loadStudentSkills(studentId, categoryId = '') {
    try {
        let url = `/api/skills?student_id=${studentId}`;
        if (categoryId) {
            url += `&category_id=${categoryId}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            skillsData = data.skills;
            await loadStudentAssessments(studentId);
            displaySkills();
            updateStatistics();
        }
    } catch (error) {
        console.error('Error loading skills:', error);
        showAlert('خطأ في تحميل المهارات', 'danger');
    }
}

// Load student assessments
async function loadStudentAssessments(studentId) {
    try {
        const response = await fetch(`/api/student-skill-assessments?student_id=${studentId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            assessmentsData = data.assessments;
        }
    } catch (error) {
        console.error('Error loading assessments:', error);
    }
}

// Display skills grouped by categories
function displaySkills() {
    const container = document.getElementById('skillsContainer');
    container.innerHTML = '';
    
    if (skillsData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-star fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">لا توجد مهارات متاحة</h4>
                <p class="text-muted">يرجى اختيار طالب لعرض مهاراته</p>
            </div>
        `;
        return;
    }
    
    // Group skills by category
    const skillsByCategory = {};
    skillsData.forEach(skill => {
        const categoryId = skill.category_id;
        if (!skillsByCategory[categoryId]) {
            skillsByCategory[categoryId] = [];
        }
        skillsByCategory[categoryId].push(skill);
    });
    
    // Display each category with its skills
    Object.keys(skillsByCategory).forEach(categoryId => {
        const category = categoriesData.find(c => c.id == categoryId);
        if (!category) return;
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'mb-4';
        
        const categoryHeader = `
            <div class="category-header">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h4 class="mb-1">
                            <i class="${category.icon || 'fas fa-star'} ms-2"></i>
                            ${category.category_name}
                        </h4>
                        <p class="mb-0 opacity-75">${category.description || ''}</p>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-light text-dark fs-6">
                            ${skillsByCategory[categoryId].length} مهارة
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        const skillsHtml = skillsByCategory[categoryId].map(skill => {
            const assessment = assessmentsData.find(a => a.skill_id === skill.id);
            const status = assessment ? assessment.assessment_status : 'not_assessed';
            const statusClass = getStatusClass(status);
            const statusText = getStatusText(status);
            const statusIcon = getStatusIcon(status);
            
            return `
                <div class="skill-card p-3" data-skill-id="${skill.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-2">
                                <span class="skill-status ${statusClass}"></span>
                                ${skill.skill_name}
                            </h6>
                            <p class="text-muted small mb-2">${skill.description || ''}</p>
                            ${assessment ? `
                                <div class="small text-muted">
                                    <i class="fas fa-calendar ms-1"></i>
                                    آخر تقييم: ${formatDate(assessment.assessment_date)}
                                    ${assessment.proficiency_level ? `
                                        <span class="ms-2">
                                            <i class="fas fa-star ms-1"></i>
                                            ${assessment.proficiency_level}/5
                                        </span>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div class="text-end">
                            <span class="badge ${statusClass} mb-2">
                                <i class="${statusIcon} ms-1"></i>
                                ${statusText}
                            </span>
                            <br>
                            <button class="btn btn-sm btn-outline-primary" onclick="openAssessmentModal(${skill.id})">
                                <i class="fas fa-edit ms-1"></i>
                                ${assessment ? 'تعديل التقييم' : 'تقييم المهارة'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        categoryDiv.innerHTML = categoryHeader + '<div class="row"><div class="col-12">' + skillsHtml + '</div></div>';
        container.appendChild(categoryDiv);
    });
}

// Get status CSS class
function getStatusClass(status) {
    switch(status) {
        case 'completed': return 'status-completed';
        case 'maybe': return 'status-maybe';
        case 'not_completed': return 'status-not-completed';
        default: return 'status-not-assessed';
    }
}

// Get status text
function getStatusText(status) {
    switch(status) {
        case 'completed': return 'مكتملة';
        case 'maybe': return 'قيد التطوير';
        case 'not_completed': return 'غير مكتملة';
        default: return 'لم يتم التقييم';
    }
}

// Get status icon
function getStatusIcon(status) {
    switch(status) {
        case 'completed': return 'fas fa-check-circle';
        case 'maybe': return 'fas fa-clock';
        case 'not_completed': return 'fas fa-times-circle';
        default: return 'fas fa-question-circle';
    }
}

// Update statistics
function updateStatistics() {
    const completed = assessmentsData.filter(a => a.assessment_status === 'completed').length;
    const maybe = assessmentsData.filter(a => a.assessment_status === 'maybe').length;
    const notCompleted = assessmentsData.filter(a => a.assessment_status === 'not_completed').length;
    const total = assessmentsData.length;
    
    document.getElementById('completedSkills').textContent = completed;
    document.getElementById('inProgressSkills').textContent = maybe;
    document.getElementById('notCompletedSkills').textContent = notCompleted;
    document.getElementById('totalAssessments').textContent = total;
    
    // Update progress circle
    const totalSkills = skillsData.length;
    const completionPercentage = totalSkills > 0 ? Math.round((completed / totalSkills) * 100) : 0;
    document.getElementById('completionPercentage').textContent = completionPercentage + '%';
    
    const circle = document.getElementById('progressCircle');
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (completionPercentage / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    // Show stats cards
    document.getElementById('statsCards').style.display = 'flex';
}

// Open assessment modal
async function openAssessmentModal(skillId) {
    const skill = skillsData.find(s => s.id === skillId);
    const assessment = assessmentsData.find(a => a.skill_id === skillId);
    const student = await getStudentInfo(currentStudentId);
    
    if (!skill || !student) return;
    
    // Fill modal with data
    document.getElementById('studentId').value = currentStudentId;
    document.getElementById('skillId').value = skillId;
    document.getElementById('studentName').value = student.name;
    document.getElementById('skillName').value = skill.skill_name;
    document.getElementById('skillDescription').value = skill.description || '';
    
    // Fill existing assessment data if available
    if (assessment) {
        document.querySelector(`input[name="assessment_status"][value="${assessment.assessment_status}"]`).checked = true;
        document.getElementById('proficiencyLevel').value = assessment.proficiency_level || 3;
        document.getElementById('observations').value = assessment.observations || '';
        document.getElementById('recommendations').value = assessment.recommendations || '';
        document.getElementById('assessmentMethod').value = assessment.assessment_method || 'observation';
        document.getElementById('assessmentDate').value = assessment.assessment_date;
        document.getElementById('nextAssessmentDate').value = assessment.next_assessment_date || '';
    } else {
        // Reset form for new assessment
        document.getElementById('assessmentForm').reset();
        document.getElementById('studentId').value = currentStudentId;
        document.getElementById('skillId').value = skillId;
        document.getElementById('studentName').value = student.name;
        document.getElementById('skillName').value = skill.skill_name;
        document.getElementById('skillDescription').value = skill.description || '';
        setDefaultDate();
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('assessmentModal'));
    modal.show();
}

// Get student information
async function getStudentInfo(studentId) {
    try {
        const response = await fetch(`/api/students/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error getting student info:', error);
    }
    return null;
}

// Save assessment
async function saveAssessment() {
    const form = document.getElementById('assessmentForm');
    const formData = new FormData(form);
    
    // Validate required fields
    if (!formData.get('assessment_status')) {
        showAlert('يرجى اختيار حالة التقييم', 'warning');
        return;
    }
    
    const assessmentData = {
        student_id: parseInt(formData.get('student_id')),
        skill_id: parseInt(formData.get('skill_id')),
        assessment_status: formData.get('assessment_status'),
        assessment_date: formData.get('assessment_date'),
        proficiency_level: parseInt(formData.get('proficiency_level')),
        observations: formData.get('observations'),
        recommendations: formData.get('recommendations'),
        assessment_method: formData.get('assessment_method'),
        next_assessment_date: formData.get('next_assessment_date') || null
    };
    
    try {
        // Check if assessment exists
        const existingAssessment = assessmentsData.find(a => 
            a.student_id === assessmentData.student_id && 
            a.skill_id === assessmentData.skill_id
        );
        
        let response;
        if (existingAssessment) {
            // Update existing assessment
            response = await fetch(`/api/student-skill-assessments/${existingAssessment.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(assessmentData)
            });
        } else {
            // Create new assessment
            response = await fetch('/api/student-skill-assessments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(assessmentData)
            });
        }
        
        if (response.ok) {
            showAlert('تم حفظ التقييم بنجاح', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('assessmentModal'));
            modal.hide();
            
            // Reload assessments and update display
            await loadStudentAssessments(currentStudentId);
            displaySkills();
            updateStatistics();
            
            // Create notification for completed skill
            if (assessmentData.assessment_status === 'completed') {
                await createSkillNotification(assessmentData.student_id, assessmentData.skill_id);
            }
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || 'خطأ في حفظ التقييم', 'danger');
        }
    } catch (error) {
        console.error('Error saving assessment:', error);
        showAlert('خطأ في حفظ التقييم', 'danger');
    }
}

// Create skill completion notification
async function createSkillNotification(studentId, skillId) {
    try {
        const skill = skillsData.find(s => s.id === skillId);
        if (!skill) return;
        
        const notificationData = {
            student_id: studentId,
            skill_id: skillId,
            notification_type: 'skill_completed',
            title: 'تم إتمام مهارة جديدة',
            message: `تم إتمام مهارة: ${skill.skill_name}`,
            is_read: false
        };
        
        await fetch('/api/skill-notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(notificationData)
        });
        
        loadNotifications();
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const response = await fetch('/api/skill-notifications?is_read=false', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateNotificationBadge(data.notifications.length);
            displayNotifications(data.notifications);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Update notification badge
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Display notifications in dropdown
function displayNotifications(notifications) {
    const list = document.getElementById('notificationsList');
    list.innerHTML = '<li><h6 class="dropdown-header">الإشعارات</h6></li><li><hr class="dropdown-divider"></li>';
    
    if (notifications.length === 0) {
        list.innerHTML += '<li><span class="dropdown-item-text text-muted">لا توجد إشعارات جديدة</span></li>';
        return;
    }
    
    notifications.slice(0, 5).forEach(notification => {
        const item = document.createElement('li');
        item.innerHTML = `
            <a class="dropdown-item" href="#" onclick="markNotificationAsRead(${notification.id})">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6 class="mb-1">${notification.title}</h6>
                        <p class="mb-1 small text-muted">${notification.message}</p>
                        <small class="text-muted">${formatDate(notification.created_at)}</small>
                    </div>
                </div>
            </a>
        `;
        list.appendChild(item);
    });
    
    if (notifications.length > 5) {
        list.innerHTML += `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item text-center" href="#">عرض جميع الإشعارات</a></li>`;
    }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        await fetch(`/api/skill-notifications/${notificationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ is_read: true })
        });
        
        loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Event listeners
document.getElementById('studentSelect').addEventListener('change', function() {
    const studentId = this.value;
    if (studentId) {
        currentStudentId = parseInt(studentId);
        const categoryId = document.getElementById('categoryFilter').value;
        loadStudentSkills(studentId, categoryId);
    } else {
        currentStudentId = null;
        document.getElementById('skillsContainer').innerHTML = '';
        document.getElementById('statsCards').style.display = 'none';
    }
});

document.getElementById('categoryFilter').addEventListener('change', function() {
    if (currentStudentId) {
        const categoryId = this.value;
        loadStudentSkills(currentStudentId, categoryId);
    }
});

// Update proficiency level display
document.getElementById('proficiencyLevel').addEventListener('input', function() {
    const value = this.value;
    const labels = ['ضعيف جداً', 'ضعيف', 'متوسط', 'جيد', 'ممتاز'];
    const label = labels[value - 1];
    
    // Update the display
    const display = document.querySelector('.form-range + .d-flex');
    if (display) {
        display.innerHTML = `
            <small>1 - ضعيف</small>
            <small class="fw-bold text-primary">${value} - ${label}</small>
            <small>5 - ممتاز</small>
        `;
    }
});
