import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface Task {
  id: string;
  title: string;
  description: string;
  originalInput: string;
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  urgency: number; // 1-10
  ease: number; // 1-10 (facilidade)
  estimatedTime: string; // "30min", "2h", "1d", etc.
  category: string;
  tags: string[];
  status: 'pendente' | 'em_progresso' | 'concluida' | 'cancelada';
  createdAt: number;
  dueDate?: number;
  completedAt?: number;
  // Controle de tempo
  timeTracking: {
    totalTimeSpent: number; // tempo total gasto em milissegundos
    sessions: TimeSession[]; // sessões de trabalho
    isTimerRunning: boolean; // se o cronômetro está rodando
    currentSessionStart?: number; // início da sessão atual
  };
  aiAnalysis: {
    complexity: string;
    suggestedApproach: string;
    prerequisites: string[];
    timeEstimate: string;
    riskFactors: string[];
  };
}

export interface TimeSession {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // duração em milissegundos
  notes?: string; // anotações da sessão
}

export interface TaskAnalysis {
  title: string;
  description: string;
  urgency: number;
  ease: number;
  estimatedTime: string;
  category: string;
  tags: string[];
  dueDate?: number;
  complexity: string;
  suggestedApproach: string;
  prerequisites: string[];
  riskFactors: string[];
}

export interface TaskServiceResponse {
  success: boolean;
  task?: Task;
  tasks?: Task[];
  error?: string;
}

class TaskService {
  private tasks: Map<string, Task> = new Map();
  private aiManager: any | null = null; // Temporariamente como any para evitar circular import
  private dataPath: string;

  constructor() {
    this.dataPath = path.join(app.getPath('userData'), 'tasks.json');
    this.loadTasks();
    this.migrateTasksForTimeTracking(); // Migrar tarefas existentes
  }

  setAIManager(aiManager: any) {
    this.aiManager = aiManager;
  }

