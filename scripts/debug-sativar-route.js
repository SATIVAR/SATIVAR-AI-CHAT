#!/usr/bin/env node

/**
 * Debug script specifically for the /sativar route
 * This will help us understand why tenant headers are not being set
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:9002';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(url, BASE_URL);
    
    const requestOptions = {
      hostname: fullUrl.hostname,
      port: fullUrl.port,
      path: fullUrl.pathname + fullUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Sativar-Route-Debug/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          url: fullUrl.toString()
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function debugSativarRoute() {
  console.log('🔍 DEBUG: Analisando rota /sativar em detalhes\n');
  console.log('═'.repeat(60));
  
  try {
    const response = await makeRequest('/sativar');
    
    console.log('📊 RESPOSTA DA ROTA /sativar:');
    console.log(`   Status Code: ${response.statusCode}`);
    console.log(`   URL Final: ${response.url}`);
    console.log('');
    
    console.log('🏷️  HEADERS DA RESPOSTA:');
    Object.entries(response.headers).forEach(([key, value]) => {
      const isTenantHeader = key.toLowerCase().startsWith('x-tenant');
      const isDevHeader = key.toLowerCase().startsWith('x-dev');
      const isImportant = isTenantHeader || isDevHeader || 
                         ['content-type', 'location', 'set-cookie'].includes(key.toLowerCase());
      
      const prefix = isTenantHeader ? '🎯 TENANT' : 
                    isDevHeader ? '🔧 DEV' : 
                    isImportant ? '📋 INFO' : '   ';
      
      console.log(`   ${prefix}: ${key} = ${value}`);
    });
    console.log('');
    
    // Analyze tenant headers specifically
    const tenantHeaders = Object.entries(response.headers)
      .filter(([key]) => key.toLowerCase().startsWith('x-tenant'));
    
    const devHeaders = Object.entries(response.headers)
      .filter(([key]) => key.toLowerCase().startsWith('x-dev'));
    
    console.log('🎯 ANÁLISE DE HEADERS DE TENANT:');
    if (tenantHeaders.length > 0) {
      console.log('   ✅ Headers de tenant encontrados:');
      tenantHeaders.forEach(([key, value]) => {
        console.log(`      ${key}: ${value}`);
      });
    } else {
      console.log('   ❌ Nenhum header de tenant encontrado');
      console.log('   💡 Isso indica que o middleware não está definindo contexto de tenant');
    }
    console.log('');
    
    console.log('🔧 ANÁLISE DE HEADERS DE DESENVOLVIMENTO:');
    if (devHeaders.length > 0) {
      console.log('   ✅ Headers de desenvolvimento encontrados:');
      devHeaders.forEach(([key, value]) => {
        console.log(`      ${key}: ${value}`);
      });
    } else {
      console.log('   ❌ Nenhum header de desenvolvimento encontrado');
      console.log('   💡 Isso pode indicar que o middleware não está em modo de debug');
    }
    console.log('');
    
    // Analyze response body for clues
    console.log('📄 ANÁLISE DO CONTEÚDO DA RESPOSTA:');
    const bodyLength = response.body.length;
    console.log(`   Tamanho do conteúdo: ${bodyLength} bytes`);
    
    // Check for common patterns
    const patterns = {
      'Associação não encontrada': response.body.includes('Associação não encontrada'),
      'Association not found': response.body.includes('Association not found'),
      'Error': response.body.toLowerCase().includes('error'),
      'Erro': response.body.toLowerCase().includes('erro'),
      'SATIVAR': response.body.includes('SATIVAR'),
      'sativar': response.body.includes('sativar'),
      'Hero Section': response.body.includes('Hero') || response.body.includes('hero'),
      'Next.js': response.body.includes('Next.js') || response.body.includes('__NEXT_DATA__'),
      'React': response.body.includes('React') || response.body.includes('react')
    };
    
    console.log('   Padrões encontrados no conteúdo:');
    Object.entries(patterns).forEach(([pattern, found]) => {
      const status = found ? '✅' : '❌';
      console.log(`      ${status} ${pattern}`);
    });
    console.log('');
    
    // Check if it's a redirect
    if (response.statusCode >= 300 && response.statusCode < 400) {
      console.log('🔄 REDIRECIONAMENTO DETECTADO:');
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Location: ${response.headers.location || 'N/A'}`);
      console.log('   💡 A rota está sendo redirecionada, não carregada diretamente');
      console.log('');
    }
    
    // Provide diagnosis
    console.log('🩺 DIAGNÓSTICO:');
    
    if (tenantHeaders.length > 0) {
      console.log('   ✅ Middleware está funcionando e definindo contexto de tenant');
      console.log('   ✅ A associação "sativar" foi encontrada no banco de dados');
      console.log('   ✅ Headers de tenant estão sendo definidos corretamente');
    } else if (devHeaders.length > 0) {
      console.log('   ⚠️  Middleware está em modo de desenvolvimento/fallback');
      console.log('   ⚠️  Possível problema na busca da associação no banco');
      
      if (response.headers['x-dev-tenant-missing']) {
        console.log('   🔍 Header x-dev-tenant-missing indica que tenant não foi encontrado');
      }
      if (response.headers['x-dev-fallback-mode']) {
        console.log('   🔍 Header x-dev-fallback-mode indica modo de fallback ativo');
      }
      if (response.headers['x-dev-middleware-error']) {
        console.log('   🔍 Header x-dev-middleware-error indica erro no middleware');
      }
    } else {
      console.log('   ❌ Middleware pode não estar processando esta rota');
      console.log('   ❌ Ou a rota não requer contexto de tenant');
      
      if (response.statusCode === 200 && patterns['Hero Section']) {
        console.log('   💡 Parece que está carregando Hero Section em vez da página da associação');
      }
    }
    console.log('');
    
    // Recommendations
    console.log('💡 RECOMENDAÇÕES:');
    
    if (tenantHeaders.length === 0) {
      console.log('   1. Verifique se o middleware está sendo executado para /sativar');
      console.log('   2. Verifique se a associação "sativar" existe no banco (npm run db:health)');
      console.log('   3. Verifique os logs do servidor para erros do middleware');
      console.log('   4. Confirme se a rota /sativar está configurada para usar tenant context');
    }
    
    if (devHeaders.length > 0) {
      console.log('   1. Verifique os logs detalhados do middleware no terminal do servidor');
      console.log('   2. Execute npm run db:setup para garantir dados de teste');
      console.log('   3. Verifique se há erros de conexão com banco de dados');
    }
    
    if (response.statusCode >= 300 && response.statusCode < 400) {
      console.log('   1. Siga o redirecionamento para ver onde a rota está indo');
      console.log('   2. Verifique se há regras de redirecionamento no middleware');
    }
    
    console.log('');
    console.log('🔚 Análise completa da rota /sativar');
    
  } catch (error) {
    console.error('❌ Erro ao analisar rota /sativar:', error.message);
    console.log('');
    console.log('💡 Possíveis causas:');
    console.log('   1. Servidor não está rodando em localhost:9002');
    console.log('   2. Problema de conectividade');
    console.log('   3. Servidor está com erro interno');
    console.log('');
    console.log('🔧 Execute "npm run dev" para iniciar o servidor');
  }
}

// Run the debug
debugSativarRoute();