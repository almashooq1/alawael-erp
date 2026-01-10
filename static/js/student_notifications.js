// Student Notifications JavaScript
let currentPage = 1;
let currentFilter = 'all';
let currentStudentId = null;
let currentDateRange = 'week';
let notificationsData = [];
let selectedNotifications = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadStudents();
    loadNotifications();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            currentPage = 1;
            loadNotifications();
        });
    });

    // Student selection
    document.getElementById('studentSelect').addEventListener('change', function() {
        currentStudentId = this.value || null;
        currentPage = 1;
        loadNotifications();
    });

    // Date range selection
    document.getElementById('dateRange').addEventListener('change', function() {
        currentDateRange = this.value;
        currentPage = 1;
        loadNotifications();
    });
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
            select.innerHTML = '<option value="">-- جميع الطلاب --</option>';
            
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

// Load notifications
async function loadNotifications() {
    try {
        let url = `/api/skill-notifications?page=${currentPage}&per_page=10`;
        
        if (currentStudentId) {
            url += `&student_id=${currentStudentId}`;
        }
        
        if (currentFilter !== 'all') {
            if (currentFilter === 'unread') {
                url += '&is_read=false';
            } else {
                url += `&notification_type=${currentFilter}`;
            }
        }
        
        // Add date range filter
        const dateFilter = getDateRangeFilter(currentDateRange);
        if (dateFilter) {
            url += `&created_after=${dateFilter}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            notificationsData = data.notifications;
            displayNotifications(data.notifications);
            updateUnreadCount();
            setupPagination(data.pagination);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        showAlert('خطأ في تحميل الإشعارات', 'danger');
    }
}

// Get date range filter
function getDateRangeFilter(range) {
    const now = new Date();
    let filterDate = null;
    
    switch(range) {
        case 'today':
            filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            filterDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        default:
            return null;
    }
    
    return filterDate.toISOString().split('T')[0];
}

// Display notifications
function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <h4>لا توجد إشعارات</h4>
                <p>لا توجد إشعارات تطابق المعايير المحددة</p>
            </div>
        `;
        return;
    }
    
    const notificationsHtml = notifications.map(notification => {
        const isUnread = !notification.is_read;
        const iconClass = getNotificationIconClass(notification.notification_type);
        const iconBg = getNotificationIconBackground(notification.notification_type);
        const cardClass = getNotificationCardClass(notification.notification_type);
        
        return `
            <div class="card notification-card ${cardClass} ${isUnread ? 'unread' : ''}" data-id="${notification.id}">
                <div class="card-body">
                    <div class="d-flex align-items-start">
                        <div class="notification-icon ${iconBg} me-3">
                            <i class="${iconClass}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="mb-1 ${isUnread ? 'fw-bold' : ''}">
                                    ${notification.title}
                                    ${isUnread ? '<span class="badge bg-success ms-2">جديد</span>' : ''}
                                </h6>
                                <div class="notification-actions">
                                    <input type="checkbox" class="form-check-input me-2" 
                                           onchange="toggleNotificationSelection(${notification.id}, this.checked)">
                                    <button class="btn btn-sm btn-outline-primary" 
                                            onclick="viewNotificationDetails(${notification.id})">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                            <p class="text-muted mb-2">${notification.message}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">
                                    <i class="fas fa-clock ms-1"></i>
                                    ${formatDateTime(notification.created_at)}
                                </small>
                                <div>
                                    ${notification.student_name ? `
                                        <span class="badge bg-light text-dark">
                                            <i class="fas fa-user ms-1"></i>
                                            ${notification.student_name}
                                        </span>
                                    ` : ''}
                                    <span class="badge bg-secondary">
                                        ${getNotificationTypeText(notification.notification_type)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = notificationsHtml;
}

// Get notification icon class
function getNotificationIconClass(type) {
    switch(type) {
        case 'skill_completed': return 'fas fa-check-circle';
        case 'skill_progress': return 'fas fa-clock';
        case 'skill_reminder': return 'fas fa-exclamation-triangle';
        default: return 'fas fa-bell';
    }
}

// Get notification icon background
function getNotificationIconBackground(type) {
    switch(type) {
        case 'skill_completed': return 'icon-completed';
        case 'skill_progress': return 'icon-progress';
        case 'skill_reminder': return 'icon-reminder';
        default: return 'icon-general';
    }
}

// Get notification card class
function getNotificationCardClass(type) {
    switch(type) {
        case 'skill_completed': return 'skill-completed';
        case 'skill_progress': return 'skill-progress';
        case 'skill_reminder': return 'skill-reminder';
        default: return '';
    }
}

// Get notification type text
function getNotificationTypeText(type) {
    switch(type) {
        case 'skill_completed': return 'مهارة مكتملة';
        case 'skill_progress': return 'تقدم في المهارة';
        case 'skill_reminder': return 'تذكير';
        default: return 'إشعار عام';
    }
}

// Update unread count
function updateUnreadCount() {
    const unreadCount = notificationsData.filter(n => !n.is_read).length;
    document.getElementById('unreadCount').textContent = unreadCount;
}

// Setup pagination
function setupPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    const list = document.getElementById('paginationList');
    
    if (pagination.pages <= 1) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    list.innerHTML = '';
    
    // Previous button
    if (pagination.has_prev) {
        list.innerHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${pagination.prev_num})">السابق</a>
            </li>
        `;
    }
    
    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        const isActive = i === pagination.page;
        list.innerHTML += `
            <li class="page-item ${isActive ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }
    
    // Next button
    if (pagination.has_next) {
        list.innerHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${pagination.next_num})">التالي</a>
            </li>
        `;
    }
}

// Change page
function changePage(page) {
    currentPage = page;
    loadNotifications();
}

// Toggle notification selection
function toggleNotificationSelection(notificationId, isSelected) {
    if (isSelected) {
        if (!selectedNotifications.includes(notificationId)) {
            selectedNotifications.push(notificationId);
        }
    } else {
        selectedNotifications = selectedNotifications.filter(id => id !== notificationId);
    }
}

// View notification details
async function viewNotificationDetails(notificationId) {
    const notification = notificationsData.find(n => n.id === notificationId);
    if (!notification) return;
    
    // Fill modal with notification data
    document.getElementById('modalTitle').textContent = notification.title;
    document.getElementById('modalMessage').textContent = notification.message;
    document.getElementById('modalDate').textContent = formatDateTime(notification.created_at);
    
    // Set icon
    const iconElement = document.querySelector('#modalIcon i');
    const iconContainer = document.getElementById('modalIcon');
    iconElement.className = getNotificationIconClass(notification.notification_type);
    iconContainer.className = `notification-icon ${getNotificationIconBackground(notification.notification_type)}`;
    
    // Load skill details if it's a skill notification
    if (notification.skill_id) {
        await loadSkillDetails(notification.skill_id, notification.student_id);
        document.getElementById('skillDetails').style.display = 'block';
    } else {
        document.getElementById('skillDetails').style.display = 'none';
    }
    
    // Store current notification ID for actions
    document.getElementById('notificationModal').dataset.notificationId = notificationId;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('notificationModal'));
    modal.show();
    
    // Mark as read if unread
    if (!notification.is_read) {
        await markNotificationAsRead(notificationId);
    }
}

