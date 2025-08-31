/**
 * Script para corrigir credenciais do WordPress
 * Permite testar diferentes credenciais e atualizar no banco
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');

// Credenciais para testar (substitua pelas corretas)
const CREDENTIALS_TO_TEST = [
  { username: 'sativar_app', password: 'Sativar2025!' },
  { username: 'admin', password: 'Sativar2025!' },
  { username: 'sativar', password: 'Sativar2025!' },
  { username: 'wordpress', password: 'Sativar2025!' },
  // Adicione outras credenciais conhecidas aqui
];

async function testWordPressAuth(username, password) {
  return new Promise((resolve) => {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    
    const options = {
      hostname: 'teste.sativar.com.br',
      port: 443,
      path: '/wp-json/wp/v2/users/me',
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'SATIZAP-CredentialTest/1.0'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const userData = JSON.parse(data);
            resolve({
              success: true,
              user: userData,
              username,
              password
            });
          } catch (e) {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        } else {
          resolve({ 
            success: false, 
            status: res.statusCode,
            error: data 
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
    
    req.end();
  });
}

async function testPatientEndpoint(username, password) {
  return new Promise((resolve) => {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    const testPhone = '85996201636';
    
    const options = {
      hostname: 'teste.sativar.com.br',
      port: 443,
      path: `/wp-json/sativar/v1/clientes?acf_filters[telefone]=${testPhone}`,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'SATIZAP-PatientTest/1.0'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const patients = JSON.parse(data);
            resolve({
              success: true,
              found: Array.isArray(patients) && patients.length > 0,
              count: Array.isArray(patients) ? patients.length : 0,
              data: patients
            });
          } catch (e) {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        } else {
          resolve({ 
            success: false, 
            status: res.statusCode,
            error: data 
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
    
    req.end();
  });
}

async function updateCredentialsInDB(username, password) {
  const prisma = new PrismaClient();
  
  try {
    const association = await prisma.association.findFirst({
      where: { subdomain: 'sativar' }
    });
    
    if (!association) {
      throw new Error('Associação não encontrada');
    }
    
    const newAuth = {
      username,
      password,
      apiKey: 'sativar_api_key_2025'
    };
    
    await prisma.association.update({
      where: { id: association.id },
      data: {
        wordpressAuth: JSON.stringify(newAuth)
      }
    });
    
    console.log('✅ Credenciais atualizadas no banco de dados');
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar credenciais:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🔧 CORREÇÃO DE CREDENCIAIS DO WORDPRESS');
  console.log('=====================================');
  
  console.log('\n1. Testando credenciais disponíveis...');
  
  let validCredentials = null;
  
  for (const cred of CREDENTIALS_TO_TEST) {
    console.log(`\nTestando: ${cred.username}`);
    
    const authResult = await testWordPressAuth(cred.username, cred.password);
    
    if (authResult.success) {
      console.log(`✅ Autenticação OK: ${authResult.user.name}`);
      console.log(`   Roles: ${authResult.user.roles?.join(', ')}`);
      
      // Testar endpoint de pacientes
      console.log('   Testando endpoint de pacientes...');
      const patientResult = await testPatientEndpoint(cred.username, cred.password);
      
      if (patientResult.success) {
        console.log(`   ✅ Endpoint OK: ${patientResult.count} pacientes encontrados`);
        if (patientResult.found) {
          console.log(`   ✅ Paciente teste encontrado!`);
        }
        
        validCredentials = cred;
        break;
      } else {
        console.log(`   ❌ Endpoint falhou: ${patientResult.error}`);
      }
    } else {
      console.log(`❌ Falha: ${authResult.error}`);
    }
  }
  
  if (validCredentials) {
    console.log(`\n✅ CREDENCIAIS VÁLIDAS ENCONTRADAS:`);
    console.log(`   Username: ${validCredentials.username}`);
    console.log(`   Password: ${validCredentials.password}`);
    
    console.log('\n2. Atualizando no banco de dados...');
    const updated = await updateCredentialsInDB(validCredentials.username, validCredentials.password);
    
    if (updated) {
      console.log('\n✅ CORREÇÃO COMPLETA!');
      console.log('\n🧪 Para testar, execute:');
      console.log('   node scripts/fase1-diagnostico-final.js');
      console.log('\n📋 Próximos passos:');
      console.log('   1. Validar busca de pacientes');
      console.log('   2. Implementar Fase 2: Refatoração da Lógica');
      console.log('   3. Implementar Fase 3: Interface de Confirmação');
    }
  } else {
    console.log('\n❌ NENHUMA CREDENCIAL VÁLIDA ENCONTRADA');
    console.log('\n🔧 AÇÕES NECESSÁRIAS:');
    console.log('   1. Acessar WordPress Admin (https://teste.sativar.com.br/wp-admin)');
    console.log('   2. Ir em Usuários > Perfil');
    console.log('   3. Criar Application Password');
    console.log('   4. Atualizar credenciais neste script');
    console.log('   5. Executar novamente');
  }
}

// Função para testar credenciais manualmente
async function testManualCredentials(username, password) {
  console.log(`\n🧪 Testando credenciais manuais: ${username}`);
  
  const authResult = await testWordPressAuth(username, password);
  if (authResult.success) {
    console.log('✅ Autenticação OK');
    
    const patientResult = await testPatientEndpoint(username, password);
    if (patientResult.success) {
      console.log('✅ Endpoint de pacientes OK');
      
      // Atualizar no banco
      await updateCredentialsInDB(username, password);
      return true;
    }
  }
  
  console.log('❌ Credenciais inválidas');
  return false;
}

if (require.main === module) {
  // Verificar se foram passadas credenciais como argumentos
  const args = process.argv.slice(2);
  if (args.length === 2) {
    const [username, password] = args;
    testManualCredentials(username, password);
  } else {
    main();
  }
}

module.exports = { 
  testWordPressAuth, 
  testPatientEndpoint, 
  updateCredentialsInDB,
  testManualCredentials 
};