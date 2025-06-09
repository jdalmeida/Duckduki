import { GoogleIntegrationService } from '../googleIntegrationService';

export interface AIToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class GoogleCalendarTools {
  private googleService: GoogleIntegrationService;

  constructor(googleService: GoogleIntegrationService) {
    this.googleService = googleService;
  }

  // === FERRAMENTAS DE CALENDAR ===

  async getTodayEvents(): Promise<AIToolResult> {
    try {
      const status = this.googleService.getConnectionStatus();
      if (!status.connected) {
        return { success: false, error: 'Google Services não conectado' };
      }

      const calendarsResponse = await this.googleService.getCalendars();
      if (!calendarsResponse.success) {
        return { success: false, error: 'Erro ao obter calendários' };
      }

      const primaryCalendar = calendarsResponse.calendars?.find(cal => cal.primary) || calendarsResponse.calendars?.[0];
      if (!primaryCalendar) {
        return { success: false, error: 'Nenhum calendário encontrado' };
      }

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const eventsResponse = await this.googleService.getEvents(
        primaryCalendar.id!,
        startOfDay.toISOString(),
        endOfDay.toISOString(),
        20
      );

      if (!eventsResponse.success) {
        return { success: false, error: 'Erro ao obter eventos de hoje' };
      }

      const events = eventsResponse.events || [];
      return {
        success: true,
        data: events,
        message: `Encontrados ${events.length} eventos para hoje`
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  async getUpcomingEvents(days: number = 7): Promise<AIToolResult> {
    try {
      const status = this.googleService.getConnectionStatus();
      if (!status.connected) {
        return { success: false, error: 'Google Services não conectado' };
      }

      const calendarsResponse = await this.googleService.getCalendars();
      if (!calendarsResponse.success) {
        return { success: false, error: 'Erro ao obter calendários' };
      }

      const primaryCalendar = calendarsResponse.calendars?.find(cal => cal.primary) || calendarsResponse.calendars?.[0];
      if (!primaryCalendar) {
        return { success: false, error: 'Nenhum calendário encontrado' };
      }

      const now = new Date();
      const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

      const eventsResponse = await this.googleService.getEvents(
        primaryCalendar.id!,
        now.toISOString(),
        futureDate.toISOString(),
        50
      );

      if (!eventsResponse.success) {
        return { success: false, error: 'Erro ao obter eventos futuros' };
      }

      const events = eventsResponse.events || [];
      return {
        success: true,
        data: events,
        message: `Encontrados ${events.length} eventos nos próximos ${days} dias`
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  async createEvent(title: string, description: string, startTime: string, endTime: string, location?: string): Promise<AIToolResult> {
    try {
      const status = this.googleService.getConnectionStatus();
      if (!status.connected) {
        return { success: false, error: 'Google Services não conectado' };
      }

      const calendarsResponse = await this.googleService.getCalendars();
      if (!calendarsResponse.success) {
        return { success: false, error: 'Erro ao obter calendários' };
      }

      const primaryCalendar = calendarsResponse.calendars?.find(cal => cal.primary) || calendarsResponse.calendars?.[0];
      if (!primaryCalendar) {
        return { success: false, error: 'Nenhum calendário encontrado' };
      }

      const eventData = {
        summary: title,
        description: description,
        start: {
          dateTime: startTime,
          timeZone: 'America/Sao_Paulo'
        },
        end: {
          dateTime: endTime,
          timeZone: 'America/Sao_Paulo'
        },
        location: location
      };

      const createResponse = await this.googleService.createEvent(eventData, primaryCalendar.id!);
      
      if (!createResponse.success) {
        return { success: false, error: 'Erro ao criar evento' };
      }

      return {
        success: true,
        data: createResponse.event,
        message: `Evento "${title}" criado com sucesso`
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  // === FERRAMENTAS DE TASKS ===

  async getTasks(): Promise<AIToolResult> {
    try {
      const status = this.googleService.getConnectionStatus();
      if (!status.connected) {
        return { success: false, error: 'Google Services não conectado' };
      }

      const taskListsResponse = await this.googleService.getTaskLists();
      if (!taskListsResponse.success) {
        return { success: false, error: 'Erro ao obter listas de tarefas' };
      }

      const defaultTaskList = taskListsResponse.taskLists?.[0];
      if (!defaultTaskList) {
        return { success: false, error: 'Nenhuma lista de tarefas encontrada' };
      }

      const tasksResponse = await this.googleService.getTasks(defaultTaskList.id!, false);
      
      if (!tasksResponse.success) {
        return { success: false, error: 'Erro ao obter tarefas' };
      }

      const tasks = tasksResponse.tasks || [];
      const pendingTasks = tasks.filter(task => task.status !== 'completed');
      
      return {
        success: true,
        data: { all: tasks, pending: pendingTasks },
        message: `Encontradas ${pendingTasks.length} tarefas pendentes de ${tasks.length} total`
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  async createTask(title: string, description?: string, dueDate?: string): Promise<AIToolResult> {
    try {
      const status = this.googleService.getConnectionStatus();
      if (!status.connected) {
        return { success: false, error: 'Google Services não conectado' };
      }

      const taskListsResponse = await this.googleService.getTaskLists();
      if (!taskListsResponse.success) {
        return { success: false, error: 'Erro ao obter listas de tarefas' };
      }

      const defaultTaskList = taskListsResponse.taskLists?.[0];
      if (!defaultTaskList) {
        return { success: false, error: 'Nenhuma lista de tarefas encontrada' };
      }

      const taskData: any = {
        title: title,
        notes: description,
        status: 'needsAction'
      };

      if (dueDate) {
        taskData.due = dueDate;
      }

      const createResponse = await this.googleService.createTask(taskData, defaultTaskList.id!);
      
      if (!createResponse.success) {
        return { success: false, error: 'Erro ao criar tarefa' };
      }

      return {
        success: true,
        data: createResponse.task,
        message: `Tarefa "${title}" criada com sucesso`
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  async completeTask(taskTitle: string): Promise<AIToolResult> {
    try {
      const status = this.googleService.getConnectionStatus();
      if (!status.connected) {
        return { success: false, error: 'Google Services não conectado' };
      }

      const taskListsResponse = await this.googleService.getTaskLists();
      if (!taskListsResponse.success) {
        return { success: false, error: 'Erro ao obter listas de tarefas' };
      }

      const defaultTaskList = taskListsResponse.taskLists?.[0];
      if (!defaultTaskList) {
        return { success: false, error: 'Nenhuma lista de tarefas encontrada' };
      }

      const tasksResponse = await this.googleService.getTasks(defaultTaskList.id!, false);
      
      if (!tasksResponse.success) {
        return { success: false, error: 'Erro ao obter tarefas' };
      }

      const tasks = tasksResponse.tasks || [];
      const task = tasks.find(t => t.title?.toLowerCase().includes(taskTitle.toLowerCase()));
      
      if (!task) {
        return { success: false, error: `Tarefa "${taskTitle}" não encontrada` };
      }

      const completeResponse = await this.googleService.completeTask(task.id!, defaultTaskList.id!);
      
      if (!completeResponse.success) {
        return { success: false, error: 'Erro ao marcar tarefa como concluída' };
      }

      return {
        success: true,
        data: task,
        message: `Tarefa "${task.title}" marcada como concluída`
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  // === FERRAMENTAS COMBINADAS ===

  async getDayOverview(): Promise<AIToolResult> {
    try {
      const eventsResult = await this.getTodayEvents();
      const tasksResult = await this.getTasks();

      const overview = {
        date: new Date().toLocaleDateString('pt-BR'),
        events: eventsResult.success ? eventsResult.data : [],
        tasks: tasksResult.success ? tasksResult.data?.pending : [],
        summary: {
          totalEvents: eventsResult.success ? eventsResult.data?.length || 0 : 0,
          pendingTasks: tasksResult.success ? tasksResult.data?.pending?.length || 0 : 0
        }
      };

      return {
        success: true,
        data: overview,
        message: `Resumo do dia: ${overview.summary.totalEvents} eventos e ${overview.summary.pendingTasks} tarefas pendentes`
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  // === TOOLS REGISTRY ===

  getToolsDefinitions() {
    return [
      {
        name: 'get_today_events',
        description: 'Obtém os eventos do calendário para hoje',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'get_upcoming_events',
        description: 'Obtém eventos futuros do calendário',
        parameters: {
          type: 'object',
          properties: {
            days: {
              type: 'number',
              description: 'Número de dias para buscar (padrão: 7)',
              default: 7
            }
          },
          required: []
        }
      },
      {
        name: 'create_calendar_event',
        description: 'Cria um novo evento no calendário',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Título do evento'
            },
            description: {
              type: 'string',
              description: 'Descrição do evento'
            },
            startTime: {
              type: 'string',
              description: 'Data/hora de início (ISO 8601)'
            },
            endTime: {
              type: 'string',
              description: 'Data/hora de fim (ISO 8601)'
            },
            location: {
              type: 'string',
              description: 'Local do evento (opcional)'
            }
          },
          required: ['title', 'startTime', 'endTime']
        }
      },
      {
        name: 'get_tasks',
        description: 'Obtém todas as tarefas do Google Tasks',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'create_task',
        description: 'Cria uma nova tarefa no Google Tasks',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Título da tarefa'
            },
            description: {
              type: 'string',
              description: 'Descrição da tarefa (opcional)'
            },
            dueDate: {
              type: 'string',
              description: 'Data de vencimento (ISO 8601, opcional)'
            }
          },
          required: ['title']
        }
      },
      {
        name: 'complete_task',
        description: 'Marca uma tarefa como concluída',
        parameters: {
          type: 'object',
          properties: {
            taskTitle: {
              type: 'string',
              description: 'Título da tarefa para buscar e marcar como concluída'
            }
          },
          required: ['taskTitle']
        }
      },
      {
        name: 'get_day_overview',
        description: 'Obtém um resumo completo do dia com eventos e tarefas',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ];
  }

  async executeTool(toolName: string, parameters: any): Promise<AIToolResult> {
    switch (toolName) {
      case 'get_today_events':
        return this.getTodayEvents();
      
      case 'get_upcoming_events':
        return this.getUpcomingEvents(parameters.days);
      
      case 'create_calendar_event':
        return this.createEvent(
          parameters.title,
          parameters.description || '',
          parameters.startTime,
          parameters.endTime,
          parameters.location
        );
      
      case 'get_tasks':
        return this.getTasks();
      
      case 'create_task':
        return this.createTask(
          parameters.title,
          parameters.description,
          parameters.dueDate
        );
      
      case 'complete_task':
        return this.completeTask(parameters.taskTitle);
      
      case 'get_day_overview':
        return this.getDayOverview();
      
      default:
        return { success: false, error: `Ferramenta "${toolName}" não encontrada` };
    }
  }
} 