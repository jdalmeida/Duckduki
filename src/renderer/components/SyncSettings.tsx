import React, { useState, useEffect } from 'react';
import './SyncSettings.css';

interface SyncProvider {
  id: 'googledrive';
  name: string;
  icon: string;
  status: 'disconnected' | 'connected' | 'syncing' | 'error';
  lastSync?: Date;
  folder?: string;
}

interface SyncData {
  settings: any;
  knowledgeBase: any[];
  conversationHistory: any[];
  version: string;
  timestamp: Date;
  deviceId: string;
}

const SyncSettings: React.FC = () => {
  const [providers, setProviders] = useState<SyncProvider[]>([
    {
      id: 'googledrive',
      name: 'Google Drive',
      icon: '📁',
      status: 'disconnected'
    }
  ]);

  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(15); // minutos
  const [selectedProvider, setSelectedProvider] = useState<'googledrive' | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<{ success: boolean; message: string; timestamp?: Date } | null>(null);
  const [conflictResolution, setConflictResolution] = useState<'local' | 'remote' | 'merge'>('merge');

  // Carregar configurações de sincronização
  useEffect(() => {
    loadSyncSettings();
  }, []);

  const loadSyncSettings = async () => {
    try {
      const settings = await window.electronAPI?.getSyncSettings?.();
      if (settings) {
        setAutoSync(settings.autoSync || false);
        setSyncInterval(settings.syncInterval || 15);
        setSelectedProvider(settings.selectedProvider || null);
        setConflictResolution(settings.conflictResolution || 'merge');
        
        // Atualizar status dos provedores
        if (settings.providers) {
          setProviders(current => current.map(provider => ({
            ...provider,
            ...settings.providers[provider.id]
          })));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de sincronização:', error);
    }
  };

  const connectProvider = async (providerId: 'googledrive') => {
    try {
      setIsSyncing(true);
      const result = await window.electronAPI?.connectSyncProvider?.(providerId);
      
      if (result?.success) {
        setProviders(current => current.map(provider => 
          provider.id === providerId 
            ? { 
                ...provider, 
                status: 'connected',
                folder: result.folder 
              } 
            : provider
        ));
        setSelectedProvider(providerId);
        setLastSyncStatus({
          success: true,
          message: 'Conectado ao Google Drive com sucesso!',
          timestamp: new Date()
        });
      } else {
        throw new Error(result?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error(`Erro ao conectar ${providerId}:`, error);

      setLastSyncStatus({
        success: false,
        message: `Erro ao conectar: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnectProvider = async (providerId: 'googledrive') => {
    try {
      await window.electronAPI?.disconnectSyncProvider?.(providerId);
      setProviders(current => current.map(provider => 
        provider.id === providerId 
          ? { ...provider, status: 'disconnected', folder: undefined } 
          : provider
      ));
      if (selectedProvider === providerId) {
        setSelectedProvider(null);
      }
      setLastSyncStatus({
        success: true,
        message: 'Desconectado do Google Drive',
        timestamp: new Date()
      });
    } catch (error) {
      console.error(`Erro ao desconectar ${providerId}:`, error);
      setLastSyncStatus({
        success: false,
        message: `Erro ao desconectar: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      });
    }
  };

  const performManualSync = async () => {
    if (!selectedProvider) return;

    try {
      setIsSyncing(true);
      const result = await window.electronAPI?.performSync?.(selectedProvider, conflictResolution);
      
      if (result?.success) {
        setProviders(current => current.map(provider => 
          provider.id === selectedProvider 
            ? { ...provider, lastSync: new Date(), status: 'connected' } 
            : provider
        ));
        setLastSyncStatus({
          success: true,
          message: `Sincronização concluída! ${result.details || ''}`,
          timestamp: new Date()
        });
      } else {
        throw new Error(result?.error || 'Erro na sincronização');
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
      setProviders(current => current.map(provider => 
        provider.id === selectedProvider 
          ? { ...provider, status: 'error' } 
          : provider
      ));
      setLastSyncStatus({
        success: false,
        message: `Erro na sincronização: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const saveSettings = async () => {
    try {
      await window.electronAPI?.saveSyncSettings?.({
        autoSync,
        syncInterval,
        selectedProvider,
        conflictResolution,
        providers: providers.reduce((acc, provider) => ({
          ...acc,
          [provider.id]: {
            status: provider.status,
            lastSync: provider.lastSync,
            folder: provider.folder
          }
        }), {})
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    }
  };

  // Salvar configurações quando houver mudanças
  useEffect(() => {
    saveSettings();
  }, [autoSync, syncInterval, selectedProvider, conflictResolution]);

  const getStatusIcon = (status: SyncProvider['status']) => {
    switch (status) {
      case 'connected': return '✅';
      case 'syncing': return '🔄';
      case 'error': return '❌';
      default: return '⚫';
    }
  };

  const getStatusText = (status: SyncProvider['status']) => {
    switch (status) {
      case 'connected': return 'Conectado';
      case 'syncing': return 'Sincronizando...';
      case 'error': return 'Erro';
      default: return 'Desconectado';
    }
  };

  return (
    <div className="sync-settings">
      <h3>🔄 Sincronização entre Dispositivos</h3>
      
      <div className="sync-intro">
        <p>
          Mantenha seus dados sincronizados entre todos os seus dispositivos usando serviços de nuvem.
          Isso inclui configurações, base de conhecimento e histórico de conversas.
        </p>
      </div>

      {/* Provedores de Sincronização */}
      <div className="sync-providers">
        <h4>Provedores de Sincronização</h4>
        {providers.map(provider => (
          <div key={provider.id} className={`provider-card ${provider.status}`}>
            <div className="provider-info">
              <span className="provider-icon">{provider.icon}</span>
              <div className="provider-details">
                <h5>{provider.name}</h5>
                <div className="provider-status">
                  <span className="status-icon">{getStatusIcon(provider.status)}</span>
                  <span className="status-text">{getStatusText(provider.status)}</span>
                  {provider.lastSync && (
                    <span className="last-sync">
                      Última sincronização: {provider.lastSync.toLocaleString()}
                    </span>
                  )}
                </div>
                {provider.folder && (
                  <div className="provider-folder">
                    Pasta: {provider.folder}
                  </div>
                )}
              </div>
            </div>
            <div className="provider-actions">
              {provider.status === 'disconnected' ? (
                <button 
                  onClick={() => connectProvider(provider.id)}
                  disabled={isSyncing}
                  className="connect-btn"
                >
                  Conectar
                </button>
              ) : (
                <div className="connected-actions">
                  <button
                    onClick={() => setSelectedProvider(provider.id)}
                    disabled={isSyncing}
                    className={`select-btn ${selectedProvider === provider.id ? 'selected' : ''}`}
                  >
                    {selectedProvider === provider.id ? 'Selecionado' : 'Selecionar'}
                  </button>
                  <button
                    onClick={() => disconnectProvider(provider.id)}
                    disabled={isSyncing}
                    className="disconnect-btn"
                  >
                    Desconectar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Configurações de Sincronização */}
      {selectedProvider && (
        <div className="sync-configuration">
          <h4>Configurações de Sincronização</h4>
          
          <div className="setting-group">
            <label className="setting-item">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
              />
              <span>Sincronização automática</span>
            </label>
            <p className="setting-description">
              Sincronizar automaticamente quando houver mudanças
            </p>
          </div>

          {autoSync && (
            <div className="setting-group">
              <label>
                Intervalo de sincronização (minutos):
                <select 
                  value={syncInterval} 
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                >
                  <option value={5}>5 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={120}>2 horas</option>
                </select>
              </label>
            </div>
          )}

          <div className="setting-group">
            <label>
              Resolução de conflitos:
              <select 
                value={conflictResolution} 
                onChange={(e) => setConflictResolution(e.target.value as 'local' | 'remote' | 'merge')}
              >
                <option value="merge">Mesclar dados (recomendado)</option>
                <option value="local">Priorizar dados locais</option>
                <option value="remote">Priorizar dados da nuvem</option>
              </select>
            </label>
            <p className="setting-description">
              Como resolver quando há dados diferentes em dispositivos diferentes
            </p>
          </div>

          {/* Ações de Sincronização */}
          <div className="sync-actions">
            <button
              onClick={performManualSync}
              disabled={isSyncing}
              className="sync-btn primary"
            >
              {isSyncing ? '🔄 Sincronizando...' : '🔄 Sincronizar Agora'}
            </button>
          </div>
        </div>
      )}

      {/* Status da Última Sincronização */}
      {lastSyncStatus && (
        <div className={`sync-status ${lastSyncStatus.success ? 'success' : 'error'}`}>
          <div className="status-message">
            <span className="status-icon">
              {lastSyncStatus.success ? '✅' : '❌'}
            </span>
            <span>{lastSyncStatus.message}</span>
          </div>
          {lastSyncStatus.timestamp && (
            <div className="status-timestamp">
              {lastSyncStatus.timestamp.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Informações Importantes */}
      <div className="sync-info">
        <h4>ℹ️ Informações Importantes</h4>
        <ul>
          <li>
            <strong>Segurança:</strong> Seus dados são criptografados antes de serem enviados para a nuvem
          </li>
          <li>
            <strong>Conflitos:</strong> Quando o mesmo dado é modificado em dispositivos diferentes, 
            a opção "Mesclar" tentará combinar as alterações automaticamente
          </li>
          <li>
            <strong>Primeiro dispositivo:</strong> O primeiro dispositivo conectado criará a estrutura 
            inicial na nuvem
          </li>
          <li>
            <strong>Backup:</strong> Sempre mantenha backups locais importantes independentemente da sincronização
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SyncSettings; 