/**
 * JavaScript لإدارة صفحة تحليل أنماط التعلم والسلوك
 * نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
 */

class LearningBehaviorAnalysisManager {
    constructor() {
        this.currentStudentId = null;
        this.analysisData = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.loadStudents();
        this.loadBehaviorPatterns();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Event listener for student selection
        document.getElementById('studentSelect').addEventListener('change', (e) => {
            this.currentStudentId = e.target.value;
        });

        // Event listener for period selection
        document.getElementById('periodSelect').addEventListener('change', (e) => {
            if (this.currentStudentId) {
                this.analyzeStudent();
            }
        });
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
                const select = document.getElementById('studentSelect');
                
                select.innerHTML = '<option value="">-- اختر طالب --</option>';
                
                if (data.students) {
                    data.students.forEach(student => {
                        const option = document.createElement('option');
                        option.value = student.id;
                        option.textContent = student.name;
                        select.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل الطلاب:', error);
            this.showAlert('خطأ في تحميل قائمة الطلاب', 'danger');
        }
    }

    async loadBehaviorPatterns() {
        try {
            const response = await fetch('/api/learning-behavior/behavior-patterns', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const select = document.getElementById('behaviorPattern');
                
                select.innerHTML = '<option value="">-- اختر نمط السلوك --</option>';
                
                if (data.behavior_patterns) {
                    data.behavior_patterns.forEach(pattern => {
                        const option = document.createElement('option');
                        option.value = pattern.id;
                        option.textContent = pattern.name;
                        option.dataset.category = pattern.category;
                        select.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل أنماط السلوك:', error);
        }
    }

    async analyzeStudent() {
        if (!this.currentStudentId) {
            this.showAlert('يرجى اختيار طالب أولاً', 'warning');
            return;
        }

        const periodDays = document.getElementById('periodSelect').value;
        
        this.showLoading(true);
        
        try {
            const response = await fetch(`/api/learning-behavior/analyze-student/${this.currentStudentId}?period_days=${periodDays}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    this.analysisData = data;
                    this.displayAnalysisResults(data);
                    this.loadAdditionalData();
                } else {
                    this.showAlert(data.message || 'خطأ في تحليل البيانات', 'danger');
                }
            } else {
                throw new Error('فشل في الحصول على البيانات');
            }
        } catch (error) {
            console.error('خطأ في التحليل:', error);
            this.showAlert('خطأ في تحليل البيانات', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    displayAnalysisResults(data) {
        // Show results container
        document.getElementById('analysisResults').style.display = 'block';

        // Update key metrics
        this.updateMetrics(data);

        // Create charts
        this.createCharts(data);

        // Load tab content
        this.loadLearningProfile();
        this.loadBehaviorObservations();
        this.loadInterventions();
        this.displayRecommendations(data.recommendations || []);
    }

    updateMetrics(data) {
        const learning = data.learning_analysis || {};
        const behavior = data.behavior_analysis || {};

        document.getElementById('progressScore').textContent = 
            learning.progress_score ? `${learning.progress_score}%` : '--';
        
        document.getElementById('engagementLevel').textContent = 
            learning.engagement_level ? `${learning.engagement_level.toFixed(1)}/10` : '--';
        
        document.getElementById('attentionScore').textContent = 
            behavior.attention_consistency ? `${behavior.attention_consistency.toFixed(1)}/10` : '--';
        
        document.getElementById('socialScore').textContent = 
            behavior.social_interaction_score ? `${behavior.social_interaction_score.toFixed(1)}/10` : '--';
    }

    createCharts(data) {
        this.createProgressChart(data);
        this.createBehaviorChart(data);
    }

    createProgressChart(data) {
        const ctx = document.getElementById('progressChart').getContext('2d');
        
        if (this.charts.progress) {
            this.charts.progress.destroy();
        }

        const learning = data.learning_analysis || {};
        
        this.charts.progress = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'],
                datasets: [{
                    label: 'درجة التقدم',
                    data: [
                        Math.max(0, (learning.progress_score || 0) - 15),
                        Math.max(0, (learning.progress_score || 0) - 10),
                        Math.max(0, (learning.progress_score || 0) - 5),
                        learning.progress_score || 0
                    ],
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'مستوى المشاركة',
                    data: [
                        Math.max(0, (learning.engagement_level || 0) * 10 - 15),
                        Math.max(0, (learning.engagement_level || 0) * 10 - 10),
                        Math.max(0, (learning.engagement_level || 0) * 10 - 5),
                        (learning.engagement_level || 0) * 10
                    ],
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    createBehaviorChart(data) {
        const ctx = document.getElementById('behaviorChart').getContext('2d');
        
        if (this.charts.behavior) {
            this.charts.behavior.destroy();
        }

        const behavior = data.behavior_analysis || {};
        const positive = behavior.positive_behaviors || 0;
        const negative = behavior.negative_behaviors || 0;
        const total = positive + negative || 1;

        this.charts.behavior = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['سلوكيات إيجابية', 'سلوكيات سلبية'],
                datasets: [{
                    data: [positive, negative],
                    backgroundColor: ['#4CAF50', '#F44336'],
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

    async loadLearningProfile() {
        if (!this.currentStudentId) return;

        try {
            const response = await fetch(`/api/learning-behavior/student-profile/${this.currentStudentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.profile) {
                    this.displayLearningProfile(data.profile);
                } else {
                    document.getElementById('learningProfile').innerHTML = 
                        '<p class="text-muted">لا يوجد ملف تعريف تعلم لهذا الطالب</p>';
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل ملف التعلم:', error);
        }
    }

    displayLearningProfile(profile) {
        const container = document.getElementById('learningProfile');
        
        let html = '';
        
        if (profile.primary_learning_style) {
            html += `
                <div class="mb-3">
                    <h6>نمط التعلم الأساسي:</h6>
                    <span class="learning-style-badge" style="background-color: ${profile.primary_learning_style.color_code}">
                        <i class="${profile.primary_learning_style.icon} me-2"></i>
                        ${profile.primary_learning_style.name}
                    </span>
                </div>
            `;
        }

        if (profile.strengths && profile.strengths.length > 0) {
            html += `
                <div class="mb-3">
                    <h6>نقاط القوة:</h6>
                    <ul class="list-unstyled">
                        ${profile.strengths.map(strength => `<li><i class="fas fa-check text-success me-2"></i>${strength}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        if (profile.challenges && profile.challenges.length > 0) {
            html += `
                <div class="mb-3">
                    <h6>التحديات:</h6>
                    <ul class="list-unstyled">
                        ${profile.challenges.map(challenge => `<li><i class="fas fa-exclamation-triangle text-warning me-2"></i>${challenge}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        if (profile.attention_span) {
            html += `
                <div class="mb-3">
                    <h6>مدى الانتباه:</h6>
                    <p class="mb-0">${profile.attention_span} دقيقة</p>
                </div>
            `;
        }

        container.innerHTML = html || '<p class="text-muted">لا توجد بيانات متاحة</p>';
    }

    async loadBehaviorObservations() {
        if (!this.currentStudentId) return;

        try {
            const response = await fetch(`/api/learning-behavior/behavior-observations?student_id=${this.currentStudentId}&per_page=10`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    this.displayBehaviorObservations(data.observations || []);
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل ملاحظات السلوك:', error);
        }
    }

    displayBehaviorObservations(observations) {
        const container = document.getElementById('recentObservations');
        
        if (observations.length === 0) {
            container.innerHTML = '<p class="text-muted">لا توجد ملاحظات سلوك حديثة</p>';
            return;
        }

        let html = '';
        
        observations.forEach(obs => {
            const categoryClass = obs.behavior_pattern ? 
                `${obs.behavior_pattern.category}-behavior` : 'neutral-behavior';
            
            html += `
                <div class="behavior-observation ${categoryClass}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0">
                            ${obs.behavior_pattern ? obs.behavior_pattern.name : 'ملاحظة عامة'}
                        </h6>
                        <small class="text-muted">${this.formatDate(obs.observation_date)}</small>
                    </div>
                    <p class="mb-2">${obs.behavior_description}</p>
                    <div class="row">
                        <div class="col-md-4">
                            <small><strong>السياق:</strong> ${this.translateContext(obs.context)}</small>
                        </div>
                        <div class="col-md-4">
                            <small><strong>الشدة:</strong> ${this.translateIntensity(obs.intensity)}</small>
                        </div>
                        <div class="col-md-4">
                            <small><strong>المدة:</strong> ${obs.duration || '--'} دقيقة</small>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async loadInterventions() {
        if (!this.currentStudentId) return;

        try {
            const response = await fetch(`/api/learning-behavior/behavior-interventions?student_id=${this.currentStudentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    this.displayInterventions(data.interventions || []);
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل التدخلات:', error);
        }
    }

    displayInterventions(interventions) {
        const container = document.getElementById('interventionsList');
        
        if (interventions.length === 0) {
            container.innerHTML = '<p class="text-muted">لا توجد تدخلات سلوكية مسجلة</p>';
            return;
        }

        let html = '';
        
        interventions.forEach(intervention => {
            const statusClass = `status-${intervention.status}`;
            
            html += `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${intervention.intervention_name}</h6>
                            <span class="intervention-status ${statusClass}">
                                ${this.translateStatus(intervention.status)}
                            </span>
                        </div>
                        <p class="card-text">${intervention.description}</p>
                        <div class="row">
                            <div class="col-md-6">
                                <small><strong>نوع التدخل:</strong> ${this.translateInterventionType(intervention.intervention_type)}</small>
                            </div>
                            <div class="col-md-6">
                                <small><strong>تاريخ البداية:</strong> ${this.formatDate(intervention.start_date)}</small>
                            </div>
                        </div>
                        ${intervention.effectiveness_rating ? `
                            <div class="mt-2">
                                <small><strong>تقييم الفعالية:</strong> ${intervention.effectiveness_rating}/10</small>
                                <div class="progress" style="height: 5px;">
                                    <div class="progress-bar" role="progressbar" 
                                         style="width: ${intervention.effectiveness_rating * 10}%"></div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    displayRecommendations(recommendations) {
        const container = document.getElementById('recommendationsList');
        
        if (recommendations.length === 0) {
            container.innerHTML = '<p class="text-muted">لا توجد توصيات متاحة</p>';
            return;
        }

        let html = '';
        
        recommendations.forEach(rec => {
            const priorityClass = `${rec.priority}-priority`;
            
            html += `
                <div class="recommendation-card ${priorityClass}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0">${rec.title}</h6>
                        <span class="badge bg-${rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'info'}">
                            ${rec.priority === 'high' ? 'عالية' : rec.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                        </span>
                    </div>
                    <p class="mb-2">${rec.description}</p>
                    ${rec.actions && rec.actions.length > 0 ? `
                        <div class="mt-2">
                            <strong>الإجراءات المقترحة:</strong>
                            <ul class="mt-1 mb-0">
                                ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async loadAdditionalData() {
        // Load learning analytics
        this.loadLearningAnalytics();
        
        // Load behavior summary
        this.loadBehaviorSummary();
    }

    async loadLearningAnalytics() {
        if (!this.currentStudentId) return;

        try {
            const response = await fetch(`/api/learning-behavior/analytics/${this.currentStudentId}/history?per_page=5`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.analytics) {
                    this.displayLearningAnalytics(data.analytics);
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل تحليلات التعلم:', error);
        }
    }

    displayLearningAnalytics(analytics) {
        const container = document.getElementById('learningAnalytics');
        
        if (analytics.length === 0) {
            container.innerHTML = '<p class="text-muted">لا توجد تحليلات سابقة</p>';
            return;
        }

        let html = '<div class="timeline">';
        
        analytics.forEach(analysis => {
            html += `
                <div class="timeline-item mb-3">
                    <div class="timeline-marker bg-primary"></div>
                    <div class="timeline-content">
                        <h6 class="mb-1">${this.formatDate(analysis.analysis_date)}</h6>
                        <div class="row">
                            <div class="col-6">
                                <small>التقدم: ${analysis.learning_progress_score}%</small>
                            </div>
                            <div class="col-6">
                                <small>المشاركة: ${analysis.engagement_level}/10</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    loadBehaviorSummary() {
        if (!this.analysisData || !this.analysisData.behavior_analysis) return;

        const behavior = this.analysisData.behavior_analysis;
        const container = document.getElementById('behaviorSummary');
        
        let html = `
            <div class="text-center mb-3">
                <div class="progress-circle" style="background: linear-gradient(45deg, #4CAF50, #45a049);">
                    ${behavior.positive_behaviors || 0}
                    <br><small>إيجابي</small>
                </div>
            </div>
            <div class="text-center mb-3">
                <div class="progress-circle" style="background: linear-gradient(45deg, #F44336, #d32f2f);">
                    ${behavior.negative_behaviors || 0}
                    <br><small>سلبي</small>
                </div>
            </div>
            <div class="mt-3">
                <h6>فعالية التدخلات:</h6>
                <div class="progress">
                    <div class="progress-bar" role="progressbar" 
                         style="width: ${(behavior.intervention_effectiveness || 0) * 10}%">
                        ${behavior.intervention_effectiveness || 0}/10
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    async saveObservation() {
        const form = document.getElementById('observationForm');
        const formData = new FormData(form);
        
        const observationData = {
            student_id: this.currentStudentId,
            behavior_pattern_id: document.getElementById('behaviorPattern').value,
            context: document.getElementById('observationContext').value,
            behavior_description: document.getElementById('behaviorDescription').value,
            intensity: document.getElementById('intensity').value,
            duration: document.getElementById('duration').value,
            frequency: document.getElementById('frequency').value
        };

        try {
            const response = await fetch('/api/learning-behavior/behavior-observations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(observationData)
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    this.showAlert('تم حفظ الملاحظة بنجاح', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('addObservationModal')).hide();
                    form.reset();
                    this.loadBehaviorObservations(); // Reload observations
                } else {
                    this.showAlert(data.message || 'خطأ في حفظ الملاحظة', 'danger');
                }
            }
        } catch (error) {
            console.error('خطأ في حفظ الملاحظة:', error);
            this.showAlert('خطأ في حفظ الملاحظة', 'danger');
        }
    }

    async exportReport() {
        if (!this.currentStudentId) {
            this.showAlert('يرجى اختيار طالب أولاً', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/learning-behavior/reports/student-summary/${this.currentStudentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    // Create and download report
                    this.downloadReport(data);
                    this.showAlert('تم تصدير التقرير بنجاح', 'success');
                } else {
                    this.showAlert(data.message || 'خطأ في تصدير التقرير', 'danger');
                }
            }
        } catch (error) {
            console.error('خطأ في تصدير التقرير:', error);
            this.showAlert('خطأ في تصدير التقرير', 'danger');
        }
    }

    downloadReport(data) {
        const reportContent = JSON.stringify(data, null, 2);
        const blob = new Blob([reportContent], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `learning_behavior_report_${this.currentStudentId}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        window.URL.revokeObjectURL(url);
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        const results = document.getElementById('analysisResults');
        
        if (show) {
            spinner.style.display = 'block';
            results.style.display = 'none';
        } else {
            spinner.style.display = 'none';
        }
    }

    showAlert(message, type) {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    // Utility functions
    formatDate(dateString) {
        if (!dateString) return '--';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA');
    }

    translateContext(context) {
        const translations = {
            'classroom': 'الفصل الدراسي',
            'playground': 'الملعب',
            'therapy': 'جلسة العلاج',
            'cafeteria': 'المقصف'
        };
        return translations[context] || context;
    }

    translateIntensity(intensity) {
        const translations = {
            'low': 'منخفضة',
            'medium': 'متوسطة',
            'high': 'عالية'
        };
        return translations[intensity] || intensity;
    }

    translateStatus(status) {
        const translations = {
            'active': 'نشط',
            'completed': 'مكتمل',
            'paused': 'متوقف',
            'discontinued': 'متوقف نهائياً'
        };
        return translations[status] || status;
    }

    translateInterventionType(type) {
        const translations = {
            'preventive': 'وقائي',
            'reactive': 'تفاعلي',
            'replacement': 'بديل'
        };
        return translations[type] || type;
    }
}

// Global functions
function analyzeStudent() {
    if (window.learningManager) {
        window.learningManager.analyzeStudent();
    }
}

function exportReport() {
    if (window.learningManager) {
        window.learningManager.exportReport();
    }
}

function addObservation() {
    const modal = new bootstrap.Modal(document.getElementById('addObservationModal'));
    modal.show();
}

function addIntervention() {
    // This would open an intervention creation modal
    alert('ميزة إضافة التدخل قيد التطوير');
}

function saveObservation() {
    if (window.learningManager) {
        window.learningManager.saveObservation();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.learningManager = new LearningBehaviorAnalysisManager();
});
