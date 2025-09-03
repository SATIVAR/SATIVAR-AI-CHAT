/**
 * Script para buscar credenciais do WordPress no banco de dados
 */

const { PrismaClient } = require('@prisma/client');

async function getWordPressCredentials() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Buscando credenciais do WordPress no banco...');
    
    // Buscar associação sativar
    const association = await prisma.association.findFirst({
      where: {
        subdomain: 'sativar'
      }
    });
    
    if (!association) {
      console.log('❌ Associação "sativar" não encontrada');
      return null;
    }
    
    console.log(`✅ Associação encontrada: ${association.name}`);
    console.log(`   URL WordPress: ${association.wordpressUrl}`);
    
    if (association.wordpressAuth) {
      const auth = typeof association.wordpressAuth === 'string' 
        ? JSON.parse(association.wordpressAuth) 
        : association.wordpressAuth;
      
      console.log('✅ Credenciais encontradas:');
      console.log(`   Username: ${auth.username}`);
      console.log(`   Password: ${auth.password ? '[CONFIGURADA]' : '[NÃO CONFIGURADA]'}`);
      
      return {
        username: auth.username,
        password: auth.password,
        url: association.wordpressUrl
      };
    }
    
    if (association.apiConfig) {
      console.log('✅ API Config encontrada (criptografada)');
      // Para este diagnóstico, vamos tentar descriptografar
      try {
        const { decryptApiConfig } = require('../src/lib/crypto');
        const apiConfig = await decryptApiConfig(association.apiConfig);
        
        if (apiConfig.credentials?.applicationPassword) {
          console.log('✅ Credenciais Application Password encontradas:');
          console.log(`   Username: ${apiConfig.credentials.applicationPassword.username}`);
          console.log(`   Password: [CONFIGURADA]`);
          
          return {
            username: apiConfig.credentials.applicationPassword.username,
            password: apiConfig.credentials.applicationPassword.password,
            url: association.wordpressUrl
          };
        }
      } catch (decryptError) {
        console.log('❌ Erro ao descriptografar apiConfig:', decryptError.message);
      }
    }
    
    console.log('❌ Nenhuma credencial válida encontrada');
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao buscar credenciais:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  getWordPressCredentials().then(credentials => {
    if (credentials) {
      console.log('\n📋 Para usar no diagnóstico:');
      console.log(`WP_USERNAME=${credentials.username}`);
      console.log(`WP_PASSWORD=${credentials.password}`);
      console.log(`WP_URL=${credentials.url}`);
    }
  });
}

module.exports = { getWordPressCredentials };