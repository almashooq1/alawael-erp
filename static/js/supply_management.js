/**
 * نظام طلب الإمداد بالمواد - JavaScript
 * Supply Request Management System - Frontend JavaScript
 */

// Global variables
let currentPage = 1;
let itemsPerPage = 20;
let requestItemCounter = 0;
let authToken = localStorage.getItem('access_token');

// Initialize the application
$(document).ready(function() {
    initializeSupplySystem();
});

/**
 * تهيئة النظام
 */
function initializeSupplySystem() {
    loadDashboardData();
    loadBranches();
    loadCategories();
    setupEventListeners();
    
    // Auto-refresh notifications every 30 seconds
    setInterval(loadNotifications, 30000);
    
    // Set default required date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    $('#requiredDateInput').val(tomorrow.toISOString().slice(0, 16));
}

/**
 * إعداد مستمعي الأحداث
 */
function setupEventListeners() {
    $('#supplyTabs button[data-bs-toggle="tab"]').on('shown.bs.tab', function(e) {
        const target = $(e.target).attr('data-bs-target');
        
        switch(target) {
            case '#requests':
                loadSupplyRequests();
                break;
            case '#inventory':
                loadInventory();
                break;
            case '#items':
                loadSupplyItems();
                break;
            case '#notifications':
                loadNotifications();
                break;
        }
    });
    
    $('#inventorySearchInput').on('keyup', debounce(applyInventoryFilter, 500));
    $('#itemsSearchInput').on('keyup', debounce(applyItemsFilter, 500));
}

/**
 * تحميل بيانات لوحة التحكم
 */
function loadDashboardData() {
    showLoading();
    
    $.ajax({
        url: '/api/supply-dashboard',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + authToken
        },
        success: function(response) {
            if (response.success) {
                updateDashboardStats(response.statistics);
                updateRecentRequests(response.recent_requests);
                createRequestsChart(response.statistics);
            }
        },
        error: function(xhr) {
            showError('خطأ في تحميل بيانات لوحة التحكم');
        },
        complete: function() {
            hideLoading();
        }
    });
}

/**
 * تحديث إحصائيات لوحة التحكم
 */
function updateDashboardStats(stats) {
    $('#totalRequestsCount').text(stats.total_requests || 0);
    $('#pendingRequestsCount').text(stats.pending_requests || 0);
    $('#approvedRequestsCount').text(stats.approved_requests || 0);
    $('#urgentRequestsCount').text(stats.urgent_requests || 0);
    
    if (stats.unread_notifications > 0) {
        $('#notificationsBadge').text(stats.unread_notifications).show();
    } else {
        $('#notificationsBadge').hide();
    }
}

/**
 * تحديث الطلبات الحديثة
 */
function updateRecentRequests(requests) {
    const container = $('#recentRequestsList');
    container.empty();
    
    if (requests.length === 0) {
        container.html('<p class="text-muted text-center">لا توجد طلبات حديثة</p>');
        return;
    }
    
    requests.forEach(request => {
        const requestCard = `
            <div class="request-card mb-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${request.request_number}</h6>
                        <small class="text-muted">${request.requesting_branch_name}</small>
                    </div>
                    <div class="text-end">
                        <span class="priority-badge priority-${request.priority_level}">${getPriorityText(request.priority_level)}</span>
                        <br>
                        <span class="status-badge status-${request.status} mt-1">${getStatusText(request.status)}</span>
                    </div>
                </div>
                <small class="text-muted">${formatDate(request.requested_date)}</small>
            </div>
        `;
        container.append(requestCard);
    });
}

/**
 * إنشاء مخطط الطلبات
 */
function createRequestsChart(stats) {
    const ctx = document.getElementById('requestsChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['معلقة', 'مُوافق عليها', 'عاجلة', 'أخرى'],
            datasets: [{
                data: [
                    stats.pending_requests,
                    stats.approved_requests,
                    stats.urgent_requests,
                    stats.total_requests - stats.pending_requests - stats.approved_requests - stats.urgent_requests
                ],
                backgroundColor: ['#ffc107', '#198754', '#dc3545', '#6c757d'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Utility functions
function getPriorityText(priority) {
    const priorities = {
        'urgent': 'عاجل',
        'high': 'عالي',
        'normal': 'عادي',
        'low': 'منخفض'
    };
    return priorities[priority] || priority;
}

function getStatusText(status) {
    const statuses = {
        'pending': 'معلق',
        'approved': 'مُوافق عليه',
        'rejected': 'مرفوض',
        'shipped': 'تم الشحن',
        'received': 'تم الاستلام'
    };
    return statuses[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA') + ' ' + date.toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'});
}

function showLoading() {
    $('#loadingSpinner').show();
}

function hideLoading() {
    $('#loadingSpinner').hide();
}

function showError(message) {
    alert('خطأ: ' + message);
}

function showSuccess(message) {
    alert('نجح: ' + message);
}

function debounce(func, wait) {
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

function loadBranches() {
    // Placeholder - will be implemented with actual API call
}

function loadCategories() {
    // Placeholder - will be implemented with actual API call
}

function loadSupplyRequests() {
    // Placeholder - will be implemented with actual API call
}

function loadInventory() {
    // Placeholder - will be implemented with actual API call
}

function loadSupplyItems() {
    // Placeholder - will be implemented with actual API call
}

function loadNotifications() {
    // Placeholder - will be implemented with actual API call
}

function showNewRequestModal() {
    $('#newRequestModal').modal('show');
}

function applyInventoryFilter() {
    // Placeholder
}

function applyItemsFilter() {
    // Placeholder
}

function getCurrentUserBranchId() {
    return 1; // Placeholder
}
