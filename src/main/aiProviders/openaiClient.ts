import { BaseAIClient, AIMessage, AIResponse, AIProvider } from './baseAIClient';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Importação com fallback para desenvolvimento
let axios: any = null;

try {
  axios = require('axios');
} catch (error) {
  console.warn('⚠️  axios não encontrado, usando fetch nativo');
}

export const OPENAI_PROVIDER: AIProvider = {
  id: 'openai',
  name: 'OpenAI',
  models: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo'
  ],
  defaultModel: 'gpt-4o-mini'
};

export class OpenAIClient extends BaseAIClient {
  private openai: any;

  constructor(apiKey: string, model?: string) {
    super(apiKey, OPENAI_PROVIDER, model);
    this.openai = createOpenAI({
      apiKey: this.apiKey,
    });
  }

  async makeRequest(messages: AIMessage[], maxTokens: number = 512, temperature: number = 0.7): Promise<AIResponse> {
    if (!axios) {
      // Mock para desenvolvimento - retorna resposta simulada
      const userMessage = messages[messages.length - 1]?.content || '';
      
      return {
        content: `🤖 **Duckduki Responde (OpenAI ${this.model}):**\n\nOlá! Recebi sua mensagem: "${userMessage}"\n\n💡 **Como posso ajudar:**\n- Análise avançada de código\n- Resumos inteligentes\n- Geração de texto criativo\n- Resolução de problemas complexos\n\n🔧 **Para funcionar completamente:**\nConfigure sua chave da API OpenAI nas configurações!\n\n✨ Esta é uma resposta simulada para demonstração.`
      };
    }

    try {
        const result = await generateText({
          model: this.openai(this.model),
          messages: messages.map(msg => ({
            role: msg.role,
          content: msg.content
        })),
        maxTokens,
        temperature,
      });

      return {
        content: result.text,
        usage: result.usage ? {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens
        } : undefined
      };
    } catch (error: any) {
      console.error('Erro na chamada OpenAI via AI SDK:', error);
      throw new Error(`Erro na API OpenAI: ${error.message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.processCommand('Hello, teste de conexão');
      return true;
    } catch (error) {
      return false;
    }
  }
} 