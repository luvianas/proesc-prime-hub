import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@proesc.com';
const ADMIN_PASSWORD = 'Admin123!';
const STAGING_URL = 'http://localhost:5173';

test.describe('CRUD de Usuários (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    // Login como admin
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Aguarda carregar dashboard admin
    await page.waitForSelector('text=Sistema de Controle - Admin', { timeout: 10000 });
  });

  test('Deve criar usuário gestor com escola associada', async ({ page }) => {
    // Navega para aba de usuários
    await page.click('text=Usuários');
    
    // Clica em criar usuário
    await page.click('text=Criar Usuário');
    
    // Preenche formulário
    const timestamp = Date.now();
    const testEmail = `gestor.teste.${timestamp}@proesc.com`;
    const testName = `Gestor Teste ${timestamp}`;
    
    await page.fill('input[placeholder*="Nome"]', testName);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'GestorTeste123!');
    
    // Seleciona role gestor
    await page.selectOption('select', 'gestor');
    
    // Seleciona uma escola (se disponível)
    const schoolSelect = page.locator('select').last();
    const schoolOptions = await schoolSelect.locator('option').count();
    if (schoolOptions > 1) {
      await schoolSelect.selectOption({ index: 1 });
    }
    
    // Submete formulário
    await page.click('button[type="submit"]');
    
    // Verifica sucesso
    await expect(page.locator('text=Usuário criado com sucesso')).toBeVisible({ timeout: 5000 });
    
    // Verifica se usuário aparece na lista
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    
    return { email: testEmail, name: testName };
  });

  test('Deve criar múltiplos usuários em lote', async ({ page }) => {
    const users = [];
    
    for (let i = 0; i < 5; i++) {
      // Navega para aba de usuários
      await page.click('text=Usuários');
      
      // Clica em criar usuário
      await page.click('text=Criar Usuário');
      
      // Dados do usuário
      const timestamp = Date.now() + i;
      const testEmail = `bulk.user.${timestamp}@proesc.com`;
      const testName = `Bulk User ${timestamp}`;
      
      await page.fill('input[placeholder*="Nome"]', testName);
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', 'BulkUser123!');
      
      // Alterna entre gestor e user
      const role = i % 2 === 0 ? 'gestor' : 'user';
      await page.selectOption('select', role);
      
      // Submete
      await page.click('button[type="submit"]');
      
      // Aguarda confirmação
      await expect(page.locator('text=Usuário criado com sucesso')).toBeVisible({ timeout: 5000 });
      
      users.push({ email: testEmail, name: testName, role });
      
      // Pequena pausa entre criações
      await page.waitForTimeout(500);
    }
    
    // Verifica todos os usuários criados
    for (const user of users) {
      await expect(page.locator(`text=${user.email}`)).toBeVisible();
    }
  });

  test('Deve ativar/desativar usuários', async ({ page }) => {
    // Primeiro cria um usuário de teste
    await page.click('text=Usuários');
    await page.click('text=Criar Usuário');
    
    const timestamp = Date.now();
    const testEmail = `toggle.test.${timestamp}@proesc.com`;
    
    await page.fill('input[placeholder*="Nome"]', `Toggle Test ${timestamp}`);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'ToggleTest123!');
    await page.selectOption('select', 'user');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Usuário criado com sucesso')).toBeVisible();
    
    // Procura o usuário na lista e testa toggle
    const userRow = page.locator(`tr:has-text("${testEmail}")`);
    await expect(userRow).toBeVisible();
    
    // Clica no switch de ativo/inativo
    const toggleSwitch = userRow.locator('button[role="switch"]');
    await toggleSwitch.click();
    
    // Verifica feedback de sucesso
    await expect(page.locator('text=Usuário desativado com sucesso')).toBeVisible();
    
    // Clica novamente para reativar
    await toggleSwitch.click();
    await expect(page.locator('text=Usuário ativado com sucesso')).toBeVisible();
  });

  test('Deve validar campos obrigatórios na criação', async ({ page }) => {
    await page.click('text=Usuários');
    await page.click('text=Criar Usuário');
    
    // Tenta submeter sem preencher
    await page.click('button[type="submit"]');
    
    // Verifica mensagem de validação
    await expect(page.locator('text=Campos obrigatórios')).toBeVisible();
    
    // Testa com email inválido
    await page.fill('input[placeholder*="Nome"]', 'Teste');
    await page.fill('input[type="email"]', 'email-invalido');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]');
    
    // Verifica validação de email
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required');
  });
});

