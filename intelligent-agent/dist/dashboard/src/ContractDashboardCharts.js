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
const React = __importStar(require("react"));
function PieChart({ data, colors, size = 180 }) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let acc = 0;
    const r = size / 2 - 10;
    return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{data.map((d, i) => {
            const start = acc / total * 2 * Math.PI;
            acc += d.value;
            const end = acc / total * 2 * Math.PI;
            const x1 = size / 2 + r * Math.sin(start), y1 = size / 2 - r * Math.cos(start);
            const x2 = size / 2 + r * Math.sin(end), y2 = size / 2 - r * Math.cos(end);
            const large = end - start > Math.PI ? 1 : 0;
            return <path key={i} d={`M${size / 2},${size / 2} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`} fill={colors[i % colors.length]}><title>{d.label}: {d.value}</title></path>;
        })}</svg>;
}
function ContractDashboardCharts() {
    const [report, setReport] = React.useState(null);
    React.useEffect(() => {
        fetch('/dashboard/contract-reports/summary').then(r => r.json()).then(setReport);
    }, []);
    if (!report)
        return <div>Loading...</div>;
    const statusData = [
        { label: 'نشط', value: report.active },
        { label: 'منتهي', value: report.expired },
        { label: 'منتهي مبكراً', value: report.terminated },
        { label: 'معلق', value: report.pending }
    ];
    const partyData = Object.entries(report.byParty)
        .map(([label, value]) => ({ label, value: typeof value === 'number' ? value : Number(value) }))
        .slice(0, 6);
    return <div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 900, margin: 'auto' }}>
    <h2>لوحة تحكم العقود - رسوم بيانية</h2>
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      <div>
        <h4>توزيع العقود حسب الحالة</h4>
        <PieChart data={statusData} colors={['#4caf50', '#f44336', '#ff9800', '#2196f3']}/>
        <ul>{statusData.map(d => <li key={d.label}>{d.label}: {d.value}</li>)}</ul>
      </div>
      <div>
        <h4>توزيع العقود حسب الطرف (أكثر 6)</h4>
        <PieChart data={partyData} colors={['#2196f3', '#9c27b0', '#ffeb3b', '#ff9800', '#4caf50', '#f44336']}/>
        <ul>{partyData.map(d => <li key={d.label}>{d.label}: {String(d.value)}</li>)}</ul>
      </div>
      <div>
        <h4>إجمالي العقود والقيمة</h4>
        <div>إجمالي العقود: <b>{report.total}</b></div>
        <div>إجمالي القيمة: <b>{report.totalValue}</b></div>
        <div>متوسط القيمة: <b>{report.avgValue}</b></div>
        <div>ستنتهي خلال 30 يوم: <b>{report.soonToExpire}</b></div>
      </div>
    </div>
  </div>;
}
exports.default = ContractDashboardCharts;
