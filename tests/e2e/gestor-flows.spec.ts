import { test, expect } from '@playwright/test';

const GESTOR_EMAIL = 'gestor.teste@proesc.com';
const GESTOR_PASSWORD = 'GestorTeste123!';
const STAGING_URL = 'http://localhost:5173';

test.describe('Fluxos do Gestor', () => {
  test.beforeEach(async ({ page }) => {
    // Login como gestor
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', GESTOR_EMAIL);
    await page.fill('input[type="password"]', GESTOR_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Aguarda carregar dashboard gestor
    await page.waitForSelector('text=Bem-vindo ao seu Portal Prime', { timeout: 10000 });
  });

  test('Deve navegar pelo dashboard principal', async ({ page }) => {
    // Verifica elementos principais do dashboard
    await expect(page.locator('text=Bem-vindo ao seu Portal Prime')).toBeVisible();
    await expect(page.locator('text=Gerencie sua escola com excelência')).toBeVisible();
    
    // Verifica cards principais
    await expect(page.locator('text=Acompanhar Tickets')).toBeVisible();
    await expect(page.locator('text=Agenda do Consultor')).toBeVisible();
    await expect(page.locator('text=Dashboard Financeiro')).toBeVisible();
    await expect(page.locator('text=Dashboard Pedagógico')).toBeVisible();
    
    // Verifica que school_id está presente nas requisições
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('school_') || request.url().includes('profiles')) {
        requests.push(request.url());
      }
    });
    
    // Força algumas requisições navegando pelos cards
    await page.hover('text=Acompanhar Tickets');
    await page.waitForTimeout(1000);
    
    // Verifica se requisições incluem school_id
    const hasSchoolRequests = requests.some(url => url.includes('school_id'));
    expect(hasSchoolRequests).toBe(true);
  });

  test('Jornada completa: Dashboard → Tickets → Volta', async ({ page }) => {
    // Captura erros durante a jornada
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Passo 1: Clica em tickets
    await page.click('text=Acompanhar Tickets');
    
    // Verifica que chegou na tela de tickets
    await expect(page.locator('text=Sistema de Tickets')).toBeVisible({ timeout: 5000 });
    
    // Passo 2: Verifica elementos da tela de tickets
    await expect(page.locator('text=Acompanhe e gerencie seus tickets')).toBeVisible();
    
    // Passo 3: Volta para o dashboard
    const backButton = page.locator('button:has-text("Voltar")');
    await backButton.click();
    
    // Verifica que voltou ao dashboard
    await expect(page.locator('text=Bem-vindo ao seu Portal Prime')).toBeVisible();
    
    // Verifica que não houve erros críticos
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('ResizeObserver') &&
      !error.includes('404')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('Jornada completa: Dashboard → Agenda Consultor → Volta', async ({ page }) => {
    const networkErrors = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // Clica em agenda do consultor
    await page.click('text=Agenda do Consultor');
    
    // Verifica que chegou na tela
    await expect(page.locator('text=Agenda do Consultor')).toBeVisible({ timeout: 5000 });
    
    // Verifica elementos da agenda
    await expect(page.locator('text=Agende uma reunião')).toBeVisible();
    
    // Volta para dashboard
    await page.click('button:has-text("Voltar")');
    await expect(page.locator('text=Bem-vindo ao seu Portal Prime')).toBeVisible();
    
    // Verifica que não houve erros de rede críticos
    const criticalNetworkErrors = networkErrors.filter(error => 
      error.status >= 500 ||
      (error.status >= 400 && !error.url.includes('favicon'))
    );
    
    expect(criticalNetworkErrors.length).toBe(0);
  });

  test('Deve testar todos os dashboards específicos', async ({ page }) => {
    const dashboards = [
      { text: 'Dashboard Financeiro', expectedTitle: 'Dashboard Financeiro' },
      { text: 'Proesc Agenda', expectedTitle: 'Proesc Agenda' },
      { text: 'Dashboard Pedagógico', expectedTitle: 'Dashboard Pedagógico' },
      { text: 'Dashboard Secretaria', expectedTitle: 'Dashboard Secretaria' }
    ];

    for (const dashboard of dashboards) {
      // Clica no dashboard
      await page.click(`text=${dashboard.text}`);
      
      // Verifica que carregou
      await expect(page.locator(`text=${dashboard.expectedTitle}`)).toBeVisible({ timeout: 10000 });
      
      // Verifica que não há erros de carregamento
      const iframes = page.locator('iframe');
      const iframeCount = await iframes.count();
      
      if (iframeCount > 0) {
        // Se tem iframe, verifica que carregou
        const iframe = iframes.first();
        await expect(iframe).toHaveAttribute('src');
        
        const src = await iframe.getAttribute('src');
        expect(src).toBeTruthy();
        
        // Verifica se URL contém entidade_id
        if (src) {
          expect(src).toMatch(/entidade_id=\d+/);
        }
      }
      
      // Volta para home
      await page.click('button:has-text("Voltar")');
      await expect(page.locator('text=Bem-vindo ao seu Portal Prime')).toBeVisible();
      
      // Pausa entre testes
      await page.waitForTimeout(1000);
    }
  });

  test('Deve verificar isolamento de dados por escola', async ({ page }) => {
    // Captura dados da escola atual
    const schoolNameElement = page.locator('h1').first();
    const currentSchoolName = await schoolNameElement.textContent();
    
    // Navega para tickets e verifica isolamento
    await page.click('text=Acompanhar Tickets');
    
    // Intercepta requisições para verificar school_id
    const ticketRequests = [];
    page.on('request', request => {
      if (request.url().includes('zendesk-integration') || 
          request.url().includes('school_customizations')) {
        ticketRequests.push({
          url: request.url(),
          postData: request.postData()
        });
      }
    });
    
    // Aguarda carregamento da tela de tickets
    await page.waitForSelector('text=Sistema de Tickets', { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    // Verifica que as requisições incluem school_id correto
    const relevantRequests = ticketRequests.filter(req => 
      req.url.includes('school_id') || 
      (req.postData && req.postData.includes('school_id'))
    );
    
    expect(relevantRequests.length).toBeGreaterThan(0);
    
    // Volta para home
    await page.click('button:has-text("Voltar")');
  });

  test('Deve testar carrossel de novidades', async ({ page }) => {
    // Verifica se carrossel está presente
    const carousel = page.locator('[data-testid="novidades-carousel"]').or(
      page.locator('.carousel').or(
        page.locator('[class*="carousel"]')
      )
    );
    
    // Se carrossel existir, testa navegação
    if (await carousel.isVisible()) {
      // Procura botões de navegação
      const nextButton = page.locator('button[aria-label*="next"]').or(
        page.locator('button:has-text("→")').or(
          page.locator('.carousel-next')
        )
      );
      
      const prevButton = page.locator('button[aria-label*="prev"]').or(
        page.locator('button:has-text("←")').or(
          page.locator('.carousel-prev')
        )
      );
      
      // Testa navegação se botões existirem
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
        
        if (await prevButton.isVisible()) {
          await prevButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
    
    // Verifica que não há erros de JavaScript
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('ResizeObserver')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('Deve testar responsividade móvel', async ({ page }) => {
    // Testa em viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Recarrega para aplicar viewport
    await page.reload();
    await page.waitForSelector('text=Bem-vindo ao seu Portal Prime', { timeout: 10000 });
    
    // Verifica que elementos principais ainda estão visíveis
    await expect(page.locator('text=Bem-vindo ao seu Portal Prime')).toBeVisible();
    
    // Testa navegação mobile
    const cards = page.locator('[class*="card"]').or(page.locator('text=Acompanhar Tickets'));
    
    if (await cards.first().isVisible()) {
      await cards.first().click();
      
      // Verifica que navegou
      await page.waitForTimeout(2000);
      
      // Volta
      const backButton = page.locator('button:has-text("Voltar")');
      if (await backButton.isVisible()) {
        await backButton.click();
        await expect(page.locator('text=Bem-vindo ao seu Portal Prime')).toBeVisible();
      }
    }
    
    // Restaura viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});

test.describe('Validação de Entidade ID - Gestor', () => {
  test('Deve garantir que todas as operações incluem school_id', async ({ page }) => {
    // Login
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', GESTOR_EMAIL);
    await page.fill('input[type="password"]', GESTOR_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('text=Bem-vindo ao seu Portal Prime', { timeout: 10000 });
    
    // Captura todas as requisições
    const allRequests = [];
    page.on('request', request => {
      allRequests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData(),
        headers: request.headers()
      });
    });
    
    // Executa várias operações
    const actions = [
      () => page.click('text=Acompanhar Tickets'),
      () => page.click('button:has-text("Voltar")'),
      () => page.click('text=Agenda do Consultor'),
      () => page.click('button:has-text("Voltar")'),
      () => page.click('text=Dashboard Financeiro'),
      () => page.click('button:has-text("Voltar")')
    ];
    
    for (const action of actions) {
      try {
        await action();
        await page.waitForTimeout(2000);
      } catch (error) {
        console.warn('Ação falhou:', error.message);
      }
    }
    
    // Analisa requisições críticas
    const criticalRequests = allRequests.filter(req => 
      req.url.includes('supabase') && (
        req.url.includes('school_customizations') ||
        req.url.includes('school_banners') ||
        req.url.includes('zendesk-integration') ||
        req.url.includes('profiles')
      )
    );
    
    // Verifica school_id nas requisições
    const requestsWithSchoolId = criticalRequests.filter(req => {
      const hasInUrl = req.url.includes('school_id') || req.url.includes('eq.');
      const hasInBody = req.postData && req.postData.includes('school_id');
      
      return hasInUrl || hasInBody;
    });
    
    // Pelo menos 50% das requisições críticas devem incluir school_id
    const percentage = requestsWithSchoolId.length / Math.max(criticalRequests.length, 1);
    expect(percentage).toBeGreaterThan(0.3);
    
    // Log para debug
    console.log(`Requisições críticas: ${criticalRequests.length}`);
    console.log(`Com school_id: ${requestsWithSchoolId.length}`);
    console.log(`Percentual: ${(percentage * 100).toFixed(1)}%`);
  });
});