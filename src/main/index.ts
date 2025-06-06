// Verificar se estamos em um ambiente Electron
if (typeof require === 'undefined') {
  console.error('❌ Este arquivo deve ser executado no contexto do Node.js/Electron');
  process.exit(1);
}

import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut, shell } from 'electron';
import { join } from 'path';
import { GroqClient } from './groqClient';
import { EmailService } from './emailService';
import { ProcessMonitor } from './processMonitor';
import { DeployService } from './deployService';
import { SecurityManager } from './securityManager';
import { CommandPaletteServer } from './commandPaletteServer';
import { feedService } from './feedService';
import { taskService } from './taskService';
import { AIToolsService } from './aiToolsService';
import { ChatAPIServer } from './apiRoutes';

class CoPilotoDesktop {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private groqClient: GroqClient | null = null;
  private aiToolsService: AIToolsService | null = null;
  private emailService: EmailService;
  private processMonitor: ProcessMonitor;
  private deployService: DeployService;
  private securityManager: SecurityManager;
  private commandPaletteServer: CommandPaletteServer;
  private chatAPIServer: ChatAPIServer;

  constructor() {
    this.emailService = new EmailService();
    this.processMonitor = new ProcessMonitor();
    this.deployService = new DeployService();
    this.securityManager = new SecurityManager();
    this.commandPaletteServer = new CommandPaletteServer();
    this.chatAPIServer = new ChatAPIServer();
  }

  async initialize() {
    // Verificar se estamos no contexto do Electron
    if (!app) {
      console.error('Erro: Aplicação deve ser executada no contexto do Electron');
      console.error('Use: npm run start ou npm run dev');
      process.exit(1);
    }

    await app.whenReady();
    
    // Inicializar cliente Groq com chave segura
    const groqKey = await this.securityManager.getGroqKey();
    if (groqKey) {
      this.groqClient = new GroqClient(groqKey);
      // Configurar IA para o serviço de tarefas
      taskService.setGroqClient(this.groqClient);
      
      // Inicializar AIToolsService com todos os módulos
      this.aiToolsService = new AIToolsService(
        groqKey,
        this.emailService,
        this.groqClient.getKnowledgeService(),
        taskService,
        feedService,
        this.processMonitor,
        this.deployService
      );
      
      // Conectar o AIToolsService ao GroqClient
      this.groqClient.setAIToolsService(this.aiToolsService);

      // Configurar ChatAPIServer
      this.chatAPIServer.setGroqApiKey(groqKey);
      this.chatAPIServer.setAIToolsService(this.aiToolsService);
    }

    // Carregar configuração de email se existir
    const emailConfig = await this.securityManager.getEmailConfig();
    if (emailConfig) {
      this.emailService.setConfig(emailConfig);
      console.log('✅ Configuração de email carregada');
    }

    this.createTray();
    this.setupIPC();
    this.setupGlobalShortcuts();
    this.startMonitoring();
    this.startCommandPaletteServer();
    this.startChatAPIServer();

    // Manter app rodando em background
    app.on('window-all-closed', (e) => {
      e.preventDefault();
    });

    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  private createTray() {
    const iconPath = join(__dirname, '../../assets/icon.png');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    
    this.tray = new Tray(icon);
    this.tray.setToolTip('Duckduki');
    
    const shortcutText = process.platform === 'darwin' ? 'Cmd+Shift+A' : 'Ctrl+Shift+A';
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
        label: 'Sair',
        click: () => app.quit()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.on('click', () => this.showMainWindow());
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
      this.mainWindow.show();
      this.mainWindow.focus();
      return;
    }

    this.mainWindow = new BrowserWindow({
      width: 400,
      height: 600,
      show: false,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload.js')
      }
    });

