// نظام إدارة المحتوى والمكتبة الرقمية
class ContentManager {
    constructor() {
        this.categories = [];
        this.contentItems = [];
        this.init();
    }

    init() {
        this.loadCategories();
        this.loadContent();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // تحديث تلقائي كل دقيقة
            setInterval(() => {
                if (document.getElementById('content-library').style.display !== 'none') {
                    this.loadContent();
                }
            }, 60000);
        });
    }

    // إدارة الفئات
    async loadCategories() {
        try {
            const response = await fetch('/api/content-categories', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.categories = data.categories;
                this.populateCategoryFilter();
            }
        } catch (error) {
            console.error('خطأ في تحميل الفئات:', error);
        }
    }

    populateCategoryFilter() {
        const select = document.getElementById('contentCategoryFilter');
        if (!select) return;

        // مسح الخيارات الحالية (عدا الخيار الأول)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    // إدارة المحتوى
    async loadContent() {
        try {
            const response = await fetch('/api/content-items', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.contentItems = data.content_items;
                this.renderContent();
            }
        } catch (error) {
            console.error('خطأ في تحميل المحتوى:', error);
        }
    }

    renderContent() {
        const grid = document.getElementById('contentGrid');
        if (!grid) return;

        grid.innerHTML = '';

        this.contentItems.forEach(item => {
            const col = document.createElement('div');
            col.className = 'col-md-4 col-lg-3 mb-4';
            
            col.innerHTML = `
                <div class="card h-100 content-card" data-category="${item.category_id}" data-type="${item.content_type}">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-${this.getContentIcon(item.content_type)} me-2"></i>
                            <span class="badge bg-${this.getContentColor(item.content_type)}">
                                ${this.getContentTypeText(item.content_type)}
                            </span>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="contentManager.viewContent(${item.id})">
                                    <i class="fas fa-eye me-2"></i>عرض
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="contentManager.downloadContent(${item.id})">
                                    <i class="fas fa-download me-2"></i>تحميل
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="contentManager.editContent(${item.id})">
                                    <i class="fas fa-edit me-2"></i>تعديل
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="contentManager.deleteContent(${item.id})">
                                    <i class="fas fa-trash me-2"></i>حذف
                                </a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${item.title}</h6>
                        <p class="card-text text-muted small">${item.description || 'لا يوجد وصف'}</p>
                        <div class="mb-2">
                            <small class="text-muted">
                                <i class="fas fa-folder me-1"></i>
                                ${this.getCategoryName(item.category_id)}
                            </small>
                        </div>
                        ${item.tags && item.tags.length > 0 ? `
                            <div class="mb-2">
                                ${item.tags.map(tag => `
                                    <span class="badge bg-light text-dark me-1">${tag}</span>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-footer">
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>
                                ${new Date(item.created_at).toLocaleDateString('ar-SA')}
                            </small>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="contentManager.viewContent(${item.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-outline-success" onclick="contentManager.downloadContent(${item.id})">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            grid.appendChild(col);
        });
    }

    getContentIcon(type) {
        const icons = {
            'document': 'file-alt',
            'video': 'video',
            'audio': 'volume-up',
            'image': 'image',
            'link': 'link'
        };
        return icons[type] || 'file';
    }

    getContentColor(type) {
        const colors = {
            'document': 'primary',
            'video': 'danger',
            'audio': 'warning',
            'image': 'success',
            'link': 'info'
        };
        return colors[type] || 'secondary';
    }

    getContentTypeText(type) {
        const texts = {
            'document': 'مستند',
            'video': 'فيديو',
            'audio': 'صوت',
            'image': 'صورة',
            'link': 'رابط'
        };
        return texts[type] || 'ملف';
    }

    getCategoryName(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        return category ? category.name : 'غير محدد';
    }

    async viewContent(contentId) {
        try {
            const response = await fetch(`/api/content-items/${contentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const content = await response.json();
                this.showContentModal(content);
            }
        } catch (error) {
            console.error('خطأ في عرض المحتوى:', error);
        }
    }

    showContentModal(content) {
        const modalHtml = `
            <div class="modal fade" id="contentModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-${this.getContentIcon(content.content_type)} me-2"></i>
                                ${content.title}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>النوع:</strong> 
                                    <span class="badge bg-${this.getContentColor(content.content_type)}">
                                        ${this.getContentTypeText(content.content_type)}
                                    </span>
                                </div>
                                <div class="col-md-6">
                                    <strong>الفئة:</strong> ${this.getCategoryName(content.category_id)}
                                </div>
                            </div>
                            
                            ${content.description ? `
                                <div class="mb-3">
                                    <strong>الوصف:</strong>
                                    <p>${content.description}</p>
                                </div>
                            ` : ''}
                            
                            ${content.tags && content.tags.length > 0 ? `
                                <div class="mb-3">
                                    <strong>العلامات:</strong>
                                    <div>
                                        ${content.tags.map(tag => `
                                            <span class="badge bg-light text-dark me-1">${tag}</span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="content-preview">
                                ${this.renderContentPreview(content)}
                            </div>
                            
                            <hr>
                            <div class="row">
                                <div class="col-md-6">
                                    <small class="text-muted">
                                        <i class="fas fa-calendar me-1"></i>
                                        تاريخ الإنشاء: ${new Date(content.created_at).toLocaleString('ar-SA')}
                                    </small>
                                </div>
                                <div class="col-md-6">
                                    <small class="text-muted">
                                        <i class="fas fa-user me-1"></i>
                                        المنشئ: ${content.created_by || 'غير محدد'}
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-success" onclick="contentManager.downloadContent(${content.id})">
                                <i class="fas fa-download me-2"></i>تحميل
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // إزالة modal سابق إن وجد
        const existingModal = document.getElementById('contentModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // إضافة modal جديد
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('contentModal'));
        modal.show();
    }

    renderContentPreview(content) {
        switch (content.content_type) {
            case 'image':
                return `<img src="${content.file_path}" class="img-fluid rounded" alt="${content.title}">`;
            
            case 'video':
                return `
                    <video controls class="w-100" style="max-height: 400px;">
                        <source src="${content.file_path}" type="video/mp4">
                        المتصفح لا يدعم تشغيل الفيديو.
                    </video>
                `;
            
            case 'audio':
                return `
                    <audio controls class="w-100">
                        <source src="${content.file_path}" type="audio/mpeg">
                        المتصفح لا يدعم تشغيل الصوت.
                    </audio>
                `;
            
            case 'link':
                return `
                    <div class="text-center">
                        <a href="${content.file_path}" target="_blank" class="btn btn-primary">
                            <i class="fas fa-external-link-alt me-2"></i>فتح الرابط
                        </a>
                    </div>
                `;
            
            case 'document':
            default:
                return `
                    <div class="text-center">
                        <i class="fas fa-file-alt fa-5x text-muted mb-3"></i>
                        <p class="text-muted">معاينة المستند غير متاحة</p>
                    </div>
                `;
        }
    }

    async downloadContent(contentId) {
        try {
            const content = this.contentItems.find(c => c.id === contentId);
            if (content && content.file_path) {
                // إنشاء رابط تحميل
                const link = document.createElement('a');
                link.href = content.file_path;
                link.download = content.title;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showAlert('بدء التحميل...', 'success');
            }
        } catch (error) {
            console.error('خطأ في تحميل المحتوى:', error);
            showAlert('حدث خطأ في تحميل المحتوى', 'error');
        }
    }

    editContent(contentId) {
        // سيتم تنفيذه لاحقاً - فتح modal التعديل
        console.log('تعديل المحتوى:', contentId);
    }

    async deleteContent(contentId) {
        if (confirm('هل أنت متأكد من حذف هذا المحتوى؟')) {
            try {
                const response = await fetch(`/api/content-items/${contentId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    this.loadContent();
                    showAlert('تم حذف المحتوى بنجاح', 'success');
                }
            } catch (error) {
                console.error('خطأ في حذف المحتوى:', error);
                showAlert('حدث خطأ في حذف المحتوى', 'error');
            }
        }
    }

    // فلترة المحتوى
    filterContent() {
        const categoryFilter = document.getElementById('contentCategoryFilter').value;
        const typeFilter = document.getElementById('contentTypeFilter').value;
        const searchTerm = document.getElementById('contentSearch').value.toLowerCase();

        const cards = document.querySelectorAll('.content-card');
        
        cards.forEach(card => {
            let show = true;
            
            if (categoryFilter && card.dataset.category !== categoryFilter) {
                show = false;
            }
            
            if (typeFilter && card.dataset.type !== typeFilter) {
                show = false;
            }
            
            if (searchTerm) {
                const title = card.querySelector('.card-title').textContent.toLowerCase();
                const description = card.querySelector('.card-text').textContent.toLowerCase();
                if (!title.includes(searchTerm) && !description.includes(searchTerm)) {
                    show = false;
                }
            }
            
            card.closest('.col-md-4').style.display = show ? 'block' : 'none';
        });
    }

    // إضافة فئة جديدة
    async addCategory(categoryData) {
        try {
            const response = await fetch('/api/content-categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(categoryData)
            });
            
            if (response.ok) {
                this.loadCategories();
                showAlert('تم إضافة الفئة بنجاح', 'success');
                return true;
            }
        } catch (error) {
            console.error('خطأ في إضافة الفئة:', error);
            showAlert('حدث خطأ في إضافة الفئة', 'error');
            return false;
        }
    }

    // إضافة محتوى جديد
    async addContent(contentData) {
        try {
            const response = await fetch('/api/content-items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(contentData)
            });
            
            if (response.ok) {
                this.loadContent();
                showAlert('تم إضافة المحتوى بنجاح', 'success');
                return true;
            }
        } catch (error) {
            console.error('خطأ في إضافة المحتوى:', error);
            showAlert('حدث خطأ في إضافة المحتوى', 'error');
            return false;
        }
    }
}

// إنشاء مثيل عام
const contentManager = new ContentManager();

// دالة مساعدة للتنقل
function showContentLibrarySection() {
    hideAllSections();
    document.getElementById('content-library').style.display = 'block';
    contentManager.loadCategories();
    contentManager.loadContent();
}
