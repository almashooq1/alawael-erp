// process.bpmn.ts
// دعم تصدير واستيراد العمليات بصيغة BPMN/JSON

import { Process } from './process.model';

export function exportToBPMN(process: Process): string {
  // تحويل العملية إلى XML BPMN (مبسط)
  return `<process id="${process._id}" name="${process.name}">...</process>`;
}

export function importFromBPMN(xml: string): Process {
  // تحويل XML BPMN إلى كائن Process (مبسط)
  return { _id: 'imported', name: 'Imported', status: 'active', steps: [], createdAt: '', updatedAt: '' };
}
