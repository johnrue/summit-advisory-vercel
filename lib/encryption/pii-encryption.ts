import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto'

// Production-grade PII encryption service
// Uses AES-256-GCM for authenticated encryption with PBKDF2 key derivation

interface EncryptedData {
  encryptedValue: string
  iv: string
  salt: string
  authTag: string
  algorithm: string
  keyDerivation: string
}

interface EncryptionResult {
  success: boolean
  data?: EncryptedData | string
  error?: string
}

export class PIIEncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyDerivation = 'pbkdf2'
  private readonly iterations = 100000 // PBKDF2 iterations
  private readonly keyLength = 32 // 256 bits
  private readonly ivLength = 16 // 128 bits
  private readonly saltLength = 32 // 256 bits
  private readonly tagLength = 16 // 128 bits

  constructor() {
    // Ensure encryption key is available
    if (!process.env.PII_ENCRYPTION_KEY) {
      throw new Error('PII_ENCRYPTION_KEY environment variable is required')
    }
  }

  /**
   * Get the master encryption key from environment
   */
  private getMasterKey(): string {
    const key = process.env.PII_ENCRYPTION_KEY
    if (!key) {
      throw new Error('PII encryption key not configured')
    }
    if (key.length < 32) {
      throw new Error('PII encryption key must be at least 32 characters')
    }
    return key
  }

  /**
   * Derive encryption key from master key and salt using PBKDF2
   */
  private deriveKey(masterKey: string, salt: Buffer): Buffer {
    return pbkdf2Sync(masterKey, salt, this.iterations, this.keyLength, 'sha256')
  }

  /**
   * Encrypt sensitive PII data
   */
  encrypt(plaintext: string): EncryptionResult {
    try {
      if (!plaintext || plaintext.trim() === '') {
        return { success: false, error: 'Cannot encrypt empty value' }
      }

      const masterKey = this.getMasterKey()
      
      // Generate random salt and IV
      const salt = randomBytes(this.saltLength)
      const iv = randomBytes(this.ivLength)
      
      // Derive encryption key
      const key = this.deriveKey(masterKey, salt)
      
      // Create cipher
      const cipher = createCipheriv(this.algorithm, key, iv)
      
      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      // Get authentication tag
      const authTag = cipher.getAuthTag()
      
      const encryptedData: EncryptedData = {
        encryptedValue: encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm,
        keyDerivation: this.keyDerivation
      }

      return { success: true, data: encryptedData }
    } catch (error) {
      return { 
        success: false, 
        error: `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  /**
   * Decrypt sensitive PII data
   */
  decrypt(encryptedData: EncryptedData): EncryptionResult {
    try {
      if (!encryptedData || !encryptedData.encryptedValue) {
        return { success: false, error: 'Invalid encrypted data' }
      }

      const masterKey = this.getMasterKey()
      
      // Convert hex strings back to buffers
      const salt = Buffer.from(encryptedData.salt, 'hex')
      const iv = Buffer.from(encryptedData.iv, 'hex')
      const authTag = Buffer.from(encryptedData.authTag, 'hex')
      
      // Derive the same key
      const key = this.deriveKey(masterKey, salt)
      
      // Create decipher
      const decipher = createDecipheriv(this.algorithm, key, iv)
      decipher.setAuthTag(authTag)
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedData.encryptedValue, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return { success: true, data: decrypted }
    } catch (error) {
      return { 
        success: false, 
        error: `Decryption failed: ${error instanceof Error ? error.message : 'Invalid or corrupted data'}` 
      }
    }
  }

  /**
   * Encrypt multiple PII fields in an object
   */
  encryptFields<T extends Record<string, any>>(
    data: T, 
    fieldsToEncrypt: (keyof T)[]
  ): { success: boolean; data?: T; error?: string } {
    try {
      const result = { ...data }
      
      for (const field of fieldsToEncrypt) {
        const value = data[field]
        if (value && typeof value === 'string') {
          const encryptResult = this.encrypt(value)
          if (!encryptResult.success) {
            return { success: false, error: `Failed to encrypt field ${String(field)}: ${encryptResult.error}` }
          }
          (result as any)[field] = encryptResult.data
        }
      }

      return { success: true, data: result }
    } catch (error) {
      return { 
        success: false, 
        error: `Bulk encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  /**
   * Decrypt multiple PII fields in an object
   */
  decryptFields<T extends Record<string, any>>(
    data: T, 
    fieldsToDecrypt: (keyof T)[]
  ): { success: boolean; data?: T; error?: string } {
    try {
      const result = { ...data }
      
      for (const field of fieldsToDecrypt) {
        const value = data[field]
        if (value && typeof value === 'object' && 'encryptedValue' in value) {
          const decryptResult = this.decrypt(value as EncryptedData)
          if (!decryptResult.success) {
            return { success: false, error: `Failed to decrypt field ${String(field)}: ${decryptResult.error}` }
          }
          (result as any)[field] = decryptResult.data
        }
      }

      return { success: true, data: result }
    } catch (error) {
      return { 
        success: false, 
        error: `Bulk decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  /**
   * Check if a value is encrypted
   */
  isEncrypted(value: any): value is EncryptedData {
    return (
      value && 
      typeof value === 'object' &&
      'encryptedValue' in value &&
      'iv' in value &&
      'salt' in value &&
      'authTag' in value &&
      'algorithm' in value
    )
  }

  /**
   * Secure comparison for encrypted values (for search/matching)
   * Note: This requires decryption, so use sparingly
   */
  secureCompare(encryptedData: EncryptedData, plaintext: string): boolean {
    const decryptResult = this.decrypt(encryptedData)
    if (!decryptResult.success || typeof decryptResult.data !== 'string') {
      return false
    }
    
    // Use timing-safe comparison to prevent timing attacks
    const decryptedBuffer = Buffer.from(decryptResult.data, 'utf8')
    const plaintextBuffer = Buffer.from(plaintext, 'utf8')
    
    if (decryptedBuffer.length !== plaintextBuffer.length) {
      return false
    }
    
    return timingSafeEqual(decryptedBuffer, plaintextBuffer)
  }

  /**
   * Generate a cryptographically secure random token
   */
  generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex')
  }

  /**
   * Hash sensitive data for indexing (one-way, for search indexing)
   */
  hashForIndex(plaintext: string, salt?: string): string {
    const actualSalt = salt || this.generateSecureToken(16)
    return pbkdf2Sync(plaintext, actualSalt, 10000, 32, 'sha256').toString('hex')
  }

  /**
   * Validate encryption configuration
   */
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!process.env.PII_ENCRYPTION_KEY) {
      errors.push('PII_ENCRYPTION_KEY environment variable is not set')
    } else if (process.env.PII_ENCRYPTION_KEY.length < 32) {
      errors.push('PII_ENCRYPTION_KEY must be at least 32 characters long')
    }

    // Check if running in production with proper key
    if (process.env.NODE_ENV === 'production') {
      if (process.env.PII_ENCRYPTION_KEY === 'development-key-change-in-production') {
        errors.push('Production environment detected with development encryption key')
      }
    }

    return { valid: errors.length === 0, errors }
  }
}

// Export singleton instance
export const piiEncryption = new PIIEncryptionService()

// Utility functions for common PII fields
export const encryptPII = {
  /**
   * Encrypt Social Security Number
   */
  ssn: (ssn: string) => piiEncryption.encrypt(ssn),

  /**
   * Encrypt Date of Birth
   */
  dateOfBirth: (dob: string) => piiEncryption.encrypt(dob),

  /**
   * Encrypt driver license number
   */
  driverLicense: (license: string) => piiEncryption.encrypt(license),

  /**
   * Encrypt full address
   */
  address: (address: string) => piiEncryption.encrypt(address),

  /**
   * Encrypt phone number
   */
  phone: (phone: string) => piiEncryption.encrypt(phone),

  /**
   * Encrypt email for sensitive contexts
   */
  email: (email: string) => piiEncryption.encrypt(email)
}

export const decryptPII = {
  /**
   * Decrypt Social Security Number
   */
  ssn: (encryptedSSN: EncryptedData) => piiEncryption.decrypt(encryptedSSN),

  /**
   * Decrypt Date of Birth
   */
  dateOfBirth: (encryptedDOB: EncryptedData) => piiEncryption.decrypt(encryptedDOB),

  /**
   * Decrypt driver license number
   */
  driverLicense: (encryptedLicense: EncryptedData) => piiEncryption.decrypt(encryptedLicense),

  /**
   * Decrypt full address
   */
  address: (encryptedAddress: EncryptedData) => piiEncryption.decrypt(encryptedAddress),

  /**
   * Decrypt phone number
   */
  phone: (encryptedPhone: EncryptedData) => piiEncryption.decrypt(encryptedPhone),

  /**
   * Decrypt email
   */
  email: (encryptedEmail: EncryptedData) => piiEncryption.decrypt(encryptedEmail)
}