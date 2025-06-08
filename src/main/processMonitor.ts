// Importações com fallback para desenvolvimento
let si: any = null;
let activeWin: any = null;

// Status de compatibilidade no Linux
let activeWinWorking = false;
let siWorking = false;

try {
  si = require('systeminformation');
  siWorking = true;
  console.log('✅ systeminformation carregado com sucesso');
} catch (error) {
  console.warn('⚠️  systeminformation não encontrado, usando valores mock');
  if (process.platform === 'linux') {
    console.warn('   Para funcionalidade completa no Linux: npm install systeminformation');
  }
}

try {
  // active-win tem APIs diferentes dependendo da versão
  const activeWinModule = require('active-win');
  
  // Versão 8+ é uma função default export
  if (typeof activeWinModule === 'function') {
    activeWin = activeWinModule;
  }
  // Versão 7 tem activeWindow como método
  else if (activeWinModule && typeof activeWinModule.activeWindow === 'function') {
    activeWin = () => activeWinModule.activeWindow();
  }
  // Versão com default export
  else if (activeWinModule.default && typeof activeWinModule.default === 'function') {
    activeWin = activeWinModule.default;
  }
  // Fallback
  else {
    console.warn('⚠️  Formato do active-win não reconhecido, usando mock');
    activeWin = null;
  }
  
  if (activeWin) {
    activeWinWorking = true;
    console.log('✅ active-win carregado com sucesso');
    
    // Testar se funciona no Linux
    if (process.platform === 'linux') {
      console.log('🐧 Testando active-win no Linux...');
      activeWin().then(() => {
        console.log('✅ active-win funciona corretamente no Linux');
      }).catch((error) => {
        console.warn('⚠️  active-win pode ter problemas no Linux:', error.message);
        console.warn('   Verifique se tem as dependências: libxss1 libgconf-2-4');
        console.warn('   Ubuntu/Debian: sudo apt install libxss1 libgconf-2-4');
        activeWinWorking = false;
      });
    }
  }
} catch (error) {
  console.warn('⚠️  active-win não encontrado, usando valores mock');
  if (process.platform === 'linux') {
    console.warn('   Para monitoramento de janelas no Linux:');
    console.warn('   1. npm install active-win');
    console.warn('   2. sudo apt install libxss1 libgconf-2-4 (Ubuntu/Debian)');
  }
}

export interface SystemStatus {
  cpu: number;
  memory: number;
  activeApp: {
    name: string;
    title: string;
    pid: number;
  } | null;
}

export interface ActiveWindow {
  title: string;
  id: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  owner: {
    name: string;
    processId: number;
    bundleId: string;
    path: string;
  };
  memoryUsage: number;
  timestamp: number; // Adicionar timestamp para histórico
}

export class ProcessMonitor {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private windowHistory: ActiveWindow[] = []; // Histórico de janelas ativas
  private maxHistorySize = 20; // Manter até 20 entradas no histórico

  // Lista de nomes de aplicativos que devem ser considerados como "próprio aplicativo"
  private ownAppNames = [
    'duckduki',
    'electron',
    'chrome', // Quando executado em desenvolvimento via Vite
    'node', // Para processos Node.js relacionados
    'pwsh', // PowerShell (onde pode estar rodando)
    'cmd' // Command Prompt
  ];

  constructor() {
    // Log de compatibilidade
    console.log(`🖥️  Monitor do sistema - Plataforma: ${process.platform}`);
    console.log(`📊 systeminformation: ${siWorking ? '✅ OK' : '❌ Não disponível'}`);
    console.log(`🪟 active-win: ${activeWinWorking ? '✅ OK' : '❌ Não disponível'}`);
    
    if (process.platform === 'linux' && !activeWinWorking) {
      console.log('💡 Para melhor funcionamento no Linux, instale:');
      console.log('   sudo apt install libxss1 libgconf-2-4');
    }
  }

  private isDuckdukiApp(appName: string, appTitle: string, appPath: string): boolean {
    const name = appName.toLowerCase();
    const title = appTitle.toLowerCase();
    const path = appPath.toLowerCase();
    
    // Verificar se é o próprio Duckduki de forma mais específica
    if (title.includes('duckduki') || path.includes('duckduki')) {
      console.log(`🚫 Filtrado (Duckduki): ${appName} - ${appTitle}`);
      return true;
    }
    
    // Verificar se é Electron executando especificamente o Duckduki
    if (name.includes('electron') && (title.includes('duckduki') || path.includes('duckduki'))) {
      console.log(`🚫 Filtrado (Electron+Duckduki): ${appName} - ${appTitle}`);
      return true;
    }
    
    // Verificar desenvolvimento mais específico
    if ((name.includes('chrome') || name.includes('node')) && 
        (title.includes('localhost:3003') || title.includes('duckduki') || title.includes('vite'))) {
      console.log(`🚫 Filtrado (Dev): ${appName} - ${appTitle}`);
      return true;
    }
    
    // Verificar se é Cursor editando especificamente arquivos do Duckduki
    if (name.includes('cursor') && 
        (path.includes('duckduki') || 
         title.toLowerCase().includes('duckduki') ||
         title.includes('processMonitor') ||
         title.includes('index.ts'))) {
      console.log(`🚫 Filtrado (Cursor+Duckduki): ${appName} - ${appTitle}`);
      return true;
    }
    
    return false;
  }

