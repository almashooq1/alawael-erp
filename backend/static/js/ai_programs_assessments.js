/**
 * AI Programs and Assessments Management System
 * نظام إدارة الذكاء الاصطناعي للبرامج والمقاييس
 */

class AIProgramsAssessmentsManager {
    constructor() {
        this.currentUser = null;
        this.authToken = localStorage.getItem('authToken');
        this.charts = {};
        this.init();
    }

    async init() {
        try {
            await this.loadUserInfo();
            await this.loadDashboardData();
            await this.loadDropdownOptions();
            this.setupEventListeners();
            this.setupFormValidation();
        } catch (error) {
            console.error('خطأ في تهيئة النظام:', error);
            this.showAlert('خطأ في تحميل النظام', 'danger');
        }
    }

    // ================================
    // User Authentication & Info
    // ================================

    async loadUserInfo() {
        if (!this.authToken) {
            window.location.href = '/login';
            return;
        }

        try {
            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.currentUser = await response.json();
            } else {
                throw new Error('فشل في تحميل بيانات المستخدم');
            }
        } catch (error) {
            console.error('خطأ في تحميل بيانات المستخدم:', error);
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
    }

    // ================================
    // Dashboard Data Loading
    // ================================

    async loadDashboardData() {
        try {
            const response = await fetch('/api/ai/programs-assessments/dashboard', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateStatisticsCards(data.data);
            } else {
                throw new Error('فشل في تحميل بيانات لوحة التحكم');
            }
        } catch (error) {
            console.error('خطأ في تحميل لوحة التحكم:', error);
            this.showAlert('خطأ في تحميل إحصائيات لوحة التحكم', 'warning');
        }
    }

    updateStatisticsCards(data) {
        const summary = data.summary || {};
        
        document.getElementById('totalProgramsAnalyzed').textContent = summary.total_programs_analyzed || 0;
        document.getElementById('totalAssessmentsAnalyzed').textContent = summary.total_assessments_analyzed || 0;
        document.getElementById('pendingSuggestions').textContent = summary.pending_suggestions || 0;
        document.getElementById('totalPredictions').textContent = summary.total_predictions || 0;

        // Animate counters
        this.animateCounters();
    }

