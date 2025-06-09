import axios from 'axios';
import { app, shell } from 'electron';
import * as crypto from 'crypto';
import { getConfigValue } from '../embeddedConfig';

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export class GoogleDriveProvider {
  private config: GoogleDriveConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private syncFolderId: string | null = null;

  constructor(config: GoogleDriveConfig) {
    this.config = config;
  }

  // Gerar URL de autenticação OAuth2
  generateAuthUrl(): string {
    const state = crypto.randomBytes(32).toString('hex');
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: state,
      access_type: 'offline',
      prompt: 'consent' // Força o consent para obter refresh token
    });

    return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
  }

  // Trocar código de autorização por tokens
  async exchangeCodeForTokens(authCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: authCode,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiresAt = new Date(Date.now() + (data.expires_in * 1000));

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao trocar código por tokens:', error);
      return { 
        success: false, 
        error: error.response?.data?.error_description || error.message
      };
    }
  }

  // Renovar token de acesso
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;
      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }
      this.tokenExpiresAt = new Date(Date.now() + (data.expires_in * 1000));

      return true;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      return false;
    }
  }

  // Verificar se o token está válido
  private async ensureValidToken(): Promise<boolean> {
    if (!this.accessToken) return false;

    // Se o token expira em menos de 5 minutos, renovar
    if (this.tokenExpiresAt && this.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      return await this.refreshAccessToken();
    }

    return true;
  }

  // Buscar pasta por nome
  private async findFolderByName(folderName: string): Promise<{ success: boolean; folderId?: string; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const response = await axios.get(
        'https://www.googleapis.com/drive/v3/files',
        {
          params: {
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      const folders = response.data.files;
      if (folders && folders.length > 0) {
        return { success: true, folderId: folders[0].id };
      }

      return { success: true }; // Pasta não encontrada, mas sem erro
    } catch (error: any) {
      console.error('Erro ao buscar pasta:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Criar pasta se não existir
  async createFolderIfNotExists(folderName: string): Promise<{ success: boolean; folderId?: string; error?: string }> {
    // Primeiro, verificar se a pasta já existe
    const searchResult = await this.findFolderByName(folderName);
    if (!searchResult.success) {
      return searchResult;
    }

    if (searchResult.folderId) {
      this.syncFolderId = searchResult.folderId;
      return { success: true, folderId: searchResult.folderId };
    }

    // Criar a pasta
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const response = await axios.post(
        'https://www.googleapis.com/drive/v3/files',
        {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.syncFolderId = response.data.id;
      return { success: true, folderId: response.data.id };
    } catch (error: any) {
      console.error('Erro ao criar pasta:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Buscar arquivo por nome em uma pasta
  private async findFileInFolder(fileName: string, folderId?: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const parentQuery = folderId ? ` and '${folderId}' in parents` : '';
      const response = await axios.get(
        'https://www.googleapis.com/drive/v3/files',
        {
          params: {
            q: `name='${fileName}' and trashed=false${parentQuery}`,
            fields: 'files(id, name)'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      const files = response.data.files;
      if (files && files.length > 0) {
        return { success: true, fileId: files[0].id };
      }

      return { success: true }; // Arquivo não encontrado, mas sem erro
    } catch (error: any) {
      console.error('Erro ao buscar arquivo:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Upload de arquivo
  async uploadFile(
    fileName: string, 
    content: string, 
    folderName?: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    let parentFolderId = this.syncFolderId;

    // Se especificou uma pasta, garantir que ela existe
    if (folderName) {
      const folderResult = await this.createFolderIfNotExists(folderName);
      if (!folderResult.success) {
        return folderResult;
      }
      parentFolderId = folderResult.folderId!;
    }

    try {
              // Verificar se o arquivo já existe para fazer update ao invés de create
        const existingFile = await this.findFileInFolder(fileName, parentFolderId || undefined);
        
        if (existingFile.fileId) {
          // Atualizar arquivo existente
          const response = await axios.patch(
            `https://www.googleapis.com/upload/drive/v3/files/${existingFile.fileId}?uploadType=media`,
            content,
            {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          return { success: true, fileId: response.data.id };
        } else {
          // Criar novo arquivo usando método simples
          const metadata = {
            name: fileName,
            parents: parentFolderId ? [parentFolderId] : undefined
          };

          // Upload direto sem FormData (que não funciona bem no Node.js)
          const boundary = '-------314159265358979323846';
          const delimiter = `\r\n--${boundary}\r\n`;
          const close_delim = `\r\n--${boundary}--`;

          const metadataString = JSON.stringify(metadata);
          const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            metadataString +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            content +
            close_delim;

          const response = await axios.post(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            multipartRequestBody,
            {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': `multipart/related; boundary="${boundary}"`
              }
            }
          );

          return { success: true, fileId: response.data.id };
        }
    } catch (error: any) {
      console.error('Erro no upload:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Download de arquivo
  async downloadFile(
    fileName: string, 
    folderName?: string
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    let parentFolderId = this.syncFolderId;

    if (folderName) {
      const folderResult = await this.findFolderByName(folderName);
      if (!folderResult.success) {
        return { success: false, error: folderResult.error };
      }
      if (!folderResult.folderId) {
        return { success: false, error: 'Pasta não encontrada' };
      }
      parentFolderId = folderResult.folderId;
    }

    try {
      const fileResult = await this.findFileInFolder(fileName, parentFolderId || undefined);
      if (!fileResult.success) {
        return { success: false, error: fileResult.error };
      }
      if (!fileResult.fileId) {
        return { success: false, error: 'Arquivo não encontrado' };
      }

      const response = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${fileResult.fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return { success: true, content: response.data };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { success: false, error: 'Arquivo não encontrado' };
      }
      
      console.error('Erro no download:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Verificar se arquivo existe
  async fileExists(
    fileName: string, 
    folderName?: string
  ): Promise<{ exists: boolean; fileId?: string; error?: string }> {
    let parentFolderId = this.syncFolderId;

    if (folderName) {
      const folderResult = await this.findFolderByName(folderName);
      if (!folderResult.success) {
        return { exists: false, error: folderResult.error };
      }
      if (!folderResult.folderId) {
        return { exists: false };
      }
      parentFolderId = folderResult.folderId;
    }

    const fileResult = await this.findFileInFolder(fileName, parentFolderId || undefined);
    if (!fileResult.success) {
      return { exists: false, error: fileResult.error };
    }

    return { 
      exists: !!fileResult.fileId, 
      fileId: fileResult.fileId 
    };
  }

  // Listar arquivos em uma pasta
  async listFiles(folderName?: string): Promise<{ success: boolean; files?: any[]; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    let parentFolderId = this.syncFolderId;

    if (folderName) {
      const folderResult = await this.findFolderByName(folderName);
      if (!folderResult.success) {
        return { success: false, error: folderResult.error };
      }
      if (!folderResult.folderId) {
        return { success: true, files: [] };
      }
      parentFolderId = folderResult.folderId;
    }

    try {
      const parentQuery = parentFolderId ? `'${parentFolderId}' in parents and` : '';
      const response = await axios.get(
        'https://www.googleapis.com/drive/v3/files',
        {
          params: {
            q: `${parentQuery} trashed=false`,
            fields: 'files(id, name, size, modifiedTime, mimeType)'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return { success: true, files: response.data.files };
    } catch (error: any) {
      console.error('Erro ao listar arquivos:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Obter informações do usuário
  async getUserInfo(): Promise<{ success: boolean; user?: any; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const response = await axios.get(
        'https://www.googleapis.com/drive/v3/about?fields=user',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return { success: true, user: response.data.user };
    } catch (error: any) {
      console.error('Erro ao obter info do usuário:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Serializar para armazenamento seguro
  serialize(): any {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      tokenExpiresAt: this.tokenExpiresAt?.toISOString(),
      syncFolderId: this.syncFolderId
    };
  }

  // Deserializar do armazenamento
  deserialize(data: any): void {
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.tokenExpiresAt = data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : null;
    this.syncFolderId = data.syncFolderId;
  }

  // Desconectar (revogar tokens)
  async disconnect(): Promise<void> {
    if (this.accessToken) {
      try {
        // Revogar token na Google
        await axios.post(`https://oauth2.googleapis.com/revoke?token=${this.accessToken}`);
      } catch (error) {
        console.error('Erro ao revogar token:', error);
      }
    }

    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    this.syncFolderId = null;
  }
}

// Exemplo de uso e configuração
export function createGoogleDriveProvider(): GoogleDriveProvider {
  const config: GoogleDriveConfig = {
    // Você deve registrar seu aplicativo em https://console.cloud.google.com/
            clientId: getConfigValue('GOOGLE_DRIVE_CLIENT_ID', 'your-client-id') || 'your-client-id',
        clientSecret: getConfigValue('GOOGLE_DRIVE_CLIENT_SECRET', 'your-client-secret') || 'your-client-secret',
    redirectUri: 'http://localhost:3004/auth/google/callback',
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  };

  return new GoogleDriveProvider(config);
}

/*
PARA IMPLEMENTAR EM PRODUÇÃO:

1. Registre seu aplicativo no Google Cloud Console:
   - Vá para https://console.cloud.google.com/
   - Crie um novo projeto ou selecione um existente
   - Ative a API do Google Drive
   - Vá para "Credenciais" > "Criar credenciais" > "ID do cliente OAuth 2.0"
   - Configure o redirect URI como http://localhost:3004/auth/google/callback
   - Anote o Client ID e Client Secret

2. Configure as variáveis de ambiente:
   GOOGLE_DRIVE_CLIENT_ID=seu-client-id
   GOOGLE_DRIVE_CLIENT_SECRET=seu-client-secret

3. Implemente o fluxo OAuth2:
   - Abra uma janela de browser com generateAuthUrl()
   - Capture o código de autorização do callback
   - Use exchangeCodeForTokens() para obter os tokens
   - Salve os tokens de forma segura

4. Use os métodos de upload/download para sincronizar dados

Exemplo de integração:
const provider = createGoogleDriveProvider();
const authUrl = provider.generateAuthUrl();
// Abrir authUrl em browser
// Após autorização, usar o código retornado:
await provider.exchangeCodeForTokens(authCode);
await provider.createFolderIfNotExists('DuckdukiSync');
await provider.uploadFile('data.json', JSON.stringify(syncData), 'DuckdukiSync');
*/ 