"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
// وحدة إرسال البريد الإلكتروني (Email Service)
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor(host, port, user, pass) {
        this.transporter = nodemailer_1.default.createTransport({
            host,
            port,
            secure: port === 465, // true for 465, false for other ports
            auth: { user, pass }
        });
    }
    async send(to, subject, text) {
        return this.transporter.sendMail({
            from: 'agent@system.com',
            to,
            subject,
            text
        });
    }
}
exports.EmailService = EmailService;
