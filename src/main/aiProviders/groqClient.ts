import { BaseAIClient, AIMessage, AIResponse, AIProvider } from './baseAIClient';
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

// Importação com fallback para desenvolvimento
let axios: any = null;

try {
  axios = require('axios');
} catch (error) {
  console.warn('⚠️  axios não encontrado, usando fetch nativo');
}

export const GROQ_PROVIDER: AIProvider = {
  id: 'groq',
  name: 'Groq',
  models: [
    'llama3-8b-8192',
    'llama3-70b-8192',
    'mixtral-8x7b-32768',
    'gemma-7b-it'
  ],
  defaultModel: 'llama3-8b-8192'
};

export class GroqAIClient extends BaseAIClient {
  private groq: any;

  constructor(apiKey: string, model?: string) {
    super(apiKey, GROQ_PROVIDER, model);
    this.groq = createGroq({
      apiKey: this.apiKey,
    });
  }

  async makeRequest(messages: AIMessage[], maxTokens: number = 512, temperature: number = 0.7): Promise<AIResponse> {
    try {
        const result = await generateText({
          model: this.groq(this.model),
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
      console.error('Erro na chamada Groq via AI SDK:', error);
      throw new Error(`Erro na API Groq: ${error.message}`);
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