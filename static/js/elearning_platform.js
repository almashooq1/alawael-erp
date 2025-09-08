class ELearningManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.currentFilters = {};
        this.charts = {};
        this.init();
    }

    init() {
        this.loadDashboard();
        this.loadCategories();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab change events
        document.querySelectorAll('#elearningTabs button').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                if (target === '#analytics') {
                    this.loadAnalytics();
                } else if (target === '#enrollments') {
                    this.loadEnrollments();
                }
            });
        });
    }

    async loadDashboard() {
        try {
            this.showLoading(true);
            const response = await this.makeRequest('/api/elearning/dashboard');
            
            if (response.success) {
                this.updateStatistics(response.data);
                this.loadCourses();
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل لوحة التحكم', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    updateStatistics(data) {
        document.getElementById('totalCourses').textContent = data.total_courses || 0;
        document.getElementById('totalStudents').textContent = data.total_students || 0;
        document.getElementById('totalEnrollments').textContent = data.total_enrollments || 0;
        document.getElementById('completionRate').textContent = `${data.completion_rate || 0}%`;
    }

    async loadCourses(page = 1) {
        try {
            const params = new URLSearchParams({
                page: page,
                per_page: this.itemsPerPage,
                ...this.currentFilters
            });

            const response = await this.makeRequest(`/api/elearning/courses?${params}`);
            
            if (response.success) {
                this.renderCourses(response.data.courses);
                this.renderPagination(response.data.pagination, 'coursesPagination');
                this.loadPopularCourses();
                this.loadCoursesCategoryChart();
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل الدورات', 'error');
        }
    }

    renderCourses(courses) {
        const container = document.getElementById('coursesList');
        
        if (!courses || courses.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-book fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد دورات متاحة</h5>
                </div>
            `;
            return;
        }

        container.innerHTML = courses.map(course => `
            <div class="col-md-4 mb-4">
                <div class="card course-card h-100">
                    <div class="course-image position-relative">
                        <i class="fas fa-graduation-cap"></i>
                        <span class="badge bg-primary difficulty-badge">
                            ${this.getDifficultyLabel(course.difficulty_level)}
                        </span>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${course.title}</h6>
                        <p class="card-text text-muted small">${course.description || 'لا يوجد وصف'}</p>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge bg-secondary">${course.category_name || 'غير محدد'}</span>
                            <div class="rating-stars">
                                ${this.renderStars(course.average_rating || 0)}
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-users me-1"></i>${course.enrolled_count || 0} طالب
                            </small>
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>${course.duration_hours || 0} ساعة
                            </small>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold text-primary">
                                ${course.is_free ? 'مجاني' : `${course.price} ريال`}
                            </span>
                            <button class="btn btn-outline-primary btn-sm" onclick="elearning.showCourseDetails(${course.id})">
                                عرض التفاصيل
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadCategories() {
        try {
            const response = await this.makeRequest('/api/elearning/categories');
            
            if (response.success) {
                this.renderCategories(response.data);
                this.populateCategorySelects(response.data);
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل الفئات', 'error');
        }
    }

    renderCategories(categories) {
        const container = document.getElementById('categoriesList');
        
        if (!categories || categories.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-tags fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">لا توجد فئات متاحة</h5>
                </div>
            `;
            return;
        }

        container.innerHTML = categories.map(category => `
            <div class="col-md-3 mb-3">
                <div class="card category-card" onclick="elearning.filterByCategory(${category.id})">
                    <div class="card-body">
                        <i class="fas fa-folder fa-2x text-primary mb-3"></i>
                        <h6>${category.name}</h6>
                        <p class="text-muted small">${category.description || 'لا يوجد وصف'}</p>
                        <span class="badge bg-light text-dark">${category.course_count || 0} دورة</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    populateCategorySelects(categories) {
        const selects = ['categoryFilter', 'courseCategorySelect'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const options = categories.map(cat => 
                    `<option value="${cat.id}">${cat.name}</option>`
                ).join('');
                
                if (selectId === 'categoryFilter') {
                    select.innerHTML = '<option value="">جميع الفئات</option>' + options;
                } else {
                    select.innerHTML = '<option value="">اختر الفئة</option>' + options;
                }
            }
        });
    }

    async showCourseDetails(courseId) {
        try {
            this.showLoading(true);
            const response = await this.makeRequest(`/api/elearning/courses/${courseId}`);
            
            if (response.success) {
                this.renderCourseDetails(response.data);
                new bootstrap.Modal(document.getElementById('courseDetailsModal')).show();
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل تفاصيل الدورة', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    renderCourseDetails(course) {
        document.getElementById('courseDetailsTitle').textContent = course.title;
        
        const content = document.getElementById('courseDetailsContent');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h6>وصف الدورة</h6>
                    <p>${course.description || 'لا يوجد وصف متاح'}</p>
                    
                    <h6 class="mt-4">الدروس</h6>
                    <div id="courseLessons">
                        ${this.renderLessons(course.lessons || [])}
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body">
                            <h6>معلومات الدورة</h6>
                            <ul class="list-unstyled">
                                <li><strong>الفئة:</strong> ${course.category_name || 'غير محدد'}</li>
                                <li><strong>المستوى:</strong> ${this.getDifficultyLabel(course.difficulty_level)}</li>
                                <li><strong>المدة:</strong> ${course.duration_hours || 0} ساعة</li>
                                <li><strong>السعر:</strong> ${course.is_free ? 'مجاني' : `${course.price} ريال`}</li>
                                <li><strong>المسجلين:</strong> ${course.enrolled_count || 0} طالب</li>
                                <li><strong>التقييم:</strong> ${this.renderStars(course.average_rating || 0)}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Store course ID for enrollment
        document.getElementById('enrollButton').setAttribute('data-course-id', course.id);
    }

    renderLessons(lessons) {
        if (!lessons || lessons.length === 0) {
            return '<p class="text-muted">لا توجد دروس متاحة</p>';
        }

        return lessons.map(lesson => `
            <div class="lesson-item">
                <div class="d-flex align-items-center">
                    <div class="lesson-type-icon ${lesson.lesson_type}-lesson me-3">
                        <i class="fas fa-${this.getLessonIcon(lesson.lesson_type)}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${lesson.title}</h6>
                        <small class="text-muted">${lesson.description || 'لا يوجد وصف'}</small>
                    </div>
                    <div class="text-end">
                        <small class="text-muted">${lesson.duration_minutes || 0} دقيقة</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async createCourse() {
        try {
            const form = document.getElementById('createCourseForm');
            const formData = new FormData(form);
            
            const courseData = {
                title: formData.get('title'),
                course_code: formData.get('course_code'),
                description: formData.get('description'),
                category_id: parseInt(formData.get('category_id')),
                difficulty_level: formData.get('difficulty_level'),
                duration_hours: parseInt(formData.get('duration_hours')) || 0,
                price: parseFloat(formData.get('price')) || 0,
                is_free: formData.get('is_free') === 'on',
                start_date: formData.get('start_date'),
                end_date: formData.get('end_date')
            };

            this.showLoading(true);
            const response = await this.makeRequest('/api/elearning/courses', 'POST', courseData);
            
            if (response.success) {
                this.showAlert('تم إنشاء الدورة بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('createCourseModal')).hide();
                form.reset();
                this.loadCourses();
                this.loadDashboard();
            }
        } catch (error) {
            this.showAlert('خطأ في إنشاء الدورة', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async enrollInCourse() {
        try {
            const courseId = document.getElementById('enrollButton').getAttribute('data-course-id');
            
            this.showLoading(true);
            const response = await this.makeRequest(`/api/elearning/courses/${courseId}/enroll`, 'POST');
            
            if (response.success) {
                this.showAlert('تم التسجيل في الدورة بنجاح', 'success');
                bootstrap.Modal.getInstance(document.getElementById('courseDetailsModal')).hide();
                this.loadDashboard();
            }
        } catch (error) {
            this.showAlert('خطأ في التسجيل', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    filterCourses() {
        const category = document.getElementById('categoryFilter').value;
        const difficulty = document.getElementById('difficultyFilter').value;
        
        this.currentFilters = {};
        if (category) this.currentFilters.category_id = category;
        if (difficulty) this.currentFilters.difficulty_level = difficulty;
        
        this.currentPage = 1;
        this.loadCourses(1);
    }

    searchCourses() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        
        if (searchTerm) {
            this.currentFilters.search = searchTerm;
        } else {
            delete this.currentFilters.search;
        }
        
        this.currentPage = 1;
        this.loadCourses(1);
    }

    filterByCategory(categoryId) {
        document.getElementById('categoryFilter').value = categoryId;
        this.filterCourses();
        
        // Switch to courses tab
        const coursesTab = document.getElementById('courses-tab');
        bootstrap.Tab.getInstance(coursesTab).show();
    }

    // Utility methods
    getDifficultyLabel(level) {
        const labels = {
            'beginner': 'مبتدئ',
            'intermediate': 'متوسط',
            'advanced': 'متقدم'
        };
        return labels[level] || 'غير محدد';
    }

    getLessonIcon(type) {
        const icons = {
            'video': 'play',
            'text': 'file-text',
            'quiz': 'question-circle',
            'interactive': 'gamepad'
        };
        return icons[type] || 'book';
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '';
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    renderPagination(pagination, containerId) {
        const container = document.getElementById(containerId);
        if (!container || !pagination) return;

        const { current_page, total_pages, has_prev, has_next } = pagination;
        
        if (total_pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<ul class="pagination justify-content-center">';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${!has_prev ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="elearning.loadCourses(${current_page - 1}); return false;">السابق</a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, current_page - 2);
        const endPage = Math.min(total_pages, current_page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === current_page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="elearning.loadCourses(${i}); return false;">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${!has_next ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="elearning.loadCourses(${current_page + 1}); return false;">التالي</a>
            </li>
        `;
        
        paginationHTML += '</ul>';
        container.innerHTML = paginationHTML;
    }

    async makeRequest(url, method = 'GET', data = null) {
        const token = localStorage.getItem('token');
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return await response.json();
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.toggle('d-none', !show);
        }
    }

    showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    refreshDashboard() {
        this.loadDashboard();
    }

    showCreateCourseModal() {
        new bootstrap.Modal(document.getElementById('createCourseModal')).show();
    }

    showCreateCategoryModal() {
        // Implementation for category creation modal
        this.showAlert('ميزة إضافة الفئات قيد التطوير', 'info');
    }

    async loadPopularCourses() {
        // Implementation for loading popular courses
    }

    async loadCoursesCategoryChart() {
        // Implementation for category distribution chart
    }

    async loadEnrollments() {
        // Implementation for loading enrollments
    }

    async loadAnalytics() {
        // Implementation for loading analytics charts
    }
}
