"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
// وحدة تسجيل الأحداث (Logger)
class Logger {
    info(message, ...args) {
        console.log('[INFO]', message, ...args);
    }
    warn(message, ...args) {
        console.warn('[WARN]', message, ...args);
    }
    error(message, ...args) {
        console.error('[ERROR]', message, ...args);
    }
}
exports.Logger = Logger;
