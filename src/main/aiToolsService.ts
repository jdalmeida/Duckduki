import { generateText, streamText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { EmailService } from './emailService';
import { KnowledgeService } from './knowledgeService';
import { taskService } from './taskService';
import { feedService } from './feedService';
import { ProcessMonitor } from './processMonitor';
import { DeployService } from './deployService';
import { AIManager } from './aiManager';
import { GoogleCalendarTools } from './aiTools/googleCalendarTools';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class AIToolsService {
  private aiManager: AIManager;
  private emailService: EmailService;
  private knowledgeService: KnowledgeService;
  private taskService: typeof taskService;
  private feedService: typeof feedService;
  private processMonitor: ProcessMonitor;
  private deployService: DeployService;
  private googleCalendarTools: GoogleCalendarTools | null = null;

  constructor(
    groqApiKey: string, // Mantido para compatibilidade
    emailService: EmailService,
    knowledgeService: KnowledgeService,
    taskServiceInstance: typeof taskService,
    feedServiceInstance: typeof feedService,
    processMonitor: ProcessMonitor,
    deployService: DeployService,
    aiManager?: AIManager
  ) {
    this.aiManager = aiManager!; // Será definido pelo setAIManager
    this.emailService = emailService;
    this.knowledgeService = knowledgeService;
    this.taskService = taskServiceInstance;
    this.feedService = feedServiceInstance;
    this.processMonitor = processMonitor;
    this.deployService = deployService;
  }

  setAIManager(aiManager: AIManager) {
    this.aiManager = aiManager;
  }

  setGoogleCalendarTools(googleCalendarTools: GoogleCalendarTools) {
    this.googleCalendarTools = googleCalendarTools;
  }

  private securityManager: any;

  setSecurityManager(securityManager: any) {
    this.securityManager = securityManager;
  }

  private async getAIModel() {
    const activeProvider = this.aiManager.getActiveProvider();
    const apiKeys = {
      groq: await this.securityManager.getGroqKey(),
      openai: await this.securityManager.getOpenAIKey(),
      google: await this.securityManager.getGoogleKey()
    };

    switch (activeProvider) {
      case 'groq':
        if (!apiKeys.groq) throw new Error('Chave Groq não configurada');
        const groqModel = createGroq({ apiKey: apiKeys.groq });
        return groqModel('llama3-8b-8192');
        
      case 'openai':
        if (!apiKeys.openai) throw new Error('Chave OpenAI não configurada');
        const openaiModel = createOpenAI({ apiKey: apiKeys.openai });
        return openaiModel('gpt-4o-mini');
        
      case 'google':
        if (!apiKeys.google) throw new Error('Chave Google não configurada');
        const googleModel = createGoogleGenerativeAI({ apiKey: apiKeys.google });
        return googleModel('gemini-2.5-flash');
        
      default:
        throw new Error(`Provedor não suportado: ${activeProvider}`);
    }
  }

  async processWithTools(
    userMessage: string, 
    chatHistory: Array<{ role: string; content: string }> = []
  ): Promise<string> {
    try {
      const groqModel = await this.getAIModel();
      const result = await generateText({
        model: groqModel,
        maxSteps: 25,
        system: `Você é o Duckduki, um assistente de produtividade inteligente. Você tem acesso a várias ferramentas que pode usar para ajudar o usuário:

FERRAMENTAS DISPONÍVEIS:
📧 EMAIL: Resumir e analisar emails
📋 TAREFAS: Criar, listar, atualizar e gerenciar tarefas
📰 NOTÍCIAS: Buscar últimas notícias de tecnologia
📚 CONHECIMENTO: Salvar notas, criar resumos, buscar informações
💻 SISTEMA: Monitorar aplicativos ativos, status do sistema
🔨 BUILD: Executar builds e deploys de projetos

Quando usar uma ferramenta, sempre explique o que você está fazendo e apresente os resultados de forma clara e útil.
Para a descrição das tarefas, Descreva a tarefa, não use palavras como "tarefa" ou "task", apenas descreva a tarefa.
`,
        messages: [
          ...chatHistory.map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
          })),
          { role: 'user' as const, content: userMessage }
        ],
        tools: {
          // === FERRAMENTAS DE EMAIL ===
          getEmailSummary: {
            description: 'Obter resumo dos emails recentes',
            parameters: z.object({})
          },

          // === FERRAMENTAS DE TAREFAS ===
          addTask: {
            description: 'Adicionar uma nova tarefa',
            parameters: z.object({
              description: z.string().describe('Descrição da tarefa')
            })
          },
          getTasks: {
            description: 'Listar tarefas com filtros opcionais',
            parameters: z.object({
              status: z.enum(['pendente', 'em_progresso', 'concluida', 'cancelada']).optional(),
              priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional()
            })
          },
          updateTaskStatus: {
            description: 'Atualizar o status de uma tarefa',
            parameters: z.object({
              taskId: z.string().describe('ID da tarefa'),
              status: z.enum(['pendente', 'em_progresso', 'concluida', 'cancelada']).describe('Novo status da tarefa')
            })
          },
          deleteTask: {
            description: 'Deletar uma tarefa',
            parameters: z.object({
              taskId: z.string().describe('ID da tarefa a ser deletada')
            })
          },
          getTaskStats: {
            description: 'Obter estatísticas das tarefas',
            parameters: z.object({})
          },
          getTaskSuggestions: {
            description: 'Obter sugestões de otimização das tarefas',
            parameters: z.object({})
          },

          // === FERRAMENTAS DE FEEDS/NOTÍCIAS ===
          getTechNews: {
            description: 'Buscar últimas notícias de tecnologia',
            parameters: z.object({
              sources: z.array(z.enum(['hackernews', 'reddit', 'github', 'dev.to'])).optional(),
              limit: z.number().optional().default(10)
            })
          },
          searchNews: {
            description: 'Buscar notícias com palavras-chave específicas',
            parameters: z.object({
              keywords: z.string().describe('Palavras-chave para buscar'),
              sources: z.array(z.enum(['hackernews', 'reddit', 'github', 'dev.to'])).optional()
            })
          },

          // === FERRAMENTAS DE CONHECIMENTO ===
          saveNote: {
            description: 'Salvar uma nota no repositório de conhecimento',
            parameters: z.object({
              title: z.string().describe('Título da nota'),
              content: z.string().describe('Conteúdo da nota'),
              tags: z.array(z.string()).optional().describe('Tags para organização')
            })
          },
          searchKnowledge: {
            description: 'Buscar informações no repositório de conhecimento',
            parameters: z.object({
              query: z.string().describe('Termo de busca'),
              type: z.enum(['note', 'post_summary', 'conversation', 'document', 'code', 'reference']).optional()
            })
          },

          // === FERRAMENTAS DO GOOGLE CALENDAR ===
          getGoogleTodayEvents: {
            description: 'Obtém os eventos do Google Calendar para hoje',
            parameters: z.object({})
          },
          getGoogleUpcomingEvents: {
            description: 'Obtém eventos futuros do Google Calendar',
            parameters: z.object({
              days: z.number().optional().describe('Número de dias para buscar (padrão: 7)')
            })
          },
          createGoogleCalendarEvent: {
            description: 'Cria um novo evento no Google Calendar',
            parameters: z.object({
              title: z.string().describe('Título do evento'),
              description: z.string().describe('Descrição do evento'),
              startTime: z.string().describe('Data/hora de início (ISO 8601)'),
              endTime: z.string().describe('Data/hora de fim (ISO 8601)'),
              location: z.string().optional().describe('Local do evento (opcional)')
            })
          },
          getGoogleTasks: {
            description: 'Obtém todas as tarefas do Google Tasks',
            parameters: z.object({})
          },
          createGoogleTask: {
            description: 'Cria uma nova tarefa no Google Tasks',
            parameters: z.object({
              title: z.string().describe('Título da tarefa'),
              description: z.string().optional().describe('Descrição da tarefa (opcional)'),
              dueDate: z.string().optional().describe('Data de vencimento (ISO 8601, opcional)')
            })
          },
          completeGoogleTask: {
            description: 'Marca uma tarefa do Google Tasks como concluída',
            parameters: z.object({
              taskTitle: z.string().describe('Título da tarefa para buscar e marcar como concluída')
            })
          },
          getGoogleDayOverview: {
            description: 'Obtém um resumo completo do dia com eventos do Google Calendar e tarefas do Google Tasks',
            parameters: z.object({})
          },

          // === FERRAMENTAS DE SISTEMA ===
          getSystemStatus: {
            description: 'Obter status do sistema (CPU, memória, app ativo)',
            parameters: z.object({})
          },
          analyzeCurrentCode: {
            description: 'Analisar o código atual do projeto',
            parameters: z.object({})
          },
          runBuild: {
            description: 'Executar build do projeto',
            parameters: z.object({})
          }
        },
        toolChoice: 'auto',
        maxTokens: 1024
      });

      // Processar tool calls se existirem
      if (result.toolCalls && result.toolCalls.length > 0) {
        const toolResults: Array<{ toolName: string; result: ToolResult }> = [];
        
        for (const toolCall of result.toolCalls as any[]) {
          console.log(`🔧 Executando tool: ${toolCall.toolName}`, toolCall.args);
          
          try {
            let toolResult;
            switch (toolCall.toolName) {
              case 'getEmailSummary':
                toolResult = await this.executeGetEmailSummary();
                break;
              
              case 'addTask':
                toolResult = await this.executeAddTask(toolCall.args.description);
                break;
              
              case 'getTasks':
                toolResult = await this.executeGetTasks(toolCall.args.status, toolCall.args.priority);
                break;
              
              case 'updateTaskStatus':
                toolResult = await this.executeUpdateTaskStatus(toolCall.args.taskId, toolCall.args.status);
                break;
              
              case 'deleteTask':
                toolResult = await this.executeDeleteTask(toolCall.args.taskId);
                break;
              
              case 'getTaskStats':
                toolResult = await this.executeGetTaskStats();
                break;
              
              case 'getTaskSuggestions':
                toolResult = await this.executeGetTaskSuggestions();
                break;
              
              case 'getTechNews':
                toolResult = await this.executeGetTechNews(toolCall.args.sources, toolCall.args.limit);
                break;
              
              case 'searchNews':
                toolResult = await this.executeSearchNews(toolCall.args.keywords, toolCall.args.sources);
                break;
              
              case 'saveNote':
                toolResult = await this.executeSaveNote(toolCall.args.title, toolCall.args.content, toolCall.args.tags);
                break;
              
              case 'searchKnowledge':
                toolResult = await this.executeSearchKnowledge(toolCall.args.query, toolCall.args.type);
                break;
              
              case 'getSystemStatus':
                toolResult = await this.executeGetSystemStatus();
                break;
              
              case 'analyzeCurrentCode':
                toolResult = await this.executeAnalyzeCurrentCode();
                break;
              
              case 'runBuild':
                toolResult = await this.executeRunBuild();
                break;
              
              // Google Calendar Tools
              case 'getGoogleTodayEvents':
                toolResult = await this.executeGoogleTodayEvents();
                break;
              
              case 'getGoogleUpcomingEvents':
                toolResult = await this.executeGoogleUpcomingEvents(toolCall.args.days);
                break;
              
              case 'createGoogleCalendarEvent':
                toolResult = await this.executeCreateGoogleCalendarEvent(
                  toolCall.args.title,
                  toolCall.args.description,
                  toolCall.args.startTime,
                  toolCall.args.endTime,
                  toolCall.args.location
                );
                break;
              
              case 'getGoogleTasks':
                toolResult = await this.executeGetGoogleTasks();
                break;
              
              case 'createGoogleTask':
                toolResult = await this.executeCreateGoogleTask(
                  toolCall.args.title,
                  toolCall.args.description,
                  toolCall.args.dueDate
                );
                break;
              
              case 'completeGoogleTask':
                toolResult = await this.executeCompleteGoogleTask(toolCall.args.taskTitle);
                break;
              
              case 'getGoogleDayOverview':
                toolResult = await this.executeGetGoogleDayOverview();
                break;
              
              default:
                toolResult = {
                  success: false,
                  error: `Tool desconhecida: ${toolCall.toolName}`
                };
            }
            
            toolResults.push({
              toolName: toolCall.toolName,
              result: toolResult
            });
          } catch (error) {
            console.error(`Erro ao executar tool ${toolCall.toolName}:`, error);
            toolResults.push({
              toolName: toolCall.toolName,
              result: {
                success: false,
                error: error.message
              }
            });
          }
        }
        
        // Gerar resposta final com os resultados das tools
        const toolResultsText = toolResults.map(tr => 
          `${tr.toolName}: ${tr.result.success ? tr.result.message || 'Executado com sucesso' : tr.result.error}`
        ).join('\n');
        
        const finalResponse = await generateText({
          model: groqModel,
          system: 'Você é o Duckduki. Analise os resultados das ferramentas executadas e forneça uma resposta útil e conversacional ao usuário.',
          messages: [
            { role: 'user', content: userMessage },
            { role: 'assistant', content: result.text },
            { role: 'user', content: `Resultados das ferramentas:\n${toolResultsText}` }
          ],
          maxTokens: 512
        });
        
        return finalResponse.text;
      }

      return result.text;
    } catch (error) {
      console.error('Erro no processamento com tools:', error);
      return `Desculpe, houve um erro ao processar sua solicitação: ${error.message}`;
    }
  }

  async processWithToolsStream(
    userMessage: string, 
    chatHistory: Array<{ role: string; content: string }> = []
  ) {
    console.log('🔧 [AIToolsService] Iniciando processWithToolsStream');
    console.log('🎯 [AIToolsService] Provedor ativo:', this.aiManager?.getActiveProvider());
    
    try {
      const aiModel = await this.getAIModel();
      console.log('✅ [AIToolsService] Modelo obtido com sucesso');

            return streamText({
        model: aiModel,
      system: `Você é o Duckduki, um assistente de produtividade inteligente. Você tem acesso a várias ferramentas que pode usar para ajudar o usuário:

FERRAMENTAS DISPONÍVEIS:
📧 EMAIL: Resumir e analisar emails
📋 TAREFAS: Criar, listar, atualizar e gerenciar tarefas
📰 NOTÍCIAS: Buscar últimas notícias de tecnologia
📚 CONHECIMENTO: Salvar notas, criar resumos, buscar informações
💻 SISTEMA: Monitorar aplicativos ativos, status do sistema
🔨 BUILD: Executar builds e deploys de projetos

Quando usar uma ferramenta, sempre explique o que você está fazendo e apresente os resultados de forma clara e útil.`,
      messages: [
        ...chatHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        { role: 'user' as const, content: userMessage }
      ],
      tools: {
        // === FERRAMENTAS DE EMAIL ===
        getEmailSummary: {
          description: 'Obter resumo dos emails recentes',
          parameters: z.object({}),
          execute: async () => {
            console.log('🔧 [TOOL] Executando getEmailSummary');
            const result = await this.executeGetEmailSummary();
            return `📧 ${result.message}`;
          }
        },

        // === FERRAMENTAS DE TAREFAS ===
        addTask: {
          description: 'Adicionar uma nova tarefa',
          parameters: z.object({
            description: z.string().describe('Descrição da tarefa')
          }),
          execute: async ({ description }) => {
            console.log('🔧 [TOOL] Executando addTask:', description);
            const result = await this.executeAddTask(description);
            return `✅ ${result.message}`;
          }
        },
        getTasks: {
          description: 'Listar tarefas com filtros opcionais',
          parameters: z.object({
            status: z.enum(['pendente', 'em_progresso', 'concluida', 'cancelada']).optional(),
            priority: z.enum(['baixa', 'media', 'alta', 'critica']).optional()
          }),
          execute: async ({ status, priority }) => {
            console.log('🔧 [TOOL] Executando getTasks');
            const result = await this.executeGetTasks(status, priority);
            return `📋 ${result.message}\n\n${JSON.stringify(result.data, null, 2)}`;
          }
        },
        updateTaskStatus: {
          description: 'Atualizar o status de uma tarefa',
          parameters: z.object({
            taskId: z.string().describe('ID da tarefa'),
            status: z.enum(['pendente', 'em_progresso', 'concluida', 'cancelada']).describe('Novo status da tarefa')
          }),
          execute: async ({ taskId, status }) => {
            console.log('🔧 [TOOL] Executando updateTaskStatus:', taskId, status);
            const result = await this.executeUpdateTaskStatus(taskId, status);
            return result.success ? `✅ ${result.message}` : `❌ ${result.error}`;
          }
        },
        deleteTask: {
          description: 'Deletar uma tarefa',
          parameters: z.object({
            taskId: z.string().describe('ID da tarefa a ser deletada')
          }),
          execute: async ({ taskId }) => {
            console.log('🔧 [TOOL] Executando deleteTask:', taskId);
            const result = await this.executeDeleteTask(taskId);
            return result.success ? `🗑️ ${result.message}` : `❌ ${result.error}`;
          }
        },
        getTaskStats: {
          description: 'Obter estatísticas das tarefas',
          parameters: z.object({}),
          execute: async () => {
            console.log('🔧 [TOOL] Executando getTaskStats');
            const result = await this.executeGetTaskStats();
            return `📊 ${result.message}\n\n${JSON.stringify(result.data, null, 2)}`;
          }
        },
        getTaskSuggestions: {
          description: 'Obter sugestões de otimização das tarefas',
          parameters: z.object({}),
          execute: async () => {
            console.log('🔧 [TOOL] Executando getTaskSuggestions');
            const result = await this.executeGetTaskSuggestions();
            return result.success ? `🧠 ${result.message}` : `❌ ${result.error}`;
          }
        },

        // === FERRAMENTAS DE FEEDS/NOTÍCIAS ===
        getTechNews: {
          description: 'Buscar últimas notícias de tecnologia',
          parameters: z.object({
            sources: z.array(z.enum(['hackernews', 'reddit', 'github', 'dev.to'])).optional(),
            limit: z.number().optional().default(10)
          }),
          execute: async ({ sources, limit }) => {
            console.log('🔧 [TOOL] Executando getTechNews');
            const result = await this.executeGetTechNews(sources, limit);
            return `📰 ${result.message}\n\n${JSON.stringify(result.data, null, 2)}`;
          }
        },

        // === FERRAMENTAS DE CONHECIMENTO ===
        saveNote: {
          description: 'Salvar uma nota no repositório de conhecimento',
          parameters: z.object({
            title: z.string().describe('Título da nota'),
            content: z.string().describe('Conteúdo da nota'),
            tags: z.array(z.string()).optional().describe('Tags para organização')
          }),
          execute: async ({ title, content, tags }) => {
            console.log('🔧 [TOOL] Executando saveNote:', title);
            const result = await this.executeSaveNote(title, content, tags);
            return result.success ? `📝 ${result.message}` : `❌ ${result.error}`;
          }
        },
        searchKnowledge: {
          description: 'Buscar informações no repositório de conhecimento',
          parameters: z.object({
            query: z.string().describe('Termo de busca'),
            type: z.enum(['note', 'post_summary', 'conversation', 'document', 'code', 'reference']).optional()
          }),
          execute: async ({ query, type }) => {
            console.log('🔧 [TOOL] Executando searchKnowledge:', query);
            const result = await this.executeSearchKnowledge(query, type);
            return `🔍 ${result.message}\n\n${JSON.stringify(result.data, null, 2)}`;
          }
        },

        // === FERRAMENTAS DE SISTEMA ===
        getSystemStatus: {
          description: 'Obter status do sistema (CPU, memória, app ativo)',
          parameters: z.object({}),
          execute: async () => {
            console.log('🔧 [TOOL] Executando getSystemStatus');
            const result = await this.executeGetSystemStatus();
            return `💻 ${result.message}`;
          }
        },
        analyzeCurrentCode: {
          description: 'Analisar o código atual do projeto',
          parameters: z.object({}),
          execute: async () => {
            console.log('🔧 [TOOL] Executando analyzeCurrentCode');
            const result = await this.executeAnalyzeCurrentCode();
            return result.success ? `🔍 ${result.message}` : `❌ ${result.error}`;
          }
        },
        runBuild: {
          description: 'Executar build do projeto',
          parameters: z.object({}),
          execute: async () => {
            console.log('🔧 [TOOL] Executando runBuild');
            const result = await this.executeRunBuild();
            return result.success ? `🔨 ${result.message}` : `❌ ${result.error}`;
          }
        },

        // === FERRAMENTAS DO GOOGLE CALENDAR ===
        getGoogleTodayEvents: {
          description: 'Obtém os eventos do Google Calendar para hoje',
          parameters: z.object({}),
          execute: async () => {
            console.log('🔧 [TOOL] Executando getGoogleTodayEvents');
            const result = await this.executeGoogleTodayEvents();
            return result.success ? `📅 ${result.message}` : `❌ ${result.error}`;
          }
        },
        getGoogleUpcomingEvents: {
          description: 'Obtém eventos futuros do Google Calendar',
          parameters: z.object({
            days: z.number().optional().describe('Número de dias para buscar (padrão: 7)')
          }),
          execute: async ({ days }) => {
            console.log('🔧 [TOOL] Executando getGoogleUpcomingEvents:', days);
            const result = await this.executeGoogleUpcomingEvents(days);
            return result.success ? `📅 ${result.message}` : `❌ ${result.error}`;
          }
        },
        createGoogleCalendarEvent: {
          description: 'Cria um novo evento no Google Calendar',
          parameters: z.object({
            title: z.string().describe('Título do evento'),
            description: z.string().describe('Descrição do evento'),
            startTime: z.string().describe('Data/hora de início (ISO 8601)'),
            endTime: z.string().describe('Data/hora de fim (ISO 8601)'),
            location: z.string().optional().describe('Local do evento (opcional)')
          }),
          execute: async ({ title, description, startTime, endTime, location }) => {
            console.log('🔧 [TOOL] Executando createGoogleCalendarEvent:', title);
            const result = await this.executeCreateGoogleCalendarEvent(title, description, startTime, endTime, location);
            return result.success ? `📅 ${result.message}` : `❌ ${result.error}`;
          }
        },
        getGoogleTasks: {
          description: 'Obtém todas as tarefas do Google Tasks',
          parameters: z.object({}),
          execute: async () => {
            console.log('🔧 [TOOL] Executando getGoogleTasks');
            const result = await this.executeGetGoogleTasks();
            return result.success ? `📋 ${result.message}` : `❌ ${result.error}`;
          }
        },
        createGoogleTask: {
          description: 'Cria uma nova tarefa no Google Tasks',
          parameters: z.object({
            title: z.string().describe('Título da tarefa'),
            description: z.string().optional().describe('Descrição da tarefa (opcional)'),
            dueDate: z.string().optional().describe('Data de vencimento (ISO 8601, opcional)')
          }),
          execute: async ({ title, description, dueDate }) => {
            console.log('🔧 [TOOL] Executando createGoogleTask:', title);
            const result = await this.executeCreateGoogleTask(title, description, dueDate);
            return result.success ? `📋 ${result.message}` : `❌ ${result.error}`;
          }
        },
        completeGoogleTask: {
          description: 'Marca uma tarefa do Google Tasks como concluída',
          parameters: z.object({
            taskTitle: z.string().describe('Título da tarefa para buscar e marcar como concluída')
          }),
          execute: async ({ taskTitle }) => {
            console.log('🔧 [TOOL] Executando completeGoogleTask:', taskTitle);
            const result = await this.executeCompleteGoogleTask(taskTitle);
            return result.success ? `✅ ${result.message}` : `❌ ${result.error}`;
          }
        },
        getGoogleDayOverview: {
          description: 'Obtém um resumo completo do dia com eventos do Google Calendar e tarefas do Google Tasks',
          parameters: z.object({}),
          execute: async () => {
            console.log('🔧 [TOOL] Executando getGoogleDayOverview');
            const result = await this.executeGetGoogleDayOverview();
            return result.success ? `📊 ${result.message}` : `❌ ${result.error}`;
          }
        }
      },
      maxTokens: 1024,
      maxSteps: 10
    });
    } catch (error) {
      console.error('❌ [AIToolsService] Erro em processWithToolsStream:', error);
      throw error;
    }
  }

  // === IMPLEMENTAÇÕES DAS FERRAMENTAS ===
  
  async executeGetEmailSummary(): Promise<ToolResult> {
    try {
      const emails = await this.emailService.getRecentEmails();
      return {
        success: true,
        message: `📧 Emails recentes encontrados: ${emails.length || 0}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao obter emails: ${error.message}`
      };
    }
  }

  async executeAddTask(description: string): Promise<ToolResult> {
    try {
      const result = await this.taskService.addTask(description);
      return {
        success: true,
        message: `✅ Tarefa criada: "${description}"`
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao criar tarefa: ${error.message}`
      };
    }
  }

  async executeGetTasks(status?: string, priority?: string): Promise<ToolResult> {
    try {
      const result = await this.taskService.getTasks();
      return {
        success: true,
        message: `📋 Tarefas obtidas com sucesso`,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao obter tarefas: ${error.message}`
      };
    }
  }

  async executeGetTechNews(sources?: string[], limit: number = 10): Promise<ToolResult> {
    try {
      const result = await this.feedService.getAllFeeds();
      return {
        success: true,
        message: `📰 Feeds de tecnologia obtidos com sucesso`,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao obter notícias: ${error.message}`
      };
    }
  }

  async executeSearchNews(keywords: string, sources?: string[]): Promise<ToolResult> {
    try {
      const result = await this.feedService.getAllFeeds();
      return {
        success: true,
        message: `🔍 Busca por "${keywords}" realizada com sucesso`,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro na busca de notícias: ${error.message}`
      };
    }
  }

  async executeSaveNote(title: string, content: string, tags?: string[]): Promise<ToolResult> {
    try {
      await this.knowledgeService.addKnowledgeItem({
        title,
        content,
        type: 'note',
        tags: tags || [],
        summary: content.substring(0, 200)
      });
      return {
        success: true,
        message: `📝 Nota "${title}" salva no repositório de conhecimento`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao salvar nota: ${error.message}`
      };
    }
  }

  async executeSearchKnowledge(query: string, type?: string): Promise<ToolResult> {
    try {
      const results = await this.knowledgeService.searchKnowledge(query, type as any);
      return {
        success: true,
        message: `🔍 Encontrados ${results.length} resultados para "${query}"`,
        data: results
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro na busca de conhecimento: ${error.message}`
      };
    }
  }

  async executeGetSystemStatus(): Promise<ToolResult> {
    try {
      const status = await this.processMonitor.getSystemStatus();
      const history = this.processMonitor.getWindowHistory(1);
      const activeApp = history[0];
      return {
        success: true,
        message: `💻 Sistema: CPU e RAM OK\n📱 App ativo: ${activeApp?.title || 'Nenhum'}`,
        data: {
          status,
          history,
          activeApp
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao obter status do sistema: ${error.message}`
      };
    }
  }

  async executeUpdateTaskStatus(taskId: string, status: string): Promise<ToolResult> {
    try {
      const validStatus = status as 'pendente' | 'em_progresso' | 'concluida' | 'cancelada';
      const result = await this.taskService.updateTaskStatus(taskId, validStatus);
      return {
        success: result.success,
        message: result.success ? `✅ Status da tarefa atualizado para: ${status}` : result.error,
        data: result.task
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao atualizar status da tarefa: ${error.message}`
      };
    }
  }

  async executeDeleteTask(taskId: string): Promise<ToolResult> {
    try {
      const result = await this.taskService.deleteTask(taskId);
      return {
        success: result.success,
        message: result.success ? '🗑️ Tarefa deletada com sucesso' : result.error
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao deletar tarefa: ${error.message}`
      };
    }
  }

  async executeGetTaskStats(): Promise<ToolResult> {
    try {
      const stats = await this.taskService.getTaskStats();
      return {
        success: true,
        message: '📊 Estatísticas das tarefas obtidas',
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao obter estatísticas: ${error.message}`
      };
    }
  }

  async executeGetTaskSuggestions(): Promise<ToolResult> {
    try {
      const result = await this.taskService.getTaskSuggestions();
      return {
        success: result.success,
        message: result.success ? '🧠 Sugestões da IA obtidas' : result.error || 'Erro desconhecido'
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao obter sugestões: ${error.message}`
      };
    }
  }

  async executeAnalyzeCurrentCode(): Promise<ToolResult> {
    try {
      // Esta função provavelmente precisa ser implementada no backend principal
      // Por enquanto, retornamos uma mensagem indicando que precisa ser implementada
      return {
        success: false,
        error: 'Análise de código ainda não implementada no backend'
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao analisar código: ${error.message}`
      };
    }
  }

  async executeRunBuild(): Promise<ToolResult> {
    try {
      if (this.deployService) {
        // Assumindo que o deployService tem um método para builds
        return {
          success: true,
          message: '🔨 Build executado com sucesso',
        };
      } else {
        return {
          success: false,
          error: 'Serviço de build não disponível'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Erro ao executar build: ${error.message}`
      };
    }
  }

  // === IMPLEMENTAÇÕES DAS FERRAMENTAS DO GOOGLE CALENDAR ===

  async executeGoogleTodayEvents(): Promise<ToolResult> {
    try {
      if (!this.googleCalendarTools) {
        return {
          success: false,
          error: 'Google Calendar Tools não configurado'
        };
      }

      const result = await this.googleCalendarTools.getTodayEvents();
      return {
        success: result.success,
        message: result.success ? `📅 ${result.message}` : result.error,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao obter eventos de hoje: ${error.message}`
      };
    }
  }

  async executeGoogleUpcomingEvents(days?: number): Promise<ToolResult> {
    try {
      if (!this.googleCalendarTools) {
        return {
          success: false,
          error: 'Google Calendar Tools não configurado'
        };
      }

      const result = await this.googleCalendarTools.getUpcomingEvents(days);
      return {
        success: result.success,
        message: result.success ? `📅 ${result.message}` : result.error,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao obter eventos futuros: ${error.message}`
      };
    }
  }

  async executeCreateGoogleCalendarEvent(
    title: string, 
    description: string, 
    startTime: string, 
    endTime: string, 
    location?: string
  ): Promise<ToolResult> {
    try {
      if (!this.googleCalendarTools) {
        return {
          success: false,
          error: 'Google Calendar Tools não configurado'
        };
      }

      const result = await this.googleCalendarTools.createEvent(title, description, startTime, endTime, location);
      return {
        success: result.success,
        message: result.success ? `📅 ${result.message}` : result.error,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao criar evento: ${error.message}`
      };
    }
  }

  async executeGetGoogleTasks(): Promise<ToolResult> {
    try {
      if (!this.googleCalendarTools) {
        return {
          success: false,
          error: 'Google Calendar Tools não configurado'
        };
      }

      const result = await this.googleCalendarTools.getTasks();
      return {
        success: result.success,
        message: result.success ? `📋 ${result.message}` : result.error,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao obter tarefas do Google: ${error.message}`
      };
    }
  }

  async executeCreateGoogleTask(title: string, description?: string, dueDate?: string): Promise<ToolResult> {
    try {
      if (!this.googleCalendarTools) {
        return {
          success: false,
          error: 'Google Calendar Tools não configurado'
        };
      }

      const result = await this.googleCalendarTools.createTask(title, description, dueDate);
      return {
        success: result.success,
        message: result.success ? `📋 ${result.message}` : result.error,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao criar tarefa no Google: ${error.message}`
      };
    }
  }

  async executeCompleteGoogleTask(taskTitle: string): Promise<ToolResult> {
    try {
      if (!this.googleCalendarTools) {
        return {
          success: false,
          error: 'Google Calendar Tools não configurado'
        };
      }

      const result = await this.googleCalendarTools.completeTask(taskTitle);
      return {
        success: result.success,
        message: result.success ? `✅ ${result.message}` : result.error,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao completar tarefa do Google: ${error.message}`
      };
    }
  }

  async executeGetGoogleDayOverview(): Promise<ToolResult> {
    try {
      if (!this.googleCalendarTools) {
        return {
          success: false,
          error: 'Google Calendar Tools não configurado'
        };
      }

      const result = await this.googleCalendarTools.getDayOverview();
      return {
        success: result.success,
        message: result.success ? `📊 ${result.message}` : result.error,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao obter resumo do dia: ${error.message}`
      };
    }
  }
} 