  private addToHistory(window: ActiveWindow) {
    console.log(`📝 Tentando adicionar ao histórico: ${window.owner.name} - ${window.title}`);
    
    // Não adicionar o próprio aplicativo ao histórico
    if (this.isDuckdukiApp(window.owner.name, window.title, window.owner.path)) {
      console.log(`❌ Não adicionado ao histórico (próprio app)`);
      return;
    }
    
    // Verificar se a janela já é a mais recente no histórico
    const lastWindow = this.windowHistory[this.windowHistory.length - 1];
    if (lastWindow && 
        lastWindow.owner.processId === window.owner.processId && 
        lastWindow.title === window.title) {
      console.log(`❌ Não adicionado ao histórico (duplicata)`);
      return; // Não adicionar duplicata
    }
    
    // Adicionar ao histórico
    this.windowHistory.push({ ...window, timestamp: Date.now() });
    console.log(`✅ Adicionado ao histórico! Total: ${this.windowHistory.length} itens`);
    
    // Manter tamanho do histórico
    if (this.windowHistory.length > this.maxHistorySize) {
      this.windowHistory = this.windowHistory.slice(-this.maxHistorySize);
      console.log(`🗑️ Histórico limitado a ${this.maxHistorySize} itens`);
    }
  }

  private async isProcessRunning(pid: number): Promise<boolean> {
    try {
      if (process.platform === 'win32') {
        // No Windows, usar tasklist para verificar se o processo ainda existe
        const { exec } = require('child_process');
        return new Promise((resolve) => {
          exec(`tasklist /FI "PID eq ${pid}"`, (error, stdout) => {
            if (error) {
              resolve(false);
              return;
            }
            // Se o PID existe, tasklist vai mostrar o processo
            resolve(stdout.includes(pid.toString()));
          });
        });
      } else {
        // Em sistemas Unix (Linux/macOS), usar kill com sinal 0 para verificar se o processo existe
        try {
          process.kill(pid, 0);
          return true;
        } catch (error: any) {
          // ESRCH significa que o processo não existe
          if (error.code === 'ESRCH') {
            return false;
          }
          // EPERM significa que o processo existe mas não temos permissão (consideramos como existente)
          if (error.code === 'EPERM') {
            return true;
          }
          return false;
        }
      }
    } catch (error) {
      console.error('Erro ao verificar processo:', error);
      return false;
    }
  }

  private async getLastActiveWindow(): Promise<ActiveWindow | null> {
    // Retornar a janela mais recente do histórico que não seja o próprio app e ainda esteja rodando
    for (let i = this.windowHistory.length - 1; i >= 0; i--) {
      const window = this.windowHistory[i];
      if (!this.isDuckdukiApp(window.owner.name, window.title, window.owner.path)) {
        // Verificar se o processo ainda está rodando
        const isRunning = await this.isProcessRunning(window.owner.processId);
        if (isRunning) {
          console.log(`✅ Processo ${window.owner.name} (PID: ${window.owner.processId}) ainda está rodando`);
          return window;
        } else {
          console.log(`❌ Processo ${window.owner.name} (PID: ${window.owner.processId}) não está mais rodando, removendo do histórico`);
          // Remover do histórico processos que não estão mais rodando
          this.windowHistory.splice(i, 1);
        }
      }
    }
    return null;
  }

