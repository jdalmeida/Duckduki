// Carregar variáveis de ambiente do arquivo .env
import dotenv from 'dotenv';
dotenv.config();

// Importar sistema de configuração embarcada
import { debugConfigStatus } from './embeddedConfig';

// Verificar se estamos em um ambiente Electron
if (typeof require === 'undefined') {
  console.error('❌ Este arquivo deve ser executado no contexto do Node.js/Electron');
  process.exit(1);
}

import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, shell } from 'electron';
import { join } from 'path';
import { AIManager } from './aiManager';
import { EmailService } from './emailService';
import { ProcessMonitor } from './processMonitor';
import { DeployService } from './deployService';
import { SecurityManager } from './securityManager';
import { CommandPaletteServer } from './commandPaletteServer';
import { feedService } from './feedService';
import { taskService } from './taskService';
import { AIToolsService } from './aiToolsService';
import { ChatAPIServer } from './apiRoutes';
import { AutoLauncher } from './autoLauncher';
import { SyncServiceUnified } from './syncService';
import { GoogleIntegrationService } from './googleIntegrationService';
import { GoogleCalendarTools } from './aiTools/googleCalendarTools';
import { LocalTaskTools } from './aiTools/localTaskTools';

class CoPilotoDesktop {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private aiManager: AIManager;
  private aiToolsService: AIToolsService | null = null;
  private emailService: EmailService;
  private processMonitor: ProcessMonitor;
  private deployService: DeployService;
  private securityManager: SecurityManager;
  private commandPaletteServer: CommandPaletteServer;
  private chatAPIServer: ChatAPIServer;
  private autoLauncher: AutoLauncher;
  private syncService: SyncServiceUnified;
  private googleIntegrationService: GoogleIntegrationService;
  private googleCalendarTools: GoogleCalendarTools;
  private localTaskTools: LocalTaskTools;
  private isInFullScreen: boolean = false;

  constructor() {
    this.emailService = new EmailService();
    this.processMonitor = new ProcessMonitor();
    this.deployService = new DeployService();
    this.securityManager = new SecurityManager();
    this.commandPaletteServer = new CommandPaletteServer();
    this.chatAPIServer = new ChatAPIServer();
    this.autoLauncher = new AutoLauncher();
    this.aiManager = new AIManager();
    
    // Inicializar Google Integration Service
    this.googleIntegrationService = new GoogleIntegrationService();
    
    // Inicializar AI Tools
    this.googleCalendarTools = new GoogleCalendarTools(this.googleIntegrationService);
    this.localTaskTools = new LocalTaskTools(taskService);
    
    // Inicializar SyncService unificado após outros serviços
    this.syncService = new SyncServiceUnified(
      this.aiManager.getKnowledgeService(),
      this.securityManager,
      this.googleIntegrationService
    );
  }

