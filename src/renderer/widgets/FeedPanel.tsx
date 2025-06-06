import React, { useState, useEffect } from 'react';
import './FeedPanel.css';

interface FeedItem {
  id: string;
  title: string;
  url: string;
  score: number;
  source: 'hackernews' | 'reddit' | 'github' | 'dev.to';
  author?: string;
  comments: number;
  timestamp: number;
  description?: string;
  tags?: string[];
}

interface FeedPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const FeedPanel: React.FC<FeedPanelProps> = ({ isVisible, onClose }) => {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (isVisible) {
      loadFeeds();
    }
  }, [isVisible, activeFilter]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && isVisible) {
      // Auto-refresh a cada 15 minutos
      interval = setInterval(() => {
        loadFeeds();
      }, 15 * 60 * 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, isVisible, activeFilter]);

  const loadFeeds = async () => {
    setLoading(true);
    setError(null);

    try {
      let result;
      
      if (activeFilter === 'all') {
        result = await window.electronAPI.getTechFeeds(6);
      } else {
        const sources = activeFilter === 'hackernews' ? ['hackernews'] :
                      activeFilter === 'reddit' ? ['reddit'] :
                      activeFilter === 'github' ? ['github'] :
                      activeFilter === 'devto' ? ['dev.to'] : [];
        
        result = await window.electronAPI.getFilteredFeeds(sources);
      }

      if (result.success && result.feeds) {
        setFeeds(result.feeds);
      } else {
        setError(result.error || 'Erro ao carregar feeds');
      }
    } catch (error) {
      console.error('Erro ao carregar feeds:', error);
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const filteredFeeds = feeds.filter(feed => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return feed.title.toLowerCase().includes(searchLower) ||
           feed.description?.toLowerCase().includes(searchLower) ||
           feed.author?.toLowerCase().includes(searchLower) ||
           feed.tags?.some(tag => tag.toLowerCase().includes(searchLower));
  });

  const openFeed = async (url: string) => {
    try {
      await window.electronAPI.openExternalUrl(url);
    } catch (error) {
      console.error('Erro ao abrir URL:', error);
      // Fallback para window.open
      window.open(url, '_blank');
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'hackernews': return '🧡';
      case 'reddit': return '🔴';
      case 'github': return '⚫';
      case 'dev.to': return '💚';
      default: return '📰';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'hackernews': return 'HN';
      case 'reddit': return 'Reddit';
      case 'github': return 'GitHub';
      case 'dev.to': return 'Dev.to';
      default: return source;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="feed-panel-overlay">
      <div className="feed-panel">
        <div className="feed-panel-header">
          <div className="feed-panel-title">
            <span className="title-icon">💡</span>
            <h3>Quadro de Ideias</h3>
            <span className="subtitle">Tendências em Tech</span>
          </div>
          
          <div className="feed-panel-controls">
            <button 
              className={`auto-refresh-btn ${autoRefresh ? 'active' : ''}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Auto-refresh ativo' : 'Auto-refresh inativo'}
            >
              🔄
            </button>
            <button 
              className="refresh-btn"
              onClick={loadFeeds}
              disabled={loading}
              title="Atualizar feeds"
            >
              ↻
            </button>
            <button 
              className="close-btn"
              onClick={onClose}
              title="Fechar painel"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="feed-panel-filters">
          <div className="filter-buttons">
            {[
              { key: 'all', label: 'Todos', icon: '🌟' },
              { key: 'hackernews', label: 'HN', icon: '🧡' },
              { key: 'reddit', label: 'Reddit', icon: '🔴' },
              { key: 'github', label: 'GitHub', icon: '⚫' },
              { key: 'devto', label: 'Dev.to', icon: '💚' }
            ].map(filter => (
              <button
                key={filter.key}
                className={`filter-btn ${activeFilter === filter.key ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.key)}
              >
                <span className="filter-icon">{filter.icon}</span>
                <span className="filter-label">{filter.label}</span>
              </button>
            ))}
          </div>
          
          <div className="search-box">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        <div className="feed-panel-content">
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Carregando feeds...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
              <button onClick={loadFeeds} className="retry-btn">
                Tentar Novamente
              </button>
            </div>
          )}

          {!loading && !error && filteredFeeds.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>Nenhum feed encontrado</p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="clear-search-btn"
                >
                  Limpar busca
                </button>
              )}
            </div>
          )}

          {!loading && !error && filteredFeeds.length > 0 && (
            <div className="feeds-list">
              {filteredFeeds.map(feed => (
                <div 
                  key={feed.id}
                  className="feed-item"
                  onClick={() => openFeed(feed.url)}
                >
                  <div className="feed-item-header">
                    <div className="feed-source">
                      <span className="source-icon">{getSourceIcon(feed.source)}</span>
                      <span className="source-label">{getSourceLabel(feed.source)}</span>
                    </div>
                    <span className="feed-time">{formatTime(feed.timestamp)}</span>
                  </div>
                  
                  <h4 className="feed-title">{feed.title}</h4>
                  
                  {feed.description && (
                    <p className="feed-description">
                      {feed.description.length > 120 
                        ? feed.description.slice(0, 120) + '...' 
                        : feed.description}
                    </p>
                  )}
                  
                  <div className="feed-item-footer">
                    <div className="feed-stats">
                      <span className="score">⭐ {feed.score}</span>
                      <span className="comments">💬 {feed.comments}</span>
                      {feed.author && (
                        <span className="author">👤 {feed.author}</span>
                      )}
                    </div>
                    
                    {feed.tags && feed.tags.length > 0 && (
                      <div className="feed-tags">
                        {feed.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedPanel; 