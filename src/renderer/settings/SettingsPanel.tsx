import React, { useState } from 'react';
import './SettingsPanel.css';

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
            Duckduki v1.0.0<br/>
            Assistente inteligente com IA generativa
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel; 