// Load skill details
async function loadSkillDetails(skillId, studentId) {
    try {
        const [skillResponse, studentResponse] = await Promise.all([
            fetch(`/api/skills/${skillId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }),
            fetch(`/api/students/${studentId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
        ]);
        
        if (skillResponse.ok && studentResponse.ok) {
            const skillData = await skillResponse.json();
            const studentData = await studentResponse.json();
            
            document.getElementById('skillName').textContent = skillData.skill_name;
            document.getElementById('skillCategory').textContent = skillData.category_name || 'غير محدد';
            document.getElementById('studentName').textContent = studentData.name;
            document.getElementById('assessorName').textContent = 'المعلم'; // You can get this from assessment data
        }
    } catch (error) {
        console.error('Error loading skill details:', error);
    }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(`/api/skill-notifications/${notificationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ is_read: true })
        });
        
        if (response.ok) {
            // Update local data
            const notification = notificationsData.find(n => n.id === notificationId);
            if (notification) {
                notification.is_read = true;
            }
            updateUnreadCount();
            loadNotifications(); // Refresh the list
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Mark as read and close modal
function markAsReadAndClose() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('notificationModal'));
    modal.hide();
}

// Mark all notifications as read
async function markAllAsRead() {
    if (notificationsData.length === 0) return;
    
    try {
        const unreadIds = notificationsData.filter(n => !n.is_read).map(n => n.id);
        
        if (unreadIds.length === 0) {
            showAlert('جميع الإشعارات مقروءة بالفعل', 'info');
            return;
        }
        
        const promises = unreadIds.map(id => 
            fetch(`/api/skill-notifications/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ is_read: true })
            })
        );
        
        await Promise.all(promises);
        showAlert('تم تحديد جميع الإشعارات كمقروءة', 'success');
        loadNotifications();
    } catch (error) {
        console.error('Error marking all as read:', error);
        showAlert('خطأ في تحديد الإشعارات كمقروءة', 'danger');
    }
}

// Delete selected notifications
async function deleteSelected() {
    if (selectedNotifications.length === 0) {
        showAlert('يرجى تحديد إشعارات للحذف', 'warning');
        return;
    }
    
    if (!confirm(`هل أنت متأكد من حذف ${selectedNotifications.length} إشعار؟`)) {
        return;
    }
    
    try {
        const promises = selectedNotifications.map(id => 
            fetch(`/api/skill-notifications/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
        );
        
        await Promise.all(promises);
        showAlert('تم حذف الإشعارات المحددة', 'success');
        selectedNotifications = [];
        loadNotifications();
    } catch (error) {
        console.error('Error deleting notifications:', error);
        showAlert('خطأ في حذف الإشعارات', 'danger');
    }
}

// Refresh notifications
function refreshNotifications() {
    loadNotifications();
    showAlert('تم تحديث الإشعارات', 'success');
}

// Format date and time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'اليوم ' + date.toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } else if (diffDays === 2) {
        return 'أمس ' + date.toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } else if (diffDays <= 7) {
        return `منذ ${diffDays - 1} أيام`;
    } else {
        return date.toLocaleDateString('ar-SA') + ' ' + 
               date.toLocaleTimeString('ar-SA', { 
                   hour: '2-digit', 
                   minute: '2-digit' 
               });
    }
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
