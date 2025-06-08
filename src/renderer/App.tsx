import React, { useState, useEffect } from 'react';
import SettingsPanel from './settings/SettingsPanel';
import { ThemeProvider } from './contexts/ThemeContext';
import { SpotlightMode } from './components/SpotlightMode';
import { FullscreenMode } from './components/FullscreenMode';
import './App.css';
import './themes.css';

interface SystemStatus {
  cpu: number;
  memory: number;
  activeApp: {
    name: string;
    title: string;
    pid: number;
  } | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Suggestion {
  id: string;
  type: 'command' | 'email' | 'code' | 'contextual';
  title: string;
  content: string;
  timestamp: number;
  actionable?: boolean;
  isUserMessage?: boolean;
}

const App: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedPanel, setShowFeedPanel] = useState(false);
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);
  const [hasGroqKey, setHasGroqKey] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    checkGroqKey();
    checkEmailConfig();
    checkFullscreenStatus();
    
    // Detectar quando a janela é mostrada e forçar desativação do fullscreen
    const handleWindowShow = () => {
      console.log('🎯 Janela foi mostrada - forçando modo spotlight');
      forceSpotlightMode();
    };

    // Listener para quando a janela fica visível
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🎯 Janela ficou visível - forçando modo spotlight');
        forceSpotlightMode();
      }
    };

    // Adicionar listeners
    window.addEventListener('focus', handleWindowShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.electronAPI.removeAllListeners('contextual-suggestion'); // Limpar qualquer listener restante
      window.removeEventListener('focus', handleWindowShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Função para forçar o modo spotlight sempre que a janela for aberta
  const forceSpotlightMode = async () => {
    try {
      console.log('🎯 Forçando modo spotlight via nova API');
      // Usar a nova API específica para forçar modo spotlight
      const result = await window.electronAPI.forceSpotlightMode();
      
      if (result.success) {
        setIsFullscreen(false);
        console.log('✅ Modo spotlight forçado com sucesso');
      } else {
        console.error('❌ Falha ao forçar modo spotlight:', result.error);
        // Fallback: tentar o método antigo
        const currentStatus = await window.electronAPI.getFullscreenStatus();
        if (currentStatus.success && currentStatus.isFullScreen) {
          const toggleResult = await window.electronAPI.toggleFullscreen();
          if (toggleResult.success) {
            setIsFullscreen(false);
          }
        } else {
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao forçar modo spotlight:', error);
      // Em caso de erro, garantir que está no modo spotlight
      setIsFullscreen(false);
    }
  };

  const checkGroqKey = async () => {
    try {
      const result = await window.electronAPI.hasGroqKey();
      setHasGroqKey(result.hasKey);
    } catch (error) {
      console.error('Erro ao verificar chave Groq:', error);
    }
  };

  const checkEmailConfig = async () => {
    try {
      const result = await window.electronAPI.hasEmailConfig();
      setHasEmailConfig(result.hasConfig);
    } catch (error) {
      console.error('Erro ao verificar configuração de email:', error);
    }
  };

  const checkFullscreenStatus = async () => {
    try {
      const result = await window.electronAPI.getFullscreenStatus();
      if (result.success) {
        setIsFullscreen(result.isFullScreen);
      }
    } catch (error) {
      console.error('Erro ao verificar status fullscreen:', error);
    }
  };

  const toggleFullscreen = async () => {
    try {
      const result = await window.electronAPI.toggleFullscreen();
      if (result.success) {
        setIsFullscreen(result.isFullScreen);
      }
    } catch (error) {
      console.error('Erro ao alternar tela inteira:', error);
    }
  };

  const handleGroqKeySet = async (apiKey: string) => {
    try {
      const result = await window.electronAPI.setGroqKey(apiKey);
      if (result.success) {
        setHasGroqKey(true);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erro ao configurar chave:', error);
    }
  };

  const handleEmailConfigSet = async (provider: 'gmail' | 'outlook' | 'custom', email: string, password: string, customConfig?: { host: string; port: number; tls: boolean }) => {
    try {
      let result;
      if (provider === 'gmail') {
        result = await window.electronAPI.configureGmail(email, password);
      } else if (provider === 'outlook') {
        result = await window.electronAPI.configureOutlook(email, password);
      } else if (provider === 'custom' && customConfig) {
        result = await window.electronAPI.setEmailConfig({
          user: email,
          password: password,
          host: customConfig.host,
          port: customConfig.port,
          tls: customConfig.tls
        });
      } else {
        throw new Error('Configuração inválida');
      }
      
      if (result.success) {
        setHasEmailConfig(true);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erro ao configurar email:', error);
    }
  };

  if (showSettings) {
    return (
      <SettingsPanel
        onClose={() => setShowSettings(false)}
        onGroqKeySet={handleGroqKeySet}
        hasGroqKey={hasGroqKey}
        onEmailConfigSet={handleEmailConfigSet}
        hasEmailConfig={hasEmailConfig}
      />
    );
  }

  // Função para lidar com comandos do spotlight
  const handleSpotlightCommand = async (command: string) => {
    if (!hasGroqKey) {
      return;
    }

    // Lógica de processamento de comando pode ser expandida aqui
    // Por enquanto, vamos apenas logar o comando
    console.log('Comando enviado:', command);
    
    // Você pode integrar com o sistema de chat existente se necessário
    try {
      // Processar comando via IA
      const result = await window.electronAPI.processCommand(command);
      console.log('Resposta da IA:', result);
    } catch (error) {
      console.error('Erro ao processar comando:', error);
    }
  };

  return (
    <ThemeProvider>
      <div className={`app theme-transition ${isFullscreen ? 'fullscreen' : ''}`}>
        {isFullscreen ? (
          <FullscreenMode
            showFeedPanel={showFeedPanel}
            showTaskManager={showTaskManager}
            showKnowledgePanel={showKnowledgePanel}
            hasGroqKey={hasGroqKey}
            onSetShowFeedPanel={setShowFeedPanel}
            onSetShowTaskManager={setShowTaskManager}
            onSetShowKnowledgePanel={setShowKnowledgePanel}
            onShowSettings={() => setShowSettings(true)}
            onFullscreenChange={setIsFullscreen}
          />
        ) : (
          <SpotlightMode
            onOpenFeed={() => {setShowFeedPanel(true); toggleFullscreen()}}
            onOpenTasks={() => {setShowTaskManager(true); toggleFullscreen()}}
            onOpenKnowledge={() => {setShowKnowledgePanel(true); toggleFullscreen()}}
            onOpenSettings={() => {setShowSettings(true); toggleFullscreen()}}
            onToggleFullscreen={() => {
              // Simular o toggle do fullscreen
              window.electronAPI.toggleFullscreen().then((result) => {
                if (result.success) {
                  setIsFullscreen(result.isFullScreen);
                }
              });
            }}
            onSendCommand={handleSpotlightCommand}
            hasGroqKey={hasGroqKey}
          />
        )}
      </div>
    </ThemeProvider>
  );
};

export default App; 