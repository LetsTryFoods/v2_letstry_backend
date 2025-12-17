import * as crypto from 'crypto';

export class EncryptionUtil {
  static encryptWithPublicKey(data: string, publicKey: string): string {
    try {
      const pemKey = this.formatPublicKey(publicKey);
      
      const buffer = Buffer.from(data, 'utf8');
      const encrypted = crypto.publicEncrypt(
        {
          key: pemKey,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        buffer,
      );
      
      return encrypted.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  private static formatPublicKey(publicKey: string): string {
    if (publicKey.includes('-----BEGIN')) {
      return publicKey;
    }

    const formattedKey = publicKey.match(/.{1,64}/g)?.join('\n') || publicKey;
    return `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
  }

  static generateChecksum(data: string, secretKey: string): string {
    return crypto
      .createHmac('sha256', secretKey)
      .update(data)
      .digest('hex');
  }
}
