class StaffAssignmentManager {
    constructor() {
        this.currentPage = 1;
        this.currentTab = 'program';
        this.deleteId = null;
        this.deleteType = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStaffOptions();
        this.loadProgramOptions();
        this.loadAssignments();
        this.updateStatistics();
        
        // Set default assignment date to today
        document.getElementById('assignmentDate').value = new Date().toISOString().split('T')[0];
    }

    bindEvents() {
        // Tab switching
        document.getElementById('program-tab').addEventListener('click', () => {
            this.currentTab = 'program';
            this.loadAssignments();
        });

        document.getElementById('assessment-tab').addEventListener('click', () => {
            this.currentTab = 'assessment';
            this.loadAssignments();
        });

        // Assignment type selection in modal
        document.querySelectorAll('input[name="typeSelection"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleAssignmentFields(e.target.value);
            });
        });

        // Save assignment
        document.getElementById('saveAssignment').addEventListener('click', () => {
            this.saveAssignment();
        });

        // Delete confirmation
        document.getElementById('confirmDelete').addEventListener('click', () => {
            this.deleteAssignment();
        });

        // Filters
        document.getElementById('assignmentTypeFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('staffFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('statusFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('searchInput').addEventListener('input', () => {
            this.applyFilters();
        });

        // Modal events
        document.getElementById('assignmentModal').addEventListener('hidden.bs.modal', () => {
            this.resetForm();
        });
    }

    toggleAssignmentFields(type) {
        const programFields = document.getElementById('programFields');
        const assessmentFields = document.getElementById('assessmentFields');
        
        if (type === 'program') {
            programFields.style.display = 'block';
            assessmentFields.style.display = 'none';
            // Make program fields required
            document.getElementById('programId').required = true;
            document.getElementById('role').required = true;
            // Remove assessment field requirements
            document.getElementById('assessmentTypeSelect').required = false;
        } else {
            programFields.style.display = 'none';
            assessmentFields.style.display = 'block';
            // Make assessment fields required
            document.getElementById('assessmentTypeSelect').required = true;
            // Remove program field requirements
            document.getElementById('programId').required = false;
            document.getElementById('role').required = false;
        }
    }

    async loadStaffOptions() {
        try {
            const response = await fetch('/api/volunteer-staff');
            const data = await response.json();
            
            if (data.success) {
                const staffSelects = ['staffId', 'staffFilter'];
                staffSelects.forEach(selectId => {
                    const select = document.getElementById(selectId);
                    if (selectId === 'staffFilter') {
                        select.innerHTML = '<option value="">جميع الموظفين</option>';
                    } else {
                        select.innerHTML = '<option value="">اختر الموظف...</option>';
                    }
                    
                    data.staff.forEach(staff => {
                        const option = document.createElement('option');
                        option.value = staff.id;
                        option.textContent = staff.full_name;
                        select.appendChild(option);
                    });
                });
            }
        } catch (error) {
            console.error('Error loading staff options:', error);
        }
    }

    async loadProgramOptions() {
        try {
            const response = await fetch('/api/rehabilitation/programs');
            const data = await response.json();
            
            if (data.success) {
                const select = document.getElementById('programId');
                select.innerHTML = '<option value="">اختر البرنامج...</option>';
                
                data.programs.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program.id;
                    option.textContent = program.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading program options:', error);
        }
    }

    async loadAssignments() {
        try {
            const endpoint = this.currentTab === 'program' 
                ? '/api/staff-program-assignments' 
                : '/api/staff-assessment-assignments';
            
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: 12
            });

            const response = await fetch(`${endpoint}?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderAssignments(data);
                this.renderPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error loading assignments:', error);
        }
    }

    renderAssignments(data) {
        const container = this.currentTab === 'program' 
            ? document.getElementById('programAssignmentsList')
            : document.getElementById('assessmentAssignmentsList');
        
        const assignments = this.currentTab === 'program' ? data.assignments : data.assignments;
        
        if (!assignments || assignments.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">لا توجد تخصيصات</h5>
                        <p class="text-muted">لم يتم العثور على أي تخصيصات</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = assignments.map(assignment => this.createAssignmentCard(assignment)).join('');
    }

    createAssignmentCard(assignment) {
        const statusColors = {
            'active': 'success',
            'inactive': 'secondary',
            'suspended': 'warning',
            'completed': 'info'
        };

        const statusTexts = {
            'active': 'نشط',
            'inactive': 'غير نشط',
            'suspended': 'معلق',
            'completed': 'مكتمل'
        };

        const isProgram = this.currentTab === 'program';
        
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card assignment-card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div>
                            <span class="assignment-type-badge ${isProgram ? 'program-assignment' : 'assessment-assignment'}">
                                <i class="fas ${isProgram ? 'fa-project-diagram' : 'fa-clipboard-check'}"></i>
                                ${isProgram ? 'برنامج' : 'مقياس'}
                            </span>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li>
                                    <a class="dropdown-item" href="#" onclick="staffAssignmentManager.editAssignment(${assignment.id}, '${this.currentTab}')">
                                        <i class="fas fa-edit"></i> تعديل
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item text-danger" href="#" onclick="staffAssignmentManager.confirmDelete(${assignment.id}, '${this.currentTab}')">
                                        <i class="fas fa-trash"></i> حذف
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">
                            <i class="fas fa-user"></i> ${assignment.staff_name || 'غير محدد'}
                        </h6>
                        <p class="card-text">
                            <strong>${isProgram ? 'البرنامج:' : 'نوع المقياس:'}</strong> 
                            ${isProgram ? (assignment.program_name || 'غير محدد') : (assignment.assessment_type || 'غير محدد')}
                        </p>
                        ${isProgram ? `
                            <p class="card-text">
                                <strong>الدور:</strong> ${assignment.role || 'غير محدد'}
                            </p>
                            ${assignment.workload_hours ? `
                                <div class="mb-2">
                                    <small class="text-muted">ساعات العمل الأسبوعية: ${assignment.workload_hours}</small>
                                    <div class="progress workload-progress">
                                        <div class="progress-bar" style="width: ${(assignment.workload_hours / 40) * 100}%"></div>
                                    </div>
                                </div>
                            ` : ''}
                        ` : `
                            <p class="card-text">
                                <strong>التخصص:</strong> ${assignment.specialization || 'غير محدد'}
                            </p>
                            <p class="card-text">
                                <strong>مستوى الشهادة:</strong> ${assignment.certification_level || 'غير محدد'}
                            </p>
                            ${assignment.max_assessments_per_month ? `
                                <div class="mb-2">
                                    <small class="text-muted">عبء العمل: ${assignment.current_workload || 0}/${assignment.max_assessments_per_month}</small>
                                    <div class="progress workload-progress">
                                        <div class="progress-bar" style="width: ${((assignment.current_workload || 0) / assignment.max_assessments_per_month) * 100}%"></div>
                                    </div>
                                </div>
                            ` : ''}
                        `}
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-${statusColors[assignment.status]} status-badge">
                                ${statusTexts[assignment.status]}
                            </span>
                            <small class="text-muted">
                                ${new Date(assignment.assignment_date).toLocaleDateString('ar-SA')}
                            </small>
                        </div>
                        ${assignment.notes ? `
                            <div class="mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-sticky-note"></i> ${assignment.notes}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderPagination(pagination) {
        const container = this.currentTab === 'program' 
            ? document.getElementById('programPagination')
            : document.getElementById('assessmentPagination');
        
        if (pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<nav><ul class="pagination">';
        
        // Previous button
        if (pagination.has_prev) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="staffAssignmentManager.changePage(${pagination.page - 1})">السابق</a>
                </li>
            `;
        }

        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            paginationHTML += `
                <li class="page-item ${i === pagination.page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="staffAssignmentManager.changePage(${i})">${i}</a>
                </li>
            `;
        }

        // Next button
        if (pagination.has_next) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="staffAssignmentManager.changePage(${pagination.page + 1})">التالي</a>
                </li>
            `;
        }

        paginationHTML += '</ul></nav>';
        container.innerHTML = paginationHTML;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadAssignments();
    }

    async updateStatistics() {
        try {
            // Load program assignments statistics
            const programResponse = await fetch('/api/staff-program-assignments');
            const programData = await programResponse.json();
            
            // Load assessment assignments statistics
            const assessmentResponse = await fetch('/api/staff-assessment-assignments');
            const assessmentData = await assessmentResponse.json();
            
            if (programData.success && assessmentData.success) {
                const totalAssignments = (programData.pagination?.total || 0) + (assessmentData.pagination?.total || 0);
                const activeProgram = programData.assignments?.filter(a => a.status === 'active').length || 0;
                const activeAssessment = assessmentData.assignments?.filter(a => a.status === 'active').length || 0;
                
                document.getElementById('totalAssignments').textContent = totalAssignments;
                document.getElementById('activeAssignments').textContent = activeProgram + activeAssessment;
                document.getElementById('programAssignments').textContent = programData.pagination?.total || 0;
                document.getElementById('assessmentAssignments').textContent = assessmentData.pagination?.total || 0;
            }
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }

    editAssignment(id, type) {
        // Load assignment data and populate form
        this.loadAssignmentForEdit(id, type);
    }

    async loadAssignmentForEdit(id, type) {
        try {
            const endpoint = type === 'program' 
                ? `/api/staff-program-assignments/${id}` 
                : `/api/staff-assessment-assignments/${id}`;
            
            // For now, we'll just open the modal and set the type
            // In a real implementation, you'd fetch the specific assignment data
            document.getElementById('assignmentId').value = id;
            document.getElementById('assignmentType').value = type;
            document.getElementById('modalTitle').textContent = 'تعديل التخصيص';
            
            // Set the correct radio button
            if (type === 'program') {
                document.getElementById('programType').checked = true;
            } else {
                document.getElementById('assessmentType').checked = true;
            }
            
            this.toggleAssignmentFields(type);
            
            const modal = new bootstrap.Modal(document.getElementById('assignmentModal'));
            modal.show();
        } catch (error) {
            console.error('Error loading assignment for edit:', error);
        }
    }

    confirmDelete(id, type) {
        this.deleteId = id;
        this.deleteType = type;
        const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
        modal.show();
    }

    async deleteAssignment() {
        try {
            const endpoint = this.deleteType === 'program' 
                ? `/api/staff-program-assignments/${this.deleteId}` 
                : `/api/staff-assessment-assignments/${this.deleteId}`;
            
            const response = await fetch(endpoint, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('تم حذف التخصيص بنجاح', 'success');
                this.loadAssignments();
                this.updateStatistics();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
                modal.hide();
            } else {
                this.showAlert('حدث خطأ في حذف التخصيص', 'danger');
            }
        } catch (error) {
            console.error('Error deleting assignment:', error);
            this.showAlert('حدث خطأ في حذف التخصيص', 'danger');
        }
    }

    async saveAssignment() {
        const form = document.getElementById('assignmentForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const assignmentId = document.getElementById('assignmentId').value;
        const isEdit = assignmentId !== '';
        const typeSelection = document.querySelector('input[name="typeSelection"]:checked').value;
        
        try {
            const endpoint = typeSelection === 'program' 
                ? '/api/staff-program-assignments' + (isEdit ? `/${assignmentId}` : '')
                : '/api/staff-assessment-assignments' + (isEdit ? `/${assignmentId}` : '');
            
            const method = isEdit ? 'PUT' : 'POST';
            
            let requestData = {
                staff_id: parseInt(document.getElementById('staffId').value),
                assignment_date: document.getElementById('assignmentDate').value,
                status: document.getElementById('status').value,
                notes: document.getElementById('notes').value
            };

            if (typeSelection === 'program') {
                requestData = {
                    ...requestData,
                    program_id: parseInt(document.getElementById('programId').value),
                    role: document.getElementById('role').value,
                    workload_hours: document.getElementById('workloadHours').value ? parseInt(document.getElementById('workloadHours').value) : null,
                    end_date: document.getElementById('endDate').value || null,
                    responsibilities: document.getElementById('responsibilities').value
                };
            } else {
                requestData = {
                    ...requestData,
                    assessment_type: document.getElementById('assessmentTypeSelect').value,
                    specialization: document.getElementById('specialization').value,
                    certification_level: document.getElementById('certificationLevel').value,
                    max_assessments_per_month: document.getElementById('maxAssessments').value ? parseInt(document.getElementById('maxAssessments').value) : null,
                    expiry_date: document.getElementById('expiryDate').value || null,
                    current_workload: document.getElementById('currentWorkload').value ? parseInt(document.getElementById('currentWorkload').value) : 0
                };
            }

            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert(isEdit ? 'تم تحديث التخصيص بنجاح' : 'تم إنشاء التخصيص بنجاح', 'success');
                this.loadAssignments();
                this.updateStatistics();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('assignmentModal'));
                modal.hide();
            } else {
                this.showAlert('حدث خطأ في حفظ التخصيص', 'danger');
            }
        } catch (error) {
            console.error('Error saving assignment:', error);
            this.showAlert('حدث خطأ في حفظ التخصيص', 'danger');
        }
    }

    resetForm() {
        document.getElementById('assignmentForm').reset();
        document.getElementById('assignmentId').value = '';
        document.getElementById('assignmentType').value = '';
        document.getElementById('modalTitle').textContent = 'تخصيص جديد';
        document.getElementById('programType').checked = true;
        this.toggleAssignmentFields('program');
        document.getElementById('assignmentDate').value = new Date().toISOString().split('T')[0];
    }

    applyFilters() {
        // Implement filtering logic
        this.currentPage = 1;
        this.loadAssignments();
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Initialize the manager when the page loads
const staffAssignmentManager = new StaffAssignmentManager();
