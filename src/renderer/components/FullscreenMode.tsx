import React from 'react';
import { FullscreenButton } from './FullscreenButton';
import { ThemeToggle } from './ThemeToggle';
import FeedPanel from '../widgets/FeedPanel';
import TaskManager from '../widgets/TaskManager';
import KnowledgePanel from '../widgets/KnowledgePanel';
import { AIChat } from './AIChat';
import { 
  MdLightbulb, 
  MdAnalytics, 
  MdChecklist, 
  MdMemory, 
  MdSettings 
} from 'react-icons/md';

interface FullscreenModeProps {
  showFeedPanel: boolean;
  showTaskManager: boolean;
  showKnowledgePanel: boolean;
  hasGroqKey: boolean;
  darkMode: boolean;
  onSetShowFeedPanel: (show: boolean) => void;
  onSetShowTaskManager: (show: boolean) => void;
  onSetShowKnowledgePanel: (show: boolean) => void;
  onShowSettings: () => void;
  onFullscreenChange: (isFullscreen: boolean) => void;
  onToggleDarkMode: () => void;
  onToggleFullscreen: () => void;
  onOpenFeed: () => void;
  onOpenTasks: () => void;
  onOpenKnowledge: () => void;
  onOpenSettings: () => void;
}

export const FullscreenMode: React.FC<FullscreenModeProps> = ({
  showFeedPanel,
  showTaskManager,
  showKnowledgePanel,
  hasGroqKey,
  darkMode,
  onSetShowFeedPanel,
  onSetShowTaskManager,
  onSetShowKnowledgePanel,
  onShowSettings,
  onFullscreenChange,
  onToggleDarkMode,
  onToggleFullscreen,
  onOpenFeed,
  onOpenTasks,
  onOpenKnowledge,
  onOpenSettings
}) => {
  const handleAIChat = async (message: string) => {
    try {
      const result = await window.electronAPI.processCommand(message);
      if (result.success) {
        return result.response;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      throw new Error(`Erro ao processar comando: ${error}`);
    }
  };

  return (
    <>
      <div className="app-header">
        <div className="header-title">
          <img 
            src="/assets/icon.png" 
            alt="Duckduki" 
            className="app-logo"
            onError={(e) => {
              // Fallback se a imagem não carregar
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className = 'app-logo app-logo-fallback';
                fallback.textContent = '🦆';
                parent.appendChild(fallback);
              }
            }}
          />
          <div className="title-content">
            <h1>Duckduki</h1>
            <div className={`status-indicator ${hasGroqKey ? 'active' : 'inactive'}`}>
              <MdLightbulb />
              IA {hasGroqKey ? 'Ativa' : 'Inativa'}
            </div>
          </div>
        </div>
        <div className="header-controls">
          <div className="control-group">
            <span className="control-group-label">Painéis</span>
            <button 
              className="feed-panel-btn"
              onClick={() => onSetShowFeedPanel(true)}
              title="Quadro de Ideias - Tendências Tech"
            >
              <MdAnalytics />
            </button>
            <button 
              className="task-manager-btn"
              onClick={() => onSetShowTaskManager(true)}
              title="Organizador de Tarefas com IA"
            >
              <MdChecklist />
            </button>
            <button 
              className="knowledge-panel-btn"
              onClick={() => onSetShowKnowledgePanel(true)}
              title="Repositório de Conhecimento"
            >
              <MdMemory />
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
            <MdSettings />
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
            <div className="welcome-icon"><MdSettings /></div>
            <h2>Configure sua IA</h2>
            <p>Para usar o chat e as ferramentas de IA, configure uma chave de API nas configurações.</p>
            <button className="setup-btn" onClick={onShowSettings}>
              Abrir Configurações
            </button>
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