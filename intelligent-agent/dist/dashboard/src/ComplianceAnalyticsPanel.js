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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ComplianceAnalyticsPanel;
const react_1 = __importStar(require("react"));
const antd_1 = require("antd");
const react_chartjs_2_1 = require("react-chartjs-2");
require("chart.js/auto");
function ComplianceAnalyticsPanel() {
    const [stats, setStats] = (0, react_1.useState)(null);
    const [ai, setAI] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetch('/v1/compliance/stats').then(r => r.json()).then(setStats);
        fetch('/v1/compliance/ai-analysis').then(r => r.json()).then(setAI);
    }, []);
    if (!stats || !ai)
        return <div>جاري التحميل...</div>;
    // إعداد بيانات الرسوم
    const statusData = {
        labels: stats.byStatus.map((s) => s._id),
        datasets: [{ label: 'عدد الأحداث', data: stats.byStatus.map((s) => s.count), backgroundColor: ['#f5222d', '#faad14', '#52c41a'] }]
    };
    const timelineData = {
        labels: stats.timeline.map((t) => t._id),
        datasets: [{ label: 'عدد الأحداث', data: stats.timeline.map((t) => t.count), fill: false, borderColor: '#1890ff' }]
    };
    const policyData = {
        labels: stats.byPolicy.map((p) => p._id || 'غير محدد'),
        datasets: [{ label: 'خروقات لكل سياسة', data: stats.byPolicy.map((p) => p.count), backgroundColor: '#faad14' }]
    };
    const resourceData = {
        labels: stats.byResource.map((r) => r._id || 'غير محدد'),
        datasets: [{ label: 'خروقات لكل مورد', data: stats.byResource.map((r) => r.count), backgroundColor: '#f5222d' }]
    };
    return (<div style={{ padding: 24 }}>
      <h2>لوحة التحليل المتقدم للامتثال</h2>
      <antd_1.Card style={{ marginBottom: 24, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
        <h3 style={{ color: '#237804' }}>تحليل ذكي للامتثال (AI)</h3>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div><b>إجمالي الأحداث:</b> {ai.total}</div>
          <div><b>فشل:</b> <span style={{ color: '#f5222d' }}>{ai.failCount}</span></div>
          <div><b>تحذير:</b> <span style={{ color: '#faad14' }}>{ai.warningCount}</span></div>
          <div><b>نجاح:</b> <span style={{ color: '#52c41a' }}>{ai.successCount}</span></div>
          <div><b>مخاطر التصعيد:</b> <span style={{ color: ai.escalationRisk === 'مرتفع' ? '#d4380d' : ai.escalationRisk === 'متوسط' ? '#faad14' : '#389e0d', fontWeight: 'bold' }}>{ai.escalationRisk}</span></div>
        </div>
        <div style={{ marginTop: 12 }}><b>توصية ذكية:</b> <span style={{ color: '#096dd9' }}>{ai.aiAdvice}</span></div>
        {ai.openaiSummary && <div style={{ marginTop: 12, background: '#fffbe6', padding: 12, borderRadius: 6 }}><b>تحليل AI متقدم:</b><br />{ai.openaiSummary}</div>}
      </antd_1.Card>
      <antd_1.Row gutter={24}>
        <antd_1.Col span={12}><antd_1.Card title="توزيع الحالات"><react_chartjs_2_1.Pie data={statusData}/></antd_1.Card></antd_1.Col>
        <antd_1.Col span={12}><antd_1.Card title="توزيع زمني (30 يوم)"><react_chartjs_2_1.Line data={timelineData}/></antd_1.Card></antd_1.Col>
      </antd_1.Row>
      <antd_1.Row gutter={24} style={{ marginTop: 24 }}>
        <antd_1.Col span={12}><antd_1.Card title="أكثر السياسات اختراقًا"><react_chartjs_2_1.Bar data={policyData}/></antd_1.Card></antd_1.Col>
        <antd_1.Col span={12}><antd_1.Card title="أكثر الموارد تعرضًا للخرق"><react_chartjs_2_1.Bar data={resourceData}/></antd_1.Card></antd_1.Col>
      </antd_1.Row>
    </div>);
}
