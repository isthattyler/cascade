import { safeStorage } from 'electron'

export function encryptCredentials(plaintext: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const buf = safeStorage.encryptString(plaintext)
    return buf.toString('base64')
  }
  return plaintext
}

export function decryptCredentials(ciphertext: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const buf = Buffer.from(ciphertext, 'base64')
    return safeStorage.decryptString(buf)
  }
  return ciphertext
}
