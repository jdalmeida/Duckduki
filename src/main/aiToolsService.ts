import { generateText, streamText } from 'ai';
import { createGroq, groq } from '@ai-sdk/groq';
import { z } from 'zod';
import { EmailService } from './emailService';
import { KnowledgeService } from './knowledgeService';
import { taskService } from './taskService';
import { feedService } from './feedService';
import { ProcessMonitor } from './processMonitor';
import { DeployService } from './deployService';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class AIToolsService {
  private groqApiKey: string;
  private emailService: EmailService;
  private knowledgeService: KnowledgeService;
  private taskService: typeof taskService;
  private feedService: typeof feedService;
  private processMonitor: ProcessMonitor;
  private deployService: DeployService;

  constructor(
    groqApiKey: string,
    emailService: EmailService,
    knowledgeService: KnowledgeService,
    taskServiceInstance: typeof taskService,
    feedServiceInstance: typeof feedService,
    processMonitor: ProcessMonitor,
    deployService: DeployService
  ) {
    this.groqApiKey = groqApiKey;
    this.emailService = emailService;
    this.knowledgeService = knowledgeService;
    this.taskService = taskServiceInstance;
    this.feedService = feedServiceInstance;
    this.processMonitor = processMonitor;
    this.deployService = deployService;
  }

  async processWithTools(
    userMessage: string, 
    chatHistory: Array<{ role: string; content: string }> = []
  ): Promise<string> {
    try {
      const groqModel = createGroq({
        apiKey: this.groqApiKey,
      })
      const result = await generateText({
        model: groqModel('llama3-8b-8192'),
        maxSteps: 25,
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

          // === FERRAMENTAS DE SISTEMA ===
          getSystemStatus: {
            description: 'Obter status do sistema (CPU, memória, app ativo)',
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
          model: groqModel('llama3-8b-8192'),
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
    const groqModel = createGroq({
      apiKey: this.groqApiKey,
    });

    return streamText({
      model: groqModel('llama3-8b-8192'),
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

        // === FERRAMENTAS DE FEEDS/NOTÍCIAS ===
        getTechNews: {
          description: 'Buscar últimas notícias de tecnologia',
          parameters: z.object({
            sources: z.array(z.enum(['hackernews', 'reddit', 'github', 'dev.to'])).optional(),
            limit: z.number().optional().default(10)
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

        // === FERRAMENTAS DE SISTEMA ===
        getSystemStatus: {
          description: 'Obter status do sistema (CPU, memória, app ativo)',
          parameters: z.object({})
        }
      },
      maxTokens: 1024
    });
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
        message: `📋 Tarefas obtidas com sucesso`
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
} 