"use strict";
// process.bpmn.ts
// دعم تصدير واستيراد العمليات بصيغة BPMN/JSON
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportToBPMN = exportToBPMN;
exports.importFromBPMN = importFromBPMN;
function exportToBPMN(process) {
    // تحويل العملية إلى XML BPMN (مبسط)
    return `<process id="${process._id}" name="${process.name}">...</process>`;
}
function importFromBPMN(xml) {
    // تحويل XML BPMN إلى كائن Process (مبسط)
    return { _id: 'imported', name: 'Imported', status: 'active', steps: [], createdAt: '', updatedAt: '' };
}
