import Store from 'electron-store';
import { KnowledgeService } from './knowledgeService';
import { SecurityManager } from './securityManager';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import * as crypto from 'crypto';
import { GoogleIntegrationService } from './googleIntegrationService';

export interface SyncData {
  settings: any;
  knowledgeBase: any[];
  conversationHistory: any[];
  version: string;
  timestamp: Date;
  deviceId: string;
  checksum: string;
}

export interface SyncProvider {
  id: 'googledrive';
  name: string;
  status: 'disconnected' | 'connected' | 'syncing' | 'error';
  lastSync?: Date;
  folder?: string;
}

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number;
  selectedProvider: 'googledrive' | null;
  conflictResolution: 'local' | 'remote' | 'merge';
  providers: Record<string, Partial<SyncProvider>>;
}

export class SyncServiceUnified {
  private store: Store;
  private knowledgeService: KnowledgeService;
  private securityManager: SecurityManager;
  private deviceId: string;
  private syncTimer: NodeJS.Timeout | null = null;
  private googleIntegrationService: GoogleIntegrationService;

  private readonly SYNC_FOLDER_NAME = 'DuckdukiSync';
  private readonly SYNC_FILE_NAME = 'duckduki-data.json';

  constructor(knowledgeService: KnowledgeService, securityManager: SecurityManager, googleIntegrationService: GoogleIntegrationService) {
    this.store = new Store({ name: 'sync-settings' });
    this.knowledgeService = knowledgeService;
    this.securityManager = securityManager;
    this.deviceId = this.generateDeviceId();
    
    // Usar o GoogleIntegrationService compartilhado
    this.googleIntegrationService = googleIntegrationService;
    
    // Inicializar timer se sincronização automática estiver habilitada
    this.initializeAutoSync();
  }

  private generateDeviceId(): string {
    let deviceId = this.store.get('deviceId') as string;
    if (!deviceId) {
      deviceId = crypto.randomBytes(16).toString('hex');
      this.store.set('deviceId', deviceId);
    }
    return deviceId;
  }

  private initializeAutoSync(): void {
    const settings = this.getSyncSettings();
    if (settings.autoSync && settings.selectedProvider) {
      this.startAutoSync(settings.syncInterval);
    }
  }

  private startAutoSync(intervalMinutes: number): void {
    this.stopAutoSync();
    this.syncTimer = setInterval(async () => {
      const settings = this.getSyncSettings();
      if (settings.selectedProvider) {
        try {
          await this.performSync(settings.selectedProvider, settings.conflictResolution);
        } catch (error) {
          console.error('Erro na sincronização automática:', error);
        }
      }
    }, intervalMinutes * 60 * 1000);
  }

  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  getSyncSettings(): SyncSettings {
    return this.store.get('syncSettings', {
      autoSync: false,
      syncInterval: 15,
      selectedProvider: null,
      conflictResolution: 'merge',
      providers: {}
    }) as SyncSettings;
  }

  saveSyncSettings(settings: Partial<SyncSettings>): void {
    const currentSettings = this.getSyncSettings();
    const newSettings = { ...currentSettings, ...settings };
    this.store.set('syncSettings', newSettings);
    
    // Atualizar timer de sincronização automática
    if (newSettings.autoSync && newSettings.selectedProvider) {
      this.startAutoSync(newSettings.syncInterval);
    } else {
      this.stopAutoSync();
    }
  }

