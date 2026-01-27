"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataEncryption = void 0;
// وحدة تشفير البيانات (Data Encryption)
const crypto_1 = __importDefault(require("crypto"));
class DataEncryption {
    constructor(secret) {
        this.ivLength = 16;
        this.key = crypto_1.default.createHash('sha256').update(secret).digest();
    }
    encrypt(plain) {
        const iv = crypto_1.default.randomBytes(this.ivLength);
        const cipher = crypto_1.default.createCipheriv('aes-256-cbc', this.key, iv);
        let encrypted = cipher.update(plain, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return iv.toString('base64') + ':' + encrypted;
    }
    decrypt(data) {
        const [ivStr, encrypted] = data.split(':');
        const iv = Buffer.from(ivStr, 'base64');
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', this.key, iv);
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.DataEncryption = DataEncryption;
