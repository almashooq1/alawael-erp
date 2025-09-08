/**
 * إدارة نظام كاميرات المراقبة المترابطة
 * Surveillance Management System
 */

class SurveillanceManager {
    constructor() {
        this.currentTab = 'cameras';
        this.cameras = [];
        this.alerts = [];
        this.recordings = [];
        this.activeSessions = [];
        this.currentLiveSession = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboardData();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('#surveillanceTab button').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.currentTab = e.target.id.replace('-tab', '');
                this.loadTabData(this.currentTab);
            });
        });

        // Camera management
        document.getElementById('saveCameraBtn').addEventListener('click', () => this.saveCamera());
        document.getElementById('cameraSearch').addEventListener('input', (e) => this.filterCameras(e.target.value));
        document.getElementById('cameraStatusFilter').addEventListener('change', (e) => this.filterCamerasByStatus(e.target.value));

        // Live view
        document.getElementById('startLiveViewBtn').addEventListener('click', () => this.startLiveView());
        document.getElementById('stopLiveViewBtn').addEventListener('click', () => this.stopLiveView());

        // Recordings
        document.getElementById('searchRecordingsBtn').addEventListener('click', () => this.searchRecordings());
        document.getElementById('startRecordingBtn').addEventListener('click', () => this.startRecording());

        // Alerts
        document.getElementById('alertSeverityFilter').addEventListener('change', (e) => this.filterAlerts());
        document.getElementById('alertStatusFilter').addEventListener('change', (e) => this.filterAlerts());
        document.getElementById('acknowledgeAllBtn').addEventListener('click', () => this.acknowledgeAllAlerts());

        // Reports
        document.getElementById('reportForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateReport();
        });
    }

    async loadDashboardData() {
        try {
            const response = await this.makeRequest('/api/surveillance/dashboard');
            if (response.success) {
                this.updateDashboardStats(response.dashboard);
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل بيانات لوحة التحكم', 'error');
        }
    }

    updateDashboardStats(data) {
        document.getElementById('totalCameras').textContent = data.cameras.total || 0;
        document.getElementById('onlineCameras').textContent = data.cameras.online || 0;
        document.getElementById('activeAlerts').textContent = data.activity.unacknowledged_alerts || 0;
        document.getElementById('activeSessions').textContent = data.activity.active_sessions || 0;
    }

    async loadTabData(tab) {
        switch (tab) {
            case 'cameras':
                await this.loadCameras();
                break;
            case 'live':
                await this.loadLiveView();
                break;
            case 'recordings':
                await this.loadRecordings();
                break;
            case 'alerts':
                await this.loadAlerts();
                break;
            case 'reports':
                await this.loadReports();
                break;
        }
    }

    async loadCameras() {
        try {
            const response = await this.makeRequest('/api/surveillance/cameras');
            if (response.success) {
                this.cameras = response.cameras;
                this.renderCameras();
                this.populateCameraSelects();
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل الكاميرات', 'error');
        }
    }

    renderCameras() {
        const grid = document.getElementById('camerasGrid');
        grid.innerHTML = '';

        this.cameras.forEach(camera => {
            const statusClass = this.getStatusClass(camera.status);
            const statusText = this.getStatusText(camera.status);
            
            const cameraCard = `
                <div class="col-md-4 mb-3">
                    <div class="card camera-card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="card-title mb-0">${camera.name}</h6>
                                <span class="badge ${statusClass} status-badge">${statusText}</span>
                            </div>
                            <p class="card-text text-muted small mb-2">
                                <i class="fas fa-map-marker-alt me-1"></i>${camera.location || 'غير محدد'}
                            </p>
                            <p class="card-text text-muted small mb-2">
                                <i class="fas fa-network-wired me-1"></i>${camera.ip_address || 'غير محدد'}
                            </p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">${camera.camera_type}</small>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-primary btn-action" onclick="surveillanceManager.viewCamera(${camera.id})">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-outline-success btn-action" onclick="surveillanceManager.editCamera(${camera.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-action" onclick="surveillanceManager.deleteCamera(${camera.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            grid.innerHTML += cameraCard;
        });
    }

    async saveCamera() {
        const form = document.getElementById('addCameraForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.branch_id = 1; // يجب تحديد الفرع الحالي

        try {
            const response = await this.makeRequest('/api/surveillance/cameras', 'POST', data);
            if (response.success) {
                this.showAlert('تم حفظ الكاميرا بنجاح', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addCameraModal'));
                modal.hide();
                form.reset();
                await this.loadCameras();
            }
        } catch (error) {
            this.showAlert('خطأ في حفظ الكاميرا', 'error');
        }
    }

    async startLiveView() {
        const cameraId = document.getElementById('liveViewCameraSelect').value;
        if (!cameraId) {
            this.showAlert('يرجى اختيار كاميرا', 'warning');
            return;
        }

        try {
            const response = await this.makeRequest('/api/surveillance/live/start', 'POST', {
                camera_id: parseInt(cameraId)
            });
            
            if (response.success) {
                this.currentLiveSession = response.session;
                this.showLiveView(cameraId);
                document.getElementById('startLiveViewBtn').disabled = true;
                document.getElementById('stopLiveViewBtn').disabled = false;
                document.getElementById('liveIndicator').style.display = 'inline-block';
            }
        } catch (error) {
            this.showAlert('خطأ في بدء المشاهدة المباشرة', 'error');
        }
    }

    async stopLiveView() {
        if (!this.currentLiveSession) return;

        try {
            const response = await this.makeRequest('/api/surveillance/live/end', 'POST', {
                session_token: this.currentLiveSession.session_token,
                reason: 'user_stopped'
            });
            
            if (response.success) {
                this.hideLiveView();
                this.currentLiveSession = null;
                document.getElementById('startLiveViewBtn').disabled = false;
                document.getElementById('stopLiveViewBtn').disabled = true;
                document.getElementById('liveIndicator').style.display = 'none';
            }
        } catch (error) {
            this.showAlert('خطأ في إيقاف المشاهدة المباشرة', 'error');
        }
    }

    showLiveView(cameraId) {
        const container = document.getElementById('liveVideoContainer');
        const camera = this.cameras.find(c => c.id == cameraId);
        
        container.innerHTML = `
            <div class="text-center text-white">
                <div class="live-indicator mb-3"></div>
                <h5>مشاهدة مباشرة - ${camera.name}</h5>
                <p>الموقع: ${camera.location}</p>
                <small>جلسة نشطة منذ ${new Date().toLocaleTimeString('ar-SA')}</small>
            </div>
        `;
    }

    hideLiveView() {
        const container = document.getElementById('liveVideoContainer');
        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-video fa-3x mb-3"></i>
                <p>اختر كاميرا لبدء المشاهدة المباشرة</p>
            </div>
        `;
    }

    async searchRecordings() {
        const filters = {
            camera_id: document.getElementById('recordingCameraFilter').value,
            start_date: document.getElementById('recordingStartDate').value,
            end_date: document.getElementById('recordingEndDate').value,
            type: document.getElementById('recordingTypeFilter').value
        };

        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await this.makeRequest(`/api/surveillance/recordings?${params}`);
            if (response.success) {
                this.recordings = response.recordings;
                this.renderRecordings();
            }
        } catch (error) {
            this.showAlert('خطأ في البحث عن التسجيلات', 'error');
        }
    }

    renderRecordings() {
        const tbody = document.getElementById('recordingsTable');
        tbody.innerHTML = '';

        this.recordings.forEach(recording => {
            const camera = this.cameras.find(c => c.id === recording.camera_id);
            const duration = this.formatDuration(recording.duration_seconds);
            const size = this.formatFileSize(recording.file_size);
            
            const row = `
                <tr>
                    <td>${camera ? camera.name : 'غير معروف'}</td>
                    <td>${new Date(recording.start_time).toLocaleString('ar-SA')}</td>
                    <td>${duration}</td>
                    <td>${this.getRecordingTypeText(recording)}</td>
                    <td>${size}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="surveillanceManager.playRecording(${recording.id})">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="surveillanceManager.downloadRecording(${recording.id})">
                            <i class="fas fa-download"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    async loadAlerts() {
        try {
            const response = await this.makeRequest('/api/surveillance/alerts');
            if (response.success) {
                this.alerts = response.alerts;
                this.renderAlerts();
            }
        } catch (error) {
            this.showAlert('خطأ في تحميل التنبيهات', 'error');
        }
    }

    renderAlerts() {
        const container = document.getElementById('alertsList');
        container.innerHTML = '';

        this.alerts.forEach(alert => {
            const camera = this.cameras.find(c => c.id === alert.camera_id);
            const alertClass = `alert-${alert.severity}`;
            const severityText = this.getSeverityText(alert.severity);
            
            const alertCard = `
                <div class="card alert-card ${alertClass} mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="card-title mb-1">${alert.title}</h6>
                                <p class="card-text mb-2">${alert.description || ''}</p>
                                <small class="text-muted">
                                    <i class="fas fa-video me-1"></i>${camera ? camera.name : 'غير معروف'} • 
                                    <i class="fas fa-clock me-1"></i>${new Date(alert.detected_at).toLocaleString('ar-SA')}
                                </small>
                            </div>
                            <div class="text-end">
                                <span class="badge bg-${this.getSeverityColor(alert.severity)} mb-2">${severityText}</span>
                                ${!alert.is_acknowledged ? `
                                    <br>
                                    <button class="btn btn-sm btn-outline-primary" onclick="surveillanceManager.acknowledgeAlert(${alert.id})">
                                        <i class="fas fa-check me-1"></i>إقرار
                                    </button>
                                ` : `
                                    <br>
                                    <small class="text-success">
                                        <i class="fas fa-check-circle me-1"></i>تم الإقرار
                                    </small>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += alertCard;
        });
    }

    async acknowledgeAlert(alertId) {
        try {
            const response = await this.makeRequest(`/api/surveillance/alerts/${alertId}/acknowledge`, 'POST', {
                notes: 'تم الإقرار بالتنبيه من قبل المستخدم'
            });
            
            if (response.success) {
                this.showAlert('تم الإقرار بالتنبيه', 'success');
                await this.loadAlerts();
                await this.loadDashboardData();
            }
        } catch (error) {
            this.showAlert('خطأ في الإقرار بالتنبيه', 'error');
        }
    }

    // Utility methods
    getStatusClass(status) {
        const classes = {
            'online': 'bg-success',
            'offline': 'bg-danger',
            'maintenance': 'bg-warning'
        };
        return classes[status] || 'bg-secondary';
    }

    getStatusText(status) {
        const texts = {
            'online': 'متصلة',
            'offline': 'منقطعة',
            'maintenance': 'صيانة'
        };
        return texts[status] || 'غير معروف';
    }

    getSeverityText(severity) {
        const texts = {
            'critical': 'حرج',
            'high': 'عالي',
            'medium': 'متوسط',
            'low': 'منخفض'
        };
        return texts[severity] || severity;
    }

    getSeverityColor(severity) {
        const colors = {
            'critical': 'danger',
            'high': 'warning',
            'medium': 'info',
            'low': 'success'
        };
        return colors[severity] || 'secondary';
    }

    formatDuration(seconds) {
        if (!seconds) return '0 ثانية';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 بايت';
        const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }

    async makeRequest(url, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return await response.json();
    }

    showAlert(message, type = 'info') {
        // Create and show alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
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

    startAutoRefresh() {
        // Refresh dashboard every 30 seconds
        setInterval(() => {
            this.loadDashboardData();
        }, 30000);

        // Refresh current tab data every 60 seconds
        setInterval(() => {
            this.loadTabData(this.currentTab);
        }, 60000);
    }

    populateCameraSelects() {
        const selects = [
            'liveViewCameraSelect',
            'recordingCameraFilter'
        ];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">اختر كاميرا...</option>';
                
                this.cameras.forEach(camera => {
                    const option = document.createElement('option');
                    option.value = camera.id;
                    option.textContent = `${camera.name} (${camera.location || 'غير محدد'})`;
                    select.appendChild(option);
                });
                
                select.value = currentValue;
            }
        });
    }
}

// Initialize the surveillance manager when the page loads
let surveillanceManager;
document.addEventListener('DOMContentLoaded', () => {
    surveillanceManager = new SurveillanceManager();
});
