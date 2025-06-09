import { BaseAIClient, AIMessage, AIResponse, AIProvider } from './baseAIClient';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Importação com fallback para desenvolvimento
let axios: any = null;

try {
  axios = require('axios');
} catch (error) {
  console.warn('⚠️  axios não encontrado, usando fetch nativo');
}

export const GOOGLE_PROVIDER: AIProvider = {
  id: 'google',
  name: 'Google Gemini',
  models: [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro'
  ],
  defaultModel: 'gemini-1.5-flash'
};

export class GoogleClient extends BaseAIClient {
  private google: any;

  constructor(apiKey: string, model?: string) {
    super(apiKey, GOOGLE_PROVIDER, model);
    this.google = createGoogleGenerativeAI({
      apiKey: this.apiKey,
    });
  }

  async makeRequest(messages: AIMessage[], maxTokens: number = 512, temperature: number = 0.7): Promise<AIResponse> {
    try {
        const result = await generateText({
          model: this.google(this.model),
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
      console.error('Erro na chamada Google via AI SDK:', error);
      throw new Error(`Erro na API Google: ${error.message}`);
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