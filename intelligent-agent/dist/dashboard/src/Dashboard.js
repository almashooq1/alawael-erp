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
exports.default = Dashboard;
const react_1 = __importStar(require("react"));
const ContractDashboardCharts_1 = __importDefault(require("./ContractDashboardCharts"));
const CompliancePanel_1 = __importDefault(require("./CompliancePanel"));
function Dashboard() {
    const [stats, setStats] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetch('/dashboard/api/stats').then(r => r.json()).then(setStats);
    }, []);
    if (!stats)
        return <div>تحميل...</div>;
    return (<div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 900, margin: 'auto' }}>
      <h2>لوحة تحكم الذكاء الذاتي</h2>
      <div style={{ margin: '10px 0' }}>
        <button onClick={() => window.open('/dashboard/api/export/pdf', '_blank')}>تصدير PDF</button>
        <button onClick={() => window.open('/dashboard/api/export/excel', '_blank')} style={{ marginRight: 8 }}>تصدير Excel</button>
      </div>
      <div>إجمالي التفاعلات: <b>{stats.total}</b></div>
      <div>تفاعلات هذا الأسبوع: <b>{stats.weekCount}</b></div>
      <div>عدد الأخطاء هذا الأسبوع: <b>{stats.errorCount}</b></div>
      <div>أكثر الأسئلة تكراراً:</div>
      <ul>
        {stats.topQuestions.map(([q, c]) => <li key={q}>{q} <b>({c})</b></li>)}
      </ul>
      {stats.feedbackStats && (<div>
          <div>أعلى تقييم: {stats.feedbackStats.max}</div>
          <div>أقل تقييم: {stats.feedbackStats.min}</div>
          <div>كل التقييمات: {stats.feedbackStats.all.join(', ')}</div>
        </div>)}
      <hr style={{ margin: '32px 0' }}/>
      <ContractDashboardCharts_1.default />
      <hr style={{ margin: '32px 0' }}/>
      <CompliancePanel_1.default />
    </div>);
}
