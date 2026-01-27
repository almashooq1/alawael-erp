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
exports.default = ContractActivityPanel;
const react_1 = __importStar(require("react"));
function ContractActivityPanel({ contractId }) {
    const [logs, setLogs] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch(`/dashboard/contract-activity/${contractId}`).then(r => r.json()).then(setLogs);
    }, [contractId]);
    return <div style={{ marginTop: 16 }}>
    <h3>سجل النشاطات</h3>
    <table style={{ width: '100%' }}><thead><tr><th>العملية</th><th>المستخدم</th><th>التاريخ</th><th>تفاصيل</th></tr></thead>
      <tbody>
        {logs.map((l, i) => <tr key={i}>
          <td>{l.action}</td>
          <td>{l.userId || '-'}</td>
          <td>{l.timestamp?.slice(0, 19).replace('T', ' ')}</td>
          <td><pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{JSON.stringify(l.details || {}, null, 1)}</pre></td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
