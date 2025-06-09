export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  id: string;
  name: string;
  models: string[];
  defaultModel: string;
}

export abstract class BaseAIClient {
  protected apiKey: string;
  protected provider: AIProvider;
  protected model: string;

  constructor(apiKey: string, provider: AIProvider, model?: string) {
    this.apiKey = apiKey;
    this.provider = provider;
    this.model = model || provider.defaultModel;
  }

  abstract makeRequest(messages: AIMessage[], maxTokens?: number, temperature?: number): Promise<AIResponse>;
  
  abstract testConnection(): Promise<boolean>;
  
  getProvider(): AIProvider {
    return this.provider;
  }

  getModel(): string {
    return this.model;
  }

  setModel(model: string): void {
    if (!this.provider.models.includes(model)) {
      throw new Error(`Modelo ${model} não é suportado pelo provedor ${this.provider.name}`);
    }
    this.model = model;
  }

  async processCommand(command: string, systemPrompt?: string): Promise<string> {
    const messages: AIMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: command });
    
    const response = await this.makeRequest(messages);
    return response.content;
  }

  async processWithContext(messages: AIMessage[], maxTokens?: number): Promise<string> {
    const response = await this.makeRequest(messages, maxTokens);
    return response.content;
  }
} 