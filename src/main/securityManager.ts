// Importações com fallback para desenvolvimento
let keytar: any = null;
let Store: any = null;

// Variável para rastrear se keytar está funcionando
let keytarAvailable = false;

try {
  keytar = require('keytar');
  // Testar se keytar funciona (no Linux pode falhar se libsecret não estiver instalado)
  if (process.platform === 'linux') {
    // Fazer um teste simples para ver se keytar funciona
    keytar.getPassword('test-service', 'test-account').then(() => {
      keytarAvailable = true;
      console.log('✅ Keytar funciona corretamente no Linux');
    }).catch((error) => {
      console.warn('⚠️  Keytar não funciona no Linux:', error.message);
      console.warn('   Instale libsecret-1-dev: sudo apt install libsecret-1-dev');
      console.warn('   Ou libsecret-devel: sudo dnf install libsecret-devel');
      keytarAvailable = false;
    });
  } else {
    keytarAvailable = true;
  }
} catch (error) {
  console.warn('⚠️  keytar não encontrado, usando armazenamento local simples');
  console.warn('   Para maior segurança no Linux, instale: npm install keytar');
  console.warn('   E as dependências do sistema: sudo apt install libsecret-1-dev');
}

try {
  Store = require('electron-store');
} catch (error) {
  console.warn('⚠️  electron-store não encontrado, usando armazenamento em memória');
  // Fallback simples
  Store = class MockStore {
    private data: any = {};
    get(key: string, defaultValue?: any) { return this.data[key] ?? defaultValue; }
    set(key: string, value: any) { this.data[key] = value; }
    delete(key: string) { delete this.data[key]; }
    clear() { this.data = {}; }
  };
}

export class SecurityManager {
  private store: any;
  private readonly serviceName = 'co-piloto-desktop';

  constructor() {
    this.store = new Store({
      name: 'co-piloto-settings',
      encryptionKey: 'co-piloto-secret-key-2024'
    });
    
    // Log da plataforma e status do keytar
    console.log(`🖥️  Plataforma: ${process.platform}`);
    if (process.platform === 'linux') {
      console.log('🐧 Executando no Linux - verificando compatibilidade...');
    }
  }

  // Verificar se keytar está disponível e funcionando
  private async isKeytarWorking(): Promise<boolean> {
    if (!keytar) return false;
    
    try {
      // Teste simples para verificar se keytar funciona
      await keytar.getPassword('duckduki-test', 'test-key');
      return true;
    } catch (error) {
      if (process.platform === 'linux') {
        console.warn('⚠️  Keytar não funciona no Linux. Possíveis soluções:');
        console.warn('   Ubuntu/Debian: sudo apt install libsecret-1-dev');
        console.warn('   Fedora/RHEL: sudo dnf install libsecret-devel');
        console.warn('   Arch: sudo pacman -S libsecret');
        console.warn('   Após instalar, reinicie o aplicativo.');
      }
      return false;
    }
  }

  async setGroqKey(apiKey: string): Promise<void> {
    try {
      const keytarWorking = await this.isKeytarWorking();
      
      if (keytar && keytarWorking) {
        // Armazenar no keychain do sistema
        await keytar.setPassword(this.serviceName, 'groq-api-key', apiKey);
        console.log('✅ Chave Groq salva no keychain do sistema');
        this.store.set('groq-storage-method', 'keytar');
      } else {
        // Fallback: armazenar no store criptografado
        this.store.set('groq-api-key-fallback', apiKey);
        console.log('⚠️  Chave Groq salva em fallback (menos seguro)');
        this.store.set('groq-storage-method', 'fallback');
        
        if (process.platform === 'linux') {
          console.log('💡 Para maior segurança, instale libsecret:');
          console.log('   sudo apt install libsecret-1-dev (Ubuntu/Debian)');
          console.log('   sudo dnf install libsecret-devel (Fedora/RHEL)');
        }
      }
      
      // Marcar que temos uma chave configurada
      this.store.set('hasGroqKey', true);
    } catch (error) {
      console.error('Erro ao salvar chave Groq:', error);
      throw new Error('Falha ao salvar chave de API');
    }
  }

  async getGroqKey(): Promise<string | null> {
    try {
      const storageMethod = this.store.get('groq-storage-method', 'unknown');
      
      if (storageMethod === 'keytar' && keytar && await this.isKeytarWorking()) {
        const apiKey = await keytar.getPassword(this.serviceName, 'groq-api-key');
        return apiKey;
      } else {
        // Fallback: recuperar do store
        return this.store.get('groq-api-key-fallback', null);
      }
    } catch (error) {
      console.error('Erro ao recuperar chave Groq:', error);
      // Tentar fallback em caso de erro
      return this.store.get('groq-api-key-fallback', null);
    }
  }

