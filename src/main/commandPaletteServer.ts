import express from 'express';
import cors from 'cors';
import { BrowserWindow } from 'electron';

export class CommandPaletteServer {
  private app: express.Application;
  private server: any;
  private mainWindow: BrowserWindow | null = null;
  private tray: Electron.Tray | null = null;
  private showMainWindowCallback: (() => void) | null = null;
  private showSettingsCallback: (() => void) | null = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setCallbacks(callbacks: {
    showMainWindow: () => void;
    showSettings: () => void;
    mainWindow: BrowserWindow | null;
    tray: Electron.Tray | null;
  }) {
    this.showMainWindowCallback = callbacks.showMainWindow;
    this.showSettingsCallback = callbacks.showSettings;
    this.mainWindow = callbacks.mainWindow;
    this.tray = callbacks.tray;
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Middleware de log
    this.app.use((req, res, next) => {
      console.log(`🌐 [Command Palette] ${req.method} ${req.path}`, req.body);
      next();
    });
  }

  private setupRoutes() {
    // Rota principal para receber comandos
    this.app.post('/api/command', (req, res) => {
      const { command, data } = req.body;
      
      try {
        this.handleCommand(command, data);
        res.json({ success: true, message: `Comando ${command} executado` });
      } catch (error) {
        console.error('❌ Erro ao executar comando:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Rota de status
    this.app.get('/api/status', (req, res) => {
      res.json({ 
        status: 'running', 
        agent: 'Duckduki',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // Rota de health check
    this.app.get('/api/health', (req, res) => {
      res.json({ healthy: true });
    });
  }

  private handleCommand(command: string, data?: any) {
    console.log(`🎯 Executando comando: ${command}`);
    
    switch (command) {
      case 'show-main-window':
        if (this.showMainWindowCallback) {
          this.showMainWindowCallback();
        }
        break;

      case 'open-chat-with-focus':
        if (this.showMainWindowCallback) {
          this.showMainWindowCallback();
          // Focar no campo de entrada de chat após um pequeno delay
          setTimeout(() => {
            if (this.mainWindow) {
              this.mainWindow.webContents.executeJavaScript(`
                const chatInput = document.querySelector('#chat-input, input[type="text"], textarea');
                if (chatInput) {
                  chatInput.focus();
                  chatInput.select();
                }
              `);
            }
          }, 500);
        }
        break;

      case 'toggle-process-monitoring':
        // Enviar comando para o processo principal via IPC
        if (this.mainWindow) {
          this.mainWindow.webContents.send('toggle-process-monitoring');
        }
        break;

      case 'show-settings':
        if (this.showSettingsCallback) {
          this.showSettingsCallback();
        }
        break;

      case 'open-email-composer':
        if (this.showMainWindowCallback) {
          this.showMainWindowCallback();
          // Navegar para a aba de email
          setTimeout(() => {
            if (this.mainWindow) {
              this.mainWindow.webContents.executeJavaScript(`
                const emailTab = document.querySelector('[data-tab="email"], .email-tab, #email-tab');
                if (emailTab) {
                  emailTab.click();
                }
              `);
            }
          }, 500);
        }
        break;

      default:
        console.warn(`⚠️ Comando não reconhecido: ${command}`);
        throw new Error(`Comando não reconhecido: ${command}`);
    }
  }

  start(port: number = 3001): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, 'localhost', () => {
          console.log(`🚀 Servidor da Paleta de Comandos rodando na porta ${port}`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          console.error('❌ Erro no servidor da paleta de comandos:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('🛑 Servidor da Paleta de Comandos parado');
    }
  }
} 