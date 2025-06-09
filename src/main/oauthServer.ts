import express from 'express';
import { Server } from 'http';

export interface OAuthCallbackData {
  code?: string;
  error?: string;
  state?: string;
}

export class OAuthServer {
  private app: express.Application;
  private server: Server | null = null;
  private port: number;
  private pendingRequests: Map<string, {
    resolve: (value: OAuthCallbackData) => void;
    reject: (reason?: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Callback para Google Drive
    this.app.get('/auth/google/callback', (req, res) => {
      const { code, error, state } = req.query;
      
      console.log('Google Drive callback recebido:', { code: !!code, error, state });
      
      if (state && this.pendingRequests.has(state as string)) {
        const pending = this.pendingRequests.get(state as string)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(state as string);
        
        pending.resolve({
          code: code as string,
          error: error as string,
          state: state as string
        });
      }

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Autenticação Google Drive - Duckduki</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc05 100%);
              color: white;
            }
            .container { 
              max-width: 500px; 
              margin: 0 auto; 
              background: rgba(255,255,255,0.1);
              padding: 40px;
              border-radius: 15px;
              backdrop-filter: blur(10px);
            }
            .success { color: #34a853; }
            .error { color: #ea4335; }
            h1 { margin-bottom: 20px; }
            p { font-size: 18px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            ${error ? `
              <h1 class="error">❌ Erro na Autenticação</h1>
              <p>Ocorreu um erro: ${error}</p>
              <p>Tente novamente no aplicativo Duckduki.</p>
            ` : `
              <h1 class="success">✅ Autenticação Bem-sucedida!</h1>
              <p>Sua conta Google Drive foi conectada com sucesso ao Duckduki.</p>
              <p>Você pode fechar esta janela e voltar ao aplicativo.</p>
            `}
          </div>
          <script>
            // Tentar fechar a janela automaticamente após 3 segundos
            setTimeout(() => {
              try {
                window.close();
              } catch (e) {
                console.log('Não foi possível fechar automaticamente');
              }
            }, 3000);
          </script>
        </body>
        </html>
      `);
    });

    // Página de erro genérica
    this.app.get('/auth/error', (req, res) => {
      const { message } = req.query;
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Erro de Autenticação - Duckduki</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              color: white;
            }
            .container { 
              max-width: 500px; 
              margin: 0 auto; 
              background: rgba(255,255,255,0.1);
              padding: 40px;
              border-radius: 15px;
              backdrop-filter: blur(10px);
            }
            h1 { margin-bottom: 20px; color: #ff6b6b; }
            p { font-size: 18px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Erro de Autenticação</h1>
            <p>${message || 'Ocorreu um erro durante a autenticação.'}</p>
            <p>Tente novamente no aplicativo Duckduki.</p>
          </div>
        </body>
        </html>
      `);
    });
  }

  // Iniciar servidor
  async start(): Promise<{ success: boolean; port?: number; error?: string }> {
    return new Promise((resolve) => {
      const attempts = 10;
      let currentPort = this.port;
      let attempt = 0;

      const tryStart = () => {
        this.server = this.app.listen(currentPort, 'localhost', () => {
          console.log(`🔐 Servidor OAuth iniciado na porta ${currentPort}`);
          this.port = currentPort;
          resolve({ success: true, port: currentPort });
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE' && attempt < attempts) {
            console.log(`Porta ${currentPort} em uso, tentando ${currentPort + 1}...`);
            currentPort++;
            attempt++;
            setTimeout(tryStart, 100);
          } else {
            console.error('Erro ao iniciar servidor OAuth:', error);
            resolve({ 
              success: false, 
              error: `Não foi possível iniciar servidor OAuth: ${error.message}` 
            });
          }
        });
      };

      tryStart();
    });
  }

  // Parar servidor
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🔐 Servidor OAuth parado');
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Aguardar callback OAuth
  waitForCallback(state: string, timeoutMs: number = 120000): Promise<OAuthCallbackData> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(state);
        reject(new Error('Timeout na autenticação OAuth'));
      }, timeoutMs);

      this.pendingRequests.set(state, {
        resolve,
        reject,
        timeout
      });
    });
  }

  // Abrir URL no browser padrão
  async openAuthUrl(url: string): Promise<void> {
    const { shell } = require('electron');
    await shell.openExternal(url);
  }

  // Fluxo completo de autenticação
  async authenticateProvider(
    generateAuthUrl: () => string,
    exchangeCodeForTokens: (code: string) => Promise<{ success: boolean; error?: string }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Gerar URL de autenticação
      const authUrl = generateAuthUrl();
      
      // Extrair state da URL para aguardar callback
      const url = new URL(authUrl);
      const state = url.searchParams.get('state');
      
      if (!state) {
        throw new Error('State não encontrado na URL de autenticação');
      }

      console.log('🔐 Abrindo URL de autenticação:', authUrl);
      
      // Abrir URL no browser
      await this.openAuthUrl(authUrl);
      
      // Aguardar callback
      console.log('⏳ Aguardando callback OAuth...');
      const callbackData = await this.waitForCallback(state);
      
      if (callbackData.error) {
        throw new Error(`Erro OAuth: ${callbackData.error}`);
      }
      
      if (!callbackData.code) {
        throw new Error('Código de autorização não recebido');
      }
      
      console.log('✅ Código de autorização recebido, trocando por tokens...');
      
      // Trocar código por tokens
      const tokenResult = await exchangeCodeForTokens(callbackData.code);
      
      if (!tokenResult.success) {
        throw new Error(tokenResult.error || 'Erro ao trocar código por tokens');
      }
      
      console.log('🎉 Autenticação OAuth concluída com sucesso!');
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Erro na autenticação OAuth:', error);
      return { 
        success: false, 
        error: error.message || 'Erro desconhecido na autenticação' 
      };
    }
  }

  // Obter porta atual
  getPort(): number {
    return this.port;
  }

  // Verificar se servidor está rodando
  isRunning(): boolean {
    return this.server !== null;
  }
} 