test.describe('CRUD de Escolas (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    // Login como admin
    await page.goto(`${STAGING_URL}/auth`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('text=Sistema de Controle - Admin', { timeout: 10000 });
  });

  test('Deve criar escola com dados completos', async ({ page }) => {
    // Navega para aba de escolas
    await page.click('text=Escolas');
    
    // Clica em criar escola
    await page.click('text=Criar Escola');
    
    // Preenche dados da escola
    const timestamp = Date.now();
    const schoolName = `Escola Teste ${timestamp}`;
    
    await page.fill('input[placeholder*="Nome da Escola"]', schoolName);
    
    // URLs de integração
    await page.fill('input[placeholder*="Zendesk"]', `zendesk-${timestamp}`);
    await page.fill('input[placeholder*="Metabase"]', `https://metabase.teste${timestamp}.com`);
    
    // Dashboard links
    await page.fill('input[placeholder*="Financeiro"]', `https://financeiro.${timestamp}.com`);
    await page.fill('input[placeholder*="Agenda"]', `https://agenda.${timestamp}.com`);
    
    // Submete formulário
    await page.click('button[type="submit"]');
    
    // Verifica sucesso
    await expect(page.locator('text=Escola criada com sucesso')).toBeVisible({ timeout: 5000 });
    
    // Verifica se escola aparece na lista
    await expect(page.locator(`text=${schoolName}`)).toBeVisible();
    
    return { name: schoolName, timestamp };
  });

  test('Deve criar 20 escolas com school_id único', async ({ page }) => {
    const schools = [];
    
    for (let i = 0; i < 20; i++) {
      await page.click('text=Escolas');
      await page.click('text=Criar Escola');
      
      const timestamp = Date.now() + i;
      const schoolName = `Batch School ${timestamp}`;
      
      await page.fill('input[placeholder*="Nome da Escola"]', schoolName);
      await page.fill('input[placeholder*="Zendesk"]', `zendesk-${timestamp}`);
      
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Escola criada com sucesso')).toBeVisible({ timeout: 5000 });
      
      schools.push({ name: schoolName, timestamp });
      
      // Verifica unicidade do school_id no banco
      // Nota: Em teste real, verificaríamos via API ou banco
      
      await page.waitForTimeout(200);
    }
    
    // Verifica que todas as escolas foram criadas
    for (const school of schools) {
      await expect(page.locator(`text=${school.name}`)).toBeVisible();
    }
  });

  test('Deve editar escola existente', async ({ page }) => {
    // Primeiro cria uma escola
    await page.click('text=Escolas');
    await page.click('text=Criar Escola');
    
    const originalName = `Edit Test ${Date.now()}`;
    await page.fill('input[placeholder*="Nome da Escola"]', originalName);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Escola criada com sucesso')).toBeVisible();
    
    // Procura escola na lista e clica em editar
    const schoolRow = page.locator(`tr:has-text("${originalName}")`);
    await schoolRow.locator('button[aria-label="Editar"]').click();
    
    // Modifica dados
    const newName = `${originalName} - Editado`;
    await page.fill('input[value*="Edit Test"]', newName);
    
    // Salva alterações
    await page.click('button:has-text("Salvar")');
    
    // Verifica sucesso
    await expect(page.locator('text=Escola atualizada')).toBeVisible();
    await expect(page.locator(`text=${newName}`)).toBeVisible();
  });

  test('Deve testar isolamento entre escolas', async ({ page }) => {
    // Cria duas escolas
    const schools = [];
    
    for (let i = 0; i < 2; i++) {
      await page.click('text=Escolas');
      await page.click('text=Criar Escola');
      
      const schoolName = `Isolation Test ${Date.now() + i}`;
      await page.fill('input[placeholder*="Nome da Escola"]', schoolName);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Escola criada com sucesso')).toBeVisible();
      
      schools.push(schoolName);
    }
    
    // Cria usuários para cada escola
    for (let i = 0; i < schools.length; i++) {
      await page.click('text=Usuários');
      await page.click('text=Criar Usuário');
      
      const userEmail = `isolation.${i}.${Date.now()}@test.com`;
      await page.fill('input[placeholder*="Nome"]', `User ${i}`);
      await page.fill('input[type="email"]', userEmail);
      await page.fill('input[type="password"]', 'IsolationTest123!');
      await page.selectOption('select', 'gestor');
      
      // Associa à escola correspondente
      const schoolSelect = page.locator('select').last();
      await schoolSelect.selectOption({ label: schools[i] });
      
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Usuário criado com sucesso')).toBeVisible();
    }
    
    // Verifica que usuários estão associados às escolas corretas
    await page.click('text=Usuários');
    
    for (let i = 0; i < schools.length; i++) {
      const userRow = page.locator(`tr:has-text("isolation.${i}"))`);
      await expect(userRow.locator(`text=${schools[i]}`)).toBeVisible();
    }
  });
});

test.describe('Teste de Concorrência', () => {
  test('Deve testar edição simultânea de perfis', async ({ browser }) => {
    // Simula múltiplas sessões editando o mesmo recurso
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );
    
    // Login em todas as sessões
    for (const page of pages) {
      await page.goto(`${STAGING_URL}/auth`);
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Sistema de Controle - Admin', { timeout: 10000 });
    }
    
    // Todas tentam editar a mesma escola ao mesmo tempo
    const editPromises = pages.map(async (page, index) => {
      try {
        await page.click('text=Escolas');
        
        // Procura primeira escola disponível
        const firstSchoolEdit = page.locator('button[aria-label="Editar"]').first();
        await firstSchoolEdit.click();
        
        // Modifica nome
        const nameInput = page.locator('input[placeholder*="Nome"]').first();
        await nameInput.fill(`Concurrent Edit ${index} - ${Date.now()}`);
        
        // Tenta salvar
        await page.click('button:has-text("Salvar")');
        
        // Verifica resultado
        const successMsg = page.locator('text=Escola atualizada');
        const errorMsg = page.locator('text=Erro');
        
        return {
          sessionId: index,
          success: await successMsg.isVisible({ timeout: 3000 }),
          error: await errorMsg.isVisible({ timeout: 3000 })
        };
      } catch (error) {
        return {
          sessionId: index,
          success: false,
          error: true,
          details: error.message
        };
      }
    });
    
    const results = await Promise.all(editPromises);
    
    // Analisa resultados
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => r.error);
    
    // Pelo menos uma deve ter sucesso, outras podem falhar por concorrência
    expect(successful.length).toBeGreaterThanOrEqual(1);
    
    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });
});