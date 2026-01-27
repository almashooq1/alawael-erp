"use strict";
// src/modules/security.ts
// Advanced Security Module (encryption, threat monitoring)
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Security = void 0;
const crypto = __importStar(require("crypto"));
const threatEvents = [];
function generateId() {
    return 'SEC' + Math.random().toString(36).slice(2, 10);
}
class Security {
    // Encryption utilities
    encrypt(text, key) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return { iv: iv.toString('hex'), data: encrypted };
    }
    decrypt(encrypted, key) {
        const iv = Buffer.from(encrypted.iv, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
        let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    // Threat monitoring
    listThreatEvents() {
        return threatEvents;
    }
    reportThreat(event) {
        const e = {
            id: generateId(),
            detectedAt: new Date().toISOString(),
            resolved: false,
            ...event,
        };
        threatEvents.push(e);
        return e;
    }
    resolveThreat(id) {
        const e = threatEvents.find(e => e.id === id);
        if (!e)
            return null;
        e.resolved = true;
        return e;
    }
}
exports.Security = Security;
