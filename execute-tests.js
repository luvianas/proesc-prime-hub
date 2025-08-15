#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🔍 EXECUTANDO BATERIA COMPLETA DE TESTES\n');
console.log('Detectando bugs no projeto...\n');

// Função para executar um teste e capturar resultados
function runTest(testFile, testName) {
  return new Promise((resolve) => {
    console.log(`\n📋 Teste: ${testName}`);
    console.log('=' .repeat(50));
    
    const process = spawn('npx', ['playwright', 'test', testFile, '--reporter=list'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });
    
    process.on('close', (code) => {
      const result = {
        testName,
        testFile,
        exitCode: code,
        stdout,
        stderr,
        success: code === 0
      };
      
      if (code === 0) {
        console.log(`✅ ${testName} - PASSOU`);
      } else {
        console.log(`❌ ${testName} - FALHOU (código: ${code})`);
      }
      
      resolve(result);
    });
    
    process.on('error', (error) => {
      console.error(`❌ Erro ao executar ${testName}:`, error.message);
      resolve({
        testName,
        testFile,
        exitCode: -1,
        stdout: '',
        stderr: error.message,
        success: false,
        error: error.message
      });
    });
  });
}

// Executar todos os testes
async function runAllTests() {
  const tests = [
    { file: 'tests/e2e/auth.spec.ts', name: 'Autenticação e Segurança' },
    { file: 'tests/e2e/admin-crud.spec.ts', name: 'CRUD de Usuários e Escolas' },
    { file: 'tests/e2e/gestor-flows.spec.ts', name: 'Fluxos do Gestor' },
    { file: 'tests/performance/load-test.spec.ts', name: 'Performance e Carga' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test.file, test.name);
    results.push(result);
  }
  
  // Gerar relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL - BUGS DETECTADOS');
  console.log('='.repeat(60));
  
  let totalTests = results.length;
  let passedTests = results.filter(r => r.success).length;
  let failedTests = results.filter(r => !r.success).length;
  
  console.log(`\n📈 Resumo:`);
  console.log(`Total de suítes: ${totalTests}`);
  console.log(`✅ Passou: ${passedTests}`);
  console.log(`❌ Falhou: ${failedTests}`);
  console.log(`📊 Taxa de sucesso: ${((passedTests/totalTests)*100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.log(`\n🚨 BUGS DETECTADOS:`);
    
    results.filter(r => !r.success).forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.testName}`);
      console.log(`   Arquivo: ${result.testFile}`);
      console.log(`   Código de saída: ${result.exitCode}`);
      
      if (result.stderr) {
        console.log('   Erros:');
        console.log('   ' + result.stderr.split('\n').join('\n   '));
      }
    });
  }
  
  console.log('\n🎯 PRÓXIMAS AÇÕES:');
  console.log('1. Analisar cada falha detectada');
  console.log('2. Corrigir bugs no código');
  console.log('3. Re-executar testes');
  console.log('4. Repetir até 100% de sucesso');
  
  return results;
}

// Executar
runAllTests().then((results) => {
  const success = results.every(r => r.success);
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});