  async hasGroqKey(): Promise<boolean> {
    try {
      const hasKey = this.store.get('hasGroqKey', false) as boolean;
      if (!hasKey) return false;
      
      // Verificar se a chave ainda existe
      const key = await this.getGroqKey();
      return key !== null && key.length > 0;
    } catch (error) {
      return false;
    }
  }

  async removeGroqKey(): Promise<void> {
    try {
      const storageMethod = this.store.get('groq-storage-method', 'unknown');
      
      if (storageMethod === 'keytar' && keytar && await this.isKeytarWorking()) {
        await keytar.deletePassword(this.serviceName, 'groq-api-key');
      }
      
      // Sempre limpar fallback também
      this.store.delete('groq-api-key-fallback');
      this.store.delete('hasGroqKey');
      this.store.delete('groq-storage-method');
    } catch (error) {
      console.error('Erro ao remover chave Groq:', error);
    }
  }

  // Configurações de e-mail (criptografadas)
  setEmailConfig(config: { user: string; password: string; host: string; port: number; tls: boolean }) {
    this.store.set('emailConfig', config);
  }

  getEmailConfig(): any {
    return this.store.get('emailConfig', null);
  }

  removeEmailConfig() {
    this.store.delete('emailConfig');
  }

  // Configurações gerais
  setSetting(key: string, value: any) {
    this.store.set(key, value);
  }

  getSetting(key: string, defaultValue: any = null): any {
    return this.store.get(key, defaultValue);
  }

  removeSetting(key: string) {
    this.store.delete(key);
  }

  // Histórico de comandos (limitado e criptografado)
  addCommandToHistory(command: string, response: string) {
    const history = this.getCommandHistory();
    const entry = {
      command,
      response: response.substring(0, 200), // Limitar tamanho
      timestamp: Date.now()
    };

    history.unshift(entry);
    
    // Manter apenas os últimos 50 comandos
    if (history.length > 50) {
      history.splice(50);
    }

    this.store.set('commandHistory', history);
  }

  getCommandHistory(): Array<{ command: string; response: string; timestamp: number }> {
    return this.store.get('commandHistory', []) as Array<{ command: string; response: string; timestamp: number }>;
  }

  clearCommandHistory() {
    this.store.delete('commandHistory');
  }

  // Estatísticas de uso
  incrementUsageCounter(feature: string) {
    const stats = this.getUsageStats();
    stats[feature] = (stats[feature] || 0) + 1;
    this.store.set('usageStats', stats);
  }

  getUsageStats(): Record<string, number> {
    return this.store.get('usageStats', {}) as Record<string, number>;
  }

  // Configurações de notificações
  setNotificationSettings(settings: {
    enableContextualSuggestions: boolean;
    enableEmailNotifications: boolean;
    enableFocusModeAlerts: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  }) {
    this.store.set('notificationSettings', settings);
  }

  getNotificationSettings() {
    return this.store.get('notificationSettings', {
      enableContextualSuggestions: true,
      enableEmailNotifications: true,
      enableFocusModeAlerts: true
    });
  }

  // Configurações de aplicativos prioritários
  setPriorityApps(apps: string[]) {
    this.store.set('priorityApps', apps);
  }

  getPriorityApps(): string[] {
    return this.store.get('priorityApps', [
      'Visual Studio Code',
      'Chrome',
      'Outlook',
      'Slack',
      'Terminal'
    ]) as string[];
  }

  // Limpeza completa de dados
  async clearAllData(): Promise<void> {
    try {
      // Remover chaves do keychain
      await this.removeGroqKey();
      
      // Limpar store criptografado
      this.store.clear();
      
      console.log('Todos os dados foram limpos com sucesso');
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      throw new Error('Falha ao limpar dados');
    }
  }

  // Exportar configurações (sem dados sensíveis)
  exportSettings() {
    const settings = {
      notificationSettings: this.getNotificationSettings(),
      priorityApps: this.getPriorityApps(),
      usageStats: this.getUsageStats(),
      hasGroqKey: this.store.get('hasGroqKey', false),
      hasEmailConfig: !!this.getEmailConfig()
    };

    return settings;
  }

  // Verificar integridade dos dados
  async verifyDataIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Verificar se a chave Groq está acessível
      if (this.store.get('hasGroqKey')) {
        const key = await this.getGroqKey();
        if (!key) {
          issues.push('Chave Groq marcada como configurada mas não encontrada');
        }
      }

      // Verificar configurações essenciais
      const notificationSettings = this.getNotificationSettings();
      if (!notificationSettings) {
        issues.push('Configurações de notificação corrompidas');
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`Erro na verificação: ${error.message}`);
      return { valid: false, issues };
    }
  }
} 