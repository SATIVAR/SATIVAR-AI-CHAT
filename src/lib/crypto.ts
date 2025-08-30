/**
 * Encryption utilities for secure storage of sensitive data like API credentials
 * Uses Web Crypto API for compatibility with Edge Runtime
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // For AES-GCM
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Gets the encryption key from environment variable
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    // For development, use a default key (should be replaced in production)
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using default encryption key for development. Set ENCRYPTION_KEY in production!');
      return 'your-super-secret-32-char-key-here-123456';
    }
    throw new Error('ENCRYPTION_KEY environment variable is required for credential encryption');
  }
  return key;
}

/**
 * Derives a key from the master password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts sensitive data using AES-GCM (Web Crypto API)
 * @param text - The text to encrypt
 * @returns Encrypted data in format: salt:iv:encrypted
 */
export async function encrypt(text: string): Promise<string> {
  try {
    const masterKey = getEncryptionKey();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(masterKey, salt);
    
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    );
    
    // Convert to hex strings
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Format: salt:iv:encrypted
    return [saltHex, ivHex, encryptedHex].join(':');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data encrypted with encrypt()
 * @param encryptedData - Data in format: salt:iv:encrypted
 * @returns The decrypted text
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    const masterKey = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [saltHex, ivHex, encryptedHex] = parts;
    
    // Convert hex strings back to Uint8Arrays
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const encrypted = new Uint8Array(encryptedHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    
    const key = await deriveKey(masterKey, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - data may be corrupted or key invalid');
  }
}

/**
 * Encrypts API credentials object
 */
export async function encryptCredentials(credentials: { 
  applicationPassword?: { username: string; password: string };
  wooCommerce?: { consumerKey: string; consumerSecret: string };
}): Promise<{ 
  applicationPassword?: { username: string; password: string };
  wooCommerce?: { consumerKey: string; consumerSecret: string };
}> {
  const result: any = {};
  
  if (credentials.applicationPassword) {
    result.applicationPassword = {
      username: await encrypt(credentials.applicationPassword.username),
      password: await encrypt(credentials.applicationPassword.password)
    };
  }
  
  if (credentials.wooCommerce) {
    result.wooCommerce = {
      consumerKey: await encrypt(credentials.wooCommerce.consumerKey),
      consumerSecret: await encrypt(credentials.wooCommerce.consumerSecret)
    };
  }
  
  return result;
}

/**
 * Decrypts API credentials object
 */
export async function decryptCredentials(encryptedCredentials: { 
  applicationPassword?: { username: string; password: string };
  wooCommerce?: { consumerKey: string; consumerSecret: string };
}): Promise<{ 
  applicationPassword?: { username: string; password: string };
  wooCommerce?: { consumerKey: string; consumerSecret: string };
}> {
  const result: any = {};
  
  if (encryptedCredentials.applicationPassword) {
    result.applicationPassword = {
      username: await decrypt(encryptedCredentials.applicationPassword.username),
      password: await decrypt(encryptedCredentials.applicationPassword.password)
    };
  }
  
  if (encryptedCredentials.wooCommerce) {
    result.wooCommerce = {
      consumerKey: await decrypt(encryptedCredentials.wooCommerce.consumerKey),
      consumerSecret: await decrypt(encryptedCredentials.wooCommerce.consumerSecret)
    };
  }
  
  return result;
}

/**
 * Safely encrypts an entire apiConfig object
 */
export async function encryptApiConfig(apiConfig: {
  authMethod: 'applicationPassword' | 'wooCommerce';
  credentials: {
    applicationPassword?: { username: string; password: string };
    wooCommerce?: { consumerKey: string; consumerSecret: string };
  };
  endpoints: { [key: string]: string | undefined };
}): Promise<string> {
  const encryptedConfig = {
    authMethod: apiConfig.authMethod, // Not sensitive
    credentials: await encryptCredentials(apiConfig.credentials),
    endpoints: apiConfig.endpoints // Endpoints are not sensitive, keep as-is
  };
  
  return JSON.stringify(encryptedConfig);
}

/**
 * Safely decrypts an entire apiConfig object
 */
export async function decryptApiConfig(encryptedApiConfig: string): Promise<{
  authMethod: 'applicationPassword' | 'wooCommerce';
  credentials: {
    applicationPassword?: { username: string; password: string };
    wooCommerce?: { consumerKey: string; consumerSecret: string };
  };
  endpoints: { [key: string]: string | undefined };
}> {
  try {
    const parsed = JSON.parse(encryptedApiConfig);
    
    return {
      authMethod: parsed.authMethod || 'applicationPassword',
      credentials: await decryptCredentials(parsed.credentials || {}),
      endpoints: parsed.endpoints || {}
    };
  } catch (error) {
    console.error('Error decrypting API config:', error);
    throw new Error('Failed to decrypt API configuration');
  }
}