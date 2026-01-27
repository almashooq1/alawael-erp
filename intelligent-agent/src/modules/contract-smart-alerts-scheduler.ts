// جدولة تنبيهات العقود الذكية
import { Scheduler } from './scheduler';
import { checkAndSendSmartContractAlerts } from './contract-smart-alerts';

const scheduler = new Scheduler();
// كل يوم الساعة 8 صباحًا
scheduler.repeat(24 * 60 * 60 * 1000, () => {
  checkAndSendSmartContractAlerts();
});

export {};
