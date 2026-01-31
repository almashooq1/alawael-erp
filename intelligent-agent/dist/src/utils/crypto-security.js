"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionSecurity = exports.TokenSecurity = exports.PasswordSecurity = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcrypt = __importStar(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../modules/logger");
const logger = logger_1.Logger.getInstance();
/**
 * Password security utilities
 */
class PasswordSecurity {
    /**
     * Hash password باستخدام bcrypt
     */
    static async hashPassword(password) {
        if (password.length < this.MIN_PASSWORD_LENGTH) {
            throw new Error(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters`);
        }
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }
    /**
     * التحقق من صحة password
     */
    static async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    /**
     * التحقق من قوة password
     */
    static validatePasswordStrength(password) {
        const errors = [];
        let score = 0;
        // Length
        if (password.length < this.MIN_PASSWORD_LENGTH) {
            errors.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters`);
        }
        else {
            score += Math.min(password.length - this.MIN_PASSWORD_LENGTH, 10);
        }
        // Uppercase
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        else {
            score += 10;
        }
        // Lowercase
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        else {
            score += 10;
        }
        // Numbers
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        else {
            score += 10;
        }
        // Special characters
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        else {
            score += 10;
        }
        // Common passwords
        const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'letmein'];
        if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
            errors.push('Password is too common');
            score = Math.max(0, score - 20);
        }
        return {
            isValid: errors.length === 0,
            errors,
            score: Math.min(100, score),
        };
    }
    /**
     * Generate secure random password
     */
    static generateSecurePassword(length = 16) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto_1.default.randomInt(0, charset.length);
            password += charset[randomIndex];
        }
        return password;
    }
}
exports.PasswordSecurity = PasswordSecurity;
PasswordSecurity.SALT_ROUNDS = 12;
PasswordSecurity.MIN_PASSWORD_LENGTH = 8;
/**
 * JWT Token utilities
 */
class TokenSecurity {
    /**
     * Create access token
     */
    static createAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRY,
            issuer: 'alawael-erp',
            audience: 'alawael-users',
        });
    }
    /**
     * Create refresh token
     */
    static createRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, {
            expiresIn: this.REFRESH_TOKEN_EXPIRY,
            issuer: 'alawael-erp',
            audience: 'alawael-users',
        });
    }
    /**
     * Verify token
     */
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.JWT_SECRET, {
                issuer: 'alawael-erp',
                audience: 'alawael-users',
            });
        }
        catch (error) {
            logger.error('Token verification failed', { token: token.substring(0, 20) }, error);
            throw new Error('Invalid token');
        }
    }
    /**
     * Decode token without verification
     */
    static decodeToken(token) {
        return jsonwebtoken_1.default.decode(token);
    }
    /**
     * Check if token is expired
     */
    static isTokenExpired(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (!decoded || !decoded.exp)
                return true;
            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp < currentTime;
        }
        catch {
            return true;
        }
    }
}
exports.TokenSecurity = TokenSecurity;
TokenSecurity.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
TokenSecurity.JWT_EXPIRY = '24h';
TokenSecurity.REFRESH_TOKEN_EXPIRY = '7d';
/**
 * Encryption utilities
 */
class EncryptionSecurity {
    /**
     * Encrypt data
     */
    static encrypt(data) {
        const iv = crypto_1.default.randomBytes(16);
        const key = Buffer.from(this.ENCRYPTION_KEY, 'hex');
        const cipher = crypto_1.default.createCipheriv(this.ALGORITHM, key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
        };
    }
    /**
     * Decrypt data
     */
    static decrypt(encrypted, iv, authTag) {
        const key = Buffer.from(this.ENCRYPTION_KEY, 'hex');
        const decipher = crypto_1.default.createDecipheriv(this.ALGORITHM, key, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    /**
     * Generate random token
     */
    static generateToken(length = 32) {
        return crypto_1.default.randomBytes(length).toString('hex');
    }
    /**
     * Hash data (one-way)
     */
    static hash(data) {
        return crypto_1.default.createHash('sha256').update(data).digest('hex');
    }
}
exports.EncryptionSecurity = EncryptionSecurity;
EncryptionSecurity.ALGORITHM = 'aes-256-gcm';
EncryptionSecurity.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto_1.default.randomBytes(32).toString('hex');
exports.default = {
    PasswordSecurity,
    TokenSecurity,
    EncryptionSecurity,
};
