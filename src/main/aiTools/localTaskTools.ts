import { Task } from '../taskService';
import { AIToolResult } from './googleCalendarTools';

// Interface para o TaskService (será injetado)
interface TaskServiceInterface {
  getTasks(filter?: { status?: Task['status']; priority?: Task['priority']; category?: string }): { success: boolean; tasks?: Task[] };
  addTask(input: string): Promise<{ success: boolean; task?: Task; error?: string }>;
  updateTaskStatus(taskId: string, status: Task['status']): Promise<{ success: boolean; error?: string }>;
  deleteTask(taskId: string): Promise<{ success: boolean; error?: string }>;
  getTaskStats(): any; // Interface simplificada para compatibilidade
}

export class LocalTaskTools {
  private taskService: TaskServiceInterface;

  constructor(taskService: TaskServiceInterface) {
    this.taskService = taskService;
  }

  // === FERRAMENTAS DE TAREFAS LOCAIS ===

  async getLocalTasks(filter?: { status?: string; priority?: string; category?: string }): Promise<AIToolResult> {
    try {
      const taskFilter: any = {};
      
      if (filter?.status) {
        taskFilter.status = filter.status as Task['status'];
      }
      if (filter?.priority) {
        taskFilter.priority = filter.priority as Task['priority'];
      }
      if (filter?.category) {
        taskFilter.category = filter.category;
      }

      const response = this.taskService.getTasks(taskFilter);
      
      if (!response.success) {
        return { success: false, error: 'Erro ao obter tarefas locais' };
      }

      const tasks = response.tasks || [];
      const pendingTasks = tasks.filter(task => task.status === 'pendente' || task.status === 'em_progresso');
      const completedTasks = tasks.filter(task => task.status === 'concluida');

      return {
        success: true,
        data: {
          all: tasks,
          pending: pendingTasks,
          completed: completedTasks,
          summary: {
            total: tasks.length,
            pending: pendingTasks.length,
            completed: completedTasks.length
          }
        },
        message: `Encontradas ${tasks.length} tarefas (${pendingTasks.length} pendentes, ${completedTasks.length} concluídas)`
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  async createLocalTask(input: string): Promise<AIToolResult> {
    try {
      const response = await this.taskService.addTask(input);
      
      if (!response.success) {
        return { success: false, error: response.error || 'Erro ao criar tarefa' };
      }

      return {
        success: true,
        data: response.task,
        message: `Tarefa "${response.task?.title}" criada com sucesso`
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  async completeLocalTask(taskTitle: string): Promise<AIToolResult> {
    try {
      const tasksResponse = this.taskService.getTasks();
      
      if (!tasksResponse.success) {
        return { success: false, error: 'Erro ao obter tarefas' };
      }

      const tasks = tasksResponse.tasks || [];
      const task = tasks.find(t => 
        t.title.toLowerCase().includes(taskTitle.toLowerCase()) ||
        t.originalInput.toLowerCase().includes(taskTitle.toLowerCase())
      );
      
      if (!task) {
        return { success: false, error: `Tarefa "${taskTitle}" não encontrada` };
      }

      const updateResponse = await this.taskService.updateTaskStatus(task.id, 'concluida');
      
      if (!updateResponse.success) {
        return { success: false, error: updateResponse.error || 'Erro ao marcar tarefa como concluída' };
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

  async deleteLocalTask(taskTitle: string): Promise<AIToolResult> {
    try {
      const tasksResponse = this.taskService.getTasks();
      
      if (!tasksResponse.success) {
        return { success: false, error: 'Erro ao obter tarefas' };
      }

      const tasks = tasksResponse.tasks || [];
      const task = tasks.find(t => 
        t.title.toLowerCase().includes(taskTitle.toLowerCase()) ||
        t.originalInput.toLowerCase().includes(taskTitle.toLowerCase())
      );
      
      if (!task) {
        return { success: false, error: `Tarefa "${taskTitle}" não encontrada` };
      }

      const deleteResponse = await this.taskService.deleteTask(task.id);
      
      if (!deleteResponse.success) {
        return { success: false, error: deleteResponse.error || 'Erro ao excluir tarefa' };
      }

      return {
        success: true,
        data: task,
        message: `Tarefa "${task.title}" excluída com sucesso`
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  async getTaskStats(): Promise<AIToolResult> {
    try {
      const stats = this.taskService.getTaskStats();

      return {
        success: true,
        data: stats,
        message: 'Estatísticas de tarefas obtidas com sucesso'
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  async getPendingTasks(): Promise<AIToolResult> {
    return this.getLocalTasks({ status: 'pendente' });
  }

  async getTasksByCategory(category: string): Promise<AIToolResult> {
    return this.getLocalTasks({ category });
  }

  async getHighPriorityTasks(): Promise<AIToolResult> {
    const result = await this.getLocalTasks();
    
    if (!result.success || !result.data) {
      return result;
    }

    const highPriorityTasks = result.data.all.filter((task: Task) => 
      task.priority === 'alta' || task.priority === 'critica'
    );

    return {
      success: true,
      data: highPriorityTasks,
      message: `Encontradas ${highPriorityTasks.length} tarefas de alta prioridade`
    };
  }

  // === TOOLS REGISTRY ===

  getToolsDefinitions() {
    return [
      {
        name: 'get_local_tasks',
        description: 'Obtém tarefas locais do sistema com filtros opcionais',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filtrar por status (pendente, em_progresso, concluida, cancelada)',
              enum: ['pendente', 'em_progresso', 'concluida', 'cancelada']
            },
            priority: {
              type: 'string',
              description: 'Filtrar por prioridade (baixa, media, alta, critica)',
              enum: ['baixa', 'media', 'alta', 'critica']
            },
            category: {
              type: 'string',
              description: 'Filtrar por categoria'
            }
          },
          required: []
        }
      },
      {
        name: 'create_local_task',
        description: 'Cria uma nova tarefa local usando IA para análise',
        parameters: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'Descrição da tarefa em linguagem natural'
            }
          },
          required: ['input']
        }
      },
      {
        name: 'complete_local_task',
        description: 'Marca uma tarefa local como concluída',
        parameters: {
          type: 'object',
          properties: {
            taskTitle: {
              type: 'string',
              description: 'Título ou parte do título da tarefa para buscar'
            }
          },
          required: ['taskTitle']
        }
      },
      {
        name: 'delete_local_task',
        description: 'Exclui uma tarefa local',
        parameters: {
          type: 'object',
          properties: {
            taskTitle: {
              type: 'string',
              description: 'Título ou parte do título da tarefa para excluir'
            }
          },
          required: ['taskTitle']
        }
      },
      {
        name: 'get_task_stats',
        description: 'Obtém estatísticas detalhadas das tarefas locais',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'get_pending_tasks',
        description: 'Obtém apenas as tarefas pendentes',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'get_tasks_by_category',
        description: 'Obtém tarefas de uma categoria específica',
        parameters: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Nome da categoria (trabalho, pessoal, estudo, etc.)'
            }
          },
          required: ['category']
        }
      },
      {
        name: 'get_high_priority_tasks',
        description: 'Obtém tarefas de alta prioridade (alta e crítica)',
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
      case 'get_local_tasks':
        return this.getLocalTasks(parameters);
      
      case 'create_local_task':
        return this.createLocalTask(parameters.input);
      
      case 'complete_local_task':
        return this.completeLocalTask(parameters.taskTitle);
      
      case 'delete_local_task':
        return this.deleteLocalTask(parameters.taskTitle);
      
      case 'get_task_stats':
        return this.getTaskStats();
      
      case 'get_pending_tasks':
        return this.getPendingTasks();
      
      case 'get_tasks_by_category':
        return this.getTasksByCategory(parameters.category);
      
      case 'get_high_priority_tasks':
        return this.getHighPriorityTasks();
      
      default:
        return { success: false, error: `Ferramenta "${toolName}" não encontrada` };
    }
  }
} 