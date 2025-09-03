#!/usr/bin/env node

/**
 * Lista todos os usuários do WordPress para ver os dados disponíveis
 */

const https = require('https');

const BASE_URL = 'https://teste.sativar.com.br';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      ...options,
      timeout: 15000,
      headers: {
        'User-Agent': 'SATIZAP-List/1.0',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...options.headers
      }
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            data: jsonData,
            rawData: data
          });
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            data: null,
            rawData: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function listWordPressUsers() {
  console.log('🔍 LISTANDO USUÁRIOS DO WORDPRESS');
  console.log('=================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log();

  try {
    const response = await makeRequest(`${BASE_URL}/wp-json/wp/v2/users?per_page=20`);
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && Array.isArray(response.data)) {
      console.log(`✅ Encontrados ${response.data.length} usuários:`);
      console.log();
      
      response.data.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || user.display_name || 'Sem nome'}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Username: ${user.username || user.slug || 'N/A'}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        
        if (user.acf) {
          console.log('   📋 Dados ACF:');
          console.log(`      Nome completo: ${user.acf.nome_completo || 'N/A'}`);
          console.log(`      Telefone: ${user.acf.telefone || 'N/A'}`);
          console.log(`      CPF: ${user.acf.cpf || 'N/A'}`);
          console.log(`      Tipo associação: ${user.acf.tipo_associacao || 'N/A'}`);
          console.log(`      Nome responsável: ${user.acf.nome_responsavel || 'N/A'}`);
          console.log(`      CPF responsável: ${user.acf.cpf_responsavel || 'N/A'}`);
          console.log(`      Associado: ${user.acf.associado || 'N/A'}`);
        } else {
          console.log('   ❌ Sem dados ACF');
        }
        console.log();
      });
      
      // Procurar especificamente pelo telefone que estamos testando
      console.log('🔍 PROCURANDO TELEFONE ESPECÍFICO: 85996201636');
      const targetUser = response.data.find(user => 
        user.acf?.telefone === '85996201636' ||
        user.acf?.telefone === '(85) 99620-1636' ||
        user.acf?.telefone?.includes('99620') ||
        user.name?.toLowerCase().includes('henrique')
      );
      
      if (targetUser) {
        console.log('✅ USUÁRIO ENCONTRADO:');
        console.log(`   Nome: ${targetUser.name}`);
        console.log(`   Telefone ACF: ${targetUser.acf?.telefone}`);
        console.log(`   Todos os campos ACF:`, targetUser.acf);
      } else {
        console.log('❌ Usuário com telefone 85996201636 não encontrado');
        console.log('   Telefones encontrados:');
        response.data.forEach(user => {
          if (user.acf?.telefone) {
            console.log(`   - ${user.name}: ${user.acf.telefone}`);
          }
        });
      }
      
    } else {
      console.log(`❌ Erro: ${response.status}`);
      console.log(`Resposta: ${response.rawData}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

if (require.main === module) {
  listWordPressUsers().catch(console.error);
}

module.exports = { listWordPressUsers };