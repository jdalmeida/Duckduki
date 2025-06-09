import express from 'express';
import cors from 'cors';
import { AIToolsService } from './aiToolsService';
import { AIManager } from './aiManager';

export class ChatAPIServer {
  private app: express.Application;
  private server: any;
  private aiToolsService: AIToolsService | null = null;
  private aiManager: AIManager | null = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors({
      origin: ['http://localhost:3003', 'http://127.0.0.1:3003', 'file://', 'app://'],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
      exposedHeaders: ['Content-Type', 'Cache-Control', 'Connection'],
      credentials: true
    }));
    this.app.use(express.json({ limit: '10mb' }));
    
    // Log de todas as requisições
    this.app.use((req, res, next) => {
      console.log(`📊 [API] ${req.method} ${req.path} - ${new Date().toISOString()}`);
      
      // Log adicional para responses
      const originalSend = res.send;
      res.send = function(body) {
        console.log(`📤 [API] Response sent: ${req.method} ${req.path} - Status: ${res.statusCode}`);
        return originalSend.call(this, body);
      };
      
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        aiTools: !!this.aiToolsService,
        aiManager: !!this.aiManager,
        activeProvider: this.aiManager?.getActiveProvider() || 'none'
      });
    });

    // Teste simples
    this.app.post('/api/test', (req, res) => {
      console.log('🧪 [TEST API] Recebida requisição de teste');
      res.json({
        role: 'assistant',
        content: 'Resposta de teste funcionando!',
        id: Date.now().toString(),
        createdAt: new Date()
      });
    });

    // Teste de streaming simples
    this.app.post('/api/test-stream', async (req, res) => {
      console.log('🌊 [STREAM TEST] Iniciando teste de streaming');
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      const testText = "Testando streaming... Este é um texto que será enviado em chunks.";
      const words = testText.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Delay de 200ms
        const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
        console.log(`📤 [STREAM TEST] Enviando chunk ${i + 1}/${words.length}:`, chunk);
        res.write(chunk);
      }
      
      console.log('✅ [STREAM TEST] Streaming concluído');
      res.end();
    });

    // Teste de chat simples sem tools
    this.app.post('/api/chat-simple', async (req, res) => {
      console.log('🧪 [SIMPLE CHAT] Teste de chat simples');
      
      try {
        const { messages } = req.body;
        
        if (!this.aiManager) {
          return res.status(400).json({ error: 'AI Manager não configurado' });
        }

        const availableProviders = this.aiManager.getAvailableProviders().filter(p => p.configured);
        if (availableProviders.length === 0) {
          return res.status(400).json({ error: 'Nenhum provedor de IA configurado' });
        }

        // Usar o AIManager para processar a mensagem
        const lastMessage = messages[messages.length - 1];
        const response = await this.aiManager.processCommand(lastMessage.content, false); // Não salvar no knowledge

        res.json({
          role: 'assistant',
          content: response,
          id: Date.now().toString(),
          createdAt: new Date()
        });

        console.log('✅ [SIMPLE CHAT] Resposta enviada');

      } catch (error) {
        console.error('❌ [SIMPLE CHAT] Erro:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Debug endpoint para testar AIManager
    this.app.get('/api/debug-ai', async (req, res) => {
      try {
        if (!this.aiManager) {
          return res.json({ error: 'AIManager não configurado' });
        }

        const debug = {
          activeProvider: this.aiManager.getActiveProvider(),
          availableProviders: this.aiManager.getAvailableProviders(),
          aiToolsService: !!this.aiToolsService
        };

        console.log('🔍 [DEBUG] Info do AIManager:', debug);
        res.json(debug);
      } catch (error) {
        console.error('❌ [DEBUG] Erro:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Chat endpoint principal usando AIManager
    this.app.post('/api/chat', async (req, res) => {
      console.log('🚀 [CHAT API] Recebida requisição de chat');
      const startTime = Date.now();
      
      try {
        const { messages } = req.body;
        console.log('📨 [CHAT API] Mensagens recebidas:', messages?.length || 0);

        if (!this.aiManager) {
          console.log('❌ [CHAT API] AI Manager não configurado');
          return res.status(400).json({ error: 'AI Manager não configurado' });
        }

        const chatAvailableProviders = this.aiManager.getAvailableProviders().filter(p => p.configured);
        if (chatAvailableProviders.length === 0) {
          console.log('❌ [CHAT API] Nenhum provedor de IA configurado');
          return res.status(400).json({ error: 'Nenhum provedor de IA configurado' });
        }

        console.log('✅ [CHAT API] AI Manager OK, processando...');
        console.log('🎯 [CHAT API] Provedor ativo:', this.aiManager.getActiveProvider());

        // Verificar se aiToolsService está disponível
        const hasAITools = !!this.aiToolsService;
        console.log('🔍 [CHAT API] AIToolsService disponível:', hasAITools);
        console.log('🔍 [CHAT API] AIManager disponível:', !!this.aiManager);
        console.log('🔍 [CHAT API] Provedores configurados:', this.aiManager.getAvailableProviders().filter(p => p.configured));

        if (hasAITools) {
          // Usar processamento com contexto e ferramentas via stream do AI SDK
          const lastMessage = messages[messages.length - 1];
          
          console.log('🛠️ [CHAT API] Processando com ferramentas via stream...');
          
          try {
            // Usar o AIToolsService diretamente para manter o formato do AI SDK
            const chatHistory = messages.slice(0, -1);
            const stream = await this.aiToolsService!.processWithToolsStream(lastMessage.content, chatHistory);
            
            console.log('✅ [CHAT API] Stream obtido do AIToolsService');
            
            // Usar pipeDataStreamToResponse para manter o formato correto
            stream.pipeDataStreamToResponse(res, {
              status: 200,
              statusText: 'OK',
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
              }
            });
            
          } catch (toolError) {
            console.error('❌ [CHAT API] Erro no processamento com ferramentas:', toolError);
            
            // Fallback para processamento simples mas usando streaming da AI SDK
            const lastMessage = messages[messages.length - 1];
            
            try {
              // Tentar usar AIManager diretamente para streaming de contexto
              const contextStream = await this.aiManager.processCommandWithContextStream(lastMessage.content, messages.slice(0, -1));
              
              console.log('✅ [CHAT API] Fallback para stream do AIManager');
              contextStream.pipeDataStreamToResponse(res, {
                status: 200,
                statusText: 'OK',
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type',
                }
              });
              
            } catch (fallbackError) {
              console.error('❌ [CHAT API] Erro no fallback de streaming:', fallbackError);
              
              // Último recurso: resposta simples
              const response = await this.aiManager.processCommand(lastMessage.content, false);
              
              res.json({
                id: Date.now().toString(),
                object: 'chat.completion.chunk',
                created: Date.now(),
                model: this.aiManager.getActiveProvider(),
                choices: [{
                  index: 0,
                  delta: { content: response },
                  finish_reason: 'stop'
                }]
              });
            }
          }
          
        } else {
          // Processamento simples sem ferramentas
          console.log('💬 [CHAT API] Processamento simples sem ferramentas');
          const lastMessage = messages[messages.length - 1];
          const response = await this.aiManager.processCommand(lastMessage.content, true);
          
          // Resposta em formato compatível com useChat
          res.json({
            id: Date.now().toString(),
            object: 'chat.completion.chunk',
            created: Date.now(),
            model: this.aiManager.getActiveProvider(),
            choices: [{
              index: 0,
              delta: { content: response },
              finish_reason: 'stop'
            }]
          });
        }

        const processingTime = Date.now() - startTime;
        console.log(`🎯 [CHAT API] Processamento concluído em ${processingTime}ms`);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ [CHAT API] Erro após ${processingTime}ms:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: error.message });
        }
      }
    });
  }

  setAIToolsService(aiToolsService: AIToolsService) {
    this.aiToolsService = aiToolsService;
    console.log('✅ AI Tools Service configurado na API');
  }

  setAIManager(aiManager: AIManager) {
    this.aiManager = aiManager;
    console.log('✅ AI Manager configurado na API');
  }

  // Manter compatibilidade com código existente
  setGroqApiKey(apiKey: string) {
    console.log('⚠️ setGroqApiKey deprecated - use setAIManager');
  }

  start(port: number = 3003): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          console.log(`🚀 Chat API rodando na porta ${port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Chat API parada');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
} 