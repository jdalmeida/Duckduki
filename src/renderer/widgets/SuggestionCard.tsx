import React, { useState } from 'react';
import './SuggestionCard.css';

interface Suggestion {
  id: string;
  type: 'command' | 'email' | 'code' | 'contextual';
  title: string;
  content: string;
  timestamp: number;
  actionable?: boolean;
  isUserMessage?: boolean;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // < 1 minuto
      return 'agora mesmo';
    } else if (diff < 3600000) { // < 1 hora
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m atrás`;
    } else if (diff < 86400000) { // < 1 dia
      const hours = Math.floor(diff / 3600000);
      return `${hours}h atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return '📧';
      case 'code': return '💻';
      case 'contextual': return '💡';
      default: return '🤖';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return '#3182ce';
      case 'code': return '#38a169';
      case 'contextual': return '#ed8936';
      default: return '#667eea';
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(suggestion.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const isLongContent = suggestion.content.length > 200;
  const displayContent = isExpanded || !isLongContent 
    ? suggestion.content 
    : suggestion.content.substring(0, 200) + '...';

  return (
    <div className={`suggestion-card ${suggestion.type} ${suggestion.isUserMessage ? 'user-message' : ''}`}>
      <div className="card-header">
        <div className="header-left">
          <span 
            className="type-icon"
            style={{ backgroundColor: `${getTypeColor(suggestion.type)}20` }}
          >
            {getTypeIcon(suggestion.type)}
          </span>
          <div className="header-text">
            <h4 className="card-title">{suggestion.title}</h4>
            <span className="card-time">{formatTime(suggestion.timestamp)}</span>
          </div>
        </div>
        <div className="header-actions">
          <button
            onClick={copyToClipboard}
            className="action-btn copy-btn"
            title={copied ? "Copiado!" : "Copiar para área de transferência"}
          >
            {copied ? '✅' : '📋'}
          </button>
        </div>
      </div>

      <div className="card-content">
        <p className="content-text">{displayContent}</p>
        
        {isLongContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="expand-btn"
          >
            {isExpanded ? 'Ver menos' : 'Ver mais'}
          </button>
        )}
      </div>

      {suggestion.actionable && (
        <div className="card-actions">
          <button className="action-btn primary">
            Aplicar Sugestão
          </button>
          <button className="action-btn secondary">
            Mais Detalhes
          </button>
        </div>
      )}
    </div>
  );
};

export default SuggestionCard; 