  async initialize() {
    // Verificar se estamos no contexto do Electron
    if (!app) {
      console.error('Erro: Aplicação deve ser executada no contexto do Electron');
      console.error('Use: npm run start ou npm run dev');
      process.exit(1);
    }

    await app.whenReady();
    
    // Debug: mostrar status das configurações
    debugConfigStatus();
    
    // Configurar provedores de IA com chaves seguras
    await this.configureAIProviders();
    
    // Inicializar AIToolsService se tiver pelo menos um provedor configurado
    const activeProviders = this.aiManager.getAvailableProviders().filter(p => p.configured);
    if (activeProviders.length > 0) {
      // CRÍTICO: Configurar AIManager no taskService SEMPRE que há provedores disponíveis
      taskService.setAIManager(this.aiManager);
      console.log('✅ AI Manager configurado no Task Service');
      
      // Obter a primeira chave disponível para compatibilidade com AIToolsService
      const groqKey = await this.securityManager.getGroqKey();
      const openaiKey = await this.securityManager.getOpenAIKey();
      const googleKey = await this.securityManager.getGoogleKey();
      
      const firstAvailableKey = groqKey || openaiKey || googleKey;
      
      if (firstAvailableKey) {
        this.aiToolsService = new AIToolsService(
          firstAvailableKey,
          this.emailService,
          this.aiManager.getKnowledgeService(),
          taskService,
          feedService,
          this.processMonitor,
          this.deployService
        );
        
        // CRÍTICO: Configurar AIManager e SecurityManager IMEDIATAMENTE após criação
        this.aiToolsService.setAIManager(this.aiManager);
        this.aiToolsService.setSecurityManager(this.securityManager);
        
        // Conectar Google Calendar Tools ao AIToolsService
        this.aiToolsService.setGoogleCalendarTools(this.googleCalendarTools);
        
        // Conectar o AIToolsService ao AIManager
        this.aiManager.setAIToolsService(this.aiToolsService);

        // Configurar ChatAPIServer
        this.chatAPIServer.setAIManager(this.aiManager);
        this.chatAPIServer.setAIToolsService(this.aiToolsService);
      }
    }

    // Carregar configuração de email se existir
    const emailConfig = await this.securityManager.getEmailConfig();
    if (emailConfig) {
      this.emailService.setConfig(emailConfig);
      console.log('✅ Configuração de email carregada');
    }

    await this.createTray();
    this.setupIPC();
    this.setupGlobalShortcuts();
    this.startMonitoring();
    this.startCommandPaletteServer();
    this.startChatAPIServer();
    
    // Verificar se foi iniciado com --minimized (para inicialização automática)
    if (process.argv.includes('--minimized')) {
      console.log('🚀 Aplicação iniciada no modo minimizado (inicialização automática)');
      // Não mostrar a janela principal, apenas manter no tray
    } else {
      // Modo normal - pode mostrar a janela se necessário
      console.log('🚀 Aplicação iniciada no modo normal');
    }

    // Manter app rodando em background
    app.on('window-all-closed', (e) => {
      e.preventDefault();
    });

    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  private async configureAIProviders() {
    const groqKey = await this.securityManager.getGroqKey();
    const openaiKey = await this.securityManager.getOpenAIKey();
    const googleKey = await this.securityManager.getGoogleKey();
    
    // Configurar os provedores com suas respectivas chaves
    if (groqKey) {
      this.aiManager.configureProvider({ provider: 'groq', apiKey: groqKey });
    }
    if (openaiKey) {
      this.aiManager.configureProvider({ provider: 'openai', apiKey: openaiKey });
    }
    if (googleKey) {
      this.aiManager.configureProvider({ provider: 'google', apiKey: googleKey });
    }
    
    // Carregar configuração do provedor ativo
    const aiConfig = this.securityManager.getAIProviderConfig();
    const availableProviders = this.aiManager.getAvailableProviders().filter(p => p.configured);
    
    if (availableProviders.length > 0) {
      // Se o provedor configurado estiver disponível, usá-lo; senão, usar o primeiro disponível
      const targetProvider = availableProviders.find(p => p.id === aiConfig.provider) || availableProviders[0];
      this.aiManager.setActiveProvider(targetProvider.id as 'groq' | 'openai' | 'google');
      
      if (aiConfig.model && targetProvider.id === aiConfig.provider) {
        this.aiManager.setProviderModel(targetProvider.id, aiConfig.model);
      }
    }
  }

  private async createTray() {
    const iconPath = join(__dirname, '../../assets/icon.png');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    
    this.tray = new Tray(icon);
    this.tray.setToolTip('Duckduki');
    
    await this.updateTrayMenu();
    this.tray.on('click', () => this.showMainWindow());
  }

  private async updateTrayMenu() {
    if (!this.tray) return;
    
    const shortcutText = process.platform === 'darwin' ? 'Cmd+Shift+Space' : 'Ctrl+Shift+Space';
    const autoLaunchStatus = await this.autoLauncher.getStatus();
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Abrir Duckduki (${shortcutText})`,
        click: () => this.showMainWindow()
      },
      {
        label: 'Configurações',
        click: () => this.showSettings()
      },
      { type: 'separator' },
      {
        label: autoLaunchStatus.enabled ? 'Desabilitar inicialização automática' : 'Habilitar inicialização automática',
        enabled: autoLaunchStatus.supported,
        click: async () => {
          try {
            await this.autoLauncher.toggle();
            await this.updateTrayMenu(); // Atualizar menu após mudança
            console.log(`✅ Inicialização automática ${autoLaunchStatus.enabled ? 'desabilitada' : 'habilitada'}`);
          } catch (error) {
            console.error('❌ Erro ao alterar inicialização automática:', error);
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => app.quit()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  private setupGlobalShortcuts() {
    // Registrar atalho global Ctrl+Shift+A (ou Cmd+Shift+A no Mac) para abrir o agente
    const shortcut = process.platform === 'darwin' ? 'Cmd+Shift+Space' : 'Ctrl+Shift+Space';
    
    const registered = globalShortcut.register(shortcut, () => {
      console.log(`🔥 Atalho ${shortcut} ativado - Abrindo Duckduki`);
      this.showMainWindow();
    });

    if (registered) {
      console.log(`✅ Atalho global ${shortcut} registrado com sucesso`);
    } else {
      console.error(`❌ Falha ao registrar atalho global ${shortcut}`);
    }
  }

  private showMainWindow() {
    if (this.mainWindow) {
      // Não forçar desativação do fullscreen se a janela já estava visível
      // Apenas mostrar e focar a janela existente
      this.mainWindow.show();
      this.mainWindow.focus();
      return;
    }

    // Configurações específicas por plataforma para resolver problema de cantos
    const windowConfig: Electron.BrowserWindowConstructorOptions = {
      width: 600,
      height: 400,
      show: false,
      resizable: true, // Permitir redimensionamento para funcionar em tela cheia no Windows
      alwaysOnTop: true,
      transparent: true, // Fazer janela transparente para efeito spotlight
      backgroundColor: 'rgba(0, 0, 0, 0)', // Fundo completamente transparente
      roundedCorners: true, // Bordas arredondadas (macOS/Linux)
      hasShadow: false, // Remover sombra da janela no Windows
      frame: false,
      backgroundMaterial: 'none',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload.js')
      }
    };

    // Configurações específicas para Windows para resolver vazamento de cantos
    if (process.platform === 'win32') {
      // Usar cor de fundo que corresponda ao tema da aplicação
      windowConfig.transparent = true;
      // Configurações específicas para melhor renderização no Windows
      windowConfig.thickFrame = false;
      windowConfig.vibrancy = undefined;
      // Usar uma janela sem borda personalizada
      windowConfig.titleBarStyle = 'hidden';
      // Manter cantos arredondados mas controlar vazamento
      windowConfig.roundedCorners = false;
      windowConfig.hasShadow = false;
      // Configurações adicionais para Windows
      windowConfig.skipTaskbar = false;
      windowConfig.show = false; // Mostrar só quando estiver pronto
    }

    this.mainWindow = new BrowserWindow(windowConfig);

    // Carregar a interface React
    if (process.env.NODE_ENV === 'development') {
      // Aguardar um pouco para o Vite iniciar
      setTimeout(() => {
        this.mainWindow?.loadURL('http://localhost:3003').catch((err) => {
          console.error('Erro ao carregar URL de desenvolvimento:', err);
          // Fallback para arquivo local se Vite não estiver rodando
          this.mainWindow?.loadFile(join(__dirname, '../renderer/index.html'));
        });
      }, 2000);
      
      // Abrir DevTools apenas em desenvolvimento
      this.mainWindow.webContents.once('did-finish-load', () => {
        this.mainWindow?.webContents.openDevTools({ mode: 'detach' });
      });
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      console.log('🎨 Janela pronta para mostrar');
      this.mainWindow?.show();
      this.positionWindow();
    });

    this.mainWindow.webContents.once('did-finish-load', () => {
      console.log('✅ Conteúdo carregado');
    });

    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('❌ Falha ao carregar:', errorCode, errorDescription);
    });

    this.mainWindow.on('blur', () => {
      // Esconder janela quando perder foco (comportamento de widget)
      setTimeout(() => {
        if (this.mainWindow && !this.mainWindow.webContents.isDevToolsOpened()) {
          this.mainWindow.hide();
        }
      }, 100);
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Controlar redimensionamento para manter tamanho fixo quando não em tela cheia
    this.mainWindow.on('will-resize', (event, newBounds) => {
      if (!this.mainWindow?.isFullScreen()) {
        // Manter tamanho fixo quando não em tela cheia
        event.preventDefault();
      }
    });

    // Eventos de tela cheia para Windows
    this.mainWindow.on('enter-full-screen', () => {
      console.log('🖥️  Entrou em tela cheia');
      this.isInFullScreen = true; // Atualizar estado interno
      if (process.platform === 'win32') {
        // No Windows, garantir que funciona corretamente
        this.mainWindow?.setResizable(true);
      }
    });
    
    this.mainWindow.on('leave-full-screen', () => {
      console.log('🖥️  Saiu da tela cheia');
      this.isInFullScreen = false; // Atualizar estado interno
      if (process.platform === 'win32') {
        // Restaurar tamanho original no Windows apenas se não estiver sendo chamado via atalho
        setTimeout(() => {
          if (this.mainWindow && !this.isInFullScreen) {
            this.mainWindow.setSize(600, 400);
            this.positionWindow();
            console.log('✅ Tamanho restaurado após sair da tela cheia');
          }
        }, 200); // Aumentar delay para melhor sincronização
      }
    });
  }

  private positionWindow() {
    if (!this.mainWindow) return;

    const { screen } = require('electron');
    const windowBounds = this.mainWindow.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const screenBounds = primaryDisplay.workAreaSize;
    
    // Centralizar na tela como o Spotlight do macOS
    const x = Math.round((screenBounds.width - windowBounds.width) / 2);
    // Posicionar um pouco acima do centro (25% da altura da tela)
    const y = Math.round(screenBounds.height * 0.25);
    
    this.mainWindow.setPosition(x, y, false);
  }

  private showSettings() {
    // Implementar janela de configurações
    console.log('Abrindo configurações...');

  }

  private setupIPC() {
    // Comando de texto/voz
    ipcMain.handle('process-command', async (event, command: string) => {
      try {
        const response = await this.aiManager.processCommand(command);
        return { success: true, response };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Comando com contexto de chat
    ipcMain.handle('process-command-with-context', async (event, command: string, chatContext: Array<{ role: string; content: string }>) => {
      try {
        const response = await this.aiManager.processCommandWithContext(command, chatContext);
        return { success: true, response };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Comando com contexto de chat (streaming)
    ipcMain.handle('process-command-with-context-stream', async (event, command: string, chatContext: Array<{ role: string; content: string }>) => {
      try {
        const stream = await this.aiManager.processCommandWithContextStream(command, chatContext);
        
        // Converter stream para array de chunks
        const chunks: string[] = [];
        for await (const chunk of stream.textStream) {
          chunks.push(chunk);
        }
        
        const fullResponse = chunks.join('');
        return { success: true, response: fullResponse, isStream: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter resumo de emails
    ipcMain.handle('get-email-summary', async () => {
      try {
        const emails = await this.emailService.getRecentEmails();
        const summary = await this.aiManager.summarizeEmails(emails);
        return { success: true, summary };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Analisar código atual
    ipcMain.handle('analyze-current-code', async () => {
      try {
        const activeApp = await this.processMonitor.getActiveWindow();
        if (!activeApp || !activeApp.title.includes('Visual Studio Code') || !activeApp.title.includes('Cursor')) {
          return { error: 'VS Code não está ativo' };
        }

        // Placeholder: capturar código do clipboard ou arquivo ativo
        const codeSnippet = "// Código de exemplo...";
        
        const analysis = await this.aiManager.analyzeCode(codeSnippet);
        return { success: true, analysis };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Executar build/deploy
    ipcMain.handle('run-build', async () => {
      try {
        const result = await this.deployService.runBuild();
        return { success: true, result };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter histórico de janelas ativas
    ipcMain.handle('get-window-history', async () => {
      try {
        const history = this.processMonitor.getWindowHistory(10);
        return { success: true, history };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter estatísticas do histórico
    ipcMain.handle('get-history-stats', async () => {
      try {
        const stats = this.processMonitor.getHistoryStats();
        return { success: true, stats };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Limpar processos mortos do histórico
    ipcMain.handle('cleanup-history', async () => {
      try {
        await this.processMonitor.cleanupHistory();
        return { success: true, message: 'Histórico limpo com sucesso' };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter status do sistema
    ipcMain.handle('get-system-status', async () => {
      try {
        const status = await this.processMonitor.getSystemStatus();
        return { success: true, status };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Configurar chave Groq
    ipcMain.handle('set-groq-key', async (event, apiKey: string) => {
      try {
        await this.securityManager.setGroqKey(apiKey);
        await this.aiManager.configureProvider({ provider: 'groq', apiKey });
        
        // Configurar IA para o serviço de tarefas
        taskService.setAIManager(this.aiManager);
        
        // Inicializar AIToolsService com todos os módulos se ainda não existir
        if (!this.aiToolsService) {
          this.aiToolsService = new AIToolsService(
            apiKey,
            this.emailService,
            this.aiManager.getKnowledgeService(),
            taskService,
            feedService,
            this.processMonitor,
            this.deployService
          );
          
          // Conectar o AIToolsService ao AIManager
          this.aiManager.setAIToolsService(this.aiToolsService);
          
          // Configurar SecurityManager no AIToolsService
          this.aiToolsService.setSecurityManager(this.securityManager);
          this.aiToolsService.setAIManager(this.aiManager);
          
          // Conectar Google Calendar Tools ao AIToolsService
          this.aiToolsService.setGoogleCalendarTools(this.googleCalendarTools);
        }
        
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Configurar chave OpenAI
    ipcMain.handle('set-openai-key', async (event, apiKey: string) => {
      try {
        await this.securityManager.setOpenAIKey(apiKey);
        await this.aiManager.configureProvider({ provider: 'openai', apiKey });
        
        // Configurar IA para o serviço de tarefas
        taskService.setAIManager(this.aiManager);
        
        // Atualizar SecurityManager no AIToolsService se existir
        if (this.aiToolsService) {
          this.aiToolsService.setSecurityManager(this.securityManager);
          this.aiToolsService.setAIManager(this.aiManager);
        }
        
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Configurar chave Google
    ipcMain.handle('set-google-key', async (event, apiKey: string) => {
      try {
        await this.securityManager.setGoogleKey(apiKey);
        await this.aiManager.configureProvider({ provider: 'google', apiKey });
        
        // Configurar IA para o serviço de tarefas
        taskService.setAIManager(this.aiManager);
        
        // Atualizar SecurityManager no AIToolsService se existir
        if (this.aiToolsService) {
          this.aiToolsService.setSecurityManager(this.securityManager);
          this.aiToolsService.setAIManager(this.aiManager);
        }
        
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Configurar provedor e modelo de IA
    ipcMain.handle('set-ai-config', async (event, provider: 'groq' | 'openai' | 'google', model?: string) => {
      try {
        // Definir provedor ativo
        this.aiManager.setActiveProvider(provider);
        
        // Definir modelo se fornecido
        if (model) {
          this.aiManager.setProviderModel(provider, model);
        }
        
        // Salvar configuração
        this.securityManager.setAIProviderConfig({ provider, model: model || '' });
        
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter configuração de IA atual
    ipcMain.handle('get-ai-config', async () => {
      try {
        const config = this.securityManager.getAIProviderConfig();
        const providers = this.aiManager.getAvailableProviders();
        
        return {
          success: true,
          provider: this.aiManager.getActiveProvider(),
          model: config.model,
          providers,
          hasGroqKey: await this.securityManager.hasGroqKey(),
          hasOpenAIKey: await this.securityManager.hasOpenAIKey(),
          hasGoogleKey: await this.securityManager.hasGoogleKey()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Verificar se tem chave Groq
    ipcMain.handle('has-groq-key', async () => {
      const hasKey = await this.securityManager.hasGroqKey();
      return { hasKey };
    });

    // Testar sistema de armazenamento
    ipcMain.handle('test-storage', async () => {
      try {
        const result = await this.securityManager.testStorage();
        return result;
      } catch (error) {
        return { 
          success: false, 
          details: { error: error.message } 
        };
      }
    });

    // Limpar dados
    ipcMain.handle('clear-data', async () => {
      try {
        await this.securityManager.clearAllData();
        // Reinicializar o AIManager para remover configurações
        this.aiManager = new AIManager();
        this.aiToolsService = null;
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Configurar email
    ipcMain.handle('set-email-config', async (event, config: { user: string; password: string; host: string; port: number; tls: boolean }) => {
      try {
        await this.securityManager.setEmailConfig(config);
        this.emailService.setConfig(config);
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Verificar se tem configuração de email
    ipcMain.handle('has-email-config', async () => {
      const config = await this.securityManager.getEmailConfig();
      return { hasConfig: !!config };
    });

    // Configurar Gmail
    ipcMain.handle('configure-gmail', async (event, email: string, appPassword: string) => {
      try {
        this.emailService.configureGmail(email, appPassword);
        const config = {
          user: email,
          password: appPassword,
          host: 'imap.gmail.com',
          port: 993,
          tls: true
        };
        await this.securityManager.setEmailConfig(config);
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Configurar Outlook
    ipcMain.handle('configure-outlook', async (event, email: string, password: string) => {
      try {
        this.emailService.configureOutlook(email, password);
        const config = {
          user: email,
          password: password,
          host: 'outlook.office365.com',
          port: 993,
          tls: true
        };
        await this.securityManager.setEmailConfig(config);
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Remover configuração de email
    ipcMain.handle('remove-email-config', async () => {
      try {
        await this.securityManager.removeEmailConfig();
        this.emailService.clearConfig();
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter feeds de tendências
    ipcMain.handle('get-tech-feeds', async (event, limitPerSource: number = 8) => {
      try {
        const result = await feedService.getAllFeeds(limitPerSource);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error.message || 'Erro ao buscar feeds' 
        };
      }
    });

    // Obter feeds filtrados
    ipcMain.handle('get-filtered-feeds', async (event, sources: string[], keywords?: string[]) => {
      try {
        const result = await feedService.getFilteredFeeds(sources, keywords);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error.message || 'Erro ao filtrar feeds' 
        };
      }
    });

    // Limpar cache de feeds
    ipcMain.handle('clear-feeds-cache', async () => {
      try {
        feedService.clearCache();
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Abrir URL externa
    ipcMain.handle('open-external-url', async (event, url: string) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // === HANDLERS DE TAREFAS ===

    // Adicionar tarefa
    ipcMain.handle('add-task', async (event, input: string) => {
      try {
        const result = await taskService.addTask(input);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao adicionar tarefa'
        };
      }
    });

    // Obter tarefas
    ipcMain.handle('get-tasks', async (event, filter?: any) => {
      try {
        const result = taskService.getTasks(filter);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao obter tarefas'
        };
      }
    });

    // Atualizar status da tarefa
    ipcMain.handle('update-task-status', async (event, taskId: string, status: string) => {
      try {
        const result = await taskService.updateTaskStatus(taskId, status as any);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao atualizar tarefa'
        };
      }
    });

    // Deletar tarefa
    ipcMain.handle('delete-task', async (event, taskId: string) => {
      try {
        const result = await taskService.deleteTask(taskId);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao deletar tarefa'
        };
      }
    });

    // Obter sugestões de IA para tarefas
    ipcMain.handle('get-task-suggestions', async () => {
      try {
        const result = await taskService.getTaskSuggestions();
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao obter sugestões'
        };
      }
    });

    // Obter estatísticas das tarefas
    ipcMain.handle('get-task-stats', async () => {
      try {
        const stats = taskService.getTaskStats();
        return { success: true, stats };
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao obter estatísticas'
        };
      }
    });

    // Limpar tarefas concluídas
    ipcMain.handle('clear-completed-tasks', async () => {
      try {
        const result = taskService.clearCompletedTasks();
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao limpar tarefas'
        };
      }
    });

    // === HANDLERS DE CONTROLE DE TEMPO ===

    // Iniciar cronômetro da tarefa
    ipcMain.handle('start-task-timer', async (event, taskId: string) => {
      try {
        const result = await taskService.startTaskTimer(taskId);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao iniciar cronômetro'
        };
      }
    });

    // Pausar cronômetro da tarefa
    ipcMain.handle('pause-task-timer', async (event, taskId: string) => {
      try {
        const result = await taskService.pauseTaskTimer(taskId);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao pausar cronômetro'
        };
      }
    });

    // Parar cronômetro da tarefa
    ipcMain.handle('stop-task-timer', async (event, taskId: string) => {
      try {
        const result = await taskService.stopTaskTimer(taskId);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao parar cronômetro'
        };
      }
    });

    // Adicionar nota à sessão de tempo
    ipcMain.handle('add-time-session-note', async (event, taskId: string, sessionId: string, notes: string) => {
      try {
        const result = await taskService.addTimeSessionNote(taskId, sessionId, notes);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao adicionar nota'
        };
      }
    });

    // Obter estatísticas de tempo da tarefa
    ipcMain.handle('get-task-time-stats', async (event, taskId: string) => {
      try {
        const result = taskService.getTaskTimeStats(taskId);
        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao obter estatísticas de tempo'
        };
      }
    });

    // === HANDLERS DE REPOSITÓRIO DE CONHECIMENTO ===

    // Adicionar item ao repositório de conhecimento
    ipcMain.handle('add-knowledge-item', async (event, item: { title: string; content: string; type: string; tags: string[]; url?: string }) => {
      try {
        const result = await this.aiManager.addKnowledge(
          item.title,
          item.content,
          item.type as any,
          item.tags,
          item.url
        );
        return { success: true, item: result };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Buscar no repositório de conhecimento
    ipcMain.handle('search-knowledge', async (event, query: string, type?: string, limit?: number) => {
      try {
        const results = await this.aiManager.searchKnowledge(query, type as any, limit);
        return { success: true, results };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter todos os itens de conhecimento
    ipcMain.handle('get-all-knowledge', async (event, type?: string, limit?: number) => {
      try {
        const knowledgeService = this.aiManager.getKnowledgeService();
        const items = await knowledgeService.getAllKnowledge(type as any, limit);
        return { success: true, items };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter item específico de conhecimento
    ipcMain.handle('get-knowledge-item', async (event, id: string) => {
      try {
        const knowledgeService = this.aiManager.getKnowledgeService();
        const item = await knowledgeService.getKnowledgeItem(id);
        return { success: true, item };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Atualizar item de conhecimento
    ipcMain.handle('update-knowledge-item', async (event, id: string, updates: any) => {
      try {
        const knowledgeService = this.aiManager.getKnowledgeService();
        const item = await knowledgeService.updateKnowledgeItem(id, updates);
        return { success: true, item };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Remover item de conhecimento
    ipcMain.handle('delete-knowledge-item', async (event, id: string) => {
      try {
        const knowledgeService = this.aiManager.getKnowledgeService();
        const success = await knowledgeService.deleteKnowledgeItem(id);
        return { success };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter estatísticas do repositório
    ipcMain.handle('get-knowledge-stats', async () => {
      try {
        const knowledgeService = this.aiManager.getKnowledgeService();
        const stats = await knowledgeService.getStats();
        return { success: true, stats };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter todas as tags
    ipcMain.handle('get-all-knowledge-tags', async () => {
      try {
        const knowledgeService = this.aiManager.getKnowledgeService();
        const tags = await knowledgeService.getAllTags();
        return { success: true, tags };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Salvar resumo de post com IA
    ipcMain.handle('save-post-summary', async (event, title: string, content: string, url?: string, tags: string[] = []) => {
      try {
        const result = await this.aiManager.savePostSummaryWithAI(title, content, url, tags);
        return { success: true, item: result };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Exportar base de conhecimento
    ipcMain.handle('export-knowledge', async () => {
      try {
        const knowledgeService = this.aiManager.getKnowledgeService();
        const items = await knowledgeService.exportKnowledge();
        return { success: true, items };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Importar base de conhecimento
    ipcMain.handle('import-knowledge', async (event, items: any[]) => {
      try {
        const knowledgeService = this.aiManager.getKnowledgeService();
        await knowledgeService.importKnowledge(items);
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Limpar base de conhecimento
    ipcMain.handle('clear-knowledge', async () => {
      try {
        const knowledgeService = this.aiManager.getKnowledgeService();
        await knowledgeService.clearKnowledge();
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // === HANDLERS DE TELA INTEIRA ===

    // Alternar modo tela inteira
    ipcMain.handle('toggle-fullscreen', async () => {
      try {
        if (!this.mainWindow) {
          return {
            success: false,
            error: 'Janela principal não existe'
          };
        }

        // No Windows, usar estado interno; outras plataformas usar método nativo
        const isFullScreen = process.platform === 'win32' ? this.isInFullScreen : this.mainWindow.isFullScreen();
        console.log(`🖥️  Alternando tela cheia: ${isFullScreen} -> ${!isFullScreen} (Windows: ${process.platform === 'win32'})`);
        
        // Para Windows, garantir que a janela pode ser redimensionada
        if (process.platform === 'win32' && !isFullScreen) {
          this.mainWindow.setResizable(true);
        }
        
        this.mainWindow.setFullScreen(!isFullScreen);
        
        // No Windows, aguardar mais tempo para o evento ser disparado
        const waitTime = process.platform === 'win32' ? 300 : 100;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Usar estado interno no Windows, método nativo em outras plataformas
        const newFullScreenState = process.platform === 'win32' ? this.isInFullScreen : this.mainWindow.isFullScreen();
        console.log(`✅ Novo estado da tela cheia: ${newFullScreenState}`);
        
        return {
          success: true,
          isFullScreen: newFullScreenState
        };
      } catch (error) {
        console.error('❌ Erro ao alternar tela inteira:', error);
        return {
          success: false,
          error: error.message || 'Erro ao alternar tela inteira'
        };
      }
    });

    // Obter status da tela inteira
    ipcMain.handle('get-fullscreen-status', async () => {
      try {
        // No Windows, usar estado interno; outras plataformas usar método nativo
        const isFullScreen = process.platform === 'win32' ? 
          this.isInFullScreen : 
          (this.mainWindow?.isFullScreen() || false);
          
        return {
          success: true,
          isFullScreen
        };
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao obter status'
        };
      }
    });

    // Definir modo tela inteira
    ipcMain.handle('set-fullscreen', async (event, fullscreen: boolean) => {
      try {
        if (!this.mainWindow) {
          return {
            success: false,
            error: 'Janela principal não existe'
          };
        }

        console.log(`🖥️  Definindo tela cheia: ${fullscreen} (Windows: ${process.platform === 'win32'})`);
        
        // Para Windows, garantir que a janela pode ser redimensionada antes de entrar em tela cheia
        if (process.platform === 'win32' && fullscreen) {
          this.mainWindow.setResizable(true);
        }
        
        this.mainWindow.setFullScreen(fullscreen);
        
        // No Windows, aguardar mais tempo para o evento ser disparado
        const waitTime = process.platform === 'win32' ? 300 : 100;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Usar estado interno no Windows, método nativo em outras plataformas
        const actualFullScreenState = process.platform === 'win32' ? this.isInFullScreen : this.mainWindow.isFullScreen();
        console.log(`✅ Estado atual da tela cheia: ${actualFullScreenState}`);
        
        return {
          success: true,
          isFullScreen: actualFullScreenState
        };
      } catch (error) {
        console.error('❌ Erro ao definir tela inteira:', error);
        return {
          success: false,
          error: error.message || 'Erro ao definir tela inteira'
        };
      }
    });

    // Fechar modo spotlight
    ipcMain.handle('close-spotlight-mode', async () => {
      if (this.mainWindow) {
        this.mainWindow.hide();
      }
    });

    // Forçar modo spotlight (desativa fullscreen e restaura tamanho)
    ipcMain.handle('force-spotlight-mode', async () => {
      try {
        if (!this.mainWindow) {
          return {
            success: false,
            error: 'Janela principal não existe'
          };
        }

        console.log('🎯 Forçando modo spotlight');
        
        // Verificar se está em fullscreen usando estado interno no Windows
        const isCurrentlyFullScreen = process.platform === 'win32' ? 
          this.isInFullScreen : 
          this.mainWindow.isFullScreen();
        
        // Se estiver em fullscreen, desativar
        if (isCurrentlyFullScreen) {
          console.log('🔄 Desativando fullscreen');
          this.mainWindow.setFullScreen(false);
          
          // Aguardar mudança de estado - mais tempo no Windows
          const waitTime = process.platform === 'win32' ? 300 : 150;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // Garantir tamanho e posição corretos
        this.mainWindow.setSize(600, 400);
        this.positionWindow();
        
        console.log('✅ Modo spotlight forçado com sucesso');
        
        return {
          success: true,
          isFullScreen: false
        };
      } catch (error) {
        console.error('❌ Erro ao forçar modo spotlight:', error);
        return {
          success: false,
          error: error.message || 'Erro ao forçar modo spotlight'
        };
      }
    });

    // === HANDLERS DE INICIALIZAÇÃO AUTOMÁTICA ===
    
    // Habilitar inicialização automática
    ipcMain.handle('enable-auto-launch', async () => {
      try {
        const success = await this.autoLauncher.enable();
        return { success };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Desabilitar inicialização automática
    ipcMain.handle('disable-auto-launch', async () => {
      try {
        const success = await this.autoLauncher.disable();
        return { success };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Alternar inicialização automática
    ipcMain.handle('toggle-auto-launch', async () => {
      try {
        const success = await this.autoLauncher.toggle();
        const status = await this.autoLauncher.getStatus();
        return { success, ...status };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Verificar status da inicialização automática
    ipcMain.handle('get-auto-launch-status', async () => {
      try {
        const status = await this.autoLauncher.getStatus();
        return { success: true, ...status };
      } catch (error) {
        return { error: error.message };
      }
    });

    // === HANDLERS DE SINCRONIZAÇÃO ===

    // Obter configurações de sincronização
    ipcMain.handle('get-sync-settings', async () => {
      try {
        const settings = this.syncService.getSyncSettings();
        return { success: true, ...settings };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        };
      }
    });

    // Salvar configurações de sincronização
    ipcMain.handle('save-sync-settings', async (event, settings: any) => {
      try {
        this.syncService.saveSyncSettings(settings);
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao salvar configurações' 
        };
      }
    });

    // Conectar provedor de sincronização
    ipcMain.handle('connect-sync-provider', async (event, providerId: 'googledrive') => {
      try {
        const result = await this.syncService.connectSyncProvider(providerId);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao conectar provedor' 
        };
      }
    });

    // Desconectar provedor de sincronização
    ipcMain.handle('disconnect-sync-provider', async (event, providerId: 'googledrive') => {
      try {
        await this.syncService.disconnectSyncProvider(providerId);
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao desconectar provedor' 
        };
      }
    });

    // Realizar sincronização
    ipcMain.handle('perform-sync', async (event, providerId: 'googledrive', conflictResolution: 'local' | 'remote' | 'merge') => {
      try {
        const result = await this.syncService.performSync(providerId, conflictResolution);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro na sincronização' 
        };
      }
    });

    // Obter status da sincronização
    ipcMain.handle('get-sync-status', async () => {
      try {
        const status = this.syncService.getSyncStatus();
        return { success: true, ...status };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao obter status' 
        };
      }
    });

    // === HANDLERS DE GOOGLE SERVICES ===

    // Conectar aos Google Services
    ipcMain.handle('connect-google-services', async () => {
      try {
        const result = await this.googleIntegrationService.connect();
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao conectar Google Services' 
        };
      }
    });

    // Desconectar dos Google Services
    ipcMain.handle('disconnect-google-services', async () => {
      try {
        await this.googleIntegrationService.disconnect();
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao desconectar Google Services' 
        };
      }
    });

    // Verificar se está conectado aos Google Services
    ipcMain.handle('is-google-services-connected', async () => {
      try {
        const status = this.googleIntegrationService.getConnectionStatus();
        return status.connected || false;
      } catch (error) {
        return false;
      }
    });

    // Obter informações do usuário Google
    ipcMain.handle('get-google-user-info', async () => {
      try {
        const userInfo = await this.googleIntegrationService.getUserInfo();
        return userInfo;
      } catch (error) {
        return { 
          error: error instanceof Error ? error.message : 'Erro ao obter informações do usuário' 
        };
      }
    });

    // Obter status da conexão dos Google Services
    ipcMain.handle('get-google-services-status', async () => {
      try {
        const status = this.googleIntegrationService.getConnectionStatus();
        return { success: true, ...status };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao obter status' 
        };
      }
    });

    // === GOOGLE CALENDAR HANDLERS ===

    // Obter calendários
    ipcMain.handle('get-google-calendars', async () => {
      try {
        const result = await this.googleIntegrationService.getCalendars();
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao obter calendários' 
        };
      }
    });

    // Obter eventos
    ipcMain.handle('get-google-events', async (event, calendarId: string, timeMin?: string, timeMax?: string, maxResults?: number) => {
      try {
        const result = await this.googleIntegrationService.getEvents(calendarId, timeMin, timeMax, maxResults);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao obter eventos' 
        };
      }
    });

    // Criar evento
    ipcMain.handle('create-google-event', async (event, eventData: any, calendarId?: string) => {
      try {
        const result = await this.googleIntegrationService.createEvent(eventData, calendarId);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao criar evento' 
        };
      }
    });

    // Atualizar evento
    ipcMain.handle('update-google-event', async (event, eventId: string, eventData: any, calendarId?: string) => {
      try {
        const result = await this.googleIntegrationService.updateEvent(eventId, eventData, calendarId);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao atualizar evento' 
        };
      }
    });

    // Excluir evento
    ipcMain.handle('delete-google-event', async (event, eventId: string, calendarId?: string) => {
      try {
        const result = await this.googleIntegrationService.deleteEvent(eventId, calendarId);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao excluir evento' 
        };
      }
    });

    // === GOOGLE TASKS HANDLERS ===

    // Obter listas de tarefas
    ipcMain.handle('get-google-task-lists', async () => {
      try {
        const result = await this.googleIntegrationService.getTaskLists();
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao obter listas de tarefas' 
        };
      }
    });

    // Obter tarefas
    ipcMain.handle('get-google-tasks', async (event, taskListId: string, showCompleted?: boolean) => {
      try {
        const result = await this.googleIntegrationService.getTasks(taskListId, showCompleted);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao obter tarefas' 
        };
      }
    });

    // Criar tarefa
    ipcMain.handle('create-google-task', async (event, taskData: any, taskListId: string) => {
      try {
        const result = await this.googleIntegrationService.createTask(taskData, taskListId);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao criar tarefa' 
        };
      }
    });

    // Atualizar tarefa
    ipcMain.handle('update-google-task', async (event, taskId: string, taskData: any, taskListId: string) => {
      try {
        const result = await this.googleIntegrationService.updateTask(taskId, taskData, taskListId);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao atualizar tarefa' 
        };
      }
    });

    // Excluir tarefa
    ipcMain.handle('delete-google-task', async (event, taskId: string, taskListId: string) => {
      try {
        const result = await this.googleIntegrationService.deleteTask(taskId, taskListId);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao excluir tarefa' 
        };
      }
    });

    // Concluir tarefa
    ipcMain.handle('complete-google-task', async (event, taskId: string, taskListId: string) => {
      try {
        const result = await this.googleIntegrationService.completeTask(taskId, taskListId);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao concluir tarefa' 
        };
      }
    });

    // === AI TOOLS HANDLERS ===

    // Executar tool do Google Calendar/Tasks
    ipcMain.handle('execute-google-tool', async (event, toolName: string, parameters: any) => {
      try {
        const result = await this.googleCalendarTools.executeTool(toolName, parameters);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao executar ferramenta Google' 
        };
      }
    });

    // Executar tool de tarefas locais
    ipcMain.handle('execute-local-task-tool', async (event, toolName: string, parameters: any) => {
      try {
        const result = await this.localTaskTools.executeTool(toolName, parameters);
        return result;
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao executar ferramenta de tarefas' 
        };
      }
    });

    // Obter definições das tools disponíveis
    ipcMain.handle('get-available-tools', async () => {
      try {
        const googleTools = this.googleCalendarTools.getToolsDefinitions();
        const localTaskTools = this.localTaskTools.getToolsDefinitions();
        
        return {
          success: true,
          tools: {
            google: googleTools,
            localTasks: localTaskTools
          }
        };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro ao obter ferramentas' 
        };
      }
    });
  }

  private startMonitoring() {
    // Monitorar processo ativo a cada 5 segundos
    setInterval(async () => {
      try {
        const activeWindow = await this.processMonitor.getActiveWindow();
        // Sugestões contextuais desabilitadas - removido spam de notificações
        // if (activeWindow && this.groqClient) {
        //   this.sendContextualSuggestion(activeWindow);
        // }
      } catch (error) {
        console.error('Erro no monitoramento:', error);
      }
    }, 5000);
  }

  private async sendContextualSuggestion(activeWindow: any) {
    // FUNÇÃO DESABILITADA - Sugestões contextuais removidas para evitar spam
    return;
    
    // if (!this.mainWindow || !this.groqClient) return;
    // this.mainWindow.webContents.send('contextual-suggestion', {
    //   app: activeWindow.owner.name,
    //   suggestion: `Detectado: ${activeWindow.owner.name} ativo. Quer sugestões contextuais?`
    // });
  }

  private async startCommandPaletteServer() {
    try {
      // Configurar callbacks para o servidor da paleta de comandos
      this.commandPaletteServer.setCallbacks({
        showMainWindow: () => this.showMainWindow(),
        showSettings: () => this.showSettings(),
        mainWindow: this.mainWindow,
        tray: this.tray
      });

      // Iniciar servidor na porta 3001
      await this.commandPaletteServer.start(3001);
      console.log('✅ Servidor da Paleta de Comandos iniciado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao iniciar servidor da paleta de comandos:', error);
      
      // Tentar porta alternativa
      try {
        await this.commandPaletteServer.start(3002);
        console.log('✅ Servidor da Paleta de Comandos iniciado na porta alternativa 3002');
      } catch (alternativeError) {
        console.error('❌ Falha ao iniciar servidor em porta alternativa:', alternativeError);
      }
    }
  }

  private async startChatAPIServer() {
    try {
      let port = 3003;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        try {
          await this.chatAPIServer.start(port);
          console.log(`✅ Chat API Server iniciado na porta ${port}`);
          break;
        } catch (error: any) {
          if (error.code === 'EADDRINUSE') {
            console.log(`❌ Porta ${port} em uso, tentando próxima...`);
            port++;
            attempts++;
          } else {
            console.error('❌ Erro ao iniciar Chat API Server:', error);
            break;
          }
        }
      }

      if (attempts >= maxAttempts) {
        console.error('❌ Não foi possível iniciar o Chat API Server após múltiplas tentativas');
      }
    } catch (error) {
      console.error('❌ Erro crítico no Chat API Server:', error);
    }
  }

  private cleanup() {
    // Remover todos os atalhos globais registrados
    globalShortcut.unregisterAll();
    console.log('🧹 Atalhos globais removidos');
    
    if (this.processMonitor) {
      this.processMonitor.stop();
    }
    
    if (this.commandPaletteServer) {
      this.commandPaletteServer.stop();
    }

    if (this.chatAPIServer) {
      this.chatAPIServer.stop();
    }
  }
}

// Inicializar aplicação
const coPiloto = new CoPilotoDesktop();
coPiloto.initialize().catch(console.error);

export default coPiloto; 