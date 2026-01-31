"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCore = void 0;
const self_learning_report_scheduler_1 = require("../modules/self-learning-report-scheduler");
const external_learning_import_scheduler_1 = require("../modules/external-learning-import-scheduler");
const self_optimization_scheduler_1 = require("../modules/self-optimization-scheduler");
const fine_tuning_manager_1 = require("../modules/fine-tuning-manager");
const sentiment_analyzer_1 = require("../modules/sentiment-analyzer");
const smart_task_manager_1 = require("../modules/smart-task-manager");
const data_encryption_1 = require("../modules/data-encryption");
const voice_command_1 = require("../modules/voice-command");
const user_analytics_1 = require("../modules/user-analytics");
const rbac_1 = require("../modules/rbac");
const nlp_module_1 = require("../modules/nlp-module");
const api_integration_1 = require("../modules/api-integration");
const db_integration_1 = require("../modules/db-integration");
const event_watcher_1 = require("../modules/event-watcher");
const logger_1 = require("../modules/logger");
const config_1 = __importDefault(require("../modules/config"));
const scheduler_1 = require("../modules/scheduler");
const notifier_1 = require("../modules/notifier");
const auth_1 = require("../modules/auth");
const metrics_1 = require("../modules/metrics");
const cache_1 = require("../modules/cache");
const queue_1 = require("../modules/queue");
const file_manager_1 = require("../modules/file-manager");
const email_service_1 = require("../modules/email-service");
const sms_service_1 = require("../modules/sms-service");
const webhook_1 = require("../modules/webhook");
const ai_chat_1 = require("../modules/ai-chat");
const report_generator_1 = require("../modules/report-generator");
const user_profile_1 = require("../modules/user-profile");
const erp_connector_1 = require("../modules/erp-connector");
class AgentCore {
    constructor() {
        this.rbac = rbac_1.rbacApi;
        this.nlp = new nlp_module_1.NLPModule();
        this.api = new api_integration_1.APIIntegration();
        this.db = new db_integration_1.DBIntegration('mongodb://localhost:27017', 'agentdb');
        this.events = new event_watcher_1.EventWatcher();
        this.logger = logger_1.Logger.getInstance();
        this.config = config_1.default;
        this.scheduler = new scheduler_1.Scheduler();
        this.notifier = new notifier_1.Notifier(this.logger);
        this.auth = new auth_1.Auth();
        this.metrics = new metrics_1.Metrics();
        this.cache = new cache_1.Cache();
        this.queue = new queue_1.Queue();
        this.fileManager = new file_manager_1.FileManager();
        this.email = new email_service_1.EmailService('smtp.example.com', 587, 'user', 'pass');
        this.sms = new sms_service_1.SMSService();
        this.webhook = new webhook_1.Webhook();
        this.aiChat = new ai_chat_1.AIChat();
        this.reportGenerator = new report_generator_1.ReportGenerator(this.fileManager);
        this.userProfileManager = new user_profile_1.UserProfileManager();
        this.erp = new erp_connector_1.ERPConnector();
        this.userAnalytics = new user_analytics_1.UserAnalytics();
        this.voice = new voice_command_1.VoiceCommand();
        this.encryption = new data_encryption_1.DataEncryption(process.env.DATA_ENCRYPTION_SECRET || 'default_secret');
        this.smartTasks = new smart_task_manager_1.SmartTaskManager();
        this.sentiment = new sentiment_analyzer_1.SentimentAnalyzer();
    }
    setAIProviderConfig(config) {
        this.aiChat.setProvider(config);
    }
    async start() {
        // جدولة Fine-tuning ديناميكي حسب الأداء
        const { scheduleDynamicFineTuning } = await Promise.resolve().then(() => __importStar(require('../modules/dynamic-finetune')));
        this.scheduler.scheduleCron('0 9 * * 0', async () => {
            await scheduleDynamicFineTuning();
        });
        // جدولة فحص التنبيهات الذكية أسبوعياً
        const { checkAndNotifyAlerts } = await Promise.resolve().then(() => __importStar(require('../modules/alert-notifier')));
        this.scheduler.scheduleCron('0 8 * * 0', async () => {
            await checkAndNotifyAlerts();
        });
        this.logger.info('Intelligent Agent started.');
        // جدولة تقرير التعلم الذاتي الأسبوعي (إلى Slack/Teams/Google Chat)
        (0, self_learning_report_scheduler_1.scheduleWeeklySelfLearningReport)(process.env.SELF_LEARNING_REPORT_SLACK_WEBHOOK, process.env.SELF_LEARNING_REPORT_TEAMS_WEBHOOK, process.env.SELF_LEARNING_REPORT_GOOGLE_WEBHOOK);
        // جدولة استيراد بيانات تعلم خارجية أسبوعياً (API/Notion/Airtable/SharePoint)
        if (process.env.EXTERNAL_LEARNING_API_URL) {
            (0, external_learning_import_scheduler_1.scheduleExternalLearningImport)(process.env.EXTERNAL_LEARNING_API_URL, process.env.EXTERNAL_LEARNING_API_TOKEN);
        }
        // Notion
        if (process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID) {
            const { importFromNotion } = await Promise.resolve().then(() => __importStar(require('../modules/notion-importer')));
            this.scheduler.scheduleCron('0 2 * * 0', async () => {
                const data = await importFromNotion({
                    databaseId: process.env.NOTION_DATABASE_ID,
                    notionApiKey: process.env.NOTION_API_KEY
                });
                for (const row of data) {
                    const { InteractionLogger } = await Promise.resolve().then(() => __importStar(require('../modules/interaction-logger')));
                    InteractionLogger.log({
                        timestamp: new Date().toISOString(),
                        input: JSON.stringify(row),
                        output: '',
                    });
                }
            });
        }
        // Airtable
        if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID && process.env.AIRTABLE_TABLE_NAME) {
            const { importFromAirtable } = await Promise.resolve().then(() => __importStar(require('../modules/airtable-importer')));
            this.scheduler.scheduleCron('0 2 * * 0', async () => {
                const data = await importFromAirtable({
                    baseId: process.env.AIRTABLE_BASE_ID,
                    tableName: process.env.AIRTABLE_TABLE_NAME,
                    apiKey: process.env.AIRTABLE_API_KEY
                });
                for (const row of data) {
                    const { InteractionLogger } = await Promise.resolve().then(() => __importStar(require('../modules/interaction-logger')));
                    InteractionLogger.log({
                        timestamp: new Date().toISOString(),
                        input: JSON.stringify(row),
                        output: '',
                    });
                }
            });
        }
        // SharePoint
        if (process.env.SHAREPOINT_SITE_URL && process.env.SHAREPOINT_LIST_TITLE && process.env.SHAREPOINT_USERNAME && process.env.SHAREPOINT_PASSWORD) {
            const { importFromSharePoint } = await Promise.resolve().then(() => __importStar(require('../modules/sharepoint-importer')));
            this.scheduler.scheduleCron('0 2 * * 0', async () => {
                const data = await importFromSharePoint({
                    siteUrl: process.env.SHAREPOINT_SITE_URL,
                    listTitle: process.env.SHAREPOINT_LIST_TITLE,
                    username: process.env.SHAREPOINT_USERNAME,
                    password: process.env.SHAREPOINT_PASSWORD
                });
                for (const row of data) {
                    const { InteractionLogger } = await Promise.resolve().then(() => __importStar(require('../modules/interaction-logger')));
                    InteractionLogger.log({
                        timestamp: new Date().toISOString(),
                        input: JSON.stringify(row),
                        output: '',
                    });
                }
            });
        }
        // جدولة تقييم ذاتي وتحسين المزود أسبوعياً
        (0, self_optimization_scheduler_1.scheduleWeeklySelfOptimization)();
        // جدولة Fine-tuning أسبوعياً لكل مزود مدعوم
        fine_tuning_manager_1.FineTuningManager.scheduleFineTuning('0 3 * * 0', 'openai', { fineTuneEndpoint: process.env.OPENAI_FINE_TUNE_ENDPOINT });
        fine_tuning_manager_1.FineTuningManager.scheduleFineTuning('0 4 * * 0', 'deepseek', { fineTuneEndpoint: process.env.DEEPSEEK_FINE_TUNE_ENDPOINT });
        fine_tuning_manager_1.FineTuningManager.scheduleFineTuning('0 5 * * 0', 'huggingface', { fineTuneEndpoint: process.env.HF_FINE_TUNE_ENDPOINT });
        // مثال: تحليل نص
        const sample = 'هذا نص جيد للاختبار';
        const nlpResult = this.nlp.analyzeText(sample);
        this.logger.info('NLP Result', nlpResult);
        // مثال: جلب بيانات من API
        const apiResult = await this.api.fetchData('https://example.com/api');
        this.logger.info('API Result', apiResult);
        // مثال: جدولة مهمة
        this.scheduler.schedule(1000, () => this.logger.info('Scheduled task executed'));
        // مثال: إشعار
        this.notifier.notify('تم بدء النظام الذكي');
        // مثال: مصادقة
        const isAuth = this.auth.authenticate('valid-token');
        this.logger.info('Auth result', isAuth);
        // مثال: قياس
        this.metrics.increment('start_count');
        this.logger.info('Start count', this.metrics.get('start_count'));
        // مثال: تخزين مؤقت
        this.cache.set('key', 'value');
        this.logger.info('Cache value', this.cache.get('key'));
        // مثال: طابور
        this.queue.enqueue('task1');
        this.logger.info('Queue size', this.queue.size());
        // مثال: إدارة ملفات
        await this.fileManager.write('test.txt', 'hello world');
        const fileContent = await this.fileManager.read('test.txt');
        this.logger.info('File content', fileContent);
        // مثال: مراقبة حدث
        this.events.watch('customEvent', (data) => this.logger.info('Event triggered', data));
        this.events.trigger('customEvent', { msg: 'مرحباً من الحدث!' });
        // مثال: إعدادات
        const envVal = this.config.get('AGENT_ENV', 'default');
        this.logger.info('Config AGENT_ENV', envVal);
        // مثال: إرسال بريد إلكتروني (تأكد من بيانات SMTP الفعلية)
        // await this.email.send('to@example.com', 'Test Subject', 'Test Body');
        // this.logger.info('Email sent');
        // مثال: إرسال SMS
        await this.sms.send('+123456789', 'رسالة تجريبية');
        // مثال: إرسال Webhook
        // await this.webhook.send('https://webhook.site/xxx', { event: 'test' });
        // مثال: دردشة ذكية
        const chatReply = await this.aiChat.chat('مرحبا');
        this.logger.info('AI Chat reply', chatReply);
        // مثال: توليد تقرير
        await this.reportGenerator.generateReport({ key: 'value' }, 'report.json');
        this.logger.info('Report generated', 'report.json');
        // مثال: إدارة مستخدمين
        this.userProfileManager.addUser({ id: '1', name: 'أحمد', email: 'ahmed@email.com' });
        const user = this.userProfileManager.getUser('1');
        this.logger.info('User profile', user);
        // مثال: تكامل مع ERP/CRM
        const erpRecords = await this.erp.fetchRecords('customer', { active: true });
        this.logger.info('ERP Records', erpRecords);
    }
}
exports.AgentCore = AgentCore;
