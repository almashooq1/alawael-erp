// نظام إدارة الأيقونات
const iconsManager = {
    currentIcons: [],
    currentCategories: [],
    currentIconSets: [],
    currentFavorites: [],
    currentEditingIcon: null,

    // تحميل الأيقونات
    async loadIcons() {
        try {
            const response = await fetch('/api/icons', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                this.currentIcons = await response.json();
                this.renderIcons();
                this.updateIconsCount();
            } else {
                showError('فشل في تحميل الأيقونات');
            }
        } catch (error) {
            console.error('Error loading icons:', error);
            showError('خطأ في تحميل الأيقونات');
        }
    },

    // عرض الأيقونات
    renderIcons() {
        const iconsGrid = document.getElementById('iconsGrid');
        if (!iconsGrid) return;
        
        const viewMode = document.querySelector('input[name="viewMode"]:checked').id;
        
        if (this.currentIcons.length === 0) {
            iconsGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-icons fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد أيقونات متاحة</p>
                    <button class="btn btn-primary" onclick="iconsManager.showAddIconModal()">
                        <i class="fas fa-plus"></i> إضافة أيقونة جديدة
                    </button>
                </div>
            `;
            return;
        }
        
        if (viewMode === 'gridView') {
            iconsGrid.innerHTML = this.currentIcons.map(icon => `
                <div class="col-xl-2 col-lg-3 col-md-4 col-sm-6 mb-3">
                    <div class="card h-100 icon-card" onclick="iconsManager.selectIcon(${icon.id})">
                        <div class="card-body text-center p-3">
                            <div class="icon-display mb-2" style="font-size: 2rem;">
                                ${this.getIconHTML(icon)}
                            </div>
                            <h6 class="card-title small mb-1">${icon.name}</h6>
                            <small class="text-muted">${this.getIconTypeLabel(icon.icon_type)}</small>
                            <div class="icon-actions mt-2">
                                <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); iconsManager.toggleFavorite(${icon.id})" title="إضافة للمفضلة">
                                    <i class="fas fa-star ${icon.is_favorite ? 'text-warning' : ''}"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); iconsManager.copyIcon(${icon.id})" title="نسخ">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-info" onclick="event.stopPropagation(); iconsManager.editIcon(${icon.id})" title="تحرير">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); iconsManager.deleteIcon(${icon.id})" title="حذف">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            iconsGrid.innerHTML = this.currentIcons.map(icon => `
                <div class="col-12 mb-2">
                    <div class="card icon-card-list" onclick="iconsManager.selectIcon(${icon.id})">
                        <div class="card-body p-3">
                            <div class="row align-items-center">
                                <div class="col-auto">
                                    <div class="icon-display" style="font-size: 1.5rem;">
                                        ${this.getIconHTML(icon)}
                                    </div>
                                </div>
                                <div class="col">
                                    <h6 class="mb-1">${icon.name}</h6>
                                    <small class="text-muted">${icon.description || 'لا يوجد وصف'}</small>
                                </div>
                                <div class="col-auto">
                                    <span class="badge bg-secondary">${this.getIconTypeLabel(icon.icon_type)}</span>
                                </div>
                                <div class="col-auto">
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" onclick="event.stopPropagation(); iconsManager.toggleFavorite(${icon.id})" title="إضافة للمفضلة">
                                            <i class="fas fa-star ${icon.is_favorite ? 'text-warning' : ''}"></i>
                                        </button>
                                        <button class="btn btn-outline-secondary" onclick="event.stopPropagation(); iconsManager.copyIcon(${icon.id})" title="نسخ">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                        <button class="btn btn-outline-info" onclick="event.stopPropagation(); iconsManager.editIcon(${icon.id})" title="تحرير">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" onclick="event.stopPropagation(); iconsManager.deleteIcon(${icon.id})" title="حذف">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    },

    // تحميل الفئات
    async loadCategories() {
        try {
            const response = await fetch('/api/icon-categories', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                this.currentCategories = await response.json();
                this.renderCategories();
                this.populateCategoryFilters();
            } else {
                showError('فشل في تحميل فئات الأيقونات');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            showError('خطأ في تحميل فئات الأيقونات');
        }
    },

    // عرض الفئات
    renderCategories() {
        const categoriesGrid = document.getElementById('categoriesGrid');
        if (!categoriesGrid) return;
        
        if (this.currentCategories.length === 0) {
            categoriesGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-folder fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد فئات أيقونات</p>
                    <button class="btn btn-primary" onclick="iconsManager.showAddCategoryModal()">
                        <i class="fas fa-plus"></i> إضافة فئة جديدة
                    </button>
                </div>
            `;
            return;
        }
        
        categoriesGrid.innerHTML = this.currentCategories.map(category => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="category-color me-3" style="width: 20px; height: 20px; background-color: ${category.color}; border-radius: 50%;"></div>
                            <h6 class="mb-0">${category.name}</h6>
                        </div>
                        <p class="card-text small text-muted">${category.description || 'لا يوجد وصف'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${category.icons_count || 0} أيقونة</small>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="iconsManager.editCategory(${category.id})" title="تحرير">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="iconsManager.deleteCategory(${category.id})" title="حذف">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // عرض مودال إضافة أيقونة
    showAddIconModal() {
        this.loadCategories(); // تحميل الفئات للقائمة المنسدلة
        const modal = new bootstrap.Modal(document.getElementById('addIconModal'));
        modal.show();
        
        // إعادة تعيين النموذج
        document.getElementById('addIconForm').reset();
        this.toggleIconTypeFields();
        this.updateIconPreview();
    },

    // عرض مودال إضافة فئة
    showAddCategoryModal() {
        const modal = new bootstrap.Modal(document.getElementById('addCategoryModal'));
        modal.show();
        
        // إعادة تعيين النموذج
        document.getElementById('addCategoryForm').reset();
    },

    // تبديل حقول نوع الأيقونة
    toggleIconTypeFields() {
        const iconType = document.getElementById('iconType').value;
        
        // إخفاء جميع الحقول
        document.getElementById('fontawesomeFields').style.display = 'none';
        document.getElementById('svgFields').style.display = 'none';
        document.getElementById('imageFields').style.display = 'none';
        document.getElementById('customFields').style.display = 'none';
        
        // إظهار الحقول المناسبة
        switch(iconType) {
            case 'fontawesome':
                document.getElementById('fontawesomeFields').style.display = 'block';
                break;
            case 'svg':
                document.getElementById('svgFields').style.display = 'block';
                break;
            case 'image':
                document.getElementById('imageFields').style.display = 'block';
                break;
            case 'custom':
                document.getElementById('customFields').style.display = 'block';
                break;
        }
        
        this.updateIconPreview();
    },

    // تحديث معاينة الأيقونة
    updateIconPreview() {
        const preview = document.getElementById('iconPreview');
        const iconType = document.getElementById('iconType').value;
        const color = document.getElementById('iconColor').value;
        const size = document.getElementById('iconSize').value;
        
        let html = '';
        
        switch(iconType) {
            case 'fontawesome':
                const iconClass = document.getElementById('iconClass').value;
                if (iconClass) {
                    html = `<i class="${iconClass}" style="color: ${color}; font-size: ${this.getSizeValue(size)};"></i>`;
                }
                break;
            case 'svg':
                const svgContent = document.getElementById('svgContent').value;
                if (svgContent) {
                    html = `<div style="color: ${color}; font-size: ${this.getSizeValue(size)};">${svgContent}</div>`;
                }
                break;
            case 'image':
                const imageFile = document.getElementById('iconImage').files[0];
                if (imageFile) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        preview.innerHTML = `<img src="${e.target.result}" style="max-width: 50px; max-height: 50px;" alt="معاينة">`;
                    };
                    reader.readAsDataURL(imageFile);
                    return;
                }
                break;
            case 'custom':
                const unicodeValue = document.getElementById('unicodeValue').value;
                if (unicodeValue) {
                    html = `<span style="color: ${color}; font-size: ${this.getSizeValue(size)};">${unicodeValue}</span>`;
                }
                break;
        }
        
        preview.innerHTML = html || '<span class="text-muted">ستظهر معاينة الأيقونة هنا</span>';
    },

    // حفظ أيقونة جديدة
    async saveIcon() {
        const iconData = this.getIconFormData();
        
        try {
            const response = await fetch('/api/icons', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(iconData)
            });
            
            if (response.ok) {
                showSuccess('تم حفظ الأيقونة بنجاح');
                bootstrap.Modal.getInstance(document.getElementById('addIconModal')).hide();
                this.loadIcons();
            } else {
                const error = await response.json();
                showError(error.message || 'فشل في حفظ الأيقونة');
            }
        } catch (error) {
            console.error('Error saving icon:', error);
            showError('خطأ في حفظ الأيقونة');
        }
    },

    // حفظ فئة جديدة
    async saveCategory() {
        const categoryData = {
            name: document.getElementById('categoryName').value,
            name_en: document.getElementById('categoryNameEn').value,
            description: document.getElementById('categoryDescription').value,
            color: document.getElementById('categoryColor').value,
            sort_order: parseInt(document.getElementById('categorySortOrder').value) || 0
        };
        
        try {
            const response = await fetch('/api/icon-categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(categoryData)
            });
            
            if (response.ok) {
                showSuccess('تم حفظ الفئة بنجاح');
                bootstrap.Modal.getInstance(document.getElementById('addCategoryModal')).hide();
                this.loadCategories();
            } else {
                const error = await response.json();
                showError(error.message || 'فشل في حفظ الفئة');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            showError('خطأ في حفظ الفئة');
        }
    },

    // جمع بيانات النموذج
    getIconFormData() {
        const iconType = document.getElementById('iconType').value;
        const data = {
            name: document.getElementById('iconName').value,
            name_en: document.getElementById('iconNameEn').value,
            description: document.getElementById('iconDescription').value,
            icon_type: iconType,
            category_id: document.getElementById('iconCategory').value || null,
            tags: document.getElementById('iconTags').value,
            color: document.getElementById('iconColor').value,
            size: document.getElementById('iconSize').value
        };
        
        switch(iconType) {
            case 'fontawesome':
                data.icon_class = document.getElementById('iconClass').value;
                data.style = document.getElementById('iconStyle').value;
                break;
            case 'svg':
                data.svg_content = document.getElementById('svgContent').value;
                break;
            case 'custom':
                data.unicode_value = document.getElementById('unicodeValue').value;
                break;
        }
        
        return data;
    },

    // الحصول على HTML للأيقونة
    getIconHTML(icon) {
        switch(icon.icon_type) {
            case 'fontawesome':
                return `<i class="${icon.icon_class}" style="color: ${icon.color || '#000'};"></i>`;
            case 'svg':
                return `<span style="color: ${icon.color || '#000'};">${icon.svg_content}</span>`;
            case 'image':
                return `<img src="${icon.image_path}" style="max-width: 30px; max-height: 30px;" alt="${icon.name}">`;
            case 'custom':
                return `<span style="color: ${icon.color || '#000'};">${icon.unicode_value}</span>`;
            default:
                return '<i class="fas fa-question"></i>';
        }
    },

    // الحصول على تسمية نوع الأيقونة
    getIconTypeLabel(type) {
        const types = {
            'fontawesome': 'FontAwesome',
            'svg': 'SVG',
            'image': 'صورة',
            'custom': 'مخصص'
        };
        return types[type] || type;
    },

    // الحصول على قيمة الحجم
    getSizeValue(size) {
        const sizes = {
            'xs': '0.75rem',
            'sm': '0.875rem',
            '1x': '1rem',
            'lg': '1.25rem',
            '2x': '2rem',
            '3x': '3rem'
        };
        return sizes[size] || '1rem';
    },

    // تحديث عداد الأيقونات
    updateIconsCount() {
        const countElement = document.getElementById('iconsCount');
        if (countElement) {
            countElement.textContent = `${this.currentIcons.length} أيقونة`;
        }
    },

    // ملء فلاتر الفئات
    populateCategoryFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        const iconCategory = document.getElementById('iconCategory');
        
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">جميع الفئات</option>' +
                this.currentCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        }
        
        if (iconCategory) {
            iconCategory.innerHTML = '<option value="">اختر الفئة</option>' +
                this.currentCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        }
    },

    // تبديل المفضلة
    async toggleFavorite(iconId) {
        try {
            const response = await fetch(`/api/icons/${iconId}/favorite`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                this.loadIcons();
            } else {
                showError('فشل في تحديث المفضلة');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            showError('خطأ في تحديث المفضلة');
        }
    },

    // نسخ الأيقونة
    copyIcon(iconId) {
        const icon = this.currentIcons.find(i => i.id === iconId);
        if (icon) {
            const iconHTML = this.getIconHTML(icon);
            navigator.clipboard.writeText(iconHTML).then(() => {
                showSuccess('تم نسخ كود الأيقونة');
            }).catch(() => {
                showError('فشل في نسخ كود الأيقونة');
            });
        }
    },

    // حذف أيقونة
    async deleteIcon(iconId) {
        if (!confirm('هل أنت متأكد من حذف هذه الأيقونة؟')) return;
        
        try {
            const response = await fetch(`/api/icons/${iconId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                showSuccess('تم حذف الأيقونة بنجاح');
                this.loadIcons();
            } else {
                showError('فشل في حذف الأيقونة');
            }
        } catch (error) {
            console.error('Error deleting icon:', error);
            showError('خطأ في حذف الأيقونة');
        }
    },

    // حذف فئة
    async deleteCategory(categoryId) {
        if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
        
        try {
            const response = await fetch(`/api/icon-categories/${categoryId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                showSuccess('تم حذف الفئة بنجاح');
                this.loadCategories();
            } else {
                showError('فشل في حذف الفئة');
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            showError('خطأ في حذف الفئة');
        }
    },

    // مسح الفلاتر
    clearFilters() {
        document.getElementById('iconSearch').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('typeFilter').value = '';
        document.getElementById('sizeFilter').value = '';
        this.applyFilters();
    },

    // تطبيق الفلاتر
    applyFilters() {
        // TODO: تنفيذ منطق الفلترة
        this.loadIcons();
    },

    // اختيار أيقونة
    selectIcon(iconId) {
        // TODO: تنفيذ منطق اختيار الأيقونة
        console.log('Selected icon:', iconId);
    },

    // تحرير أيقونة
    editIcon(iconId) {
        // TODO: تنفيذ تحرير الأيقونة
        console.log('Edit icon:', iconId);
    },

    // تحرير فئة
    editCategory(categoryId) {
        // TODO: تنفيذ تحرير الفئة
        console.log('Edit category:', categoryId);
    }
};

// إضافة مستمعات الأحداث
document.addEventListener('DOMContentLoaded', function() {
    // مستمع تغيير نوع الأيقونة
    const iconTypeSelect = document.getElementById('iconType');
    if (iconTypeSelect) {
        iconTypeSelect.addEventListener('change', () => iconsManager.toggleIconTypeFields());
    }
    
    // مستمعات تحديث المعاينة
    const previewFields = ['iconClass', 'svgContent', 'unicodeValue', 'iconColor', 'iconSize'];
    previewFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => iconsManager.updateIconPreview());
        }
    });
    
    // مستمع تغيير ملف الصورة
    const iconImageInput = document.getElementById('iconImage');
    if (iconImageInput) {
        iconImageInput.addEventListener('change', () => iconsManager.updateIconPreview());
    }
    
    // مستمعات البحث والفلترة
    const searchInput = document.getElementById('iconSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => iconsManager.applyFilters());
    }
    
    const filterSelects = ['categoryFilter', 'typeFilter', 'sizeFilter'];
    filterSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.addEventListener('change', () => iconsManager.applyFilters());
        }
    });
    
    // مستمع تغيير وضع العرض
    const viewModeInputs = document.querySelectorAll('input[name="viewMode"]');
    viewModeInputs.forEach(input => {
        input.addEventListener('change', () => iconsManager.renderIcons());
    });
});

// إضافة CSS للأيقونات
const iconStyle = document.createElement('style');
iconStyle.textContent = `
    .icon-card {
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid transparent;
    }
    
    .icon-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        border-color: #007bff;
    }
    
    .icon-card-list {
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .icon-card-list:hover {
        background-color: #f8f9fa;
    }
    
    .icon-actions {
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .icon-card:hover .icon-actions {
        opacity: 1;
    }
    
    .icon-display {
        min-height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .category-color {
        border: 1px solid #dee2e6;
    }
`;
document.head.appendChild(iconStyle);
