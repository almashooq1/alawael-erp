"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = IntegrationsHub;
const react_1 = __importDefault(require("react"));
const links = [
    { href: '/dashboard', label: 'لوحة الإحصائيات' },
    { href: '/dashboard/admin', label: 'إدارة النظام' },
    { href: '/dashboard/sources', label: 'مصادر البيانات' },
    { href: '/dashboard/roles', label: 'الأدوار والصلاحيات' },
    { href: '/dashboard/custom-reports', label: 'تقارير مخصصة' },
    { href: '/dashboard/gdrive', label: 'Google Drive' },
    { href: '/dashboard/dropbox', label: 'Dropbox' },
    { href: '/dashboard/box', label: 'Box' },
    { href: '/dashboard/webhook', label: 'Webhooks' },
    { href: '/dashboard/notifications', label: 'الإشعارات المركزية' },
    { href: '/dashboard/contracts', label: 'إدارة العقود' },
    { href: '/dashboard/contract-reports', label: 'تقرير العقود' },
    { href: '/dashboard/contract-smart', label: 'تحليل العقود الذكي' },
];
function IntegrationsHub() {
    return <div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 600, margin: 'auto' }}>
    <h2>مركز إدارة النظام والتكاملات</h2>
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {links.map(l => <li key={l.href} style={{ margin: '12px 0' }}>
        <a href={l.href} style={{ fontSize: 18, textDecoration: 'none', color: '#1976d2' }}>{l.label}</a>
      </li>)}
    </ul>
  </div>;
}
