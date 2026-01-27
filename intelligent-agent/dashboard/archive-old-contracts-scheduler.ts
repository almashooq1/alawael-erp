// أرشفة العقود المنتهية تلقائياً بعد 90 يوم
import { ContractManager } from '../src/modules/contract-manager';
import { Scheduler } from '../src/modules/scheduler';

const ARCHIVE_AFTER_DAYS = 90;
const scheduler = new Scheduler();

function archiveOldContracts() {
  const manager = new ContractManager();
  const now = new Date();
  const contracts = manager.listContracts();
  for (const c of contracts) {
    if ((c.status === 'expired' || c.status === 'terminated') && !c.metadata?.archived) {
      const end = new Date(c.endDate);
      const daysSinceEnd = (now.getTime() - end.getTime()) / (1000*60*60*24);
      if (daysSinceEnd >= ARCHIVE_AFTER_DAYS) {
        c.metadata = { ...c.metadata, archived: true, archivedAt: now.toISOString() };
      }
    }
  }
}

// جدولة الأرشفة يومياً
scheduler.repeat(24*60*60*1000, archiveOldContracts);

console.log('Archive old contracts scheduler started.');
