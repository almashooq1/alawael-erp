"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComplianceReport = generateComplianceReport;
// خدمة تقارير الامتثال (تصدير PDF/Excel)
const compliance_event_1 = __importDefault(require("../models/compliance-event"));
const jspdf_1 = __importDefault(require("jspdf"));
const exceljs_1 = __importDefault(require("exceljs"));
async function generateComplianceReport({ from, to, format = 'pdf', filePath = '' }) {
    const events = await compliance_event_1.default.find({
        timestamp: { $gte: from, $lte: to }
    }).lean();
    if (format === 'excel') {
        const workbook = new exceljs_1.default.Workbook();
        const sheet = workbook.addWorksheet('Compliance Events');
        sheet.columns = [
            { header: 'التاريخ', key: 'timestamp', width: 20 },
            { header: 'المستخدم', key: 'userId', width: 20 },
            { header: 'الإجراء', key: 'action', width: 20 },
            { header: 'المورد', key: 'resource', width: 20 },
            { header: 'الحالة', key: 'status', width: 15 },
            { header: 'تفاصيل', key: 'details', width: 30 },
            { header: 'السياسة', key: 'policy', width: 20 }
        ];
        events.forEach((e) => sheet.addRow(e));
        const outPath = filePath || `compliance-report-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.xlsx`;
        await workbook.xlsx.writeFile(outPath);
        return outPath;
    }
    else {
        const doc = new jspdf_1.default();
        doc.text('تقرير الامتثال', 10, 10);
        let y = 20;
        events.forEach((e) => {
            doc.text(`${e.timestamp} | ${e.userId || ''} | ${e.action} | ${e.resource} | ${e.status} | ${e.details || ''} | ${e.policy || ''}`, 10, y);
            y += 10;
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
        });
        const outPath = filePath || `compliance-report-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.pdf`;
        doc.save(outPath);
        return outPath;
    }
}
