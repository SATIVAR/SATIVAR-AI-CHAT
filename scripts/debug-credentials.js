/**
 * Script para debugar credenciais do WordPress
 */

const { PrismaClient } = require('@prisma/client');

async function debugCredentials() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugando credenciais...');
    
    const association = await prisma.association.findFirst({
      where: {
        subdomain: 'sativar'
      }
    });
    
    if (!association) {
      console.log('❌ Associação não encontrada');
      return;
    }
    
    console.log('✅ Associação encontrada:', association.name);
    console.log('WordPress URL:', association.wordpressUrl);
    
    if (association.wordpressAuth) {
      console.log('\n📋 WordPress Auth (Raw):');
      console.log(association.wordpressAuth);
      
      try {
        const auth = typeof association.wordpressAuth === 'string' 
          ? JSON.parse(association.wordpressAuth) 
          : association.wordpressAuth;
        
        console.log('\n📋 WordPress Auth (Parsed):');
        console.log('Username:', auth.username);
        console.log('Password:', auth.password ? `[${auth.password.length} chars]` : '[EMPTY]');
        console.log('API Key:', auth.apiKey ? `[${auth.apiKey.length} chars]` : '[EMPTY]');
      } catch (parseError) {
        console.log('❌ Erro ao fazer parse do wordpressAuth:', parseError.message);
      }
    }
    
    if (association.apiConfig) {
      console.log('\n📋 API Config (Encrypted):');
      console.log('Length:', association.apiConfig.length);
      console.log('First 50 chars:', association.apiConfig.substring(0, 50) + '...');
      
      try {
        const { decryptApiConfig } = require('../src/lib/crypto');
        const apiConfig = await decryptApiConfig(association.apiConfig);
        
        console.log('\n📋 API Config (Decrypted):');
        console.log('Auth Method:', apiConfig.authMethod);
        
        if (apiConfig.credentials?.applicationPassword) {
          console.log('App Password Username:', apiConfig.credentials.applicationPassword.username);
          console.log('App Password Password:', apiConfig.credentials.applicationPassword.password ? `[${apiConfig.credentials.applicationPassword.password.length} chars]` : '[EMPTY]');
        }
        
        if (apiConfig.credentials?.wooCommerce) {
          console.log('WooCommerce Consumer Key:', apiConfig.credentials.wooCommerce.consumerKey ? `[${apiConfig.credentials.wooCommerce.consumerKey.length} chars]` : '[EMPTY]');
          console.log('WooCommerce Consumer Secret:', apiConfig.credentials.wooCommerce.consumerSecret ? `[${apiConfig.credentials.wooCommerce.consumerSecret.length} chars]` : '[EMPTY]');
        }
      } catch (decryptError) {
        console.log('❌ Erro ao descriptografar apiConfig:', decryptError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  debugCredentials();
}

module.exports = { debugCredentials };