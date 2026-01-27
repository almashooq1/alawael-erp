import aiComplianceRiskRouter from './routes/ai-compliance-risk';
import aiComplianceRootCauseRouter from './routes/ai-compliance-root-cause';
app.use('/v1/ai', aiComplianceRiskRouter);
app.use('/v1/ai', aiComplianceRootCauseRouter);
import express from 'express';
const v1 = express.Router();
import { RiskManager } from './modules/risk-manager';
import { ResourceManager } from './modules/resource-manager';
// Duplicate import removed
const riskManager = new RiskManager();
const resourceManager = new ResourceManager();
const webhookManager = new WebhookManager();
// --- Contract and Asset interfaces with index signatures ---
interface Contract {
  [key: string]: any;
  id: string;
  title: string;
  parties: string[];
  startDate: string;
  endDate: string;
  value: number;
  terms: string;
  status?: string;
  ownerId?: string;
  metadata?: any;
}

interface Asset {
  [key: string]: any;
  id: string;
  name: string;
  type: string;
  status: 'active' | 'maintenance' | 'retired' | 'lost';
  location?: string;
  owner?: string;
  purchaseDate?: string;
  value?: number;
  depreciationRate?: number;
  tags?: string[];
  customFields?: Record<string, any>;
  lastMaintenanceDate?: string;
  nextMaintenanceDue?: string;
  aiScore?: number;
  aiRecommendation?: string;
  createdAt: string;
  updatedAt: string;
}


// Duplicate import removed
import { RiskComplianceManager } from './modules/risk-compliance';
import path from 'path';
import fs from 'fs';
import schedule from 'node-schedule';
const app = express();



// --- Advanced Modules Imports ---
import { AutoEscalation } from './modules/auto-escalation';
import { AdvancedUserManager } from './modules/advanced-user-manager';
import { SecurityPolicies } from './modules/security-policies';
import { SecurityDashboard } from './modules/security-dashboard';
import { InstantNotifier } from './modules/instant-notifier';
import { SiemIntegration } from './modules/siem-integration';
import { MFA } from './modules/mfa';
import { SecurityReports } from './modules/security-reports';
import { CyberMonitor } from './modules/cyber-monitor';
import { AssetManagement } from './modules/asset-management';
import { AIRecommender, aiRecommender } from './modules/ai-recommender';
import { Notifier, smartNotifier } from './modules/notifier';
import { AuditTrail } from './modules/audit-trail';
import { VoiceCommand } from './modules/voice-command';
import { TicketAnalytics } from './modules/ticket-analytics';
import { UserAnalytics } from './modules/user-analytics';
import { NotificationEngine } from './modules/notification-engine';

import { recommendCompliancePolicies } from './modules/compliance-policy-recommender';
import { analyzeComplianceAI } from './modules/compliance-ai';
import compliancePolicyRouter from './routes/compliance-policy';
import { getComplianceStats } from './modules/compliance-stats';
import { DashboardManager } from './modules/dashboard';
import { NotificationCenter } from './modules/notification-center';
import { WorkflowAutomation } from './modules/workflow-automation';
// --- Advanced Modules Instantiation ---
const autoEscalation = new AutoEscalation();
const userManager = new AdvancedUserManager();
const securityPolicies = new SecurityPolicies();
const securityReports = new SecurityReports(() => cyber.listEvents());
const instantNotifier = new InstantNotifier();
const siem = new SiemIntegration();
const cyber = new CyberMonitor(autoEscalation, instantNotifier);
const securityDashboard = new SecurityDashboard(cyber, securityPolicies, securityReports);
const mfa = new MFA(smartNotifier);
const recommender = aiRecommender;
const voice = new VoiceCommand();
const notifier = smartNotifier;
const audit = AuditTrail;
const analytics = new UserAnalytics();
const assetManagement = new AssetManagement();

// --- Fix: Add missing advanced module singletons ---
export const dashboardManager = new DashboardManager();
export const notificationCenter = new NotificationCenter();
export const workflowAutomation = new WorkflowAutomation();

