import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';
import { StorageTest } from '../components/StorageTest';
import { StreamTest } from '../components/StreamTest';
import SyncSettings from '../components/SyncSettings';
import GoogleCalendar from '../components/GoogleCalendar';
import GoogleTasks from '../components/GoogleTasks';
import { GoogleConnectionWidget } from '../components/GoogleConnectionWidget';
import { 
  MdSettings, 
  MdKey, 
  MdSmartToy, 
  MdEmail, 
  MdLink, 
  MdVisibility, 
  MdVisibilityOff, 
  MdWarning, 
  MdScience, 
  MdDelete, 
  MdSync, 
  MdSecurity, 
  MdSpeed, 
  MdClose,
  MdRefresh,
  MdWaves,
  MdBuild,
  MdCalendarToday,
  MdCheckBox
} from 'react-icons/md';
import { SiOpenai, SiGoogle } from 'react-icons/si';
import { RiRobot2Line } from 'react-icons/ri';

interface SettingsPanelProps {
  onClose: () => void;
  onGroqKeySet: (apiKey: string) => void;
  hasGroqKey: boolean;
  onEmailConfigSet: (provider: 'gmail' | 'outlook' | 'custom', email: string, password: string, customConfig?: { host: string; port: number; tls: boolean }) => void;
  hasEmailConfig: boolean;
  onAIConfigSet?: (provider: 'groq' | 'openai' | 'google', apiKey: string, model?: string) => void;
  onAIProviderChange?: (provider: 'groq' | 'openai' | 'google') => void;
  aiConfig?: {
    provider: 'groq' | 'openai' | 'google';
    model?: string;
    hasGroqKey: boolean;
    hasOpenAIKey: boolean;
    hasGoogleKey: boolean;
  };
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  onClose,
  onEmailConfigSet, 
  hasEmailConfig,
  onAIProviderChange,
  aiConfig
}) => {
  const [groqKey, setGroqKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [emailProvider, setEmailProvider] = useState<'gmail' | 'outlook' | 'custom'>('gmail');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [customHost, setCustomHost] = useState('');
  const [customPort, setCustomPort] = useState('993');
  const [customTls, setCustomTls] = useState(true);
  const [showStorageTest, setShowStorageTest] = useState(false);
  const [showStreamTest, setShowStreamTest] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [showGoogleCalendar, setShowGoogleCalendar] = useState(false);
  const [showGoogleTasks, setShowGoogleTasks] = useState(false);
  
  // Estados para inicialização automática
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);
  const [autoLaunchSupported, setAutoLaunchSupported] = useState(false);
  const [autoLaunchLoading, setAutoLaunchLoading] = useState(false);

  // Estados para configuração de IA
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'openai' | 'google'>(aiConfig?.provider || 'groq');
  const [openaiKey, setOpenaiKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(aiConfig?.model || '');
  
  // Modelos disponíveis para cada provedor
  const providerModels = {
    groq: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma-7b-it'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro']
  };

  // Carregar status da inicialização automática
  useEffect(() => {
    const loadAutoLaunchStatus = async () => {
      try {
        const result = await window.electronAPI.getAutoLaunchStatus();
        if (result.success) {
          setAutoLaunchEnabled(result.enabled);
          setAutoLaunchSupported(result.supported);
        }
      } catch (error) {
        console.error('Erro ao carregar status de inicialização automática:', error);
      }
    };
    
    loadAutoLaunchStatus();
  }, []);

  const handleAutoLaunchToggle = async () => {
    setAutoLaunchLoading(true);
    try {
      const result = await window.electronAPI.toggleAutoLaunch();
      if (result.success !== undefined) {
        setAutoLaunchEnabled(result.enabled);
        console.log(`Inicialização automática ${result.enabled ? 'habilitada' : 'desabilitada'}`);
      } else if (result.error) {
        console.error('Erro ao alterar inicialização automática:', result.error);
        alert('Erro ao alterar configuração de inicialização automática: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao alterar inicialização automática:', error);
      alert('Erro ao alterar configuração de inicialização automática');
    } finally {
      setAutoLaunchLoading(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && password.trim()) {
      if (emailProvider === 'custom') {
        if (customHost.trim()) {
          onEmailConfigSet(emailProvider, email.trim(), password.trim(), {
            host: customHost.trim(),
            port: parseInt(customPort),
            tls: customTls
          });
          setEmail('');
          setPassword('');
          setCustomHost('');
          setCustomPort('993');
          setCustomTls(true);
        }
      } else {
        onEmailConfigSet(emailProvider, email.trim(), password.trim());
        setEmail('');
        setPassword('');
      }
    }
  };

  const handleAIProviderConfigSubmit = async (provider: 'groq' | 'openai' | 'google') => {
    let apiKey = '';
    
    switch (provider) {
      case 'groq':
        apiKey = groqKey.trim();
        break;
      case 'openai':
        apiKey = openaiKey.trim();
        break;
      case 'google':
        apiKey = googleKey.trim();
        break;
    }

    if (!apiKey) return;

    try {
      // Configurar chave específica do provedor
      switch (provider) {
        case 'groq':
          await window.electronAPI.setGroqKey(apiKey);
          break;
        case 'openai':
          await window.electronAPI.setOpenAIKey(apiKey);
          break;
        case 'google':
          await window.electronAPI.setGoogleKey(apiKey);
          break;
      }

      // Configurar como provedor ativo se foi configurado com sucesso
      await window.electronAPI.setAIConfig(provider, selectedModel);
      
      // Limpar campo
      switch (provider) {
        case 'groq':
          setGroqKey('');
          break;
        case 'openai':
          setOpenaiKey('');
          break;
        case 'google':
          setGoogleKey('');
          break;
      }

      // Atualizar provedor selecionado
      setSelectedProvider(provider);
      
      // Notificar callback se existir
      if (onAIProviderChange) {
        onAIProviderChange(provider);
      }
    } catch (error) {
      console.error('Erro ao configurar provedor:', error);
    }
  };

  const handleProviderChange = (provider: 'groq' | 'openai' | 'google') => {
    setSelectedProvider(provider);
    // Atualizar modelo padrão para o novo provedor
    const defaultModels = {
      groq: 'llama3-8b-8192',
      openai: 'gpt-4o-mini',
      google: 'gemini-1.5-flash'
    };
    setSelectedModel(defaultModels[provider]);
    
    if (onAIProviderChange) {
      onAIProviderChange(provider);
    }
  };

  const getProviderStatus = (provider: 'groq' | 'openai' | 'google') => {
    if (!aiConfig) return false;
    switch (provider) {
      case 'groq':
        return aiConfig.hasGroqKey;
      case 'openai':
        return aiConfig.hasOpenAIKey;
      case 'google':
        return aiConfig.hasGoogleKey;
      default:
        return false;
    }
  };

  const isActiveProvider = (provider: 'groq' | 'openai' | 'google') => {
    return aiConfig?.provider === provider;
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2><MdSettings /> Configurações</h2>
        <button onClick={onClose} className="close-btn"><MdClose /></button>
      </div>

      <div className="settings-content">
        <div className="setting-section">
          <h3><MdSmartToy /> Configuração de IA</h3>
          <p className="setting-description">
            Escolha seu provedor de IA preferido e configure as chaves de API. 
            Você pode alternar entre diferentes provedores a qualquer momento.
          </p>

          {/* Seletor de Provedor */}
          <div className="ai-provider-selector">
            <h4>Provedor Ativo:</h4>
            <div className="provider-tabs">
              {(['groq', 'openai', 'google'] as const).map((provider) => (
                <button
                  key={provider}
                  onClick={() => handleProviderChange(provider)}
                  className={`provider-tab ${selectedProvider === provider ? 'active' : ''} ${getProviderStatus(provider) ? 'configured' : ''} ${isActiveProvider(provider) ? 'active' : ''}`}
                >
                  <div className="provider-info">
                    <span className="provider-name">
                      {provider === 'groq' && <><RiRobot2Line /> Groq</>}
                      {provider === 'openai' && <><SiOpenai /> OpenAI</>}
                      {provider === 'google' && <><SiGoogle /> Google</>}
                      {isActiveProvider(provider) && ' (ATIVO)'}
                    </span>
                    {getProviderStatus(provider) && <span className="status-indicator">✅</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Configuração de API Key */}
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAIProviderConfigSubmit(selectedProvider);
          }} className="key-form">
            <div className="ai-config-section">
              <h4>
                Chave API {selectedProvider === 'groq' && 'Groq'}
                {selectedProvider === 'openai' && 'OpenAI'}
                {selectedProvider === 'google' && 'Google'}
                {getProviderStatus(selectedProvider) && <span className="status-ok"> ✅ Configurada</span>}
              </h4>
              
              <div className="input-group">
                <input
                  type={
                    (selectedProvider === 'groq' && showKey) ||
                    (selectedProvider === 'openai' && showOpenaiKey) ||
                    (selectedProvider === 'google' && showGoogleKey)
                      ? "text" : "password"
                  }
                  value={
                    selectedProvider === 'groq' ? groqKey :
                    selectedProvider === 'openai' ? openaiKey :
                    googleKey
                  }
                  onChange={(e) => {
                    if (selectedProvider === 'groq') setGroqKey(e.target.value);
                    else if (selectedProvider === 'openai') setOpenaiKey(e.target.value);
                    else setGoogleKey(e.target.value);
                  }}
                  placeholder={`Cole sua chave da API ${selectedProvider === 'groq' ? 'Groq' : selectedProvider === 'openai' ? 'OpenAI' : 'Google'} aqui...`}
                  className="key-input"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (selectedProvider === 'groq') setShowKey(!showKey);
                    else if (selectedProvider === 'openai') setShowOpenaiKey(!showOpenaiKey);
                    else setShowGoogleKey(!showGoogleKey);
                  }}
                  className="toggle-visibility"
                >
{((selectedProvider === 'groq' && showKey) ||
                    (selectedProvider === 'openai' && showOpenaiKey) ||
                    (selectedProvider === 'google' && showGoogleKey)) ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>

              {/* Seletor de Modelo */}
              <div className="input-group" style={{ marginTop: '12px' }}>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="key-input"
                  style={{ maxWidth: '300px' }}
                >
                  <option value="">Modelo padrão</option>
                  {providerModels[selectedProvider].map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                className="save-btn" 
                disabled={
                  (selectedProvider === 'groq' && !groqKey.trim()) ||
                  (selectedProvider === 'openai' && !openaiKey.trim()) ||
                  (selectedProvider === 'google' && !googleKey.trim())
                }
              >
                Salvar Configuração
              </button>
            </div>
          </form>

          <div className="help-text">
            <div className="provider-help">
              {selectedProvider === 'groq' && (
                <>
                  <p><MdKey /> Para obter sua chave Groq:</p>
                  <ol>
                    <li>Acesse <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">console.groq.com</a></li>
                    <li>Faça login ou crie uma conta</li>
                    <li>Vá para "API Keys" e crie uma nova chave</li>
                    <li>Cole a chave aqui</li>
                  </ol>
                </>
              )}
              
              {selectedProvider === 'openai' && (
                <>
                  <p><MdKey /> Para obter sua chave OpenAI:</p>
                  <ol>
                    <li>Acesse <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com</a></li>
                    <li>Faça login em sua conta OpenAI</li>
                    <li>Clique em "Create new secret key"</li>
                    <li>Cole a chave aqui (inicia com sk-)</li>
                  </ol>
                </>
              )}
              
              {selectedProvider === 'google' && (
                <>
                  <p><MdKey /> Para obter sua chave Google:</p>
                  <ol>
                    <li>Acesse <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com</a></li>
                    <li>Faça login com sua conta Google</li>
                    <li>Clique em "Create API key"</li>
                    <li>Cole a chave aqui</li>
                  </ol>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="setting-section">
          <h3>Configuração de E-mail</h3>
          <p className="setting-description">
            Configure sua conta de e-mail para receber resumos e monitoramento.
            {hasEmailConfig && <span className="status-ok"> ✅ Configurado</span>}
          </p>
          
          <form onSubmit={handleEmailSubmit} className="key-form">
            <div className="input-group">
              <select
                value={emailProvider}
                onChange={(e) => setEmailProvider(e.target.value as 'gmail' | 'outlook' | 'custom')}
                className="key-input"
                style={{ maxWidth: '200px' }}
              >
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="custom">Servidor Personalizado</option>
              </select>
            </div>
            
            <div className="input-group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu-email@exemplo.com"
                className="key-input"
              />
            </div>
            
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={emailProvider === 'gmail' ? 'Senha de App do Gmail' : emailProvider === 'outlook' ? 'Sua senha' : 'Senha do servidor'}
                className="key-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-visibility"
              >
{showPassword ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
            </div>
            
            {emailProvider === 'custom' && (
              <>
                <div className="input-group">
                  <input
                    type="text"
                    value={customHost}
                    onChange={(e) => setCustomHost(e.target.value)}
                    placeholder="mail.seudominio.com"
                    className="key-input"
                  />
                </div>
                
                <div className="input-group">
                  <input
                    type="number"
                    value={customPort}
                    onChange={(e) => setCustomPort(e.target.value)}
                    placeholder="993"
                    className="key-input"
                    style={{ maxWidth: '100px' }}
                  />
                  <label style={{ margin: '0 16px', display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={customTls}
                      onChange={(e) => setCustomTls(e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    Usar TLS/SSL
                  </label>
                </div>
              </>
            )}
            
            <button type="submit" className="save-btn" disabled={!email.trim() || !password.trim() || (emailProvider === 'custom' && !customHost.trim())}>
              Configurar {emailProvider === 'gmail' ? 'Gmail' : emailProvider === 'outlook' ? 'Outlook' : 'Servidor Personalizado'}
            </button>
          </form>

          <div className="help-text">
            <p><MdEmail /> Como configurar:</p>
            {emailProvider === 'gmail' ? (
              <ol>
                <li>Ative a verificação em 2 etapas na sua conta Google</li>
                <li>Acesse <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">Senhas de app</a></li>
                <li>Gere uma nova senha de app para "Mail"</li>
                <li>Use essa senha de app aqui (não sua senha normal)</li>
              </ol>
            ) : emailProvider === 'outlook' ? (
              <ol>
                <li>Use seu e-mail e senha normais do Outlook/Hotmail</li>
                <li>Certifique-se que IMAP está habilitado</li>
                <li>Se tiver 2FA, pode precisar de uma senha de app</li>
              </ol>
            ) : (
              <ol>
                <li>Configure o endereço do servidor IMAP (ex: mail.seudominio.com)</li>
                <li>Defina a porta (normalmente 993 para TLS ou 143 para não-TLS)</li>
                <li>Marque "Usar TLS/SSL" se seu servidor suportar (recomendado)</li>
                <li>Use suas credenciais de email normais</li>
                <li>Consulte seu provedor de email para configurações específicas</li>
              </ol>
            )}
          </div>
        </div>

        <div className="setting-section">
          <h3>Sincronização entre Dispositivos</h3>
          <p className="setting-description">
                            Configure a sincronização automática e segura dos seus dados entre diferentes dispositivos usando Google Drive. 
            Seus dados são criptografados antes de serem enviados para a nuvem.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setShowSyncSettings(true)}
              className="save-btn"
            >
<MdSync /> Configurar Sincronização
            </button>
            <span className="setting-description" style={{ margin: 0, fontSize: '12px', color: '#667eea' }}>
<MdSecurity /> Criptografia AES-256 • <MdRefresh /> Multi-dispositivo • <MdSpeed /> Resolução automática de conflitos
            </span>
          </div>
        </div>

        <div className="setting-section">
          <h3>Inicialização Automática</h3>
          <p className="setting-description">
            Configure o Duckduki para iniciar automaticamente quando o computador ligar.
            {autoLaunchEnabled && <span className="status-ok"> ✅ Habilitada</span>}
{!autoLaunchSupported && <span className="status-warning"> <MdWarning /> Não suportado neste sistema</span>}
          </p>
          
          <div className="auto-launch-controls">
            <button 
              onClick={handleAutoLaunchToggle}
              className={autoLaunchEnabled ? "danger-btn" : "save-btn"}
              disabled={!autoLaunchSupported || autoLaunchLoading}
              style={{ minWidth: '200px' }}
            >
{autoLaunchLoading ? 'Processando...' : 
               autoLaunchEnabled ? 'Desabilitar Inicialização' : 'Habilitar Inicialização'}
            </button>
          </div>

          <div className="help-text">
            <p><MdBuild /> Como funciona:</p>
            <ul>
              <li><strong>Windows:</strong> Adiciona entrada no registro do sistema</li>
              <li><strong>macOS:</strong> Configura item de login automático</li>
              <li><strong>Linux:</strong> Cria arquivo .desktop no autostart</li>
            </ul>
            <p>O app iniciará minimizado no tray quando o computador ligar.</p>
          </div>
        </div>

        <div className="setting-section">
          <h3>Diagnóstico do Sistema</h3>
          <p className="setting-description">
            Teste o sistema de armazenamento e comunicação da IA para identificar problemas.
          </p>
          <button 
            onClick={() => setShowStorageTest(true)}
            className="save-btn"
            style={{ marginRight: '12px' }}
          >
<MdScience /> Testar Armazenamento
          </button>
          <button 
            onClick={() => setShowStreamTest(true)}
            className="save-btn"
          >
<MdWaves /> Testar Streaming IA
          </button>
        </div>

        <div className="setting-section">
          <h3>Dados e Privacidade</h3>
          <p className="setting-description">
            Gerencie seus dados armazenados localmente.
          </p>
          <button className="danger-btn">
<MdDelete /> Limpar Todos os Dados
          </button>
        </div>

        <div className="setting-section">
          <h3><MdLink /> Google Services</h3>
          <p className="setting-description">
            Conecte-se uma vez ao Google para acessar Calendar, Tasks e sincronização via Drive.
            Um único login dá acesso a todos os serviços integrados.
          </p>
          
          <GoogleConnectionWidget
            onOpenCalendar={() => setShowGoogleCalendar(true)}
            onOpenTasks={() => setShowGoogleTasks(true)}
            onOpenSync={() => setShowSyncSettings(true)}
          />
        </div>

        <div className="setting-section">
          <h3>Sobre</h3>
          <p className="setting-description">
            Duckduki v2.0.0<br/>
            Assistente inteligente com IA generativa
          </p>
        </div>
      </div>
      
      {showSyncSettings && (
        <div className="sync-modal-overlay">
          <div className="sync-modal">
            <div className="sync-modal-header">
              <h3><MdSync /> Configurações de Sincronização</h3>
              <button 
                onClick={() => setShowSyncSettings(false)}
                className="sync-modal-close"
                title="Fechar"
              >
<MdClose />
              </button>
            </div>
            
            <div className="sync-modal-content">
              <SyncSettings />
            </div>
          </div>
        </div>
      )}

      {showStorageTest && (
        <StorageTest onClose={() => setShowStorageTest(false)} />
      )}
      
      {showStreamTest && (
        <div className="storage-test-overlay">
          <div className="storage-test-modal">
            <div className="storage-test-header">
              <h2><MdWaves /> Teste de Streaming IA</h2>
              <button onClick={() => setShowStreamTest(false)} className="close-btn"><MdClose /></button>
            </div>
            <StreamTest />
          </div>
        </div>
      )}

      {showGoogleCalendar && (
        <div className="storage-test-overlay">
          <div className="storage-test-modal" style={{ maxWidth: '1200px', width: '95vw', height: '90vh' }}>
            <div className="storage-test-header">
              <h2><MdCalendarToday /> Google Calendar</h2>
              <button onClick={() => setShowGoogleCalendar(false)} className="close-btn"><MdClose /></button>
            </div>
            <div style={{ height: 'calc(100% - 60px)', overflow: 'auto', padding: '20px' }}>
              <GoogleCalendar />
            </div>
          </div>
        </div>
      )}

      {showGoogleTasks && (
        <div className="storage-test-overlay">
          <div className="storage-test-modal" style={{ maxWidth: '1000px', width: '95vw', height: '90vh' }}>
            <div className="storage-test-header">
              <h2><MdCheckBox /> Google Tasks</h2>
              <button onClick={() => setShowGoogleTasks(false)} className="close-btn"><MdClose /></button>
            </div>
            <div style={{ height: 'calc(100% - 60px)', overflow: 'auto', padding: '20px' }}>
              <GoogleTasks />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel; 