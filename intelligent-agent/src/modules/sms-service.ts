// وحدة إرسال الرسائل النصية (SMS Service)
// ملاحظة: هذه مجرد واجهة ويمكن ربطها بأي مزود SMS فعلي لاحقًا
export class SMSService {
  async send(to: string, message: string) {
    // هنا يمكن ربط مزود SMS مثل Twilio أو غيره
    console.log(`[SMS] to: ${to} | message: ${message}`);
    return true;
  }
}
