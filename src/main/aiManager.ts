import { BaseAIClient, AIMessage } from './aiProviders/baseAIClient';
import { GroqAIClient, GROQ_PROVIDER } from './aiProviders/groqClient';
import { OpenAIClient, OPENAI_PROVIDER } from './aiProviders/openaiClient';
import { GoogleClient, GOOGLE_PROVIDER } from './aiProviders/googleClient';
import { KnowledgeService } from './knowledgeService';
import { AIToolsService } from './aiToolsService';

export interface AIConfig {
  provider: 'groq' | 'openai' | 'google';
  model?: string;
  apiKey: string;
}

export interface Email {
  from: string;
  subject: string;
  preview: string;
  date: Date;
}

export class AIManager {
  private clients: Map<string, BaseAIClient> = new Map();
  private activeProvider: string = 'groq';
  private knowledgeService: KnowledgeService;
  private aiToolsService: AIToolsService | null = null;

  constructor() {
    this.knowledgeService = new KnowledgeService();
  }

  setAIToolsService(aiToolsService: AIToolsService) {
    this.aiToolsService = aiToolsService;
  }

  configureProvider(config: AIConfig): void {
    let client: BaseAIClient;

    switch (config.provider) {
      case 'groq':
        client = new GroqAIClient(config.apiKey, config.model);
        break;
      case 'openai':
        client = new OpenAIClient(config.apiKey, config.model);
        break;
      case 'google':
        client = new GoogleClient(config.apiKey, config.model);
        break;
      default:
        throw new Error(`Provedor ${config.provider} não suportado`);
    }

    this.clients.set(config.provider, client);
    console.log(`✅ Provedor ${config.provider} configurado com modelo ${client.getModel()}`);
  }

  setActiveProvider(provider: 'groq' | 'openai' | 'google'): void {
    if (!this.clients.has(provider)) {
      throw new Error(`Provedor ${provider} não está configurado`);
    }
    this.activeProvider = provider;
    console.log(`🔄 Provedor ativo alterado para: ${provider}`);
  }

  getActiveProvider(): string {
    return this.activeProvider;
  }

