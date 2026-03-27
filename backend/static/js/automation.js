/**
 * نظام الأتمتة الشامل - JavaScript
 * Comprehensive Automation System - JavaScript
 */

// Global variables
let currentPage = 1;
let currentTab = 'workflows';
let engineStatus = false;
let refreshInterval;

// API Base URL
const API_BASE = '/api/automation';

// Initialize the automation dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeAutomation();
    loadDashboardStats();
    loadWorkflows();
    checkEngineStatus();
    
    // Set up auto-refresh
    refreshInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadDashboardStats();
            checkEngineStatus();
            
            // Refresh current tab data
            switch (currentTab) {
                case 'workflows':
                    loadWorkflows();
                    break;
                case 'rules':
                    loadRules();
                    break;
                case 'messages':
                    loadMessages();
                    break;
                case 'executions':
                    loadExecutions();
                    break;
                case 'logs':
                    loadLogs();
                    break;
            }
        }
    }, 30000); // Refresh every 30 seconds
});

// Initialize automation system
function initializeAutomation() {
    // Set up tab change handlers
    document.querySelectorAll('#automationTabs button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            const targetTab = event.target.getAttribute('data-bs-target').replace('#', '');
            currentTab = targetTab;
            
            switch (targetTab) {
                case 'workflows':
                    loadWorkflows();
                    break;
                case 'rules':
                    loadRules();
                    break;
                case 'messages':
                    loadMessages();
                    break;
                case 'executions':
                    loadExecutions();
                    break;
                case 'logs':
                    loadLogs();
                    break;
            }
        });
    });
    
    // Set up search handlers
    setupSearchHandlers();
    
    // Load workflow options for rule creation
    loadWorkflowOptions();
}

