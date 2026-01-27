import { Scheduler } from '../src/modules/scheduler';
import { checkAndSendSmartContractAlerts } from '../src/modules/contract-smart-alerts';

// جدولة التنبيهات الذكية للعقود كل ساعة
const scheduler = new Scheduler();
scheduler.repeat(60 * 60 * 1000, () => {
  checkAndSendSmartContractAlerts().catch(console.error);
});

console.log('Smart contract alerts scheduler started.');
