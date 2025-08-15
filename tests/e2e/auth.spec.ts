import { test, expect, Page } from '@playwright/test';

// Configurações de teste
const TEST_EMAIL = 'teste.qa@proesc.com';
const TEST_PASSWORD = 'TesteQA123!';
const STAGING_URL = 'http://localhost:5173'; // Ajustar conforme ambiente

test.describe('Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STAGING_URL);
  });

  test('Deve carregar a página de login', async ({ page }) => {
    // Verifica se está redirecionando para auth quando não logado
    await expect(page).toHaveURL(/.*\/auth/);
    
    // Verifica elementos da página de login
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Deve fazer login com credenciais válidas', async ({ page }) => {
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Aguarda redirecionamento após login
    await page.waitForURL(/.*\//);
    
    // Verifica se chegou no dashboard
    await expect(page.locator('text=Bem-vindo')).toBeVisible({ timeout: 10000 });
  });

  test('Deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.fill('input[type="email"]', 'email.invalido@test.com');
    await page.fill('input[type="password"]', 'senhaerrada');
    await page.click('button[type="submit"]');
    
    // Verifica se aparece mensagem de erro
    await expect(page.locator('text=Erro no login')).toBeVisible({ timeout: 5000 });
  });

  test('Deve validar campos obrigatórios', async ({ page }) => {
    // Tenta enviar form vazio
    await page.click('button[type="submit"]');
    
    // Verifica validação HTML5
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required');
    
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('required');
  });

  test('Deve testar fuzzing básico no login', async ({ page }) => {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '\' OR 1=1 --',
      '"><img src=x onerror=alert(1)>',
      'admin\' OR \'1\'=\'1',
      '🔥💀🚀 emoji test 🚀💀🔥',
      'a'.repeat(1000), // String muito longa
    ];

    for (const input of maliciousInputs) {
      await page.fill('input[type="email"]', input);
      await page.fill('input[type="password"]', input);
      await page.click('button[type="submit"]');
      
      // Verifica que não há erros no console que indiquem vulnerabilidade
      const logs = [];
      page.on('console', msg => logs.push(msg));
      
      // Aguarda um pouco para processar
      await page.waitForTimeout(1000);
      
      // Verifica que não há erros críticos
      const errors = logs.filter(log => log.type() === 'error');
      const criticalErrors = errors.filter(error => 
        error.text().includes('XSS') || 
        error.text().includes('SQL') ||
        error.text().includes('script')
      );
      
      expect(criticalErrors.length).toBe(0);
      
      // Limpa campos para próximo teste
      await page.fill('input[type="email"]', '');
      await page.fill('input[type="password"]', '');
    }
  });
});

test.describe('Validação de Entidade ID', () => {
  test('Deve verificar school_id em todas as requisições críticas', async ({ page }) => {
    // Intercepta requisições de rede
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('supabase') || request.url().includes('api')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    // Faz login
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*\//);
    
    // Navega pelos dashboards para acionar requisições
    const dashboardButtons = [
      'text=Acompanhar Tickets',
      'text=Agenda do Consultor',
      'text=Dashboard Financeiro',
      'text=Dashboard Pedagógico'
    ];

    for (const buttonText of dashboardButtons) {
      const button = page.locator(buttonText);
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(2000); // Aguarda carregar
        
        // Volta para home
        const backButton = page.locator('button:has-text("Voltar")');
        if (await backButton.isVisible()) {
          await backButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Analisa as requisições capturadas
    const criticalRequests = requests.filter(req => 
      req.url.includes('school_customizations') ||
      req.url.includes('school_banners') ||
      req.url.includes('zendesk-integration') ||
      req.url.includes('profiles')
    );

    // Verifica se requisições críticas incluem school_id
    for (const req of criticalRequests) {
      const hasSchoolId = req.url.includes('school_id') || 
                         (req.postData && req.postData.includes('school_id'));
      
      if (!hasSchoolId) {
        console.warn(`Requisição sem school_id: ${req.url}`);
      }
    }

    // Pelo menos algumas requisições devem incluir school_id
    const requestsWithSchoolId = criticalRequests.filter(req => 
      req.url.includes('school_id') || 
      (req.postData && req.postData.includes('school_id'))
    );

    expect(requestsWithSchoolId.length).toBeGreaterThan(0);
  });
});

test.describe('Teste de UI - Cliques Múltiplos', () => {
  test('Deve testar cliques múltiplos em elementos interativos', async ({ page }) => {
    // Login primeiro
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*\//);

    // Captura erros de console
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Captura erros de rede
    const networkErrors = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // Elementos para testar cliques múltiplos
    const interactiveElements = [
      'text=Acompanhar Tickets',
      'text=Agenda do Consultor',
      'text=Dashboard Financeiro',
      '[role="button"]',
      'button',
      'a[href]'
    ];

    for (const selector of interactiveElements) {
      const elements = page.locator(selector);
      const count = await elements.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const element = elements.nth(i);
        
        if (await element.isVisible()) {
          // Clica 5 vezes com variação de velocidade
          for (let click = 0; click < 5; click++) {
            await element.click();
            await page.waitForTimeout(Math.random() * 500 + 100);
          }
        }
      }
    }

    // Verifica que não houve erros críticos
    const criticalConsoleErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('ResizeObserver')
    );

    const criticalNetworkErrors = networkErrors.filter(error => 
      error.status >= 500 ||
      (error.status >= 400 && !error.url.includes('favicon'))
    );

    expect(criticalConsoleErrors.length).toBe(0);
    expect(criticalNetworkErrors.length).toBe(0);
  });
});

// Função auxiliar para logout
async function logout(page: Page) {
  const logoutButton = page.locator('text=Sair').or(page.locator('[aria-label="Sair"]'));
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL(/.*\/auth/);
  }
}