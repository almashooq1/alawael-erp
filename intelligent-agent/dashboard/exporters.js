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
exports.exportReportPDF = exportReportPDF;
exports.exportReportExcel = exportReportExcel;
const jspdf_1 = require("jspdf");
const XLSX = __importStar(require("xlsx"));
function exportReportPDF(res, stats) {
    const doc = new jspdf_1.jsPDF();
    doc.text('تقرير الذكاء الذاتي', 10, 10);
    doc.text(`إجمالي التفاعلات: ${stats.total}`, 10, 20);
    doc.text(`تفاعلات هذا الأسبوع: ${stats.weekCount}`, 10, 30);
    doc.text(`عدد الأخطاء: ${stats.errorCount}`, 10, 40);
    doc.text('أكثر الأسئلة:', 10, 50);
    stats.topQuestions.forEach(([q, c], i) => {
        doc.text(`${i + 1}. ${q} (${c})`, 12, 60 + i * 10);
    });
    doc.save('report.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    res.end(doc.output('arraybuffer'));
}
function exportReportExcel(res, stats) {
    const ws = XLSX.utils.json_to_sheet([
        { العنوان: 'إجمالي التفاعلات', القيمة: stats.total },
        { العنوان: 'تفاعلات الأسبوع', القيمة: stats.weekCount },
        { العنوان: 'عدد الأخطاء', القيمة: stats.errorCount },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
    res.end(buf);
}
