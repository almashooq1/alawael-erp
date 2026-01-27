"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWebhook = sendWebhook;
const axios_1 = __importDefault(require("axios"));
async function sendWebhook({ url, event, data }) {
    await axios_1.default.post(url, { event, data });
}
