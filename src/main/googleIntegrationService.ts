import Store from 'electron-store';
import { GoogleServicesProvider, createGoogleServicesProvider, CalendarEvent, Task, TaskList } from './cloudProviders/googleServicesProvider';
import { OAuthServer } from './oauthServer';
import { app } from 'electron';

export interface GoogleConnection {
  connected: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    picture: string;
  };
  connectedAt?: Date;
  lastActivity?: Date;
}

export class GoogleIntegrationService {
  private store: Store;
  private googleProvider: GoogleServicesProvider;
  private oauthServer: OAuthServer;

  constructor() {
    this.store = new Store({ name: 'google-integration' });
    this.googleProvider = createGoogleServicesProvider();
    this.oauthServer = new OAuthServer(3000);
    
    // Inicializar servidor OAuth
    this.startOAuthServer();
    
    // Carregar dados salvos
    this.loadProviderData();
  }

  private async startOAuthServer(): Promise<void> {
    try {
      const result = await this.oauthServer.start();
      if (result.success) {
        console.log(`🔐 Servidor OAuth para Google Services iniciado na porta ${result.port}`);
      } else {
        console.error('❌ Erro ao iniciar servidor OAuth:', result.error);
      }
    } catch (error) {
      console.error('❌ Erro crítico no servidor OAuth:', error);
    }
  }

  private loadProviderData(): void {
    try {
      const googleData = this.store.get('google-provider-data');
      if (googleData) {
        this.googleProvider.deserialize(googleData);
        console.log('🔗 Dados do Google Services carregados');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados do Google Services:', error);
    }
  }

  private saveProviderData(): void {
    try {
      const providerData = this.googleProvider.serialize();
      this.store.set('google-provider-data', providerData);
    } catch (error) {
      console.error('❌ Erro ao salvar dados do Google Services:', error);
    }
  }

  // ===== CONEXÃO =====

  async connect(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 Iniciando autenticação Google Services...');
      
      // Usar servidor OAuth para autenticação
      const authResult = await this.oauthServer.authenticateProvider(
        () => this.googleProvider.generateAuthUrl(),
        (code) => this.googleProvider.exchangeCodeForTokens(code)
      );

      if (!authResult.success) {
        throw new Error(authResult.error || 'Falha na autenticação');
      }

      // Obter informações do usuário
      const userResult = await this.googleProvider.getUserInfo();
      if (!userResult.success) {
        throw new Error('Erro ao obter informações do usuário');
      }

      // Salvar dados de conexão
      const connectionData: GoogleConnection = {
        connected: true,
        user: userResult.user,
        connectedAt: new Date(),
        lastActivity: new Date()
      };
      this.store.set('connection', connectionData);
      
      // Salvar dados do provedor
      this.saveProviderData();

      console.log('✅ Google Services conectado com sucesso!');
      return { success: true };

    } catch (error: any) {
      console.error('❌ Erro ao conectar Google Services:', error);
      return { success: false, error: error.message || String(error) };
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.googleProvider.disconnect();
      this.store.delete('connection');
      this.store.delete('google-provider-data');
      console.log('🔌 Google Services desconectado');
    } catch (error) {
      console.error('❌ Erro ao desconectar Google Services:', error);
    }
  }

  getConnectionStatus(): GoogleConnection {
    return this.store.get('connection', { connected: false }) as GoogleConnection;
  }

  private updateLastActivity(): void {
    const connection = this.getConnectionStatus();
    if (connection.connected) {
      connection.lastActivity = new Date();
      this.store.set('connection', connection);
    }
  }

  // ===== GOOGLE CALENDAR =====

  async getCalendars(): Promise<{ success: boolean; calendars?: any[]; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.getCalendars();
      this.saveProviderData(); // Salvar tokens atualizados
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getEvents(
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string,
    maxResults: number = 250
  ): Promise<{ success: boolean; events?: CalendarEvent[]; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.getEvents(calendarId, timeMin, timeMax, maxResults);
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createEvent(
    event: CalendarEvent,
    calendarId: string = 'primary'
  ): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.createEvent(event, calendarId);
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateEvent(
    eventId: string,
    event: Partial<CalendarEvent>,
    calendarId: string = 'primary'
  ): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.updateEvent(eventId, event, calendarId);
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteEvent(
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.deleteEvent(eventId, calendarId);
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===== GOOGLE TASKS =====

  async getTaskLists(): Promise<{ success: boolean; taskLists?: TaskList[]; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.getTaskLists();
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getTasks(
    taskListId: string,
    showCompleted: boolean = false
  ): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.getTasks(taskListId, showCompleted);
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createTask(
    task: Omit<Task, 'id'>,
    taskListId: string
  ): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.createTask(task, taskListId);
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateTask(
    taskId: string,
    task: Partial<Task>,
    taskListId: string
  ): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.updateTask(taskId, task, taskListId);
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteTask(
    taskId: string,
    taskListId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.deleteTask(taskId, taskListId);
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async completeTask(
    taskId: string,
    taskListId: string
  ): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.completeTask(taskId, taskListId);
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===== GOOGLE DRIVE (para sincronização) =====

  async createSyncFolder(folderName: string): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.createFolderIfNotExists(folderName);
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async uploadFile(
    fileName: string,
    content: string,
    folderName?: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.uploadFile(fileName, content, folderName);
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===== UTILITÁRIOS =====

  async getUserInfo(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      this.updateLastActivity();
      const result = await this.googleProvider.getUserInfo();
      this.saveProviderData();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.oauthServer.stop();
      console.log('🧹 Google Integration Service limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar Google Integration Service:', error);
    }
  }

  // ===== MÉTODOS DE CONVENIÊNCIA =====

  async getTodayEvents(calendarId: string = 'primary'): Promise<{ success: boolean; events?: CalendarEvent[]; error?: string }> {
    const today = new Date();
    const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    
    return this.getEvents(calendarId, timeMin, timeMax);
  }

  async getUpcomingEvents(calendarId: string = 'primary', days: number = 7): Promise<{ success: boolean; events?: CalendarEvent[]; error?: string }> {
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    
    return this.getEvents(calendarId, timeMin, timeMax);
  }

  async getPendingTasks(taskListId: string): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
    const result = await this.getTasks(taskListId, false);
    if (result.success && result.tasks) {
      result.tasks = result.tasks.filter(task => task.status !== 'completed');
    }
    return result;
  }

  async getTodayTasks(taskListId: string): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
    const result = await this.getTasks(taskListId, false);
    if (result.success && result.tasks) {
      const today = new Date().toDateString();
      result.tasks = result.tasks.filter(task => 
        task.due && new Date(task.due).toDateString() === today
      );
    }
    return result;
  }

  async getOverdueTasks(taskListId: string): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
    const result = await this.getTasks(taskListId, false);
    if (result.success && result.tasks) {
      const now = new Date();
      result.tasks = result.tasks.filter(task => 
        task.due && new Date(task.due) < now && task.status !== 'completed'
      );
    }
    return result;
  }
} 