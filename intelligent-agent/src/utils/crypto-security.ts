import crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Logger } from '../modules/logger';

const logger = Logger.getInstance();

/**
 * Password security utilities
 */
export class PasswordSecurity {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MIN_PASSWORD_LENGTH = 8;

  /**
   * Hash password باستخدام bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    if (password.length < this.MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters`);
    }

    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * التحقق من صحة password
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * التحقق من قوة password
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    // Length
    if (password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters`);
    } else {
      score += Math.min(password.length - this.MIN_PASSWORD_LENGTH, 10);
    }

    // Uppercase
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 10;
    }

    // Lowercase
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 10;
    }

    // Numbers
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 10;
    }

    // Special characters
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
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
  static generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }

    return password;
  }
}

/**
 * JWT Token utilities
 */
export class TokenSecurity {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
  private static readonly JWT_EXPIRY = '24h';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Create access token
   */
  static createAccessToken(payload: object): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRY,
      issuer: 'alawael-erp',
      audience: 'alawael-users',
    });
  }

  /**
   * Create refresh token
   */
  static createRefreshToken(payload: object): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      issuer: 'alawael-erp',
      audience: 'alawael-users',
    });
  }

  /**
   * Verify token
   */
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'alawael-erp',
        audience: 'alawael-users',
      });
    } catch (error) {
      logger.error('Token verification failed', { token: token.substring(0, 20) }, error as Error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Decode token without verification
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded: any = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }
}

/**
 * Encryption utilities
 */
export class EncryptionSecurity {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

  /**
   * Encrypt data
   */
  static encrypt(data: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.ENCRYPTION_KEY, 'hex');

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

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
  static decrypt(encrypted: string, iv: string, authTag: string): string {
    const key = Buffer.from(this.ENCRYPTION_KEY, 'hex');

    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash data (one-way)
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export default {
  PasswordSecurity,
  TokenSecurity,
  EncryptionSecurity,
};
