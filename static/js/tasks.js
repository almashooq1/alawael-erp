// نظام إدارة المهام وإسناد الأعمال
const tasksManager = {
    currentTask: null,
    tasks: [],
    categories: [],
    templates: [],
    users: [],
    currentView: 'my-tasks',

    // تهيئة النظام
    init() {
        this.loadUsers();
        this.loadCategories();
        this.loadTemplates();
        this.loadTasks();
        this.updateStats();
        this.setupEventListeners();
    },

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        document.getElementById('search-tasks').addEventListener('input', (e) => {
            this.searchTasks(e.target.value);
        });

        document.getElementById('status-filter').addEventListener('change', () => {
            this.filterTasks();
        });

        document.getElementById('priority-filter').addEventListener('change', () => {
            this.filterTasks();
        });

        document.getElementById('category-filter').addEventListener('change', () => {
            this.filterTasks();
        });

        document.querySelectorAll('.nav-link[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(e.target.dataset.view);
            });
        });
    },

    // تحميل المستخدمين
    async loadUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.users = await response.json();
                this.populateUserSelects();
            }
        } catch (error) {
            console.error('خطأ في تحميل المستخدمين:', error);
        }
    },

    // ملء قوائم المستخدمين
    populateUserSelects() {
        const assigneeSelect = document.getElementById('task-assignee');
        assigneeSelect.innerHTML = '<option value="">اختر المسؤول</option>';

        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.full_name} (${user.username})`;
            assigneeSelect.appendChild(option);
        });
    },

    // تحميل الفئات
    async loadCategories() {
        try {
            const response = await fetch('/api/task-categories', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.categories = await response.json();
                this.populateCategorySelects();
                this.renderCategories();
            }
        } catch (error) {
            console.error('خطأ في تحميل الفئات:', error);
        }
    },

    // ملء قوائم الفئات
    populateCategorySelects() {
        const categorySelect = document.getElementById('task-category');
        const filterSelect = document.getElementById('category-filter');
        
        categorySelect.innerHTML = '<option value="">اختر الفئة</option>';
        filterSelect.innerHTML = '<option value="">جميع الفئات</option>';

        this.categories.forEach(category => {
            const option1 = document.createElement('option');
            option1.value = category.id;
            option1.textContent = category.name;
            categorySelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = category.id;
            option2.textContent = category.name;
            filterSelect.appendChild(option2);
        });
    },

    // تحميل القوالب
    async loadTemplates() {
        try {
            const response = await fetch('/api/task-templates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.templates = await response.json();
                this.renderTemplates();
            }
        } catch (error) {
            console.error('خطأ في تحميل القوالب:', error);
        }
    },

    // تحميل المهام
    async loadTasks(view = this.currentView) {
        try {
            let endpoint = '/api/tasks';
            const params = new URLSearchParams();

            if (view === 'my-tasks') {
                params.append('assigned_to_me', 'true');
            } else if (view === 'assigned-by-me') {
                params.append('assigned_by_me', 'true');
            }

            const response = await fetch(`${endpoint}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.tasks = await response.json();
                this.renderTasks();
                this.updateStats();
            }
        } catch (error) {
            console.error('خطأ في تحميل المهام:', error);
            this.showError('فشل في تحميل المهام');
        }
    },

    // عرض المهام
    renderTasks() {
        const container = document.getElementById('tasks-list');
        container.innerHTML = '';

        if (this.tasks.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4 text-muted">
                    <i class="fas fa-tasks fa-2x mb-2"></i>
                    <p>لا توجد مهام</p>
                </div>
            `;
            return;
        }

        this.tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            container.appendChild(taskElement);
        });
    },

    // إنشاء عنصر المهمة
    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = 'card mb-3 task-card';
        div.onclick = () => this.selectTask(task.id);

        const statusColor = {
            'pending': 'warning',
            'in_progress': 'info',
            'completed': 'success',
            'cancelled': 'danger',
            'on_hold': 'secondary'
        }[task.status] || 'secondary';

        const priorityColor = {
            'urgent': 'danger',
            'high': 'warning',
            'medium': 'info',
            'low': 'success'
        }[task.priority] || 'info';

        const dueDateClass = task.due_date && new Date(task.due_date) < new Date() ? 'text-danger' : 'text-muted';
        const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('ar-SA') : 'غير محدد';

        div.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="card-title mb-0">${task.title}</h6>
                    <div class="d-flex gap-1">
                        <span class="badge bg-${statusColor}">${this.getStatusText(task.status)}</span>
                        <span class="badge bg-${priorityColor}">${this.getPriorityText(task.priority)}</span>
                    </div>
                </div>
                
                <p class="card-text text-muted small mb-2">${task.description || 'لا يوجد وصف'}</p>
                
                <div class="row text-small">
                    <div class="col-md-6">
                        <small class="text-muted">
                            <i class="fas fa-user"></i> ${task.assignee ? task.assignee.full_name : 'غير مسند'}
                        </small>
                    </div>
                    <div class="col-md-6">
                        <small class="${dueDateClass}">
                            <i class="fas fa-calendar"></i> ${dueDate}
                        </small>
                    </div>
                </div>
                
                ${task.progress !== null ? `
                    <div class="mt-2">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <small class="text-muted">التقدم</small>
                            <small class="text-muted">${task.progress}%</small>
                        </div>
                        <div class="progress" style="height: 5px;">
                            <div class="progress-bar" role="progressbar" style="width: ${task.progress}%"></div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="mt-2 d-flex justify-content-between align-items-center">
                    <div class="d-flex gap-1">
                        ${task.category ? `<span class="badge bg-light text-dark">${task.category.name}</span>` : ''}
                        ${task.comments_count > 0 ? `<small class="text-muted"><i class="fas fa-comments"></i> ${task.comments_count}</small>` : ''}
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); tasksManager.editTask(${task.id})" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="event.stopPropagation(); tasksManager.updateTaskStatus(${task.id})" title="تحديث الحالة">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        return div;
    },

    // اختيار مهمة
    selectTask(taskId) {
        this.currentTask = this.tasks.find(t => t.id === taskId);
        if (!this.currentTask) return;
        this.showTaskDetails();
    },

    // عرض تفاصيل المهمة
    showTaskDetails() {
        if (!this.currentTask) return;

        const modal = new bootstrap.Modal(document.getElementById('taskDetailsModal'));
        const content = document.getElementById('task-details-content');

        const dueDate = this.currentTask.due_date ? 
            new Date(this.currentTask.due_date).toLocaleDateString('ar-SA') : 'غير محدد';

        content.innerHTML = `
            <div class="mb-3">
                <h5>${this.currentTask.title}</h5>
                <div class="d-flex gap-2 mb-2">
                    <span class="badge bg-${this.getStatusColor(this.currentTask.status)}">${this.getStatusText(this.currentTask.status)}</span>
                    <span class="badge bg-${this.getPriorityColor(this.currentTask.priority)}">${this.getPriorityText(this.currentTask.priority)}</span>
                </div>
            </div>
            
            <div class="mb-3">
                <strong>الوصف:</strong>
                <p class="text-muted">${this.currentTask.description || 'لا يوجد وصف'}</p>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>المسؤول:</strong> ${this.currentTask.assignee ? this.currentTask.assignee.full_name : 'غير مسند'}
                </div>
                <div class="col-md-6">
                    <strong>المسند من:</strong> ${this.currentTask.assigner.full_name}
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-6">
                    <strong>تاريخ الاستحقاق:</strong> ${dueDate}
                </div>
                <div class="col-md-6">
                    <strong>الفئة:</strong> ${this.currentTask.category ? this.currentTask.category.name : 'غير محدد'}
                </div>
            </div>
            
            ${this.currentTask.progress !== null ? `
                <div class="mb-3">
                    <strong>التقدم: ${this.currentTask.progress}%</strong>
                    <div class="progress mt-1">
                        <div class="progress-bar" role="progressbar" style="width: ${this.currentTask.progress}%"></div>
                    </div>
                </div>
            ` : ''}
            
            <div class="mb-3">
                <strong>تاريخ الإنشاء:</strong> ${new Date(this.currentTask.created_at).toLocaleString('ar-SA')}
            </div>
            
            <div class="d-flex gap-2">
                <button class="btn btn-primary btn-sm" onclick="tasksManager.editTask(${this.currentTask.id})">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="btn btn-success btn-sm" onclick="tasksManager.addComment(${this.currentTask.id})">
                    <i class="fas fa-comment"></i> إضافة تعليق
                </button>
                <button class="btn btn-info btn-sm" onclick="tasksManager.logTime(${this.currentTask.id})">
                    <i class="fas fa-clock"></i> تسجيل وقت
                </button>
            </div>
        `;

        modal.show();
    },

    // التبديل بين العروض
    switchView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.nav-link[data-view]').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        const titles = {
            'my-tasks': 'مهامي',
            'assigned-by-me': 'المهام المسندة مني',
            'categories': 'الفئات',
            'templates': 'القوالب'
        };
        
        document.getElementById('current-view-title').textContent = titles[view];

        document.getElementById('tasks-content').style.display = 
            ['my-tasks', 'assigned-by-me'].includes(view) ? 'block' : 'none';
        document.getElementById('categories-content').style.display = 
            view === 'categories' ? 'block' : 'none';
        document.getElementById('templates-content').style.display = 
            view === 'templates' ? 'block' : 'none';

        if (['my-tasks', 'assigned-by-me'].includes(view)) {
            this.loadTasks(view);
        }
    },

    // عرض نافذة إنشاء مهمة جديدة
    showNewTaskModal() {
        const modal = new bootstrap.Modal(document.getElementById('newTaskModal'));
        document.getElementById('newTaskForm').reset();
        modal.show();
    },

    // إنشاء مهمة جديدة
    async createTask() {
        const form = document.getElementById('newTaskForm');
        const formData = new FormData(form);

        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            category_id: formData.get('category_id') || null,
            assignee_id: formData.get('assignee_id') || null,
            priority: formData.get('priority'),
            due_date: formData.get('due_date') || null,
            estimated_hours: formData.get('estimated_hours') || null
        };

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('newTaskModal'));
                modal.hide();
                await this.loadTasks();
                this.showSuccess('تم إنشاء المهمة بنجاح');
            } else {
                this.showError('فشل في إنشاء المهمة');
            }
        } catch (error) {
            console.error('خطأ في إنشاء المهمة:', error);
            this.showError('فشل في إنشاء المهمة');
        }
    },

    // تحديث الإحصائيات
    updateStats() {
        const totalTasks = this.tasks.length;
        const pendingTasks = this.tasks.filter(task => task.status === 'pending').length;
        const inProgressTasks = this.tasks.filter(task => task.status === 'in_progress').length;
        const completedTasks = this.tasks.filter(task => task.status === 'completed').length;

        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('pending-tasks').textContent = pendingTasks;
        document.getElementById('in-progress-tasks').textContent = inProgressTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
    },

    // الحصول على نص الحالة
    getStatusText(status) {
        const statuses = {
            'pending': 'معلقة',
            'in_progress': 'قيد التنفيذ',
            'completed': 'مكتملة',
            'cancelled': 'ملغية',
            'on_hold': 'متوقفة'
        };
        return statuses[status] || status;
    },

    // الحصول على لون الحالة
    getStatusColor(status) {
        const colors = {
            'pending': 'warning',
            'in_progress': 'info',
            'completed': 'success',
            'cancelled': 'danger',
            'on_hold': 'secondary'
        };
        return colors[status] || 'secondary';
    },

    // الحصول على نص الأولوية
    getPriorityText(priority) {
        const priorities = {
            'urgent': 'عاجل',
            'high': 'عالية',
            'medium': 'متوسطة',
            'low': 'منخفضة'
        };
        return priorities[priority] || priority;
    },

    // الحصول على لون الأولوية
    getPriorityColor(priority) {
        const colors = {
            'urgent': 'danger',
            'high': 'warning',
            'medium': 'info',
            'low': 'success'
        };
        return colors[priority] || 'info';
    },

    // عرض رسالة نجاح
    showSuccess(message) {
        alert(message);
    },

    // عرض رسالة خطأ
    showError(message) {
        alert('خطأ: ' + message);
    }
};

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('tasks-section')) {
        tasksManager.init();
    }
});