  // Conectar ao Google Drive usando GoogleIntegrationService compartilhado
  async connectGoogleDrive(): Promise<{ success: boolean; folder?: string; error?: string }> {
    try {
      console.log('🔐 Verificando conexão Google Services...');
      
      // Verificar se já está conectado
      const connectionStatus = this.googleIntegrationService.getConnectionStatus();
      if (!connectionStatus.connected) {
        console.log('🔐 Conectando ao Google Services...');
        const authResult = await this.googleIntegrationService.connect();
        if (!authResult.success) {
          throw new Error(authResult.error || 'Falha na autenticação');
        }
      }

      // Criar pasta de sincronização
      const folderResult = await this.googleIntegrationService.createSyncFolder(this.SYNC_FOLDER_NAME);
      if (!folderResult.success) {
        throw new Error(folderResult.error || 'Erro ao criar pasta');
      }
      
      // Atualizar configuração
      const settings = this.getSyncSettings();
      settings.providers.googledrive = {
        id: 'googledrive',
        status: 'connected',
        folder: `/${this.SYNC_FOLDER_NAME}`
      };
      this.saveSyncSettings({ providers: settings.providers });

      console.log('✅ Google Services conectado para sincronização!');
      return { success: true, folder: `/${this.SYNC_FOLDER_NAME}` };

    } catch (error: any) {
      console.error('❌ Erro ao conectar Google Services:', error);
      return { success: false, error: error.message || String(error) };
    }
  }

  async connectSyncProvider(providerId: 'googledrive'): Promise<{ success: boolean; folder?: string; error?: string }> {
    return this.connectGoogleDrive();
  }

  async disconnectSyncProvider(providerId: 'googledrive'): Promise<void> {
    try {
      // Apenas atualizar configurações locais - não desconectar GoogleIntegrationService
      // pois pode estar sendo usado para Calendar/Tasks
      const settings = this.getSyncSettings();
      if (settings.providers.googledrive) {
        settings.providers.googledrive.status = 'disconnected';
        delete settings.providers.googledrive.folder;
      }
      this.saveSyncSettings({ providers: settings.providers });
      console.log('🔌 Sincronização Google Drive desconectada');
    } catch (error) {
      console.error('❌ Erro ao desconectar sincronização:', error);
    }
  }

  private async generateSyncData(): Promise<SyncData> {
    try {
      // Coletar configurações do armazenamento
      const settings = {
        syncSettings: this.getSyncSettings(),
        // Adicionar outras configurações conforme necessário
      };

      // Coletar base de conhecimento
      const knowledgeBase: any[] = [];

      // Para conversationHistory, vamos criar um placeholder por enquanto
      const conversationHistory: any[] = [];

      const syncData: SyncData = {
        settings,
        knowledgeBase,
        conversationHistory,
        version: '2.0.0',
        timestamp: new Date(),
        deviceId: this.deviceId,
        checksum: ''
      };

      // Calcular checksum
      const dataForChecksum = JSON.stringify({
        settings: syncData.settings,
        knowledgeBase: syncData.knowledgeBase,
        conversationHistory: syncData.conversationHistory
      });
      syncData.checksum = crypto.createHash('sha256').update(dataForChecksum).digest('hex');

      return syncData;
    } catch (error) {
      console.error('❌ Erro ao gerar dados de sincronização:', error);
      throw error;
    }
  }

  private encryptData(data: SyncData): string {
    try {
      const key = crypto.scryptSync(this.deviceId, 'duckduki-salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', key);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('❌ Erro ao criptografar dados:', error);
      throw new Error('Falha na criptografia dos dados');
    }
  }

  private decryptData(encryptedData: string): SyncData {
    try {
      const [ivHex, encrypted] = encryptedData.split(':');
      const key = crypto.scryptSync(this.deviceId, 'duckduki-salt', 32);
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('❌ Erro ao descriptografar dados:', error);
      throw new Error('Falha na descriptografia dos dados');
    }
  }

  private async uploadToProvider(providerId: 'googledrive', data: SyncData): Promise<{ success: boolean; error?: string }> {
    try {
      const encryptedData = this.encryptData(data);
      
      const result = await this.googleIntegrationService.uploadFile(
        this.SYNC_FILE_NAME,
        encryptedData,
        this.SYNC_FOLDER_NAME
      );

      if (result.success) {
        console.log('📤 Upload realizado com sucesso');
        
        // Atualizar status da última sincronização
        const settings = this.getSyncSettings();
        if (settings.providers.googledrive) {
          settings.providers.googledrive.lastSync = new Date();
          settings.providers.googledrive.status = 'connected';
        }
        this.saveSyncSettings({ providers: settings.providers });
        
        return { success: true };
      } else {
        throw new Error(result.error || 'Erro no upload');
      }
    } catch (error: any) {
      console.error('❌ Erro no upload:', error);
      
      // Marcar erro no status
      const settings = this.getSyncSettings();
      if (settings.providers.googledrive) {
        settings.providers.googledrive.status = 'error';
      }
      this.saveSyncSettings({ providers: settings.providers });
      
      return { success: false, error: error.message || 'Erro no upload' };
    }
  }

