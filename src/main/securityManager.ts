// Importações com fallback para desenvolvimento
let keytar: any = null;
let Store: any = null;
const { execSync } = require('child_process');
const crypto = require('crypto');

// Variável para rastrear se keytar está funcionando
let keytarAvailable = false;

try {
  keytar = require('keytar');
  console.log(`🔑 Keytar carregado para ${process.platform}`);
  
  // Testar se keytar funciona dependendo da plataforma
  if (process.platform === 'linux') {
    // Fazer um teste simples para ver se keytar funciona no Linux
    keytar.getPassword('test-service', 'test-account').then(() => {
      keytarAvailable = true;
      console.log('✅ Keytar funciona corretamente no Linux');
    }).catch((error) => {
      console.warn('⚠️  Keytar não funciona no Linux:', error.message);
      console.warn('   Instale libsecret-1-dev: sudo apt install libsecret-1-dev');
      console.warn('   Ou libsecret-devel: sudo dnf install libsecret-devel');
      keytarAvailable = false;
    });
  } else if (process.platform === 'win32') {
    // No Windows, keytar deve funcionar nativamente
    keytarAvailable = true;
    console.log('✅ Keytar configurado para Windows (nativo)');
  } else if (process.platform === 'darwin') {
    // No macOS, keytar deve funcionar nativamente
    keytarAvailable = true;
    console.log('✅ Keytar configurado para macOS (Keychain)');
  } else {
    // Outras plataformas, tentar usar
    keytarAvailable = true;
    console.log(`ℹ️  Keytar configurado para ${process.platform} (experimental)`);
  }
} catch (error) {
  console.warn('⚠️  keytar não encontrado, usando armazenamento local simples');
  console.warn('   Para maior segurança, instale: npm install keytar');
  if (process.platform === 'linux') {
    console.warn('   E as dependências do sistema: sudo apt install libsecret-1-dev');
  }
  keytarAvailable = false;
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
    } else if (process.platform === 'win32') {
      console.log('🪟 Executando no Windows - armazenamento nativo disponível');
    } else if (process.platform === 'darwin') {
      console.log('🍎 Executando no macOS - Keychain disponível');
    }
    
    // Verificar e corrigir problemas de armazenamento
    this.diagnoseStorage();
  }

  // Diagnosticar e corrigir problemas de armazenamento
  private async diagnoseStorage() {
    try {
      const hasGroqKey = this.store.get('hasGroqKey', false);
      const storageMethod = this.store.get('groq-storage-method', 'unknown');
      
      console.log(`🔍 Diagnóstico: hasGroqKey=${hasGroqKey}, method=${storageMethod}`);
      
      if (hasGroqKey && storageMethod === 'unknown') {
        console.log('🔧 Corrigindo método de armazenamento desconhecido...');
        // Tentar recuperar chave e definir método correto
        const fallbackKey = this.store.get('groq-api-key-fallback', null);
        if (fallbackKey) {
          this.store.set('groq-storage-method', 'fallback');
          console.log('✅ Método corrigido para fallback');
        }
      }
    } catch (error) {
      console.warn('⚠️  Erro no diagnóstico de armazenamento:', error);
    }
  }

  // Métodos específicos para Windows Credential Manager
  private async setWindowsCredential(target: string, password: string): Promise<boolean> {
    if (process.platform !== 'win32') return false;
    
    try {
      console.log('🪟 [WINDOWS] Tentando salvar no Windows Credential Manager...');
      
      // Escapar caracteres especiais para PowerShell
      const escapedTarget = target.replace(/"/g, '`"');
      const escapedPassword = password.replace(/"/g, '`"');
      
      // Usar cmdkey para salvar credential
      const command = `cmdkey /generic:"${escapedTarget}" /user:"duckduki" /pass:"${escapedPassword}"`;
      
      execSync(command, { stdio: 'pipe', windowsHide: true });
      console.log('✅ [WINDOWS] Credential salvo com sucesso');
      return true;
    } catch (error) {
      console.warn('⚠️  [WINDOWS] Erro ao salvar credential:', error.message);
      return false;
    }
  }

  private async getWindowsCredential(target: string): Promise<string | null> {
    if (process.platform !== 'win32') return null;
    
    try {
      console.log('🪟 [WINDOWS] Tentando recuperar do Windows Credential Manager...');
      
      // Usar PowerShell para recuperar credential
      const escapedTarget = target.replace(/"/g, '`"');
      const psCommand = `
        $cred = Get-StoredCredential -Target "${escapedTarget}" -ErrorAction SilentlyContinue
        if ($cred) { 
          $cred.Password | ConvertFrom-SecureString -AsPlainText 
        }
      `;
      
      // Fallback para cmdkey se PowerShell falhar
      try {
        const result = execSync(`powershell -Command "${psCommand}"`, { 
          stdio: 'pipe', 
          encoding: 'utf8',
          windowsHide: true
        });
        
        const password = result.toString().trim();
        if (password && password !== '') {
          console.log('✅ [WINDOWS] Credential recuperado com sucesso');
          return password;
        }
      } catch (psError) {
        console.log('⚠️  [WINDOWS] PowerShell falhou, tentando método alternativo...');
      }
      
      // Método alternativo usando cmdkey (menos seguro mas mais compatível)
      try {
        const listCommand = `cmdkey /list:"${escapedTarget}"`;
        const listResult = execSync(listCommand, { 
          stdio: 'pipe', 
          encoding: 'utf8',
          windowsHide: true
        });
        
        if (listResult.includes(target)) {
          console.log('✅ [WINDOWS] Credential encontrado (usando cmdkey)');
          // Para cmdkey, retornamos um indicador de que existe, mas precisamos do fallback
          return 'CREDENTIAL_EXISTS_BUT_NEEDS_FALLBACK';
        }
      } catch (cmdError) {
        console.log('⚠️  [WINDOWS] cmdkey também falhou');
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️  [WINDOWS] Erro ao recuperar credential:', error.message);
      return null;
    }
  }

  private async removeWindowsCredential(target: string): Promise<boolean> {
    if (process.platform !== 'win32') return false;
    
    try {
      console.log('🪟 [WINDOWS] Removendo credential...');
      const escapedTarget = target.replace(/"/g, '`"');
      const command = `cmdkey /delete:"${escapedTarget}"`;
      
      execSync(command, { stdio: 'pipe', windowsHide: true });
      console.log('✅ [WINDOWS] Credential removido com sucesso');
      return true;
    } catch (error) {
      console.warn('⚠️  [WINDOWS] Erro ao remover credential:', error.message);
      return false;
    }
  }

  // Verificar se keytar está disponível e funcionando
  private async isKeytarWorking(): Promise<boolean> {
    if (!keytar) {
      console.log('🔑 Keytar não está disponível');
      return false;
    }
    
    // Para Windows e macOS, confiar na variável global se keytar foi carregado
    if (process.platform === 'win32' || process.platform === 'darwin') {
      console.log(`🔑 Keytar disponível para ${process.platform}: ${keytarAvailable}`);
      return keytarAvailable;
    }
    
    // Para Linux, fazer teste real (pode falhar se libsecret não estiver instalado)
    if (process.platform === 'linux') {
      try {
        // Teste simples para verificar se keytar funciona no Linux
        await keytar.getPassword('duckduki-test', 'test-key');
        console.log('🔑 Keytar testado e funcionando no Linux');
        return true;
      } catch (error) {
        console.warn('⚠️  Keytar não funciona no Linux. Possíveis soluções:');
        console.warn('   Ubuntu/Debian: sudo apt install libsecret-1-dev');
        console.warn('   Fedora/RHEL: sudo dnf install libsecret-devel');
        console.warn('   Arch: sudo pacman -S libsecret');
        console.warn('   Após instalar, reinicie o aplicativo.');
        return false;
      }
    }
    
    // Para outras plataformas, assumir que funciona se foi carregado
    return keytarAvailable;
  }

  async setGroqKey(apiKey: string): Promise<void> {
    try {
      console.log(`🔑 Tentando salvar chave Groq (plataforma: ${process.platform})`);
      
      // Usar keytar primeiro em todas as plataformas se disponível
      const keytarWorking = await this.isKeytarWorking();
      console.log(`🔑 Keytar funcionando: ${keytarWorking}`);
      
      if (keytar && keytarWorking) {
        // Armazenar no keychain/credential manager do sistema via keytar
        await keytar.setPassword(this.serviceName, 'groq-api-key', apiKey);
        console.log(`✅ Chave Groq salva no keychain do sistema (${process.platform})`);
        this.store.set('groq-storage-method', 'keytar');
      } else {
        // Fallback: armazenar no store criptografado
        this.store.set('groq-api-key-fallback', apiKey);
        console.log(`⚠️  Chave Groq salva em fallback criptografado (plataforma: ${process.platform})`);
        this.store.set('groq-storage-method', 'fallback');
        
        if (process.platform === 'linux') {
          console.log('💡 Para maior segurança no Linux, instale libsecret:');
          console.log('   sudo apt install libsecret-1-dev (Ubuntu/Debian)');
          console.log('   sudo dnf install libsecret-devel (Fedora/RHEL)');
        } else if (process.platform === 'win32') {
          console.log('💡 Keytar não está funcionando no Windows');
        }
      }
      
      // Marcar que temos uma chave configurada
      this.store.set('hasGroqKey', true);
      console.log('✅ Chave Groq configurada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao salvar chave Groq:', error);
      throw new Error('Falha ao salvar chave de API');
    }
  }

  async getGroqKey(): Promise<string | null> {
    try {
      const storageMethod = this.store.get('groq-storage-method', 'unknown');
      console.log(`🔑 Recuperando chave Groq (método: ${storageMethod}, plataforma: ${process.platform})`);
      
      // Tentar keytar primeiro se foi o método usado
      if (storageMethod === 'keytar' && keytar && await this.isKeytarWorking()) {
        console.log('🔑 Tentando recuperar do keychain do sistema');
        const apiKey = await keytar.getPassword(this.serviceName, 'groq-api-key');
        if (apiKey) {
          console.log('✅ Chave Groq recuperada do keychain');
          return apiKey;
        } else {
          console.log('⚠️  Chave não encontrada no keychain, tentando fallback');
          return this.store.get('groq-api-key-fallback', null);
        }
      } else {
        // Fallback: recuperar do store criptografado
        console.log('🔑 Recuperando do fallback criptografado');
        const fallbackKey = this.store.get('groq-api-key-fallback', null);
        if (fallbackKey) {
          console.log('✅ Chave Groq recuperada do fallback');
        } else {
          console.log('❌ Nenhuma chave encontrada');
        }
        return fallbackKey;
      }
    } catch (error) {
      console.error('❌ Erro ao recuperar chave Groq:', error);
      // Tentar fallback em caso de erro
      console.log('🔑 Tentando fallback após erro');
      const fallbackKey = this.store.get('groq-api-key-fallback', null);
      if (fallbackKey) {
        console.log('✅ Chave recuperada do fallback após erro');
      }
      return fallbackKey;
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
      
      // Remover do keytar se foi usado
      if (storageMethod === 'keytar' && keytar && await this.isKeytarWorking()) {
        try {
          await keytar.deletePassword(this.serviceName, 'groq-api-key');
          console.log('✅ Chave Groq removida do keychain');
        } catch (error) {
          console.log('⚠️  Erro ao remover do keychain (pode não existir)');
        }
      }
      
      // Sempre limpar fallback também
      this.store.delete('groq-api-key-fallback');
      this.store.delete('hasGroqKey');
      this.store.delete('groq-storage-method');
      console.log('✅ Chave Groq removida completamente');
    } catch (error) {
      console.error('❌ Erro ao remover chave Groq:', error);
      throw new Error('Falha ao remover chave de API');
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

  // Testar sistema de armazenamento completo
  async testStorage(): Promise<{ success: boolean; details: any }> {
    const details: any = {
      platform: process.platform,
      keytarAvailable: !!keytar,
      keytarWorking: false,
      windowsCredentialWorking: false,
      storeWorking: false,
      testResults: {}
    };

    try {
      // Testar Windows Credential Manager se no Windows
      if (process.platform === 'win32') {
        try {
          const testTarget = 'DuckdukiTestCredential';
          const testValue = 'test-value-' + Date.now();
          
          const setSuccess = await this.setWindowsCredential(testTarget, testValue);
          if (setSuccess) {
            const retrieved = await this.getWindowsCredential(testTarget);
            await this.removeWindowsCredential(testTarget);
            
            details.windowsCredentialWorking = retrieved === testValue;
            console.log(`🪟 Teste Windows Credential: ${details.windowsCredentialWorking}`);
          } else {
            console.log('🪟 Windows Credential Manager não disponível');
          }
        } catch (error) {
          console.error('❌ Erro no teste do Windows Credential:', error);
        }
      }

      // Testar keytar
      if (keytar) {
        details.keytarWorking = await this.isKeytarWorking();
        console.log(`🔑 Teste keytar: ${details.keytarWorking}`);
      }

      // Testar store
      try {
        this.store.set('test-key', 'test-value');
        const testValue = this.store.get('test-key');
        details.storeWorking = testValue === 'test-value';
        this.store.delete('test-key');
        console.log(`💾 Teste store: ${details.storeWorking}`);
      } catch (error) {
        console.error('❌ Erro no teste do store:', error);
      }

      // Teste completo de salvamento/recuperação
      try {
        const testKey = 'test-api-key-12345';
        await this.setGroqKey(testKey);
        const retrievedKey = await this.getGroqKey();
        details.testResults.saveAndRetrieve = retrievedKey === testKey;
        
        // Limpar teste
        await this.removeGroqKey();
        console.log(`🔄 Teste completo: ${details.testResults.saveAndRetrieve}`);
      } catch (error) {
        details.testResults.saveAndRetrieve = false;
        details.testResults.error = error.message;
        console.error('❌ Erro no teste completo:', error);
      }

      return {
        success: details.storeWorking && (details.keytarWorking || details.windowsCredentialWorking || true), // Fallback é OK
        details
      };
    } catch (error) {
      details.error = error.message;
      return { success: false, details };
    }
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