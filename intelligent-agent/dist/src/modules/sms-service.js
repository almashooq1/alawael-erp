"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSService = void 0;
// وحدة إرسال الرسائل النصية (SMS Service)
// ملاحظة: هذه مجرد واجهة ويمكن ربطها بأي مزود SMS فعلي لاحقًا
class SMSService {
    async send(to, message) {
        // هنا يمكن ربط مزود SMS مثل Twilio أو غيره
        console.log(`[SMS] to: ${to} | message: ${message}`);
        return true;
    }
}
exports.SMSService = SMSService;
