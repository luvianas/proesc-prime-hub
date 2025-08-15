#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando bateria completa de testes...\n');

// Instalar playwright browsers se necessário
try {
  console.log('📦 Instalando browsers do Playwright...');
  execSync('npx playwright install --with-deps', { stdio: 'inherit' });
} catch (error) {
  console.warn('⚠️ Aviso ao instalar browsers:', error.message);
}

// Executar testes em ordem
const testSuites = [
  { name: 'Autenticação', file: 'tests/e2e/auth.spec.ts' },
  { name: 'CRUD Admin', file: 'tests/e2e/admin-crud.spec.ts' },
  { name: 'Fluxos Gestor', file: 'tests/e2e/gestor-flows.spec.ts' },
  { name: 'Performance', file: 'tests/performance/load-test.spec.ts' }
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failedSuites = [];

for (const suite of testSuites) {
  console.log(`\n🧪 Executando: ${suite.name}`);
  console.log('='.repeat(50));
  
  try {
    const result = execSync(`npx playwright test ${suite.file} --reporter=line`, { 
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    console.log(result);
    
    // Parse resultados
    const matches = result.match(/(\d+) passed.*?(\d+) failed/);
    if (matches) {
      const passed = parseInt(matches[1]);
      const failed = parseInt(matches[2]);
      totalTests += passed + failed;
      passedTests += passed;
      failedTests += failed;
    }
    
    console.log(`✅ ${suite.name} - Concluído`);
    
  } catch (error) {
    console.error(`❌ ${suite.name} - Falhou`);
    console.error(error.stdout);
    console.error(error.stderr);
    failedSuites.push(suite.name);
    failedTests++;
  }
}

// Relatório final
console.log('\n' + '='.repeat(60));
console.log('📊 RELATÓRIO FINAL DE TESTES');
console.log('='.repeat(60));
console.log(`Total de testes: ${totalTests}`);
console.log(`✅ Passou: ${passedTests}`);
console.log(`❌ Falhou: ${failedTests}`);
console.log(`📈 Taxa de sucesso: ${totalTests > 0 ? ((passedTests/totalTests)*100).toFixed(1) : 0}%`);

if (failedSuites.length > 0) {
  console.log(`\n🚨 Suítes com falhas: ${failedSuites.join(', ')}`);
}

console.log('\n🎯 Próximos passos:');
console.log('1. Analisar falhas detectadas');
console.log('2. Corrigir bugs encontrados');
console.log('3. Re-executar testes');
console.log('4. Repetir até 100% de sucesso');

// Exit code baseado nos resultados
process.exit(failedTests > 0 ? 1 : 0);