  getAvailableProviders(): Array<{ id: string; name: string; configured: boolean; model?: string }> {
    const providers = [GROQ_PROVIDER, OPENAI_PROVIDER, GOOGLE_PROVIDER];
    
    return providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      configured: this.clients.has(provider.id),
      model: this.clients.get(provider.id)?.getModel()
    }));
  }

  getProviderModels(providerId: string): string[] {
    const providers = [GROQ_PROVIDER, OPENAI_PROVIDER, GOOGLE_PROVIDER];
    const provider = providers.find(p => p.id === providerId);
    return provider?.models || [];
  }

  setProviderModel(providerId: string, model: string): void {
    const client = this.clients.get(providerId);
    if (!client) {
      throw new Error(`Provedor ${providerId} não está configurado`);
    }
    client.setModel(model);
    console.log(`🔧 Modelo do ${providerId} alterado para: ${model}`);
  }

  private getActiveClient(): BaseAIClient {
    const client = this.clients.get(this.activeProvider);
    if (!client) {
      throw new Error(`Provedor ativo ${this.activeProvider} não está configurado`);
    }
    return client;
  }

  async processCommand(command: string, saveToKnowledge: boolean = true): Promise<string> {
    const client = this.getActiveClient();
    
    // Buscar conhecimento contextual para o comando
    const contextualKnowledge = await this.knowledgeService.getContextualKnowledge(command, 3);
    
    const systemMessage = `Você é um assistente de produtividade inteligente. Responda de forma concisa e útil aos comandos do usuário. Se for sobre código, seja específico. Se for sobre organização, seja prático.
    
    ${contextualKnowledge !== 'Nenhum conhecimento relevante encontrado na base de dados.' ? contextualKnowledge : ''}`;

    const response = await client.processCommand(command, systemMessage);
    
    // Salvar a conversa na base de conhecimento se solicitado
    if (saveToKnowledge) {
      await this.knowledgeService.saveConversation(command, response);
    }

    return response;
  }

  async processCommandWithContextStream(command: string, chatContext: Array<{ role: string; content: string }>) {
    // Se o AIToolsService estiver disponível, usar tools com streaming
    if (this.aiToolsService) {
      return await this.aiToolsService.processWithToolsStream(command, chatContext);
    }
    
    // Fallback sem tools
    throw new Error('AIToolsService não disponível para streaming');
  }

  async processCommandWithContext(command: string, chatContext: Array<{ role: string; content: string }>, saveToKnowledge: boolean = true): Promise<string> {
    const client = this.getActiveClient();
    
    // Se o AIToolsService estiver disponível, usar tools
    if (this.aiToolsService) {
      try {
        const response = await this.aiToolsService.processWithTools(command, chatContext);
        
        // Salvar a conversa na base de conhecimento se solicitado
        if (saveToKnowledge) {
          await this.knowledgeService.saveConversation(command, response, `Contexto: ${chatContext.length} mensagens anteriores (com tools)`);
        }
        
        return response;
      } catch (error) {
        console.error('Erro ao usar tools, fallback para método tradicional:', error);
        // Continuar com o método tradicional em caso de erro
      }
    }

    // Método tradicional (fallback)
    const contextualKnowledge = await this.knowledgeService.getContextualKnowledge(command, 3);
    
    const systemMessage = `Você é um assistente de produtividade inteligente chamado Duckduki. Você está tendo uma conversa contínua com o usuário e deve manter o contexto da conversa anterior. Responda de forma concisa e útil aos comandos do usuário. Se for sobre código, seja específico. Se for sobre organização, seja prático.
    
    ${contextualKnowledge !== 'Nenhum conhecimento relevante encontrado na base de dados.' ? contextualKnowledge : ''}`;

    // Construir mensagens com contexto da conversa
    const messages: AIMessage[] = [
      { role: 'system', content: systemMessage },
      // Adicionar contexto das mensagens anteriores (limitado a 14 mensagens)
      ...chatContext.slice(-14).map(msg => ({ 
        role: msg.role as 'user' | 'assistant' | 'system', 
        content: msg.content 
      })),
      { role: 'user', content: command }
    ];

    const response = await client.processWithContext(messages, 1024); // Mais tokens para respostas contextuais
    
    // Salvar a conversa na base de conhecimento se solicitado
    if (saveToKnowledge) {
      await this.knowledgeService.saveConversation(command, response, `Contexto: ${chatContext.length} mensagens anteriores`);
    }

    return response;
  }

  async summarizeEmails(emails: Email[]): Promise<string> {
    if (emails.length === 0) {
      return 'Nenhum e-mail encontrado para resumir.';
    }

    const client = this.getActiveClient();
    const emailSummary = emails.map((email, index) => 
      `${index + 1}. De: ${email.from} | Assunto: ${email.subject} | Prévia: ${email.preview.substring(0, 100)}...`
    ).join('\n');

    const systemMessage = 'Você é um assistente que cria briefings matinais. Analise os e-mails e gere um resumo com as 3 principais prioridades e sugestões de resposta rápida para e-mails urgentes.';
    const userMessage = `Aqui estão os últimos e-mails:\n\n${emailSummary}\n\nGere um briefing com prioridades e sugestões de resposta.`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];

    return await client.processWithContext(messages, 1024);
  }

  async analyzeCode(codeSnippet: string): Promise<string> {
    const client = this.getActiveClient();
    const systemMessage = 'Você é um especialista em revisão de código. Analise o código fornecido e sugira melhorias específicas, tratamento de erros e otimizações. Seja direto e prático.';
    const userMessage = `Analise este código e sugira melhorias:\n\n\`\`\`\n${codeSnippet}\n\`\`\``;

    const messages: AIMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];

    return await client.processWithContext(messages, 1024);
  }

  async generateDayPlan(activities: string[]): Promise<string> {
    const client = this.getActiveClient();
    const activitiesText = activities.join(', ');
    
    const systemMessage = 'Você é um especialista em produtividade. Crie um plano de dia otimizado com blocos de foco, pausas e prioridades baseado nas atividades mencionadas.';
    const userMessage = `Baseado nestas atividades recentes: ${activitiesText}\n\nSugira um plano para o restante do dia com blocos de foco e pausas.`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];

    return await client.processWithContext(messages, 1024);
  }

  async generateContextualSuggestion(appName: string, context?: string): Promise<string> {
    const client = this.getActiveClient();
    const systemMessage = 'Você é um assistente proativo. Baseado no aplicativo que o usuário está usando, sugira ações úteis e específicas que podem aumentar a produtividade.';
    const userMessage = `O usuário está usando: ${appName}${context ? ` | Contexto adicional: ${context}` : ''}\n\nSugira uma ação específica e útil.`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];

    return await client.processWithContext(messages, 256);
  }

  async testConnection(provider?: string): Promise<boolean> {
    try {
      const targetProvider = provider || this.activeProvider;
      const client = this.clients.get(targetProvider);
      
      if (!client) {
        return false;
      }
      
      return await client.testConnection();
    } catch (error) {
      return false;
    }
  }

  // Métodos para gerenciar base de conhecimento
  getKnowledgeService(): KnowledgeService {
    return this.knowledgeService;
  }

  async addKnowledge(title: string, content: string, type: 'note' | 'post_summary' | 'conversation' | 'document' | 'code' | 'reference', tags: string[] = [], url?: string) {
    const client = this.getActiveClient();
    const summary = await this.knowledgeService.generateSummary(content, title, { processCommand: (cmd: string) => client.processCommand(cmd) });
    
    return await this.knowledgeService.addKnowledgeItem({
      title,
      content,
      type,
      tags,
      url,
      summary
    });
  }

  async searchKnowledge(query: string, type?: 'note' | 'post_summary' | 'conversation' | 'document' | 'code' | 'reference', limit: number = 10) {
    return await this.knowledgeService.searchKnowledge(query, type, limit);
  }

  async savePostSummaryWithAI(title: string, content: string, url?: string, tags: string[] = []) {
    const client = this.getActiveClient();
    const summary = await this.knowledgeService.generateSummary(content, title, { processCommand: (cmd: string) => client.processCommand(cmd) });
    return await this.knowledgeService.savePostSummary(title, summary, url, tags);
  }
} 