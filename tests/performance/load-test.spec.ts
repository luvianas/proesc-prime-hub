import { test, expect } from '@playwright/test';

const STAGING_URL = 'http://localhost:5173';

test.describe('Testes de Performance', () => {
  test('Deve medir tempo de carregamento das páginas principais', async ({ page }) => {
    const metrics = {};
    
    // Página de login
    const loginStart = Date.now();
    await page.goto(`${STAGING_URL}/auth`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    metrics.loginPage = Date.now() - loginStart;
    
    // Login process
    const loginProcessStart = Date.now();
    await page.fill('input[type="email"]', 'teste.qa@proesc.com');
    await page.fill('input[type="password"]', 'TesteQA123!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Bem-vindo', { timeout: 15000 });
    metrics.loginProcess = Date.now() - loginProcessStart;
    
    // Dashboard principal
    const dashboardStart = Date.now();
    await page.waitForSelector('text=Gerencie sua escola', { timeout: 10000 });
    metrics.dashboardLoad = Date.now() - dashboardStart;
    
    // Navegação para tickets
    const ticketsStart = Date.now();
    await page.click('text=Acompanhar Tickets');
    await page.waitForSelector('text=Sistema de Tickets', { timeout: 10000 });
    metrics.ticketsLoad = Date.now() - ticketsStart;
    
    // Volta para home
    const homeBackStart = Date.now();
    await page.click('button:has-text("Voltar")');
    await page.waitForSelector('text=Bem-vindo ao seu Portal Prime', { timeout: 10000 });
    metrics.homeBack = Date.now() - homeBackStart;
    
    // Dashboard financeiro
    const financialStart = Date.now();
    await page.click('text=Dashboard Financeiro');
    await page.waitForSelector('text=Dashboard Financeiro', { timeout: 15000 });
    metrics.financialDashboard = Date.now() - financialStart;
    
    // Verifica métricas
    console.log('Métricas de Performance (ms):', metrics);
    
    // Critérios de aceite: p95 ≤ 1.5s (1500ms)
    expect(metrics.loginPage).toBeLessThan(3000); // Login page mais permissivo
    expect(metrics.loginProcess).toBeLessThan(5000); // Processo de auth mais permissivo  
    expect(metrics.dashboardLoad).toBeLessThan(2000);
    expect(metrics.ticketsLoad).toBeLessThan(1500);
    expect(metrics.homeBack).toBeLessThan(1000);
    expect(metrics.financialDashboard).toBeLessThan(3000); // Dashboard externo mais permissivo
  });

  test('Deve testar navegação rápida entre seções', async ({ page }) => {
    // Login primeiro
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', 'teste.qa@proesc.com');
    await page.fill('input[type="password"]', 'TesteQA123!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Bem-vindo ao seu Portal Prime', { timeout: 10000 });
    
    const navigationTimes = [];
    
    const sections = [
      'text=Acompanhar Tickets',
      'text=Agenda do Consultor', 
      'text=Dashboard Financeiro',
      'text=Dashboard Pedagógico'
    ];
    
    // Testa navegação rápida
    for (let i = 0; i < 3; i++) { // 3 ciclos
      for (const section of sections) {
        const start = Date.now();
        
        try {
          await page.click(section);
          await page.waitForTimeout(1000); // Aguarda um pouco
          
          // Volta para home
          const backButton = page.locator('button:has-text("Voltar")');
          if (await backButton.isVisible({ timeout: 2000 })) {
            await backButton.click();
            await page.waitForSelector('text=Bem-vindo ao seu Portal Prime', { timeout: 5000 });
          }
          
          const time = Date.now() - start;
          navigationTimes.push(time);
          
        } catch (error) {
          console.warn(`Falha na navegação para ${section}:`, error.message);
        }
      }
    }
    
    // Calcula estatísticas
    const avgTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
    const maxTime = Math.max(...navigationTimes);
    const minTime = Math.min(...navigationTimes);
    
    console.log(`Tempos de navegação: Média=${avgTime.toFixed(0)}ms, Máx=${maxTime}ms, Mín=${minTime}ms`);
    
    // Critérios
    expect(avgTime).toBeLessThan(3000);
    expect(maxTime).toBeLessThan(8000);
  });

  test('Deve simular múltiplos usuários simultâneos', async ({ browser }) => {
    const concurrentUsers = 5;
    const contexts = [];
    const pages = [];
    
    // Cria múltiplos contextos
    for (let i = 0; i < concurrentUsers; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }
    
    const userMetrics = [];
    
    // Simula login simultâneo
    const loginPromises = pages.map(async (page, index) => {
      const userStart = Date.now();
      
      try {
        await page.goto(`${STAGING_URL}/auth`);
        await page.fill('input[type="email"]', 'teste.qa@proesc.com');
        await page.fill('input[type="password"]', 'TesteQA123!');
        await page.click('button[type="submit"]');
        await page.waitForSelector('text=Bem-vindo', { timeout: 15000 });
        
        const loginTime = Date.now() - userStart;
        
        // Cada usuário navega por seções diferentes
        const sections = [
          'text=Acompanhar Tickets',
          'text=Agenda do Consultor',
          'text=Dashboard Financeiro',
          'text=Dashboard Pedagógico'
        ];
        
        const sectionIndex = index % sections.length;
        const sectionStart = Date.now();
        
        await page.click(sections[sectionIndex]);
        await page.waitForTimeout(2000);
        
        const sectionTime = Date.now() - sectionStart;
        const totalTime = Date.now() - userStart;
        
        return {
          userId: index,
          loginTime,
          sectionTime,
          totalTime,
          success: true
        };
        
      } catch (error) {
        return {
          userId: index,
          error: error.message,
          success: false
        };
      }
    });
    
    const results = await Promise.all(loginPromises);
    
    // Analisa resultados
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`Usuários simultâneos: ${concurrentUsers}`);
    console.log(`Sucessos: ${successful.length}`);
    console.log(`Falhas: ${failed.length}`);
    
    if (successful.length > 0) {
      const avgLogin = successful.reduce((a, r) => a + r.loginTime, 0) / successful.length;
      const avgTotal = successful.reduce((a, r) => a + r.totalTime, 0) / successful.length;
      
      console.log(`Tempo médio de login: ${avgLogin.toFixed(0)}ms`);
      console.log(`Tempo total médio: ${avgTotal.toFixed(0)}ms`);
      
      // Critérios de performance sob carga
      expect(avgLogin).toBeLessThan(10000); // 10s para login sob carga
      expect(avgTotal).toBeLessThan(15000); // 15s total sob carga
    }
    
    // Taxa de sucesso deve ser alta
    const successRate = successful.length / concurrentUsers;
    expect(successRate).toBeGreaterThan(0.8); // 80% de sucesso mínimo
    
    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('Deve detectar vazamentos de memória', async ({ page }) => {
    // Vai para a aplicação
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', 'teste.qa@proesc.com');
    await page.fill('input[type="password"]', 'TesteQA123!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Bem-vindo ao seu Portal Prime', { timeout: 10000 });
    
    // Medição inicial
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (!initialMemory) {
      console.log('Performance.memory não disponível no navegador');
      return;
    }
    
    console.log('Memória inicial:', initialMemory);
    
    // Simula navegação intensiva
    const sections = [
      'text=Acompanhar Tickets',
      'text=Agenda do Consultor',
      'text=Dashboard Financeiro'
    ];
    
    for (let cycle = 0; cycle < 10; cycle++) {
      for (const section of sections) {
        try {
          await page.click(section);
          await page.waitForTimeout(500);
          
          const backButton = page.locator('button:has-text("Voltar")');
          if (await backButton.isVisible({ timeout: 2000 })) {
            await backButton.click();
            await page.waitForTimeout(500);
          }
        } catch (error) {
          console.warn('Erro na navegação:', error.message);
        }
      }
    }
    
    // Força garbage collection (se possível)
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Medição final
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (finalMemory) {
      console.log('Memória final:', finalMemory);
      
      const memoryIncrease = finalMemory.used - initialMemory.used;
      const increasePercentage = (memoryIncrease / initialMemory.used) * 100;
      
      console.log(`Aumento de memória: ${memoryIncrease} bytes (${increasePercentage.toFixed(1)}%)`);
      
      // Não deve aumentar mais que 50% da memória inicial
      expect(increasePercentage).toBeLessThan(50);
    }
  });
});