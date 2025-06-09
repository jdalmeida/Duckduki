import React, { useState, useEffect } from 'react';
import './GoogleConnectionWidget.css';

interface GoogleConnectionWidgetProps {
  onOpenCalendar: () => void;
  onOpenTasks: () => void;
  onOpenSync: () => void;
}

interface UserInfo {
  name: string;
  email: string;
  picture?: string;
}

export const GoogleConnectionWidget: React.FC<GoogleConnectionWidgetProps> = ({
  onOpenCalendar,
  onOpenTasks,
  onOpenSync,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const connected = await window.electronAPI.googleServices.isConnected();
      setIsConnected(connected);
      
      if (connected) {
        const info = await window.electronAPI.googleServices.getUserInfo();
        setUserInfo(info);
      }
    } catch (err) {
      console.error('Erro ao verificar status de conexão:', err);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await window.electronAPI.googleServices.connect();
      setIsConnected(true);
      
      const info = await window.electronAPI.googleServices.getUserInfo();
      setUserInfo(info);
    } catch (err: any) {
      console.error('Erro ao conectar com Google:', err);
      
      // Mensagens específicas para diferentes tipos de erro
      if (err.message?.includes('403')) {
        setError('APIs do Google não ativadas. Verifique o Console do Google Cloud e ative as APIs: Calendar, Tasks e Drive.');
      } else if (err.message?.includes('invalid_scope')) {
        setError('Escopos de permissão inválidos. Verifique a configuração OAuth2.');
      } else {
        setError(err.message || 'Erro ao conectar com Google Services');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    
    try {
      await window.electronAPI.googleServices.disconnect();
      setIsConnected(false);
      setUserInfo(null);
    } catch (err: any) {
      console.error('Erro ao desconectar:', err);
      setError(err.message || 'Erro ao desconectar');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="google-connection-widget">
        <div className="connection-status disconnected">
          <div className="status-icon">🔒</div>
          <div className="status-content">
            <h4>Google Services Desconectado</h4>
            <p>Conecte-se para acessar Calendar, Tasks e sincronização</p>
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <div className="error-text">
                  <strong>Erro de Conexão:</strong><br/>
                  {error}
                  {error.includes('APIs do Google') && (
                    <div className="error-help">
                      <br/>
                      <strong>Para resolver:</strong>
                      <ol>
                        <li>Acesse <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener">Google Cloud Console</a></li>
                        <li>Ative as APIs: Google Calendar, Google Tasks, Google Drive</li>
                        <li>Configure a tela de consentimento OAuth2</li>
                        <li>Tente conectar novamente</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleConnect}
            disabled={isLoading}
            className="connect-button"
          >
            {isLoading ? '🔄 Conectando...' : '🔗 Conectar ao Google'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="google-connection-widget">
      <div className="connection-status connected">
        <div className="user-info">
          {userInfo?.picture && (
            <img 
              src={userInfo.picture} 
              alt="Avatar"
              className="user-avatar"
            />
          )}
          <div className="user-details">
            <h4>✅ Conectado como {userInfo?.name}</h4>
            <p>{userInfo?.email}</p>
          </div>
        </div>
        
        <div className="services-grid">
          <button 
            onClick={onOpenCalendar}
            className="service-button calendar"
          >
            <span className="service-icon">📅</span>
            <div className="service-info">
              <strong>Calendar</strong>
              <small>Eventos e compromissos</small>
            </div>
          </button>
          
          <button 
            onClick={onOpenTasks}
            className="service-button tasks"
          >
            <span className="service-icon">✅</span>
            <div className="service-info">
              <strong>Tasks</strong>
              <small>Tarefas e lembretes</small>
            </div>
          </button>
          
          <button 
            onClick={onOpenSync}
            className="service-button sync"
          >
            <span className="service-icon">☁️</span>
            <div className="service-info">
              <strong>Sync</strong>
              <small>Sincronização segura</small>
            </div>
          </button>
        </div>
        
        <div className="connection-actions">
          <button 
            onClick={handleDisconnect}
            disabled={isLoading}
            className="disconnect-button"
          >
            {isLoading ? '🔄 Desconectando...' : '🔓 Desconectar'}
          </button>
        </div>
      </div>
    </div>
  );
}; 