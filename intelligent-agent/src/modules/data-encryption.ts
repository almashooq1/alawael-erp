// وحدة تشفير البيانات (Data Encryption)
import crypto from 'crypto';

export class DataEncryption {
  private key: Buffer;
  private ivLength = 16;

  constructor(secret: string) {
    this.key = crypto.createHash('sha256').update(secret).digest();
  }

  encrypt(plain: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
    let encrypted = cipher.update(plain, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
  }

  decrypt(data: string): string {
    const [ivStr, encrypted] = data.split(':');
    const iv = Buffer.from(ivStr, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
