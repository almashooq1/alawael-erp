/**
 * Family Portal Management System
 * Manages the family portal interface for Al-Awael Centers
 */

class FamilyPortalManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentTab = 'dashboard';
        this.familyMember = null;
        this.dashboardData = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboardData();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('[data-bs-toggle="pill"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                this.currentTab = e.target.getAttribute('data-bs-target').replace('#', '');
                this.loadTabContent();
            });
        });

        // Message type filter
        const messageTypeFilter = document.getElementById('messageTypeFilter');
        if (messageTypeFilter) {
            messageTypeFilter.addEventListener('change', () => {
                this.loadMessages();
            });
        }

        // Homework status filter
        const homeworkStatusFilter = document.getElementById('homeworkStatusFilter');
        if (homeworkStatusFilter) {
            homeworkStatusFilter.addEventListener('change', () => {
                this.loadHomework();
            });
        }

        // Feedback form
        const feedbackForm = document.getElementById('feedbackForm');
        if (feedbackForm) {
            feedbackForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitFeedback();
            });
        }
    }

    async loadDashboardData() {
        try {
            this.showLoading('dashboardStats');
            
            const response = await fetch('/api/family-portal/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('فشل في تحميل بيانات لوحة التحكم');
            }

            this.dashboardData = await response.json();
            this.updateDashboardStats();
            this.updateFamilyMemberName();
            
            // Load initial tab content
            this.loadTabContent();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('خطأ في تحميل البيانات: ' + error.message, 'danger');
        }
    }

    updateDashboardStats() {
        if (!this.dashboardData) return;

        const stats = this.dashboardData;
        
        // Update stat cards
        document.getElementById('unreadMessages').textContent = stats.unread_messages || 0;
        document.getElementById('pendingHomework').textContent = stats.pending_homework || 0;
        
        // Calculate days to next session
        if (stats.next_session_date) {
            const nextSession = new Date(stats.next_session_date);
            const today = new Date();
            const diffTime = nextSession - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            document.getElementById('nextSessionDays').textContent = diffDays > 0 ? diffDays : 'اليوم';
        } else {
            document.getElementById('nextSessionDays').textContent = '-';
        }
        
        // Progress score (average of latest assessments)
        document.getElementById('progressScore').textContent = stats.progress_score || '-';
    }

    updateFamilyMemberName() {
        if (this.dashboardData && this.dashboardData.family_member) {
            const name = this.dashboardData.family_member.first_name + ' ' + this.dashboardData.family_member.last_name;
            document.getElementById('familyMemberName').textContent = `مرحباً، ${name}`;
        }
    }

    loadTabContent() {
        switch (this.currentTab) {
            case 'dashboard':
                this.loadDashboardContent();
                break;
            case 'messages':
                this.loadMessages();
                break;
            case 'progress':
                this.loadProgressReports();
                break;
            case 'homework':
                this.loadHomework();
                break;
            case 'feedback':
                // Feedback form is already loaded
                break;
        }
    }

    async loadDashboardContent() {
        try {
            // Load beneficiary info
            this.loadBeneficiaryInfo();
            
            // Load upcoming sessions
            this.loadUpcomingSessions();
            
            // Load latest progress report
            this.loadLatestProgressReport();
            
        } catch (error) {
            console.error('Error loading dashboard content:', error);
            this.showAlert('خطأ في تحميل محتوى لوحة التحكم', 'danger');
        }
    }

    loadBeneficiaryInfo() {
        const container = document.getElementById('beneficiaryInfo');
        if (!this.dashboardData || !this.dashboardData.beneficiary) {
            container.innerHTML = '<p class="text-muted">لا توجد معلومات متاحة</p>';
            return;
        }

        const beneficiary = this.dashboardData.beneficiary;
        container.innerHTML = `
            <div class="d-flex align-items-center mb-3">
                <div class="bg-primary rounded-circle p-3 me-3">
                    <i class="fas fa-user text-white"></i>
                </div>
                <div>
                    <h6 class="mb-1">${beneficiary.first_name} ${beneficiary.last_name}</h6>
                    <small class="text-muted">رقم المستفيد: ${beneficiary.beneficiary_number}</small>
                </div>
            </div>
            <div class="row text-center">
                <div class="col-6">
                    <small class="text-muted d-block">العمر</small>
                    <strong>${this.calculateAge(beneficiary.date_of_birth)} سنة</strong>
                </div>
                <div class="col-6">
                    <small class="text-muted d-block">نوع الإعاقة</small>
                    <strong>${this.translateDisabilityType(beneficiary.disability_type)}</strong>
                </div>
            </div>
        `;
    }

    loadUpcomingSessions() {
        const container = document.getElementById('upcomingSessions');
        if (!this.dashboardData || !this.dashboardData.upcoming_sessions || this.dashboardData.upcoming_sessions.length === 0) {
            container.innerHTML = '<p class="text-muted">لا توجد جلسات قادمة</p>';
            return;
        }

        const sessions = this.dashboardData.upcoming_sessions.slice(0, 3); // Show only next 3 sessions
        let html = '';
        
        sessions.forEach(session => {
            const sessionDate = new Date(session.session_date + 'T' + session.start_time);
            html += `
                <div class="d-flex align-items-center mb-3 p-3 bg-light rounded">
                    <div class="bg-success rounded-circle p-2 me-3">
                        <i class="fas fa-calendar-check text-white"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${this.translateSessionType(session.session_type)}</h6>
                        <small class="text-muted">
                            ${this.formatDate(sessionDate)} - ${this.formatTime(session.start_time)}
                        </small>
                        <br>
                        <small class="text-info">
                            <i class="fas fa-user-md me-1"></i>
                            ${session.therapist_name || 'غير محدد'}
                        </small>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-${this.getSessionStatusColor(session.status)}">
                            ${this.translateSessionStatus(session.status)}
                        </span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    loadLatestProgressReport() {
        const container = document.getElementById('latestProgressReport');
        if (!this.dashboardData || !this.dashboardData.latest_progress_report) {
            container.innerHTML = '<p class="text-muted">لا توجد تقارير تقدم متاحة</p>';
            return;
        }

        const report = this.dashboardData.latest_progress_report;
        container.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h6 class="mb-2">تقرير التقدم - ${this.formatDate(new Date(report.report_date))}</h6>
                    <p class="text-muted mb-2">${report.summary || 'لا يوجد ملخص متاح'}</p>
                    <div class="mb-2">
                        <small class="text-muted">التوصيات:</small>
                        <p class="mb-0">${report.recommendations || 'لا توجد توصيات'}</p>
                    </div>
                </div>
                <div class="col-md-4 text-center">
                    <div class="progress-circle mx-auto mb-2 d-flex align-items-center justify-content-center bg-primary text-white rounded-circle">
                        <span class="h4 mb-0">${report.overall_score || 0}%</span>
                    </div>
                    <small class="text-muted">النتيجة الإجمالية</small>
                </div>
            </div>
        `;
    }

    async loadMessages() {
        try {
            this.showLoading('messagesList');
            
            const messageType = document.getElementById('messageTypeFilter').value;
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.itemsPerPage
            });
            
            if (messageType) {
                params.append('message_type', messageType);
            }

            const response = await fetch(`/api/family-portal/messages?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('فشل في تحميل الرسائل');
            }

            const data = await response.json();
            this.renderMessages(data.messages);
            this.renderPagination('messagesList', data.pagination);

        } catch (error) {
            console.error('Error loading messages:', error);
            document.getElementById('messagesList').innerHTML = 
                '<div class="alert alert-danger">خطأ في تحميل الرسائل</div>';
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesList');
        
        if (!messages || messages.length === 0) {
            container.innerHTML = '<div class="alert alert-info">لا توجد رسائل</div>';
            return;
        }

        let html = '';
        messages.forEach(message => {
            const isUnread = !message.is_read;
            html += `
                <div class="message-item p-3 mb-3 border rounded ${isUnread ? 'unread' : ''}" 
                     onclick="this.markMessageAsRead(${message.id})">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-1">
                            ${message.subject}
                            ${isUnread ? '<span class="badge bg-warning ms-2">جديد</span>' : ''}
                        </h6>
                        <small class="text-muted">${this.formatDate(new Date(message.sent_date))}</small>
                    </div>
                    <p class="mb-2 text-muted">${message.content}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-info">
                            <i class="fas fa-tag me-1"></i>
                            ${this.translateMessageType(message.message_type)}
                        </small>
                        <small class="text-muted">
                            من: ${message.sender_name || 'النظام'}
                        </small>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    async markMessageAsRead(messageId) {
        try {
            const response = await fetch(`/api/family-portal/messages/${messageId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Refresh messages and dashboard stats
                this.loadMessages();
                this.loadDashboardData();
            }
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    async loadProgressReports() {
        try {
            this.showLoading('progressReportsList');
            
            const response = await fetch('/api/family-portal/progress-reports', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('فشل في تحميل تقارير التقدم');
            }

            const data = await response.json();
            this.renderProgressReports(data.reports);

        } catch (error) {
            console.error('Error loading progress reports:', error);
            document.getElementById('progressReportsList').innerHTML = 
                '<div class="alert alert-danger">خطأ في تحميل تقارير التقدم</div>';
        }
    }

    renderProgressReports(reports) {
        const container = document.getElementById('progressReportsList');
        
        if (!reports || reports.length === 0) {
            container.innerHTML = '<div class="alert alert-info">لا توجد تقارير تقدم متاحة</div>';
            return;
        }

        let html = '';
        reports.forEach(report => {
            html += `
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">تقرير التقدم - ${this.formatDate(new Date(report.report_date))}</h6>
                        <span class="badge bg-primary">${report.overall_score || 0}%</span>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <h6>الملخص:</h6>
                                <p class="text-muted">${report.summary || 'لا يوجد ملخص'}</p>
                                
                                <h6>التوصيات:</h6>
                                <p class="text-muted">${report.recommendations || 'لا توجد توصيات'}</p>
                                
                                ${report.next_goals ? `
                                <h6>الأهداف القادمة:</h6>
                                <p class="text-muted">${report.next_goals}</p>
                                ` : ''}
                            </div>
                            <div class="col-md-4">
                                <h6>تفاصيل النتائج:</h6>
                                ${report.detailed_scores ? this.renderDetailedScores(report.detailed_scores) : 'لا توجد تفاصيل'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    renderDetailedScores(scores) {
        let html = '';
        Object.entries(scores).forEach(([skill, score]) => {
            html += `
                <div class="d-flex justify-content-between mb-2">
                    <small>${skill}:</small>
                    <strong>${score}%</strong>
                </div>
            `;
        });
        return html;
    }

    async loadHomework() {
        try {
            this.showLoading('homeworkList');
            
            const status = document.getElementById('homeworkStatusFilter').value;
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.itemsPerPage
            });
            
            if (status && status !== 'all') {
                params.append('status', status);
            }

            const response = await fetch(`/api/family-portal/homework?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('فشل في تحميل الواجبات');
            }

            const data = await response.json();
            this.renderHomework(data.homework);
            this.renderPagination('homeworkList', data.pagination);

        } catch (error) {
            console.error('Error loading homework:', error);
            document.getElementById('homeworkList').innerHTML = 
                '<div class="alert alert-danger">خطأ في تحميل الواجبات</div>';
        }
    }

    renderHomework(homework) {
        const container = document.getElementById('homeworkList');
        
        if (!homework || homework.length === 0) {
            container.innerHTML = '<div class="alert alert-info">لا توجد واجبات منزلية</div>';
            return;
        }

        let html = '';
        homework.forEach(hw => {
            const isOverdue = new Date(hw.due_date) < new Date() && hw.status === 'pending';
            const statusColor = hw.status === 'completed' ? 'success' : (isOverdue ? 'danger' : 'warning');
            
            html += `
                <div class="homework-item p-3 mb-3 border rounded ${isOverdue ? 'overdue' : ''}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-1">${hw.title}</h6>
                        <span class="badge bg-${statusColor}">
                            ${this.translateHomeworkStatus(hw.status)}
                        </span>
                    </div>
                    <p class="mb-2 text-muted">${hw.description}</p>
                    <div class="row">
                        <div class="col-md-6">
                            <small class="text-muted">تاريخ الاستحقاق: ${this.formatDate(new Date(hw.due_date))}</small>
                        </div>
                        <div class="col-md-6 text-end">
                            ${hw.status === 'pending' ? `
                                <button class="btn btn-sm btn-success" onclick="familyPortal.markHomeworkComplete(${hw.id})">
                                    <i class="fas fa-check me-1"></i>تم الإنجاز
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    ${hw.family_feedback ? `
                        <div class="mt-2 p-2 bg-light rounded">
                            <small class="text-muted">ملاحظات الأسرة:</small>
                            <p class="mb-0">${hw.family_feedback}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    async markHomeworkComplete(homeworkId) {
        try {
            const feedback = prompt('ملاحظات حول إنجاز الواجب (اختياري):');
            
            const response = await fetch(`/api/family-portal/homework/${homeworkId}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    family_feedback: feedback
                })
            });

            if (!response.ok) {
                throw new Error('فشل في تحديث حالة الواجب');
            }

            this.showAlert('تم تحديث حالة الواجب بنجاح', 'success');
            this.loadHomework();
            this.loadDashboardData();

        } catch (error) {
            console.error('Error marking homework complete:', error);
            this.showAlert('خطأ في تحديث حالة الواجب', 'danger');
        }
    }

    async submitFeedback() {
        try {
            const formData = {
                feedback_type: document.getElementById('feedbackType').value,
                overall_rating: parseInt(document.getElementById('overallRating').value),
                communication_rating: document.getElementById('communicationRating').value ? 
                    parseInt(document.getElementById('communicationRating').value) : null,
                professionalism_rating: document.getElementById('professionalismRating').value ? 
                    parseInt(document.getElementById('professionalismRating').value) : null,
                positive_feedback: document.getElementById('positiveFeedback').value,
                improvement_areas: document.getElementById('improvementAreas').value,
                suggestions: document.getElementById('suggestions').value,
                is_anonymous: document.getElementById('anonymousFeedback').checked
            };

            const response = await fetch('/api/family-portal/feedback', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('فشل في إرسال التقييم');
            }

            this.showAlert('تم إرسال التقييم بنجاح. شكراً لك!', 'success');
            document.getElementById('feedbackForm').reset();

        } catch (error) {
            console.error('Error submitting feedback:', error);
            this.showAlert('خطأ في إرسال التقييم: ' + error.message, 'danger');
        }
    }

    // Utility methods
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                </div>
            `;
        }
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert-' + Date.now();
        
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.insertAdjacentHTML('beforeend', alertHtml);
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }

    renderPagination(containerId, pagination) {
        if (!pagination || pagination.pages <= 1) return;
        
        const container = document.getElementById(containerId);
        let paginationHtml = '<nav class="mt-3"><ul class="pagination justify-content-center">';
        
        // Previous button
        paginationHtml += `
            <li class="page-item ${pagination.page <= 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="familyPortal.changePage(${pagination.page - 1})">السابق</a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            paginationHtml += `
                <li class="page-item ${i === pagination.page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="familyPortal.changePage(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHtml += `
            <li class="page-item ${pagination.page >= pagination.pages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="familyPortal.changePage(${pagination.page + 1})">التالي</a>
            </li>
        `;
        
        paginationHtml += '</ul></nav>';
        container.insertAdjacentHTML('beforeend', paginationHtml);
    }

    changePage(page) {
        this.currentPage = page;
        this.loadTabContent();
    }

    calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    formatDate(date) {
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const time = new Date();
        time.setHours(parseInt(hours), parseInt(minutes));
        
        return time.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    translateDisabilityType(type) {
        const translations = {
            'physical': 'حركية',
            'intellectual': 'ذهنية',
            'sensory': 'حسية',
            'speech': 'نطقية',
            'autism': 'طيف التوحد',
            'learning': 'صعوبات تعلم',
            'multiple': 'متعددة'
        };
        return translations[type] || type;
    }

    translateSessionType(type) {
        const translations = {
            'individual': 'فردية',
            'group': 'جماعية',
            'assessment': 'تقييم',
            'consultation': 'استشارة',
            'family_session': 'جلسة عائلية'
        };
        return translations[type] || type;
    }

    translateSessionStatus(status) {
        const translations = {
            'scheduled': 'مجدولة',
            'confirmed': 'مؤكدة',
            'in_progress': 'جارية',
            'completed': 'مكتملة',
            'cancelled': 'ملغية',
            'no_show': 'لم يحضر'
        };
        return translations[status] || status;
    }

    getSessionStatusColor(status) {
        const colors = {
            'scheduled': 'primary',
            'confirmed': 'success',
            'in_progress': 'warning',
            'completed': 'success',
            'cancelled': 'danger',
            'no_show': 'secondary'
        };
        return colors[status] || 'secondary';
    }

    translateMessageType(type) {
        const translations = {
            'progress_update': 'تحديث التقدم',
            'appointment_reminder': 'تذكير موعد',
            'general_info': 'معلومات عامة',
            'homework_assignment': 'واجب منزلي',
            'emergency': 'طارئ'
        };
        return translations[type] || type;
    }

    translateHomeworkStatus(status) {
        const translations = {
            'pending': 'معلق',
            'completed': 'مكتمل',
            'overdue': 'متأخر'
        };
        return translations[status] || status;
    }

    startAutoRefresh() {
        // Refresh dashboard data every 5 minutes
        setInterval(() => {
            if (this.currentTab === 'dashboard') {
                this.loadDashboardData();
            }
        }, 5 * 60 * 1000);
    }
}

// Logout function
function logout() {
    localStorage.removeItem('family_token');
    window.location.href = '/family-login';
}

// Initialize the family portal manager when the page loads
let familyPortal;
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = localStorage.getItem('family_token');
    if (!token) {
        window.location.href = '/family-login';
        return;
    }
    
    familyPortal = new FamilyPortalManager();
});
