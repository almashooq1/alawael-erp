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
exports.default = NotificationPanel;
const react_1 = __importStar(require("react"));
function NotificationPanel() {
    const [notifs, setNotifs] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch('/dashboard/notification/list').then(r => r.json()).then(setNotifs);
    }, []);
    return <div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 600, margin: 'auto' }}>
    <h2>الإشعارات المركزية</h2>
    <table style={{ width: '100%' }}><thead><tr><th>المستخدم</th><th>العنوان</th><th>الرسالة</th><th>القناة</th><th>التاريخ</th></tr></thead>
      <tbody>
        {notifs.map(n => <tr key={n.id}><td>{n.userId}</td><td>{n.title}</td><td>{n.message}</td><td>{n.channel}</td><td>{n.sentAt}</td></tr>)}
      </tbody>
    </table>
  </div>;
}