// --- نقطة نهاية توصيات السياسات الذكية ---
app.get('/v1/compliance/policy/recommend', async (req, res) => {
  try {
    const result = await recommendCompliancePolicies();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: 'فشل توليد التوصيات', details: e.message });
  }
});
// --- نقطة نهاية التحليل الذكي للامتثال ---
app.get('/v1/compliance/ai-analysis', async (req, res) => {
  try {
    const result = await analyzeComplianceAI();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: 'فشل التحليل الذكي', details: e.message });
  }
});
// تقديم واجهة إدارة سياسات الامتثال
app.get('/dashboard/policy', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/CompliancePolicyPanel.html'));
});
app.use('/v1/compliance/policy', compliancePolicyRouter);
// تقديم واجهة التحليل المتقدم للامتثال
app.get('/dashboard/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/ComplianceAnalyticsPanel.html'));
});
// --- نقطة نهاية إحصائيات الامتثال المتقدمة ---
app.get('/v1/compliance/stats', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from as string) : undefined;
    const toDate = to ? new Date(to as string) : undefined;
    const stats = await getComplianceStats({ from: fromDate, to: toDate });
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: 'فشل جلب الإحصائيات', details: e.message });
  }
});
import { generateComplianceReport } from './modules/compliance-report';
// --- نقطة نهاية تصدير تقرير الامتثال PDF/Excel ---
import multer from 'multer';
import csvParser from 'csv-parser';
const upload = multer({ dest: 'uploads/' });
app.get('/v1/compliance/report/export', async (req, res) => {
  try {
    const { from, to, format } = req.query;
    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to as string) : new Date();
    const fmt = format === 'excel' ? 'excel' : 'pdf';
    const filePath = await generateComplianceReport({ from: fromDate, to: toDate, format: fmt });
    res.download(filePath, err => { if (!err) setTimeout(() => { require('fs').unlinkSync(filePath); }, 10000); });
  } catch (e: any) {
    res.status(500).json({ error: 'فشل إنشاء التقرير', details: e.message });
  }
});
import complianceRouter from './routes/compliance';
import exportComplianceToSheetsRouter from './routes/export-compliance-to-sheets';
import exportToWebhookRouter from './routes/export-to-webhook';
app.use('/v1/compliance', complianceRouter);
app.use('/v1/export', exportComplianceToSheetsRouter);
app.use('/v1/export', exportToWebhookRouter);
// Serve React dashboard build
app.use('/dashboard', express.static(path.join(__dirname, '../../dashboard/build')));
app.get('/dashboard*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/build/index.html'));
});
import { getUserGoogleToken, getOAuth2Client } from './modules/google-oauth';
import { setMeetingEventId, getMeetingEventId, removeMeetingEventId, removeAllMeetingEventIds } from './modules/meeting-google-eventids';
// إضافة حدث إلى تقويم Google للمشارك إذا كان مربوطًا
async function addMeetingToGoogleCalendar(meeting: Meeting) {
  if (!meeting || !Array.isArray(meeting.participants)) return;
  for (const userId of meeting.participants) {
    try {
      const token = getUserGoogleToken(userId);
      if (!token) continue;
      const oAuth2Client = getOAuth2Client(userId);
      const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
      const [year, month, day] = meeting.date.split('-').map(Number);
      const [hour, minute] = (meeting.time||'00:00').split(':').map(Number);
      const start = new Date(year, month-1, day, hour, minute);
      const end = new Date(start.getTime() + 60*60*1000);
      // Check if event already exists for this user/meeting
      const existingEventId = getMeetingEventId(meeting.id, userId);
      if (existingEventId) {
        // Try to update the event
        await calendar.events.update({
          calendarId: 'primary',
          eventId: existingEventId,
          requestBody: {
            summary: meeting.title,
            description: meeting.agenda + (meeting.notes ? ('\n' + meeting.notes) : ''),
            location: meeting.location,
            start: { dateTime: start.toISOString(), timeZone: 'UTC' },
            end: { dateTime: end.toISOString(), timeZone: 'UTC' },
          }
        });
      } else {
        // Create new event
        const resp = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: meeting.title,
            description: meeting.agenda + (meeting.notes ? ('\n' + meeting.notes) : ''),
            location: meeting.location,
            start: { dateTime: start.toISOString(), timeZone: 'UTC' },
            end: { dateTime: end.toISOString(), timeZone: 'UTC' },
          }
        });
        if (resp && resp.data && resp.data.id) {
          setMeetingEventId(meeting.id, userId, resp.data.id);
        }
      }
    } catch (e) { /* ignore individual errors */ }
  }
}
import { getGoogleOAuthConfig, saveGoogleOAuthConfig, saveUserGoogleToken } from './modules/google-oauth';
import { google } from 'googleapis';
// --- Google OAuth2 & Calendar API Integration ---
// Set Google OAuth config (admin only)
app.post('/v1/google-oauth/config', (req, res) => {
  try {
    saveGoogleOAuthConfig(req.body);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Start OAuth2 flow for user
app.get('/v1/google-oauth/auth-url', (req, res) => {
  try {
    const userIdRaw = req.user?.id || (typeof req.query.userId === 'string' ? req.query.userId : Array.isArray(req.query.userId) ? req.query.userId[0] : undefined);
    const userId = typeof userIdRaw === 'string' ? userIdRaw : undefined;
    const oAuth2Client = getOAuth2Client();
    const url = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: userId
    });
    res.json({ url });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// OAuth2 callback to save user token
app.get('/v1/google-oauth/callback', async (req, res) => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : Array.isArray(req.query.code) ? req.query.code[0] : '';
    const userId = typeof req.query.state === 'string' ? req.query.state : Array.isArray(req.query.state) ? req.query.state[0] : '';
    if (!code || !userId) return res.status(400).send('رمز المصادقة أو المستخدم غير متوفر');
    const oAuth2Client = getOAuth2Client();
    const tokenResult = await oAuth2Client.getToken(code as string);
    const tokens = (tokenResult as any).tokens || tokenResult;
    saveUserGoogleToken(userId as string, tokens);
    res.send('تم ربط حساب Google Calendar بنجاح! يمكنك إغلاق هذه الصفحة.');
  } catch (e: any) { res.status(400).send('فشل الربط: ' + (e?.message || e)); }
});

// --- Meeting Reminders: إشعار تلقائي قبل الاجتماع ---
interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  agenda?: string;
  notes?: string;
  participants: string[];
  status?: string;
  createdBy?: string;
}

function scheduleMeetingReminder(meeting: Meeting) {
  if (!meeting || !meeting.date || !meeting.time || !Array.isArray(meeting.participants)) return;
  const [year, month, day] = meeting.date.split('-').map(Number);
  const [hour, minute] = (meeting.time||'00:00').split(':').map(Number);
  // 30 دقيقة قبل الاجتماع
  const reminderDate = new Date(year, month-1, day, hour, minute-30);
  if (reminderDate < new Date()) return; // لا تذكر الاجتماعات الماضية
  schedule.scheduleJob(`meeting-reminder-${meeting.id}`, reminderDate, () => {
    meeting.participants.forEach(userId => {
      notificationCenter.sendNotification({
        userId,
        title: 'تذكير باجتماع قريب',
        message: `سيبدأ الاجتماع: ${meeting.title} في ${meeting.date} ${meeting.time}${meeting.location ? ' - ' + meeting.location : ''}`,
        channel: 'in-app'
      });
    });
  });
}
import { createEvent } from 'ics';
// --- Meeting Calendar Integration ---
// Download ICS file for a meeting
app.get('/v1/meetings/:id/calendar.ics', (req, res) => {
  const m = meetingManager.getMeeting(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  // Parse date/time
  const [year, month, day] = m.date.split('-').map(Number);
  const [hour, minute] = (m.time||'00:00').split(':').map(Number);
  createEvent({
    start: [year, month, day, hour, minute],
    duration: { hours: 1 },
    title: m.title,
    description: m.agenda + (m.notes ? ('\n' + m.notes) : ''),
    location: m.location,
    status: m.status === 'cancelled' ? 'CANCELLED' : m.status === 'completed' ? 'CONFIRMED' : m.status === 'scheduled' ? 'TENTATIVE' : undefined,
    organizer: { name: m.createdBy },
    attendees: (m.participants||[]).map(email=>({ email })),
  }, (err, value) => {
    if (err) return res.status(500).json({ error: err.message });
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename=meeting_${m.id}.ics`);
    res.send(value);
  });
});
// إشعار المشاركين عند إضافة أو تعديل اجتماع
function notifyMeetingParticipants(meeting: Meeting, action: 'create' | 'update') {
  if (!meeting || !Array.isArray(meeting.participants)) return;
  meeting.participants.forEach(userId => {
    notificationCenter.sendNotification({
      userId,
      title: action === 'create' ? 'تمت دعوتك لاجتماع جديد' : 'تم تحديث اجتماع',
      message: `اجتماع: ${meeting.title} في ${meeting.date} ${meeting.time}${meeting.location ? ' - ' + meeting.location : ''}`,
      channel: 'in-app'
    });
  });
}
import { MeetingManager } from './modules/meeting-manager';
const meetingManager = new MeetingManager();
// --- Meeting Management Endpoints ---
// List all meetings
app.get('/v1/meetings', (req, res) => {
  res.json(meetingManager.listMeetings());
});
// Get meeting by id
app.get('/v1/meetings/:id', (req, res) => {
  const m = meetingManager.getMeeting(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});
// Create meeting
app.post('/v1/meetings', async (req, res) => {
  try {
    const m: Meeting = meetingManager.createMeeting(req.body);
    notifyMeetingParticipants(m, 'create');
    scheduleMeetingReminder(m);
    await addMeetingToGoogleCalendar(m);
    res.json(m);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Update meeting
app.put('/v1/meetings/:id', async (req, res) => {
  const m = meetingManager.updateMeeting(req.params.id, req.body);
  if (!m) return res.status(404).json({ error: 'Not found' });
  notifyMeetingParticipants(m, 'update');
  scheduleMeetingReminder(m);
  await addMeetingToGoogleCalendar(m);
  res.json(m);
});
// Delete meeting
app.delete('/v1/meetings/:id', async (req, res) => {
  const meeting = meetingManager.getMeeting(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Not found' });
  const ok = meetingManager.deleteMeeting(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  // Remove Google Calendar events for all participants
  if (Array.isArray(meeting.participants)) {
    for (const userId of meeting.participants) {
      try {
        const eventId = getMeetingEventId(meeting.id, userId);
        if (eventId) {
          const token = getUserGoogleToken(userId);
          if (token) {
            const oAuth2Client = getOAuth2Client(userId);
            const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
            await calendar.events.delete({ calendarId: 'primary', eventId });
          }
          removeMeetingEventId(meeting.id, userId);
        }
      } catch (e) { /* ignore individual errors */ }
    }
    removeAllMeetingEventIds(meeting.id);
  }
  res.json({ ok: true });
});
// --- تصدير العقود مع المرفقات (CSV + ملفات) ---
import AdmZip from 'adm-zip';
import os from 'os';
app.get('/v1/contracts/export/zip', async (req, res) => {
  let contracts = contractManager.listContracts();
  contracts = filterContracts(contracts, req.query);
  if (!contracts.length) {
    res.status(404).json({ error: 'لا توجد عقود للتصدير' });
    return;
  }
  // إعداد CSV
  const columns = Object.keys(contracts[0]);
  const csvRows = [columns.join(',')];
  contracts.forEach(c => {
    csvRows.push(columns.map(k => {
      let v = (c as Contract)[k];
      if (Array.isArray(v)) v = v.join(';');
      if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(','));
  });
  // إنشاء ZIP
  const zip = new AdmZip();
  zip.addFile('contracts.csv', Buffer.from(csvRows.join(os.EOL), 'utf-8'));
  // إضافة المرفقات
  for (const c of contracts) {
    if (c && c.metadata && c.metadata.file) {
      const filePath = path.resolve('uploads', c.metadata.file);
      if (fs.existsSync(filePath)) {
        // اسم المرفق: attachments/contractId-اسم_الملف
        zip.addLocalFile(filePath, 'attachments', `${c.id}-${c.metadata.file}`);
      }
    }
  }
  const zipBuffer = zip.toBuffer();
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=contracts_with_attachments.zip');
  res.end(zipBuffer);
});
import { ExportImportLogger } from './modules/export-import-logger';
// دعم التصدير مع الترجمة التلقائية للحقول الأساسية
import translate from '@vitalets/google-translate-api';
// --- جدولة تصدير العقود تلقائيًا أسبوعيًا ---


// إنشاء مجلد التصدير إذا لم يكن موجودًا
const exportDir = path.join(__dirname, '../../exports');
if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

// جدولة التصدير الأسبوعي (كل أحد 2:00 صباحًا)
schedule.scheduleJob('0 2 * * 0', () => {
  try {
    let contracts = contractManager.listContracts();
    if (!contracts.length) return;
    const columns = Object.keys(contracts[0]);
    const csvRows = [columns.join(',')];
    contracts.forEach(c => {
      csvRows.push(columns.map(k => {
        let v = (c as Contract)[k];
        if (Array.isArray(v)) v = v.join(';');
        if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(','));
    });
    const dateStr = new Date().toISOString().slice(0,10);
    const filePath = path.join(exportDir, `contracts-weekly-${dateStr}.csv`);
    fs.writeFileSync(filePath, csvRows.join('\n'), 'utf-8');
    console.log(`[Export] تم تصدير العقود الأسبوعي: ${filePath}`);
  } catch (e) {
    console.error('[Export] فشل التصدير الأسبوعي:', e);
  }
});
// تصدير العقود كـ CSV مع الفلترة أو مع سجل النشاطات إذا طُلب
import { ContractActivityLogger } from './modules/contract-activity-logger';
app.get('/v1/contracts/export/csv', async (req, res) => {
  ExportImportLogger.log({
    timestamp: new Date().toISOString(),
    userId: req.user?.id, // إذا كان متاحًا
    operation: 'export',
    format: 'csv',
    details: { query: req.query }
  });
  // إشعار داخلي بعد التصدير
  if (req.user?.id) {
    notificationCenter.sendNotification({
      userId: req.user.id,
      title: 'تم تصدير العقود',
      message: 'تم تصدير العقود بنجاح كملف CSV.',
      channel: 'in-app'
    });
  }
  let contracts = contractManager.listContracts();
  contracts = filterContracts(contracts, req.query as Record<string, any>);
  const includeActivities = req.query.includeActivities == '1' || req.query.includeActivities === 'true';
  const lang = req.query.lang ? String(req.query.lang) : 'ar';
  const shouldTranslate = lang && lang !== 'ar' && lang !== 'ar-SA';
  if (!contracts.length) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=contracts_export.csv');
    return res.end('');
  }
  // ترجمة الحقول الأساسية إذا طُلب
  if (shouldTranslate) {
    for (const c of contracts) {
      if (c.title) {
        try { c.title = (await (translate as any)(c.title, { to: lang })).text; } catch {}
      }
      if (c.terms) {
        try { c.terms = (await (translate as any)(c.terms, { to: lang })).text; } catch {}
      }
    }
  }
  // دعم تصدير أعمدة مخصصة
  let columns = Object.keys(contracts[0]);
  if (Array.isArray(req.query.fields)) {
    columns = req.query.fields as string[];
  } else if (typeof req.query.fields === 'string') {
    columns = [req.query.fields];
  }
  if (!includeActivities) {
    const csvRows = [columns.join(',')];
    contracts.forEach(c => {
      csvRows.push(columns.map(k => {
        let v = (c as Contract)[k];
        if (Array.isArray(v)) v = v.join(';');
        if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(','));
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=contracts_export_${lang}.csv`);
    return res.end(csvRows.join('\n'));
  }
  // إذا طُلب سجل النشاطات، ندمج كل عقد مع نشاطاته كسطر واحد أو أكثر
  // سنصدر ملف CSV يحتوي على بيانات العقد + كل نشاط متعلق به كسطر منفصل
  const columnsWithActivities = [...Object.keys(contracts[0]), 'activityTimestamp', 'activityUserId', 'activityAction', 'activityDetails'];
  const csvRows = [columnsWithActivities.join(',')];
  for (const c of contracts) {
    const activities = ContractActivityLogger.getByContract((c as any).id || (c as any).contractId || (c as any)._id || '');
    if (!activities.length) {
      // عقد بدون نشاطات
      csvRows.push(columnsWithActivities.map(k => {
        let v = (c as any)[k];
        if (["activityTimestamp","activityUserId","activityAction","activityDetails"].includes(k)) v = '';
        if (Array.isArray(v)) v = v.join(';');
        if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
        return `"${String(v??'').replace(/"/g, '""')}"`;
      }).join(','));
    } else {
      // عقد مع نشاطات
      activities.forEach(a => {
        csvRows.push(columnsWithActivities.map(k => {
          if (k === 'activityTimestamp') return `"${a.timestamp}"`;
          if (k === 'activityUserId') return `"${a.userId??''}"`;
          if (k === 'activityAction') return `"${a.action}"`;
          if (k === 'activityDetails') return `"${typeof a.details === 'object' ? JSON.stringify(a.details) : (a.details??'')}"`;
          let v = (c as any)[k];
          if (Array.isArray(v)) v = v.join(';');
          if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
          return `"${String(v??'').replace(/"/g, '""')}"`;
        }).join(','));
      });
    }
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=contracts_export_with_activities_${lang}.csv`);
  res.end(csvRows.join('\n'));
});

// استيراد العقود من ملف CSV
app.post('/v1/contracts/import-csv', upload.single('file'), (req, res) => {
  ExportImportLogger.log({
    timestamp: new Date().toISOString(),
    userId: req.user?.id,
    operation: 'import',
    format: 'csv',
    details: { filename: req.file?.originalname }
  });
  // إشعار داخلي بعد الاستيراد
  if (req.user?.id) {
    notificationCenter.sendNotification({
      userId: req.user.id,
      title: 'تم استيراد العقود',
      message: 'تم استيراد العقود من ملف CSV بنجاح.',
      channel: 'in-app'
    });
  }
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
  try {
    const raw = fs.readFileSync(req.file.path, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (!lines.length) throw new Error('ملف CSV فارغ');
    const headers = lines[0].split(',').map((h: string) => h.replace(/^"|"$/g, ''));
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((cell: string) => cell.replace(/^"|"$/g, ''));
      const c: Record<string, any> = {};
      headers.forEach((h: string, idx: number) => {
        let v: any = row[idx];
        // Always assign as string, parse after
        (c as any)[h] = v;
      });
      // Parse fields to correct types after assignment
      if (c.parties && typeof c.parties === 'string') c.parties = c.parties.split(';').map((x: string) => x.trim());
      if (c.value && typeof c.value === 'string') c.value = Number(c.value);
      if (c.metadata && typeof c.metadata === 'string') {
        try { c.metadata = JSON.parse(c.metadata); } catch { c.metadata = {}; }
      }
      if (c.title && c.parties && c.startDate && c.endDate && c.value && c.terms) {
        contractManager.createContract({
          title: String(c.title),
          parties: Array.isArray(c.parties) ? c.parties : String(c.parties).split(/[,،;]/).map((p: string) => p.trim()),
          startDate: String(c.startDate),
          endDate: String(c.endDate),
          value: Number(c.value),
          terms: String(c.terms),
          status: (['active','pending','expired','terminated'].includes(c.status) ? c.status : 'pending') as 'active'|'pending'|'expired'|'terminated',
          ownerId: c.ownerId ? String(c.ownerId) : undefined,
          metadata: c.metadata || {},
        });
        imported++;
      }
    }
    fs.unlinkSync(req.file.path);
    res.json({ imported, total: lines.length - 1 });
  } catch (e) {
    fs.unlinkSync(req.file.path);
    const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e);
    res.status(500).json({ error: 'فشل الاستيراد', details: msg });
  }
});

// استيراد العقود من ملف ZIP يحتوي على عدة ملفات (CSV/JSON/مرفقات)
app.post('/v1/contracts/import-zip', upload.single('file'), async (req, res) => {
  ExportImportLogger.log({
    timestamp: new Date().toISOString(),
    userId: req.user?.id,
    operation: 'import',
    format: 'zip',
    details: { filename: req.file?.originalname }
  });
  // إشعار داخلي بعد الاستيراد
  if (req.user?.id) {
    notificationCenter.sendNotification({
      userId: req.user.id,
      title: 'تم استيراد العقود',
      message: 'تم استيراد العقود من ملف ZIP بنجاح.',
      channel: 'in-app'
    });
  }
  // عرض سجل عمليات التصدير/الاستيراد
  app.get('/v1/export-import/log', (req, res) => {
    res.json(ExportImportLogger.getAll());
  });
  // حذف السجل بالكامل (للمسؤول فقط)
  app.delete('/v1/export-import/log', (req, res) => {
    ExportImportLogger.clearAll();
    res.json({ cleared: true });
  });
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
  try {
    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();
    let imported = 0, attachments = 0, errors = [];
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const name = entry.entryName.toLowerCase();
      try {
        if (name.endsWith('.csv')) {
          const raw = entry.getData().toString('utf-8');
          const lines = raw.split(/\r?\n/).filter(Boolean);
          if (!lines.length) continue;
            const headers = lines[0].split(',').map((h: string) => h.replace(/^"|"$/g, ''));
            for (let i = 1; i < lines.length; i++) {
              const row = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((cell: string) => cell.replace(/^"|"$/g, ''));
              const c: Record<string, any> = {};
              headers.forEach((h: string, idx: number) => {
                let v = row[idx];
                // Always assign as string, parse after
                (c as any)[h] = v;
              }); // End forEach for headers
              // Parse fields to correct types after assignment
              if (c.parties && typeof c.parties === 'string') c.parties = c.parties.split(';').map((x: string) => x.trim());
              if (c.value && typeof c.value === 'string') c.value = Number(c.value);
              if (c.metadata && typeof c.metadata === 'string') {
                try { c.metadata = JSON.parse(c.metadata); } catch { c.metadata = {}; }
              }
              if (c.title && c.parties && c.startDate && c.endDate && c.value && c.terms) {
                contractManager.createContract({
                  title: String(c.title),
                  parties: Array.isArray(c.parties) ? c.parties : String(c.parties).split(/[,،;]/).map((p: string) => p.trim()),
                  startDate: String(c.startDate),
                  endDate: String(c.endDate),
                  value: Number(c.value),
                  terms: String(c.terms),
                  status: (['active','pending','expired','terminated'].includes(c.status) ? c.status : 'pending') as 'active'|'pending'|'expired'|'terminated',
                  ownerId: c.ownerId ? String(c.ownerId) : undefined,
                  metadata: c.metadata || {},
                });
                imported++;
              }
            } // End for loop for lines
        } else if (name.endsWith('.json')) {
          const raw = entry.getData().toString('utf-8');
          let arr;
          try { arr = JSON.parse(raw); } catch { arr = []; }
          if (!Array.isArray(arr)) arr = [arr];
          for (const c of arr) {
            if (c.title && c.parties && c.startDate && c.endDate && c.value && c.terms) {
              contractManager.createContract({
                title: c.title,
                parties: c.parties,
                startDate: c.startDate,
                endDate: c.endDate,
                value: c.value,
                terms: c.terms,
                status: c.status || 'pending',
                ownerId: c.ownerId,
                metadata: c.metadata || {},
              });
              imported++;
            }
          }
        } else {
          // اعتبره مرفقًا (ملف مرتبط)
          // يمكن حفظه في مجلد خاص أو ربطه لاحقًا
          attachments++;
          // مثال: zip.extractEntryTo(entry, './uploads/attachments', false, true);
        }
      } catch (err) {
        const msg = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : String(err);
        errors.push({ file: entry.entryName, error: msg });
      }
    }
    fs.unlinkSync(req.file.path);
    res.json({ imported, attachments, errors });
  } catch (e) {
    fs.unlinkSync(req.file.path);
    const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e);
    res.status(500).json({ error: 'فشل الاستيراد من ZIP', details: msg });
  }
});
// تقديم واجهة التحليل الذكي للعقود
app.get('/dashboard/contract-smart', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/ContractSmartPanel.html'));
});
import contractSmartApi from '../dashboard/contract-smart-api';
// ربط API التحليل الذكي للعقود
app.use('/dashboard/contract-smart', contractSmartApi);
// تقديم واجهة تقرير العقود
app.get('/dashboard/contract-reports', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/ContractReportsPanel.html'));
});
import contractReportsApi from '../dashboard/contract-reports-api';
// ربط API تقارير العقود
app.use('/dashboard/contract-reports', contractReportsApi);
import contractFileApi from '../dashboard/contract-file-api';
// ربط API ملفات العقود
app.use('/dashboard/contract-file', contractFileApi);
// مركز إدارة النظام والتكاملات
app.get('/dashboard/hub', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/IntegrationsHub.html'));
});
// تقديم واجهة إرسال Webhook يدوي
app.get('/dashboard/webhook', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/WebhookPanel.html'));
});
import webhookApi from '../dashboard/webhook-api';
// ربط API وحدة Webhook
app.use('/dashboard/webhook', webhookApi);
// تقديم واجهة رفع الملفات إلى Box
app.get('/dashboard/box', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/BoxPanel.html'));
});
import boxApi from '../dashboard/box-api';
// ربط API تكامل Box
app.use('/dashboard/box', boxApi);
// تقديم واجهة رفع الملفات إلى Dropbox
app.get('/dashboard/dropbox', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/DropboxPanel.html'));
});
import dropboxApi from '../dashboard/dropbox-api';
// ربط API تكامل Dropbox
app.use('/dashboard/dropbox', dropboxApi);
// تقديم واجهة رفع الملفات إلى Google Drive
app.get('/dashboard/gdrive', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/GoogleDrivePanel.html'));
});
import gdriveApi from '../dashboard/gdrive-api';
// ربط API تكامل Google Drive
app.use('/dashboard/gdrive', gdriveApi);
// تقديم واجهة منشئ التقارير المخصصة
app.get('/dashboard/custom-reports', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/CustomReportsPanel.html'));
});
import customReportsApi from '../dashboard/custom-reports-api';
// ربط API منشئ التقارير المخصصة
app.use('/dashboard/reports', customReportsApi);
// تقديم واجهة إدارة الأدوار والصلاحيات
app.get('/dashboard/roles', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/RolesPanel.html'));
});
import permissionsApi from '../dashboard/permissions-api';
// ربط API إدارة الأدوار والصلاحيات
app.use('/dashboard/permissions', permissionsApi);
// تقديم واجهة إدارة المصادر الذكية
app.get('/dashboard/sources', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/SourcesPanel.html'));
});
import sourcesApi from '../dashboard/sources-api';
// ربط API إدارة المصادر الذكية
app.use('/dashboard/sources', sourcesApi);
// تقديم واجهة الإدارة المتقدمة
app.get('/dashboard/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/AdminPanel.html'));
});
import auditApi from '../dashboard/audit-api';
// ربط API سجل التدقيق
app.use('/dashboard/audit', auditApi);

// تقديم واجهة إدارة العقود
app.get('/dashboard/contracts', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/ContractPanel.html'));
});
import contractApi from '../dashboard/contract-api';
// ربط API إدارة العقود
app.use('/dashboard/contract', contractApi);

// تقديم واجهة الإشعارات المركزية
app.get('/dashboard/notifications', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/NotificationPanel.html'));
});
import notificationApi from '../dashboard/notification-api';
// ربط API الإشعارات المركزية
app.use('/dashboard/notification', notificationApi);
import authApi from '../dashboard/auth-api';
// ربط API إدارة المستخدمين والصلاحيات
app.use('/dashboard/auth', authApi);
import biApi from '../dashboard/bi-api';
// ربط API بيانات Power BI/Tableau
app.use('/dashboard/bi', biApi);

import dashboardApi from '../dashboard/api';
// ربط API لوحة التحكم
app.use('/dashboard/api', dashboardApi);

// تقديم ملفات React للوحة التحكم (بسيط: ملف واحد)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/Dashboard.html'));
});
import { importFromNotion } from './modules/notion-importer';
import { importFromAirtable } from './modules/airtable-importer';
import { importFromSharePoint } from './modules/sharepoint-importer';
// استيراد بيانات تعلم من Notion
app.post('/v1/self-learning/interactions/import-notion', async (req, res) => {
  const { databaseId, notionApiKey } = req.body || {};
  try {
    const data = await importFromNotion({
      databaseId: databaseId || process.env.NOTION_DATABASE_ID,
      notionApiKey: notionApiKey || process.env.NOTION_API_KEY
    });
    for (const row of data) InteractionLogger.log({
      timestamp: new Date().toISOString(),
      input: JSON.stringify(row),
      output: '',
      userId: req.user?.id || undefined
    });
    res.json({ imported: data.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// استيراد بيانات تعلم من Airtable
app.post('/v1/self-learning/interactions/import-airtable', async (req, res) => {
  const { baseId, tableName, apiKey } = req.body || {};
  try {
    const data = await importFromAirtable({
      baseId: baseId || process.env.AIRTABLE_BASE_ID,
      tableName: tableName || process.env.AIRTABLE_TABLE_NAME,
      apiKey: apiKey || process.env.AIRTABLE_API_KEY
    });
    for (const row of data) InteractionLogger.log({
      timestamp: new Date().toISOString(),
      input: JSON.stringify(row),
      output: '',
      userId: req.user?.id || undefined
    });
    res.json({ imported: data.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// استيراد بيانات تعلم من SharePoint
app.post('/v1/self-learning/interactions/import-sharepoint', async (req, res) => {
  const { siteUrl, listTitle, username, password } = req.body || {};
  try {
    const data = await importFromSharePoint({
      siteUrl: siteUrl || process.env.SHAREPOINT_SITE_URL,
      listTitle: listTitle || process.env.SHAREPOINT_LIST_TITLE,
      username: username || process.env.SHAREPOINT_USERNAME,
      password: password || process.env.SHAREPOINT_PASSWORD
    });
    for (const row of data) InteractionLogger.log({
      timestamp: new Date().toISOString(),
      input: JSON.stringify(row),
      output: '',
      userId: req.user?.id || undefined
    });
    res.json({ imported: data.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
import { importFromGitHubRaw } from './modules/github-importer';
// استيراد بيانات تعلم من GitHub (raw URL)
app.post('/v1/self-learning/interactions/import-github', async (req, res) => {
  const { rawUrl } = req.body || {};
  if (!rawUrl) return res.status(400).json({ error: 'rawUrl required' });
  try {
    const count = await importFromGitHubRaw(rawUrl);
    res.json({ imported: count });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
import { importFromGoogleSheets } from './modules/google-sheets-importer';
// استيراد بيانات تعلم من Google Sheets
app.post('/v1/self-learning/interactions/import-google-sheets', async (req, res) => {
  const { sheetId, apiKey, range } = req.body || {};
  if (!sheetId || !apiKey) return res.status(400).json({ error: 'sheetId and apiKey required' });
  try {
    const count = await importFromGoogleSheets(sheetId, apiKey, range);
    res.json({ imported: count });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
import axios from 'axios';
// استيراد بيانات تعلم من API خارجي (بإعطاء URL وToken)
app.post('/v1/self-learning/interactions/import-api', async (req, res) => {
  const { url, token } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const response = await axios.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    let arr = response.data;
    if (!Array.isArray(arr)) arr = [arr];
    for (const row of arr) {
      InteractionLogger.log({
        timestamp: new Date().toISOString(),
        input: JSON.stringify(row),
        output: '',
        userId: req.user?.id || undefined
      });
    }
    res.json({ imported: arr.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
// استيراد بيانات تفاعل من ملف خارجي (CSV/JSON)
app.post('/v1/self-learning/interactions/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const originalname = req.file.originalname || '';
  const ext = originalname.split('.').pop()?.toLowerCase() || '';
    const results: Record<string, unknown>[] = []; // Initialize results array
  if (ext === 'csv') {
    require('fs').createReadStream(req.file.path)
      .pipe(csvParser())
      .on('data', (data: Record<string, unknown>) => results.push(data))
      .on('end', () => {
        for (const row of results) {
          InteractionLogger.log({
            timestamp: new Date().toISOString(),
            input: JSON.stringify(row),
            output: '',
            userId: req.user?.id || undefined
          });
        }
        if (req.file?.path) require('fs').unlinkSync(req.file.path);
        res.json({ imported: results.length });
      });
  } else if (ext === 'json') {
    const raw = require('fs').readFileSync(req.file.path, 'utf8');
    let arr;
    try { arr = JSON.parse(raw); } catch { arr = []; }
    if (!Array.isArray(arr)) arr = [arr];
    for (const row of arr) {
      InteractionLogger.log({
        timestamp: new Date().toISOString(),
        input: JSON.stringify(row),
        output: '',
        userId: req.user?.id || undefined
      });
    }
    require('fs').unlinkSync(req.file.path);
    res.json({ imported: arr.length });
  } else {
    require('fs').unlinkSync(req.file.path);
    res.status(400).json({ error: 'Unsupported file type' });
  }
});
import { InteractionLogger } from './modules/interaction-logger';
import { SelfEvaluator } from './modules/self-evaluator';
// === Self-Learning Data & Evaluation Endpoints ===
// عرض جميع بيانات التفاعل مع دعم التصفية
app.get('/v1/self-learning/interactions', (req, res) => {
  const { userId, from, to } = req.query;
  res.json(InteractionLogger.getAll({ userId: userId as string, from: from as string, to: to as string }));
});
// تصدير بيانات التفاعل كـ CSV مع دعم التصفية
app.get('/v1/self-learning/interactions/export', (req, res) => {
  const { userId, from, to } = req.query;
  const data = InteractionLogger.getAll({ userId: userId as string, from: from as string, to: to as string });
  const csv = [
    'timestamp,userId,input,output,context,feedback',
    ...data.map(d => `"${d.timestamp}","${d.userId ?? ''}","${(d.input ?? '').replace(/"/g, '""')}","${(d.output ?? '').replace(/"/g, '""')}","${(d.context ?? '').replace(/"/g, '""')}","${d.feedback ?? ''}"`)
  ].join('\n');
  res.header('Content-Type', 'text/csv; charset=utf-8');
  res.attachment('interactions-export.csv');
  res.send(csv);
});
// حذف جميع بيانات التفاعل
app.delete('/v1/self-learning/interactions', (req, res) => {
  InteractionLogger.clearAll();
  res.json({ cleared: true });
});
// حذف بيانات التفاعل لمستخدم محدد
app.delete('/v1/self-learning/interactions/:userId', (req, res) => {
  InteractionLogger.deleteByUser(req.params.userId);
  res.json({ deleted: true, userId: req.params.userId });
});
// عرض جميع نتائج التقييم الذاتي
app.get('/v1/self-learning/evaluations', (req, res) => {
  res.json(SelfEvaluator.evaluateAll());
});
// متوسط التقييم الذاتي الحالي
app.get('/v1/self-learning/evaluations/average', (req, res) => {
  res.json({ average: SelfEvaluator.averageScore() });
});
// --- Specialized AI Analytics: Failure Prediction & Investment Recommendation ---
app.post('/v1/assets/ai/specialized', async (req, res) => {
  const { assetId, context } = req.body || {};
  const asset = assetManagement.getAsset(assetId);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  // محاكاة تنبؤ بالفشل
  let failureRisk = 0;
  if (asset.status === 'maintenance' || asset.aiScore !== undefined && asset.aiScore < 50) failureRisk += 0.4;
  if (asset.value && asset.depreciationRate && asset.value < 10000) failureRisk += 0.2;
  if (asset.lastMaintenanceDate && asset.nextMaintenanceDue && new Date(asset.nextMaintenanceDue) < new Date()) failureRisk += 0.3;
  failureRisk = Math.min(1, failureRisk);
  // توصية استثمارية
  let investmentAdvice = 'احتفظ بالأصل.';
  if (failureRisk > 0.7) investmentAdvice = 'ينصح باستبدال الأصل أو بيعه.';
  else if (failureRisk > 0.4) investmentAdvice = 'ينصح بصيانة وقائية عاجلة.';
  // يمكن ربط هذا التحليل فعليًا مع خدمة AI خارجية لاحقًا
  res.json({
    assetId,
    failureRisk: Math.round(failureRisk * 100) + '%',
    investmentAdvice,
    context: context || null
  });
});
// --- Slack Integration: Send Smart Asset Report ---
app.post('/v1/integrations/slack/notify', async (req, res) => {
  const { webhookUrl, message, assetIds } = req.body || {};
  if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl required' });
  const assets = Array.isArray(assetIds) && assetIds.length
    ? assetIds.map((id: string) => assetManagement.getAsset(id)).filter(Boolean)
    : assetManagement.listAssets();
  const summary = assets.map(a => a ? `• ${a.name} (${a.status}) - AI: ${a.aiScore}` : '').filter(Boolean).join('\n');
  const slackPayload = {
    text: (message ? message + '\n' : '') + summary
  };
  try {
    const response = await axios.post(webhookUrl, slackPayload);
    res.json({ sent: true, status: response.status });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
// --- Advanced Asset Analytics & Reports ---
app.get('/v1/assets/analytics/advanced', (req, res) => {
  const assets = assetManagement.listAssets();
  // توزيع الحالات
    const statusDist = assets.reduce((acc: any, a: any) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});
    // Removed broken count using undeclared 'month'. Use 'trend' below for monthly active asset counts.
  // أعلى الأصول خطورة (أقل aiScore)
  const mostCritical = [...assets].filter((a): a is Asset => !!a && a.aiScore !== undefined).sort((a, b) => (a.aiScore ?? 100) - (b.aiScore ?? 100)).slice(0, 5);
  // أكثر الأصول تكلفة
  const mostExpensive = [...assets].filter((a): a is Asset => !!a && a.value !== undefined).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 5);
  // تحليل الاتجاهات (عدد الأصول النشطة آخر 6 أشهر)
  const now = new Date();
  const trend = Array.from({ length: 6 }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const count = assets.filter((a): a is Asset => {
      return !!a && typeof a.status === 'string' && a.status === 'active' && !!a.createdAt && !isNaN(new Date(a.createdAt).getTime()) && new Date(a.createdAt) <= month;
    }).length;
    return { month: month.toISOString().slice(0, 7), activeAssets: count };
  }).reverse();
  res.json({
    statusDistribution: statusDist,
    mostCriticalAssets: mostCritical,
    mostExpensiveAssets: mostExpensive,
    activeAssetsTrend: trend
  });
});
// --- Microsoft Teams Integration: Send Smart Asset Report ---
app.post('/v1/integrations/teams/notify', async (req, res) => {
  const { webhookUrl, message, assetIds } = req.body || {};
  if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl required' });
  // جمع ملخص الأصول المطلوبة أو الكل
  const assets = Array.isArray(assetIds) && assetIds.length
    ? assetIds.map((id: string) => assetManagement.getAsset(id)).filter(Boolean)
    : assetManagement.listAssets();
  // بناء نص التقرير
  const summary = assets.map(a => a ? `• ${a.name} (${a.status}) - AI: ${a.aiScore}` : '').filter(Boolean).join('\n');
  const teamsPayload = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    summary: 'Smart Asset Report',
    themeColor: '0076D7',
    title: 'تقرير الأصول الذكية',
    text: (message ? message + '\n' : '') + summary
  };
  try {
    const response = await axios.post(webhookUrl, teamsPayload);
    res.json({ sent: true, status: response.status });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
// Helper: تحليل الأصل عبر Azure OpenAI
async function analyzeAssetWithAzureOpenAI(asset: any, context?: string): Promise<string> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-35-turbo';
  if (!apiKey || !endpoint) throw new Error('Missing Azure OpenAI credentials');
  const prompt = `أنت خبير في إدارة الأصول. حلل الأصل التالي وقدم توصية ذكية:\n` +
    `الاسم: ${asset.name}\n` +
    `الحالة: ${asset.status}\n` +
    `القيمة: ${asset.value}\n` +
    `درجة الذكاء الاصطناعي: ${asset.aiScore}\n` +
    `توصية النظام: ${asset.aiRecommendation}\n` +
    (context ? `سياق إضافي: ${context}\n` : '') +
    `قدم تحليلاً مختصراً وتوصية عملية.`;
  const response = await axios.post(
    `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2023-03-15-preview`,
    {
      messages: [
        { role: 'system', content: 'أنت خبير في إدارة الأصول الذكية.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.3
    },
    {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.choices?.[0]?.message?.content || 'لم يتم الحصول على تحليل.';
}
// --- Export Smart Analytics to External System (Power BI/ERP/Webhook) ---

// قوالب تقارير افتراضية
const reportTemplates: Record<string, (data: any) => string> = {
  'simple-ar': (data) => `تقرير الأصول:\n${data.summary.map((s: any) => `${s.label}: ${s.value}`).join('\n')}`,
  'simple-en': (data) => `Asset Report:\n${data.summary.map((s: any) => `${s.label}: ${s.value}`).join('\n')}`,
  'critical-only': (data) => `Critical Assets:\n${data.smartRecommendations?.map((r: any) => `• ${r.assetName}: ${r.reason}`).join('\n')}`
};
app.post('/v1/assets/analytics/export', async (req, res) => {
  const { targetUrls, format, assetIds, scheduleCron, smartFilter, template } = req.body || {};
  const urls = Array.isArray(targetUrls) ? targetUrls : (targetUrls ? [targetUrls] : []);
  if (!urls.length) return res.status(400).json({ error: 'targetUrls required' });
  // تصفية ذكية للأصول (مثلاً فقط الأصول الحرجة)
  let assets = Array.isArray(assetIds) && assetIds.length
    ? assetIds.map((id: string) => assetManagement.getAsset(id)).filter(Boolean)
    : assetManagement.listAssets();
  if (smartFilter === 'critical') {
    assets = assets.filter((a): a is Asset => !!a && a.aiScore !== undefined && a.aiScore < 50);
  }
  // بناء التحليلات الذكية (نفس ودجت dashboard)
  const notifs = notificationCenter.listNotifications();
  const analytics = dashboardManager.getAssetAnalyticsWidget(assets.filter((a): a is Asset => !!a), notifs);
  // دعم قوالب تقارير مخصصة
  let reportContent: unknown = analytics;
  if (template && reportTemplates[template]) {
    reportContent = reportTemplates[template](analytics.data);
  }
  // دعم تنسيقات متعددة (JSON افتراضي)
  let payload: unknown = reportContent;
  let contentType = 'application/json';
  if (format === 'csv') {
    const { Parser } = require('json2csv');
    const parser = new Parser();
    payload = parser.parse(analytics.data.summary);
    contentType = 'text/csv';
  } else if (format === 'xml') {
    const toXML = (obj: any) => {
      let xml = '<root>';
      for (const k in obj) {
        xml += `<${k}>${Array.isArray(obj[k]) ? obj[k].map((v: any) => `<item>${v}</item>`).join('') : obj[k]}</${k}>`;
      }
      xml += '</root>';
      return xml;
    };
    payload = toXML(analytics.data.summary);
    contentType = 'application/xml';
  }
  // جدولة التصدير إذا طلب المستخدم
  const sendToAll = async () => {
    for (const url of urls) {
      try {
        await axios.post(url, payload, { headers: { 'Content-Type': contentType } });
      } catch (e) {/* ignore errors */}
    }
  };
  if (scheduleCron) {
    schedule.scheduleJob(scheduleCron, sendToAll);
    return res.json({ scheduled: true, cron: scheduleCron });
  }
  // إرسال البيانات فورًا إلى جميع الأنظمة
  try {
    await sendToAll();
    res.json({ sent: true, targets: urls });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
// Helper: تحليل الأصل عبر OpenAI
async function analyzeAssetWithOpenAI(asset: any, context?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OpenAI API key in OPENAI_API_KEY');
  const prompt = `أنت خبير في إدارة الأصول. حلل الأصل التالي وقدم توصية ذكية:
` +
    `الاسم: ${asset.name}\n` +
    `الحالة: ${asset.status}\n` +
    `القيمة: ${asset.value}\n` +
    `درجة الذكاء الاصطناعي: ${asset.aiScore}\n` +
    `توصية النظام: ${asset.aiRecommendation}\n` +
    (context ? `سياق إضافي: ${context}\n` : '') +
    `قدم تحليلاً مختصراً وتوصية عملية.`;
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'أنت خبير في إدارة الأصول الذكية.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 300,
    temperature: 0.3
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data.choices?.[0]?.message?.content || 'لم يتم الحصول على تحليل.';
}
// --- Advanced AI Analysis Endpoint ---
app.post('/v1/assets/ai/analyze', async (req, res) => {
  const { assetId, context, webhookUrl, provider } = req.body || {};
  const asset = assetManagement.getAsset(assetId);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  try {
    let analysis;
    if (provider === 'azure') {
      analysis = await analyzeAssetWithAzureOpenAI(asset, context);
    } else {
      analysis = await analyzeAssetWithOpenAI(asset, context);
    }
    // أتمتة إرسال تنبيه إذا كانت التوصية حرجة
    if (webhookUrl && asset.aiScore !== undefined && asset.aiScore < 50) {
      try {
        await axios.post(webhookUrl, {
          assetId: asset.id,
          name: asset.name,
          aiScore: asset.aiScore,
          analysis,
          alert: 'CRITICAL_AI_RECOMMENDATION'
        });
      } catch (err) {/* ignore webhook errors */}
    }
    res.json({ analysis });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
// --- Asset Import Endpoint (CSV) ---

app.post('/v1/assets/import/csv', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const results: Record<string, unknown>[] = [];
  fs.createReadStream(req.file.path)
    .pipe(csvParser())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      let imported = 0;
      for (const row of results) {
        // Type guard: ensure required Asset fields exist
        if (
          typeof row.name === 'string' &&
          typeof row.type === 'string' &&
          typeof row.status === 'string' &&
          typeof row.createdAt === 'string' &&
          typeof row.updatedAt === 'string'
        ) {
          try {
            assetManagement.createAsset(row as any);
            imported++;
          } catch (e) { /* skip invalid rows */ }
        }
      }
      if (req.file?.path) fs.unlinkSync(req.file.path);
      res.json({ imported, total: results.length });
    });
});
// --- Asset Export Endpoints ---
app.get('/v1/assets/export/csv', (req, res) => {
  try {
    const csv = assetManagement.exportAssetsAsCSV();
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment('assets-export.csv');
    res.send(csv);
  } catch (e) {
    if (e instanceof Error) {
      res.status(500).json({ error: e.message });
    } else {
      res.status(500).json({ error: 'Unknown error' });
    }
  }
});

// --- Workflow Automation Endpoints ---
// إنشاء سير عمل جديد
app.post('/v1/workflows', (req, res) => {
  const wf = workflowAutomation.createWorkflow(req.body);
  res.json(wf);
});
// تحديث سير عمل
app.put('/v1/workflows/:id', (req, res) => {
  const wf = workflowAutomation.updateWorkflow(req.params.id, req.body);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
});
// حذف سير عمل
app.delete('/v1/workflows/:id', (req, res) => {
  const ok = workflowAutomation.deleteWorkflow(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Workflow not found' });
  res.json({ deleted: true });
});
// عرض كل سير العمل
app.get('/v1/workflows', (req, res) => {
  res.json(workflowAutomation.listWorkflows());
});
// تنفيذ سير عمل يدوي
app.post('/v1/workflows/:id/trigger', (req, res) => {
  const exec = workflowAutomation.triggerWorkflow(req.params.id);
  if (!exec) return res.status(404).json({ error: 'Workflow not found or disabled' });
  res.json(exec);
});
// تتبع تنفيذ سير العمل
app.get('/v1/workflows/:id/executions', (req, res) => {
  res.json(workflowAutomation.listExecutions(req.params.id));
});
// جدولة تنفيذ سير عمل (كرون)

app.post('/v1/workflows/:id/schedule', (req, res) => {
  const { cron } = req.body || {};
  if (!cron) return res.status(400).json({ error: 'cron required' });
  const wf = workflowAutomation.getWorkflow(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  schedule.scheduleJob(cron, () => { workflowAutomation.triggerWorkflow(req.params.id); });
  res.json({ scheduled: true, cron });
});
// ...existing code...
// --- Smart Asset Analytics Dashboard Widget Endpoint ---
app.get('/v1/dashboard/widgets/asset-analytics', (req, res) => {
  const assets = assetManagement.listAssets();
  const notifs = notificationCenter.listNotifications();
  const widget = dashboardManager.getAssetAnalyticsWidget(assets, notifs);
  res.json(widget);
});
// ...existing code...
// --- Asset Maintenance Notification Endpoint ---
app.post('/v1/assets/maintenance/notify', (req, res) => {
  const { days, channel } = req.body || {};
  const alerts = assetManagement.getMaintenanceAlerts(days ? Number(days) : 30);
  if (!alerts.length) return res.json({ message: 'No assets need maintenance soon.' });
  const notifs = notificationCenter.sendMaintenanceAlerts(alerts, channel || 'in-app');
  res.json({ sent: notifs.length, notifications: notifs });
});
// --- Asset AI & Smart Alerts Endpoints ---
// Get AI score & recommendation for asset
app.get('/v1/assets/:id/ai', (req, res) => {
  const a = assetManagement.getAsset(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json({ aiScore: a.aiScore, aiRecommendation: a.aiRecommendation });
});
// Get smart maintenance alerts (assets needing maintenance soon)
app.get('/v1/assets/maintenance/alerts', (req, res) => {
  const { days } = req.query;
  const alerts = assetManagement.getMaintenanceAlerts(days ? Number(days) : 30);
  res.json(alerts);
});
import { MultiTenancy } from './modules/multi-tenancy';
// ...existing code...
// --- Asset Management Endpoints ---
app.get('/v1/assets', (req, res) => {
  res.json(assetManagement.listAssets(req.query));
});
app.get('/v1/assets/:id', (req, res) => {
  const a = assetManagement.getAsset(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});
app.post('/v1/assets', (req, res) => {
  try {
    const a = assetManagement.createAsset(req.body);
    res.json(a);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/assets/:id', (req, res) => {
  const a = assetManagement.updateAsset(req.params.id, req.body);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});
app.delete('/v1/assets/:id', (req, res) => {
  const ok = assetManagement.deleteAsset(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
// Advanced: Depreciation calculation
app.get('/v1/assets/:id/depreciation', (req, res) => {
  const { years } = req.query;
  if (!years) return res.status(400).json({ error: 'years required' });
  const result = assetManagement.calculateDepreciation(req.params.id, Number(years));
  if (!result) return res.status(404).json({ error: 'Not found or missing data' });
  res.json(result);
});
// Advanced: Assign asset
app.post('/v1/assets/:id/assign', (req, res) => {
  const { owner } = req.body;
  if (!owner) return res.status(400).json({ error: 'owner required' });
  const a = assetManagement.assignAsset(req.params.id, owner);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});
// Advanced: Add tag
app.post('/v1/assets/:id/tag', (req, res) => {
  const { tag } = req.body;
  if (!tag) return res.status(400).json({ error: 'tag required' });
  const a = assetManagement.addTag(req.params.id, tag);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});

const multiTenancy = new MultiTenancy();

// --- Multi-Tenancy Endpoints ---
app.get('/v1/tenants', (req, res) => {
  const { ownerId } = req.query;
  res.json(multiTenancy.listTenants(ownerId as string | undefined));
});
app.get('/v1/tenants/:id', (req, res) => {
  const t = multiTenancy.getTenant(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});
app.post('/v1/tenants', (req, res) => {
  try {
    const t = multiTenancy.createTenant(req.body);
    res.json(t);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/tenants/:id', (req, res) => {
  const t = multiTenancy.updateTenant(req.params.id, req.body);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});
app.delete('/v1/tenants/:id', (req, res) => {
  const ok = multiTenancy.deleteTenant(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
import { MaintenanceKnowledge } from './modules/maintenance-knowledge';

const maintenanceKnowledge = new MaintenanceKnowledge();

// --- Maintenance & AI-powered Knowledge Base Endpoints ---
// Maintenance tasks
app.get('/v1/maintenance/tasks', (req, res) => {
  res.json(maintenanceKnowledge.listTasks());
});
app.get('/v1/maintenance/tasks/:id', (req, res) => {
  const t = maintenanceKnowledge.getTask(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});
app.post('/v1/maintenance/tasks', (req, res) => {
  try {
    const t = maintenanceKnowledge.createTask(req.body);
    res.json(t);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/maintenance/tasks/:id', (req, res) => {
  const t = maintenanceKnowledge.updateTask(req.params.id, req.body);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});
app.delete('/v1/maintenance/tasks/:id', (req, res) => {
  const ok = maintenanceKnowledge.deleteTask(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
// Knowledge base
app.get('/v1/knowledge/articles', (req, res) => {
  res.json(maintenanceKnowledge.listArticles());
});
app.get('/v1/knowledge/articles/:id', (req, res) => {
  const a = maintenanceKnowledge.getArticle(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});
app.post('/v1/knowledge/articles', (req, res) => {
  try {
    const a = maintenanceKnowledge.createArticle(req.body);
    res.json(a);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/knowledge/articles/:id', (req, res) => {
  const a = maintenanceKnowledge.updateArticle(req.params.id, req.body);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});
app.delete('/v1/knowledge/articles/:id', (req, res) => {
  const ok = maintenanceKnowledge.deleteArticle(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
app.get('/v1/knowledge/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  res.json(maintenanceKnowledge.searchArticles(q as string));
});
import { Security } from './modules/security';

const security = new Security();

// --- Advanced Security Endpoints ---
// Encryption endpoints
app.post('/v1/security/encrypt', (req, res) => {
  const { text, key } = req.body;
  if (!text || !key) return res.status(400).json({ error: 'text and key required' });
  try {
    const result = security.encrypt(text, key);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/security/decrypt', (req, res) => {
  const { encrypted, key } = req.body;
  if (!encrypted || !key) return res.status(400).json({ error: 'encrypted and key required' });
  try {
    const result = security.decrypt(encrypted, key);
    res.json({ decrypted: result });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Threat monitoring endpoints
app.get('/v1/security/threats', (req, res) => {
  res.json(security.listThreatEvents());
});
app.post('/v1/security/threats', (req, res) => {
  try {
    const e = security.reportThreat(req.body);
    res.json(e);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/security/threats/:id/resolve', (req, res) => {
  const e = security.resolveThreat(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json(e);
});
import { Omnichannel } from './modules/omnichannel';

const omnichannel = new Omnichannel();

// --- Omnichannel Support Endpoints ---
app.get('/v1/omnichannel/messages', (req, res) => {
  const { channel } = req.query;
  res.json(omnichannel.listMessages(channel as any));
});
app.get('/v1/omnichannel/messages/:id', (req, res) => {
  const m = omnichannel.getMessage(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});
app.post('/v1/omnichannel/messages', (req, res) => {
  try {
    const m = omnichannel.receiveMessage(req.body);
    res.json(m);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/omnichannel/messages/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  const m = omnichannel.updateMessageStatus(req.params.id, status);
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});
import { ProjectManagement } from './modules/project-management';

const projectManagement = new ProjectManagement();

// --- Advanced Project Management Endpoints ---
app.get('/v1/projects', (req, res) => {
  const { ownerId } = req.query;
  res.json(projectManagement.listProjects(ownerId as string | undefined));
});
app.get('/v1/projects/:id', (req, res) => {
  const p = projectManagement.getProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});
app.post('/v1/projects', (req, res) => {
  try {
    const p = projectManagement.createProject(req.body);
    res.json(p);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/projects/:id', (req, res) => {
  const p = projectManagement.updateProject(req.params.id, req.body);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});
app.delete('/v1/meetings/:id', async (req, res) => {
  const meeting = meetingManager.getMeeting(req.params.id);
  const ok = meetingManager.deleteMeeting(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  // Remove Google Calendar events for all participants
  if (meeting && Array.isArray(meeting.participants)) {
    for (const userId of meeting.participants) {
      try {
        const eventId = getMeetingEventId(meeting.id, userId);
        if (eventId) {
          const token = getUserGoogleToken(userId);
          if (!token) continue;
          const oAuth2Client = getOAuth2Client(userId);
          const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
          await calendar.events.delete({ calendarId: 'primary', eventId });
        }
      } catch {}
    }
  }


  res.json({ ok: true });
});

const riskComplianceManager = new RiskComplianceManager();

// --- Advanced Risk and Compliance Management Endpoints ---
// Risk endpoints
app.get('/v1/risks', (req, res) => {
  const { ownerId } = req.query;
  res.json(riskComplianceManager.listRisks(ownerId as string | undefined));
});
app.get('/v1/risks/:id', (req, res) => {
  const r = riskComplianceManager.getRisk(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});
app.post('/v1/risks', (req, res) => {
  try {
    const r = riskComplianceManager.createRisk(req.body);
    res.json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/risks/:id', (req, res) => {
  const r = riskComplianceManager.updateRisk(req.params.id, req.body);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});
app.post('/v1/risks/:id/close', (req, res) => {
  const r = riskComplianceManager.closeRisk(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});
app.post('/v1/risks/:id/mitigate', (req, res) => {
  const { plan } = req.body;
  if (!plan) return res.status(400).json({ error: 'plan required' });
  const r = riskComplianceManager.mitigateRisk(req.params.id, plan);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});
// Compliance endpoints
app.get('/v1/compliance-checks', (req, res) => {
  res.json(riskComplianceManager.listComplianceChecks());
});
app.get('/v1/compliance-checks/:id', (req, res) => {
  const c = riskComplianceManager.getComplianceCheck(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});
app.post('/v1/compliance-checks', (req, res) => {
  try {
    const c = riskComplianceManager.createComplianceCheck(req.body);
    res.json(c);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/compliance-checks/:id', (req, res) => {
  const c = riskComplianceManager.updateComplianceCheck(req.params.id, req.body);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});
app.post('/v1/compliance-checks/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  const c = riskComplianceManager.setComplianceStatus(req.params.id, status);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});

// --- Interactive Dashboards Endpoints ---
app.get('/v1/dashboards', (req, res) => {
  const { userId } = req.query;
  res.json(dashboardManager.listDashboards(userId as string | undefined));
});
app.get('/v1/dashboards/:id', (req, res) => {
  const d = dashboardManager.getDashboard(req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  res.json(d);
});
app.post('/v1/dashboards', (req, res) => {
  try {
    const d = dashboardManager.createDashboard(req.body);
    res.json(d);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/dashboards/:id', (req, res) => {
  const d = dashboardManager.updateDashboard(req.params.id, req.body);
  if (!d) return res.status(404).json({ error: 'Not found' });
  res.json(d);
});
app.delete('/v1/dashboards/:id', (req, res) => {
  const ok = dashboardManager.deleteDashboard(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
// Widget management
app.post('/v1/dashboards/:id/widgets', (req, res) => {
  try {
    const w = dashboardManager.addWidget(req.params.id, req.body);
    if (!w) return res.status(404).json({ error: 'Dashboard not found' });
    res.json(w);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/dashboards/:dashboardId/widgets/:widgetId', (req, res) => {
  const w = dashboardManager.updateWidget(req.params.dashboardId, req.params.widgetId, req.body);
  if (!w) return res.status(404).json({ error: 'Not found' });
  res.json(w);
});
app.delete('/v1/dashboards/:dashboardId/widgets/:widgetId', (req, res) => {
  const ok = dashboardManager.removeWidget(req.params.dashboardId, req.params.widgetId);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
import { DocumentManager } from './modules/document-manager';

const documentManager = new DocumentManager();

// --- Advanced Document Management Endpoints ---
app.get('/v1/documents', (req, res) => {
  const { ownerId } = req.query;
  res.json(documentManager.listDocuments(ownerId as string | undefined));
});
app.get('/v1/documents/:id', (req, res) => {
  const d = documentManager.getDocument(req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  res.json(d);
});
app.post('/v1/documents', (req, res) => {
  try {
    const d = documentManager.createDocument(req.body);
    res.json(d);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/documents/:id', (req, res) => {
  const d = documentManager.updateDocument(req.params.id, req.body);
  if (!d) return res.status(404).json({ error: 'Not found' });
  res.json(d);
});
app.delete('/v1/documents/:id', (req, res) => {
  const ok = documentManager.deleteDocument(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
app.post('/v1/documents/:id/sign', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const d = documentManager.signDocument(req.params.id, userId);
  if (!d) return res.status(404).json({ error: 'Not found' });
  res.json(d);
});
app.get('/v1/documents/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  res.json(documentManager.searchDocuments(q as string));
});

// --- Advanced Notification Center Endpoints ---
app.get('/v1/notifications', (req, res) => {
  const { userId } = req.query;
  res.json(notificationCenter.listNotifications(userId as string | undefined));
});
app.post('/v1/notifications', (req, res) => {
  try {
    const notif = notificationCenter.sendNotification(req.body);
    res.json(notif);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/notifications/:id/resend', (req, res) => {
  const notif = notificationCenter.resendNotification(req.params.id);
  if (!notif) return res.status(404).json({ error: 'Not found' });
  res.json(notif);
});
import { AIAnalytics } from './modules/ai-analytics';

const aiAnalytics = new AIAnalytics();

// --- Predictive Analytics & AI Recommendations Endpoints ---
app.post('/v1/ai/predict', (req, res) => {
  try {
    const result = aiAnalytics.predict(req.body);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/ai/recommend', (req, res) => {
  try {
    const result = aiAnalytics.recommend(req.body);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
import { UserManagement } from './modules/user-management';

const userManagement = new UserManagement();

// --- Advanced User Management Endpoints ---
// User CRUD
app.get('/v1/users', (req, res) => {
  res.json(userManagement.listUsers());
});
app.get('/v1/users/:id', (req, res) => {
  const u = userManagement.getUser(req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  res.json(u);
});
app.post('/v1/users', (req, res) => {
  try {
    const u = userManagement.createUser(req.body);
    res.json(u);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/users/:id', (req, res) => {
  const u = userManagement.updateUser(req.params.id, req.body);
  if (!u) return res.status(404).json({ error: 'Not found' });
  res.json(u);
});
app.delete('/v1/users/:id', (req, res) => {
  const ok = userManagement.deleteUser(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
// Simulated SSO/OAuth2 login endpoint
app.post('/v1/auth/login', (req, res) => {
  const { username, provider } = req.body;
  // Simulate login (in real system, validate with provider)
  const user = userManagement.listUsers().find(u => u.username === username && (!provider || u.provider === provider));
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  user.lastLogin = new Date().toISOString();
  userManagement.logActivity(user.id, 'login', { provider });
  res.json({ ok: true, user });
});
// Activity log endpoints
app.get('/v1/activity-logs', (req, res) => {
  const { userId } = req.query;
  res.json(userManagement.listActivityLogs(userId as string | undefined));
});
import { ERPConnector } from './modules/erp-connector';

const erpConnector = new ERPConnector();

// --- ERP Integration Endpoints ---
// List ERP connections
// List ERP records (generic)
app.get('/v1/erp/:entity', async (req, res) => {
  try {
    const records = await erpConnector.fetchRecords(req.params.entity, req.query);
    res.json(records);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Create ERP record
app.post('/v1/erp/:entity', async (req, res) => {
  try {
    const record = await erpConnector.createRecord(req.params.entity, req.body);
    res.json(record);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Update ERP record
app.put('/v1/erp/:entity/:id', async (req, res) => {
  try {
    const record = await erpConnector.updateRecord(req.params.entity, req.params.id, req.body);
    res.json(record);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Delete ERP record
app.delete('/v1/erp/:entity/:id', async (req, res) => {
  try {
    const ok = await erpConnector.deleteRecord(req.params.entity, req.params.id);
    res.json({ ok });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// --- Advanced Workflow Automation Endpoints ---
// Workflow definitions
app.get('/v1/workflows', (req, res) => {
  res.json(workflowAutomation.listWorkflows());
});
app.get('/v1/workflows/:id', (req, res) => {
  const w = workflowAutomation.getWorkflow(req.params.id);
  if (!w) return res.status(404).json({ error: 'Not found' });
  res.json(w);
});
app.post('/v1/workflows', (req, res) => {
  try {
    const w = workflowAutomation.createWorkflow(req.body);
    res.json(w);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/workflows/:id', (req, res) => {
  const w = workflowAutomation.updateWorkflow(req.params.id, req.body);
  if (!w) return res.status(404).json({ error: 'Not found' });
  res.json(w);
});
app.delete('/v1/workflows/:id', (req, res) => {
  const ok = workflowAutomation.deleteWorkflow(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
// Workflow execution
app.post('/v1/workflows/:id/trigger', (req, res) => {
  const exec = workflowAutomation.triggerWorkflow(req.params.id);
  if (!exec) return res.status(404).json({ error: 'Not found or not enabled' });
  res.json(exec);
});
app.get('/v1/workflows/:id/executions', (req, res) => {
  res.json(workflowAutomation.listExecutions(req.params.id));
});
app.get('/v1/workflow-executions', (req, res) => {
  res.json(workflowAutomation.listExecutions());
});
import { Reporting } from './modules/reporting';

const reporting = new Reporting();

// --- Advanced Reporting & Export Endpoints ---
app.get('/v1/reports', (req, res) => {
  res.json(reporting.listReports());
});
app.get('/v1/reports/:id', (req, res) => {
  const r = reporting.getReport(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});
app.post('/v1/reports', (req, res) => {
  try {
    const r = reporting.createReport(req.body);
    res.json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/v1/reports/:id', (req, res) => {
  const ok = reporting.deleteReport(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
app.post('/v1/reports/:id/export', (req, res) => {
  const { format } = req.body;
  if (!format || !['pdf','csv','xlsx'].includes(format)) return res.status(400).json({ error: 'format required (pdf, csv, xlsx)' });
  const result = reporting.exportReport(req.params.id, format);
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(result);
});
app.post('/v1/reports/:id/schedule', (req, res) => {
  const { cron } = req.body;
  if (!cron) return res.status(400).json({ error: 'cron required' });
  const r = reporting.scheduleReport(req.params.id, cron);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});
import { PerformanceManager } from './modules/performance-manager';

const performanceManager = new PerformanceManager();

// --- Advanced Performance Management Endpoints ---
// KPI endpoints
app.get('/v1/performance/kpis', (req, res) => {
  res.json(performanceManager.listKPIs());
});
app.get('/v1/performance/kpis/:id', (req, res) => {
  const k = performanceManager.getKPI(req.params.id);
  if (!k) return res.status(404).json({ error: 'Not found' });
  res.json(k);
});
app.post('/v1/performance/kpis', (req, res) => {
  try {
    const k = performanceManager.createKPI(req.body);
    res.json(k);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/performance/kpis/:id', (req, res) => {
  const k = performanceManager.updateKPI(req.params.id, req.body);
  if (!k) return res.status(404).json({ error: 'Not found' });
  res.json(k);
});
app.delete('/v1/performance/kpis/:id', (req, res) => {
  const ok = performanceManager.deleteKPI(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
// Performance records endpoints
app.get('/v1/performance/records', (req, res) => {
  const { userId } = req.query;
  res.json(performanceManager.listPerformance(userId as string | undefined));
});
app.post('/v1/performance/records', (req, res) => {
  try {
    const rec = performanceManager.addPerformanceRecord(req.body);
    res.json(rec);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Goals endpoints
app.get('/v1/performance/goals', (req, res) => {
  const { userId } = req.query;
  res.json(performanceManager.listGoals(userId as string | undefined));
});
app.post('/v1/performance/goals', (req, res) => {
  try {
    const g = performanceManager.createGoal(req.body);
    res.json(g);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/performance/goals/:id', (req, res) => {
  const g = performanceManager.updateGoal(req.params.id, req.body);
  if (!g) return res.status(404).json({ error: 'Not found' });
  res.json(g);
});
app.delete('/v1/performance/goals/:id', (req, res) => {
  const ok = performanceManager.deleteGoal(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
import { ContractManager } from './modules/contract-manager';
import './modules/contract-smart-alerts-scheduler';

const contractManager = new ContractManager();

// --- Advanced Contract Management Endpoints ---
app.get('/v1/contracts', (req, res) => {
  res.json(contractManager.listContracts());
});
app.get('/v1/contracts/:id', (req, res) => {
  const c = contractManager.getContract(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});
app.post('/v1/contracts', (req, res) => {
  try {
    const c = contractManager.createContract(req.body);
    res.json(c);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/contracts/:id', (req, res) => {
  const c = contractManager.updateContract(req.params.id, req.body);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});
app.delete('/v1/contracts/:id', (req, res) => {
  const ok = contractManager.deleteContract(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
app.post('/v1/contracts/:id/renew', (req, res) => {
  const { newEndDate } = req.body;
  if (!newEndDate) return res.status(400).json({ error: 'newEndDate required' });
  const c = contractManager.renewContract(req.params.id, newEndDate);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});
app.post('/v1/contracts/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  const c = contractManager.setStatus(req.params.id, status);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});

import { I18nManager } from './modules/i18n';
import { rbacApi, requirePermission } from './modules/rbac';

// --- Export Contracts Endpoints ---
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';


// استيراد العقود من ملف Excel أو JSON
app.post('/v1/contracts/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
  const ext = req.file.originalname.split('.').pop()?.toLowerCase();
  let contracts = [];
  try {
    if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      contracts = XLSX.utils.sheet_to_json(sheet);
    } else if (ext === 'json') {
      const raw = fs.readFileSync(req.file.path, 'utf-8');
      contracts = JSON.parse(raw);
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'صيغة ملف غير مدعومة (فقط Excel أو JSON)' });
    }
    let imported = 0;
    contracts.forEach((c: any) => {
      // تحقق من الحقول الأساسية
      if (c.title && c.parties && c.startDate && c.endDate && c.value && c.terms) {
        contractManager.createContract({
          title: c.title,
          parties: Array.isArray(c.parties) ? c.parties : String(c.parties).split(/[,،]/).map((p:string)=>p.trim()),
          startDate: c.startDate,
          endDate: c.endDate,
          value: Number(c.value),
          terms: c.terms,
          status: c.status || 'pending',
          ownerId: c.ownerId,
          metadata: c.metadata || {},
        });
        imported++;
      }
    });
    fs.unlinkSync(req.file.path);
    res.json({ imported, total: contracts.length });
  } catch (e) {
    fs.unlinkSync(req.file.path);
    const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e);
    res.status(500).json({ error: 'فشل الاستيراد', details: msg });
  }
});


// تصدير العقود مع دعم الفلترة (Excel/JSON/PDF)
function filterContracts(contracts: any[], query: Record<string, any>) {
  let filtered = contracts;
  if (query.status) filtered = filtered.filter((c: any) => c.status === query.status);
  if (query.ownerId) filtered = filtered.filter((c: any) => c.ownerId === query.ownerId);
  if (query.startDate) filtered = filtered.filter((c: any) => c.startDate >= query.startDate);
  if (query.endDate) filtered = filtered.filter((c: any) => c.endDate <= query.endDate);
  return filtered;
}

app.get('/v1/contracts/export/excel', (req, res) => {
  let contracts = contractManager.listContracts();
  contracts = filterContracts(contracts, req.query);
  const ws = XLSX.utils.json_to_sheet(contracts);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contracts');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=contracts_export.xlsx');
  res.end(buf);
});

app.get('/v1/contracts/export/json', (req, res) => {
  let contracts = contractManager.listContracts();
  contracts = filterContracts(contracts, req.query);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=contracts_export.json');
  res.end(JSON.stringify(contracts, null, 2));
});

app.get('/v1/contracts/export/pdf', (req, res) => {
  let contracts = contractManager.listContracts();
  contracts = filterContracts(contracts, req.query);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(16);
  doc.text('تقرير العقود', 14, 15);
  doc.setFontSize(10);
  doc.text(`عدد العقود: ${contracts.length}`, 14, 22);
  const columns = [
    { header: 'المعرف', dataKey: 'id' },
    { header: 'العنوان', dataKey: 'title' },
    { header: 'الأطراف', dataKey: 'parties' },
    { header: 'تاريخ البدء', dataKey: 'startDate' },
    { header: 'تاريخ الانتهاء', dataKey: 'endDate' },
    { header: 'القيمة', dataKey: 'value' },
    { header: 'الحالة', dataKey: 'status' },
  ];
  const rows = contracts.map((c: any) => ({
    id: c.id,
    title: c.title,
    parties: Array.isArray(c.parties) ? c.parties.join(', ') : '',
    startDate: c.startDate,
    endDate: c.endDate,
    value: c.value,
    status: c.status,
  }));
  // Fix: Use Record<string, any> for row and column mapping
  (doc as any).autoTable({
    head: [columns.map(col => col.header)],
    body: rows.map(row => columns.map(col => (row as Record<string, any>)[col.dataKey])),
    startY: 28,
    styles: { fontSize: 9, cellPadding: 3, halign: 'center', valign: 'middle' },
    headStyles: { fillColor: [102, 126, 234], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [248, 249, 255] },
    margin: { top: 30, right: 14, bottom: 14, left: 14 },
    theme: 'grid',
  });
  const pdfBuf = doc.output('arraybuffer');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=contracts_export.pdf');
  res.end(Buffer.from(pdfBuf));
});

const i18nManager = new I18nManager();
// --- Advanced RBAC (Role-Based Access Control) Endpoints ---
// Add role to user
app.post('/v1/rbac/users/:userId/roles', (req, res) => {
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'role required' });
  rbacApi.addRoleToUser(req.params.userId, role);
  res.json({ ok: true });
});
// Remove role from user
app.delete('/v1/rbac/users/:userId/roles/:role', (req, res) => {
  rbacApi.removeRoleFromUser(req.params.userId, req.params.role);
  res.json({ ok: true });
});
// Set policy for a role
app.post('/v1/rbac/policies', (req, res) => {
  const { role, permissions } = req.body;
  if (!role || !Array.isArray(permissions)) return res.status(400).json({ error: 'role and permissions required' });
  rbacApi.setPolicy(role, permissions);
  res.json({ ok: true });
});
// Get user roles
app.get('/v1/rbac/users/:userId/roles', (req, res) => {
  res.json({ roles: rbacApi.getUserRoles(req.params.userId) });
});
// Get role permissions
app.get('/v1/rbac/roles/:role/permissions', (req, res) => {
  res.json({ permissions: rbacApi.getRolePermissions(req.params.role) });
});
// Check permission for user
app.get('/v1/rbac/users/:userId/permissions/check', (req, res) => {
  const { resource, action } = req.query;
  if (!resource || !action) return res.status(400).json({ error: 'resource and action required' });
  const allowed = rbacApi.checkPermission(req.params.userId, resource as string, action as string);
  res.json({ allowed });
});
// Example: Protect a route with RBAC
// app.get('/v1/secure-data', requirePermission('secure-data', 'read'), (req, res) => {
//   res.json({ secret: 'RBAC protected data' });
// });

// Multilingual (i18n) & Dynamic Translation Endpoints
app.post('/v1/i18n/translate', (req, res) => {
  try {
    const { key, lang, value } = req.body;
    if (!key || !lang || !value) return res.status(400).json({ error: 'key, lang, and value required' });
    const entry = i18nManager.addTranslation(key, lang, value);
    res.json(entry);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/i18n/translate', (req, res) => {
  const { key, lang } = req.query;
  if (!key || !lang) return res.status(400).json({ error: 'key and lang required' });
  res.json({ value: i18nManager.translate(key as string, lang as string) });
});
app.get('/v1/i18n/translations', (req, res) => {
  const { lang } = req.query;
  res.json(i18nManager.listTranslations(lang as string | undefined));
});
app.get('/v1/i18n/langs', (req, res) => {
  res.json(i18nManager.listSupportedLangs());
});
import { BIReports } from './modules/bi-reports';

const biReports = new BIReports();

// Advanced BI & Interactive Reporting Endpoints
app.post('/v1/bi/reports', (req, res) => {
  try {
    const { title, type, data } = req.body;
    if (!title || !type || !data) return res.status(400).json({ error: 'title, type, and data required' });
    const r = biReports.createReport(title, type, data);
    res.json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/bi/reports', (req, res) => {
  res.json(biReports.listReports());
});
app.get('/v1/bi/reports/:id', (req, res) => {
  const r = biReports.getReport(req.params.id);
  if (r) res.json(r);
  else res.status(404).json({ error: 'Not found' });
});
import { ComplianceManager } from './modules/compliance-manager';

const complianceManager = new ComplianceManager();

// Advanced Compliance & Policy Management Endpoints
app.post('/v1/policies', (req, res) => {
  try {
    const p = complianceManager.addPolicy(req.body);
    res.json(p);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.put('/v1/policies/:id', (req, res) => {
  try {
    const p = complianceManager.updatePolicy(req.params.id, req.body);
    if (p) res.json(p);
    else res.status(404).json({ error: 'Policy not found' });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/policies', (req, res) => {
  res.json(complianceManager.listPolicies());
});
app.post('/v1/audits', (req, res) => {
  try {
    const a = complianceManager.addAudit(req.body);
    res.json(a);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/audits', (req, res) => {
  const { projectId } = req.query;
  res.json(complianceManager.listAudits(projectId as string | undefined));
});

// Advanced Project API/Webhook Integration Endpoints
app.post('/v1/webhooks', (req, res) => {
  try {
    const { event, url } = req.body;
    if (!event || !url) return res.status(400).json({ error: 'event and url required' });
    const sub = WebhookManager.subscribe(event, url);
    res.json(sub);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/v1/webhooks/:id', (req, res) => {
  const ok = WebhookManager.unsubscribe(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ ok: true });
});
app.get('/v1/webhooks', (req, res) => {
  const { event } = req.query;
  res.json(WebhookManager.getHooks(event as string));
});

// Advanced AI-Driven Recommendations & Insights Endpoints
app.post('/v1/projects/:projectId/recommendations', (req, res) => {
  try {
    const project = projectManager.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const tasks = projectManager.listTasks(project.id);
    const risks = riskManager.listRisks(project.id);
    const resources = resourceManager.listResources();
    // fallback: just return all tasks, risks, resources for now
    res.json({ tasks, risks, resources });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/recommendations', (req, res) => {
  // fallback: return empty array or static recommendations
  res.json([]);
});
// Duplicate import removed

const notificationEngine = new NotificationEngine();

// Advanced Notification & Escalation Endpoints
app.post('/v1/notifications', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    await smartNotifier.notifyAll(message);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/notifications', (req, res) => {
  // No notification history implemented
  res.json([]);
});
app.get('/v1/notifications/:id', (req, res) => {
  // No notification details implemented
  res.status(404).json({ error: 'Not found' });
});
app.post('/v1/escalation-rules', (req, res) => {
  try {
    const r = notificationEngine.addEscalationRule(req.body);
    res.json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/escalation-rules', (req, res) => {
  res.json(notificationEngine.listEscalationRules());
});
app.post('/v1/escalate', (req, res) => {
  try {
    const { trigger } = req.body;
    if (!trigger) return res.status(400).json({ error: 'trigger required' });
    const sent = notificationEngine.triggerEscalation(trigger);
    res.json(sent);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Duplicate import removed

const auditTrail = new AuditTrail();

// Advanced Project Audit Trail & Reporting Endpoints
// AuditTrail fallback: not implemented, return 501
app.post('/v1/audit', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});
app.get('/v1/audit', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});
app.get('/v1/audit/:id', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});
import { FinanceManager } from './modules/finance-manager';

const financeManager = new FinanceManager();

// Advanced Project Financial Management Endpoints
app.post('/v1/projects/:projectId/budget', (req, res) => {
  try {
    const b = financeManager.setBudget({ ...req.body, projectId: req.params.projectId });
    res.json(b);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/projects/:projectId/expense', (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number') return res.status(400).json({ error: 'amount required' });
    const ok = financeManager.addExpense(req.params.projectId, amount);
    if (!ok) return res.status(404).json({ error: 'Budget not found' });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/projects/:projectId/forecast', (req, res) => {
  try {
    const { forecast } = req.body;
    if (typeof forecast !== 'number') return res.status(400).json({ error: 'forecast required' });
    const ok = financeManager.updateForecast(req.params.projectId, forecast);
    if (!ok) return res.status(404).json({ error: 'Budget not found' });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/projects/:projectId/budget', (req, res) => {
  const b = financeManager.getBudget(req.params.projectId);
  if (b) res.json(b);
  else res.status(404).json({ error: 'Not found' });
});
app.get('/v1/budgets', (req, res) => {
  res.json(financeManager.listBudgets());
});

// Advanced Risk Management Endpoints
app.post('/v1/risks', (req, res) => {
  try {
    const r = riskManager.addRisk(req.body);
    res.json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/risks', (req, res) => {
  res.json(riskManager.listRisks());
});
app.get('/v1/projects/:projectId/risks', (req, res) => {
  res.json(riskManager.listRisks(req.params.projectId));
});
app.get('/v1/risks/:id', (req, res) => {
  const r = riskManager.getRisk(req.params.id);
  if (r) res.json(r);
  else res.status(404).json({ error: 'Not found' });
});
app.post('/v1/risks/:id/mitigate', (req, res) => {
  const ok = riskManager.mitigateRisk(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Risk not found or not open' });
  res.json({ ok: true });
});
app.post('/v1/risks/:id/close', (req, res) => {
  const ok = riskManager.closeRisk(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Risk not found or not open/mitigated' });
  res.json({ ok: true });
});

// Advanced Resource Management Endpoints
app.post('/v1/resources', (req, res) => {
  try {
    const r = resourceManager.createResource(req.body);
    res.json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/resources', (req, res) => {
  res.json(resourceManager.listResources());
});
app.get('/v1/resources/:id', (req, res) => {
  const r = resourceManager.getResource(req.params.id);
  if (r) res.json(r);
  else res.status(404).json({ error: 'Not found' });
});
app.post('/v1/resources/:id/assign-task', (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ error: 'taskId required' });
    const task = projectManager.getTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const ok = resourceManager.assignTask(req.params.id, task);
    if (!ok) return res.status(404).json({ error: 'Resource not found' });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/resources/:id/unassign-task', (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ error: 'taskId required' });
    const ok = resourceManager.unassignTask(req.params.id, taskId);
    if (!ok) return res.status(404).json({ error: 'Resource not found' });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/resources/optimize', (req, res) => {
  try {
    resourceManager.optimizeWorkload();
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// (already imported and declared above)
import { PortfolioManager } from './modules/portfolio-manager';
import { SmartProjectManager } from './modules/smart-project-manager';
const projectManager = new SmartProjectManager();
const portfolioManager = new PortfolioManager(projectManager);

// Project Portfolio Management Endpoints
app.post('/v1/portfolios', (req, res) => {
  try {
    const p = portfolioManager.createPortfolio(req.body);
    res.json(p);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/portfolios', (req, res) => {
  res.json(portfolioManager.listPortfolios());
});
app.get('/v1/portfolios/:id', (req, res) => {
  const p = portfolioManager.getPortfolio(req.params.id);
  if (p) res.json(p);
  else res.status(404).json({ error: 'Not found' });
});
app.post('/v1/portfolios/:id/add-project', (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const ok = portfolioManager.addProjectToPortfolio(req.params.id, projectId);
    if (!ok) return res.status(404).json({ error: 'Portfolio or Project not found' });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/portfolios/:id/remove-project', (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const ok = portfolioManager.removeProjectFromPortfolio(req.params.id, projectId);
    if (!ok) return res.status(404).json({ error: 'Portfolio not found' });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/portfolios/:id/projects', (req, res) => {
  try {
    const projects = portfolioManager.listProjectsInPortfolio(req.params.id);
    res.json(projects);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
import { ProjectImportExport } from './modules/project-import-export';
import { FileManager } from './modules/file-manager';
import { SmartTicketing } from './modules/smart-ticketing';
const fileManager = new FileManager();
const ticketing = new SmartTicketing();
const projectImportExport = new ProjectImportExport(projectManager, ticketing, fileManager);
// Project Import/Export Endpoints
app.post('/v1/projects/import', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: 'path required' });
    const result = await projectImportExport.importAll(path);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/projects/export', async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: 'path required' });
    await projectImportExport.exportAll(path);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// Project-Ticket Linking Endpoints
app.post('/v1/projects/:projectId/link-ticket', (req, res) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ error: 'ticketId required' });
    const ok = projectImportExport.linkProjectToTicket(req.params.projectId, ticketId);
    if (!ok) return res.status(404).json({ error: 'Project or Ticket not found' });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/projects/:projectId/tickets', (req, res) => {
  try {
    const tickets = projectImportExport.listProjectTickets(req.params.projectId);
    res.json(tickets);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/tickets/:ticketId/projects', (req, res) => {
  try {
    const projects = projectImportExport.listTicketProjects(req.params.ticketId);
    res.json(projects);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
import { ProjectDashboard } from './modules/project-dashboard';
const projectDashboard = new ProjectDashboard();
// Project Dashboard & Reporting Endpoint
app.get('/v1/projects/:id/dashboard', (req, res) => {
  const p = projectManager.getProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const tasks = projectManager.listTasks(p.id);
  const milestones = projectManager.listMilestones(p.id);
  const events = projectCalendar.listEvents(p.id);
  const resources = projectCalendar.listResources(p.id);
  res.json(projectDashboard.getReport(p, tasks, milestones, events, resources));
});
import { ProjectDocsKB } from './modules/project-docs-kb';
const projectDocsKB = new ProjectDocsKB();
// Project Document Management & Knowledge Base Endpoints
app.post('/v1/projects/:projectId/docs', (req, res) => {
  try {
    const d = projectDocsKB.addDoc({ ...req.body, projectId: req.params.projectId });
    res.json(d);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/projects/:projectId/docs', (req, res) => {
  res.json(projectDocsKB.listDocs(req.params.projectId));
});
app.delete('/v1/docs/:id', (req, res) => {
  projectDocsKB.removeDoc(req.params.id);
  res.json({ ok: true });
});
app.post('/v1/projects/:projectId/kb', (req, res) => {
  try {
    const e = projectDocsKB.addKB({ ...req.body, projectId: req.params.projectId });
    res.json(e);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/projects/:projectId/kb', (req, res) => {
  res.json(projectDocsKB.listKB(req.params.projectId));
});
app.delete('/v1/kb/:id', (req, res) => {
  projectDocsKB.removeKB(req.params.id);
  res.json({ ok: true });
});
import { ProjectCalendar } from './modules/project-calendar';
const projectCalendar = new ProjectCalendar();
// Project Calendar, Meetings, and Resource Allocation Endpoints
app.post('/v1/projects/:projectId/events', (req, res) => {
  try {
    const e = projectCalendar.addEvent({ ...req.body, projectId: req.params.projectId });
    res.json(e);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/projects/:projectId/events', (req, res) => {
  res.json(projectCalendar.listEvents(req.params.projectId));
});
app.delete('/v1/events/:id', (req, res) => {
  projectCalendar.removeEvent(req.params.id);
  res.json({ ok: true });
});
app.post('/v1/projects/:projectId/resources', (req, res) => {
  try {
    const r = projectCalendar.addResource({ ...req.body, projectId: req.params.projectId });
    res.json(r);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/projects/:projectId/resources', (req, res) => {
  res.json(projectCalendar.listResources(req.params.projectId));
});
app.delete('/v1/resources/:id', (req, res) => {
  projectCalendar.removeResource(req.params.id);
  res.json({ ok: true });
});
import { ProjectCollab } from './modules/project-collab';
const projectCollab = new ProjectCollab();
// Project Collaboration, Chat, and Notifications Endpoints
app.post('/v1/projects/:projectId/chat', (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) return res.status(400).json({ error: 'userId and message required' });
    const m = projectCollab.postMessage(req.params.projectId, userId, message);
    res.json(m);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/projects/:projectId/chat', (req, res) => {
  res.json(projectCollab.listMessages(req.params.projectId));
});
app.post('/v1/projects/:projectId/notify', (req, res) => {
  try {
    const { userId, type, content } = req.body;
    if (!userId || !type || !content) return res.status(400).json({ error: 'userId, type, content required' });
    const n = projectCollab.notify(req.params.projectId, userId, type, content);
    res.json(n);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/users/:userId/notifications', (req, res) => {
  res.json(projectCollab.listNotifications(req.params.userId));
});
app.post('/v1/notifications/:id/read', (req, res) => {
  const ok = projectCollab.markRead(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Notification not found' });
  res.json({ ok: true });
});
import { ProjectAnalyzer } from './modules/project-analyzer';
const projectAnalyzer = new ProjectAnalyzer();
// Project Analytics & Risk Detection Endpoint
app.get('/v1/projects/:id/analytics', (req, res) => {
  const p = projectManager.getProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const tasks = projectManager.listTasks(p.id);
  const milestones = projectManager.listMilestones(p.id);
  res.json(projectAnalyzer.analyze(p, tasks, milestones));
});
// Project Task Dependencies Endpoints
app.post('/v1/tasks/:id/dependencies', (req, res) => {
  try {
    const { dependencyId } = req.body;
    const t = projectManager.getTask(req.params.id);
    if (!t) return res.status(404).json({ error: 'Task not found' });
    if (!dependencyId) return res.status(400).json({ error: 'dependencyId required' });
    if (!t.dependencies.includes(dependencyId)) t.dependencies.push(dependencyId);
    res.json({ ok: true, dependencies: t.dependencies });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/v1/tasks/:id/dependencies/:dependencyId', (req, res) => {
  try {
    const t = projectManager.getTask(req.params.id);
    if (!t) return res.status(404).json({ error: 'Task not found' });
    t.dependencies = t.dependencies.filter(d => d !== req.params.dependencyId);
    res.json({ ok: true, dependencies: t.dependencies });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/tasks/:id/dependencies', (req, res) => {
  const t = projectManager.getTask(req.params.id);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  res.json({ dependencies: t.dependencies });
});
// (already imported and declared above)
// Smart Project Management Endpoints
// Projects
app.post('/v1/projects', (req, res) => {
  try {
    const p = projectManager.createProject(req.body);
    res.json(p);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/projects', (req, res) => {
  res.json(projectManager.listProjects());
});
app.get('/v1/projects/:id', (req, res) => {
  const p = projectManager.getProject(req.params.id);
  if (p) res.json(p);
  else res.status(404).json({ error: 'Not found' });
});
app.put('/v1/projects/:id', (req, res) => {
  try {
    const p = projectManager.updateProject(req.params.id, req.body);
    if (p) res.json(p);
    else res.status(404).json({ error: 'Not found' });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Tasks
app.post('/v1/projects/:projectId/tasks', (req, res) => {
  try {
    const t = projectManager.createTask({ ...req.body, projectId: req.params.projectId });
    res.json(t);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/projects/:projectId/tasks', (req, res) => {
  res.json(projectManager.listTasks(req.params.projectId));
});
app.get('/v1/tasks/:id', (req, res) => {
  const t = projectManager.getTask(req.params.id);
  if (t) res.json(t);
  else res.status(404).json({ error: 'Not found' });
});
app.put('/v1/tasks/:id', (req, res) => {
  try {
    const t = projectManager.updateTask(req.params.id, req.body);
    if (t) res.json(t);
    else res.status(404).json({ error: 'Not found' });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Milestones
app.post('/v1/projects/:projectId/milestones', (req, res) => {
  try {
    const m = projectManager.createMilestone({ ...req.body, projectId: req.params.projectId });
    res.json(m);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/projects/:projectId/milestones', (req, res) => {
  res.json(projectManager.listMilestones(req.params.projectId));
});
app.get('/v1/milestones/:id', (req, res) => {
  const m = projectManager.getMilestone(req.params.id);
  if (m) res.json(m);
  else res.status(404).json({ error: 'Not found' });
});
app.put('/v1/milestones/:id', (req, res) => {
  try {
    const m = projectManager.updateMilestone(req.params.id, req.body);
    if (m) res.json(m);
    else res.status(404).json({ error: 'Not found' });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
import { MeetingScheduler } from './modules/meeting-scheduler';
const meetingScheduler = new MeetingScheduler();
// Calendar & Meeting Scheduling Endpoints
app.post('/v1/meetings', (req, res) => {
  try {
    const m = meetingScheduler.schedule(req.body);
    res.json(m);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/meetings', (req, res) => {
  // Fix: Ensure ticketId is string or undefined
  let ticketId: string | undefined = undefined;
  if (typeof req.query.ticketId === 'string') ticketId = req.query.ticketId;
  else if (Array.isArray(req.query.ticketId)) ticketId = String(req.query.ticketId[0]);
  res.json(meetingScheduler.list(ticketId));
});
app.delete('/v1/meetings/:id', (req, res) => {
  const ok = meetingScheduler.cancel(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Meeting not found' });
  res.json({ ok: true });
});
// Knowledge Base Feedback & Rating Endpoints
app.post('/v1/kb/:id/feedback', (req, res) => {
  try {
    const { userId, rating, comment } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    // Fix: Use public proxy method for feedback
    const ok = ticketing.addKnowledgeFeedback(req.params.id, userId, rating, comment);
    if (!ok) return res.status(404).json({ error: 'Entry not found' });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/kb/:id/feedback', (req, res) => {
  // Fix: Use public proxy method for feedback
  res.json(ticketing.getKnowledgeFeedback(req.params.id));
});
// Ticket Merging, Splitting, Linking Endpoints
app.post('/v1/tickets/link', (req, res) => {
  try {
    const { id1, id2 } = req.body;
    if (!id1 || !id2) return res.status(400).json({ error: 'id1 and id2 required' });
    const ok = ticketing.linkTickets(id1, id2);
    if (!ok) return res.status(404).json({ error: 'Ticket(s) not found' });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/tickets/merge', (req, res) => {
  try {
    const { targetId, sourceId } = req.body;
    if (!targetId || !sourceId) return res.status(400).json({ error: 'targetId and sourceId required' });
    const ok = ticketing.mergeTickets(targetId, sourceId);
    if (!ok) return res.status(404).json({ error: 'Ticket(s) not found' });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/tickets/split', (req, res) => {
  try {
    const { id, interactionIds } = req.body;
    if (!id || !Array.isArray(interactionIds)) return res.status(400).json({ error: 'id and interactionIds required' });
    const newTicket = ticketing.splitTicket(id, interactionIds);
    if (!newTicket) return res.status(404).json({ error: 'Ticket or interactions not found' });
    res.json(newTicket);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Export/Import Endpoints for Tickets and Analytics
app.get('/v1/export/tickets', (req, res) => {
  res.json({ tickets: ticketing.listTickets() });
});
app.post('/v1/import/tickets', (req, res) => {
  try {
    const { tickets } = req.body;
    if (!Array.isArray(tickets)) return res.status(400).json({ error: 'tickets array required' });
    let count = 0;
    for (const t of tickets) {
      // Only import if not exists
      if (!ticketing.getTicket(t.id)) {
        ticketing["tickets"].push(t); count++;
      }
    }
    res.json({ imported: count });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/export/analytics', (req, res) => {
  res.json({
    dashboard: dashboardReporter.getReport(),
    sentiment: ticketSentiment.getTrends(ticketing.listTickets())
  });
});
import { TicketSentiment } from './modules/ticket-sentiment';
const ticketSentiment = new TicketSentiment();
// Ticket Sentiment Analysis & Trends Endpoints
app.post('/v1/tickets/sentiment', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    res.json({ sentiment: ticketSentiment.analyze(text) });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/tickets/:id/sentiment', (req, res) => {
  const ticket = ticketing.getTicket(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not found' });
  res.json({ sentiment: ticketSentiment.analyzeTicket(ticket) });
});
app.get('/v1/tickets/sentiment/trends', (req, res) => {
  res.json(ticketSentiment.getTrends(ticketing.listTickets()));
});
import { SLAManager } from './modules/sla-manager';
const slaManager = new SLAManager();
// SLA Management & Breach Alerts Endpoints
app.post('/v1/sla/rule', (req, res) => {
  try {
    const rule = slaManager.addRule(req.body);
    res.json(rule);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/v1/sla/rule/:id', (req, res) => {
  try {
    slaManager.removeRule(req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/sla/rules', (req, res) => {
  res.json(slaManager.listRules());
});
app.post('/v1/sla/check', (req, res) => {
  try {
    slaManager.checkBreaches(ticketing.listTickets());
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/sla/breaches', (req, res) => {
  res.json(slaManager.listBreaches());
});
import { TicketI18n } from './modules/ticket-i18n';
const ticketI18n = new TicketI18n();
// i18n (Internationalization) Endpoints
app.post('/v1/i18n/translate', (req, res) => {
  try {
    const { key, lang } = req.body;
    if (!key || !lang) return res.status(400).json({ error: 'key and lang required' });
    res.json({ translation: ticketI18n.translate(key, lang) });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/i18n/entry', (req, res) => {
  try {
    ticketI18n.addEntry(req.body);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/i18n/entries', (req, res) => {
  res.json(ticketI18n.listEntries());
});
import { NotificationPreferencesManager } from './modules/notification-preferences';
const notificationPrefs = new NotificationPreferencesManager();
// Advanced User Notification Preferences Endpoints
app.post('/v1/users/:id/notifications', (req, res) => {
  try {
    const pref = notificationPrefs.setPreference({ userId: req.params.id, ...req.body });
    res.json(pref);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/users/:id/notifications', (req, res) => {
  const pref = notificationPrefs.getPreference(req.params.id);
  if (pref) res.json(pref);
  else res.status(404).json({ error: 'Not found' });
});
app.get('/v1/users/notifications/all', (req, res) => {
  res.json(notificationPrefs.listPreferences());
});
import { ExternalIntegrations } from './modules/external-integrations';
const externalIntegrations = new ExternalIntegrations();
// External Integrations Endpoints
app.post('/v1/integrations', (req, res) => {
  try {
    const integration = externalIntegrations.addIntegration(req.body);
    res.json(integration);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/v1/integrations/:id', (req, res) => {
  try {
    externalIntegrations.removeIntegration(req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/integrations', (req, res) => {
  res.json(externalIntegrations.listIntegrations());
});
app.post('/v1/integrations/:id/enabled', (req, res) => {
  try {
    externalIntegrations.setEnabled(req.params.id, !!req.body.enabled);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/integrations/send', (req, res) => {
  try {
    const { type, ticket } = req.body;
    const result = externalIntegrations.sendTicket(type, ticket);
    res.json(result);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
import { DashboardReporter } from './modules/dashboard-reporter';
// Removed incorrect import of ticketSurveyManager (no such export)
const dashboardReporter = new DashboardReporter(
  () => ticketing.listTickets(),
  () => ticketSurveyManager.getAllSurveys()
);
// Advanced Dashboard Report Endpoint
app.get('/v1/dashboard/report', (req, res) => {
  res.json(dashboardReporter.getReport());
});
// Ticket Workflow Automation Endpoints
app.post('/v1/tickets/workflow', (req, res) => {
  try {
    const { name, description, condition, action, enabled } = req.body;
    // condition/action are JS function strings: 'ticket => ...'
    // eslint-disable-next-line no-new-func
    const condFn = (new Function('ticket', `return (${condition})(ticket);`)) as (ticket: any) => boolean;
    // eslint-disable-next-line no-new-func
    const actFn = (new Function('ticket', `return (${action})(ticket);`)) as (ticket: any) => void;
    const rule = ticketing.addWorkflowRule({ name, description, condition: condFn, action: actFn, enabled });
    res.json(rule);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/v1/tickets/workflow/:id', (req, res) => {
  try {
    ticketing.removeWorkflowRule(req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/tickets/workflow', (req, res) => {
  res.json(ticketing.listWorkflowRules());
});
import { TicketSurveyManager } from './modules/ticket-survey';
const ticketSurveyManager = new TicketSurveyManager();
// Customer Satisfaction Survey Endpoints
app.post('/v1/tickets/:id/survey', (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating 1-5 required' });
    const survey = ticketSurveyManager.submitSurvey(req.params.id, rating, comment);
    res.json(survey);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/tickets/:id/surveys', (req, res) => {
  res.json(ticketSurveyManager.getSurveysForTicket(req.params.id));
});
app.get('/v1/tickets/surveys/all', (req, res) => {
  res.json(ticketSurveyManager.getAllSurveys());
});
// Ticket Knowledge Base Suggestion Endpoint
app.post('/v1/tickets/suggest', (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'title and description required' });
    const suggestions = ticketing.suggestKnowledge({ title, description, category });
    res.json({ suggestions });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
import { AITicketClassifier } from './modules/ai-ticket-classifier';
const aiClassifier = new AITicketClassifier();
// AI Ticket Classification Endpoint
app.post('/v1/tickets/classify', (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'title and description required' });
    const category = aiClassifier.classify({ title, description });
    res.json({ category });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Duplicate import removed
const ticketAnalytics = new TicketAnalytics(() => ticketing.listTickets());
// Ticket Analytics Endpoints
app.get('/v1/tickets/analytics/summary', (req, res) => {
  res.json(ticketAnalytics.getSummary());
});
// Smart Ticketing Integration Endpoints
app.post('/v1/tickets/integration', (req, res) => {
  try {
    const dest = ticketing.addIntegration(req.body);
    res.json(dest);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/v1/tickets/integration/:id', (req, res) => {
  try {
    ticketing.removeIntegration(req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/tickets/integrations', (req, res) => {
  res.json(ticketing.listIntegrations());
});
app.post('/v1/tickets/integration/:id/enabled', (req, res) => {
  try {
    ticketing.setIntegrationEnabled(req.params.id, !!req.body.enabled);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
// Smart Ticketing Auto-Reply & Escalation Rules Endpoints
app.post('/v1/tickets/auto-reply', (req, res) => {
  try {
    const rule = ticketing.addAutoReplyRule(req.body);
    res.json(rule);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/v1/tickets/auto-reply/:id', (req, res) => {
  try {
    ticketing.removeAutoReplyRule(req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/tickets/auto-reply', (req, res) => {
  res.json(ticketing.listAutoReplyRules());
});
app.post('/v1/tickets/escalation', (req, res) => {
  try {
    const rule = ticketing.addEscalationRule(req.body);
    res.json(rule);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/v1/tickets/escalation/:id', (req, res) => {
  try {
    ticketing.removeEscalationRule(req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/tickets/escalation', (req, res) => {
  res.json(ticketing.listEscalationRules());
});
// (deduped above)
// Smart Ticketing & Support Endpoints
app.post('/v1/tickets', (req, res) => {
  try {
    const ticket = ticketing.createTicket(req.body);
    res.json(ticket);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/tickets', (req, res) => {
  res.json(ticketing.listTickets(req.query));
});
app.get('/v1/tickets/:id', (req, res) => {
  const ticket = ticketing.getTicket(req.params.id);
  if (ticket) res.json(ticket);
  else res.status(404).json({ error: 'Not found' });
});
app.put('/v1/tickets/:id', (req, res) => {
  try {
    const ticket = ticketing.updateTicket(req.params.id, req.body);
    if (ticket) res.json(ticket);
    else res.status(404).json({ error: 'Not found' });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/tickets/:id/interact', (req, res) => {
  try {
    const { userId, message, internal } = req.body;
    const interaction = ticketing.addInteraction(req.params.id, userId, message, internal);
    if (interaction) res.json(interaction);
    else res.status(404).json({ error: 'Ticket not found' });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/tickets/:id/interactions', (req, res) => {
  res.json(ticketing.listInteractions(req.params.id));
});
// (deduped above)
// Auto-Escalation Endpoints
app.post('/v1/escalation/rule', (req, res) => {
  try {
    const rule = autoEscalation.addRule(req.body);
    res.json(rule);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.delete('/v1/escalation/rule/:id', (req, res) => {
  try {
    autoEscalation.removeRule(req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/escalation/rules', (req, res) => {
  res.json(autoEscalation.listRules());
});
app.get('/v1/escalation/log', (req, res) => {
  res.json(autoEscalation.getLog());
});
// (deduped above)
// Advanced User Management Endpoints
app.post('/v1/users', (req, res) => {
  try {
    const user = userManager.addUser(req.body);
    res.json(user);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.post('/v1/users/:id/status', (req, res) => {
  try {
    userManager.setStatus(req.params.id, req.body.status);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/users', (req, res) => {
  res.json(userManager.listUsers());
});
app.get('/v1/users/:id', (req, res) => {
  const user = userManager.getUser(req.params.id);
  if (user) res.json(user);
  else res.status(404).json({ error: 'Not found' });
});
app.post('/v1/users/:id/activity', (req, res) => {
  try {
    userManager.logActivity({ ...req.body, userId: req.params.id, timestamp: new Date().toISOString() });
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/v1/users/:id/activity', (req, res) => {
  res.json(userManager.getUserActivity(req.params.id));
});
// Dynamic Policies Endpoints
app.post('/v1/security/policy/dynamic', (req, res) => {
  try {
    // req.body.condition must be a JS function as string, e.g. 'ctx => ctx.hour >= 18'
    const { overrides, description, condition } = req.body;
    // eslint-disable-next-line no-new-func
    const condFn = (context: any) => {
      // Use Function constructor for dynamic condition
      // This is unsafe in production, but matches the intent
      // Example: 'ctx => ctx.hour >= 18'
      // eslint-disable-next-line no-new-func
      return (new Function('ctx', `return (${condition})(ctx);`))(context);
    };
    const rule = securityPolicies.addDynamicRule({ overrides, description, condition: condFn });
    res.json(rule);
  } catch (e) {
    const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e);
    res.status(400).json({ error: msg });
  }
});
app.delete('/v1/security/policy/dynamic/:id', (req, res) => {
  try {
    securityPolicies.removeDynamicRule(req.params.id);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.get('/v1/security/policy/dynamic', (req, res) => {
  res.json(securityPolicies.listDynamicRules());
});
app.post('/v1/security/policy/context', (req, res) => {
  // Pass context (مثل الوقت أو حالة النظام) لاستعراض السياسة الفعلية
  res.json(securityPolicies.getPolicy(req.body));
});
// (deduped above)
// (deduped above)
// Security Dashboard Endpoint
app.get('/v1/security/dashboard', (req, res) => {
  res.json(securityDashboard.getSummary());
});
// (deduped above)
// Instant Notifier Endpoints
app.post('/v1/instant/destination', (req, res) => {
  try {
    const dest = instantNotifier.addDestination(req.body);
    res.json(dest);
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.delete('/v1/instant/destination/:id', (req, res) => {
  try {
    instantNotifier.removeDestination(req.params.id);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.get('/v1/instant/destinations', (req, res) => {
  res.json(instantNotifier.listDestinations());
});
app.post('/v1/instant/destination/:id/enabled', (req, res) => {
  try {
    instantNotifier.setEnabled(req.params.id, !!req.body.enabled);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.post('/v1/instant/send', (req, res) => {
  try {
    const { message, channel } = req.body;
    instantNotifier.sendInstant(message, channel);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
// (deduped above)
// SIEM Integration Endpoints
app.post('/v1/siem/destination', (req, res) => {
  try {
    const dest = siem.addDestination(req.body);
    res.json(dest);
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.delete('/v1/siem/destination/:id', (req, res) => {
  try {
    siem.removeDestination(req.params.id);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.get('/v1/siem/destinations', (req, res) => {
  res.json(siem.listDestinations());
});
app.post('/v1/siem/destination/:id/enabled', (req, res) => {
  try {
    siem.setEnabled(req.params.id, !!req.body.enabled);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
// Security Policies Export/Import & Change Log
app.get('/v1/security/policy/export', (req, res) => {
  res.json(securityPolicies.exportPolicy());
});
app.post('/v1/security/policy/import', (req, res) => {
  res.status(400).json({ error: 'importPolicy not implemented' });
});
app.get('/v1/security/policy/changelog', (req, res) => {
  res.json(securityPolicies.getChangeLog());
});
// (deduped above)
// Security Policies Endpoints
app.get('/v1/security/policy', (req, res) => {
  res.json(securityPolicies.getPolicy());
});
app.post('/v1/security/policy', (req, res) => {
  try {
    securityPolicies.updatePolicy(req.body);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
// (deduped above)
// MFA Endpoints
app.post('/v1/mfa/send', (req, res) => {
  try {
    const { userId, channel } = req.body;
    const code = mfa.sendOtp(userId, channel);
    res.json({ ok: true, code }); // code for testing only, remove in prod
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.post('/v1/mfa/verify', (req, res) => {
  try {
    const { userId, code, channel } = req.body;
    const valid = mfa.verifyOtp(userId, code, channel);
    res.json({ valid });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
// (deduped above)
// Security Reports Endpoints
app.get('/v1/security/report/:period', (req, res) => {
  const period = req.params.period as 'daily' | 'weekly' | 'monthly';
  res.json(securityReports.generateSummaryReport(period));
});
// Cybersecurity Integration Endpoints
app.post('/v1/cyber/integration', (req, res) => {
  try {
    const dest = cyber.addIntegration(req.body);
    res.json(dest);
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.delete('/v1/cyber/integration/:id', (req, res) => {
  try {
    cyber.removeIntegration(req.params.id);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.get('/v1/cyber/integrations', (req, res) => {
  res.json(cyber.listIntegrations());
});
app.post('/v1/cyber/integration/:id/enabled', (req, res) => {
  try {
    cyber.setIntegrationEnabled(req.params.id, !!req.body.enabled);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
// (deduped above)
// Cybersecurity Monitoring Endpoints
app.post('/v1/cyber/event', (req, res) => {
  try {
    const event = cyber.logEvent(req.body);
    res.json(event);
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.get('/v1/cyber/events', (req, res) => {
  res.json(cyber.listEvents(req.query));
});
app.get('/v1/cyber/alerts', (req, res) => {
  res.json(cyber.listAlerts());
});
// (deduped above)
// User Analytics Endpoints
app.post('/v1/analytics/track', (req, res) => {
  try {
    // Fix: Expect { userId, event, details }
    const { userId, event, details } = req.body;
    if (!userId || !event) return res.status(400).json({ error: 'userId and event required' });
    analytics.track(userId, event, details);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.get('/v1/analytics/stats', (req, res) => {
  if (typeof analytics.generateReport === 'function') {
    res.json({ report: analytics.generateReport(req.query.userId as string | undefined) });
  } else {
    res.status(400).json({ error: 'generateReport not implemented' });
  }
});
// (deduped above)
// Audit Trail Endpoints
app.post('/v1/audit/log', (req, res) => {
  try {
    audit.log(req.body);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.get('/v1/audit', (req, res) => {
  res.json(audit.query(req.query));
});
// (deduped above)
// AI Recommender Endpoints
app.get('/v1/recommend/user/:userId', (req, res) => {
  if (typeof recommender.recommend === 'function') {
    // Dummy user and items for demonstration; replace as needed
    const user = { id: req.params.userId, name: 'User', email: 'user@example.com' };
    let items: string[] = [];
    if (req.query.items) {
      if (Array.isArray(req.query.items)) {
        items = req.query.items as string[];
      } else if (typeof req.query.items === 'string') {
        items = [req.query.items];
      }
    }
    recommender.recommend(user, items).then(recommendations => {
      res.json({ recommendations });
    }).catch(e => {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    });
  } else {
    res.status(400).json({ error: 'recommend not implemented' });
  }
});
app.post('/v1/recommend/tasks', (req, res) => {
  if (typeof recommender.recommend === 'function') {
    const user = req.body?.user || { id: 'unknown', name: 'Unknown', email: 'unknown@example.com' };
    const items = req.body?.tasks || [];
    recommender.recommend(user, items).then(recommendations => {
      res.json({ recommendations });
    }).catch(e => {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    });
  } else {
    res.status(400).json({ error: 'recommend not implemented' });
  }
});
// (deduped above)
// Voice Command & TTS Endpoints
app.post('/v1/voice/recognize', (req, res) => {
  // Expecting audioBuffer as base64 in req.body.audio
  try {
    const audioBuffer = Buffer.from(req.body.audio, 'base64');
    if (typeof voice.recognize === 'function') {
      voice.recognize(audioBuffer).then(cmd => {
        res.json({ command: cmd });
      }).catch(e => {
        res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
      });
    } else {
      res.status(400).json({ error: 'recognize not implemented' });
    }
  } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : String(e) }); }
});
app.post('/v1/voice/tts', (req, res) => {
  // textToSpeech not implemented; return error
  res.status(400).json({ error: 'textToSpeech not implemented' });
});
// (deduped above)
// Smart Notification Endpoints
app.post('/v1/notify', (req, res) => {
  try {
    const notif = notifier.sendNotification(req.body);
    res.json(notif);
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.get('/v1/notifications', (req, res) => {
  res.json(notifier.listNotifications(req.query.userId as string | undefined));
});
app.get('/v1/notification/:id', (req, res) => {
  const notif = notifier.getNotification(req.params.id);
  if (notif) res.json(notif);
  else res.status(404).json({ error: 'Not found' });
});
// Delegation Management
app.post('/v1/rbac/delegation', (req, res) => {
  try {
    rbac.addDelegation(req.body);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.delete('/v1/rbac/delegation', (req, res) => {
  try {
    const { fromUserId, toUserId, resource } = req.body;
    rbac.removeDelegation(fromUserId, toUserId, resource);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.get('/v1/rbac/delegations', (req, res) => {
  res.json(rbac.listDelegations(req.query));
});
// User Group Management
app.post('/v1/rbac/group', (req, res) => {
  try {
    const group = req.body;
    rbac.addGroup(group);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.put('/v1/rbac/group/:id', (req, res) => {
  try {
    rbac.updateGroup(req.params.id, req.body);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.delete('/v1/rbac/group/:id', (req, res) => {
  try {
    rbac.removeGroup(req.params.id);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.get('/v1/rbac/groups', (req, res) => {
  res.json(rbac.listGroups());
});
app.post('/v1/rbac/group/:id/user', (req, res) => {
  try {
    rbac.addUserToGroup(req.params.id, req.body.userId);
    res.json({ ok: true });
  } catch (e) { const msg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e); res.status(400).json({ error: msg }); }
});
app.delete('/v1/rbac/group/:id/user/:userId', (req, res) => {
  try {
    rbac.removeUserFromGroup(req.params.id, req.params.userId);
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : String(e) }); }
});
// ACL management endpoints

// RBAC ACL endpoints removed: not implemented in rbacApi
import { SentimentAnalyzer, saveSentimentResult, searchSentimentResults, batchAnalyze } from './modules/sentiment-analyzer';
// Sentiment analysis endpoint (single)
v1.post('/sentiment/analyze', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const result = await agent.sentiment.analyze(text);
    saveSentimentResult(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Sentiment analysis failed' });
  }
});

// Batch sentiment analysis
v1.post('/sentiment/batch', async (req, res) => {
  const { texts } = req.body;
  if (!Array.isArray(texts) || texts.length === 0) return res.status(400).json({ error: 'texts[] required' });
  try {
    const { results, stats } = await batchAnalyze(agent.sentiment, texts);
    res.json({ results, stats });
  } catch (err) {
    res.status(500).json({ error: 'Batch sentiment analysis failed' });
  }
});

// Sentiment analysis history search
v1.get('/sentiment/history', (req, res) => {
  const filter = req.query;
  const results = searchSentimentResults(filter);
  res.json(results);
});
// Smart Task Management endpoints
v1.post('/tasks', (req, res) => {
  const { title, description, assignedTo, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const task = agent.smartTasks.createTask(title, description, assignedTo, dueDate);
  res.json(task);
});

v1.get('/tasks', (req, res) => {
  const filter = req.query;
  const tasks = agent.smartTasks.listTasks(filter);
  res.json(tasks);
});

v1.put('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const task = agent.smartTasks.updateTask(id, updates);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

v1.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const ok = agent.smartTasks.deleteTask(id);
  if (!ok) return res.status(404).json({ error: 'Task not found' });
  res.json({ success: true });
});
import { BIIntegration } from './modules/bi-integration';
// Export audit log as CSV for BI tools
v1.get('/bi/audit-csv', (req, res) => {
  const csv = BIIntegration.exportAuditCSV();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit.csv"');
  res.send(csv);
});
// Interactive audit review endpoints
v1.get('/audit/search', async (req, res) => {
  try {
    const { action, userId, requestId } = req.query;
    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;
    if (userId) filter.userId = userId;
    if (requestId) filter.requestId = requestId;
    const results = await Audit.search(filter);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Audit search failed' });
  }
});
// Data encryption endpoints
v1.post('/encryption/encrypt', (req, res) => {
  const { plain } = req.body;
  if (!plain) return res.status(400).json({ error: 'plain required' });
  const encrypted = agent.encryption.encrypt(plain);
  res.json({ encrypted });
});

v1.post('/encryption/decrypt', (req, res) => {
  const { encrypted } = req.body;
  if (!encrypted) return res.status(400).json({ error: 'encrypted required' });
  try {
    const plain = agent.encryption.decrypt(encrypted);
    res.json({ plain });
  } catch (err) {
    res.status(400).json({ error: 'decryption failed' });
  }
});
// RBAC dynamic policy endpoints
// Advanced RBAC endpoints

// RBAC policy endpoints removed: not implemented in rbacApi
// Voice command endpoint
v1.post('/voice/command', async (req, res) => {
  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) return res.status(400).json({ error: 'audioBase64 required' });
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const command = await agent.voice.recognize(audioBuffer);
    const result = await agent.voice.processCommand(command);
    res.json({ command, result });
  } catch (err) {
    ErrorLogger.log(err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: 'Internal error' });
  }
});
// In-memory job registry for demo
const scheduledJobs: { id: string; type: 'once'|'repeat'; nextRun: number; interval?: number; desc: string }[] = [];
let jobCounter = 0;

// Schedule a one-time task
v1.post('/automation/schedule', (req, res) => {
  const { delayMs, desc } = req.body;
  if (typeof delayMs !== 'number' || delayMs < 0) return res.status(400).json({ error: 'delayMs required' });
  const id = `job_${++jobCounter}`;
  const nextRun = Date.now() + delayMs;
  scheduledJobs.push({ id, type: 'once', nextRun, desc: desc || '' });
  agent.scheduler.schedule(delayMs, () => {
    agent.logger.info(`[AUTOMATION] One-time job executed: ${id} - ${desc}`);
  });
  res.json({ id, nextRun });
});

// Schedule a recurring task
v1.post('/automation/repeat', (req, res) => {
  const { intervalMs, desc } = req.body;
  if (typeof intervalMs !== 'number' || intervalMs <= 0) return res.status(400).json({ error: 'intervalMs required' });
  const id = `job_${++jobCounter}`;
  const nextRun = Date.now() + intervalMs;
  scheduledJobs.push({ id, type: 'repeat', nextRun, interval: intervalMs, desc: desc || '' });
  agent.scheduler.repeat(intervalMs, () => {
    agent.logger.info(`[AUTOMATION] Recurring job executed: ${id} - ${desc}`);
  });
  res.json({ id, nextRun, intervalMs });
});

// List scheduled jobs (in-memory only)
v1.get('/automation/jobs', (req, res) => {
  res.json(scheduledJobs);
});
// User analytics endpoints
v1.post('/analytics/track', (req, res) => {
  const { userId, event, details } = req.body;
  if (!userId || !event) return res.status(400).json({ error: 'userId and event required' });
  agent.userAnalytics.track(userId, event, details);
  res.json({ success: true });
});

v1.get('/analytics/report', (req, res) => {
  const { userId } = req.query;
  const report = agent.userAnalytics.generateReport(userId as string | undefined);
  res.type('text/plain').send(report);
});
// Duplicate import removed
import { UserProfileManager } from './modules/user-profile';
// User profile manager instance (for demo)
const userProfileManager = new UserProfileManager();

// AI Recommendation endpoint
v1.post('/recommend', async (req, res) => {
  try {
    const { userId, items, context } = req.body;
    if (!userId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'userId and items[] required' });
    }
    const user = userProfileManager.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const ranked = await aiRecommender.recommend(user, items, context);
    res.json({ recommendations: ranked });
  } catch (err) {
    ErrorLogger.log(err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: 'Internal error' });
  }
});
import { WebhookManager } from './modules/webhook-manager';
// Webhook subscription management endpoints
app.post('/v1/hooks', (req, res) => {
  const { event, url } = req.body;
  if (!event || !url) return res.status(400).json({ error: 'Missing event or url' });
  const sub = WebhookManager.subscribe(event, url);
  res.json(sub);
});
app.delete('/v1/hooks/:id', (req, res) => {
  const ok = WebhookManager.unsubscribe(req.params.id);
  res.json({ success: ok });
});
// REST API باستخدام Express


import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import { Webhook } from './modules/webhook';
import { EmailService } from './modules/email-service';
// Duplicate import removed
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
// Use require for express-validator for CommonJS compatibility
const { body, validationResult } = require('express-validator');
import { AgentCore } from './core/agent-core';
import { t } from './i18n';
import { ErrorLogger } from './error-logger';
import { setupGraphQL, publishEvent } from './graphql';
import { setupMonitoring } from './monitoring';
import { setupSwagger, swaggerDocument } from './swagger';
// Endpoint to serve OpenAPI/Swagger JSON
app.get('/v1/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(swaggerDocument, null, 2));
});
import { RBAC, User } from './rbac';
import { oauth2Middleware } from './auth-middleware';
import { tenantMiddleware } from './tenant-middleware';
import { Audit } from './audit';
import { UsageAnalytics } from './usage-analytics';


import { Request, Response, NextFunction } from 'express';

// === ERP/BI Integrations ===
// SAP Integration Endpoint
app.post('/v1/integrations/sap/webhook', async (req, res) => {
  try {
    // Example: Receive asset event and forward to SAP
    const { eventType, asset, data } = req.body;
    // TODO: Add SAP API integration logic here (e.g., call SAP OData/REST API)
    // For now, just log and return success
    console.log('SAP Integration Event:', { eventType, asset, data });
    res.json({ status: 'success', message: 'Forwarded to SAP (mock)' });
  } catch (error) {
    res.status(500).json({ error: 'SAP integration failed', details: error instanceof Error ? error.message : String(error) });
  }
});

// Dynamics 365 Integration Endpoint
app.post('/v1/integrations/dynamics/webhook', async (req, res) => {
  try {
    // Example: Receive asset event and forward to Dynamics
    const { eventType, asset, data } = req.body;
    // TODO: Add Dynamics API integration logic here (e.g., call Dynamics REST API)
    // For now, just log and return success
    console.log('Dynamics Integration Event:', { eventType, asset, data });
    res.json({ status: 'success', message: 'Forwarded to Dynamics (mock)' });
  } catch (error) {
    res.status(500).json({ error: 'Dynamics integration failed', details: error instanceof Error ? error.message : String(error) });
  }
});

// Power BI Direct Integration Endpoint
app.post('/v1/integrations/powerbi/webhook', async (req, res) => {
  try {
    // Example: Receive analytics/report event and forward to Power BI
    const { reportType, payload } = req.body;
    // TODO: Add Power BI API integration logic here (e.g., push data to Power BI dataset)
    // For now, just log and return success
    console.log('Power BI Integration Event:', { reportType, payload });
    res.json({ status: 'success', message: 'Forwarded to Power BI (mock)' });
  } catch (error) {
    res.status(500).json({ error: 'Power BI integration failed', details: error instanceof Error ? error.message : String(error) });
  }
});
// ضغط الاستجابات لتحسين الأداء
app.use(compression());
// تتبع كل طلب عبر X-Request-Id
app.use((req: Request, res: Response, next: NextFunction) => {
  let reqId = req.headers['x-request-id'] || uuidv4();
  if (Array.isArray(reqId)) reqId = reqId[0];
  (req as any).requestId = reqId as string;
  res.setHeader('X-Request-Id', reqId as string);
  next();
});
// تقييد CORS ديناميكي (يمكن تخصيص القائمة البيضاء)
const allowedOrigins = [process.env.ALLOWED_ORIGIN || 'http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
const agent = new AgentCore();
const rbac = new RBAC();
const webhook = new Webhook();
const emailer = new EmailService('smtp.example.com', 587, 'user', 'pass');

// أمان HTTP headers
app.use(helmet());

// Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.use(express.json());


app.get('/health', (req, res) => {
  try {
    const lang = req.query.lang as string || 'ar';
    res.json({ status: t('HEALTH_OK', lang) });
  } catch (err) {
    ErrorLogger.log(err instanceof Error ? err : new Error(String(err)));
    const lang = req.query.lang as string || 'ar';
    res.status(500).json({ error: t('ERROR_INTERNAL', lang) });
  }
});



// Versioned API router
v1.post(
  '/nlp',
  tenantMiddleware,
  oauth2Middleware,
  body('text').isString().isLength({ min: 2 }),
  body('userId').isString(),
  body('roles').isArray(),
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const lang = req.query.lang as string || 'ar';
        return res.status(400).json({ error: t('ERROR_VALIDATION', lang, { details: errors.array().map((e: any) => e.msg).join(', ') }) });
      }
      const { text, userId, roles } = req.body;
      const user: User = { id: userId, roles };
      // RBAC permission check removed: not implemented in rbacApi
      // Mount the v1 router at the end
      app.use('/v1', v1);
      const result = agent.nlp.analyzeText(text);
      Audit.log('nlp', userId, { text, result }, (req as any).requestId);
      UsageAnalytics.track('nlp', { userId, tenantId: (req as any).tenantId, text });
      res.json(result);
    } catch (err) {
      ErrorLogger.log(err instanceof Error ? err : new Error(String(err)));
      res.status(500).json({ error: 'Internal error' });
    }
  }
);

// ERP/CRM API endpoint
const erpRouter = express.Router();
erpRouter.get('/records/:entity', async (req, res) => {
  try {
    const { entity } = req.params;
    const params = req.query;
    const records = await agent.erp.fetchRecords(entity, params);
    res.json(records);
  } catch (err) {
    ErrorLogger.log(err instanceof Error ? err : new Error(String(err)));
    const lang = req.query.lang as string || 'ar';
    res.status(500).json({ error: t('ERROR_INTERNAL', lang) });
  }
});
erpRouter.post('/records/:entity', async (req, res) => {
  try {
    const { entity } = req.params;
    const record = await agent.erp.createRecord(entity, req.body);
    Audit.log('erp_create', req.body?.userId || 'system', { entity, data: req.body }, (req as any).requestId);
    // Trigger webhooks for ERP create
    for (const hook of WebhookManager.getHooks('erp_create')) {
      webhook.send(hook.url, { event: 'erp_create', entity, data: req.body });
    }
    res.json(record);
  } catch (err) {
    ErrorLogger.log(err instanceof Error ? err : new Error(String(err)));
    const lang = req.query.lang as string || 'ar';
    res.status(500).json({ error: t('ERROR_INTERNAL', lang) });
  }
});
erpRouter.put('/records/:entity/:id', async (req, res) => {
  try {
    const { entity, id } = req.params;
    const record = await agent.erp.updateRecord(entity, id, req.body);
    Audit.log('erp_update', req.body?.userId || 'system', { entity, id, data: req.body }, (req as any).requestId);
    // Trigger webhooks for ERP update
    for (const hook of WebhookManager.getHooks('erp_update')) {
      webhook.send(hook.url, { event: 'erp_update', entity, id, data: req.body });
    }
    res.json(record);
  } catch (err) {
    ErrorLogger.log(err instanceof Error ? err : new Error(String(err)));
    const lang = req.query.lang as string || 'ar';
    res.status(500).json({ error: t('ERROR_INTERNAL', lang) });
  }
});
erpRouter.delete('/records/:entity/:id', async (req, res) => {
  try {
    const { entity, id } = req.params;
    const ok = await agent.erp.deleteRecord(entity, id);
    Audit.log('erp_delete', req.body?.userId || 'system', { entity, id }, (req as any).requestId);
    // Trigger webhooks for ERP delete
    for (const hook of WebhookManager.getHooks('erp_delete')) {
      webhook.send(hook.url, { event: 'erp_delete', entity, id });
    }
    res.json({ success: ok });
  } catch (err) {
    ErrorLogger.log(err instanceof Error ? err : new Error(String(err)));
    const lang = req.query.lang as string || 'ar';
    res.status(500).json({ error: t('ERROR_INTERNAL', lang) });
  }
});
app.use('/v1/erp', erpRouter);
app.use('/v1', v1);




// مراقبة الأداء
setupMonitoring(app);

// توثيق REST API
setupSwagger(app);

// دمج GraphQL
import http from 'http';
const httpServer = http.createServer(app);
setupGraphQL(app, httpServer);
// REST endpoint to publish demo events to GraphQL subscription
v1.post('/events/publish', (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  publishEvent(message);
  res.json({ success: true });
});

app.use(async (err: Error, req: Request, res: Response, next: NextFunction) => {
  ErrorLogger.log(err);
  // تنبيه ذكي متعدد القنوات عند الأخطاء الحرجة
  await smartNotifier.notifyAll(
    `CRITICAL ERROR:\n${err.message}\nRequestId: ${(req as any).requestId}\nURL: ${req.originalUrl}\nStack: ${err.stack}`
  );
  const lang = req.query?.lang as string || 'ar';
  res.status(500).json({ error: t('ERROR_INTERNAL', lang) });
});



if (require.main === module) {
  httpServer.listen(3000, () => {
    console.log('Agent REST & GraphQL API (with subscriptions) running on port 3000');
  });
}

export { app };
