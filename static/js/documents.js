class DocumentsManager {
    constructor() {
        this.currentPage = 1;
        this.currentFilters = {};
        this.currentDocument = null;
        this.signatureCanvas = null;
        this.signatureContext = null;
        this.isDrawing = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeSignatureCanvas();
    }

    setupEventListeners() {
        // Form submissions
        document.getElementById('uploadDocumentForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadDocument();
        });

        document.getElementById('signatureForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSignature();
        });

        document.getElementById('stampForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveStamp();
        });

        // Search and filter events
        document.getElementById('documentsSearch')?.addEventListener('input', 
            this.debounce(() => this.filterDocuments(), 500));
    }

    initializeSignatureCanvas() {
        const canvas = document.getElementById('signatureCanvas');
        if (canvas) {
            this.signatureCanvas = canvas;
            this.signatureContext = canvas.getContext('2d');
            
            // Mouse events
            canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
            canvas.addEventListener('mousemove', (e) => this.draw(e));
            canvas.addEventListener('mouseup', () => this.stopDrawing());
            canvas.addEventListener('mouseout', () => this.stopDrawing());

            // Touch events for mobile
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            });

            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            });

            canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                const mouseEvent = new MouseEvent('mouseup', {});
                canvas.dispatchEvent(mouseEvent);
            });
        }
    }

    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.signatureCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.signatureContext.beginPath();
        this.signatureContext.moveTo(x, y);
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const rect = this.signatureCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.signatureContext.lineWidth = 2;
        this.signatureContext.lineCap = 'round';
        this.signatureContext.strokeStyle = '#000';
        this.signatureContext.lineTo(x, y);
        this.signatureContext.stroke();
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    clearSignature() {
        if (this.signatureContext) {
            this.signatureContext.clearRect(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
        }
    }

    async loadDocuments(page = 1) {
        try {
            const params = new URLSearchParams({
                page: page,
                per_page: 20,
                ...this.currentFilters
            });

            const response = await fetch(`/api/documents?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                this.renderDocuments(data.documents);
                this.renderPagination(data.pagination);
                this.updateStatistics();
            } else {
                this.showError('خطأ في تحميل المستندات: ' + data.error);
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
            console.error('Error loading documents:', error);
        }
    }

    renderDocuments(documents) {
        const tbody = document.querySelector('#documentsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        documents.forEach(doc => {
            const row = document.createElement('tr');
            
            // تحديد لون الصف حسب الحالة
            if (doc.status === 'archived') {
                row.classList.add('table-secondary');
            } else if (doc.expiry_date && new Date(doc.expiry_date) < new Date()) {
                row.classList.add('table-danger');
            } else if (doc.expiry_date && new Date(doc.expiry_date) <= new Date(Date.now() + 7*24*60*60*1000)) {
                row.classList.add('table-warning');
            }

            row.innerHTML = `
                <td>
                    <input type="checkbox" class="document-checkbox" value="${doc.id}" onchange="documentsManager.updateSelectedCount()">
                </td>
                <td>${doc.title}</td>
                <td>${doc.document_number || '-'}</td>
                <td>${doc.category_name || '-'}</td>
                <td>${doc.document_type}</td>
                <td>${doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('ar-SA') : '-'}</td>
                <td>${doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('ar-SA') : '-'}</td>
                <td>
                    <span class="badge bg-${this.getStatusColor(doc.status)}">${this.getStatusText(doc.status)}</span>
                </td>
                <td>
                    ${doc.is_signed ? '<i class="fas fa-check-circle text-success" title="موقع"></i>' : '<i class="fas fa-times-circle text-muted" title="غير موقع"></i>'}
                </td>
                <td>
                    ${doc.is_stamped ? '<i class="fas fa-stamp text-primary" title="مختوم"></i>' : '<i class="fas fa-times-circle text-muted" title="غير مختوم"></i>'}
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="documentsManager.viewDocument(${doc.id})" title="عرض">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="documentsManager.downloadDocument(${doc.id})" title="تحميل">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" title="طباعة">
                            <i class="fas fa-print"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="documentsManager.printDocument(${doc.id}, 'simple')">
                                <i class="fas fa-print me-2"></i>طباعة عادية
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="documentsManager.printDocument(${doc.id}, 'enhanced')">
                                <i class="fas fa-file-pdf me-2"></i>طباعة محسنة
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="documentsManager.printDocument(${doc.id}, 'watermark')">
                                <i class="fas fa-shield-alt me-2"></i>طباعة مع علامة مائية
                            </a></li>
                        </ul>
                        <button class="btn btn-outline-info" onclick="documentsManager.showSignModal(${doc.id})" title="توقيع">
                            <i class="fas fa-signature"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="documentsManager.showStampModal(${doc.id})" title="ختم">
                            <i class="fas fa-stamp"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="documentsManager.editDocument(${doc.id})" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="documentsManager.deleteDocument(${doc.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getStatusBadge(status) {
        const statusMap = {
            'active': '<span class="badge bg-success">نشط</span>',
            'expired': '<span class="badge bg-danger">منتهي</span>',
            'archived': '<span class="badge bg-warning">مؤرشف</span>',
            'deleted': '<span class="badge bg-secondary">محذوف</span>'
        };
        return statusMap[status] || '<span class="badge bg-secondary">غير محدد</span>';
    }

    getExpiryWarning(expiryDate) {
        if (!expiryDate) return '';
        
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return '<span class="badge bg-danger ms-2">منتهي</span>';
        } else if (diffDays <= 30) {
            return `<span class="badge bg-warning ms-2">ينتهي خلال ${diffDays} يوم</span>`;
        }
        return '';
    }

    getFileIcon(format) {
        const iconMap = {
            'pdf': 'pdf',
            'doc': 'word',
            'docx': 'word',
            'xls': 'excel',
            'xlsx': 'excel',
            'jpg': 'image',
            'jpeg': 'image',
            'png': 'image',
            'gif': 'image'
        };
        return iconMap[format?.toLowerCase()] || 'alt';
    }

    getDocumentTypeLabel(type) {
        const typeMap = {
            'contract': 'عقد',
            'certificate': 'شهادة',
            'report': 'تقرير',
            'license': 'رخصة',
            'policy': 'سياسة',
            'other': 'أخرى'
        };
        return typeMap[type] || type;
    }

    renderPagination(pagination) {
        const paginationContainer = document.getElementById('documentsPagination');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';

        // Previous button
        if (pagination.has_prev) {
            const prevLi = document.createElement('li');
            prevLi.className = 'page-item';
            prevLi.innerHTML = `<a class="page-link" href="#" onclick="documentsManager.loadDocuments(${pagination.page - 1})">السابق</a>`;
            paginationContainer.appendChild(prevLi);
        }

        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === pagination.page ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" onclick="documentsManager.loadDocuments(${i})">${i}</a>`;
            paginationContainer.appendChild(li);
        }

        // Next button
        if (pagination.has_next) {
            const nextLi = document.createElement('li');
            nextLi.className = 'page-item';
            nextLi.innerHTML = `<a class="page-link" href="#" onclick="documentsManager.loadDocuments(${pagination.page + 1})">التالي</a>`;
            paginationContainer.appendChild(nextLi);
        }
    }

    async updateStatistics() {
        try {
            const response = await fetch('/api/documents?per_page=1000', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                const docs = data.documents;
                
                document.getElementById('totalDocuments').textContent = docs.length;
                document.getElementById('signedDocuments').textContent = docs.filter(d => d.is_signed).length;
                document.getElementById('stampedDocuments').textContent = docs.filter(d => d.is_stamped).length;
                
                // Count expiring documents (within 30 days)
                const today = new Date();
                const expiringCount = docs.filter(d => {
                    if (!d.expiry_date) return false;
                    const expiry = new Date(d.expiry_date);
                    const diffTime = expiry - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays >= 0 && diffDays <= 30;
                }).length;
                
                document.getElementById('expiringDocuments').textContent = expiringCount;
            }
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/document-categories', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                this.populateCategorySelects(data.categories);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    populateCategorySelects(categories) {
        const selects = [
            document.getElementById('documentsCategory'),
            document.querySelector('select[name="category_id"]')
        ];

        selects.forEach(select => {
            if (select) {
                // Clear existing options except first
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }

                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    select.appendChild(option);
                });
            }
        });
    }

    showUploadModal() {
        this.loadCategories();
        const modal = new bootstrap.Modal(document.getElementById('uploadDocumentModal'));
        modal.show();
    }

    async uploadDocument() {
        try {
            const form = document.getElementById('uploadDocumentForm');
            const formData = new FormData(form);

            const response = await fetch('/api/documents', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                this.showSuccess('تم رفع المستند بنجاح');
                bootstrap.Modal.getInstance(document.getElementById('uploadDocumentModal')).hide();
                form.reset();
                this.loadDocuments();
            } else {
                this.showError('خطأ في رفع المستند: ' + data.error);
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
            console.error('Error uploading document:', error);
        }
    }

    async viewDocument(documentId) {
        try {
            const response = await fetch(`/api/documents/${documentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                this.currentDocument = data.document;
                this.showDocumentDetails(data.document);
            } else {
                this.showError('خطأ في تحميل تفاصيل المستند: ' + data.error);
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
            console.error('Error loading document:', error);
        }
    }

    showDocumentDetails(document) {
        const content = document.getElementById('documentDetailsContent');
        if (!content) return;

        content.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h4>${document.title}</h4>
                    <p class="text-muted">${document.description || 'لا يوجد وصف'}</p>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <strong>رقم المستند:</strong> ${document.document_number || '-'}
                        </div>
                        <div class="col-md-6">
                            <strong>النوع:</strong> ${this.getDocumentTypeLabel(document.document_type)}
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <strong>تاريخ الإصدار:</strong> ${document.issue_date || '-'}
                        </div>
                        <div class="col-md-6">
                            <strong>تاريخ الانتهاء:</strong> ${document.expiry_date || '-'}
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <strong>الحالة:</strong> ${this.getStatusBadge(document.status)}
                        </div>
                        <div class="col-md-6">
                            <strong>الحجم:</strong> ${this.formatFileSize(document.file_size)}
                        </div>
                    </div>
                    
                    ${document.tags && document.tags.length > 0 ? `
                        <div class="mb-3">
                            <strong>العلامات:</strong>
                            ${document.tags.map(tag => `<span class="badge bg-secondary me-1">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">معلومات إضافية</h6>
                        </div>
                        <div class="card-body">
                            <p><strong>التوقيع:</strong> ${document.is_signed ? '✓ موقع' : '✗ غير موقع'}</p>
                            <p><strong>الختم:</strong> ${document.is_stamped ? '✓ مختوم' : '✗ غير مختوم'}</p>
                            <p><strong>سري:</strong> ${document.is_confidential ? '✓ نعم' : '✗ لا'}</p>
                            <p><strong>الإصدار:</strong> ${document.version}</p>
                            <p><strong>أنشأ بواسطة:</strong> ${document.created_by}</p>
                            <p><strong>تاريخ الإنشاء:</strong> ${document.created_at}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            ${document.signatures && document.signatures.length > 0 ? `
                <div class="mt-4">
                    <h5>التوقيعات</h5>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>الموقع</th>
                                    <th>النوع</th>
                                    <th>التاريخ</th>
                                    <th>السبب</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${document.signatures.map(sig => `
                                    <tr>
                                        <td>${sig.signer}</td>
                                        <td>${sig.signature_type}</td>
                                        <td>${sig.signed_at}</td>
                                        <td>${sig.signature_reason || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
            
            ${document.stamps && document.stamps.length > 0 ? `
                <div class="mt-4">
                    <h5>الأختام</h5>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>النوع</th>
                                    <th>النص</th>
                                    <th>بواسطة</th>
                                    <th>التاريخ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${document.stamps.map(stamp => `
                                    <tr>
                                        <td>${stamp.stamp_type}</td>
                                        <td>${stamp.stamp_text || '-'}</td>
                                        <td>${stamp.stamped_by}</td>
                                        <td>${stamp.stamped_at}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        `;

        const modal = new bootstrap.Modal(document.getElementById('documentDetailsModal'));
        modal.show();
    }

    formatFileSize(bytes) {
        if (!bytes) return '-';
        const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    signDocument() {
        if (!this.currentDocument) return;
        
        const modal = new bootstrap.Modal(document.getElementById('signatureModal'));
        modal.show();
    }

    async saveSignature() {
        try {
            if (!this.currentDocument) return;

            const form = document.getElementById('signatureForm');
            const formData = new FormData(form);
            
            // Get signature data from canvas
            const signatureData = this.signatureCanvas.toDataURL();
            
            const data = {
                signature_type: formData.get('signature_type'),
                signature_reason: formData.get('signature_reason'),
                signature_location: formData.get('signature_location'),
                signature_data: signatureData
            };

            const response = await fetch(`/api/documents/${this.currentDocument.id}/sign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                this.showSuccess('تم توقيع المستند بنجاح');
                bootstrap.Modal.getInstance(document.getElementById('signatureModal')).hide();
                bootstrap.Modal.getInstance(document.getElementById('documentDetailsModal')).hide();
                this.loadDocuments();
            } else {
                this.showError('خطأ في توقيع المستند: ' + result.error);
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
            console.error('Error signing document:', error);
        }
    }

    stampDocument() {
        if (!this.currentDocument) return;
        
        const modal = new bootstrap.Modal(document.getElementById('stampModal'));
        modal.show();
    }

    async saveStamp() {
        try {
            if (!this.currentDocument) return;

            const form = document.getElementById('stampForm');
            const formData = new FormData(form);
            
            const data = {
                stamp_type: formData.get('stamp_type'),
                stamp_text: formData.get('stamp_text'),
                stamp_reason: formData.get('stamp_reason')
            };

            const response = await fetch(`/api/documents/${this.currentDocument.id}/stamp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                this.showSuccess('تم ختم المستند بنجاح');
                bootstrap.Modal.getInstance(document.getElementById('stampModal')).hide();
                bootstrap.Modal.getInstance(document.getElementById('documentDetailsModal')).hide();
                this.loadDocuments();
            } else {
                this.showError('خطأ في ختم المستند: ' + result.error);
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
            console.error('Error stamping document:', error);
        }
    }

    async downloadDocument(documentId) {
        try {
            const id = documentId || this.currentDocument?.id;
            if (!id) return;

            window.open(`/api/documents/${id}/download`, '_blank');
        } catch (error) {
            this.showError('خطأ في تحميل المستند');
            console.error('Error downloading document:', error);
        }
    }

    filterDocuments() {
        this.currentFilters = {
            search: document.getElementById('documentsSearch')?.value || '',
            category_id: document.getElementById('documentsCategory')?.value || '',
            document_type: document.getElementById('documentsType')?.value || '',
            status: document.getElementById('documentsStatus')?.value || ''
        };

        // Remove empty filters
        Object.keys(this.currentFilters).forEach(key => {
            if (!this.currentFilters[key]) {
                delete this.currentFilters[key];
            }
        });

        this.currentPage = 1;
        this.loadDocuments(1);
    }

    clearFilters() {
        document.getElementById('documentsSearch').value = '';
        document.getElementById('documentsCategory').value = '';
        document.getElementById('documentsType').value = '';
        document.getElementById('documentsStatus').value = '';
        
        this.currentFilters = {};
        this.currentPage = 1;
        this.loadDocuments(1);
    }

    async deleteDocument(documentId) {
        if (!confirm('هل أنت متأكد من حذف هذا المستند؟')) return;

        try {
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                this.showSuccess('تم حذف المستند بنجاح');
                this.loadDocuments();
            } else {
                this.showError('خطأ في حذف المستند: ' + data.error);
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
            console.error('Error deleting document:', error);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showSuccess(message) {
        // Create and show success toast/alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }

    showError(message) {
        // إظهار رسالة خطأ
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('#documents .card-body');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
    }
}

// Initialize the documents manager
const documentsManager = new DocumentsManager();
