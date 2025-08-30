#!/usr/bin/env node

/**
 * Test script to debug tenant slug extraction
 */

// Simulate the tenant slug extraction logic
function testTenantExtraction() {
  console.log('🔍 Testando extração de tenant slug para /sativar\n');
  
  // Simulate the middleware logic
  const pathname = '/sativar';
  const host = 'localhost:9002';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  const isDevelopment = process.env.NODE_ENV === 'development' || (isLocalhost && !process.env.NODE_ENV);
  
  console.log('📊 Condições iniciais:');
  console.log(`   pathname: ${pathname}`);
  console.log(`   host: ${host}`);
  console.log(`   isLocalhost: ${isLocalhost}`);
  console.log(`   isDevelopment: ${isDevelopment}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log('');
  
  let tenantSlug = null;
  let isDynamicRoute = false;
  
  if (isLocalhost && isDevelopment) {
    const pathSegments = pathname.split('/').filter(segment => segment.length > 0);
    const reservedPaths = ['satizap', 'admin', 'api', 'association-not-found', 'atendimento'];
    
    console.log('🔍 Análise de segmentos do path:');
    console.log(`   pathSegments: [${pathSegments.map(s => `"${s}"`).join(', ')}]`);
    console.log(`   reservedPaths: [${reservedPaths.map(s => `"${s}"`).join(', ')}]`);
    console.log('');
    
    if (pathSegments.length > 0) {
      const potentialSlug = pathSegments[0];
      const isReservedPath = reservedPaths.includes(potentialSlug);
      const regexTest = /^[a-z0-9-]+$/.test(potentialSlug);
      const lengthValid = potentialSlug.length >= 3;
      
      console.log('🧪 Validação do slug potencial:');
      console.log(`   potentialSlug: "${potentialSlug}"`);
      console.log(`   isReservedPath: ${isReservedPath}`);
      console.log(`   regexTest: ${regexTest} (padrão: /^[a-z0-9-]+$/)`);
      console.log(`   lengthValid: ${lengthValid} (>= 3 chars)`);
      console.log('');
      
      if (!isReservedPath && regexTest && lengthValid) {
        tenantSlug = potentialSlug;
        isDynamicRoute = true;
        console.log('✅ Tenant slug extraído com sucesso!');
        console.log(`   tenantSlug: "${tenantSlug}"`);
        console.log(`   isDynamicRoute: ${isDynamicRoute}`);
      } else {
        const failureReason = isReservedPath ? 'Reserved path' : 
                             !regexTest ? 'Invalid format' : 
                             'Length too short';
        console.log('❌ Falha na validação do slug:');
        console.log(`   Razão: ${failureReason}`);
      }
    } else {
      console.log('❌ Nenhum segmento de path encontrado');
    }
  } else {
    console.log('❌ Condições não atendidas para extração em desenvolvimento');
    console.log(`   isLocalhost: ${isLocalhost}`);
    console.log(`   isDevelopment: ${isDevelopment}`);
  }
  
  console.log('');
  console.log('🎯 Verificação de contexto de tenant necessário:');
  
  const tenantContextChecks = {
    satizapRoute: pathname.startsWith('/satizap'),
    dynamicRoute: isDynamicRoute,
    tenantInfoApi: pathname.startsWith('/api/tenant-info'),
    patientsApi: pathname.startsWith('/api/patients'),
    messagesApi: pathname.startsWith('/api/messages')
  };
  
  const isRootRoute = pathname === '/';
  const isErrorPage = pathname.startsWith('/association-not-found') || pathname.startsWith('/dev-error');
  const isPublicRoute = isRootRoute || isErrorPage;
  
  const needsTenantContext = Object.values(tenantContextChecks).some(check => check) && !isPublicRoute;
  
  console.log('   tenantContextChecks:');
  Object.entries(tenantContextChecks).forEach(([key, value]) => {
    console.log(`     ${key}: ${value}`);
  });
  console.log('');
  console.log('   Verificações de rota pública:');
  console.log(`     isRootRoute: ${isRootRoute}`);
  console.log(`     isErrorPage: ${isErrorPage}`);
  console.log(`     isPublicRoute: ${isPublicRoute}`);
  console.log('');
  console.log(`   needsTenantContext: ${needsTenantContext}`);
  
  console.log('');
  console.log('📋 RESULTADO FINAL:');
  if (needsTenantContext) {
    console.log('✅ A rota /sativar DEVE ter contexto de tenant');
    console.log('✅ O middleware DEVE processar esta rota');
    console.log('✅ Headers de tenant DEVEM ser definidos');
  } else {
    console.log('❌ A rota /sativar NÃO deve ter contexto de tenant');
    console.log('❌ O middleware NÃO deve processar esta rota');
    console.log('❌ Headers de tenant NÃO serão definidos');
    
    console.log('');
    console.log('🔧 Possíveis problemas:');
    if (!isDynamicRoute) {
      console.log('   • isDynamicRoute é false - verifique extração de tenant slug');
    }
    if (isPublicRoute) {
      console.log('   • Rota está marcada como pública');
    }
    if (!Object.values(tenantContextChecks).some(check => check)) {
      console.log('   • Nenhuma verificação de contexto de tenant passou');
    }
  }
}

// Run the test
testTenantExtraction();