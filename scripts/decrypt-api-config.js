/**
 * Script para descriptografar apiConfig usando Node.js crypto
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Implementação Node.js da descriptografia (compatível com Web Crypto API)
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    // Para desenvolvimento, usar chave padrão
    console.warn('Usando chave de criptografia padrão para desenvolvimento');
    return 'your-super-secret-32-char-key-here-123456';
  }
  return key;
}

async function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

async function decrypt(encryptedData) {
  try {
    const masterKey = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [saltHex, ivHex, encryptedHex] = parts;
    
    // Convert hex strings back to Buffers
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const key = await deriveKey(masterKey, salt);
    
    const decipher = crypto.createDecipherGCM('aes-256-gcm', key);
    decipher.setIV(iv);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - data may be corrupted or key invalid');
  }
}

async function decryptCredentials(encryptedCredentials) {
  const result = {};
  
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

async function decryptApiConfig(encryptedApiConfig) {
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

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Descriptografando apiConfig...');
    
    const association = await prisma.association.findFirst({
      where: {
        subdomain: 'sativar'
      }
    });
    
    if (!association || !association.apiConfig) {
      console.log('❌ Associação ou apiConfig não encontrado');
      return;
    }
    
    console.log('✅ Associação encontrada:', association.name);
    
    try {
      const apiConfig = await decryptApiConfig(association.apiConfig);
      
      console.log('\n📋 API Config Descriptografado:');
      console.log('Auth Method:', apiConfig.authMethod);
      
      if (apiConfig.credentials?.applicationPassword) {
        console.log('\n✅ Application Password Credentials:');
        console.log('Username:', apiConfig.credentials.applicationPassword.username);
        console.log('Password:', apiConfig.credentials.applicationPassword.password);
        
        // Testar essas credenciais
        console.log('\n🧪 Testando credenciais...');
        await testCredentials(
          apiConfig.credentials.applicationPassword.username,
          apiConfig.credentials.applicationPassword.password
        );
      }
      
      if (apiConfig.credentials?.wooCommerce) {
        console.log('\n✅ WooCommerce Credentials:');
        console.log('Consumer Key:', apiConfig.credentials.wooCommerce.consumerKey);
        console.log('Consumer Secret:', apiConfig.credentials.wooCommerce.consumerSecret);
      }
      
    } catch (decryptError) {
      console.log('❌ Erro ao descriptografar:', decryptError.message);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function testCredentials(username, password) {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    
    const options = {
      hostname: 'teste.sativar.com.br',
      port: 443,
      path: '/wp-json/wp/v2/users/me',
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'SATIZAP-Test/1.0'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const userData = JSON.parse(data);
          console.log('✅ Credenciais válidas!');
          console.log(`   Usuário: ${userData.name}`);
          console.log(`   Roles: ${userData.roles?.join(', ')}`);
          resolve(true);
        } else {
          console.log(`❌ Credenciais inválidas - Status: ${res.statusCode}`);
          console.log(`   Resposta: ${data}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Erro na requisição: ${error.message}`);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      console.log('❌ Timeout na requisição');
      resolve(false);
    });
    
    req.end();
  });
}

if (require.main === module) {
  main();
}

module.exports = { decryptApiConfig, testCredentials };