import express from 'express';
import cors from 'cors';
import { streamText, ToolSet } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';
import { AIToolsService } from './aiToolsService';

export class ChatAPIServer {
  private app: express.Application;
  private server: any;
  private aiToolsService: AIToolsService | null = null;
  private groqApiKey: string | null = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'file://', 'app://'],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
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
      res.json({ status: 'ok', aiTools: !!this.aiToolsService });
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

    // Chat endpoint usando AI SDK
    this.app.post('/api/chat', async (req, res) => {
      console.log('🚀 [CHAT API] Recebida requisição de chat');
      const startTime = Date.now();
      
      try {
        const { messages } = req.body;
        console.log('📨 [CHAT API] Mensagens recebidas:', messages?.length || 0);

        if (!this.groqApiKey) {
          console.log('❌ [CHAT API] Chave Groq não configurada');
          return res.status(400).json({ error: 'Chave Groq não configurada' });
        }

        console.log('✅ [CHAT API] Chave Groq OK, iniciando processamento...');

        console.log('🔧 [CHAT API] Criando modelo Groq...');
        const groqModel = createGroq({
          apiKey: this.groqApiKey,
        });

        console.log('🛠️ [CHAT API] Configurando tools...');
        const tools: ToolSet = {
          getEmailSummary: {
            description: 'Obter resumo dos últimos emails',
            parameters: z.object({}),
            execute: async () => {
              return await this.executeGetEmailSummary();
            }
          },
          addTask: {
            description: 'Adicionar nova tarefa',
            parameters: z.object({
              description: z.string().describe('Descrição da tarefa')
            }),
            execute: async (args) => {
              return await this.executeAddTask(args.description);
            }
          },
          getTasks: {
            description: 'Obter lista de tarefas',
            parameters: z.object({}),
            execute: async () => {
              return await this.executeGetTasks();
            }
          },
          getTechNews: {
            description: 'Obter últimas notícias de tecnologia',
            parameters: z.object({}),
            execute: async () => {
              return await this.executeGetTechNews();
            }
          },
          searchNews: {
            description: 'Buscar notícias por palavras-chave',
            parameters: z.object({
              keywords: z.string().describe('Palavras-chave para busca')
            }),
            execute: async (args) => {
              return await this.executeSearchNews(args.keywords);
            }
          },
          saveNote: {
            description: 'Salvar uma nota',
            parameters: z.object({
              title: z.string().describe('Título da nota'),
              content: z.string().describe('Conteúdo da nota')
            }),
            execute: async (args) => {
              return await this.executeSaveNote(args.title, args.content);
            }
          },
          searchKnowledge: {
            description: 'Buscar informações na base de conhecimento',
            parameters: z.object({
              query: z.string().describe('Consulta para busca')
            }),
            execute: async (args) => {
              return await this.executeSearchKnowledge(args.query);
            }
          },
          getSystemStatus: {
            description: 'Obter status do sistema',
            parameters: z.object({}),
            execute: async () => {
              return await this.executeGetSystemStatus();
            }
          }
        };

        console.log('💬 [CHAT API] Iniciando streamText com tools...');
        const result = streamText({
          model: groqModel('llama3-8b-8192'),
          system: `Você é o Duckduki, um assistente de produtividade inteligente e amigável. 
          
Você pode ajudar com:
📧 Questões sobre emails (use getEmailSummary)
📋 Organização de tarefas (use addTask, getTasks)
📰 Informações sobre tecnologia (use getTechNews, searchNews)
📚 Conhecimento geral (use searchKnowledge)
💻 Dicas de produtividade e status do sistema (use getSystemStatus)
📝 Salvar notas importantes (use saveNote)

Use as ferramentas disponíveis sempre que apropriado para fornecer informações atualizadas e precisas.
Sempre seja útil, conversacional e responda de forma clara e objetiva.`,
          messages,
          tools,
          maxTokens: 1024,
          abortSignal: AbortSignal.timeout(30000) // Timeout de 30 segundos
        });

        console.log('⚡ [CHAT API] StreamText criado, processando...');
        
        // Processar tool calls se existirem
        const resultWithTools = result;
        console.log('🔧 [CHAT API] Verificando tool calls...');
        
        // Para esta versão, vamos processar tools de forma manual
        // O stream já inclui as tool calls automaticamente
        // ...

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        console.log('📡 [CHAT API] Enviando resposta streamada...');
        resultWithTools.pipeDataStreamToResponse(res);

        console.log('✅ [CHAT API] Streaming finalizado com sucesso.');


      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ [CHAT API] Erro após ${processingTime}ms:`, error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  setAIToolsService(aiToolsService: AIToolsService) {
    this.aiToolsService = aiToolsService;
    console.log('✅ AI Tools Service configurado na API');
  }

  setGroqApiKey(apiKey: string) {
    this.groqApiKey = apiKey;
    console.log('✅ Chave Groq configurada na API');
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

  // Método para tornar privados públicos no AIToolsService
  async executeGetEmailSummary() {
    return this.aiToolsService?.executeGetEmailSummary();
  }

  async executeAddTask(description: string) {
    return this.aiToolsService?.executeAddTask(description);
  }

  async executeGetTasks() {
    return this.aiToolsService?.executeGetTasks();
  }

  async executeGetTechNews() {
    return this.aiToolsService?.executeGetTechNews();
  }

  async executeSearchNews(keywords: string) {
    return this.aiToolsService?.executeSearchNews(keywords);
  }

  async executeSaveNote(title: string, content: string) {
    return this.aiToolsService?.executeSaveNote(title, content);
  }

  async executeSearchKnowledge(query: string) {
    return this.aiToolsService?.executeSearchKnowledge(query);
  }

  async executeGetSystemStatus() {
    return this.aiToolsService?.executeGetSystemStatus();
  }
} 