  private loadTasks(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf-8');
        const tasksArray: Task[] = JSON.parse(data);
        this.tasks.clear();
        tasksArray.forEach(task => {
          this.tasks.set(task.id, task);
        });
        console.log(`Carregadas ${tasksArray.length} tarefas do disco`);
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    }
  }

  private saveTasks(): void {
    try {
      const tasksArray = Array.from(this.tasks.values());
      fs.writeFileSync(this.dataPath, JSON.stringify(tasksArray, null, 2), 'utf-8');
      console.log(`Salvadas ${tasksArray.length} tarefas no disco`);
    } catch (error) {
      console.error('Erro ao salvar tarefas:', error);
    }
  }

  async analyzeTaskWithAI(input: string): Promise<TaskAnalysis> {
    console.log('🔧 [analyzeTaskWithAI] Verificando AI Manager...');
    if (!this.aiManager) {
      console.error('❌ [analyzeTaskWithAI] IA não configurada');
      throw new Error('IA não configurada');
    }
    console.log('✅ [analyzeTaskWithAI] AI Manager disponível, processando...');

    const prompt = `
Analise a seguinte tarefa descrita em linguagem natural e extraia informações estruturadas:

TAREFA: "${input}"

Retorne APENAS um JSON válido com a seguinte estrutura:
{
  "title": "título claro e conciso da tarefa",
  "description": "descrição detalhada do que precisa ser feito",
  "urgency": número de 1-10 (quão urgente é),
  "ease": número de 1-10 (quão fácil é de fazer, 10 = muito fácil),
  "estimatedTime": "tempo estimado (ex: 30min, 2h, 1d)",
  "category": "categoria da tarefa (trabalho, pessoal, estudo, projeto, etc)",
  "tags": ["tag1", "tag2", "tag3"],
  "dueDate": timestamp em ms se houver prazo mencionado ou null,
  "complexity": "descrição da complexidade (baixa/média/alta)",
  "suggestedApproach": "sugestão de como abordar a tarefa",
  "prerequisites": ["pré-requisito1", "pré-requisito2"],
  "riskFactors": ["risco1", "risco2"]
}

Considere:
- Urgência: palavras como "urgente", "hoje", "amanhã", prazos específicos
- Facilidade: complexidade técnica, tempo necessário, recursos necessários
- Categoria: contexto da tarefa (trabalho, pessoal, etc)
- Tags: palavras-chave relevantes
- Prazo: extraia datas/horários mencionados

Seja preciso e objetivo. Retorne apenas o JSON. Retorne o JSON em uma linha e puro, sem formatação em markdown.`;

    try {
      const response = await this.aiManager.processCommand(prompt);
      const analysis = JSON.parse(response.replace(/^```json\n/, '').replace(/\n```$/, ''));
      
      // Validar e normalizar dados
      return {
        title: analysis.title || input.slice(0, 50),
        description: analysis.description || input,
        urgency: Math.max(1, Math.min(10, analysis.urgency || 5)),
        ease: Math.max(1, Math.min(10, analysis.ease || 5)),
        estimatedTime: analysis.estimatedTime || '1h',
        category: analysis.category || 'geral',
        tags: Array.isArray(analysis.tags) ? analysis.tags : [],
        dueDate: analysis.dueDate || undefined,
        complexity: analysis.complexity || 'média',
        suggestedApproach: analysis.suggestedApproach || 'Começar passo a passo',
        prerequisites: Array.isArray(analysis.prerequisites) ? analysis.prerequisites : [],
        riskFactors: Array.isArray(analysis.riskFactors) ? analysis.riskFactors : []
      };
    } catch (error) {
      console.error('Erro ao analisar tarefa com IA:', error);
      
      // Fallback: análise básica sem IA
      return {
        title: input.slice(0, 50),
        description: input,
        urgency: 5,
        ease: 5,
        estimatedTime: '1h',
        category: 'geral',
        tags: [],
        complexity: 'média',
        suggestedApproach: 'Começar passo a passo',
        prerequisites: [],
        riskFactors: []
      };
    }
  }

  calculatePriority(urgency: number, ease: number): 'baixa' | 'media' | 'alta' | 'critica' {
    // Matriz de priorização: Urgência vs Facilidade
    // Alta urgência + Alta facilidade = Crítica (fazer agora)
    // Alta urgência + Baixa facilidade = Alta (importante mas difícil)
    // Baixa urgência + Alta facilidade = Média (quick wins)
    // Baixa urgência + Baixa facilidade = Baixa (evitar/delegar)
    
    const priorityScore = (urgency * 0.7) + (ease * 0.3);
    
    if (urgency >= 8 && ease >= 7) return 'critica';
    if (urgency >= 7 || priorityScore >= 8) return 'alta';
    if (ease >= 7 || priorityScore >= 6) return 'media';
    return 'baixa';
  }

  async addTask(input: string): Promise<TaskServiceResponse> {
    try {
      console.log('🔧 [TaskService.addTask] Iniciando criação de tarefa:', input);
      console.log('🔧 [TaskService.addTask] AI Manager disponível:', !!this.aiManager);
      
      const analysis = await this.analyzeTaskWithAI(input);
      console.log('✅ [TaskService.addTask] Análise de IA concluída:', analysis);
      
      const priority = this.calculatePriority(analysis.urgency, analysis.ease);
      
      const task: Task = {
        id: Date.now().toString(),
        title: analysis.title,
        description: analysis.description,
        originalInput: input,
        priority,
        urgency: analysis.urgency,
        ease: analysis.ease,
        estimatedTime: analysis.estimatedTime,
        category: analysis.category,
        tags: analysis.tags,
        status: 'pendente',
        createdAt: Date.now(),
        dueDate: analysis.dueDate,
        timeTracking: {
          totalTimeSpent: 0,
          sessions: [],
          isTimerRunning: false
        },
        aiAnalysis: {
          complexity: analysis.complexity,
          suggestedApproach: analysis.suggestedApproach,
          prerequisites: analysis.prerequisites,
          timeEstimate: analysis.estimatedTime,
          riskFactors: analysis.riskFactors
        }
      };

      this.tasks.set(task.id, task);
      this.saveTasks(); // Salvar após adicionar
      
      return {
        success: true,
        task
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Erro ao adicionar tarefa'
      };
    }
  }

  async updateTaskStatus(taskId: string, status: Task['status']): Promise<TaskServiceResponse> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return {
        success: false,
        error: 'Tarefa não encontrada'
      };
    }

    task.status = status;
    if (status === 'concluida') {
      task.completedAt = Date.now();
    }

    this.tasks.set(taskId, task);
    this.saveTasks(); // Salvar após atualizar
    
    return {
      success: true,
      task
    };
  }

  async deleteTask(taskId: string): Promise<TaskServiceResponse> {
    const deleted = this.tasks.delete(taskId);
    if (deleted) {
      this.saveTasks(); // Salvar após deletar
    }
    
    return {
      success: deleted,
      error: deleted ? undefined : 'Tarefa não encontrada'
    };
  }

  getTasks(filter?: {
    status?: Task['status'];
    priority?: Task['priority'];
    category?: string;
  }): TaskServiceResponse {
    let tasks = Array.from(this.tasks.values());

    // Aplicar filtros
    if (filter) {
      if (filter.status) {
        tasks = tasks.filter(task => task.status === filter.status);
      }
      if (filter.priority) {
        tasks = tasks.filter(task => task.priority === filter.priority);
      }
      if (filter.category) {
        tasks = tasks.filter(task => task.category === filter.category);
      }
    }

    // Ordenar por prioridade e urgência
    tasks.sort((a, b) => {
      const priorityOrder = { 'critica': 4, 'alta': 3, 'media': 2, 'baixa': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Se mesma prioridade, ordenar por urgência
      const urgencyDiff = b.urgency - a.urgency;
      if (urgencyDiff !== 0) return urgencyDiff;
      
      // Se mesma urgência, ordenar por facilidade (mais fácil primeiro)
      return b.ease - a.ease;
    });

    return {
      success: true,
      tasks
    };
  }

  async getTaskSuggestions(): Promise<TaskServiceResponse> {
    if (!this.aiManager) {
      return {
        success: false,
        error: 'IA não configurada'
      };
    }

    const tasks = Array.from(this.tasks.values());
    const pendingTasks = tasks.filter(task => task.status === 'pendente');
    
    if (pendingTasks.length === 0) {
      return {
        success: true,
        tasks: []
      };
    }

    const prompt = `
Analise as seguintes tarefas pendentes e sugira uma ordem de execução otimizada:

TAREFAS:
${pendingTasks.map(task => `
- ${task.title}
  Urgência: ${task.urgency}/10
  Facilidade: ${task.ease}/10
  Categoria: ${task.category}
  Prazo: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'sem prazo'}
  Tempo estimado: ${task.estimatedTime}
`).join('\n')}

Considere:
1. Urgência vs facilidade
2. Prazos próximos
3. Sequência lógica de dependências
4. Eficiência energética (intercalar tarefas difíceis com fáceis)

Retorne as tarefas reordenadas por prioridade de execução.
`;

    try {
      const suggestions = await this.aiManager.processCommand(prompt);
      
      // Para este exemplo, vamos retornar as tarefas ordenadas por prioridade simples
      const sortedTasks = pendingTasks.sort((a, b) => {
        // Primeiro por urgência, depois por facilidade
        if (a.urgency !== b.urgency) return b.urgency - a.urgency;
        return b.ease - a.ease;
      });

      return {
        success: true,
        tasks: sortedTasks.slice(0, 5) // Top 5 sugestões
      };
    } catch (error) {
      return {
        success: false,
        error: 'Erro ao obter sugestões de tarefas'
      };
    }
  }

  getTaskStats() {
    const tasks = Array.from(this.tasks.values());
    
    return {
      total: tasks.length,
      pendentes: tasks.filter(t => t.status === 'pendente').length,
      emProgresso: tasks.filter(t => t.status === 'em_progresso').length,
      concluidas: tasks.filter(t => t.status === 'concluida').length,
      porPrioridade: {
        critica: tasks.filter(t => t.priority === 'critica').length,
        alta: tasks.filter(t => t.priority === 'alta').length,
        media: tasks.filter(t => t.priority === 'media').length,
        baixa: tasks.filter(t => t.priority === 'baixa').length
      },
      porCategoria: tasks.reduce((acc, task) => {
        acc[task.category] = (acc[task.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  clearCompletedTasks(): TaskServiceResponse {
    const tasksToDelete: string[] = [];
    
    this.tasks.forEach((task, id) => {
      if (task.status === 'concluida') {
        tasksToDelete.push(id);
      }
    });

    tasksToDelete.forEach(id => this.tasks.delete(id));
    if (tasksToDelete.length > 0) {
      this.saveTasks(); // Salvar após limpar
    }

    return {
      success: true,
      error: `${tasksToDelete.length} tarefas concluídas removidas`
    };
  }

  // === CONTROLE DE TEMPO ===

  async startTaskTimer(taskId: string): Promise<TaskServiceResponse> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return {
        success: false,
        error: 'Tarefa não encontrada'
      };
    }

    if (task.timeTracking.isTimerRunning) {
      return {
        success: false,
        error: 'Cronômetro já está rodando para esta tarefa'
      };
    }

    // Parar qualquer outro cronômetro em execução
    this.tasks.forEach((otherTask) => {
      if (otherTask.timeTracking.isTimerRunning) {
        this.pauseTaskTimer(otherTask.id);
      }
    });

    task.timeTracking.isTimerRunning = true;
    task.timeTracking.currentSessionStart = Date.now();
    
    // Atualizar status para "em_progresso" se estiver pendente
    if (task.status === 'pendente') {
      task.status = 'em_progresso';
    }

    this.tasks.set(taskId, task);
    this.saveTasks();

    return {
      success: true,
      task
    };
  }

  async pauseTaskTimer(taskId: string): Promise<TaskServiceResponse> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return {
        success: false,
        error: 'Tarefa não encontrada'
      };
    }

    if (!task.timeTracking.isTimerRunning || !task.timeTracking.currentSessionStart) {
      return {
        success: false,
        error: 'Cronômetro não está rodando para esta tarefa'
      };
    }

    const now = Date.now();
    const sessionDuration = now - task.timeTracking.currentSessionStart;

    // Criar nova sessão
    const session: TimeSession = {
      id: Date.now().toString(),
      startTime: task.timeTracking.currentSessionStart,
      endTime: now,
      duration: sessionDuration
    };

    task.timeTracking.sessions.push(session);
    task.timeTracking.totalTimeSpent += sessionDuration;
    task.timeTracking.isTimerRunning = false;
    task.timeTracking.currentSessionStart = undefined;

    this.tasks.set(taskId, task);
    this.saveTasks();

    return {
      success: true,
      task
    };
  }

  async stopTaskTimer(taskId: string): Promise<TaskServiceResponse> {
    // Pausar o cronômetro primeiro
    const pauseResult = await this.pauseTaskTimer(taskId);
    if (!pauseResult.success) {
      return pauseResult;
    }

    const task = this.tasks.get(taskId);
    if (!task) {
      return {
        success: false,
        error: 'Tarefa não encontrada'
      };
    }

    return {
      success: true,
      task
    };
  }

  async addTimeSessionNote(taskId: string, sessionId: string, notes: string): Promise<TaskServiceResponse> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return {
        success: false,
        error: 'Tarefa não encontrada'
      };
    }

    const session = task.timeTracking.sessions.find(s => s.id === sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Sessão não encontrada'
      };
    }

    session.notes = notes;
    this.tasks.set(taskId, task);
    this.saveTasks();

    return {
      success: true,
      task
    };
  }

  getTaskTimeStats(taskId: string): TaskServiceResponse {
    const task = this.tasks.get(taskId);
    if (!task) {
      return {
        success: false,
        error: 'Tarefa não encontrada'
      };
    }

    const timeStats = {
      totalTimeSpent: task.timeTracking.totalTimeSpent,
      totalSessions: task.timeTracking.sessions.length,
      averageSessionTime: task.timeTracking.sessions.length > 0 
        ? task.timeTracking.totalTimeSpent / task.timeTracking.sessions.length 
        : 0,
      isTimerRunning: task.timeTracking.isTimerRunning,
      currentSessionDuration: task.timeTracking.isTimerRunning && task.timeTracking.currentSessionStart
        ? Date.now() - task.timeTracking.currentSessionStart
        : 0,
      sessions: task.timeTracking.sessions
    };

    return {
      success: true,
      error: JSON.stringify(timeStats) // Usando error field para retornar dados
    };
  }

  // Método para migrar tarefas existentes (adicionar campos de tempo)
  private migrateTasksForTimeTracking(): void {
    let migrated = false;
    
    this.tasks.forEach((task, id) => {
      if (!task.timeTracking) {
        task.timeTracking = {
          totalTimeSpent: 0,
          sessions: [],
          isTimerRunning: false
        };
        this.tasks.set(id, task);
        migrated = true;
      }
    });

    if (migrated) {
      this.saveTasks();
      console.log('Tarefas migradas para incluir controle de tempo');
    }
  }
}

export const taskService = new TaskService(); 