  private mergeData(localData: SyncData, remoteData: SyncData): SyncData {
    // Implementação simples de merge - usar dados mais recentes
    const mergedData: SyncData = {
      ...localData,
      timestamp: new Date(),
      deviceId: this.deviceId
    };

    // Merge da base de conhecimento (combinar ambas, sem duplicatas)
    const combinedKnowledge = [...localData.knowledgeBase];
    remoteData.knowledgeBase.forEach(remoteItem => {
      const exists = combinedKnowledge.some(localItem => localItem.id === remoteItem.id);
      if (!exists) {
        combinedKnowledge.push(remoteItem);
      }
    });
    mergedData.knowledgeBase = combinedKnowledge;

    // Recalcular checksum
    const dataForChecksum = JSON.stringify({
      settings: mergedData.settings,
      knowledgeBase: mergedData.knowledgeBase,
      conversationHistory: mergedData.conversationHistory
    });
    mergedData.checksum = crypto.createHash('sha256').update(dataForChecksum).digest('hex');

    return mergedData;
  }

  async performSync(providerId: 'googledrive', conflictResolution: 'local' | 'remote' | 'merge'): Promise<{ success: boolean; details?: string; error?: string }> {
    try {
      console.log('🔄 Iniciando sincronização...');
      
      // Verificar conexão
      const connectionStatus = this.googleIntegrationService.getConnectionStatus();
      if (!connectionStatus.connected) {
        throw new Error('Google Services não conectado');
      }

      // Marcar como sincronizando
      const settings = this.getSyncSettings();
      if (settings.providers.googledrive) {
        settings.providers.googledrive.status = 'syncing';
      }
      this.saveSyncSettings({ providers: settings.providers });

      // Gerar dados locais
      const localData = await this.generateSyncData();
      
      // Tentar fazer upload dos dados
      const uploadResult = await this.uploadToProvider(providerId, localData);
      
      if (uploadResult.success) {
        return { 
          success: true, 
          details: `Sincronização concluída com sucesso. ${localData.knowledgeBase.length} itens sincronizados.` 
        };
      } else {
        return { 
          success: false, 
          error: uploadResult.error || 'Erro na sincronização' 
        };
      }

    } catch (error: any) {
      console.error('❌ Erro na sincronização:', error);
      
      // Marcar erro no status
      const settings = this.getSyncSettings();
      if (settings.providers.googledrive) {
        settings.providers.googledrive.status = 'error';
      }
      this.saveSyncSettings({ providers: settings.providers });
      
      return { 
        success: false, 
        error: error.message || 'Erro desconhecido na sincronização' 
      };
    }
  }

  getSyncStatus(): { 
    connected: boolean; 
    provider?: string; 
    lastSync?: Date; 
    autoSync: boolean 
  } {
    const settings = this.getSyncSettings();
    const connectionStatus = this.googleIntegrationService.getConnectionStatus();
    const providerSettings = settings.providers.googledrive;
    
    return {
      connected: connectionStatus.connected && providerSettings?.status === 'connected',
      provider: settings.selectedProvider || undefined,
      lastSync: providerSettings?.lastSync ? new Date(providerSettings.lastSync) : undefined,
      autoSync: settings.autoSync
    };
  }

  async cleanup(): Promise<void> {
    try {
      this.stopAutoSync();
      console.log('🧹 Sync Service limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar Sync Service:', error);
    }
  }
} 