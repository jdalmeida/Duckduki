import React from 'react';
import { FullscreenButton } from './FullscreenButton';
import { ThemeToggle } from './ThemeToggle';
import FeedPanel from '../widgets/FeedPanel';
import TaskManager from '../widgets/TaskManager';
import KnowledgePanel from '../widgets/KnowledgePanel';
import { AIChat } from './AIChat';

interface FullscreenModeProps {
  showFeedPanel: boolean;
  showTaskManager: boolean;
  showKnowledgePanel: boolean;
  hasGroqKey: boolean;
  onSetShowFeedPanel: (show: boolean) => void;
  onSetShowTaskManager: (show: boolean) => void;
  onSetShowKnowledgePanel: (show: boolean) => void;
  onShowSettings: () => void;
  onFullscreenChange: (isFullscreen: boolean) => void;
}

export const FullscreenMode: React.FC<FullscreenModeProps> = ({
  showFeedPanel,
  showTaskManager,
  showKnowledgePanel,
  hasGroqKey,
  onSetShowFeedPanel,
  onSetShowTaskManager,
  onSetShowKnowledgePanel,
  onShowSettings,
  onFullscreenChange
}) => {
  return (
    <>
      <div className="app-header">
        <div className="header-title">
          <h1>Duckduki</h1>
          <span className={`status-indicator ${hasGroqKey ? 'active' : 'inactive'}`}>
            {hasGroqKey ? '🟢 Ativo' : '🔴 Configure API'}
          </span>
        </div>
        <div className="header-controls">
          <div className="control-group">
            <span className="control-group-label">Painéis</span>
            <button 
              className="feed-panel-btn"
              onClick={() => onSetShowFeedPanel(true)}
              title="Quadro de Ideias - Tendências Tech"
            >
              💡
            </button>
            <button 
              className="task-manager-btn"
              onClick={() => onSetShowTaskManager(true)}
              title="Organizador de Tarefas com IA"
            >
              📋
            </button>
            <button 
              className="knowledge-panel-btn"
              onClick={() => onSetShowKnowledgePanel(true)}
              title="Repositório de Conhecimento"
            >
              🧠
            </button>
          </div>
          
          <div className="control-group">
            <span className="control-group-label">Exibição</span>
            <FullscreenButton onFullscreenChange={onFullscreenChange} />
            <ThemeToggle />
          </div>
          
          <button 
            className="settings-btn"
            onClick={onShowSettings}
            title="Configurações"
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="suggestions-container">
        <div className="suggestions-header">
          <h3>Chat Principal</h3>
        </div>

        {hasGroqKey ? (
          <div className="chat-main-container">
            <AIChat 
              isVisible={true}
              onClose={() => {}}
            />
          </div>
        ) : (
          <div className="setup-required-main">
            <div className="welcome-icon">🦆</div>
            <h2>Bem-vindo ao Duckduki!</h2>
            <p>Seu assistente de produtividade inteligente</p>
            <div className="setup-required">
              <p>⚙️ Configure sua chave Groq para começar</p>
              <button 
                className="setup-btn"
                onClick={onShowSettings}
              >
                Configurar Agora
              </button>
            </div>
          </div>
        )}
      </div>
      
      <FeedPanel 
        isVisible={showFeedPanel}
        onClose={() => onSetShowFeedPanel(false)}
      />

      <TaskManager 
        isVisible={showTaskManager}
        onClose={() => onSetShowTaskManager(false)}
      />

      <KnowledgePanel
        isVisible={showKnowledgePanel}
        onClose={() => onSetShowKnowledgePanel(false)}
      />
    </>
  );
}; 