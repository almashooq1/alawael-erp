// تنبيهات انتهاء العقود
import { Scheduler } from './scheduler';
import { ContractManager } from './contract-manager';
import { NotificationCenter } from './notification-center';

const scheduler = new Scheduler();
const manager = new ContractManager();
const notifier = new NotificationCenter();

function checkContractExpirations() {
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 أيام
  for (const c of manager.listContracts()) {
    if (c.status === 'active') {
      const end = new Date(c.endDate);
      if (end > now && end <= soon) {
        notifier.sendNotification({
          userId: 'admin',
          title: `تنبيه انتهاء عقد: ${c.title}`,
          message: `العقد مع ${c.parties.join(', ')} ينتهي بتاريخ ${c.endDate}`,
          channel: 'in-app',
        });
      }
    }
  }
}

// جدولة الفحص يومياً
scheduler.repeat(24 * 60 * 60 * 1000, checkContractExpirations);

export { checkContractExpirations };
