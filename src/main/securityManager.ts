// Importações com fallback para desenvolvimento
let keytar: any = null;
let Store: any = null;

try {
  keytar = require('keytar');
} catch (error) {
  console.warn('⚠️  keytar não encontrado, usando armazenamento local simples');
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
  }

  async setGroqKey(apiKey: string): Promise<void> {
    try {
      if (keytar) {
        // Armazenar no keychain do sistema
        await keytar.setPassword(this.serviceName, 'groq-api-key', apiKey);
      } else {
        // Fallback: armazenar no store (menos seguro, mas funcional para desenvolvimento)
        this.store.set('groq-api-key-fallback', apiKey);
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
      if (keytar) {
        const apiKey = await keytar.getPassword(this.serviceName, 'groq-api-key');
        return apiKey;
      } else {
        // Fallback: recuperar do store
        return this.store.get('groq-api-key-fallback', null);
      }
    } catch (error) {
      console.error('Erro ao recuperar chave Groq:', error);
      return null;
    }
  }

  async hasGroqKey(): Promise<boolean> {
    try {
      const hasKey = this.store.get('hasGroqKey', false) as boolean;
      if (!hasKey) return false;
      
      // Verificar se a chave ainda existe no keychain
      const key = await this.getGroqKey();
      return key !== null;
    } catch (error) {
      return false;
    }
  }

  async removeGroqKey(): Promise<void> {
    try {
      if (keytar) {
        await keytar.deletePassword(this.serviceName, 'groq-api-key');
      } else {
        this.store.delete('groq-api-key-fallback');
      }
      this.store.delete('hasGroqKey');
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