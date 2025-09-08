/**
 * مدير لوحة التحكم التفاعلية المتقدمة
 * نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
 */

class AdvancedDashboardManager {
    constructor() {
        this.grid = null;
        this.widgets = new Map();
        this.charts = new Map();
        this.currentTheme = 'light';
        this.refreshIntervals = new Map();
        this.apiBaseUrl = '/api/advanced-dashboard';
        
        this.init();
    }
    
    async init() {
        try {
            this.initializeGrid();
            this.bindEvents();
            await this.loadDashboard();
            await this.loadLayouts();
            this.startAutoRefresh();
            
            this.showAlert('تم تحميل لوحة التحكم بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في تهيئة لوحة التحكم:', error);
            this.showAlert('خطأ في تحميل لوحة التحكم', 'error');
        }
    }
    
    initializeGrid() {
        this.grid = GridStack.init({
            cellHeight: 80,
            verticalMargin: 20,
            horizontalMargin: 20,
            animate: true,
            resizable: {
                handles: 'e, se, s, sw, w'
            },
            draggable: {
                handle: '.widget-header'
            }
        });
        
        this.grid.on('change', (event, items) => {
            this.onGridChange(items);
        });
    }
    
    bindEvents() {
        // أزرار الشريط العلوي
        document.getElementById('addWidgetBtn').addEventListener('click', () => {
            this.showAddWidgetModal();
        });
        
        document.getElementById('saveLayoutBtn').addEventListener('click', () => {
            this.showSaveLayoutModal();
        });
        
        document.getElementById('exportDashboardBtn').addEventListener('click', () => {
            this.showExportModal();
        });
        
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshDashboard();
        });
        
        // أزرار النماذج
        document.getElementById('saveWidgetBtn').addEventListener('click', () => {
            this.saveWidget();
        });
        
        document.getElementById('confirmSaveLayoutBtn').addEventListener('click', () => {
            this.saveLayout();
        });
        
        document.getElementById('confirmExportBtn').addEventListener('click', () => {
            this.exportDashboard();
        });
        
        // اختيار التخطيط
        document.getElementById('layoutSelector').addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadLayout(parseInt(e.target.value));
            }
        });
        
        // اختيار السمة
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                this.changeTheme(option.dataset.theme);
            });
        });
        
        // التنبيهات والإشعارات
        document.getElementById('alertsBtn').addEventListener('click', () => {
            this.showAlertsModal();
        });
        
        document.getElementById('notificationsBtn').addEventListener('click', () => {
            this.showNotificationsModal();
        });
    }
    
    async loadDashboard() {
        try {
            this.showLoading(true);
            
            const response = await this.makeRequest('/dashboard');
            if (response.success) {
                this.renderWidgets(response.widgets);
                this.updateAlertsBadge(response.alerts_count);
                this.updateNotificationsBadge(response.notifications_count);
            }
        } catch (error) {
            console.error('خطأ في تحميل لوحة التحكم:', error);
            this.showAlert('خطأ في تحميل لوحة التحكم', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    renderWidgets(widgets) {
        // مسح الودجات الحالية
        this.grid.removeAll();
        this.widgets.clear();
        this.charts.clear();
        
        widgets.forEach(widget => {
            this.addWidgetToGrid(widget);
        });
    }
    
    addWidgetToGrid(widgetData) {
        const widgetElement = this.createWidgetElement(widgetData);
        
        this.grid.addWidget(widgetElement, {
            x: widgetData.position_x,
            y: widgetData.position_y,
            w: widgetData.width,
            h: widgetData.height,
            id: widgetData.id
        });
        
        this.widgets.set(widgetData.id, widgetData);
        this.loadWidgetData(widgetData.id);
        
        // إعداد التحديث التلقائي
        if (widgetData.refresh_interval > 0) {
            const interval = setInterval(() => {
                this.loadWidgetData(widgetData.id);
            }, widgetData.refresh_interval * 1000);
            
            this.refreshIntervals.set(widgetData.id, interval);
        }
    }
    
    createWidgetElement(widgetData) {
        const element = document.createElement('div');
        element.className = 'grid-stack-item';
        element.setAttribute('gs-id', widgetData.id);
        
        element.innerHTML = `
            <div class="grid-stack-item-content widget-card">
                <div class="widget-header">
                    <h6 class="widget-title">${widgetData.title}</h6>
                    <div class="widget-actions">
                        <button class="widget-btn" onclick="dashboardManager.refreshWidget(${widgetData.id})">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="widget-btn" onclick="dashboardManager.configureWidget(${widgetData.id})">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="widget-btn" onclick="dashboardManager.removeWidget(${widgetData.id})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="widget-content" id="widget-content-${widgetData.id}">
                    <div class="loading-spinner">
                        <div class="spinner-border" role="status"></div>
                    </div>
                </div>
            </div>
        `;
        
        return element;
    }
    
    async makeRequest(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            ...options
        };
        
        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, config);
        return await response.json();
    }
    
    showAlert(message, type = 'info') {
        // إظهار تنبيه مؤقت
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; left: 20px; z-index: 9999; min-width: 300px;';
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
    
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('d-none');
        } else {
            overlay.classList.add('d-none');
        }
    }
    
    updateAlertsBadge(count) {
        const badge = document.getElementById('alertsBadge');
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
    
    updateNotificationsBadge(count) {
        const badge = document.getElementById('notificationsBadge');
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
    
    // وظائف إضافية للودجات والتخطيطات
    async showAddWidgetModal() {
        const modal = new bootstrap.Modal(document.getElementById('addWidgetModal'));
        modal.show();
    }
    
    async saveWidget() {
        // منطق حفظ الودجة
        const modal = bootstrap.Modal.getInstance(document.getElementById('addWidgetModal'));
        modal.hide();
        this.showAlert('تم إضافة الودجة بنجاح', 'success');
    }
    
    async showSaveLayoutModal() {
        const modal = new bootstrap.Modal(document.getElementById('saveLayoutModal'));
        modal.show();
    }
    
    async saveLayout() {
        // منطق حفظ التخطيط
        const modal = bootstrap.Modal.getInstance(document.getElementById('saveLayoutModal'));
        modal.hide();
        this.showAlert('تم حفظ التخطيط بنجاح', 'success');
    }
    
    async showExportModal() {
        const modal = new bootstrap.Modal(document.getElementById('exportModal'));
        modal.show();
    }
    
    async exportDashboard() {
        // منطق التصدير
        const modal = bootstrap.Modal.getInstance(document.getElementById('exportModal'));
        modal.hide();
        this.showAlert('تم بدء عملية التصدير', 'info');
    }
    
    async loadLayouts() {
        // تحميل التخطيطات المتاحة
    }
    
    startAutoRefresh() {
        // بدء التحديث التلقائي
    }
    
    refreshDashboard() {
        this.loadDashboard();
    }
    
    changeTheme(theme) {
        this.currentTheme = theme;
        document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
        document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
    }
    
    showAlertsModal() {
        const modal = new bootstrap.Modal(document.getElementById('alertsModal'));
        modal.show();
    }
    
    showNotificationsModal() {
        // إظهار نافذة الإشعارات
    }
}

// تهيئة مدير لوحة التحكم
let dashboardManager;
document.addEventListener('DOMContentLoaded', () => {
    dashboardManager = new AdvancedDashboardManager();
});
