import React, { useState, useEffect } from 'react';
import './TaskManager.css';
import { 
  MdChecklist, 
  MdMemory, 
  MdAnalytics, 
  MdClose, 
  MdDelete, 
  MdWarning, 
  MdNote, 
  MdAccessTime, 
  MdPlayArrow, 
  MdPause, 
  MdStop, 
  MdHourglassEmpty, 
  MdLightbulb,
  MdPriorityHigh,
  MdKeyboardArrowUp,
  MdCheckCircle,
  MdRefresh,
  MdFolder,
  MdSchedule,
  MdLoop
} from 'react-icons/md';

interface Task {
  id: string;
  title: string;
  description: string;
  originalInput: string;
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  urgency: number;
  ease: number;
  estimatedTime: string;
  category: string;
  tags: string[];
  status: 'pendente' | 'em_progresso' | 'concluida' | 'cancelada';
  createdAt: number;
  dueDate?: number;
  completedAt?: number;
  // Controle de tempo
  timeTracking: {
    totalTimeSpent: number;
    sessions: TimeSession[];
    isTimerRunning: boolean;
    currentSessionStart?: number;
  };
  aiAnalysis: {
    complexity: string;
    suggestedApproach: string;
    prerequisites: string[];
    timeEstimate: string;
    riskFactors: string[];
  };
}

interface TimeSession {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  notes?: string;
}

