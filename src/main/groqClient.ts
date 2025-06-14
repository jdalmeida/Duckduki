// Importação com fallback para desenvolvimento
let axios: any = null;

try {
  axios = require('axios');
} catch (error) {
  console.warn('⚠️  axios não encontrado, usando fetch nativo');
}

import { KnowledgeService } from './knowledgeService';
import { AIToolsService } from './aiToolsService';

export interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface Email {
  from: string;
  subject: string;
  preview: string;
  date: Date;
}

export class GroqClient {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1';
  private knowledgeService: KnowledgeService;
  private aiToolsService: AIToolsService | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.knowledgeService = new KnowledgeService();
  }

  setAIToolsService(aiToolsService: AIToolsService) {
    this.aiToolsService = aiToolsService;
  }

  private async makeRequest(messages: Array<{ role: string; content: string }>, maxTokens: number = 512): Promise<string> {
    if (!axios) {
      // Mock para desenvolvimento - retorna resposta simulada
      const userMessage = messages[messages.length - 1]?.content || '';
      
      if (userMessage.toLowerCase().includes('email')) {
        return '📧 **Resumo dos E-mails:**\n\n✅ **3 Prioridades Hoje:**\n1. Revisar projeto Q4 (URGENTE)\n2. Responder cliente sobre proposta\n3. Verificar build quebrado no CI/CD\n\n💡 **Sugestões de Resposta:**\n- Para o chefe: "Confirmo disponibilidade para revisão hoje às 14h"\n- Para cliente: "Agendemos call amanhã às 10h para discutir detalhes"';
      }
      
      if (userMessage.toLowerCase().includes('código')) {
        return '💻 **Análise de Código:**\n\n🔍 **Melhorias Sugeridas:**\n1. Adicionar tratamento de erro com try-catch\n2. Implementar loading state\n3. Usar useCallback para otimizar re-renders\n\n✨ **Código Otimizado:**\n```typescript\nconst fetchData = useCallback(async () => {\n  try {\n    setLoading(true);\n    const response = await fetch(\'/api/data\');\n    if (!response.ok) throw new Error(\'Failed to fetch\');\n    const data = await response.json();\n    setData(data);\n  } catch (error) {\n    setError(error.message);\n  } finally {\n    setLoading(false);\n  }\n}, []);\n```';
      }
      
      if (userMessage.toLowerCase().includes('build')) {
        return '🔨 **Build Executado:**\n\n✅ **Status:** Sucesso\n⏱️ **Tempo:** 2.3 segundos\n📦 **Saída:** Build concluído com sucesso\n\n📋 **Próximos Passos:**\n- Deploy para staging disponível\n- Todos os testes passaram\n- Bundle size: 245 KB (dentro do limite)';
      }
      
      return `🤖 **Duckduki Responde:**\n\nOlá! Recebi sua mensagem: "${userMessage}"\n\n💡 **Como posso ajudar:**\n- Análise de código e sugestões\n- Resumos de e-mail inteligentes\n- Automação de builds e deploys\n- Planejamento de tarefas\n\n🔧 **Para funcionar completamente:**\nConfigure sua chave da API Groq nas configurações!\n\n✨ Esta é uma resposta simulada para demonstração.`;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'llama3-8b-8192',
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const data: GroqResponse = response.data;
      return data.choices[0]?.message?.content || 'Resposta vazia';
    } catch (error: any) {
      console.error('Erro na chamada Groq:', error);
      throw new Error(`Erro na API Groq: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async processCommand(command: string, saveToKnowledge: boolean = true): Promise<string> {
    // Buscar conhecimento contextual para o comando
    const contextualKnowledge = await this.knowledgeService.getContextualKnowledge(command, 3);
    
    const systemMessage = `Você é um assistente de produtividade inteligente. Responda de forma concisa e útil aos comandos do usuário. Se for sobre código, seja específico. Se for sobre organização, seja prático.
    
    ${contextualKnowledge !== 'Nenhum conhecimento relevante encontrado na base de dados.' ? contextualKnowledge : ''}`;

    const messages = [
      {
        role: 'system',
        content: systemMessage
      },
      {
        role: 'user',
        content: command
      }
    ];

    const response = await this.makeRequest(messages);
    
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
    const messages = [
      {
        role: 'system',
        content: systemMessage
      },
      // Adicionar contexto das mensagens anteriores (limitado a 15 mensagens)
      ...chatContext.slice(-14), // Garantir que não exceda o limite junto com a nova mensagem
      {
        role: 'user',
        content: command
      }
    ];

    const response = await this.makeRequest(messages, 1024); // Mais tokens para respostas contextuais
    
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

    const emailSummary = emails.map((email, index) => 
      `${index + 1}. De: ${email.from} | Assunto: ${email.subject} | Prévia: ${email.preview.substring(0, 100)}...`
    ).join('\n');

    const messages = [
      {
        role: 'system',
        content: 'Você é um assistente que cria briefings matinais. Analise os e-mails e gere um resumo com as 3 principais prioridades e sugestões de resposta rápida para e-mails urgentes.'
      },
      {
        role: 'user',
        content: `Aqui estão os últimos e-mails:\n\n${emailSummary}\n\nGere um briefing com prioridades e sugestões de resposta.`
      }
    ];

    return await this.makeRequest(messages, 1024);
  }

  async analyzeCode(codeSnippet: string): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: 'Você é um especialista em revisão de código. Analise o código fornecido e sugira melhorias específicas, tratamento de erros e otimizações. Seja direto e prático.'
      },
      {
        role: 'user',
        content: `Analise este código e sugira melhorias:\n\n\`\`\`\n${codeSnippet}\n\`\`\``
      }
    ];

    return await this.makeRequest(messages, 1024);
  }

  async generateDayPlan(activities: string[]): Promise<string> {
    const activitiesText = activities.join(', ');
    
    const messages = [
      {
        role: 'system',
        content: 'Você é um especialista em produtividade. Crie um plano de dia otimizado com blocos de foco, pausas e prioridades baseado nas atividades mencionadas.'
      },
      {
        role: 'user',
        content: `Baseado nestas atividades recentes: ${activitiesText}\n\nSugira um plano para o restante do dia com blocos de foco e pausas.`
      }
    ];

    return await this.makeRequest(messages, 1024);
  }

  async generateContextualSuggestion(appName: string, context?: string): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: 'Você é um assistente proativo. Baseado no aplicativo que o usuário está usando, sugira ações úteis e específicas que podem aumentar a produtividade.'
      },
      {
        role: 'user',
        content: `O usuário está usando: ${appName}${context ? ` | Contexto adicional: ${context}` : ''}\n\nSugira uma ação específica e útil.`
      }
    ];

    return await this.makeRequest(messages, 256);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.processCommand('Hello, teste de conexão', false); // Não salvar teste de conexão
      return true;
    } catch (error) {
      return false;
    }
  }

  // Métodos para gerenciar base de conhecimento
  getKnowledgeService(): KnowledgeService {
    return this.knowledgeService;
  }

  async addKnowledge(title: string, content: string, type: 'note' | 'post_summary' | 'conversation' | 'document' | 'code' | 'reference', tags: string[] = [], url?: string) {
    return await this.knowledgeService.addKnowledgeItem({
      title,
      content,
      type,
      tags,
      url,
      summary: await this.knowledgeService.generateSummary(content, title, this)
    });
  }

  async searchKnowledge(query: string, type?: 'note' | 'post_summary' | 'conversation' | 'document' | 'code' | 'reference', limit: number = 10) {
    return await this.knowledgeService.searchKnowledge(query, type, limit);
  }

  async savePostSummaryWithAI(title: string, content: string, url?: string, tags: string[] = []) {
    // Gerar resumo usando IA
    const summary = await this.knowledgeService.generateSummary(content, title, this);
    return await this.knowledgeService.savePostSummary(title, summary, url, tags);
  }
} 