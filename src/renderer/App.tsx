import React, { useState, useEffect } from 'react';
import CommandInput from './widgets/CommandInput';
import SuggestionCard from './widgets/SuggestionCard';
import ResourceIndicator from './widgets/ResourceIndicator';
import SettingsPanel from './settings/SettingsPanel';
import './App.css';

interface SystemStatus {
  cpu: number;
  memory: number;
  activeApp: {
    name: string;
    title: string;
    pid: number;
  } | null;
}

interface Suggestion {
  id: string;
  type: 'command' | 'email' | 'code' | 'contextual';
  title: string;
  content: string;
  timestamp: number;
  actionable?: boolean;
}

const App: React.FC = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hasGroqKey, setHasGroqKey] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkGroqKey();
    checkEmailConfig();
    loadSystemStatus();
    
    // Listener para sugestões contextuais - DESABILITADO (spam removido)
    // window.electronAPI.onContextualSuggestion((suggestion) => {
    //   addSuggestion({
    //     id: Date.now().toString(),
    //     type: 'contextual',
    //     title: 'Sugestão Contextual',
    //     content: suggestion.suggestion,
    //     timestamp: Date.now(),
    //     actionable: true
    //   });
    // });

    // Atualizar status do sistema a cada 10 segundos
    const interval = setInterval(loadSystemStatus, 10000);

    return () => {
      clearInterval(interval);
      window.electronAPI.removeAllListeners('contextual-suggestion'); // Limpar qualquer listener restante
    };
  }, []);

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

  const loadSystemStatus = async () => {
    try {
      const result = await window.electronAPI.getSystemStatus();
      if (result.success) {
        setSystemStatus(result.status);
      }
    } catch (error) {
      console.error('Erro ao carregar status do sistema:', error);
    }
  };

  const addSuggestion = (suggestion: Suggestion) => {
    setSuggestions(prev => [suggestion, ...prev.slice(0, 9)]); // Manter apenas 10
  };

  const handleCommand = async (command: string) => {
    if (!hasGroqKey) {
      addSuggestion({
        id: Date.now().toString(),
        type: 'command',
        title: 'Configuração Necessária',
        content: 'Configure sua chave da API Groq nas configurações primeiro.',
        timestamp: Date.now()
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Processar comandos especiais
      if (command.toLowerCase().includes('resumo') && command.toLowerCase().includes('email')) {
        const result = await window.electronAPI.getEmailSummary();
        addSuggestion({
          id: Date.now().toString(),
          type: 'email',
          title: 'Resumo de E-mails',
          content: result.success ? result.summary : result.error,
          timestamp: Date.now()
        });
      } else if (command.toLowerCase().includes('analisar') && command.toLowerCase().includes('código')) {
        const result = await window.electronAPI.analyzeCurrentCode();
        addSuggestion({
          id: Date.now().toString(),
          type: 'code',
          title: 'Análise de Código',
          content: result.success ? result.analysis : result.error,
          timestamp: Date.now()
        });
      } else if (command.toLowerCase().includes('build') || command.toLowerCase().includes('compilar')) {
        const result = await window.electronAPI.runBuild();
        addSuggestion({
          id: Date.now().toString(),
          type: 'command',
          title: 'Resultado do Build',
          content: result.success ? result.result.output : result.error,
          timestamp: Date.now()
        });
      } else {
        // Comando genérico
        const result = await window.electronAPI.processCommand(command);
        addSuggestion({
          id: Date.now().toString(),
          type: 'command',
          title: 'Resposta do Duckduki',
          content: result.success ? result.response : result.error,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      addSuggestion({
        id: Date.now().toString(),
        type: 'command',
        title: 'Erro',
        content: `Erro ao processar comando: ${error.message}`,
        timestamp: Date.now()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroqKeySet = async (apiKey: string) => {
    try {
      const result = await window.electronAPI.setGroqKey(apiKey);
      if (result.success) {
        setHasGroqKey(true);
        addSuggestion({
          id: Date.now().toString(),
          type: 'command',
          title: 'Configuração',
          content: 'Chave Groq configurada com sucesso!',
          timestamp: Date.now()
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      addSuggestion({
        id: Date.now().toString(),
        type: 'command',
        title: 'Erro',
        content: `Erro ao configurar chave: ${error.message}`,
        timestamp: Date.now()
      });
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
        addSuggestion({
          id: Date.now().toString(),
          type: 'command',
          title: 'Configuração',
          content: `${provider === 'gmail' ? 'Gmail' : provider === 'outlook' ? 'Outlook' : 'Servidor personalizado'} configurado com sucesso!`,
          timestamp: Date.now()
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      addSuggestion({
        id: Date.now().toString(),
        type: 'command',
        title: 'Erro',
        content: `Erro ao configurar email: ${error.message}`,
        timestamp: Date.now()
      });
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
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

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-title">
          <h1>Duckduki</h1>
          <span className={`status-indicator ${hasGroqKey ? 'active' : 'inactive'}`}>
            {hasGroqKey ? '🟢 Ativo' : '🔴 Configure API'}
          </span>
        </div>
        <button 
          className="settings-btn"
          onClick={() => setShowSettings(true)}
          title="Configurações"
        >
          ⚙️
        </button>
      </div>

      <ResourceIndicator status={systemStatus} />

      <CommandInput 
        onCommand={handleCommand}
        isLoading={isLoading}
        disabled={!hasGroqKey}
      />

      <div className="suggestions-container">
        <div className="suggestions-header">
          <h3>Sugestões e Respostas</h3>
          {suggestions.length > 0 && (
            <button 
              className="clear-btn"
              onClick={clearSuggestions}
              title="Limpar histórico"
            >
              🗑️
            </button>
          )}
        </div>

        <div className="suggestions-list">
          {suggestions.length === 0 ? (
            <div className="empty-state">
              <p>👋 Olá! Como posso ajudar hoje?</p>
              <div className="quick-actions">
                <button onClick={() => handleCommand('resumo dos emails')}>
                  📧 Resumir E-mails
                </button>
                <button onClick={() => handleCommand('analisar código atual')}>
                  💻 Analisar Código
                </button>
                <button onClick={() => handleCommand('executar build')}>
                  🔨 Executar Build
                </button>
              </div>
            </div>
          ) : (
            suggestions.map(suggestion => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default App; 