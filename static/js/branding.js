// نظام إدارة الشعارات والثيمات
const brandingManager = {
    currentLogos: [],
    currentThemes: [],
    currentBrandingSettings: {},

    // تحميل الشعارات
    async loadLogos() {
        try {
            const response = await fetch('/api/logos', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                this.currentLogos = await response.json();
                this.renderLogos();
            } else {
                showError('فشل في تحميل الشعارات');
            }
        } catch (error) {
            console.error('Error loading logos:', error);
            showError('خطأ في تحميل الشعارات');
        }
    },

    // عرض الشعارات
    renderLogos() {
        const logosGrid = document.getElementById('logos-grid');
        if (!logosGrid) return;
        
        if (this.currentLogos.length === 0) {
            logosGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-image fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد شعارات مرفوعة بعد</p>
                </div>
            `;
            return;
        }
        
        logosGrid.innerHTML = this.currentLogos.map(logo => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-img-top d-flex align-items-center justify-content-center" style="height: 200px; background-color: #f8f9fa;">
                        <img src="${logo.file_path}" alt="${logo.alt_text || logo.name}" 
                             style="max-width: 100%; max-height: 100%; object-fit: contain;">
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${logo.name}</h6>
                        <p class="card-text">
                            <small class="text-muted">
                                النوع: ${this.getLogoTypeLabel(logo.logo_type)}<br>
                                الحجم: ${this.formatFileSize(logo.file_size)}<br>
                                الأبعاد: ${logo.width}x${logo.height}
                            </small>
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="logo-${logo.id}" 
                                       ${logo.is_active ? 'checked' : ''} 
                                       onchange="brandingManager.toggleLogoStatus(${logo.id})">
                                <label class="form-check-label" for="logo-${logo.id}">نشط</label>
                            </div>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="brandingManager.editLogo(${logo.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="brandingManager.deleteLogo(${logo.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // تحميل الثيمات
    async loadThemes() {
        try {
            const response = await fetch('/api/themes', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                this.currentThemes = await response.json();
                this.renderThemes();
            } else {
                showError('فشل في تحميل الثيمات');
            }
        } catch (error) {
            console.error('Error loading themes:', error);
            showError('خطأ في تحميل الثيمات');
        }
    },

    // عرض الثيمات
    renderThemes() {
        const themesGrid = document.getElementById('themes-grid');
        if (!themesGrid) return;
        
        if (this.currentThemes.length === 0) {
            themesGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-paint-brush fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد ثيمات مخصصة بعد</p>
                </div>
            `;
            return;
        }
        
        themesGrid.innerHTML = this.currentThemes.map(theme => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 ${theme.is_default ? 'border-primary' : ''}">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">${theme.display_name || theme.name}</h6>
                        ${theme.is_default ? '<span class="badge bg-primary">افتراضي</span>' : ''}
                    </div>
                    <div class="card-body">
                        <div class="theme-preview mb-3">
                            <div class="d-flex mb-2">
                                <div class="color-box me-1" style="background-color: ${theme.primary_color};" title="أساسي"></div>
                                <div class="color-box me-1" style="background-color: ${theme.secondary_color};" title="ثانوي"></div>
                                <div class="color-box me-1" style="background-color: ${theme.success_color};" title="نجاح"></div>
                                <div class="color-box me-1" style="background-color: ${theme.warning_color};" title="تحذير"></div>
                                <div class="color-box" style="background-color: ${theme.danger_color};" title="خطر"></div>
                            </div>
                            <small class="text-muted">الخط: ${theme.font_family} (${theme.font_size_base})</small>
                        </div>
                        <p class="card-text small">${theme.description || 'لا يوجد وصف'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="theme-${theme.id}" 
                                       ${theme.is_active ? 'checked' : ''} 
                                       onchange="brandingManager.toggleThemeStatus(${theme.id})">
                                <label class="form-check-label" for="theme-${theme.id}">نشط</label>
                            </div>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-success" onclick="brandingManager.applyTheme(${theme.id})" 
                                        ${theme.is_default ? 'disabled' : ''}>
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="btn btn-outline-primary" onclick="brandingManager.editTheme(${theme.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="brandingManager.deleteTheme(${theme.id})" 
                                        ${theme.is_default ? 'disabled' : ''}>
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // تحميل إعدادات العلامة التجارية
    async loadBrandingSettings() {
        try {
            const response = await fetch('/api/branding-settings', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const settings = await response.json();
                this.populateBrandingForm(settings);
            }
        } catch (error) {
            console.error('Error loading branding settings:', error);
        }
    },

    // ملء نموذج إعدادات العلامة التجارية
    populateBrandingForm(settings) {
        if (!settings) return;
        
        const fields = [
            'organizationName', 'organizationNameEn', 'tagline', 'taglineEn',
            'brandPhone', 'brandEmail', 'brandWebsite', 'brandAddress',
            'facebookUrl', 'twitterUrl', 'instagramUrl', 'linkedinUrl'
        ];
        
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && settings[field]) {
                element.value = settings[field];
            }
        });
        
        // إعدادات العرض
        const checkboxes = [
            'showLogoHeader', 'showLogoSidebar', 'showLogoFooter', 'showOrgName'
        ];
        
        checkboxes.forEach(checkbox => {
            const element = document.getElementById(checkbox);
            if (element && settings[checkbox] !== undefined) {
                element.checked = settings[checkbox];
            }
        });
    },

    // عرض مودال رفع شعار
    showUploadLogoModal() {
        const modal = new bootstrap.Modal(document.getElementById('uploadLogoModal'));
        modal.show();
        
        // تحميل قائمة الفروع
        this.loadBranchesForLogo();
        
        // إعداد معاينة الصورة
        const fileInput = document.getElementById('logoFile');
        fileInput.addEventListener('change', this.previewLogo);
    },

    // تحميل الفروع لاختيار شعار خاص بفرع
    async loadBranchesForLogo() {
        try {
            const response = await fetch('/api/branches', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const branches = await response.json();
                const select = document.getElementById('logoBranch');
                
                branches.forEach(branch => {
                    const option = document.createElement('option');
                    option.value = branch.id;
                    option.textContent = branch.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    },

    // معاينة الشعار قبل الرفع
    previewLogo(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('logoPreview');
                const img = document.getElementById('logoPreviewImg');
                img.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    },

    // رفع شعار جديد
    async uploadLogo() {
        const form = document.getElementById('uploadLogoForm');
        const formData = new FormData();
        
        // جمع بيانات النموذج
        formData.append('name', document.getElementById('logoName').value);
        formData.append('logo_type', document.getElementById('logoType').value);
        formData.append('alt_text', document.getElementById('logoAltText').value);
        formData.append('branch_id', document.getElementById('logoBranch').value || null);
        formData.append('file', document.getElementById('logoFile').files[0]);
        
        try {
            const response = await fetch('/api/logos', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            if (response.ok) {
                showSuccess('تم رفع الشعار بنجاح');
                bootstrap.Modal.getInstance(document.getElementById('uploadLogoModal')).hide();
                form.reset();
                document.getElementById('logoPreview').style.display = 'none';
                this.loadLogos();
            } else {
                const error = await response.json();
                showError(error.message || 'فشل في رفع الشعار');
            }
        } catch (error) {
            console.error('Error uploading logo:', error);
            showError('خطأ في رفع الشعار');
        }
    },

    // عرض مودال إنشاء ثيم
    showCreateThemeModal() {
        const modal = new bootstrap.Modal(document.getElementById('createThemeModal'));
        modal.show();
    },

    // إنشاء ثيم جديد
    async createTheme() {
        const themeData = {
            name: document.getElementById('themeName').value,
            display_name: document.getElementById('themeDisplayName').value,
            description: document.getElementById('themeDescription').value,
            primary_color: document.getElementById('primaryColor').value,
            secondary_color: document.getElementById('secondaryColor').value,
            success_color: document.getElementById('successColor').value,
            warning_color: document.getElementById('warningColor').value,
            danger_color: document.getElementById('dangerColor').value,
            info_color: document.getElementById('infoColor').value,
            background_color: document.getElementById('backgroundColor').value,
            sidebar_color: document.getElementById('sidebarColor').value,
            navbar_color: document.getElementById('navbarColor').value,
            font_family: document.getElementById('fontFamily').value,
            font_size_base: document.getElementById('fontSizeBase').value,
            custom_css: document.getElementById('customCss').value,
            is_default: document.getElementById('isDefaultTheme').checked
        };
        
        try {
            const response = await fetch('/api/themes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(themeData)
            });
            
            if (response.ok) {
                showSuccess('تم إنشاء الثيم بنجاح');
                bootstrap.Modal.getInstance(document.getElementById('createThemeModal')).hide();
                document.getElementById('createThemeForm').reset();
                this.loadThemes();
            } else {
                const error = await response.json();
                showError(error.message || 'فشل في إنشاء الثيم');
            }
        } catch (error) {
            console.error('Error creating theme:', error);
            showError('خطأ في إنشاء الثيم');
        }
    },

    // تبديل حالة الشعار
    async toggleLogoStatus(logoId) {
        try {
            const response = await fetch(`/api/logos/${logoId}/toggle`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                showSuccess('تم تحديث حالة الشعار');
                this.loadLogos();
            } else {
                showError('فشل في تحديث حالة الشعار');
            }
        } catch (error) {
            console.error('Error toggling logo status:', error);
            showError('خطأ في تحديث حالة الشعار');
        }
    },

    // تبديل حالة الثيم
    async toggleThemeStatus(themeId) {
        try {
            const response = await fetch(`/api/themes/${themeId}/toggle`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                showSuccess('تم تحديث حالة الثيم');
                this.loadThemes();
            } else {
                showError('فشل في تحديث حالة الثيم');
            }
        } catch (error) {
            console.error('Error toggling theme status:', error);
            showError('خطأ في تحديث حالة الثيم');
        }
    },

    // تطبيق ثيم
    async applyTheme(themeId) {
        try {
            const response = await fetch(`/api/themes/${themeId}/apply`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                showSuccess('تم تطبيق الثيم بنجاح');
                this.loadThemes();
                // إعادة تحميل الصفحة لتطبيق الثيم الجديد
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                showError('فشل في تطبيق الثيم');
            }
        } catch (error) {
            console.error('Error applying theme:', error);
            showError('خطأ في تطبيق الثيم');
        }
    },

    // حذف شعار
    async deleteLogo(logoId) {
        if (!confirm('هل أنت متأكد من حذف هذا الشعار؟')) return;
        
        try {
            const response = await fetch(`/api/logos/${logoId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                showSuccess('تم حذف الشعار بنجاح');
                this.loadLogos();
            } else {
                showError('فشل في حذف الشعار');
            }
        } catch (error) {
            console.error('Error deleting logo:', error);
            showError('خطأ في حذف الشعار');
        }
    },

    // حذف ثيم
    async deleteTheme(themeId) {
        if (!confirm('هل أنت متأكد من حذف هذا الثيم؟')) return;
        
        try {
            const response = await fetch(`/api/themes/${themeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                showSuccess('تم حذف الثيم بنجاح');
                this.loadThemes();
            } else {
                showError('فشل في حذف الثيم');
            }
        } catch (error) {
            console.error('Error deleting theme:', error);
            showError('خطأ في حذف الثيم');
        }
    },

    // حفظ إعدادات العلامة التجارية
    async saveBrandingSettings() {
        const settings = {
            organization_name: document.getElementById('organizationName').value,
            organization_name_en: document.getElementById('organizationNameEn').value,
            tagline: document.getElementById('tagline').value,
            tagline_en: document.getElementById('taglineEn').value,
            phone: document.getElementById('brandPhone').value,
            email: document.getElementById('brandEmail').value,
            website: document.getElementById('brandWebsite').value,
            address: document.getElementById('brandAddress').value,
            facebook_url: document.getElementById('facebookUrl').value,
            twitter_url: document.getElementById('twitterUrl').value,
            instagram_url: document.getElementById('instagramUrl').value,
            linkedin_url: document.getElementById('linkedinUrl').value,
            show_logo_in_header: document.getElementById('showLogoHeader').checked,
            show_logo_in_sidebar: document.getElementById('showLogoSidebar').checked,
            show_logo_in_footer: document.getElementById('showLogoFooter').checked,
            show_organization_name: document.getElementById('showOrgName').checked
        };
        
        try {
            const response = await fetch('/api/branding-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(settings)
            });
            
            if (response.ok) {
                showSuccess('تم حفظ إعدادات العلامة التجارية بنجاح');
            } else {
                showError('فشل في حفظ الإعدادات');
            }
        } catch (error) {
            console.error('Error saving branding settings:', error);
            showError('خطأ في حفظ الإعدادات');
        }
    },

    // دوال مساعدة
    getLogoTypeLabel(type) {
        const types = {
            'main': 'الشعار الرئيسي',
            'secondary': 'الشعار الثانوي',
            'favicon': 'أيقونة الموقع',
            'watermark': 'العلامة المائية'
        };
        return types[type] || type;
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // تحرير شعار (placeholder)
    editLogo(logoId) {
        // TODO: تنفيذ تحرير الشعار
        console.log('Edit logo:', logoId);
    },

    // تحرير ثيم (placeholder)
    editTheme(themeId) {
        // TODO: تنفيذ تحرير الثيم
        console.log('Edit theme:', themeId);
    }
};

// إضافة CSS للمعاينة
const style = document.createElement('style');
style.textContent = `
    .color-box {
        width: 20px;
        height: 20px;
        border-radius: 3px;
        border: 1px solid #dee2e6;
    }
    
    .theme-preview {
        padding: 10px;
        background-color: #f8f9fa;
        border-radius: 5px;
    }
`;
document.head.appendChild(style);

// إعداد معالج النموذج
document.addEventListener('DOMContentLoaded', function() {
    const brandingForm = document.getElementById('brandingSettingsForm');
    if (brandingForm) {
        brandingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            brandingManager.saveBrandingSettings();
        });
    }
});
