// Help & Bob Scale Assessment Management
let currentAssessmentId = null;
let currentDomainIndex = 0;
let domains = [];
let assessmentItems = [];
let currentAssessment = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadStatistics();
    loadAssessments();
    loadStudents();
    loadAssessors();
    loadDomains();
    
    // Set default date to today
    document.getElementById('assessmentDate').value = new Date().toISOString().split('T')[0];
});

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('/api/help-bob/statistics', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalAssessments').textContent = stats.total || 0;
            document.getElementById('completedAssessments').textContent = stats.completed || 0;
            document.getElementById('inProgressAssessments').textContent = stats.in_progress || 0;
            document.getElementById('averageIndependence').textContent = `${stats.average_independence || 0}%`;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load assessments
async function loadAssessments() {
    try {
        showLoading();
        const response = await fetch('/api/help-bob/assessments', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const assessments = await response.json();
            displayAssessments(assessments);
        } else {
            showError('فشل في تحميل التقييمات');
        }
    } catch (error) {
        console.error('Error loading assessments:', error);
        showError('خطأ في تحميل التقييمات');
    } finally {
        hideLoading();
    }
}

// Display assessments in table
function displayAssessments(assessments) {
    const tbody = document.getElementById('assessmentsTableBody');
    tbody.innerHTML = '';
    
    assessments.forEach(assessment => {
        const row = document.createElement('tr');
        
        // Status badge
        let statusBadge = '';
        switch(assessment.status) {
            case 'completed':
                statusBadge = '<span class="badge bg-success">مكتمل</span>';
                break;
            case 'in_progress':
                statusBadge = '<span class="badge bg-warning">قيد التطبيق</span>';
                break;
            case 'cancelled':
                statusBadge = '<span class="badge bg-danger">ملغي</span>';
                break;
            default:
                statusBadge = '<span class="badge bg-secondary">غير محدد</span>';
        }
        
        // Independence level badge
        let independenceBadge = '';
        switch(assessment.independence_level) {
            case 'high':
                independenceBadge = '<span class="badge bg-success">عالي</span>';
                break;
            case 'moderate':
                independenceBadge = '<span class="badge bg-info">متوسط</span>';
                break;
            case 'low':
                independenceBadge = '<span class="badge bg-warning">منخفض</span>';
                break;
            case 'very_low':
                independenceBadge = '<span class="badge bg-danger">منخفض جداً</span>';
                break;
            default:
                independenceBadge = '<span class="badge bg-secondary">غير محدد</span>';
        }
        
        // Support needs
        let supportNeeds = assessment.support_needs || 'غير محدد';
        if (typeof supportNeeds === 'object') {
            supportNeeds = Object.values(supportNeeds).join(', ') || 'غير محدد';
        }
        
        row.innerHTML = `
            <td>${assessment.student_name || 'غير محدد'}</td>
            <td>${assessment.assessor_name || 'غير محدد'}</td>
            <td>${formatDate(assessment.assessment_date)}</td>
            <td>${getAssessmentTypeText(assessment.assessment_type)}</td>
            <td>${statusBadge}</td>
            <td>${independenceBadge}</td>
            <td>${supportNeeds}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewAssessmentDetails(${assessment.id})" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${assessment.status === 'in_progress' ? 
                        `<button class="btn btn-outline-success" onclick="continueAssessmentDirect(${assessment.id})" title="متابعة التقييم">
                            <i class="fas fa-play"></i>
                        </button>` : ''
                    }
                    ${assessment.status === 'completed' ? 
                        `<button class="btn btn-outline-info" onclick="generateReportDirect(${assessment.id})" title="إنشاء تقرير">
                            <i class="fas fa-file-alt"></i>
                        </button>` : ''
                    }
                    <button class="btn btn-outline-danger" onclick="deleteAssessment(${assessment.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Load students for dropdown
async function loadStudents() {
    try {
        const response = await fetch('/api/students', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const students = await response.json();
            const selects = ['studentId', 'studentFilter'];
            
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    // Clear existing options except the first one
                    while (select.children.length > 1) {
                        select.removeChild(select.lastChild);
                    }
                    
                    students.forEach(student => {
                        const option = document.createElement('option');
                        option.value = student.id;
                        option.textContent = student.name;
                        select.appendChild(option);
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

// Load assessors for dropdown
async function loadAssessors() {
    try {
        const response = await fetch('/api/employees', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const assessors = await response.json();
            const selects = ['assessorId', 'assessorFilter'];
            
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    // Clear existing options except the first one
                    while (select.children.length > 1) {
                        select.removeChild(select.lastChild);
                    }
                    
                    assessors.forEach(assessor => {
                        const option = document.createElement('option');
                        option.value = assessor.id;
                        option.textContent = assessor.name;
                        select.appendChild(option);
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error loading assessors:', error);
    }
}

// Load domains
async function loadDomains() {
    try {
        const response = await fetch('/api/help-bob/domains', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            domains = await response.json();
        }
    } catch (error) {
        console.error('Error loading domains:', error);
    }
}

// Show new assessment modal
function showNewAssessmentModal() {
    const modal = new bootstrap.Modal(document.getElementById('newAssessmentModal'));
    modal.show();
}

// Create new assessment
async function createAssessment() {
    const form = document.getElementById('newAssessmentForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = {
        student_id: document.getElementById('studentId').value,
        assessor_id: document.getElementById('assessorId').value,
        assessment_date: document.getElementById('assessmentDate').value,
        assessment_type: document.getElementById('assessmentType').value,
        assessment_method: document.getElementById('assessmentMethod').value,
        assessment_setting: document.getElementById('assessmentSetting').value,
        chronological_age_years: document.getElementById('chronologicalAgeYears').value || null,
        chronological_age_months: document.getElementById('chronologicalAgeMonths').value || null,
        primary_informant: document.getElementById('primaryInformant').value,
        informant_relationship: document.getElementById('informantRelationship').value,
        informant_reliability: document.getElementById('informantReliability').value,
        environmental_conditions: document.getElementById('environmentalConditions').value,
        support_systems_present: document.getElementById('supportSystemsPresent').value,
        additional_notes: document.getElementById('additionalNotes').value
    };
    
    try {
        const response = await fetch('/api/help-bob/assessments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showSuccess('تم إنشاء التقييم بنجاح');
            
            // Close modal and reset form
            bootstrap.Modal.getInstance(document.getElementById('newAssessmentModal')).hide();
            form.reset();
            document.getElementById('assessmentDate').value = new Date().toISOString().split('T')[0];
            
            // Reload data
            loadStatistics();
            loadAssessments();
            
            // Start assessment immediately
            currentAssessmentId = result.id;
            setTimeout(() => continueAssessmentDirect(result.id), 1000);
        } else {
            const error = await response.json();
            showError(error.message || 'فشل في إنشاء التقييم');
        }
    } catch (error) {
        console.error('Error creating assessment:', error);
        showError('خطأ في إنشاء التقييم');
    }
}

// Continue assessment directly
async function continueAssessmentDirect(assessmentId) {
    currentAssessmentId = assessmentId;
    currentDomainIndex = 0;
    
    try {
        // Load assessment items
        const response = await fetch(`/api/help-bob/assessments/${assessmentId}/items`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            assessmentItems = await response.json();
            showDomainAssessmentModal();
        } else {
            showError('فشل في تحميل عناصر التقييم');
        }
    } catch (error) {
        console.error('Error loading assessment items:', error);
        showError('خطأ في تحميل عناصر التقييم');
    }
}

// Show domain assessment modal
function showDomainAssessmentModal() {
    createDomainTabs();
    showDomainContent(0);
    updateProgress();
    
    const modal = new bootstrap.Modal(document.getElementById('domainAssessmentModal'));
    modal.show();
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

function getAssessmentTypeText(type) {
    const types = {
        'comprehensive': 'شامل',
        'screening': 'فحص',
        'follow_up': 'متابعة'
    };
    return types[type] || type || 'غير محدد';
}

function getAssessmentMethodText(method) {
    const methods = {
        'direct_observation': 'ملاحظة مباشرة',
        'interview': 'مقابلة',
        'mixed': 'مختلط'
    };
    return methods[method] || method || 'غير محدد';
}

function getInformantRelationshipText(relationship) {
    const relationships = {
        'parent': 'والد/والدة',
        'teacher': 'معلم',
        'caregiver': 'مقدم رعاية',
        'therapist': 'معالج'
    };
    return relationships[relationship] || relationship || 'غير محدد';
}

function getReliabilityText(reliability) {
    const levels = {
        'high': 'عالية',
        'moderate': 'متوسطة',
        'low': 'منخفضة'
    };
    return levels[reliability] || reliability || 'غير محدد';
}

function getSettingText(setting) {
    const settings = {
        'home': 'المنزل',
        'school': 'المدرسة',
        'clinic': 'العيادة',
        'community': 'المجتمع'
    };
    return settings[setting] || setting || 'غير محدد';
}

// Show/hide loading
function showLoading() {
    document.getElementById('loadingSpinner').classList.remove('d-none');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.add('d-none');
}

// Show success message
function showSuccess(message) {
    // You can implement a toast notification here
    alert(message);
}

// Show error message
function showError(message) {
    // You can implement a toast notification here
    alert(message);
}

// Apply filters (placeholder)
function applyFilters() {
    loadAssessments();
}

// Clear filters (placeholder)
function clearFilters() {
    document.getElementById('studentFilter').value = '';
    document.getElementById('assessorFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('independenceFilter').value = '';
    loadAssessments();
}

// Placeholder functions for domain assessment
function createDomainTabs() {
    // Implementation will be added in next part
}

function showDomainContent(domainIndex) {
    // Implementation will be added in next part
}

function updateProgress() {
    // Implementation will be added in next part
}

function viewAssessmentDetails(assessmentId) {
    // Implementation will be added in next part
}

function deleteAssessment(assessmentId) {
    if (confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
        // Implementation will be added in next part
    }
}

function generateReportDirect(assessmentId) {
    // Implementation will be added in next part
}
