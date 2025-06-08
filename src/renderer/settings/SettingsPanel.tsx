import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';
import { StorageTest } from '../components/StorageTest';
import { StreamTest } from '../components/StreamTest';

interface SettingsPanelProps {
  onClose: () => void;
  onGroqKeySet: (apiKey: string) => void;
  hasGroqKey: boolean;
  onEmailConfigSet: (provider: 'gmail' | 'outlook' | 'custom', email: string, password: string, customConfig?: { host: string; port: number; tls: boolean }) => void;
  hasEmailConfig: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onGroqKeySet, hasGroqKey, onEmailConfigSet, hasEmailConfig }) => {
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
  
  // Estados para inicialização automática
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);
  const [autoLaunchSupported, setAutoLaunchSupported] = useState(false);
  const [autoLaunchLoading, setAutoLaunchLoading] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (groqKey.trim()) {
      onGroqKeySet(groqKey.trim());
      setGroqKey('');
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

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Configurações</h2>
        <button onClick={onClose} className="close-btn">✕</button>
      </div>

      <div className="settings-content">
        <div className="setting-section">
          <h3>Chave API Groq</h3>
          <p className="setting-description">
            Configure sua chave da API Groq para habilitar o assistente IA.
            {hasGroqKey && <span className="status-ok"> ✅ Configurada</span>}
          </p>
          
          <form onSubmit={handleSubmit} className="key-form">
            <div className="input-group">
              <input
                type={showKey ? "text" : "password"}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="Cole sua chave da API Groq aqui..."
                className="key-input"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="toggle-visibility"
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            <button type="submit" className="save-btn" disabled={!groqKey.trim()}>
              Salvar Chave
            </button>
          </form>

          <div className="help-text">
            <p>📖 Para obter sua chave:</p>
            <ol>
              <li>Acesse <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">console.groq.com</a></li>
              <li>Faça login ou crie uma conta</li>
              <li>Vá para "API Keys" e crie uma nova chave</li>
              <li>Cole a chave aqui</li>
            </ol>
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
                {showPassword ? '🙈' : '👁️'}
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
            <p>📧 Como configurar:</p>
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
          <h3>Inicialização Automática</h3>
          <p className="setting-description">
            Configure o Duckduki para iniciar automaticamente quando o computador ligar.
            {autoLaunchEnabled && <span className="status-ok"> ✅ Habilitada</span>}
            {!autoLaunchSupported && <span className="status-warning"> ⚠️ Não suportado neste sistema</span>}
          </p>
          
          <div className="auto-launch-controls">
            <button 
              onClick={handleAutoLaunchToggle}
              className={autoLaunchEnabled ? "danger-btn" : "save-btn"}
              disabled={!autoLaunchSupported || autoLaunchLoading}
              style={{ minWidth: '200px' }}
            >
              {autoLaunchLoading ? '⏳ Processando...' : 
               autoLaunchEnabled ? '🚫 Desabilitar Inicialização' : '🚀 Habilitar Inicialização'}
            </button>
          </div>

          <div className="help-text">
            <p>🔧 Como funciona:</p>
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
            🧪 Testar Armazenamento
          </button>
          <button 
            onClick={() => setShowStreamTest(true)}
            className="save-btn"
          >
            🌊 Testar Streaming IA
          </button>
        </div>

        <div className="setting-section">
          <h3>Dados e Privacidade</h3>
          <p className="setting-description">
            Gerencie seus dados armazenados localmente.
          </p>
          <button className="danger-btn">
            🗑️ Limpar Todos os Dados
          </button>
        </div>

        <div className="setting-section">
          <h3>Sobre</h3>
          <p className="setting-description">
            Duckduki v2.0.0<br/>
            Assistente inteligente com IA generativa
          </p>
        </div>
      </div>
      
      {showStorageTest && (
        <StorageTest onClose={() => setShowStorageTest(false)} />
      )}
      
      {showStreamTest && (
        <div className="storage-test-overlay">
          <div className="storage-test-modal">
            <div className="storage-test-header">
              <h2>🌊 Teste de Streaming IA</h2>
              <button onClick={() => setShowStreamTest(false)} className="close-btn">✕</button>
            </div>
            <StreamTest />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel; 