    // Carregar a interface React
    if (process.env.NODE_ENV === 'development') {
      // Aguardar um pouco para o Vite iniciar
      setTimeout(() => {
        this.mainWindow?.loadURL('http://localhost:3000').catch((err) => {
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
  }

  private positionWindow() {
    if (!this.mainWindow || !this.tray) return;

    const { screen } = require('electron');
    const trayBounds = this.tray.getBounds();
    const windowBounds = this.mainWindow.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const screenBounds = primaryDisplay.workAreaSize;
    
    // Calcular posição baseada na localização da tray
    let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    let y: number;
    
    // Verificar se a tray está na parte superior ou inferior da tela
    if (trayBounds.y < screenBounds.height / 2) {
      // Tray no topo (macOS, alguns Linux)
      y = Math.round(trayBounds.y + trayBounds.height + 4);
    } else {
      // Tray na parte inferior (Windows, maioria dos casos)
      y = Math.round(trayBounds.y - windowBounds.height - 4);
    }
    
    // Garantir que a janela não saia da tela
    x = Math.max(0, Math.min(x, screenBounds.width - windowBounds.width));
    y = Math.max(0, Math.min(y, screenBounds.height - windowBounds.height));
    
    this.mainWindow.setPosition(x, y, false);
  }

  private showSettings() {
    // Implementar janela de configurações
    console.log('Abrindo configurações...');
  }

  private setupIPC() {
    // Comando de texto/voz
    ipcMain.handle('process-command', async (event, command: string) => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const response = await this.groqClient.processCommand(command);
        return { success: true, response };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Comando com contexto de chat
    ipcMain.handle('process-command-with-context', async (event, command: string, chatContext: Array<{ role: string; content: string }>) => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const response = await this.groqClient.processCommandWithContext(command, chatContext);
        return { success: true, response };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Comando com contexto de chat (streaming)
    ipcMain.handle('process-command-with-context-stream', async (event, command: string, chatContext: Array<{ role: string; content: string }>) => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const stream = await this.groqClient.processCommandWithContextStream(command, chatContext);
        
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
        if (!this.groqClient) {
          return { error: 'Chave Groq não configurada' };
        }
        
        const summary = await this.groqClient.summarizeEmails(emails);
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
        
        if (!this.groqClient) {
          return { error: 'Chave Groq não configurada' };
        }

        const analysis = await this.groqClient.analyzeCode(codeSnippet);
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
        this.groqClient = new GroqClient(apiKey);
        // Configurar IA para o serviço de tarefas
        taskService.setGroqClient(this.groqClient);
        
        // Inicializar AIToolsService com todos os módulos
        this.aiToolsService = new AIToolsService(
          apiKey,
          this.emailService,
          this.groqClient.getKnowledgeService(),
          taskService,
          feedService,
          this.processMonitor,
          this.deployService
        );
        
        // Conectar o AIToolsService ao GroqClient
        this.groqClient.setAIToolsService(this.aiToolsService);
        
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Verificar se tem chave Groq
    ipcMain.handle('has-groq-key', async () => {
      const hasKey = await this.securityManager.hasGroqKey();
      return { hasKey };
    });

    // Limpar dados
    ipcMain.handle('clear-data', async () => {
      try {
        await this.securityManager.clearAllData();
        this.groqClient = null;
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

    // === HANDLERS DE REPOSITÓRIO DE CONHECIMENTO ===

    // Adicionar item ao repositório de conhecimento
    ipcMain.handle('add-knowledge-item', async (event, item: { title: string; content: string; type: string; tags: string[]; url?: string }) => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const result = await this.groqClient.addKnowledge(
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
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const results = await this.groqClient.searchKnowledge(query, type as any, limit);
        return { success: true, results };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter todos os itens de conhecimento
    ipcMain.handle('get-all-knowledge', async (event, type?: string, limit?: number) => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const knowledgeService = this.groqClient.getKnowledgeService();
        const items = await knowledgeService.getAllKnowledge(type as any, limit);
        return { success: true, items };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter item específico de conhecimento
    ipcMain.handle('get-knowledge-item', async (event, id: string) => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const knowledgeService = this.groqClient.getKnowledgeService();
        const item = await knowledgeService.getKnowledgeItem(id);
        return { success: true, item };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Atualizar item de conhecimento
    ipcMain.handle('update-knowledge-item', async (event, id: string, updates: any) => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const knowledgeService = this.groqClient.getKnowledgeService();
        const item = await knowledgeService.updateKnowledgeItem(id, updates);
        return { success: true, item };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Remover item de conhecimento
    ipcMain.handle('delete-knowledge-item', async (event, id: string) => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const knowledgeService = this.groqClient.getKnowledgeService();
        const success = await knowledgeService.deleteKnowledgeItem(id);
        return { success };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter estatísticas do repositório
    ipcMain.handle('get-knowledge-stats', async () => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const knowledgeService = this.groqClient.getKnowledgeService();
        const stats = await knowledgeService.getStats();
        return { success: true, stats };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Obter todas as tags
    ipcMain.handle('get-all-knowledge-tags', async () => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const knowledgeService = this.groqClient.getKnowledgeService();
        const tags = await knowledgeService.getAllTags();
        return { success: true, tags };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Salvar resumo de post com IA
    ipcMain.handle('save-post-summary', async (event, title: string, content: string, url?: string, tags: string[] = []) => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const result = await this.groqClient.savePostSummaryWithAI(title, content, url, tags);
        return { success: true, item: result };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Exportar base de conhecimento
    ipcMain.handle('export-knowledge', async () => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const knowledgeService = this.groqClient.getKnowledgeService();
        const items = await knowledgeService.exportKnowledge();
        return { success: true, items };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Importar base de conhecimento
    ipcMain.handle('import-knowledge', async (event, items: any[]) => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const knowledgeService = this.groqClient.getKnowledgeService();
        await knowledgeService.importKnowledge(items);
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });

    // Limpar base de conhecimento
    ipcMain.handle('clear-knowledge', async () => {
      if (!this.groqClient) {
        return { error: 'Chave Groq não configurada' };
      }

      try {
        const knowledgeService = this.groqClient.getKnowledgeService();
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
        const isFullScreen = this.mainWindow?.isFullScreen() || false;
        this.mainWindow?.setFullScreen(!isFullScreen);
        return {
          success: true,
          isFullScreen: !isFullScreen
        };
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao alternar tela inteira'
        };
      }
    });

    // Obter status da tela inteira
    ipcMain.handle('get-fullscreen-status', async () => {
      try {
        const isFullScreen = this.mainWindow?.isFullScreen() || false;
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
        this.mainWindow?.setFullScreen(fullscreen);
        return {
          success: true,
          isFullScreen: fullscreen
        };
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Erro ao definir tela inteira'
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