// Setup search and filter handlers
function setupSearchHandlers() {
    // Workflow search
    document.getElementById('workflowSearch')?.addEventListener('input', debounce(loadWorkflows, 500));
    document.getElementById('workflowStatusFilter')?.addEventListener('change', loadWorkflows);
    document.getElementById('workflowCategoryFilter')?.addEventListener('change', loadWorkflows);
    
    // Execution filters
    document.getElementById('executionWorkflowFilter')?.addEventListener('change', loadExecutions);
    document.getElementById('executionStatusFilter')?.addEventListener('change', loadExecutions);
    document.getElementById('executionDateFilter')?.addEventListener('change', loadExecutions);
    
    // Log filters
    document.getElementById('logEventTypeFilter')?.addEventListener('change', loadLogs);
    document.getElementById('logWorkflowFilter')?.addEventListener('change', loadLogs);
    document.getElementById('logDateFilter')?.addEventListener('change', loadLogs);
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetchAPI('/dashboard');
        if (response.success) {
            const stats = response.stats;
            
            document.getElementById('totalWorkflows').textContent = stats.workflows.total;
            document.getElementById('activeWorkflows').textContent = stats.workflows.active;
            document.getElementById('totalExecutions').textContent = stats.executions.total;
            document.getElementById('successRate').textContent = stats.executions.success_rate + '%';
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Check workflow engine status
async function checkEngineStatus() {
    try {
        const response = await fetchAPI('/engine/status');
        if (response.success) {
            engineStatus = response.is_running;
            updateEngineStatusDisplay();
        }
    } catch (error) {
        console.error('Error checking engine status:', error);
    }
}

// Update engine status display
function updateEngineStatusDisplay() {
    const statusElement = document.getElementById('engineStatus');
    if (engineStatus) {
        statusElement.className = 'engine-status engine-running me-3';
        statusElement.innerHTML = '<i class="fas fa-circle"></i> <span>يعمل</span>';
    } else {
        statusElement.className = 'engine-status engine-stopped me-3';
        statusElement.innerHTML = '<i class="fas fa-circle"></i> <span>متوقف</span>';
    }
}

// Toggle workflow engine
async function toggleEngine() {
    try {
        showLoading();
        const endpoint = engineStatus ? '/engine/stop' : '/engine/start';
        const response = await fetchAPI(endpoint, 'POST');
        
        if (response.success) {
            showNotification(response.message, 'success');
            checkEngineStatus();
        } else {
            showNotification(response.message || 'حدث خطأ في تشغيل المحرك', 'error');
        }
    } catch (error) {
        showNotification('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        hideLoading();
    }
}

// Load workflows
async function loadWorkflows(page = 1) {
    try {
        showLoading();
        
        const params = new URLSearchParams({
            page: page,
            per_page: 12
        });
        
        // Add filters
        const search = document.getElementById('workflowSearch')?.value;
        const status = document.getElementById('workflowStatusFilter')?.value;
        const category = document.getElementById('workflowCategoryFilter')?.value;
        
        if (search) params.append('search', search);
        if (status) params.append('status', status);
        if (category) params.append('category', category);
        
        const response = await fetchAPI(`/workflows?${params}`);
        if (response.success) {
            displayWorkflows(response.workflows);
            updatePagination('workflowsPagination', response.pagination, loadWorkflows);
        }
    } catch (error) {
        console.error('Error loading workflows:', error);
        showNotification('حدث خطأ في تحميل سير العمل', 'error');
    } finally {
        hideLoading();
    }
}

// Display workflows
function displayWorkflows(workflows) {
    const container = document.getElementById('workflowsList');
    
    if (workflows.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-project-diagram fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">لا توجد سير عمل</h5>
                <p class="text-muted">ابدأ بإنشاء سير عمل جديد</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = workflows.map(workflow => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card automation-card workflow-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${workflow.name}</h6>
                        <span class="workflow-status status-${workflow.status || 'draft'}">
                            ${getStatusText(workflow.status)}
                        </span>
                    </div>
                    <p class="card-text text-muted small mb-3">${workflow.description || 'لا يوجد وصف'}</p>
                    
                    <div class="row text-center mb-3">
                        <div class="col-4">
                            <small class="text-muted d-block">الإجراءات</small>
                            <strong>${workflow.actions_count || 0}</strong>
                        </div>
                        <div class="col-4">
                            <small class="text-muted d-block">التنفيذات</small>
                            <strong>${workflow.execution_count || 0}</strong>
                        </div>
                        <div class="col-4">
                            <small class="text-muted d-block">الأولوية</small>
                            <strong>${workflow.priority || 5}</strong>
                        </div>
                    </div>
                    
                    <div class="action-buttons d-flex justify-content-between">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewWorkflow(${workflow.id})">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="executeWorkflow(${workflow.id})" 
                                ${!workflow.is_active ? 'disabled' : ''}>
                            <i class="fas fa-play"></i> تشغيل
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="editWorkflow(${workflow.id})">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteWorkflow(${workflow.id})">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
                <div class="card-footer bg-transparent">
                    <small class="text-muted">
                        <i class="fas fa-clock"></i>
                        آخر تحديث: ${formatDate(workflow.created_at)}
                    </small>
                </div>
            </div>
        </div>
    `).join('');
}

// Load rules
async function loadRules() {
    try {
        showLoading();
        const response = await fetchAPI('/rules');
        if (response.success) {
            displayRules(response.rules);
        }
    } catch (error) {
        console.error('Error loading rules:', error);
        showNotification('حدث خطأ في تحميل القواعد', 'error');
    } finally {
        hideLoading();
    }
}

// Display rules
function displayRules(rules) {
    const container = document.getElementById('rulesList');
    
    if (rules.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-rules fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">لا توجد قواعد</h5>
                <p class="text-muted">ابدأ بإنشاء قاعدة جديدة</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = rules.map(rule => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card automation-card rule-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${rule.name}</h6>
                        <span class="badge bg-success">نشط</span>
                    </div>
                    <p class="card-text text-muted small mb-3">${rule.description || 'لا يوجد وصف'}</p>
                    
                    <div class="row text-center mb-3">
                        <div class="col-6">
                            <small class="text-muted d-block">التنفيذات</small>
                            <strong>${rule.execution_count || 0}</strong>
                        </div>
                        <div class="col-6">
                            <small class="text-muted d-block">الأولوية</small>
                            <strong>${rule.priority || 5}</strong>
                        </div>
                    </div>
                    
                    <div class="action-buttons d-flex justify-content-between">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewRule(${rule.id})">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="evaluateRule(${rule.id})">
                            <i class="fas fa-play"></i> تقييم
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="editRule(${rule.id})">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteRule(${rule.id})">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
                <div class="card-footer bg-transparent">
                    <small class="text-muted">
                        <i class="fas fa-clock"></i>
                        آخر تشغيل: ${rule.last_triggered ? formatDate(rule.last_triggered) : 'لم يتم التشغيل'}
                    </small>
                </div>
            </div>
        </div>
    `).join('');
}

// Load messages
async function loadMessages() {
    try {
        showLoading();
        const response = await fetchAPI('/messages');
        if (response.success) {
            displayMessages(response.messages);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        showNotification('حدث خطأ في تحميل الرسائل', 'error');
    } finally {
        hideLoading();
    }
}

// Display messages
function displayMessages(messages) {
    const container = document.getElementById('messagesList');
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-envelope-open-text fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">لا توجد رسائل مجدولة</h5>
                <p class="text-muted">ابدأ بجدولة رسالة جديدة</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(message => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card automation-card message-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${message.subject || 'رسالة بدون عنوان'}</h6>
                        <span class="workflow-status status-${message.status}">
                            ${getMessageStatusText(message.status)}
                        </span>
                    </div>
                    <p class="card-text text-muted small mb-2">
                        <i class="fas fa-${getMessageTypeIcon(message.message_type)}"></i>
                        ${getMessageTypeText(message.message_type)}
                    </p>
                    
                    <div class="row text-center mb-3">
                        <div class="col-6">
                            <small class="text-muted d-block">مرات الإرسال</small>
                            <strong>${message.sent_count || 0}</strong>
                        </div>
                        <div class="col-6">
                            <small class="text-muted d-block">الأولوية</small>
                            <strong>${message.priority || 5}</strong>
                        </div>
                    </div>
                    
                    <div class="action-buttons d-flex justify-content-between">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewMessage(${message.id})">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="sendMessageNow(${message.id})" 
                                ${!message.is_active ? 'disabled' : ''}>
                            <i class="fas fa-paper-plane"></i> إرسال
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="editMessage(${message.id})">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteMessage(${message.id})">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
                <div class="card-footer bg-transparent">
                    <small class="text-muted">
                        <i class="fas fa-clock"></i>
                        الإرسال التالي: ${message.next_send ? formatDate(message.next_send) : 'غير محدد'}
                    </small>
                </div>
            </div>
        </div>
    `).join('');
}

// Load executions
async function loadExecutions() {
    try {
        showLoading();
        
        const params = new URLSearchParams({
            page: 1,
            per_page: 20
        });
        
        // Add filters
        const workflowFilter = document.getElementById('executionWorkflowFilter')?.value;
        const statusFilter = document.getElementById('executionStatusFilter')?.value;
        const dateFilter = document.getElementById('executionDateFilter')?.value;
        
        if (workflowFilter) params.append('workflow_id', workflowFilter);
        if (statusFilter) params.append('status', statusFilter);
        if (dateFilter) params.append('date', dateFilter);
        
        const response = await fetchAPI(`/executions?${params}`);
        if (response.success) {
            displayExecutions(response.executions);
        }
    } catch (error) {
        console.error('Error loading executions:', error);
        showNotification('حدث خطأ في تحميل التنفيذات', 'error');
    } finally {
        hideLoading();
    }
}

// Display executions
function displayExecutions(executions) {
    const container = document.getElementById('executionsList');
    
    if (executions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-play-circle fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">لا توجد تنفيذات</h5>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>سير العمل</th>
                        <th>الحالة</th>
                        <th>وقت البدء</th>
                        <th>وقت الانتهاء</th>
                        <th>المدة</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${executions.map(execution => `
                        <tr>
                            <td>${execution.workflow_name}</td>
                            <td>
                                <span class="workflow-status status-${execution.status}">
                                    ${getStatusText(execution.status)}
                                </span>
                            </td>
                            <td>${formatDate(execution.started_at)}</td>
                            <td>${execution.completed_at ? formatDate(execution.completed_at) : '-'}</td>
                            <td>${execution.duration ? execution.duration + 's' : '-'}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary" onclick="viewExecution(${execution.id})">
                                    <i class="fas fa-eye"></i> عرض
                                </button>
                                ${execution.status === 'running' ? `
                                    <button class="btn btn-sm btn-outline-warning" onclick="pauseExecution(${execution.id})">
                                        <i class="fas fa-pause"></i> إيقاف
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="cancelExecution(${execution.id})">
                                        <i class="fas fa-stop"></i> إلغاء
                                    </button>
                                ` : ''}
                                ${execution.status === 'paused' ? `
                                    <button class="btn btn-sm btn-outline-success" onclick="resumeExecution(${execution.id})">
                                        <i class="fas fa-play"></i> استئناف
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Load logs
async function loadLogs() {
    try {
        showLoading();
        
        const params = new URLSearchParams({
            page: 1,
            per_page: 50
        });
        
        // Add filters
        const eventTypeFilter = document.getElementById('logEventTypeFilter')?.value;
        const workflowFilter = document.getElementById('logWorkflowFilter')?.value;
        const dateFilter = document.getElementById('logDateFilter')?.value;
        
        if (eventTypeFilter) params.append('event_type', eventTypeFilter);
        if (workflowFilter) params.append('workflow_id', workflowFilter);
        if (dateFilter) params.append('date', dateFilter);
        
        const response = await fetchAPI(`/logs?${params}`);
        if (response.success) {
            displayLogs(response.logs);
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        showNotification('حدث خطأ في تحميل السجلات', 'error');
    } finally {
        hideLoading();
    }
}

// Display logs
function displayLogs(logs) {
    const container = document.getElementById('systemLogs');
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">لا توجد سجلات</h5>
            </div>
        `;
        return;
    }
    
    container.innerHTML = logs.map(log => `
        <div class="log-entry">
            <span class="log-timestamp">[${formatDate(log.timestamp)}]</span>
            <span class="log-level-${getLogLevel(log.event_type)}">[${log.event_type}]</span>
            <span>${log.message}</span>
        </div>
    `).join('');
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Modal functions
function showCreateWorkflowModal() {
    const modal = new bootstrap.Modal(document.getElementById('createWorkflowModal'));
    modal.show();
}

function showCreateRuleModal() {
    const modal = new bootstrap.Modal(document.getElementById('createRuleModal'));
    modal.show();
}

function showScheduleMessageModal() {
    const modal = new bootstrap.Modal(document.getElementById('scheduleMessageModal'));
    modal.show();
}

// Create workflow
async function createWorkflow() {
    try {
        const form = document.getElementById('createWorkflowForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        showLoading();
        const response = await fetchAPI('/workflows', 'POST', data);
        
        if (response.success) {
            showNotification(response.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('createWorkflowModal')).hide();
            form.reset();
            loadWorkflows();
        } else {
            showNotification(response.message || 'حدث خطأ في إنشاء سير العمل', 'error');
        }
    } catch (error) {
        showNotification('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        hideLoading();
    }
}

// Create rule
async function createRule() {
    try {
        const form = document.getElementById('createRuleForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Parse conditions JSON
        try {
            data.conditions = JSON.parse(data.conditions);
        } catch (e) {
            showNotification('صيغة الشروط غير صحيحة. يرجى التحقق من صيغة JSON', 'error');
            return;
        }
        
        showLoading();
        const response = await fetchAPI('/rules', 'POST', data);
        
        if (response.success) {
            showNotification(response.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('createRuleModal')).hide();
            form.reset();
            loadRules();
        } else {
            showNotification(response.message || 'حدث خطأ في إنشاء القاعدة', 'error');
        }
    } catch (error) {
        showNotification('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        hideLoading();
    }
}

// Schedule message
async function scheduleMessage() {
    try {
        const form = document.getElementById('scheduleMessageForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        showLoading();
        const response = await fetchAPI('/messages/schedule', 'POST', data);
        
        if (response.success) {
            showNotification(response.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('scheduleMessageModal')).hide();
            form.reset();
            loadMessages();
        } else {
            showNotification(response.message || 'حدث خطأ في جدولة الرسالة', 'error');
        }
    } catch (error) {
        showNotification('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        hideLoading();
    }
}

// Execute workflow
async function executeWorkflow(workflowId) {
    if (!confirm('هل أنت متأكد من تشغيل سير العمل؟')) return;
    
    try {
        showLoading();
        const response = await fetchAPI(`/workflows/${workflowId}/execute`, 'POST');
        
        if (response.success) {
            showNotification(response.message, 'success');
            loadExecutions();
            loadDashboardStats();
        } else {
            showNotification(response.message || 'حدث خطأ في تشغيل سير العمل', 'error');
        }
    } catch (error) {
        showNotification('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        hideLoading();
    }
}

// Evaluate rule
async function evaluateRule(ruleId) {
    try {
        showLoading();
        const response = await fetchAPI(`/rules/${ruleId}/evaluate`, 'POST');
        
        if (response.success) {
            const message = response.rule_triggered ? 
                'تم تقييم القاعدة وتحققت الشروط' : 
                'تم تقييم القاعدة ولم تتحقق الشروط';
            showNotification(message, response.rule_triggered ? 'success' : 'info');
        } else {
            showNotification(response.message || 'حدث خطأ في تقييم القاعدة', 'error');
        }
    } catch (error) {
        showNotification('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        hideLoading();
    }
}

// Send message now
async function sendMessageNow(messageId) {
    if (!confirm('هل أنت متأكد من إرسال الرسالة الآن؟')) return;
    
    try {
        showLoading();
        const response = await fetchAPI(`/messages/${messageId}/send`, 'POST');
        
        if (response.success) {
            showNotification(response.message, 'success');
            loadMessages();
        } else {
            showNotification(response.message || 'حدث خطأ في إرسال الرسالة', 'error');
        }
    } catch (error) {
        showNotification('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
        hideLoading();
    }
}

// Load workflow options for dropdowns
async function loadWorkflowOptions() {
    try {
        const response = await fetchAPI('/workflows?per_page=100');
        if (response.success) {
            const select = document.getElementById('ruleWorkflowSelect');
            if (select) {
                select.innerHTML = '<option value="">اختر سير العمل</option>' +
                    response.workflows.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
            }
            
            // Update execution filter
            const executionFilter = document.getElementById('executionWorkflowFilter');
            if (executionFilter) {
                executionFilter.innerHTML = '<option value="">جميع سير العمل</option>' +
                    response.workflows.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
            }
            
            // Update log filter
            const logFilter = document.getElementById('logWorkflowFilter');
            if (logFilter) {
                logFilter.innerHTML = '<option value="">جميع سير العمل</option>' +
                    response.workflows.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading workflow options:', error);
    }
}

// Utility functions
function getStatusText(status) {
    const statusMap = {
        'active': 'نشط',
        'paused': 'متوقف',
        'failed': 'فاشل',
        'completed': 'مكتمل',
        'draft': 'مسودة',
        'running': 'قيد التشغيل'
    };
    return statusMap[status] || status;
}

function getMessageStatusText(status) {
    const statusMap = {
        'pending': 'في الانتظار',
        'scheduled': 'مجدول',
        'sending': 'قيد الإرسال',
        'sent': 'تم الإرسال',
        'failed': 'فاشل'
    };
    return statusMap[status] || status;
}

function getMessageTypeText(type) {
    const typeMap = {
        'sms': 'رسالة نصية',
        'email': 'بريد إلكتروني',
        'whatsapp': 'واتساب',
        'push': 'إشعار فوري'
    };
    return typeMap[type] || type;
}

function getMessageTypeIcon(type) {
    const iconMap = {
        'sms': 'sms',
        'email': 'envelope',
        'whatsapp': 'whatsapp',
        'push': 'bell'
    };
    return iconMap[type] || 'message';
}

function getLogLevel(eventType) {
    if (eventType.includes('error') || eventType.includes('failed')) return 'error';
    if (eventType.includes('warning')) return 'warning';
    if (eventType.includes('completed') || eventType.includes('success')) return 'success';
    return 'info';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updatePagination(containerId, pagination, loadFunction) {
    const container = document.getElementById(containerId);
    if (!container || !pagination) return;
    
    let html = '';
    
    // Previous button
    if (pagination.page > 1) {
        html += `<li class="page-item">
            <a class="page-link" href="#" onclick="${loadFunction.name}(${pagination.page - 1})">السابق</a>
        </li>`;
    }
    
    // Page numbers
    for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.pages, pagination.page + 2); i++) {
        html += `<li class="page-item ${i === pagination.page ? 'active' : ''}">
            <a class="page-link" href="#" onclick="${loadFunction.name}(${i})">${i}</a>
        </li>`;
    }
    
    // Next button
    if (pagination.page < pagination.pages) {
        html += `<li class="page-item">
            <a class="page-link" href="#" onclick="${loadFunction.name}(${pagination.page + 1})">التالي</a>
        </li>`;
    }
    
    container.innerHTML = html;
}

// API helper function
async function fetchAPI(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(API_BASE + endpoint, options);
    return await response.json();
}

// UI helper functions
function showLoading() {
    document.getElementById('loadingSpinner')?.classList.remove('d-none');
}

function hideLoading() {
    document.getElementById('loadingSpinner')?.classList.add('d-none');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; left: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
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

// Placeholder functions for future implementation
function viewWorkflow(id) { console.log('View workflow:', id); }
function editWorkflow(id) { console.log('Edit workflow:', id); }
function deleteWorkflow(id) { console.log('Delete workflow:', id); }
function viewRule(id) { console.log('View rule:', id); }
function editRule(id) { console.log('Edit rule:', id); }
function deleteRule(id) { console.log('Delete rule:', id); }
function viewMessage(id) { console.log('View message:', id); }
function editMessage(id) { console.log('Edit message:', id); }
function deleteMessage(id) { console.log('Delete message:', id); }
function viewExecution(id) { console.log('View execution:', id); }
function pauseExecution(id) { console.log('Pause execution:', id); }
function resumeExecution(id) { console.log('Resume execution:', id); }
function cancelExecution(id) { console.log('Cancel execution:', id); }
function exportExecutions() { console.log('Export executions'); }
function clearLogs() { console.log('Clear logs'); }
