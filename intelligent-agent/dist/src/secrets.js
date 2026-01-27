"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Secrets = void 0;
// إدارة الأسرار (Secrets Management) - نموذج بسيط
const fs_1 = __importDefault(require("fs"));
class Secrets {
    static get(key) {
        // مثال: قراءة الأسرار من ملف محلي (يمكن ربطه مع Vault أو Azure Key Vault لاحقًا)
        if (fs_1.default.existsSync('.secrets.json')) {
            const secrets = JSON.parse(fs_1.default.readFileSync('.secrets.json', 'utf-8'));
            return secrets[key];
        }
        return process.env[key];
    }
}
exports.Secrets = Secrets;
