"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scheduler = void 0;
// وحدة جدولة المهام (Scheduler)
const node_cron_1 = __importDefault(require("node-cron"));
// وحدة جدولة المهام (Scheduler)
class Scheduler {
    schedule(delayMs, task) {
        setTimeout(task, delayMs);
    }
    repeat(intervalMs, task) {
        setInterval(task, intervalMs);
    }
    scheduleCron(cronExpr, task) {
        node_cron_1.default.schedule(cronExpr, task);
    }
}
exports.Scheduler = Scheduler;
