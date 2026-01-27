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
exports.default = ContractReportsPanel;
const react_1 = __importStar(require("react"));
function ContractReportsPanel() {
    const [report, setReport] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetch('/dashboard/contract-reports/summary').then(r => r.json()).then(setReport);
    }, []);
    if (!report)
        return <div>تحميل...</div>;
    return <div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 600, margin: 'auto' }}>
    <h2>تقرير العقود</h2>
    <div>إجمالي العقود: <b>{report.total}</b></div>
    <div>العقود النشطة: <b>{report.active}</b></div>
    <div>العقود المنتهية: <b>{report.expired}</b></div>
    <div>العقود المنتهية مبكراً: <b>{report.terminated}</b></div>
    <div>العقود المعلقة: <b>{report.pending}</b></div>
    <div>إجمالي القيمة: <b>{report.totalValue}</b></div>
    <div>متوسط القيمة: <b>{report.avgValue}</b></div>
    <div>ستنتهي خلال 30 يوم: <b>{report.soonToExpire}</b></div>
    <div style={{ marginTop: 16 }}>
      <b>توزيع العقود حسب الطرف:</b>
      <ul>
        {Object.entries(report.byParty).map(([p, c]) => <li key={p}>{p}: {c}</li>)}
      </ul>
    </div>
  </div>;
}
