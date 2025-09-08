// نظام إدارة الأنشطة والفعاليات
class ActivitiesManager {
    constructor() {
        this.activities = [];
        this.participants = [];
        this.init();
    }

    init() {
        this.loadActivities();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            setInterval(() => {
                if (document.getElementById('activities').style.display !== 'none') {
                    this.loadActivities();
                }
            }, 60000);
        });
    }

    async loadActivities() {
        try {
            const response = await fetch('/api/activities', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.activities = data.activities;
                this.renderActivities();
                this.updateActivitiesStats();
            }
        } catch (error) {
            console.error('خطأ في تحميل الأنشطة:', error);
        }
    }

    renderActivities() {
        const tbody = document.getElementById('activitiesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.activities.forEach(activity => {
            const row = document.createElement('tr');
            const isUpcoming = new Date(activity.start_date) > new Date();
            const isActive = new Date(activity.start_date) <= new Date() && new Date(activity.end_date) >= new Date();
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-${this.getActivityIcon(activity.activity_type)} me-2"></i>
                        <div>
                            <strong>${activity.title}</strong>
                            <br>
                            <small class="text-muted">${activity.description || 'لا يوجد وصف'}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-${this.getActivityTypeColor(activity.activity_type)}">
                        ${this.getActivityTypeText(activity.activity_type)}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${this.getActivityStatusColor(activity.status)}">
                        ${this.getActivityStatusText(activity.status)}
                    </span>
                </td>
                <td>${new Date(activity.start_date).toLocaleDateString('ar-SA')}</td>
                <td>${new Date(activity.end_date).toLocaleDateString('ar-SA')}</td>
                <td>${activity.location || 'غير محدد'}</td>
                <td>${activity.max_participants || 'غير محدود'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="activitiesManager.viewActivity(${activity.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="activitiesManager.manageParticipants(${activity.id})">
                            <i class="fas fa-users"></i>
                        </button>
                        ${isUpcoming ? `
                            <button class="btn btn-outline-warning" onclick="activitiesManager.editActivity(${activity.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateActivitiesStats() {
        const total = this.activities.length;
        const upcoming = this.activities.filter(a => new Date(a.start_date) > new Date()).length;
        const active = this.activities.filter(a => 
            new Date(a.start_date) <= new Date() && new Date(a.end_date) >= new Date()
        ).length;
        const completed = this.activities.filter(a => new Date(a.end_date) < new Date()).length;

        document.getElementById('totalActivities').textContent = total;
        document.getElementById('upcomingActivities').textContent = upcoming;
        document.getElementById('activeActivities').textContent = active;
        document.getElementById('completedActivities').textContent = completed;
    }

    getActivityIcon(type) {
        const icons = {
            'educational': 'graduation-cap',
            'recreational': 'gamepad',
            'sports': 'futbol',
            'cultural': 'theater-masks',
            'field_trip': 'bus',
            'workshop': 'tools',
            'other': 'calendar-plus'
        };
        return icons[type] || 'calendar-plus';
    }

    getActivityTypeColor(type) {
        const colors = {
            'educational': 'primary',
            'recreational': 'success',
            'sports': 'warning',
            'cultural': 'info',
            'field_trip': 'secondary',
            'workshop': 'dark',
            'other': 'light'
        };
        return colors[type] || 'secondary';
    }

    getActivityTypeText(type) {
        const texts = {
            'educational': 'تعليمي',
            'recreational': 'ترفيهي',
            'sports': 'رياضي',
            'cultural': 'ثقافي',
            'field_trip': 'رحلة',
            'workshop': 'ورشة عمل',
            'other': 'أخرى'
        };
        return texts[type] || 'غير محدد';
    }

    getActivityStatusColor(status) {
        const colors = {
            'planned': 'secondary',
            'active': 'success',
            'completed': 'primary',
            'cancelled': 'danger'
        };
        return colors[status] || 'secondary';
    }

    getActivityStatusText(status) {
        const texts = {
            'planned': 'مخطط',
            'active': 'نشط',
            'completed': 'مكتمل',
            'cancelled': 'ملغي'
        };
        return texts[status] || 'غير محدد';
    }

    async viewActivity(activityId) {
        try {
            const response = await fetch(`/api/activities/${activityId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const activity = await response.json();
                this.showActivityModal(activity);
            }
        } catch (error) {
            console.error('خطأ في عرض النشاط:', error);
        }
    }

    showActivityModal(activity) {
        const modalHtml = `
            <div class="modal fade" id="activityModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-${this.getActivityIcon(activity.activity_type)} me-2"></i>
                                ${activity.title}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <p><strong>النوع:</strong> 
                                        <span class="badge bg-${this.getActivityTypeColor(activity.activity_type)}">
                                            ${this.getActivityTypeText(activity.activity_type)}
                                        </span>
                                    </p>
                                    <p><strong>الحالة:</strong> 
                                        <span class="badge bg-${this.getActivityStatusColor(activity.status)}">
                                            ${this.getActivityStatusText(activity.status)}
                                        </span>
                                    </p>
                                    <p><strong>الموقع:</strong> ${activity.location || 'غير محدد'}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>تاريخ البداية:</strong> ${new Date(activity.start_date).toLocaleString('ar-SA')}</p>
                                    <p><strong>تاريخ النهاية:</strong> ${new Date(activity.end_date).toLocaleString('ar-SA')}</p>
                                    <p><strong>الحد الأقصى للمشاركين:</strong> ${activity.max_participants || 'غير محدود'}</p>
                                </div>
                            </div>
                            
                            ${activity.description ? `
                                <div class="mb-3">
                                    <h6>الوصف:</h6>
                                    <p>${activity.description}</p>
                                </div>
                            ` : ''}
                            
                            ${activity.requirements ? `
                                <div class="mb-3">
                                    <h6>المتطلبات:</h6>
                                    <p>${activity.requirements}</p>
                                </div>
                            ` : ''}
                            
                            ${activity.participants && activity.participants.length > 0 ? `
                                <div class="mb-3">
                                    <h6>المشاركون (${activity.participants.length}):</h6>
                                    <div class="row">
                                        ${activity.participants.map(participant => `
                                            <div class="col-md-6 mb-2">
                                                <div class="d-flex align-items-center">
                                                    <div class="profile-placeholder me-2">
                                                        ${participant.student.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <strong>${participant.student.name}</strong>
                                                        <br>
                                                        <small class="text-muted">
                                                            ${participant.registration_date ? 
                                                                'مسجل في: ' + new Date(participant.registration_date).toLocaleDateString('ar-SA') : 
                                                                'غير مسجل'
                                                            }
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : '<p class="text-muted">لا يوجد مشاركون مسجلون بعد</p>'}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-success" onclick="activitiesManager.manageParticipants(${activity.id})">
                                <i class="fas fa-users me-2"></i>إدارة المشاركين
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('activityModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('activityModal'));
        modal.show();
    }

    manageParticipants(activityId) {
        // سيتم تنفيذه لاحقاً - فتح modal إدارة المشاركين
        console.log('إدارة المشاركين للنشاط:', activityId);
    }

    editActivity(activityId) {
        // سيتم تنفيذه لاحقاً - فتح modal التعديل
        console.log('تعديل النشاط:', activityId);
    }

    // فلترة الأنشطة
    filterActivities() {
        const typeFilter = document.getElementById('activityTypeFilter').value;
        const statusFilter = document.getElementById('activityStatusFilter').value;
        const searchTerm = document.getElementById('activitySearch').value.toLowerCase();

        let filteredActivities = this.activities;

        if (typeFilter) {
            filteredActivities = filteredActivities.filter(a => a.activity_type === typeFilter);
        }

        if (statusFilter) {
            filteredActivities = filteredActivities.filter(a => a.status === statusFilter);
        }

        if (searchTerm) {
            filteredActivities = filteredActivities.filter(a => 
                a.title.toLowerCase().includes(searchTerm) || 
                (a.description && a.description.toLowerCase().includes(searchTerm))
            );
        }

        const originalActivities = this.activities;
        this.activities = filteredActivities;
        this.renderActivities();
        this.activities = originalActivities;
    }

    // إضافة نشاط جديد
    async addActivity(activityData) {
        try {
            const response = await fetch('/api/activities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(activityData)
            });
            
            if (response.ok) {
                this.loadActivities();
                showAlert('تم إضافة النشاط بنجاح', 'success');
                return true;
            }
        } catch (error) {
            console.error('خطأ في إضافة النشاط:', error);
            showAlert('حدث خطأ في إضافة النشاط', 'error');
            return false;
        }
    }
}

// إنشاء مثيل عام
const activitiesManager = new ActivitiesManager();

// دالة مساعدة للتنقل
function showActivitiesSection() {
    hideAllSections();
    document.getElementById('activities').style.display = 'block';
    activitiesManager.loadActivities();
}
