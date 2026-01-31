"use strict";
/**
 * Simple logger utility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
function createLogger(name) {
    const prefix = `[${name}]`;
    return {
        info: (message, ...args) => {
            console.log(prefix, message, ...args);
        },
        error: (message, ...args) => {
            console.error(prefix, message, ...args);
        },
        warn: (message, ...args) => {
            console.warn(prefix, message, ...args);
        },
        debug: (message, ...args) => {
            if (process.env.NODE_ENV === 'development') {
                console.log(prefix, '[DEBUG]', message, ...args);
            }
        }
    };
}
