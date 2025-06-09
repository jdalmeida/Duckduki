import React, { useState, useEffect } from 'react';
import SettingsPanel from './settings/SettingsPanel';
import { ThemeProvider } from './contexts/ThemeContext';
import { SpotlightMode } from './components/SpotlightMode';
import { FullscreenMode } from './components/FullscreenMode';
import './App.css';
import './themes.css';

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
    
    // Polling periódico para sincronizar estado fullscreen (especialmente importante no Windows)
    const fullscreenSyncInterval = setInterval(() => {
      checkFullscreenStatus();
    }, 1000); // Verificar a cada segundo
    
    // Detectar quando a janela é mostrada, mas apenas forçar modo spotlight
    // se não estava em fullscreen antes
    const handleWindowShow = async () => {
      try {
        const status = await window.electronAPI.getFullscreenStatus();
        if (status.success && !status.isFullScreen) {
          console.log('🎯 Janela foi mostrada e não está em fullscreen - forçando modo spotlight');
          forceSpotlightMode();
        } else {
          console.log('🖥️ Janela foi mostrada em fullscreen - mantendo estado atual');
        }
      } catch (error) {
        console.error('❌ Erro ao verificar status ao focar janela:', error);
      }
    };

    // Listener para quando a janela fica visível
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        try {
          const status = await window.electronAPI.getFullscreenStatus();
          if (status.success && !status.isFullScreen) {
            console.log('🎯 Janela ficou visível e não está em fullscreen - forçando modo spotlight');
            forceSpotlightMode();
          } else {
            console.log('🖥️ Janela ficou visível em fullscreen - mantendo estado atual');
          }
        } catch (error) {
          console.error('❌ Erro ao verificar status ao tornar visível:', error);
        }
      }
    };

    // Adicionar listeners
    window.addEventListener('focus', handleWindowShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(fullscreenSyncInterval);
      window.electronAPI.removeAllListeners('contextual-suggestion'); // Limpar qualquer listener restante
      window.removeEventListener('focus', handleWindowShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Função para forçar o modo spotlight apenas quando necessário
  const forceSpotlightMode = async () => {
    try {
      // Primeiro, verificar se realmente precisa forçar
      const currentStatus = await window.electronAPI.getFullscreenStatus();
      if (currentStatus.success && !currentStatus.isFullScreen) {
        console.log('🎯 Já está em modo janela, não é necessário forçar spotlight');
        setIsFullscreen(false);
        return;
      }
      
      console.log('🎯 Forçando modo spotlight via nova API');
      // Usar a nova API específica para forçar modo spotlight
      const result = await window.electronAPI.forceSpotlightMode();
      
      if (result.success) {
        setIsFullscreen(false);
        console.log('✅ Modo spotlight forçado com sucesso');
      } else {
        console.error('❌ Falha ao forçar modo spotlight:', result.error);
      }
    } catch (error) {
      console.error('❌ Erro ao forçar modo spotlight:', error);
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
        console.log(`🔍 Status fullscreen verificado: ${result.isFullScreen}`);
        setIsFullscreen(result.isFullScreen);
      }
    } catch (error) {
      console.error('Erro ao verificar status fullscreen:', error);
    }
  };

  const toggleFullscreen = async () => {
    try {
      console.log(`🔄 Alternando fullscreen - estado atual: ${isFullscreen}`);
      const result = await window.electronAPI.toggleFullscreen();
      if (result.success) {
        console.log(`✅ Fullscreen alternado com sucesso - novo estado: ${result.isFullScreen}`);
        setIsFullscreen(result.isFullScreen);
      } else {
        console.error('❌ Falha ao alternar fullscreen:', result.error);
      }
    } catch (error) {
      console.error('❌ Erro ao alternar tela inteira:', error);
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
            onToggleFullscreen={toggleFullscreen}
            onSendCommand={handleSpotlightCommand}
            hasGroqKey={hasGroqKey}
          />
        )}
      </div>
    </ThemeProvider>
  );
};

export default App; 