import axios from 'axios';
import { app, shell } from 'electron';
import * as crypto from 'crypto';

export interface GoogleServicesConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
  attendees?: { email: string }[];
  reminders?: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  };
}

export interface Task {
  id?: string;
  title: string;
  notes?: string;
  due?: string;
  completed?: boolean;
  status?: 'needsAction' | 'completed';
  parent?: string;
  position?: string;
}

export interface TaskList {
  id?: string;
  title: string;
  updated?: string;
}

export class GoogleServicesProvider {
  private config: GoogleServicesConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private syncFolderId: string | null = null;

  constructor(config: GoogleServicesConfig) {
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
      prompt: 'consent'
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

    if (this.tokenExpiresAt && this.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      return await this.refreshAccessToken();
    }

    return true;
  }

  // ===== GOOGLE DRIVE METHODS =====

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

      return { success: true };
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
    const searchResult = await this.findFolderByName(folderName);
    if (!searchResult.success) {
      return searchResult;
    }

    if (searchResult.folderId) {
      this.syncFolderId = searchResult.folderId;
      return { success: true, folderId: searchResult.folderId };
    }

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

    if (folderName) {
      const folderResult = await this.createFolderIfNotExists(folderName);
      if (!folderResult.success) {
        return { success: false, error: folderResult.error };
      }
      parentFolderId = folderResult.folderId;
    }

    try {
      const metadata = {
        name: fileName,
        parents: parentFolderId ? [parentFolderId] : undefined
      };

      const response = await axios.post(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          metadata,
          media: {
            mimeType: 'application/json',
            body: content
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, fileId: response.data.id };
    } catch (error: any) {
      console.error('Erro no upload:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // ===== GOOGLE CALENDAR METHODS =====

  // Listar calendários
  async getCalendars(): Promise<{ success: boolean; calendars?: any[]; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const response = await axios.get(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return { success: true, calendars: response.data.items };
    } catch (error: any) {
      console.error('Erro ao obter calendários:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Listar eventos de um calendário
  async getEvents(
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string,
    maxResults: number = 250
  ): Promise<{ success: boolean; events?: CalendarEvent[]; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const params: any = {
        maxResults,
        orderBy: 'startTime',
        singleEvents: true
      };

      if (timeMin) params.timeMin = timeMin;
      if (timeMax) params.timeMax = timeMax;

      const response = await axios.get(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return { success: true, events: response.data.items };
    } catch (error: any) {
      console.error('Erro ao obter eventos:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Criar evento
  async createEvent(
    event: CalendarEvent,
    calendarId: string = 'primary'
  ): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const response = await axios.post(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        event,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, event: response.data };
    } catch (error: any) {
      console.error('Erro ao criar evento:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Atualizar evento
  async updateEvent(
    eventId: string,
    event: Partial<CalendarEvent>,
    calendarId: string = 'primary'
  ): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const response = await axios.put(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        event,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, event: response.data };
    } catch (error: any) {
      console.error('Erro ao atualizar evento:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Excluir evento
  async deleteEvent(
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<{ success: boolean; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      await axios.delete(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao excluir evento:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // ===== GOOGLE TASKS METHODS =====

  // Listar listas de tarefas
  async getTaskLists(): Promise<{ success: boolean; taskLists?: TaskList[]; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const response = await axios.get(
        'https://tasks.googleapis.com/tasks/v1/users/@me/lists',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return { success: true, taskLists: response.data.items };
    } catch (error: any) {
      console.error('Erro ao obter listas de tarefas:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Listar tarefas de uma lista
  async getTasks(taskListId: string, showCompleted: boolean = false): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const params: any = {};
      if (showCompleted) {
        params.showCompleted = true;
      }

      const response = await axios.get(
        `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return { success: true, tasks: response.data.items || [] };
    } catch (error: any) {
      console.error('Erro ao obter tarefas:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Criar tarefa
  async createTask(
    task: Omit<Task, 'id'>,
    taskListId: string
  ): Promise<{ success: boolean; task?: Task; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const response = await axios.post(
        `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
        task,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, task: response.data };
    } catch (error: any) {
      console.error('Erro ao criar tarefa:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Atualizar tarefa
  async updateTask(
    taskId: string,
    task: Partial<Task>,
    taskListId: string
  ): Promise<{ success: boolean; task?: Task; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const response = await axios.put(
        `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
        task,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, task: response.data };
    } catch (error: any) {
      console.error('Erro ao atualizar tarefa:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Excluir tarefa
  async deleteTask(
    taskId: string,
    taskListId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      await axios.delete(
        `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao excluir tarefa:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  // Marcar tarefa como concluída
  async completeTask(
    taskId: string,
    taskListId: string
  ): Promise<{ success: boolean; task?: Task; error?: string }> {
    return this.updateTask(taskId, { status: 'completed' }, taskListId);
  }

  // ===== COMMON METHODS =====

  // Obter informações do usuário
  async getUserInfo(): Promise<{ success: boolean; user?: any; error?: string }> {
    if (!await this.ensureValidToken()) {
      return { success: false, error: 'Token inválido' };
    }

    try {
      const response = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return { success: true, user: response.data };
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

// Função factory para criar o provedor
export function createGoogleServicesProvider(): GoogleServicesProvider {
  const config: GoogleServicesConfig = {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'your-client-secret',
    redirectUri: 'http://localhost:3000/auth/google/callback',
    scopes: [
      // Drive
      'https://www.googleapis.com/auth/drive.file',
      // Calendar
      'https://www.googleapis.com/auth/calendar',
      // Tasks
      'https://www.googleapis.com/auth/tasks',
      // User info
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  };

  return new GoogleServicesProvider(config);
}

/*
NOVA CONFIGURAÇÃO PARA PRODUÇÃO:

1. No Google Cloud Console, ative as seguintes APIs:
   - Google Drive API
   - Google Calendar API
   - Google Tasks API

2. Os escopos necessários são:
   - https://www.googleapis.com/auth/drive.file
   - https://www.googleapis.com/auth/calendar  
   - https://www.googleapis.com/auth/tasks
   - https://www.googleapis.com/auth/userinfo.profile
   - https://www.googleapis.com/auth/userinfo.email

3. Use as mesmas credenciais do arquivo .env

Exemplo de uso:
const provider = createGoogleServicesProvider();

// Calendário
const events = await provider.getEvents('primary', new Date().toISOString());
const newEvent = await provider.createEvent({
  summary: 'Reunião importante',
  start: { dateTime: '2024-01-01T10:00:00.000Z' },
  end: { dateTime: '2024-01-01T11:00:00.000Z' }
});

// Tarefas
const taskLists = await provider.getTaskLists();
const tasks = await provider.getTasks(taskLists.taskLists[0].id);
const newTask = await provider.createTask({
  title: 'Nova tarefa',
  notes: 'Descrição da tarefa'
}, taskLists.taskLists[0].id);
*/ 