  async getActiveWindow(): Promise<ActiveWindow | null> {
    if (!activeWin || !activeWinWorking) {
      // Mock melhorado para Linux
      const mockApps = process.platform === 'linux' ? [
        'Firefox', 'VS Code', 'Terminal', 'Files', 'LibreOffice'
      ] : [
        'Visual Studio Code', 'Chrome', 'Terminal', 'Finder', 'Safari'
      ];
      
      const randomApp = mockApps[Math.floor(Math.random() * mockApps.length)];
      
      return {
        title: `${randomApp} - Mock (Linux)`,
        id: 1234,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        owner: {
          name: randomApp,
          processId: 1234 + Math.floor(Math.random() * 1000),
          bundleId: `com.${randomApp.toLowerCase()}.app`,
          path: `/usr/bin/${randomApp.toLowerCase()}`
        },
        memoryUsage: 150000,
        timestamp: Date.now()
      };
    }

    try {
      // Verificar se activeWin e activeWindow existem
      if (!activeWin || typeof activeWin !== 'function') {
        console.warn('activeWin não é uma função, usando mock');
        return null;
      }
      
      const result = await activeWin();
      if (!result) return null;

      const currentWindow: ActiveWindow = {
        title: result.title || '',
        id: result.id || 0,
        bounds: result.bounds || { x: 0, y: 0, width: 0, height: 0 },
        owner: {
          name: result.owner?.name || 'Unknown',
          processId: result.owner?.processId || 0,
          bundleId: result.owner?.bundleId || '',
          path: result.owner?.path || ''
        },
        memoryUsage: result.memoryUsage || 0,
        timestamp: Date.now()
      };

      // Adicionar ao histórico se não for o próprio app
      this.addToHistory(currentWindow);

      // Se a janela atual é o próprio Duckduki, retornar a última janela ativa diferente
      if (this.isDuckdukiApp(currentWindow.owner.name, currentWindow.title, currentWindow.owner.path)) {
        console.log(`🔍 Detectado próprio app (${currentWindow.owner.name}), retornando último app ativo`);
        const lastActive = await this.getLastActiveWindow();
        if (lastActive) {
          console.log(`📱 Último app ativo: ${lastActive.owner.name} - ${lastActive.title}`);
        } else {
          console.log('📱 Nenhum app anterior encontrado no histórico');
        }
        return lastActive;
      }

      console.log(`📱 App ativo atual: ${currentWindow.owner.name} - ${currentWindow.title}`);
      return currentWindow;
    } catch (error) {
      console.error('Erro ao obter janela ativa:', error);
      if (process.platform === 'linux') {
        console.warn('💡 Se o erro persistir no Linux, tente:');
        console.warn('   sudo apt install libxss1 libgconf-2-4');
      }
      return null;
    }
  }

  async getSystemStatus(): Promise<SystemStatus> {
    if (!si || !siWorking) {
      // Mock melhorado para Linux
      const activeWindow = await this.getActiveWindow();
      return {
        cpu: Math.floor(Math.random() * 30) + 10, // 10-40%
        memory: Math.floor(Math.random() * 40) + 30, // 30-70%
        activeApp: activeWindow ? {
          name: activeWindow.owner.name,
          title: activeWindow.title,
          pid: activeWindow.owner.processId
        } : null
      };
    }

    try {
      const [cpuLoad, memory, activeWindow] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        this.getActiveWindow()
      ]);

