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
        
        if (!this.groqApiKey) {
          return res.status(400).json({ error: 'Chave Groq não configurada' });
        }

        const groqModel = createGroq({
          apiKey: this.groqApiKey,
        });

        const result = streamText({
          model: groqModel('llama3-8b-8192'),
          system: 'Você é um assistente útil. Responda de forma breve e direta.',
          messages,
          maxTokens: 100
        });

        result.pipeDataStreamToResponse(res);
        console.log('✅ [SIMPLE CHAT] Stream configurado');

      } catch (error) {
        console.error('❌ [SIMPLE CHAT] Erro:', error);
        res.status(500).json({ error: error.message });
      }
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
        
        // Verificar se aiToolsService está disponível
        const hasAITools = !!this.aiToolsService;
        console.log('🔍 [CHAT API] AIToolsService disponível:', hasAITools);
        
        const tools: ToolSet = hasAITools ? {
          getEmailSummary: {
            description: 'Obter resumo dos últimos emails',
            parameters: z.object({}),
            execute: async () => {
              try {
                console.log('📧 [TOOL] Executando getEmailSummary...');
                const result = await this.executeGetEmailSummary();
                console.log('✅ [TOOL] getEmailSummary executado com sucesso');
                return result || 'Nenhum email encontrado';
              } catch (error) {
                console.error('❌ [TOOL] Erro em getEmailSummary:', error);
                return 'Erro ao obter resumo dos emails: ' + error.message;
              }
            }
          },
          addTask: {
            description: 'Adicionar nova tarefa',
            parameters: z.object({
              description: z.string().describe('Descrição da tarefa')
            }),
            execute: async (args) => {
              try {
                console.log('📋 [TOOL] Executando addTask:', args);
                const result = await this.executeAddTask(args.description);
                console.log('✅ [TOOL] addTask executado com sucesso');
                return result || 'Tarefa adicionada com sucesso';
              } catch (error) {
                console.error('❌ [TOOL] Erro em addTask:', error);
                return 'Erro ao adicionar tarefa: ' + error.message;
              }
            }
          },
          getTasks: {
            description: 'Obter lista de tarefas',
            parameters: z.object({}),
            execute: async () => {
              try {
                console.log('📋 [TOOL] Executando getTasks...');
                const result = await this.executeGetTasks();
                console.log('✅ [TOOL] getTasks executado com sucesso');
                return result || 'Nenhuma tarefa encontrada';
              } catch (error) {
                console.error('❌ [TOOL] Erro em getTasks:', error);
                return 'Erro ao obter tarefas: ' + error.message;
              }
            }
          },
          getTechNews: {
            description: 'Obter últimas notícias de tecnologia',
            parameters: z.object({
              keywords: z.string().describe('Palavras-chave para busca')
            }),
            execute: async () => {
              try {
                console.log('📰 [TOOL] Executando getTechNews...');
                const result = await this.executeGetTechNews();
                console.log('✅ [TOOL] getTechNews executado com sucesso');
                return result || 'Nenhuma notícia encontrada';
              } catch (error) {
                console.error('❌ [TOOL] Erro em getTechNews:', error);
                return 'Erro ao obter notícias: ' + error.message;
              }
            }
          },
          searchNews: {
            description: 'Buscar notícias por palavras-chave',
            parameters: z.object({
              keywords: z.string().describe('Palavras-chave para busca')
            }),
            execute: async (args) => {
              try {
                console.log('🔍 [TOOL] Executando searchNews:', args);
                const result = await this.executeSearchNews(args.keywords);
                console.log('✅ [TOOL] searchNews executado com sucesso');
                return result || 'Nenhuma notícia encontrada para estas palavras-chave';
              } catch (error) {
                console.error('❌ [TOOL] Erro em searchNews:', error);
                return 'Erro ao buscar notícias: ' + error.message;
              }
            }
          },
          saveNote: {
            description: 'Salvar uma nota',
            parameters: z.object({
              title: z.string().describe('Título da nota'),
              content: z.string().describe('Conteúdo da nota')
            }),
            execute: async (args) => {
              try {
                console.log('📝 [TOOL] Executando saveNote:', args);
                const result = await this.executeSaveNote(args.title, args.content);
                console.log('✅ [TOOL] saveNote executado com sucesso');
                return result || 'Nota salva com sucesso';
              } catch (error) {
                console.error('❌ [TOOL] Erro em saveNote:', error);
                return 'Erro ao salvar nota: ' + error.message;
              }
            }
          },
          searchKnowledge: {
            description: 'Buscar informações na base de conhecimento',
            parameters: z.object({
              query: z.string().describe('Consulta para busca')
            }),
            execute: async (args) => {
              try {
                console.log('🔍 [TOOL] Executando searchKnowledge:', args);
                const result = await this.executeSearchKnowledge(args.query);
                console.log('✅ [TOOL] searchKnowledge executado com sucesso');
                return result || 'Nenhuma informação encontrada';
              } catch (error) {
                console.error('❌ [TOOL] Erro em searchKnowledge:', error);
                return 'Erro ao buscar conhecimento: ' + error.message;
              }
            }
          },
          getSystemStatus: {
            description: 'Obter status do sistema',
            parameters: z.object({}),
            execute: async () => {
              try {
                console.log('💻 [TOOL] Executando getSystemStatus...');
                const result = await this.executeGetSystemStatus();
                console.log('✅ [TOOL] getSystemStatus executado com sucesso');
                return result || 'Sistema funcionando normalmente';
              } catch (error) {
                console.error('❌ [TOOL] Erro em getSystemStatus:', error);
                return 'Erro ao obter status do sistema: ' + error.message;
              }
            }
          }
        } : {};

        console.log('💬 [CHAT API] Iniciando streamText com tools...');
        const result = streamText({
          model: groqModel('llama3-8b-8192'),
          system: hasAITools 
            ? `Você é o Duckduki, um assistente de produtividade inteligente e amigável.

IMPORTANTE: Quando você usar uma ferramenta, SEMPRE forneça uma resposta baseada no resultado da ferramenta. Não pare apenas na execução da ferramenta.

Ferramentas disponíveis:
- getEmailSummary: Para resumir emails
- addTask/getTasks: Para gerenciar tarefas
- getTechNews/searchNews: Para notícias de tecnologia
- saveNote: Para salvar notas
- searchKnowledge: Para buscar informações
- getSystemStatus: Para verificar o status do sistema

Processo:
1. Se o usuário pedir algo que requer uma ferramenta, use-a
2. Após receber o resultado da ferramenta, forneça uma resposta clara e útil baseada no resultado
3. Seja conversacional e explicativo`
            : `Você é o Duckduki, um assistente útil e amigável. Responda da melhor forma possível com seu conhecimento.`,
          messages,
          ...(hasAITools && Object.keys(tools).length > 0 ? { tools } : {}),
          maxTokens: 1024,
          maxSteps: hasAITools ? 10 : 1,
          toolChoice: hasAITools ? 'auto' : undefined,
          onError: (error) => {
            console.error('❌ [CHAT API] Erro no streamText:', error);
          },
          onFinish: (result) => {
            console.log('✅ [CHAT API] StreamText finalizado:', {
              finishReason: result.finishReason,
              usage: result.usage,
              toolCalls: result.toolCalls?.length || 0,
              toolResults: result.toolResults?.length || 0,
              stepsTotal: result.steps?.length || 0
            });
          },
          onStepFinish: (step) => {
            console.log(`📝 [CHAT API] Step ${step.stepType} finalizado:`, {
              finishReason: step.finishReason,
              toolCalls: step.toolCalls?.length || 0,
              toolResults: step.toolResults?.length || 0,
              textLength: step.text?.length || 0
            });
          }
        });

        console.log('⚡ [CHAT API] StreamText criado, configurando stream...');
        
        const processingTime = Date.now() - startTime;
        console.log(`🎯 [CHAT API] Processamento iniciado em ${processingTime}ms`);
        
        // Usar pipeDataStreamToResponse com tratamento de erro
        try {
          result.pipeDataStreamToResponse(res, {
            status: 200,
            statusText: 'OK',
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
            getErrorMessage: (error) => {
              console.error('❌ [CHAT API] Erro no stream:', error);
              return `Erro interno: ${error instanceof Error ? error.message : String(error)}`;
            }
          });
          
          console.log('✅ [CHAT API] Stream configurado com pipeDataStreamToResponse');
        } catch (pipeError) {
          console.error('❌ [CHAT API] Erro no pipe:', pipeError);
          if (!res.headersSent) {
            res.status(500).json({ error: `Erro no streaming: ${pipeError.message}` });
          }
        }

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
    if (!this.aiToolsService) {
      console.log('⚠️ [TOOLS] AIToolsService não está disponível para getEmailSummary');
      return 'Serviço de emails não está disponível no momento.';
    }
    try {
      const result = await this.aiToolsService.executeGetEmailSummary();
      console.log('🔍 [TOOLS] getEmailSummary resultado:', result);
      
      if (result.success) {
        return `
        ${result.message}
        ${JSON.stringify(result.data)}
        `
      } else {
        return result.error || 'Erro ao obter resumo dos emails.';
      }
    } catch (error) {
      console.error('❌ [TOOLS] Erro em executeGetEmailSummary:', error);
      return 'Erro ao obter resumo dos emails: ' + error.message;
    }
  }

  async executeAddTask(description: string) {
    if (!this.aiToolsService) {
      console.log('⚠️ [TOOLS] AIToolsService não está disponível para addTask');
      return 'Serviço de tarefas não está disponível no momento.';
    }
    try {
      const result = await this.aiToolsService.executeAddTask(description);
      console.log('🔍 [TOOLS] addTask resultado:', result);
      
      if (result.success) {
        return `
        ${result.message}
        ${JSON.stringify(result.data)}
        `
      } else {
        return result.error || 'Erro ao adicionar tarefa.';
      }
    } catch (error) {
      console.error('❌ [TOOLS] Erro em executeAddTask:', error);
      return 'Erro ao adicionar tarefa: ' + error.message;
    }
  }

  async executeGetTasks() {
    if (!this.aiToolsService) {
      console.log('⚠️ [TOOLS] AIToolsService não está disponível para getTasks');
      return 'Serviço de tarefas não está disponível no momento.';
    }
    try {
      const result = await this.aiToolsService.executeGetTasks();
      console.log('🔍 [TOOLS] getTasks resultado:', result);
      
      if (result.success) {
        return `
        ${result.message}
        ${JSON.stringify(result.data)}
        `
      } else {
        return result.error || 'Erro ao obter tarefas.';
      }
    } catch (error) {
      console.error('❌ [TOOLS] Erro em executeGetTasks:', error);
      return 'Erro ao obter tarefas: ' + error.message;
    }
  }

  async executeGetTechNews() {
    if (!this.aiToolsService) {
      console.log('⚠️ [TOOLS] AIToolsService não está disponível para getTechNews');
      return 'Serviço de notícias não está disponível no momento.';
    }
    try {
      const result = await this.aiToolsService.executeGetTechNews();
      console.log('🔍 [TOOLS] getTechNews resultado:', JSON.stringify(result));
      
      if (result.success) {
        return `
        ${result.message}
        ${JSON.stringify(result.data)}
        `
      } else {
        return result.error || 'Erro ao obter notícias.';
      }
    } catch (error) {
      console.error('❌ [TOOLS] Erro em executeGetTechNews:', error);
      return 'Erro ao obter notícias: ' + error.message;
    }
  }

  async executeSearchNews(keywords: string) {
    if (!this.aiToolsService) {
      console.log('⚠️ [TOOLS] AIToolsService não está disponível para searchNews');
      return 'Serviço de busca de notícias não está disponível no momento.';
    }
    try {
      const result = await this.aiToolsService.executeSearchNews(keywords);
      console.log('🔍 [TOOLS] searchNews resultado:', result);
      
      if (result.success) {
        return `
        ${result.message}
        ${JSON.stringify(result.data)}
        `
      } else {
        return result.error || 'Erro ao buscar notícias.';
      }
    } catch (error) {
      console.error('❌ [TOOLS] Erro em executeSearchNews:', error);
      return 'Erro ao buscar notícias: ' + error.message;
    }
  }

  async executeSaveNote(title: string, content: string) {
    if (!this.aiToolsService) {
      console.log('⚠️ [TOOLS] AIToolsService não está disponível para saveNote');
      return 'Serviço de notas não está disponível no momento.';
    }
    try {
      const result = await this.aiToolsService.executeSaveNote(title, content);
      console.log('🔍 [TOOLS] saveNote resultado:', result);
      
      if (result.success) {
        return `
        ${result.message}
        ${JSON.stringify(result.data)}
        `
      } else {
        return result.error || 'Erro ao salvar nota.';
      }
    } catch (error) {
      console.error('❌ [TOOLS] Erro em executeSaveNote:', error);
      return 'Erro ao salvar nota: ' + error.message;
    }
  }

  async executeSearchKnowledge(query: string) {
    if (!this.aiToolsService) {
      console.log('⚠️ [TOOLS] AIToolsService não está disponível para searchKnowledge');
      return 'Serviço de busca de conhecimento não está disponível no momento.';
    }
    try {
      const result = await this.aiToolsService.executeSearchKnowledge(query);
      console.log('🔍 [TOOLS] searchKnowledge resultado:', result);
      
      if (result.success) {
        return `
        ${result.message}
        ${JSON.stringify(result.data)}
        `
      } else {
        return result.error || 'Erro ao buscar conhecimento.';
      }
    } catch (error) {
      console.error('❌ [TOOLS] Erro em executeSearchKnowledge:', error);
      return 'Erro ao buscar conhecimento: ' + error.message;
    }
  }

  async executeGetSystemStatus() {
    if (!this.aiToolsService) {
      console.log('⚠️ [TOOLS] AIToolsService não está disponível para getSystemStatus');
      return 'Serviço de status do sistema não está disponível no momento.';
    }
    try {
      const result = await this.aiToolsService.executeGetSystemStatus();
      console.log('🔍 [TOOLS] getSystemStatus resultado:', result);
      
      if (result.success) {
        return `
        ${result.message}
        ${JSON.stringify(result.data)}
        `
      } else {
        return result.error || 'Erro ao obter status do sistema.';
      }
    } catch (error) {
      console.error('❌ [TOOLS] Erro em executeGetSystemStatus:', error);
      return 'Erro ao obter status do sistema: ' + error.message;
    }
  }
} 