/**
 * Sistema de Configuração Embarcada
 * 
 * Este arquivo permite empacotar credenciais junto com o instalador
 * de forma que elas estejam disponíveis mesmo quando não há arquivo .env
 */

export interface EmbeddedConfig {
  googleDrive?: {
    clientId?: string;
    clientSecret?: string;
  };
  // Adicione outras configurações aqui se necessário
}

/**
 * Configuração embarcada no build
 * 
 * INSTRUÇÕES PARA EMPACOTAR CREDENCIAIS:
 * 
 * 1. Antes de fazer o build para distribuição, edite este arquivo
 * 2. Substitua os valores abaixo pelas suas credenciais reais
 * 3. Execute: npm run dist
 * 4. O instalador gerado já terá as credenciais embutidas
 * 
 * SEGURANÇA:
 * - Nunca comite este arquivo com credenciais reais no git
 * - Use apenas para builds de distribuição
 * - As credenciais serão ofuscadas no código compilado
 */
const EMBEDDED_CONFIG: EmbeddedConfig = {
  googleDrive: {
    // SUBSTITUA pelos valores reais antes do build de distribuição:
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID, // Cole aqui o GOOGLE_DRIVE_CLIENT_ID
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET, // Cole aqui o GOOGLE_DRIVE_CLIENT_SECRET
  }
};

/**
 * Obtém valor da configuração embarcada ou variável de ambiente
 */
export function getConfigValue(key: string, fallback?: string): string | undefined {
  const envValue = process.env[key];
  
  // Se tem valor no .env (desenvolvimento), usar ele
  if (envValue && envValue !== fallback) {
    return envValue;
  }
  
  // Senão, tentar usar valor embarcado
  switch (key) {
    case 'GOOGLE_DRIVE_CLIENT_ID':
      return EMBEDDED_CONFIG.googleDrive?.clientId || fallback;
    case 'GOOGLE_DRIVE_CLIENT_SECRET':
      return EMBEDDED_CONFIG.googleDrive?.clientSecret || fallback;
    default:
      return fallback;
  }
}

/**
 * Verifica se as credenciais estão disponíveis (embarcadas ou .env)
 */
export function hasGoogleDriveCredentials(): boolean {
  const clientId = getConfigValue('GOOGLE_DRIVE_CLIENT_ID');
  const clientSecret = getConfigValue('GOOGLE_DRIVE_CLIENT_SECRET');
  
  return !!(clientId && clientSecret && 
           clientId !== 'your-client-id' && 
           clientSecret !== 'your-client-secret');
}

/**
 * Debug: mostrar status das configurações
 */
export function debugConfigStatus(): void {
  console.log('📋 [CONFIG] Status das configurações:');
  console.log('  • GOOGLE_DRIVE_CLIENT_ID:', getConfigValue('GOOGLE_DRIVE_CLIENT_ID') ? '✅ Configurado' : '❌ Não configurado');
  console.log('  • GOOGLE_DRIVE_CLIENT_SECRET:', getConfigValue('GOOGLE_DRIVE_CLIENT_SECRET') ? '✅ Configurado' : '❌ Não configurado');
  console.log('  • Credenciais válidas:', hasGoogleDriveCredentials() ? '✅ Sim' : '❌ Não');
} 