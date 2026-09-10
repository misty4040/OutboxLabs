import { encryptToken, decryptToken } from './crypto';

describe('Phase 2: Crypto Token Encryption Utility', () => {
  it('should successfully encrypt and decrypt OAuth tokens', () => {
    const plainToken = 'test_token_1234567890_abcdefghijklmnopqrstuvwxyz';
    const encrypted = encryptToken(plainToken);

    expect(encrypted).not.toBe(plainToken);
    expect(encrypted.split(':')).toHaveLength(3); // iv:tag:ciphertext

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(plainToken);
  });

  it('should generate different ciphertexts for the same plaintext due to random IV', () => {
    const plainToken = 'test_token_constant';
    const encrypted1 = encryptToken(plainToken);
    const encrypted2 = encryptToken(plainToken);

    expect(encrypted1).not.toBe(encrypted2);
    expect(decryptToken(encrypted1)).toBe(plainToken);
    expect(decryptToken(encrypted2)).toBe(plainToken);
  });

  it('should throw error on invalid ciphertext format', () => {
    expect(() => decryptToken('invalid-format')).toThrow('Invalid encrypted token format');
  });

  it('should fail decryption if auth tag or ciphertext is tampered', () => {
    const plainToken = 'test_token_secret';
    const encrypted = encryptToken(plainToken);
    const [iv, tag, cipher] = encrypted.split(':');
    
    // Tamper with cipher text
    const tamperedCipher = cipher.slice(0, -2) + (cipher.endsWith('a') ? 'b' : 'a');
    const tampered = `${iv}:${tag}:${tamperedCipher}`;

    expect(() => decryptToken(tampered)).toThrow();
  });
});
