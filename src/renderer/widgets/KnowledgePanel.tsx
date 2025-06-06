import React, { useState, useEffect } from 'react';
import './KnowledgePanel.css';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'post_summary' | 'conversation' | 'document' | 'code' | 'reference';
  tags: string[];
  source?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
  summary?: string;
}

interface KnowledgeSearchResult {
  item: KnowledgeItem;
  relevanceScore: number;
  highlightedContent: string;
}

interface KnowledgePanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ isVisible, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados do formulário de adição
  const [newItem, setNewItem] = useState({
    title: '',
    content: '',
    type: 'note' as KnowledgeItem['type'],
    tags: '',
    url: ''
  });

  const typeLabels = {
    note: '📝 Nota',
    post_summary: '📰 Resumo de Post',
    conversation: '💬 Conversa',
    document: '📄 Documento',
    code: '💻 Código',
    reference: '🔗 Referência'
  };

  useEffect(() => {
    if (isVisible) {
      loadKnowledgeItems();
      loadStats();
    }
  }, [isVisible]);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, selectedType]);

  const loadKnowledgeItems = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.getAllKnowledge(selectedType || undefined, 50);
      if (result.success) {
        setKnowledgeItems(result.items);
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    }
    setIsLoading(false);
  };

  const loadStats = async () => {
    try {
      const result = await window.electronAPI.getKnowledgeStats();
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const result = await window.electronAPI.searchKnowledge(
        searchQuery,
        selectedType || undefined,
        20
      );
      if (result.success) {
        setSearchResults(result.results);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
    }
    setIsSearching(false);
  };

  const handleAddItem = async () => {
    if (!newItem.title.trim() || !newItem.content.trim()) {
      alert('Título e conteúdo são obrigatórios');
      return;
    }

    setIsLoading(true);
    try {
      const tagsArray = newItem.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const item = {
        title: newItem.title,
        content: newItem.content,
        type: newItem.type,
        tags: tagsArray,
        url: newItem.url || undefined
      };

      const result = await window.electronAPI.addKnowledgeItem(item);
      if (result.success) {
        setNewItem({ title: '', content: '', type: 'note', tags: '', url: '' });
        setShowAddForm(false);
        loadKnowledgeItems();
        loadStats();
      }
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      alert('Erro ao adicionar item');
    }
    setIsLoading(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este item?')) return;

    try {
      const result = await window.electronAPI.deleteKnowledgeItem(id);
      if (result.success) {
        loadKnowledgeItems();
        loadStats();
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Erro ao remover item:', error);
      alert('Erro ao remover item');
    }
  };

  const handleSavePostSummary = async () => {
    const title = prompt('Título do post:');
    if (!title) return;

    const content = prompt('Conteúdo ou URL do post:');
    if (!content) return;

    const url = prompt('URL (opcional):') || undefined;
    const tagsInput = prompt('Tags (separadas por vírgula):') || '';
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);

    setIsLoading(true);
    try {
      const result = await window.electronAPI.savePostSummary(title, content, url, tags);
      if (result.success) {
        loadKnowledgeItems();
        loadStats();
      }
    } catch (error) {
      console.error('Erro ao salvar resumo:', error);
      alert('Erro ao salvar resumo do post');
    }
    setIsLoading(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderContent = (content: string) => {
    if (content.length > 200) {
      return content.substring(0, 200) + '...';
    }
    return content;
  };

  if (!isVisible) return null;

  return (
    <div className="knowledge-panel">
      <div className="knowledge-header">
        <h2>🧠 Repositório de Conhecimento</h2>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      {stats && (
        <div className="knowledge-stats">
          <div className="stat-item">
            <span className="stat-label">Total de Itens:</span>
            <span className="stat-value">{stats.totalItems}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Palavras Indexadas:</span>
            <span className="stat-value">{stats.totalWordsIndexed.toLocaleString()}</span>
          </div>
          <div className="stat-types">
            {Object.entries(stats.itemsByType).map(([type, count]) => (
              <span key={type} className="type-count">
                {typeLabels[type as keyof typeof typeLabels]}: {count as number}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="knowledge-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Buscar no conhecimento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="type-filter"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(typeLabels).map(([type, label]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>
        </div>

        <div className="action-buttons">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="add-button"
            disabled={isLoading}
          >
            📝 Adicionar Nota
          </button>
          <button
            onClick={handleSavePostSummary}
            className="post-button"
            disabled={isLoading}
          >
            📰 Resumir Post
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="add-form">
          <h3>Adicionar Novo Item</h3>
          <input
            type="text"
            placeholder="Título"
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            className="form-input"
          />
          <select
            value={newItem.type}
            onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
            className="form-select"
          >
            {Object.entries(typeLabels).map(([type, label]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>
          <textarea
            placeholder="Conteúdo"
            value={newItem.content}
            onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
            className="form-textarea"
            rows={4}
          />
          <input
            type="text"
            placeholder="Tags (separadas por vírgula)"
            value={newItem.tags}
            onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })}
            className="form-input"
          />
          <input
            type="url"
            placeholder="URL (opcional)"
            value={newItem.url}
            onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
            className="form-input"
          />
          <div className="form-buttons">
            <button onClick={handleAddItem} className="save-button" disabled={isLoading}>
              💾 Salvar
            </button>
            <button onClick={() => setShowAddForm(false)} className="cancel-button">
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="knowledge-content">
        {isSearching && <div className="loading">🔍 Buscando...</div>}
        
        {searchQuery && searchResults.length > 0 && (
          <div className="search-results">
            <h3>Resultados da Busca ({searchResults.length})</h3>
            {searchResults.map((result) => (
              <div
                key={result.item.id}
                className="knowledge-item search-result"
                onClick={() => setSelectedItem(result.item)}
              >
                <div className="item-header">
                  <span className="item-type">{typeLabels[result.item.type]}</span>
                  <span className="relevance-score">Relevância: {result.relevanceScore}</span>
                </div>
                <h4>{result.item.title}</h4>
                <div className="item-content" dangerouslySetInnerHTML={{ __html: result.highlightedContent }} />
                <div className="item-meta">
                  <span>{formatDate(result.item.createdAt)}</span>
                  {result.item.tags.length > 0 && (
                    <div className="tags">
                      {result.item.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!searchQuery && knowledgeItems.length > 0 && (
          <div className="knowledge-list">
            <h3>Itens Recentes</h3>
            {knowledgeItems.map((item) => (
              <div
                key={item.id}
                className="knowledge-item"
                onClick={() => setSelectedItem(item)}
              >
                <div className="item-header">
                  <span className="item-type">{typeLabels[item.type]}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id);
                    }}
                    className="delete-button"
                  >
                    🗑️
                  </button>
                </div>
                <h4>{item.title}</h4>
                <div className="item-content">{renderContent(item.content)}</div>
                <div className="item-meta">
                  <span>{formatDate(item.createdAt)}</span>
                  {item.tags.length > 0 && (
                    <div className="tags">
                      {item.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!searchQuery && knowledgeItems.length === 0 && !isLoading && (
          <div className="empty-state">
            <h3>📚 Nenhum conhecimento salvo</h3>
            <p>Comece adicionando notas, salvando resumos de posts interessantes ou deixe a IA salvar suas conversas automaticamente.</p>
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="knowledge-modal" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedItem.title}</h3>
              <button onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            <div className="modal-meta">
              <span className="item-type">{typeLabels[selectedItem.type]}</span>
              <span>Criado: {formatDate(selectedItem.createdAt)}</span>
              {selectedItem.updatedAt !== selectedItem.createdAt && (
                <span>Atualizado: {formatDate(selectedItem.updatedAt)}</span>
              )}
            </div>
            <div className="modal-content-body">
              <div className="content-text">{selectedItem.content}</div>
              {selectedItem.url && (
                <div className="url-section">
                  <strong>URL:</strong> 
                  <a href={selectedItem.url} target="_blank" rel="noopener noreferrer">
                    {selectedItem.url}
                  </a>
                </div>
              )}
              {selectedItem.tags.length > 0 && (
                <div className="tags-section">
                  <strong>Tags:</strong>
                  <div className="tags">
                    {selectedItem.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isLoading && <div className="loading-overlay">⏳ Carregando...</div>}
    </div>
  );
};

export default KnowledgePanel; 