    animateCounters() {
        const counters = document.querySelectorAll('.metric-value');
        counters.forEach(counter => {
            const target = parseInt(counter.textContent);
            let current = 0;
            const increment = target / 50;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = target;
                    clearInterval(timer);
                } else {
                    counter.textContent = Math.floor(current);
                }
            }, 20);
        });
    }

    // ================================
    // Dropdown Options Loading
    // ================================

    async loadDropdownOptions() {
        await Promise.all([
            this.loadPrograms(),
            this.loadAssessments(),
            this.loadStudents()
        ]);
    }

    async loadPrograms() {
        try {
            const response = await fetch('/api/rehabilitation/programs', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.populateSelect('programSelect', data.programs, 'id', 'name');
                this.populateSelect('predictionProgramSelect', data.programs, 'id', 'name');
            }
        } catch (error) {
            console.error('خطأ في تحميل البرامج:', error);
        }
    }

    async loadAssessments() {
        try {
            const response = await fetch('/api/rehabilitation/assessments', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.populateSelect('assessmentSelect', data.assessments, 'id', 'assessment_type');
                this.populateMultiSelect('patternAssessments', data.assessments, 'id', 'assessment_type');
            }
        } catch (error) {
            console.error('خطأ في تحميل المقاييس:', error);
        }
    }

    async loadStudents() {
        try {
            const response = await fetch('/api/students', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.populateSelect('studentSelect', data.students, 'id', 'name');
            }
        } catch (error) {
            console.error('خطأ في تحميل الطلاب:', error);
        }
    }

    populateSelect(selectId, items, valueField, textField) {
        const select = document.getElementById(selectId);
        if (!select || !items) return;

        // Clear existing options (except first one)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            option.textContent = item[textField];
            select.appendChild(option);
        });
    }

    populateMultiSelect(selectId, items, valueField, textField) {
        const select = document.getElementById(selectId);
        if (!select || !items) return;

        select.innerHTML = '';
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            option.textContent = item[textField];
            select.appendChild(option);
        });
    }

    // ================================
    // Event Listeners Setup
    // ================================

    setupEventListeners() {
        // Program Analysis Form
        const programForm = document.getElementById('programAnalysisForm');
        if (programForm) {
            programForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.analyzeProgramEffectiveness();
            });
        }

        // Assessment Analysis Form
        const assessmentForm = document.getElementById('assessmentAnalysisForm');
        if (assessmentForm) {
            assessmentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.analyzeAssessmentResults();
            });
        }

        // Prediction Form
        const predictionForm = document.getElementById('predictionForm');
        if (predictionForm) {
            predictionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.predictStudentProgress();
            });
        }

        // Pattern Detection Form
        const patternForm = document.getElementById('patternDetectionForm');
        if (patternForm) {
            patternForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.detectPatterns();
            });
        }

        // Tab change events
        document.querySelectorAll('#aiTabs button[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                this.onTabChange(e.target.getAttribute('data-bs-target'));
            });
        });
    }

    setupFormValidation() {
        // Add custom validation styles
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                if (!form.checkValidity()) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                form.classList.add('was-validated');
            });
        });
    }

    onTabChange(target) {
        switch (target) {
            case '#recommendations':
                this.loadRecommendations();
                break;
            case '#insights':
                // Load insights if needed
                break;
        }
    }

    // ================================
    // Program Analysis Functions
    // ================================

    async analyzeProgramEffectiveness() {
        const programId = document.getElementById('programSelect').value;
        const analysisType = document.getElementById('analysisType').value;
        const timePeriod = document.getElementById('timePeriod').value;

        if (!programId) {
            this.showAlert('يرجى اختيار برنامج للتحليل', 'warning');
            return;
        }

        this.showLoading('programAnalysisLoading');
        this.hideElement('programAnalysisResults');

        try {
            const response = await fetch(`/api/ai/programs/${programId}/analyze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    analysis_type: analysisType,
                    time_period: timePeriod
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.displayProgramAnalysisResults(result.data);
                this.showAlert('تم تحليل البرنامج بنجاح', 'success');
            } else {
                throw new Error(result.error || 'فشل في تحليل البرنامج');
            }
        } catch (error) {
            console.error('خطأ في تحليل البرنامج:', error);
            this.showAlert('خطأ في تحليل البرنامج: ' + error.message, 'danger');
        } finally {
            this.hideLoading('programAnalysisLoading');
        }
    }

    displayProgramAnalysisResults(data) {
        const confidenceElement = document.getElementById('programConfidence');
        const contentElement = document.getElementById('programAnalysisContent');

        // Display confidence score
        if (confidenceElement) {
            confidenceElement.textContent = `الثقة: ${Math.round(data.confidence_score * 100)}%`;
        }

        // Display analysis content
        let content = `
            <div class="analysis-result">
                <h6><i class="fas fa-chart-bar me-2"></i>نتائج التحليل</h6>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>نوع التحليل:</strong> ${this.getAnalysisTypeText(data.analysis_data?.analysis_type)}</p>
                        <p><strong>فعالية البرنامج:</strong> ${data.analysis_data?.effectiveness_score || 0}%</p>
                        <p><strong>معدل المشاركة:</strong> ${data.analysis_data?.participation_rate || 0}%</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>معدل الإنجاز:</strong> ${data.analysis_data?.completion_rate || 0}%</p>
                        <p><strong>رضا المستفيدين:</strong> ${data.analysis_data?.satisfaction_score || 0}%</p>
                        <p><strong>التحسن المحقق:</strong> ${data.analysis_data?.improvement_rate || 0}%</p>
                    </div>
                </div>
            </div>
        `;

        // Display predictions
        if (data.predictions && data.predictions.length > 0) {
            content += `
                <div class="analysis-result">
                    <h6><i class="fas fa-crystal-ball me-2"></i>التنبؤات</h6>
                    <ul class="list-unstyled">
            `;
            data.predictions.forEach(prediction => {
                content += `<li><i class="fas fa-arrow-left me-2"></i>${prediction}</li>`;
            });
            content += `</ul></div>`;
        }

        // Display recommendations
        if (data.recommendations && data.recommendations.length > 0) {
            content += `
                <div class="analysis-result">
                    <h6><i class="fas fa-lightbulb me-2"></i>التوصيات</h6>
                    <ul class="list-unstyled">
            `;
            data.recommendations.forEach(recommendation => {
                content += `<li><i class="fas fa-check me-2 text-success"></i>${recommendation}</li>`;
            });
            content += `</ul></div>`;
        }

        if (contentElement) {
            contentElement.innerHTML = content;
        }

        // Create chart
        this.createProgramAnalysisChart(data.analysis_data);
        this.showElement('programAnalysisResults');
    }

    createProgramAnalysisChart(data) {
        const ctx = document.getElementById('programAnalysisChart');
        if (!ctx) return;
        
        if (this.charts.programAnalysis) {
            this.charts.programAnalysis.destroy();
        }

        this.charts.programAnalysis = new Chart(ctx.getContext('2d'), {
            type: 'radar',
            data: {
                labels: ['الفعالية', 'المشاركة', 'الإنجاز', 'الرضا', 'التحسن'],
                datasets: [{
                    label: 'مؤشرات الأداء',
                    data: [
                        data?.effectiveness_score || 0,
                        data?.participation_rate || 0,
                        data?.completion_rate || 0,
                        data?.satisfaction_score || 0,
                        data?.improvement_rate || 0
                    ],
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                }
            }
        });
    }

    // ================================
    // Utility Functions
    // ================================

    showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insert at top of container
        const container = document.querySelector('.container-fluid');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
        }
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    }

    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }

    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    }

    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }

    getCheckedValues(checkboxIds) {
        return checkboxIds.filter(id => {
            const checkbox = document.getElementById(id);
            return checkbox && checkbox.checked;
        }).map(id => document.getElementById(id).value);
    }

    getAnalysisTypeText(type) {
        const types = {
            'comprehensive': 'تحليل شامل',
            'effectiveness': 'فعالية البرنامج',
            'outcomes': 'النتائج المحققة',
            'participation': 'مشاركة المستفيدين'
        };
        return types[type] || type;
    }

    getAnalysisDepthText(depth) {
        const depths = {
            'comprehensive': 'تحليل شامل',
            'patterns': 'الأنماط السلوكية',
            'performance': 'الأداء الأكاديمي',
            'social': 'التفاعل الاجتماعي'
        };
        return depths[depth] || depth;
    }

    getRiskLevelText(level) {
        const levels = {
            'low': 'منخفض',
            'medium': 'متوسط',
            'high': 'عالي'
        };
        return levels[level] || level;
    }

    getPriorityText(priority) {
        const priorities = {
            'low': 'منخفضة',
            'medium': 'متوسطة',
            'high': 'عالية'
        };
        return priorities[priority] || priority;
    }

    async loadRecommendations() {
        // Load recommendations based on filters
        const recommendationType = document.getElementById('recommendationType')?.value || '';
        const priorityFilter = document.getElementById('priorityFilter')?.value || '';
        
        // This would typically load from API
        console.log('Loading recommendations...', { recommendationType, priorityFilter });
    }

    async detectPatterns() {
        const assessmentIds = Array.from(document.getElementById('patternAssessments')?.selectedOptions || [])
                                  .map(option => option.value);
        const patternTypes = this.getCheckedValues(['patternPerformance', 'patternBehavioral', 'patternDevelopmental']);
        const timeRange = document.getElementById('timeRange')?.value || 'last_year';

        if (assessmentIds.length === 0) {
            this.showAlert('يرجى اختيار مقياس واحد على الأقل', 'warning');
            return;
        }

        this.showLoading('patternLoading');
        this.hideElement('patternResults');

        try {
            const response = await fetch('/api/ai/assessments/pattern-detection', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    assessment_ids: assessmentIds,
                    pattern_types: patternTypes,
                    time_range: timeRange
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('تم اكتشاف الأنماط بنجاح', 'success');
            } else {
                throw new Error(result.error || 'فشل في اكتشاف الأنماط');
            }
        } catch (error) {
            console.error('خطأ في اكتشاف الأنماط:', error);
            this.showAlert('خطأ في اكتشاف الأنماط: ' + error.message, 'danger');
        } finally {
            this.hideLoading('patternLoading');
        }
    }

    async analyzeAssessmentResults() {
        const assessmentId = document.getElementById('assessmentSelect')?.value;
        const analysisDepth = document.getElementById('analysisDepth')?.value || 'comprehensive';
        const focusAreas = this.getCheckedValues(['focusCognitive', 'focusSocial', 'focusMotor']);

        if (!assessmentId) {
            this.showAlert('يرجى اختيار مقياس للتحليل', 'warning');
            return;
        }

        this.showLoading('assessmentAnalysisLoading');
        this.hideElement('assessmentAnalysisResults');

        try {
            const response = await fetch(`/api/ai/assessments/${assessmentId}/analyze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    analysis_depth: analysisDepth,
                    focus_areas: focusAreas
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('تم تحليل المقياس بنجاح', 'success');
            } else {
                throw new Error(result.error || 'فشل في تحليل المقياس');
            }
        } catch (error) {
            console.error('خطأ في تحليل المقياس:', error);
            this.showAlert('خطأ في تحليل المقياس: ' + error.message, 'danger');
        } finally {
            this.hideLoading('assessmentAnalysisLoading');
        }
    }

    async predictStudentProgress() {
        const studentId = document.getElementById('studentSelect')?.value;
        const programId = document.getElementById('predictionProgramSelect')?.value;
        const predictionPeriod = document.getElementById('predictionPeriod')?.value || '6_months';

        if (!studentId || !programId) {
            this.showAlert('يرجى اختيار الطالب والبرنامج', 'warning');
            return;
        }

        this.showLoading('predictionLoading');
        this.hideElement('predictionResults');

        try {
            const response = await fetch(`/api/ai/students/${studentId}/progress-prediction`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    program_id: programId,
                    prediction_period: predictionPeriod,
                    intervention_scenarios: []
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('تم توليد التنبؤات بنجاح', 'success');
            } else {
                throw new Error(result.error || 'فشل في توليد التنبؤات');
            }
        } catch (error) {
            console.error('خطأ في توليد التنبؤات:', error);
            this.showAlert('خطأ في توليد التنبؤات: ' + error.message, 'danger');
        } finally {
            this.hideLoading('predictionLoading');
        }
    }
}

// Initialize the manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aiManager = new AIProgramsAssessmentsManager();
});
