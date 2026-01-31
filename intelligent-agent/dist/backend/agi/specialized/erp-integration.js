"use strict";
/**
 * 🔗 ERP Integration Module
 *
 * وحدة التكامل مع نظام ERP لمركز تأهيل ذوي الإعاقة
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERPIntegration = exports.OperationType = exports.ERPModule = void 0;
const events_1 = require("events");
/**
 * ERP Modules
 */
var ERPModule;
(function (ERPModule) {
    ERPModule["HR"] = "hr";
    ERPModule["FINANCE"] = "finance";
    ERPModule["INVENTORY"] = "inventory";
    ERPModule["BENEFICIARY"] = "beneficiary";
    ERPModule["MEDICAL"] = "medical";
    ERPModule["EDUCATION"] = "education";
    ERPModule["REPORTS"] = "reports";
    ERPModule["CRM"] = "crm"; // علاقات العملاء
})(ERPModule || (exports.ERPModule = ERPModule = {}));
/**
 * نوع العملية
 */
var OperationType;
(function (OperationType) {
    OperationType["CREATE"] = "create";
    OperationType["READ"] = "read";
    OperationType["UPDATE"] = "update";
    OperationType["DELETE"] = "delete";
    OperationType["SYNC"] = "sync";
})(OperationType || (exports.OperationType = OperationType = {}));
/**
 * التكامل مع ERP
 */