      return {
        cpu: Math.round(cpuLoad.currentLoad || 0),
        memory: Math.round((memory.active / memory.total) * 100),
        activeApp: activeWindow ? {
          name: activeWindow.owner.name,
          title: activeWindow.title,
          pid: activeWindow.owner.processId
        } : null
      };
    } catch (error) {
      console.error('Erro ao obter status do sistema:', error);
      if (process.platform === 'linux') {
        console.warn('💡 Alguns dados do sistema podem não estar disponíveis no Linux');
        console.warn('   Isso é normal em alguns ambientes containerizados ou com permissões limitadas');
      }
      return {
        cpu: 0,
        memory: 0,
        activeApp: null
      };
    }
  }

  async getTopProcesses(limit: number = 5): Promise<Array<{ name: string; cpu: number; memory: number; pid: number }>> {
    if (!si) {
      // Mock para desenvolvimento
      return [
        { name: 'Visual Studio Code', cpu: 15, memory: 8, pid: 1234 },
        { name: 'Chrome', cpu: 12, memory: 12, pid: 5678 },
        { name: 'Node.js', cpu: 8, memory: 4, pid: 9012 },
        { name: 'Electron', cpu: 5, memory: 6, pid: 3456 },
        { name: 'Terminal', cpu: 2, memory: 1, pid: 7890 }
      ].slice(0, limit);
    }

    try {
      const processes = await si.processes();
      
      return processes.list
        .sort((a, b) => (b.cpu || 0) - (a.cpu || 0))
        .slice(0, limit)
        .map(proc => ({
          name: proc.name || 'Unknown',
          cpu: Math.round(proc.cpu || 0),
          memory: Math.round(proc.memory || 0),
          pid: proc.pid || 0
        }));
    } catch (error) {
      console.error('Erro ao obter processos:', error);
      return [];
    }
  }

  startMonitoring(callback: (status: SystemStatus) => void, intervalMs: number = 5000) {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }

    this.isMonitoring = true;
    let cleanupCounter = 0;
    
    this.monitoringInterval = setInterval(async () => {
      try {
        const status = await this.getSystemStatus();
        callback(status);
        
        // Executar limpeza de processos mortos a cada 6 ciclos (30 segundos se intervalMs = 5000)
        cleanupCounter++;
        if (cleanupCounter >= 6) {
          cleanupCounter = 0;
          await this.cleanupDeadProcesses();
          this.debugHistory(); // Debug do histórico após limpeza
        }
      } catch (error) {
        console.error('Erro no monitoramento:', error);
      }
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  isCodeEditor(appName: string): boolean {
    const codeEditors = [
      'visual studio code',
      'vscode',
      'sublime text',
      'atom',
      'intellij',
      'phpstorm',
      'webstorm',
      'pycharm',
      'vim',
      'emacs',
      'notepad++',
      'brackets'
    ];

    return codeEditors.some(editor => 
      appName.toLowerCase().includes(editor)
    );
  }

  isEmailClient(appName: string): boolean {
    const emailClients = [
      'outlook',
      'thunderbird',
      'mail',
      'gmail',
      'apple mail'
    ];

    return emailClients.some(client => 
      appName.toLowerCase().includes(client)
    );
  }

  isBrowser(appName: string): boolean {
    const browsers = [
      'chrome',
      'firefox',
      'safari',
      'edge',
      'opera',
      'brave'
    ];

    return browsers.some(browser => 
      appName.toLowerCase().includes(browser)
    );
  }

  getAppCategory(appName: string): string {
    if (this.isCodeEditor(appName)) return 'editor';
    if (this.isEmailClient(appName)) return 'email';
    if (this.isBrowser(appName)) return 'browser';
    return 'other';
  }

  // Detectar se está em modo foco (mesma janela por muito tempo)
  async detectFocusMode(windowHistory: ActiveWindow[], timeThresholdMs: number = 3600000): Promise<boolean> {
    if (windowHistory.length < 2) return false;

    const recent = windowHistory.slice(-10); // Últimas 10 janelas
    const currentApp = recent[recent.length - 1]?.owner.name;
    
    // Verificar se está na mesma aplicação por mais de 1 hora
    const focusTime = recent.reduce((total, window, index) => {
      if (window.owner.name === currentApp && index > 0) {
        return total + 300000; // Aproximadamente 5 min por verificação
      }
      return total;
    }, 0);

    return focusTime > timeThresholdMs;
  }

  // Limpar processos mortos do histórico
  private async cleanupDeadProcesses() {
    console.log('🧹 Limpando processos mortos do histórico...');
    const originalLength = this.windowHistory.length;
    
    for (let i = this.windowHistory.length - 1; i >= 0; i--) {
      const window = this.windowHistory[i];
      const isRunning = await this.isProcessRunning(window.owner.processId);
      if (!isRunning) {
        console.log(`🗑️ Removendo processo morto: ${window.owner.name} (PID: ${window.owner.processId})`);
        this.windowHistory.splice(i, 1);
      }
    }
    
    const removedCount = originalLength - this.windowHistory.length;
    if (removedCount > 0) {
      console.log(`✅ Limpeza concluída: ${removedCount} processos mortos removidos`);
    }
  }

  // Obter histórico de janelas ativas (últimas N janelas)
  getWindowHistory(limit: number = 5): ActiveWindow[] {
    return this.windowHistory
      .filter(window => !this.isDuckdukiApp(window.owner.name, window.title, window.owner.path))
      .slice(-limit)
      .reverse(); // Mais recentes primeiro
  }

  // Limpar histórico de janelas
  clearHistory() {
    this.windowHistory = [];
  }

  // Limpar processos mortos manualmente (função pública)
  async cleanupHistory() {
    await this.cleanupDeadProcesses();
  }

  // Forçar adição ao histórico (para debug)
  forceAddToHistory(window: ActiveWindow) {
    this.windowHistory.push({ ...window, timestamp: Date.now() });
    console.log(`🔧 Forçado ao histórico: ${window.owner.name} - Total: ${this.windowHistory.length}`);
  }

  // Debug: mostrar status atual do histórico
  debugHistory() {
    console.log(`📊 Debug do histórico (${this.windowHistory.length} itens):`);
    this.windowHistory.forEach((window, index) => {
      console.log(`   ${index + 1}. ${window.owner.name} (PID: ${window.owner.processId}) - ${new Date(window.timestamp).toLocaleTimeString()}`);
    });
  }

  // Obter estatísticas do histórico
  getHistoryStats() {
    const filtered = this.windowHistory.filter(window => 
      !this.isDuckdukiApp(window.owner.name, window.title, window.owner.path)
    );
    
    const appUsage = filtered.reduce((acc, window) => {
      const appName = window.owner.name;
      acc[appName] = (acc[appName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalWindows: filtered.length,
      uniqueApps: Object.keys(appUsage).length,
      mostUsedApp: Object.entries(appUsage).sort(([,a], [,b]) => b - a)[0]?.[0] || null,
      appUsage
    };
  }

  stop() {
    this.stopMonitoring();
  }
} 