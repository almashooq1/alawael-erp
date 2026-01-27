// وحدة استقبال وإرسال Webhooks
import axios from 'axios';

export class Webhook {
  async send(url: string, payload: any) {
    return axios.post(url, payload);
  }

  // يمكن إضافة استقبال Webhook عبر سيرفر Express لاحقًا
}
