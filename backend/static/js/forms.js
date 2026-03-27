// نظام إدارة النماذج الجاهزة
const formsManager = {
    currentTemplates: [],
    currentCategories: [],
    currentSubmissions: [],
    currentFields: [],
    fieldCounter: 0,

    // تحميل النماذج
    async loadTemplates() {
        try {
            const response = await fetch('/api/form-templates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                this.currentTemplates = await response.json();
                this.renderTemplates();
                this.updateTemplateStats();
            } else {
                showError('فشل في تحميل النماذج');
            }
        } catch (error) {
            console.error('Error loading templates:', error);
            showError('خطأ في تحميل النماذج');
        }
    },

    // عرض النماذج
    renderTemplates() {
        const templatesGrid = document.getElementById('templatesGrid');
        if (!templatesGrid) return;
        
        if (this.currentTemplates.length === 0) {
            templatesGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد نماذج متاحة</p>
                    <button class="btn btn-primary" onclick="formsManager.showCreateTemplateModal()">
                        <i class="fas fa-plus"></i> إنشاء نموذج جديد
                    </button>
                </div>
            `;
            return;
        }
        
        templatesGrid.innerHTML = this.currentTemplates.map(template => `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card h-100 template-card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">${template.name}</h6>
                        <span class="badge bg-${this.getTypeColor(template.form_type)}">${this.getTypeLabel(template.form_type)}</span>
                    </div>
                    <div class="card-body">
                        <p class="card-text small text-muted">${template.description || 'لا يوجد وصف'}</p>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <small class="text-muted">
                                <i class="fas fa-folder"></i> ${template.category || 'غير محدد'}
                            </small>
                            <small class="text-muted">
                                <i class="fas fa-eye"></i> ${template.usage_count || 0}
                            </small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-paper-plane"></i> ${template.submission_count || 0} إرسال
                            </small>
                            <span class="badge bg-${template.is_active ? 'success' : 'secondary'}">
                                ${template.is_active ? 'نشط' : 'غير نشط'}
                            </span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="btn-group w-100">
                            <button class="btn btn-sm btn-outline-primary" onclick="formsManager.editTemplate(${template.id})" title="تحرير">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="formsManager.duplicateTemplate(${template.id})" title="نسخ">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="formsManager.deleteTemplate(${template.id})" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // عرض مودال إنشاء نموذج جديد
    showCreateTemplateModal() {
        this.currentFields = [];
        this.fieldCounter = 0;
        document.getElementById('createTemplateForm').reset();
        document.getElementById('fieldsContainer').innerHTML = '';
        
        const modal = new bootstrap.Modal(document.getElementById('createTemplateModal'));
        modal.show();
        
        // إضافة حقل افتراضي
        this.addField();
    },

    // إضافة حقل جديد
    addField() {
        this.fieldCounter++;
        const fieldId = `field_${this.fieldCounter}`;
        
        const fieldHtml = `
            <div class="card mb-3" id="${fieldId}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">حقل ${this.fieldCounter}</h6>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="formsManager.removeField('${fieldId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">اسم الحقل</label>
                                <input type="text" class="form-control" name="field_name" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">تسمية الحقل</label>
                                <input type="text" class="form-control" name="field_label" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">نوع الحقل</label>
                                <select class="form-select" name="field_type">
                                    <option value="text">نص</option>
                                    <option value="email">بريد إلكتروني</option>
                                    <option value="number">رقم</option>
                                    <option value="tel">هاتف</option>
                                    <option value="date">تاريخ</option>
                                    <option value="textarea">نص طويل</option>
                                    <option value="select">قائمة منسدلة</option>
                                    <option value="radio">اختيار واحد</option>
                                    <option value="checkbox">اختيار متعدد</option>
                                    <option value="file">ملف</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">النص التوضيحي</label>
                                <input type="text" class="form-control" name="placeholder">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">نص المساعدة</label>
                                <input type="text" class="form-control" name="help_text">
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" name="is_required">
                                <label class="form-check-label">حقل مطلوب</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('fieldsContainer').insertAdjacentHTML('beforeend', fieldHtml);
    },

    // إزالة حقل
    removeField(fieldId) {
        const fieldElement = document.getElementById(fieldId);
        if (fieldElement) {
            fieldElement.remove();
        }
    },

    // حفظ النموذج
    async saveTemplate() {
        const templateData = this.getTemplateFormData();
        
        try {
            const response = await fetch('/api/form-templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(templateData)
            });
            
            if (response.ok) {
                showSuccess('تم حفظ النموذج بنجاح');
                bootstrap.Modal.getInstance(document.getElementById('createTemplateModal')).hide();
                this.loadTemplates();
            } else {
                const error = await response.json();
                showError(error.message || 'فشل في حفظ النموذج');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            showError('خطأ في حفظ النموذج');
        }
    },

    // جمع بيانات النموذج
    getTemplateFormData() {
        const fields = [];
        const fieldElements = document.querySelectorAll('#fieldsContainer .card');
        
        fieldElements.forEach((fieldElement, index) => {
            const fieldData = {
                field_name: fieldElement.querySelector('[name="field_name"]').value,
                field_label: fieldElement.querySelector('[name="field_label"]').value,
                field_type: fieldElement.querySelector('[name="field_type"]').value,
                placeholder: fieldElement.querySelector('[name="placeholder"]').value,
                help_text: fieldElement.querySelector('[name="help_text"]').value,
                is_required: fieldElement.querySelector('[name="is_required"]').checked,
                display_order: index
            };
            
            fields.push(fieldData);
        });
        
        // جمع الأدوار المسموحة
        const allowedRoles = [];
        document.querySelectorAll('[id^="role"]:checked').forEach(checkbox => {
            allowedRoles.push(checkbox.value);
        });
        
        return {
            name: document.getElementById('templateName').value,
            name_en: document.getElementById('templateNameEn').value,
            description: document.getElementById('templateDescription').value,
            category: document.getElementById('templateCategory').value,
            form_type: document.getElementById('templateType').value,
            layout_type: document.getElementById('layoutType').value,
            theme: document.getElementById('templateTheme').value,
            is_public: document.getElementById('isPublic').checked,
            requires_authentication: document.getElementById('requiresAuth').checked,
            allowed_roles: allowedRoles,
            fields: fields
        };
    },

    // معاينة النموذج
    previewTemplate() {
        const templateData = this.getTemplateFormData();
        const previewContainer = document.getElementById('templatePreview');
        
        let previewHtml = `
            <div class="form-preview">
                <h4>${templateData.name}</h4>
                <p class="text-muted">${templateData.description}</p>
                <form>
        `;
        
        templateData.fields.forEach(field => {
            previewHtml += this.generateFieldPreview(field);
        });
        
        previewHtml += `
                    <div class="mt-4">
                        <button type="submit" class="btn btn-primary">إرسال</button>
                        <button type="reset" class="btn btn-secondary">إعادة تعيين</button>
                    </div>
                </form>
            </div>
        `;
        
        previewContainer.innerHTML = previewHtml;
        
        const modal = new bootstrap.Modal(document.getElementById('previewTemplateModal'));
        modal.show();
    },

    // توليد معاينة الحقل
    generateFieldPreview(field) {
        const requiredMark = field.is_required ? '<span class="text-danger">*</span>' : '';
        
        let fieldHtml = `
            <div class="mb-3">
                <label class="form-label">${field.field_label} ${requiredMark}</label>
        `;
        
        switch (field.field_type) {
            case 'textarea':
                fieldHtml += `<textarea class="form-control" placeholder="${field.placeholder}" ${field.is_required ? 'required' : ''}></textarea>`;
                break;
            case 'select':
                fieldHtml += `<select class="form-select" ${field.is_required ? 'required' : ''}>
                    <option value="">اختر...</option>
                </select>`;
                break;
            default:
                fieldHtml += `<input type="${field.field_type}" class="form-control" placeholder="${field.placeholder}" ${field.is_required ? 'required' : ''}>`;
        }
        
        if (field.help_text) {
            fieldHtml += `<div class="form-text">${field.help_text}</div>`;
        }
        
        fieldHtml += `</div>`;
        
        return fieldHtml;
    },

    // تحديث إحصائيات النماذج
    updateTemplateStats() {
        const totalTemplates = this.currentTemplates.length;
        const activeTemplates = this.currentTemplates.filter(t => t.is_active).length;
        const totalSubmissions = this.currentTemplates.reduce((sum, t) => sum + (t.submission_count || 0), 0);
        
        document.getElementById('totalTemplates').textContent = totalTemplates;
        document.getElementById('activeTemplates').textContent = activeTemplates;
        document.getElementById('totalSubmissions').textContent = totalSubmissions;
        document.getElementById('todaySubmissions').textContent = '0';
    },

    // الحصول على لون النوع
    getTypeColor(type) {
        const colors = {
            'registration': 'primary',
            'evaluation': 'success',
            'report': 'info',
            'survey': 'warning',
            'application': 'secondary',
            'feedback': 'dark'
        };
        return colors[type] || 'secondary';
    },

    // الحصول على تسمية النوع
    getTypeLabel(type) {
        const labels = {
            'registration': 'تسجيل',
            'evaluation': 'تقييم',
            'report': 'تقرير',
            'survey': 'استبيان',
            'application': 'طلب',
            'feedback': 'تغذية راجعة'
        };
        return labels[type] || type;
    },

    // عرض مودال إضافة فئة
    showAddCategoryModal() {
        document.getElementById('addFormCategoryForm').reset();
        const modal = new bootstrap.Modal(document.getElementById('addFormCategoryModal'));
        modal.show();
    },

    // حفظ فئة النماذج
    async saveFormCategory() {
        const categoryData = {
            name: document.getElementById('formCategoryName').value,
            name_en: document.getElementById('formCategoryNameEn').value,
            description: document.getElementById('formCategoryDescription').value,
            color: document.getElementById('formCategoryColor').value,
            icon: document.getElementById('formCategoryIcon').value
        };
        
        try {
            const response = await fetch('/api/form-categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(categoryData)
            });
            
            if (response.ok) {
                showSuccess('تم حفظ الفئة بنجاح');
                bootstrap.Modal.getInstance(document.getElementById('addFormCategoryModal')).hide();
                this.loadFormCategories();
            } else {
                const error = await response.json();
                showError(error.message || 'فشل في حفظ الفئة');
            }
        } catch (error) {
            console.error('Error saving form category:', error);
            showError('خطأ في حفظ الفئة');
        }
    },

    // تحميل فئات النماذج
    async loadFormCategories() {
        try {
            const response = await fetch('/api/form-categories', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                this.currentCategories = await response.json();
                this.renderFormCategories();
            } else {
                showError('فشل في تحميل فئات النماذج');
            }
        } catch (error) {
            console.error('Error loading form categories:', error);
            showError('خطأ في تحميل فئات النماذج');
        }
    },

    // عرض فئات النماذج
    renderFormCategories() {
        const categoriesGrid = document.getElementById('categoriesGrid');
        if (!categoriesGrid) return;
        
        if (this.currentCategories.length === 0) {
            categoriesGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-folder fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد فئات نماذج</p>
                    <button class="btn btn-primary" onclick="formsManager.showAddCategoryModal()">
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
                            <div class="category-icon me-3" style="width: 40px; height: 40px; background-color: ${category.color}; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <i class="${category.icon || 'fas fa-folder'} text-white"></i>
                            </div>
                            <h6 class="mb-0">${category.name}</h6>
                        </div>
                        <p class="card-text small text-muted">${category.description || 'لا يوجد وصف'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${category.templates_count || 0} نموذج</small>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="formsManager.editFormCategory(${category.id})" title="تحرير">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="formsManager.deleteFormCategory(${category.id})" title="حذف">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // وظائف أخرى (يمكن تطويرها لاحقاً)
    editTemplate(id) { console.log('Edit template:', id); },
    duplicateTemplate(id) { console.log('Duplicate template:', id); },
    deleteTemplate(id) { console.log('Delete template:', id); },
    editFormCategory(id) { console.log('Edit category:', id); },
    deleteFormCategory(id) { console.log('Delete category:', id); },
    clearFilters() { this.loadTemplates(); },
    exportTemplates() { console.log('Export templates'); },
    showImportModal() { console.log('Import modal'); }
};

// إضافة CSS للنماذج
const formsStyle = document.createElement('style');
formsStyle.textContent = `
    .template-card {
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid transparent;
    }
    
    .template-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        border-color: #007bff;
    }
    
    .form-preview {
        padding: 20px;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        background-color: #f8f9fa;
    }
`;
document.head.appendChild(formsStyle);
