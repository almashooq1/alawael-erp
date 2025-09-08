class StudentComprehensiveManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentFileId = null;
        this.assessmentTemplates = [];
        this.init();
    }

    init() {
        this.loadDashboardStats();
        this.loadFiles();
        this.loadAssessmentTemplates();
        this.loadStudents();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('searchFiles').addEventListener('input', 
            this.debounce(() => this.searchFiles(), 500));
        
        // Status filter
        document.getElementById('statusFilter').addEventListener('change', () => this.searchFiles());
        
        // Assessment form
        document.getElementById('newAssessmentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createAssessment();
        });
        
        // Export form
        document.getElementById('exportForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.exportFile();
        });
        
        // Import form
        document.getElementById('importForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.importFile();
        });
        
        // Print form
        document.getElementById('printForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createPrintJob();
        });
        
        // New file form
        document.getElementById('newFileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNewFile();
        });
        
        // Import type change
        document.getElementById('importType').addEventListener('change', (e) => {
            const existingFileSelect = document.getElementById('existingFileSelect');
            if (e.target.value === 'update' || e.target.value === 'merge') {
                existingFileSelect.style.display = 'block';
            } else {
                existingFileSelect.style.display = 'none';
            }
        });
        
        // Print file selection
        document.getElementById('printFileId').addEventListener('change', (e) => {
            if (e.target.value) {
                this.generatePrintPreview(e.target.value);
            }
        });
    }

    async loadDashboardStats() {
        try {
            const response = await fetch('/api/student-comprehensive/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data.stats);
                this.displayRecentAssessments(data.recent_assessments);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('totalFiles').textContent = stats.total_files || 0;
        document.getElementById('activeFiles').textContent = stats.active_files || 0;
        document.getElementById('totalAssessments').textContent = stats.total_assessments || 0;
        document.getElementById('aiAnalyses').textContent = stats.ai_analyses || 0;
    }

    displayRecentAssessments(assessments) {
        const container = document.getElementById('recentAssessments');
        
        if (!assessments || assessments.length === 0) {
            container.innerHTML = '<p class="text-muted">لا توجد تقييمات حديثة</p>';
            return;
        }

        container.innerHTML = assessments.map(assessment => `
            <div class="assessment-card completed">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${assessment.student_name}</h6>
                        <small class="text-muted">${assessment.template_name}</small>
                    </div>
                    <small class="text-muted">${new Date(assessment.assessment_date).toLocaleDateString('ar-SA')}</small>
                </div>
                <div class="mt-2">
                    <span class="badge bg-${assessment.status === 'completed' ? 'success' : 'warning'}">${assessment.status}</span>
                </div>
            </div>
        `).join('');
    }

    async loadFiles(page = 1) {
        try {
            const search = document.getElementById('searchFiles').value;
            const status = document.getElementById('statusFilter').value;
            
            const params = new URLSearchParams({
                page: page,
                per_page: this.itemsPerPage
            });
            
            if (search) params.append('search', search);
            if (status) params.append('status', status);

            const response = await fetch(`/api/student-comprehensive/files?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayFiles(data.files);
                this.updatePagination(data.current_page, data.pages, data.total);
                this.populateFileSelects(data.files);
            }
        } catch (error) {
            console.error('Error loading files:', error);
            this.showAlert('خطأ في تحميل الملفات', 'danger');
        }
    }

    displayFiles(files) {
        const container = document.getElementById('filesList');
        
        if (!files || files.length === 0) {
            container.innerHTML = `
                <div class="file-card text-center">
                    <i class="fas fa-folder-open fa-3x text-muted mb-3"></i>
                    <p class="text-muted">لا توجد ملفات</p>
                </div>
            `;
            return;
        }

        container.innerHTML = files.map(file => `
            <div class="file-card" onclick="this.selectFile(${file.id})">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h6 class="mb-1">${file.student_name}</h6>
                        <p class="text-muted mb-1">رقم الملف: ${file.file_number}</p>
                        <small class="text-muted">آخر تحديث: ${new Date(file.last_updated).toLocaleDateString('ar-SA')}</small>
                    </div>
                    <div class="col-md-4 text-end">
                        <span class="badge bg-${file.status === 'active' ? 'success' : 'secondary'} mb-2">${file.status}</span>
                        <div class="small text-muted">
                            <div><i class="fas fa-clipboard-list"></i> ${file.assessments_count} تقييم</div>
                            <div><i class="fas fa-file"></i> ${file.documents_count} وثيقة</div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async selectFile(fileId) {
        try {
            this.currentFileId = fileId;
            
            const response = await fetch(`/api/student-comprehensive/files/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const file = await response.json();
                this.displayFileDetails(file);
            }
        } catch (error) {
            console.error('Error loading file details:', error);
        }
    }

    displayFileDetails(file) {
        const container = document.getElementById('fileDetailsContent');
        const detailsCard = document.getElementById('fileDetails');
        
        container.innerHTML = `
            <div class="mb-3">
                <strong>اسم الطالب:</strong> ${file.student_name}
            </div>
            <div class="mb-3">
                <strong>رقم الملف:</strong> ${file.file_number}
            </div>
            <div class="mb-3">
                <strong>تاريخ الإنشاء:</strong> ${new Date(file.creation_date).toLocaleDateString('ar-SA')}
            </div>
            <div class="mb-3">
                <strong>الحالة:</strong> 
                <span class="badge bg-${file.status === 'active' ? 'success' : 'secondary'}">${file.status}</span>
            </div>
            <div class="mb-3">
                <strong>التقييمات:</strong>
                <div class="mt-2">
                    ${file.assessments.map(assessment => `
                        <div class="assessment-card ${assessment.status}">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <small>${assessment.template_name}</small>
                                    <div class="text-muted small">${new Date(assessment.assessment_date).toLocaleDateString('ar-SA')}</div>
                                </div>
                                <div>
                                    <span class="ai-analysis-badge ${assessment.ai_analysis_completed ? 'ai-completed' : 'ai-not-requested'}">
                                        ${assessment.ai_analysis_completed ? 'تحليل مكتمل' : 'بدون تحليل'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="d-grid gap-2">
                <button class="btn btn-primary btn-sm" onclick="this.performAIAnalysis(${file.id})">
                    <i class="fas fa-brain"></i> تحليل بالذكاء الاصطناعي
                </button>
                <button class="btn btn-success btn-sm" onclick="this.exportFile(${file.id})">
                    <i class="fas fa-download"></i> تصدير الملف
                </button>
            </div>
        `;
        
        detailsCard.style.display = 'block';
    }

    async loadAssessmentTemplates() {
        try {
            const response = await fetch('/api/student-comprehensive/assessment-templates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.assessmentTemplates = data.templates;
                this.populateTemplateSelects(data.templates);
                this.displayTemplates(data.templates);
            }
        } catch (error) {
            console.error('Error loading assessment templates:', error);
        }
    }

    populateTemplateSelects(templates) {
        const select = document.getElementById('assessmentTemplateId');
        select.innerHTML = '<option value="">اختر القالب</option>';
        
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.name} (${template.category})`;
            select.appendChild(option);
        });
    }

    displayTemplates(templates) {
        const container = document.getElementById('assessmentTemplates');
        
        container.innerHTML = templates.map(template => `
            <div class="assessment-card">
                <h6>${template.name}</h6>
                <p class="small text-muted mb-2">${template.description || 'لا يوجد وصف'}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="badge bg-info">${template.category}</span>
                    <div class="small text-muted">
                        ${template.duration_minutes ? `${template.duration_minutes} دقيقة` : 'غير محدد'}
                    </div>
                </div>
                ${template.requires_ai_analysis ? 
                    '<div class="mt-2"><span class="badge bg-warning">يتطلب تحليل ذكي</span></div>' : 
                    ''
                }
            </div>
        `).join('');
    }

    async loadStudents() {
        try {
            const response = await fetch('/api/students', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.populateStudentSelects(data.students || []);
            }
        } catch (error) {
            console.error('Error loading students:', error);
        }
    }

    populateStudentSelects(students) {
        const select = document.getElementById('newFileStudentId');
        select.innerHTML = '<option value="">اختر الطالب</option>';
        
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = student.name;
            select.appendChild(option);
        });
    }

    populateFileSelects(files) {
        const selects = [
            'assessmentFileId', 'aiAnalysisFileId', 'exportFileId', 
            'printFileId', 'existingFileId'
        ];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">اختر الملف</option>';
                
                files.forEach(file => {
                    const option = document.createElement('option');
                    option.value = file.id;
                    option.textContent = `${file.student_name} - ${file.file_number}`;
                    select.appendChild(option);
                });
            }
        });
    }

    async createAssessment() {
        try {
            const formData = {
                comprehensive_file_id: parseInt(document.getElementById('assessmentFileId').value),
                template_id: parseInt(document.getElementById('assessmentTemplateId').value),
                assessment_date: document.getElementById('assessmentDate').value,
                ai_analysis_requested: document.getElementById('requestAIAnalysis').checked
            };

            const response = await fetch('/api/student-comprehensive/assessments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showAlert('تم إنشاء التقييم بنجاح', 'success');
                document.getElementById('newAssessmentForm').reset();
                this.loadDashboardStats();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إنشاء التقييم', 'danger');
            }
        } catch (error) {
            console.error('Error creating assessment:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'danger');
        }
    }

    async performAIAnalysis(fileId = null) {
        try {
            const analysisFileId = fileId || document.getElementById('aiAnalysisFileId').value;
            const analysisType = document.getElementById('aiAnalysisType').value;
            
            if (!analysisFileId) {
                this.showAlert('يرجى اختيار ملف للتحليل', 'warning');
                return;
            }

            this.showLoadingSpinner('جاري إجراء التحليل...');

            let endpoint = '';
            if (analysisType === 'longitudinal') {
                endpoint = `/api/student-comprehensive/files/${analysisFileId}/longitudinal-analysis`;
            } else {
                // For comprehensive analysis, we need an assessment record ID
                // This is a simplified version - in practice, you'd select a specific assessment
                endpoint = `/api/student-comprehensive/assessments/1/ai-analysis`;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            this.hideLoadingSpinner();

            if (response.ok) {
                const result = await response.json();
                this.displayAIAnalysisResults(result);
                this.updateConfidenceMeter(result.confidence_score || 0.75);
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في التحليل', 'danger');
            }
        } catch (error) {
            this.hideLoadingSpinner();
            console.error('Error performing AI analysis:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'danger');
        }
    }

    displayAIAnalysisResults(results) {
        const container = document.getElementById('aiAnalysisResults');
        
        container.innerHTML = `
            <div class="ai-insights">
                <h5><i class="fas fa-brain"></i> نتائج التحليل</h5>
                <div class="row">
                    <div class="col-md-6">
                        <h6>النتائج الرئيسية</h6>
                        <ul class="list-unstyled">
                            ${results.findings ? Object.entries(results.findings).map(([key, value]) => 
                                `<li><i class="fas fa-check-circle text-success"></i> ${key}: ${value}</li>`
                            ).join('') : '<li>لا توجد نتائج</li>'}
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <h6>الأنماط المحددة</h6>
                        <ul class="list-unstyled">
                            ${results.patterns ? results.patterns.map(pattern => 
                                `<li><i class="fas fa-search text-info"></i> ${pattern}</li>`
                            ).join('') : '<li>لا توجد أنماط</li>'}
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="file-card mt-3">
                <h6><i class="fas fa-chart-line"></i> التنبؤات</h6>
                <div class="row">
                    ${results.predictions ? Object.entries(results.predictions).map(([key, value]) => `
                        <div class="col-md-6 mb-3">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">${key}</h6>
                                    <p class="card-text">${typeof value === 'object' ? JSON.stringify(value) : value}</p>
                                </div>
                            </div>
                        </div>
                    `).join('') : '<p>لا توجد تنبؤات</p>'}
                </div>
            </div>
        `;
        
        // Display recommendations
        if (results.recommendations) {
            this.displayAIRecommendations(results.recommendations);
        }
    }

    displayAIRecommendations(recommendations) {
        const container = document.getElementById('aiRecommendations');
        
        container.innerHTML = recommendations.map(rec => `
            <div class="alert alert-info py-2 mb-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${rec.area || 'عام'}</strong>
                        <p class="mb-0 small">${rec.recommendation}</p>
                    </div>
                    <span class="badge bg-${rec.priority === 'عالي' ? 'danger' : rec.priority === 'متوسط' ? 'warning' : 'success'}">
                        ${rec.priority}
                    </span>
                </div>
            </div>
        `).join('');
    }

    updateConfidenceMeter(confidence) {
        const fill = document.getElementById('confidenceFill');
        const text = document.getElementById('confidenceText');
        
        const percentage = Math.round(confidence * 100);
        fill.style.width = `${percentage}%`;
        text.textContent = `${percentage}%`;
    }

    async exportFile() {
        try {
            const formData = {
                format: document.getElementById('exportFormat').value,
                include_sections: [],
                purpose: document.getElementById('exportPurpose').value
            };

            // Collect selected sections
            if (document.getElementById('includePersonalInfo').checked) {
                formData.include_sections.push('personal_info');
            }
            if (document.getElementById('includeAssessments').checked) {
                formData.include_sections.push('assessments');
            }
            if (document.getElementById('includeMedicalHistory').checked) {
                formData.include_sections.push('medical_history');
            }
            if (document.getElementById('includeAIAnalysis').checked) {
                formData.include_sections.push('ai_analysis');
            }

            const fileId = document.getElementById('exportFileId').value;
            
            const response = await fetch(`/api/student-comprehensive/files/${fileId}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                // Handle file download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comprehensive_file_${fileId}.${formData.format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showAlert('تم تصدير الملف بنجاح', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في التصدير', 'danger');
            }
        } catch (error) {
            console.error('Error exporting file:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'danger');
        }
    }

    async createPrintJob() {
        try {
            const formData = {
                job_name: `طباعة ملف ${document.getElementById('printFileId').value}`,
                document_type: document.getElementById('printDocumentType').value,
                copies: parseInt(document.getElementById('printCopies').value),
                confidentiality_level: document.getElementById('printConfidentiality').value,
                watermark_text: document.getElementById('printWatermark').value,
                purpose: document.getElementById('printPurpose').value
            };

            const fileId = document.getElementById('printFileId').value;
            
            const response = await fetch(`/api/student-comprehensive/files/${fileId}/print`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showAlert('تم إرسال مهمة الطباعة بنجاح', 'success');
                document.getElementById('printForm').reset();
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'خطأ في إنشاء مهمة الطباعة', 'danger');
            }
        } catch (error) {
            console.error('Error creating print job:', error);
            this.showAlert('خطأ في الاتصال بالخادم', 'danger');
        }
    }

    generatePrintPreview(fileId) {
        const preview = document.getElementById('printPreview');
        preview.innerHTML = `
            <div class="text-center">
                <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
                <h6>معاينة الطباعة</h6>
                <p class="text-muted">الملف رقم: ${fileId}</p>
                <div class="border rounded p-3 text-start">
                    <h6>مراكز الأوائل للرعاية النهارية</h6>
                    <hr>
                    <p><strong>الملف الشامل للطالب</strong></p>
                    <p>رقم الملف: CF-${new Date().getFullYear()}-${fileId}</p>
                    <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</p>
                    <hr>
                    <p class="text-muted">محتوى الملف سيظهر هنا...</p>
                </div>
            </div>
        `;
    }

    searchFiles() {
        this.currentPage = 1;
        this.loadFiles(this.currentPage);
    }

    updatePagination(currentPage, totalPages, totalItems) {
        const container = document.getElementById('filesPagination');
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<nav><ul class="pagination justify-content-center">';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="studentManager.loadFiles(${currentPage - 1})">السابق</a>
            </li>
        `;
        
        // Page numbers
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="studentManager.loadFiles(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="studentManager.loadFiles(${currentPage + 1})">التالي</a>
            </li>
        `;
        
        paginationHTML += '</ul></nav>';
        container.innerHTML = paginationHTML;
    }

    showLoadingSpinner(message = 'جاري التحميل...') {
        // Implementation for loading spinner
        console.log(message);
    }

    hideLoadingSpinner() {
        // Implementation to hide loading spinner
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
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
}

// Global functions
function createNewFile() {
    const modal = new bootstrap.Modal(document.getElementById('newFileModal'));
    modal.show();
}

function saveNewFile() {
    if (window.studentManager) {
        window.studentManager.createNewFile();
    }
}

function refreshData() {
    if (window.studentManager) {
        window.studentManager.loadDashboardStats();
        window.studentManager.loadFiles();
    }
}

function searchFiles() {
    if (window.studentManager) {
        window.studentManager.searchFiles();
    }
}

function performAIAnalysis() {
    if (window.studentManager) {
        window.studentManager.performAIAnalysis();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.studentManager = new StudentComprehensiveManager();
});
