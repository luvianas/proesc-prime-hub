const { execSync } = require('child_process');

console.log('🔍 Executando teste rápido de autenticação...\n');

try {
  // Execute only auth tests first
  const result = execSync('npx playwright test tests/e2e/auth.spec.ts --reporter=list --timeout=30000', { 
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe']
  });
  
  console.log('✅ Resultado dos testes de autenticação:');
  console.log(result);
  
} catch (error) {
  console.log('❌ Falhas detectadas nos testes de autenticação:');
  console.log('STDOUT:', error.stdout);
  console.log('STDERR:', error.stderr);
  
  // Analyze the errors to identify main issues
  const output = error.stdout + error.stderr;
  
  if (output.includes('Cannot find module')) {
    console.log('🔧 Problema: Dependências faltando');
  }
  
  if (output.includes('timeout') || output.includes('Timeout')) {
    console.log('🔧 Problema: Timeout - aplicação pode não estar executando');
  }
  
  if (output.includes('navigation') || output.includes('Network')) {
    console.log('🔧 Problema: Falhas de navegação ou rede');
  }
  
  if (output.includes('selector') || output.includes('locator')) {
    console.log('🔧 Problema: Elementos UI não encontrados');
  }
}

console.log('\n🎯 Verificando se o servidor está rodando...');
try {
  const fetch = require('node:fetch');
  fetch('http://localhost:5173')
    .then(res => console.log('✅ Servidor respondeu:', res.status))
    .catch(err => console.log('❌ Servidor não está rodando:', err.message));
} catch (e) {
  console.log('❌ Não foi possível verificar o servidor');
}