import React, { useState, useEffect } from 'react';
import './KnowledgePanel.css';
import { 
  MdMemory, 
  MdClose, 
  MdAdd, 
  MdSearch, 
  MdDelete, 
  MdNote, 
  MdNewspaper, 
  MdChat, 
  MdDescription, 
  MdCode, 
  MdLink,
  MdSave,
  MdRefresh
} from 'react-icons/md';

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
  const [showPostSummaryModal, setShowPostSummaryModal] = useState(false);

  // Estados do formulário de adição
  const [newItem, setNewItem] = useState({
    title: '',
    content: '',
    type: 'note' as KnowledgeItem['type'],
    tags: '',
    url: ''
  });

  // Estados do formulário de resumo de post
  const [postSummaryForm, setPostSummaryForm] = useState({
    title: '',
    content: '',
    url: '',
    tags: '',
    isUrl: false
  });

  const typeLabels = {
    note: <><MdNote /> Nota</>,
    post_summary: <><MdNewspaper /> Resumo de Post</>,
    conversation: <><MdChat /> Conversa</>,
    document: <><MdDescription /> Documento</>,
    code: <><MdCode /> Código</>,
    reference: <><MdLink /> Referência</>
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
    if (!newItem.title.trim() || !newItem.content.trim()) return;

    setIsLoading(true);
    try {
      const tags = newItem.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const result = await window.electronAPI.addKnowledgeItem({
        title: newItem.title,
        content: newItem.content,
        type: newItem.type,
        tags,
        url: newItem.url || undefined
      });

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
    if (!postSummaryForm.title.trim()) {
      alert('Por favor, digite um título para o post');
      return;
    }

    if (!postSummaryForm.content.trim()) {
      alert('Por favor, digite o conteúdo ou URL do post');
      return;
    }

    setIsLoading(true);
    try {
      const tags = postSummaryForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const url = postSummaryForm.url.trim() || undefined;
      
      const result = await window.electronAPI.savePostSummary(
        postSummaryForm.title,
        postSummaryForm.content,
        url,
        tags
      );

      if (result.success) {
        setPostSummaryForm({ title: '', content: '', url: '', tags: '', isUrl: false });
        setShowPostSummaryModal(false);
        loadKnowledgeItems();
        loadStats();
        alert('✅ Resumo salvo com sucesso!');
      } else {
        alert(`❌ Erro ao salvar resumo: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar resumo:', error);
      alert('❌ Erro ao salvar resumo do post');
    }
    setIsLoading(false);
  };

  const resetPostSummaryForm = () => {
    setPostSummaryForm({ title: '', content: '', url: '', tags: '', isUrl: false });
    setShowPostSummaryModal(false);
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
    <div className="knowledge-panel-overlay">
      <div className="knowledge-panel">
        <div className="knowledge-panel-header">
          <div className="knowledge-panel-title">
            <span className="title-icon">📚</span>
            <h3>Repositório de Conhecimento</h3>
            <span className="subtitle">Base inteligente de conhecimento</span>
          </div>
          
          <div className="knowledge-panel-controls">
            <button 
              className="refresh-btn"
              onClick={loadKnowledgeItems}
              disabled={isLoading}
              title="Atualizar repositório"
            >
              ↻
            </button>
            <button 
              className="close-btn"
              onClick={onClose}
              title="Fechar repositório"
            >
<MdClose />
            </button>
          </div>
        </div>

        {stats && (
          <div className="knowledge-stats">
            <div className="stat-item">
              <span className="stat-number">{stats.totalItems}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.totalWordsIndexed}</span>
              <span className="stat-label">Palavras</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.itemsByType?.post_summary || 0}</span>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.itemsByType?.note || 0}</span>
              <span className="stat-label">Notas</span>
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
              <MdAdd /> Adicionar Nota
            </button>
            <button
              onClick={() => setShowPostSummaryModal(true)}
              className="post-button"
              disabled={isLoading}
            >
              <MdNewspaper /> Resumir Post
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
<MdSave /> Salvar
              </button>
              <button onClick={() => setShowAddForm(false)} className="cancel-button">
<MdClose /> Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="knowledge-content">
          {isSearching && <div className="loading"><MdSearch /> Buscando...</div>}
          
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
<MdDelete />
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
              <h3><MdMemory /> Nenhum conhecimento salvo</h3>
              <p>Comece adicionando notas, salvando resumos de posts interessantes ou deixe a IA salvar suas conversas automaticamente.</p>
            </div>
          )}
        </div>

        {/* Modal de Resumo de Post */}
        {showPostSummaryModal && (
          <div className="knowledge-modal" onClick={resetPostSummaryForm}>
            <div className="modal-content post-summary-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><MdNewspaper /> Resumir Post</h3>
                                  <button onClick={resetPostSummaryForm}><MdClose /></button>
              </div>
              
              <div className="modal-body">
                <div className="form-section">
                  <label>Título do Post *</label>
                  <input
                    type="text"
                    placeholder="Digite o título do post..."
                    value={postSummaryForm.title}
                    onChange={(e) => setPostSummaryForm({ ...postSummaryForm, title: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-section">
                  <div className="content-type-toggle">
                    <label>
                      <input
                        type="radio"
                        name="contentType"
                        checked={!postSummaryForm.isUrl}
                        onChange={() => setPostSummaryForm({ ...postSummaryForm, isUrl: false, content: '' })}
                      />
                      Conteúdo Texto
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="contentType"
                        checked={postSummaryForm.isUrl}
                        onChange={() => setPostSummaryForm({ ...postSummaryForm, isUrl: true, content: '' })}
                      />
                      URL do Post
                    </label>
                  </div>
                </div>

                <div className="form-section">
                  <label>{postSummaryForm.isUrl ? 'URL do Post *' : 'Conteúdo do Post *'}</label>
                  {postSummaryForm.isUrl ? (
                    <input
                      type="url"
                      placeholder="https://exemplo.com/post"
                      value={postSummaryForm.content}
                      onChange={(e) => setPostSummaryForm({ ...postSummaryForm, content: e.target.value })}
                      className="form-input"
                    />
                  ) : (
                    <textarea
                      placeholder="Cole o conteúdo do post aqui..."
                      value={postSummaryForm.content}
                      onChange={(e) => setPostSummaryForm({ ...postSummaryForm, content: e.target.value })}
                      className="form-textarea"
                      rows={6}
                    />
                  )}
                </div>

                <div className="form-section">
                  <label>URL de Referência (opcional)</label>
                  <input
                    type="url"
                    placeholder="https://fonte-original.com"
                    value={postSummaryForm.url}
                    onChange={(e) => setPostSummaryForm({ ...postSummaryForm, url: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-section">
                  <label>Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    placeholder="tecnologia, ia, desenvolvimento, tutorial"
                    value={postSummaryForm.tags}
                    onChange={(e) => setPostSummaryForm({ ...postSummaryForm, tags: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  onClick={handleSavePostSummary}
                  className="save-button"
                  disabled={isLoading || !postSummaryForm.title.trim() || !postSummaryForm.content.trim()}
                >
                  {isLoading ? '⏳ Processando...' : '🤖 Gerar Resumo com IA'}
                </button>
                <button onClick={resetPostSummaryForm} className="cancel-button">
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedItem && (
          <div className="knowledge-modal" onClick={() => setSelectedItem(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{selectedItem.title}</h3>
                <button onClick={() => setSelectedItem(null)}><MdClose /></button>
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
    </div>
  );
};

export default KnowledgePanel; 