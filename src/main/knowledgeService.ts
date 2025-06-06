import Store from 'electron-store';

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'post_summary' | 'conversation' | 'document' | 'code' | 'reference';
  tags: string[];
  source?: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
  summary?: string;
  embedding?: number[]; // Para busca semântica futura
}

export interface KnowledgeSearchResult {
  item: KnowledgeItem;
  relevanceScore: number;
  highlightedContent: string;
}

interface KnowledgeStoreSchema {
  items: KnowledgeItem[];
  categories: string[];
  stats: {
    totalItems: number;
    totalWordsIndexed: number;
    lastUpdated: string | null;
  };
}

export class KnowledgeService {
  private store: Store<KnowledgeStoreSchema>;

  constructor() {
    this.store = new Store<KnowledgeStoreSchema>({
      name: 'knowledge-base',
      defaults: {
        items: [],
        categories: ['note', 'post_summary', 'conversation', 'document', 'code', 'reference'],
        stats: {
          totalItems: 0,
          totalWordsIndexed: 0,
          lastUpdated: null
        }
      }
    });
  }

  // Adicionar novo item ao repositório
  async addKnowledgeItem(item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeItem> {
    const newItem: KnowledgeItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const items = this.store.get('items') as KnowledgeItem[];
    items.push(newItem);
    this.store.set('items', items);
    this.updateStats();

    return newItem;
  }

  // Buscar itens no repositório
  async searchKnowledge(query: string, type?: KnowledgeItem['type'], limit: number = 10): Promise<KnowledgeSearchResult[]> {
    const items = this.store.get('items') as KnowledgeItem[];
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    const results: KnowledgeSearchResult[] = [];

    for (const item of items) {
      if (type && item.type !== type) continue;

      let relevanceScore = 0;
      const searchableText = `${item.title} ${item.content} ${item.tags.join(' ')} ${item.summary || ''}`.toLowerCase();
      
      // Calcular pontuação de relevância
      for (const term of searchTerms) {
        const titleMatches = (item.title.toLowerCase().match(new RegExp(term, 'g')) || []).length;
        const contentMatches = (item.content.toLowerCase().match(new RegExp(term, 'g')) || []).length;
        const tagMatches = item.tags.filter(tag => tag.toLowerCase().includes(term)).length;
        
        relevanceScore += titleMatches * 3 + contentMatches * 1 + tagMatches * 2;
      }

      if (relevanceScore > 0) {
        // Criar destaque do conteúdo
        let highlightedContent = item.content.substring(0, 200);
        for (const term of searchTerms) {
          const regex = new RegExp(term, 'gi');
          highlightedContent = highlightedContent.replace(regex, `**${term}**`);
        }

        results.push({
          item,
          relevanceScore,
          highlightedContent: highlightedContent + (item.content.length > 200 ? '...' : '')
        });
      }
    }

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  // Obter todos os itens
  async getAllKnowledge(type?: KnowledgeItem['type'], limit?: number): Promise<KnowledgeItem[]> {
    const items = this.store.get('items') as KnowledgeItem[];
    let filteredItems = type ? items.filter(item => item.type === type) : items;
    
    // Ordenar por data de criação (mais recentes primeiro)
    filteredItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? filteredItems.slice(0, limit) : filteredItems;
  }

  // Obter item específico
  async getKnowledgeItem(id: string): Promise<KnowledgeItem | null> {
    const items = this.store.get('items') as KnowledgeItem[];
    return items.find(item => item.id === id) || null;
  }

  // Atualizar item
  async updateKnowledgeItem(id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem | null> {
    const items = this.store.get('items') as KnowledgeItem[];
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) return null;

    items[index] = {
      ...items[index],
      ...updates,
      updatedAt: new Date()
    };

    this.store.set('items', items);
    this.updateStats();
    
    return items[index];
  }

  // Remover item
  async deleteKnowledgeItem(id: string): Promise<boolean> {
    const items = this.store.get('items') as KnowledgeItem[];
    const filteredItems = items.filter(item => item.id !== id);
    
    if (filteredItems.length === items.length) return false;
    
    this.store.set('items', filteredItems);
    this.updateStats();
    return true;
  }

  // Obter estatísticas
  async getStats(): Promise<{ totalItems: number; totalWordsIndexed: number; lastUpdated: Date | null; itemsByType: Record<string, number> }> {
    const items = this.store.get('items') as KnowledgeItem[];
    const stats = this.store.get('stats') as any;
    
    const itemsByType: Record<string, number> = {};
    let totalWords = 0;
    
    items.forEach(item => {
      itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
      totalWords += item.content.split(' ').length + item.title.split(' ').length;
    });

    return {
      totalItems: items.length,
      totalWordsIndexed: totalWords,
      lastUpdated: stats.lastUpdated ? new Date(stats.lastUpdated) : null,
      itemsByType
    };
  }

  // Obter todas as tags
  async getAllTags(): Promise<string[]> {
    const items = this.store.get('items') as KnowledgeItem[];
    const allTags = new Set<string>();
    
    items.forEach(item => {
      item.tags.forEach(tag => allTags.add(tag));
    });
    
    return Array.from(allTags).sort();
  }

  // Gerar resumo usando AI
  async generateSummary(content: string, title: string, aiClient?: any): Promise<string> {
    if (!aiClient) {
      // Fallback: resumo simples baseado em texto
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const firstSentences = sentences.slice(0, 3).join('. ');
      return firstSentences.length > 200 
        ? firstSentences.substring(0, 200) + '...'
        : firstSentences;
    }

    try {
      const messages = [
        {
          role: 'system',
          content: 'Você é um especialista em criar resumos concisos e informativos. Crie um resumo de 2-3 frases que capture os pontos principais do conteúdo.'
        },
        {
          role: 'user',
          content: `Título: ${title}\n\nConteúdo: ${content}\n\nCrie um resumo conciso e informativo:`
        }
      ];

      return await aiClient.makeRequest(messages, 150);
    } catch (error) {
      console.error('Erro ao gerar resumo:', error);
      // Fallback para resumo simples
      return content.substring(0, 200) + (content.length > 200 ? '...' : '');
    }
  }

  // Salvar conversa com IA
  async saveConversation(userMessage: string, aiResponse: string, context?: string): Promise<KnowledgeItem> {
    const conversation = {
      title: `Conversa: ${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}`,
      content: `**Usuário:** ${userMessage}\n\n**Duckduki:** ${aiResponse}${context ? `\n\n**Contexto:** ${context}` : ''}`,
      type: 'conversation' as const,
      tags: ['conversa', 'ai', 'duckduki'],
      summary: `Conversa sobre: ${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}`
    };

    return await this.addKnowledgeItem(conversation);
  }

  // Salvar resumo de post
  async savePostSummary(title: string, summary: string, url?: string, tags: string[] = []): Promise<KnowledgeItem> {
    const postSummary = {
      title: `Post: ${title}`,
      content: summary,
      type: 'post_summary' as const,
      tags: ['post', 'resumo', ...tags],
      url,
      source: url ? new URL(url).hostname : undefined,
      summary: summary.length > 200 ? summary.substring(0, 200) + '...' : summary
    };

    return await this.addKnowledgeItem(postSummary);
  }

  // Buscar conhecimento contextual para RAG
  async getContextualKnowledge(query: string, maxItems: number = 5): Promise<string> {
    const searchResults = await this.searchKnowledge(query, undefined, maxItems);
    
    if (searchResults.length === 0) {
      return 'Nenhum conhecimento relevante encontrado na base de dados.';
    }

    let context = '**Conhecimento relevante da base de dados:**\n\n';
    
    searchResults.forEach((result, index) => {
      context += `${index + 1}. **${result.item.title}** (${result.item.type})\n`;
      context += `   ${result.highlightedContent}\n`;
      if (result.item.tags.length > 0) {
        context += `   🏷️ Tags: ${result.item.tags.join(', ')}\n`;
      }
      context += '\n';
    });

    return context;
  }

  private updateStats(): void {
    const items = this.store.get('items') as KnowledgeItem[];
    let totalWords = 0;
    
    items.forEach(item => {
      totalWords += item.content.split(' ').length + item.title.split(' ').length;
    });

    this.store.set('stats', {
      totalItems: items.length,
      totalWordsIndexed: totalWords,
      lastUpdated: new Date().toISOString()
    });
  }

  // Limpar toda a base de conhecimento
  async clearKnowledge(): Promise<void> {
    this.store.set('items', []);
    this.updateStats();
  }

  // Exportar base de conhecimento
  async exportKnowledge(): Promise<KnowledgeItem[]> {
    return this.store.get('items') as KnowledgeItem[];
  }

  // Importar base de conhecimento
  async importKnowledge(items: KnowledgeItem[]): Promise<void> {
    const existingItems = this.store.get('items') as KnowledgeItem[];
    const allItems = [...existingItems, ...items];
    
    // Remover duplicatas baseado no ID
    const uniqueItems = allItems.filter((item, index, self) => 
      index === self.findIndex(i => i.id === item.id)
    );
    
    this.store.set('items', uniqueItems);
    this.updateStats();
  }
} 