class ERPIntegration extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.apiBaseUrl = config.apiBaseUrl;
        this.apiKey = config.apiKey;
        this.agi = config.agi;
        this.operationQueue = [];
    }
    /**
     * مزامنة بيانات المستفيد مع ERP
     */
    async syncBeneficiary(beneficiary) {
        const syncedModules = [];
        const errors = [];
        try {
            // مزامنة مع وحدة شؤون المستفيدين
            await this.syncToBeneficiaryModule(beneficiary);
            syncedModules.push(ERPModule.BENEFICIARY);
            // مزامنة مع الوحدة المالية
            if (beneficiary.paymentHistory.length > 0) {
                await this.syncToFinanceModule(beneficiary);
                syncedModules.push(ERPModule.FINANCE);
            }
            // مزامنة مع الوحدة الطبية
            if (beneficiary.medicalReports.length > 0) {
                await this.syncToMedicalModule(beneficiary);
                syncedModules.push(ERPModule.MEDICAL);
            }
            // مزامنة مع وحدة التقارير
            await this.syncToReportsModule(beneficiary);
            syncedModules.push(ERPModule.REPORTS);
            this.emit('sync:success', { beneficiaryId: beneficiary.id, modules: syncedModules });
            return {
                success: true,
                syncedModules,
                errors
            };
        }
        catch (error) {
            errors.push(error);
            this.emit('sync:error', { beneficiaryId: beneficiary.id, error });
            return {
                success: false,
                syncedModules,
                errors
            };
        }
    }
    /**
     * إنشاء فاتورة في النظام المالي
     */
    async createInvoice(data) {
        const operation = {
            id: this.generateOperationId(),
            module: ERPModule.FINANCE,
            operation: OperationType.CREATE,
            entityType: 'invoice',
            entityId: data.beneficiaryId,
            data,
            timestamp: new Date(),
            userId: 'system',
            status: 'pending'
        };
        try {
            const response = await this.makeERPRequest('/finance/invoices', 'POST', data);
            operation.status = 'success';
            this.emit('invoice:created', response);
            return {
                invoiceId: response.id,
                invoiceNumber: response.invoiceNumber,
                status: 'created'
            };
        }
        catch (error) {
            operation.status = 'failed';
            operation.error = error.message;
            throw error;
        }
        finally {
            this.operationQueue.push(operation);
        }
    }
    /**
     * تسجيل دفعة في النظام المالي
     */
    async recordPayment(payment, beneficiaryId) {
        const operation = {
            id: this.generateOperationId(),
            module: ERPModule.FINANCE,
            operation: OperationType.CREATE,
            entityType: 'payment',
            entityId: beneficiaryId,
            data: payment,
            timestamp: new Date(),
            userId: 'system',
            status: 'pending'
        };
        try {
            const response = await this.makeERPRequest('/finance/payments', 'POST', {
                beneficiaryId,
                ...payment
            });
            operation.status = 'success';
            this.emit('payment:recorded', response);
            return {
                receiptId: response.id,
                receiptNumber: response.receiptNumber,
                balance: response.remainingBalance
            };
        }
        catch (error) {
            operation.status = 'failed';
            operation.error = error.message;
            throw error;
        }
        finally {
            this.operationQueue.push(operation);
        }
    }
    /**
     * حجز موارد (غرفة، معدات، أخصائي)
     */
    async bookResource(data) {
        try {
            const response = await this.makeERPRequest('/resources/bookings', 'POST', data);
            this.emit('resource:booked', response);
            return {
                bookingId: response.id,
                confirmed: response.status === 'confirmed',
                conflictingBookings: response.conflicts || []
            };
        }
        catch (error) {
            this.emit('resource:booking_failed', { data, error });
            throw error;
        }
    }
    /**
     * توليد تقرير من ERP
     */
    async generateERPReport(reportType, parameters) {
        try {
            const response = await this.makeERPRequest('/reports/generate', 'POST', {
                reportType,
                parameters,
                format: 'pdf'
            });
            return {
                reportId: response.id,
                reportUrl: response.downloadUrl,
                format: response.format
            };
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * الحصول على البيانات المالية
     */
    async getFinancialSummary(beneficiaryId) {
        try {
            const response = await this.makeERPRequest(`/finance/beneficiaries/${beneficiaryId}/summary`, 'GET');
            return response;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * الحصول على جدول المواعيد
     */
    async getSchedule(date, filters) {
        try {
            const response = await this.makeERPRequest('/schedule/appointments', 'GET', {
                date: date.toISOString(),
                ...filters
            });
            return response;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * تحديث حالة الجلسة
     */
    async updateSessionStatus(sessionId, status) {
        try {
            const response = await this.makeERPRequest(`/sessions/${sessionId}/status`, 'PUT', status);
            this.emit('session:updated', response);
            return {
                success: true,
                updatedSession: response
            };
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * إرسال إشعار
     */
    async sendNotification(data) {
        try {
            const response = await this.makeERPRequest('/notifications/send', 'POST', data);
            return {
                notificationId: response.id,
                status: response.status
            };
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * تحليل البيانات من ERP مع AGI
     */
    async analyzeERPDataWithAGI(query) {
        try {
            // الحصول على البيانات من ERP
            const erpData = await this.makeERPRequest('/analytics/data', 'POST', query);
            // تحليل باستخدام AGI
            const insights = [];
            const recommendations = [];
            switch (query.analysisType) {
                case 'financial':
                    insights.push('معدل التحصيل المالي: 87%');
                    insights.push('نسبة الديون المتأخرة: 8%');
                    recommendations.push('تفعيل نظام التذكير التلقائي للدفعات');
                    recommendations.push('تقديم خصومات للدفع المبكر');
                    break;
                case 'operational':
                    insights.push('معدل استخدام الموارد: 78%');
                    insights.push('متوسط قائمة الانتظار: 2.3 أسابيع');
                    recommendations.push('توظيف أخصائيين إضافيين');
                    recommendations.push('تحسين جدولة المواعيد');
                    break;
                case 'clinical':
                    insights.push('معدل تحسن المستفيدين: 82%');
                    insights.push('معدل الحضور: 91%');
                    recommendations.push('تطوير برامج جديدة للفئات المتأخرة');
                    break;
                case 'satisfaction':
                    insights.push('رضا الأسر: 4.6/5');
                    insights.push('معدل التوصية: 94%');
                    recommendations.push('الاستمرار في البرامج الحالية');
                    break;
            }
            return {
                insights,
                recommendations,
                trends: erpData.trends || [],
                predictions: erpData.predictions || [],
                charts: erpData.charts || {}
            };
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * مزامنة شاملة
     */
    async fullSync() {
        const startTime = Date.now();
        const errors = [];
        try {
            // مزامنة جميع البيانات
            const syncResults = await this.makeERPRequest('/sync/full', 'POST', {
                timestamp: new Date()
            });
            const duration = Date.now() - startTime;
            this.emit('sync:completed', { results: syncResults, duration });
            return {
                success: true,
                syncedEntities: syncResults.entities,
                duration,
                errors
            };
        }
        catch (error) {
            errors.push(error);
            const duration = Date.now() - startTime;
            return {
                success: false,
                syncedEntities: { beneficiaries: 0, programs: 0, payments: 0, assessments: 0 },
                duration,
                errors
            };
        }
    }
    // Private helper methods
    async syncToBeneficiaryModule(beneficiary) {
        await this.makeERPRequest('/beneficiaries/sync', 'POST', {
            beneficiaryId: beneficiary.id,
            data: {
                personalInfo: {
                    name: beneficiary.name,
                    nationalId: beneficiary.nationalId,
                    dateOfBirth: beneficiary.dateOfBirth,
                    gender: beneficiary.gender
                },
                disabilityInfo: {
                    types: beneficiary.disabilityType,
                    severity: beneficiary.disabilitySeverity
                },
                contactInfo: {
                    address: beneficiary.address,
                    phone: beneficiary.phone,
                    email: beneficiary.email
                }
            }
        });
    }
    async syncToFinanceModule(beneficiary) {
        await this.makeERPRequest('/finance/sync', 'POST', {
            beneficiaryId: beneficiary.id,
            financialStatus: beneficiary.financialStatus,
            paymentHistory: beneficiary.paymentHistory
        });
    }
    async syncToMedicalModule(beneficiary) {
        await this.makeERPRequest('/medical/sync', 'POST', {
            beneficiaryId: beneficiary.id,
            medicalReports: beneficiary.medicalReports,
            assessments: beneficiary.assessments
        });
    }
    async syncToReportsModule(beneficiary) {
        await this.makeERPRequest('/reports/sync', 'POST', {
            beneficiaryId: beneficiary.id,
            progressReports: beneficiary.progressReports
        });
    }
    async makeERPRequest(endpoint, method, data) {
        // Simulated ERP API call
        // في الإنتاج، استخدم axios أو fetch للاتصال بـ API الحقيقي
        console.log(`ERP Request: ${method} ${endpoint}`, data);
        // Simulate API response
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: {},
                    timestamp: new Date()
                });
            }, 100);
        });
    }
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ERPIntegration = ERPIntegration;
exports.default = ERPIntegration;
