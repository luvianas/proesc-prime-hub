// Utilitários para criação de dados de teste
export const createTestUser = (suffix: string = Date.now().toString()) => ({
  email: `teste.${suffix}@proesc.com`,
  password: 'Teste123!',
  name: `Usuário Teste ${suffix}`,
  role: 'gestor' as const
});

export const createTestSchool = (suffix: string = Date.now().toString()) => ({
  school_name: `Escola Teste ${suffix}`,
  zendesk_integration_url: `zendesk-${suffix}`,
  metabase_integration_url: `https://metabase.${suffix}.com`
});

export const validateSchoolId = (url: string): boolean => {
  return url.includes('school_id') || url.includes('entidade_id');
};

export const TEST_CREDENTIALS = {
  ADMIN: { email: 'admin@proesc.com', password: 'Admin123!' },
  GESTOR: { email: 'gestor.teste@proesc.com', password: 'GestorTeste123!' },
  USER: { email: 'user.teste@proesc.com', password: 'UserTeste123!' }
};