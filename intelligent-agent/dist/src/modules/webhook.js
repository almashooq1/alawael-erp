"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Webhook = void 0;
// وحدة استقبال وإرسال Webhooks
const axios_1 = __importDefault(require("axios"));
class Webhook {
    async send(url, payload) {
        return axios_1.default.post(url, payload);
    }
}
exports.Webhook = Webhook;
