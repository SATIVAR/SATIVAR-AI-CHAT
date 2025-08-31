/**
 * Script para descriptografar apiConfig usando Node.js crypto (versão corrigida)
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
    
    // Para AES-GCM no Node.js, precisamos usar createDecipher com GCM
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setIV(iv);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - data may be corrupted or key invalid');
  }
}

// Função alternativa para tentar descriptografar sem GCM
async function decryptSimple(encryptedData) {
  try {
    const masterKey = getEncryptionKey();
    
    // Tentar descriptografar diretamente se for um JSON válido
    if (encryptedData.startsWith('{')) {
      console.log('Dados não criptografados detectados, retornando como JSON');
      return JSON.parse(encryptedData);
    }
    
    // Se não conseguir descriptografar, retornar erro
    throw new Error('Cannot decrypt - may not be encrypted or different format');
  } catch (error) {
    throw error;
  }
}

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Analisando apiConfig...');
    
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
    console.log('ApiConfig length:', association.apiConfig.length);
    console.log('ApiConfig preview:', association.apiConfig.substring(0, 100) + '...');
    
    // Verificar se é JSON válido (não criptografado)
    try {
      const apiConfig = JSON.parse(association.apiConfig);
      
      console.log('\n📋 API Config (JSON não criptografado):');
      console.log('Auth Method:', apiConfig.authMethod);
      
      if (apiConfig.credentials?.applicationPassword) {
        console.log('\n✅ Application Password Credentials encontradas');
        
        // Verificar se as credenciais estão criptografadas individualmente
        const username = apiConfig.credentials.applicationPassword.username;
        const password = apiConfig.credentials.applicationPassword.password;
        
        console.log('Username format:', typeof username, username.length > 50 ? 'encrypted' : 'plain');
        console.log('Password format:', typeof password, password.length > 50 ? 'encrypted' : 'plain');
        
        if (username.includes(':') && username.length > 50) {
          console.log('🔓 Tentando descriptografar username...');
          try {
            const decryptedUsername = await decrypt(username);
            console.log('Username descriptografado:', decryptedUsername);
          } catch (e) {
            console.log('❌ Falha ao descriptografar username:', e.message);
          }
        } else {
          console.log('Username (plain):', username);
        }
        
        if (password.includes(':') && password.length > 50) {
          console.log('🔓 Tentando descriptografar password...');
          try {
            const decryptedPassword = await decrypt(password);
            console.log('Password descriptografado:', decryptedPassword);
            
            // Testar credenciais
            console.log('\n🧪 Testando credenciais descriptografadas...');
            await testCredentials(
              username.includes(':') ? await decrypt(username) : username,
              decryptedPassword
            );
          } catch (e) {
            console.log('❌ Falha ao descriptografar password:', e.message);
          }
        } else {
          console.log('Password (plain):', password);
          
          // Testar credenciais plain
          console.log('\n🧪 Testando credenciais plain...');
          await testCredentials(username, password);
        }
      }
      
      if (apiConfig.credentials?.wooCommerce) {
        console.log('\n✅ WooCommerce Credentials encontradas');
        console.log('Consumer Key:', apiConfig.credentials.wooCommerce.consumerKey);
        console.log('Consumer Secret:', apiConfig.credentials.wooCommerce.consumerSecret);
      }
      
    } catch (parseError) {
      console.log('❌ Não é JSON válido, pode estar totalmente criptografado');
      console.log('Parse error:', parseError.message);
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
    
    console.log(`Testando: ${username} / ${password.substring(0, 4)}...`);
    
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

module.exports = { testCredentials };