import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const raw = this.configService.get<string>('DATA_ENCRYPTION_KEY');

    if (!raw) {
      throw new Error('DATA_ENCRYPTION_KEY environment variable is not set');
    }

    const keyBuffer = this.parseKey(raw);

    if (keyBuffer.length !== 32) {
      throw new Error('DATA_ENCRYPTION_KEY must resolve to 32 bytes after decoding');
    }

    this.key = keyBuffer;
  }

  encrypt(payload: Record<string, unknown>): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const plaintext = JSON.stringify(payload);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt<T = unknown>(cipherPayload: string): T {
    const buffer = Buffer.from(cipherPayload, 'base64');
    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const ciphertext = buffer.subarray(28);

    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      'utf8',
    );

    return JSON.parse(decrypted) as T;
  }

  private parseKey(raw: string): Buffer {
    try {
      const base64 = Buffer.from(raw, 'base64');
      if (base64.length === 32) {
        return base64;
      }
    } catch (error) {
      this.logger.verbose('DATA_ENCRYPTION_KEY is not base64 encoded, trying hex/hash fallback');
    }

    if (raw.length === 64 && /^[a-fA-F0-9]+$/.test(raw)) {
      return Buffer.from(raw, 'hex');
    }

    // Fallback: derive 32 bytes from arbitrary string using SHA-256
    return createHash('sha256').update(raw).digest();
  }
}