interface TaskManagerProps {
  isVisible: boolean;
  onClose: () => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({ isVisible, onClose }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [savingInsight, setSavingInsight] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      loadTasks();
      loadStats();
    }
  }, [isVisible]);

  // Atualizar tempo atual a cada segundo para cronômetros ativos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const filterObj = filter === 'all' ? undefined : 
                       filter === 'pending' ? { status: 'pendente' } :
                       filter === 'progress' ? { status: 'em_progresso' } :
                       filter === 'completed' ? { status: 'concluida' } :
                       { priority: filter };

      const result = await window.electronAPI.getTasks(filterObj);
      
      if (result.success && result.tasks) {
        setTasks(result.tasks);
      } else {
        setError(result.error || 'Erro ao carregar tarefas');
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await window.electronAPI.getTaskStats();
      
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const result = await window.electronAPI.updateTaskStatus(taskId, status);
      
      if (result.success) {
        await loadTasks();
        await loadStats();
      } else {
        setError(result.error || 'Erro ao atualizar tarefa');
      }
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      setError('Erro de conexão');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
      const result = await window.electronAPI.deleteTask(taskId);
      
      if (result.success) {
        await loadTasks();
        await loadStats();
      } else {
        setError(result.error || 'Erro ao excluir tarefa');
      }
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      setError('Erro de conexão');
    }
  };

  const getSuggestions = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getTaskSuggestions();
      
      if (result.success) {
        setSuggestions(result.error || 'Nenhuma sugestão disponível'); // error field contains suggestions
        setShowSuggestions(true);
      } else {
        setError(result.error || 'Erro ao obter sugestões');
      }
    } catch (error) {
      console.error('Erro ao obter sugestões:', error);
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const clearCompleted = async () => {
    try {
      const result = await window.electronAPI.clearCompletedTasks();
      
      if (result.success) {
        await loadTasks();
        await loadStats();
      } else {
        setError(result.error || 'Erro ao limpar tarefas');
      }
    } catch (error) {
      console.error('Erro ao limpar tarefas:', error);
      setError('Erro de conexão');
    }
  };

  const saveTaskInsight = async (task: Task) => {
    setSavingInsight(task.id);
    
    try {
      // Criar conteúdo estruturado para o insight da tarefa
      const timeSpentFormatted = formatDuration(task.timeTracking.totalTimeSpent);
      const completedAt = task.completedAt ? new Date(task.completedAt).toLocaleDateString('pt-BR') : 'N/A';
      
      const content = `**Tarefa Concluída: ${task.title}**

**Descrição:**
${task.description}

**Análise da IA:**
- **Complexidade:** ${task.aiAnalysis.complexity}
- **Abordagem Sugerida:** ${task.aiAnalysis.suggestedApproach}
- **Pré-requisitos:** ${task.aiAnalysis.prerequisites.join(', ') || 'Nenhum'}
- **Fatores de Risco:** ${task.aiAnalysis.riskFactors.join(', ') || 'Nenhum'}

**Execução:**
- **Prioridade:** ${task.priority.toUpperCase()}
- **Categoria:** ${task.category}
- **Tempo Estimado:** ${task.aiAnalysis.timeEstimate}
- **Tempo Real Gasto:** ${timeSpentFormatted}
- **Data de Conclusão:** ${completedAt}

**Sessões de Trabalho:**
${task.timeTracking.sessions.map((session, index) => 
  `${index + 1}. ${formatDuration(session.duration)}${session.notes ? ` - ${session.notes}` : ''}`
).join('\n') || 'Nenhuma sessão registrada'}

**Tags:** ${task.tags.join(', ') || 'Nenhuma'}`;

      const tags = [
        'tarefa-concluída',
        'insight',
        'produtividade',
        task.category,
        task.priority,
        ...task.tags
      ];

      const result = await window.electronAPI.addKnowledgeItem({
        title: `Insight: ${task.title}`,
        content,
        type: 'note',
        tags,
        url: undefined
      });

      if (result.success) {
        alert('✅ Insight da tarefa salvo no repositório de conhecimento!');
      } else {
        alert(`❌ Erro ao salvar insight: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar insight:', error);
      alert('❌ Erro ao salvar insight. Verifique sua configuração.');
    } finally {
      setSavingInsight(null);
    }
  };

  const startTimer = async (taskId: string) => {
    try {
      const result = await window.electronAPI.startTaskTimer(taskId);
      
      if (result.success) {
        await loadTasks();
      } else {
        setError(result.error || 'Erro ao iniciar cronômetro');
      }
    } catch (error) {
      console.error('Erro ao iniciar cronômetro:', error);
      setError('Erro de conexão');
    }
  };

  const pauseTimer = async (taskId: string) => {
    try {
      const result = await window.electronAPI.pauseTaskTimer(taskId);
      
      if (result.success) {
        await loadTasks();
      } else {
        setError(result.error || 'Erro ao pausar cronômetro');
      }
    } catch (error) {
      console.error('Erro ao pausar cronômetro:', error);
      setError('Erro de conexão');
    }
  };

  const stopTimer = async (taskId: string) => {
    try {
      const result = await window.electronAPI.stopTaskTimer(taskId);
      
      if (result.success) {
        await loadTasks();
      } else {
        setError(result.error || 'Erro ao parar cronômetro');
      }
    } catch (error) {
      console.error('Erro ao parar cronômetro:', error);
      setError('Erro de conexão');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critica': return '🔴';
      case 'alta': return '🟠';
      case 'media': return '🟡';
      case 'baixa': return '🟢';
      default: return '⚪';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return '⏳';
      case 'em_progresso': return '🔄';
      case 'concluida': return '✅';
      case 'cancelada': return '❌';
      default: return '❓';
    }
  };

  const formatTime = (timestamp: number) => {
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days === 0) return 'hoje';
    if (days === 1) return 'ontem';
    return `${days}d atrás`;
  };

  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getCurrentSessionDuration = (task: Task) => {
    if (!task.timeTracking.isTimerRunning || !task.timeTracking.currentSessionStart) {
      return 0;
    }
    return currentTime - task.timeTracking.currentSessionStart;
  };

  const getTotalTimeWithCurrent = (task: Task) => {
    return task.timeTracking.totalTimeSpent + getCurrentSessionDuration(task);
  };

  if (!isVisible) return null;

  return (
    <div className="task-manager-overlay">
      <div className="task-manager">
        <div className="task-manager-header">
          <div className="task-manager-title">
            <span className="title-icon"><MdChecklist /></span>
            <h3>Organizador de Tarefas</h3>
            <span className="subtitle">Gerenciado por IA</span>
          </div>
          
          <div className="task-manager-controls">
            <button 
              className="suggestions-btn"
              onClick={getSuggestions}
              disabled={loading || tasks.length === 0}
              title="Obter sugestões da IA"
            >
              <MdMemory />
            </button>
            <button 
              className="stats-btn"
              onClick={loadStats}
              title="Atualizar estatísticas"
            >
              <MdAnalytics />
            </button>
            <button 
              className="refresh-btn"
              onClick={loadTasks}
              disabled={loading}
              title="Atualizar tarefas"
            >
              ↻
            </button>
            <button 
              className="close-btn"
              onClick={onClose}
              title="Fechar organizador"
            >
              <MdClose />
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="task-stats">
            <div className="stat-item">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.pendentes}</span>
              <span className="stat-label">Pendentes</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.emProgresso}</span>
              <span className="stat-label">Em Progresso</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.concluidas}</span>
              <span className="stat-label">Concluídas</span>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="task-filters">
          {[
            { key: 'all', label: 'Todas', icon: <MdChecklist /> },
                          { key: 'pending', label: 'Pendentes', icon: <MdHourglassEmpty /> },
              { key: 'progress', label: 'Em Progresso', icon: <MdLoop /> },
              { key: 'completed', label: 'Concluídas', icon: <MdCheckCircle /> },
              { key: 'critica', label: 'Críticas', icon: <MdPriorityHigh style={{ color: '#f44336' }} /> },
              { key: 'alta', label: 'Alta', icon: <MdKeyboardArrowUp style={{ color: '#ff9800' }} /> }
          ].map(filterOption => (
            <button
              key={filterOption.key}
              className={`filter-btn ${filter === filterOption.key ? 'active' : ''}`}
              onClick={() => {
                setFilter(filterOption.key);
                setTimeout(loadTasks, 100);
              }}
            >
              <span className="filter-icon">{filterOption.icon}</span>
              <span className="filter-label">{filterOption.label}</span>
            </button>
          ))}
          
          {stats?.concluidas > 0 && (
            <button
              className="clear-completed-btn"
              onClick={clearCompleted}
              title="Limpar tarefas concluídas"
            >
              <MdDelete /> Limpar
            </button>
          )}
        </div>

        {/* Lista de tarefas */}
        <div className="task-manager-content">
          {loading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Carregando tarefas...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <span className="error-icon"><MdWarning /></span>
              <p>{error}</p>
              <button onClick={loadTasks} className="retry-btn">
                Tentar Novamente
              </button>
            </div>
          )}

          {!loading && !error && tasks.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon"><MdNote /></span>
              <p>Nenhuma tarefa encontrada</p>
              <p className="empty-hint">
                Adicione uma tarefa descrevendo-a em linguagem natural!
              </p>
            </div>
          )}

          {!loading && !error && tasks.length > 0 && (
            <div className="tasks-list">
              {tasks.map(task => (
                <div 
                  key={task.id}
                  className={`task-item priority-${task.priority} status-${task.status}`}
                >
                  <div className="task-item-header">
                    <div className="task-priority">
                      <span className="priority-icon">{getPriorityIcon(task.priority)}</span>
                      <span className="priority-label">{task.priority.toUpperCase()}</span>
                    </div>
                    <div className="task-status">
                      <span className="status-icon">{getStatusIcon(task.status)}</span>
                      <span className="status-label">{task.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  <h4 className="task-title">{task.title}</h4>
                  
                  {task.description && task.description !== task.title && (
                    <p className="task-description">{task.description}</p>
                  )}
                  
                  <div className="task-metrics">
                    <div className="metric">
                      <span className="metric-label">Urgência:</span>
                      <div className="metric-bar">
                        <div 
                          className="metric-fill urgency" 
                          style={{ width: `${task.urgency * 10}%` }}
                        ></div>
                      </div>
                      <span className="metric-value">{task.urgency}/10</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Facilidade:</span>
                      <div className="metric-bar">
                        <div 
                          className="metric-fill ease" 
                          style={{ width: `${task.ease * 10}%` }}
                        ></div>
                      </div>
                      <span className="metric-value">{task.ease}/10</span>
                    </div>
                  </div>
                  
                  <div className="task-info">
                    <span className="time-estimate"><MdAccessTime /> {task.estimatedTime}</span>
                    <span className="category"><MdFolder /> {task.category}</span>
                    <span className="created-time"><MdSchedule /> {formatTime(task.createdAt)}</span>
                  </div>
                  
                  {task.tags.length > 0 && (
                    <div className="task-tags">
                      {task.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                  
                  {/* Controle de tempo */}
                  <div className="time-tracking">
                    <div className="time-stats">
                      <div className="time-stat">
                        <span className="time-label">Tempo total:</span>
                        <span className="time-value">{formatDuration(getTotalTimeWithCurrent(task))}</span>
                      </div>
                      {task.timeTracking.sessions.length > 0 && (
                        <div className="time-stat">
                          <span className="time-label">Sessões:</span>
                          <span className="time-value">{task.timeTracking.sessions.length}</span>
                        </div>
                      )}
                      {task.timeTracking.isTimerRunning && (
                        <div className="time-stat current-session">
                          <span className="time-label">Sessão atual:</span>
                          <span className="time-value running">
                            {formatDuration(getCurrentSessionDuration(task))}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="timer-controls">
                      {!task.timeTracking.isTimerRunning ? (
                        <button 
                          className="timer-btn start-timer"
                          onClick={() => startTimer(task.id)}
                          title="Iniciar cronômetro"
                        >
                          <MdPlayArrow /> Iniciar
                        </button>
                      ) : (
                        <>
                          <button 
                            className="timer-btn pause-timer"
                            onClick={() => pauseTimer(task.id)}
                            title="Pausar cronômetro"
                          >
                            <MdPause /> Pausar
                          </button>
                          <button 
                            className="timer-btn stop-timer"
                            onClick={() => stopTimer(task.id)}
                            title="Parar cronômetro"
                          >
                            <MdStop /> Parar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="task-actions">
                    {task.status === 'pendente' && (
                      <button 
                        className="action-btn start-btn"
                        onClick={() => updateTaskStatus(task.id, 'em_progresso')}
                      >
                        <MdPlayArrow /> Iniciar
                      </button>
                    )}
                    
                    {task.status === 'em_progresso' && (
                      <>
                        <button 
                          className="action-btn complete-btn"
                          onClick={() => updateTaskStatus(task.id, 'concluida')}
                        >
                          <MdCheckCircle /> Concluir
                        </button>
                        <button 
                          className="action-btn pause-btn"
                          onClick={() => updateTaskStatus(task.id, 'pendente')}
                        >
                          <MdPause /> Pausar
                        </button>
                      </>
                    )}
                    
                    {task.status === 'concluida' && (
                      <>
                        <button 
                          className="action-btn reopen-btn"
                          onClick={() => updateTaskStatus(task.id, 'pendente')}
                        >
                          <MdRefresh /> Reabrir
                        </button>
                        <button 
                          className={`action-btn insight-btn ${savingInsight === task.id ? 'saving' : ''}`}
                          onClick={() => saveTaskInsight(task)}
                          disabled={savingInsight === task.id}
                          title="Salvar insight no repositório de conhecimento"
                        >
                          {savingInsight === task.id ? <MdHourglassEmpty /> : <MdLightbulb />} Insight
                        </button>
                      </>
                    )}
                    
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => deleteTask(task.id)}
                    >
                      <MdDelete />
                    </button>
                  </div>
                  
                  {task.aiAnalysis && (
                    <div className="ai-analysis">
                      <h5><MdLightbulb /> Análise da IA:</h5>
                      <p><strong>Abordagem:</strong> {task.aiAnalysis.suggestedApproach}</p>
                      {task.aiAnalysis.prerequisites.length > 0 && (
                        <p><strong>Pré-requisitos:</strong> {task.aiAnalysis.prerequisites.join(', ')}</p>
                      )}
                      {task.aiAnalysis.riskFactors.length > 0 && (
                        <p><strong>Riscos:</strong> {task.aiAnalysis.riskFactors.join(', ')}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de sugestões */}
        {showSuggestions && (
          <div className="suggestions-modal">
            <div className="suggestions-content">
              <h4><MdMemory /> Sugestões da IA</h4>
              <div className="suggestions-text">
                {suggestions.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
              <button 
                className="close-suggestions-btn"
                onClick={() => setShowSuggestions(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskManager; 