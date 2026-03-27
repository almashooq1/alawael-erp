// Main JavaScript file for Al-Awael Day Care System

// Global variables
let currentUser = null;
let authToken = null;

// Initialize application
$(document).ready(function() {
    // Check authentication
    checkAuth();
    
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Initialize popovers
    $('[data-bs-toggle="popover"]').popover();
    
    // Set up AJAX defaults
    setupAjaxDefaults();
});

// Check authentication status
function checkAuth() {
    authToken = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (authToken && userData) {
        currentUser = JSON.parse(userData);
        setAuthHeaders();
    }
}

// Set up AJAX defaults
function setupAjaxDefaults() {
    $.ajaxSetup({
        beforeSend: function(xhr) {
            if (authToken) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);
            }
        },
        error: function(xhr, status, error) {
            if (xhr.status === 401) {
                // Token expired or invalid
                logout();
            }
        }
    });
}

// Set authorization headers
function setAuthHeaders() {
    if (authToken) {
        $.ajaxSetup({
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Show loading spinner
function showLoading(element) {
    const spinner = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    $(element).html(spinner);
}

// Hide loading spinner
function hideLoading() {
    $('.fa-spinner').parent().remove();
}

// Format date to Arabic
function formatDateArabic(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        locale: 'ar-SA'
    };
    return date.toLocaleDateString('ar-SA', options);
}

// Format date for input fields
function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Show confirmation dialog
function showConfirmDialog(title, message, callback) {
    const modalHtml = `
        <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إلغاء</button>
                        <button type="button" class="btn btn-danger" id="confirmAction">تأكيد</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    $('#confirmModal').remove();
    
    // Add new modal
    $('body').append(modalHtml);
    
    // Show modal
    $('#confirmModal').modal('show');
    
    // Handle confirm action
    $('#confirmAction').click(function() {
        $('#confirmModal').modal('hide');
        if (callback) callback();
    });
}

// Show success message
function showSuccessMessage(message) {
    showToast('success', message);
}

// Show error message
function showErrorMessage(message) {
    showToast('error', message);
}

// Show info message
function showInfoMessage(message) {
    showToast('info', message);
}

// Show toast notification
function showToast(type, message) {
    const iconMap = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'info': 'fa-info-circle',
        'warning': 'fa-exclamation-triangle'
    };
    
    const colorMap = {
        'success': 'text-success',
        'error': 'text-danger',
        'info': 'text-info',
        'warning': 'text-warning'
    };
    
    const toastHtml = `
        <div class="toast align-items-center border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas ${iconMap[type]} ${colorMap[type]} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    // Create toast container if it doesn't exist
    if ($('#toast-container').length === 0) {
        $('body').append('<div id="toast-container" class="toast-container position-fixed top-0 end-0 p-3"></div>');
    }
    
    // Add toast
    const $toast = $(toastHtml);
    $('#toast-container').append($toast);
    
    // Show toast
    const toast = new bootstrap.Toast($toast[0]);
    toast.show();
    
    // Remove toast after it's hidden
    $toast.on('hidden.bs.toast', function() {
        $(this).remove();
    });
}

// Validate national ID
function validateNationalId(nationalId) {
    // Saudi national ID validation
    if (!/^\d{10}$/.test(nationalId)) {
        return false;
    }
    
    // Additional validation logic can be added here
    return true;
}

// Validate email
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone number
function validatePhone(phone) {
    // Saudi phone number validation
    const phoneRegex = /^(05|5)[0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
}

// Format phone number
function formatPhone(phone) {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Format as XXX XXX XXXX
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    
    return phone;
}

// Search functionality
function initializeSearch(searchInput, searchCallback) {
    let searchTimeout;
    
    $(searchInput).on('input', function() {
        const query = $(this).val().trim();
        
        // Clear previous timeout
        clearTimeout(searchTimeout);
        
        // Set new timeout
        searchTimeout = setTimeout(function() {
            if (searchCallback) {
                searchCallback(query);
            }
        }, 300);
    });
}

// Table utilities
function initializeDataTable(tableId, options = {}) {
    const defaultOptions = {
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/ar.json'
        },
        responsive: true,
        pageLength: 25,
        order: [[0, 'desc']],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip'
    };
    
    const finalOptions = $.extend({}, defaultOptions, options);
    
    return $(tableId).DataTable(finalOptions);
}

// File upload utilities
function handleFileUpload(inputElement, allowedTypes = ['image/jpeg', 'image/png', 'image/gif'], maxSize = 5 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const file = inputElement.files[0];
        
        if (!file) {
            reject('لم يتم اختيار ملف');
            return;
        }
        
        // Check file type
        if (!allowedTypes.includes(file.type)) {
            reject('نوع الملف غير مدعوم');
            return;
        }
        
        // Check file size
        if (file.size > maxSize) {
            reject('حجم الملف كبير جداً');
            return;
        }
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        
        resolve(formData);
    });
}

// Print utilities
function printElement(elementId) {
    const printContent = document.getElementById(elementId);
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    
    // Reinitialize page
    location.reload();
}

// Export to Excel
function exportToExcel(data, filename) {
    // This would require a library like SheetJS
    // For now, we'll create a simple CSV export
    exportToCSV(data, filename);
}

// Export to CSV
function exportToCSV(data, filename) {
    const csvContent = "data:text/csv;charset=utf-8," 
        + data.map(row => row.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Utility functions for forms
function resetForm(formId) {
    $(formId)[0].reset();
    $(formId).find('.is-invalid').removeClass('is-invalid');
    $(formId).find('.invalid-feedback').remove();
}

function showFieldError(fieldId, message) {
    const field = $(fieldId);
    field.addClass('is-invalid');
    
    // Remove existing error message
    field.siblings('.invalid-feedback').remove();
    
    // Add new error message
    field.after(`<div class="invalid-feedback">${message}</div>`);
}

function clearFieldErrors(formId) {
    $(formId).find('.is-invalid').removeClass('is-invalid');
    $(formId).find('.invalid-feedback').remove();
}

// Local storage utilities
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        return false;
    }
}

function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error reading from localStorage:', e);
        return null;
    }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        console.error('Error removing from localStorage:', e);
        return false;
    }
}
