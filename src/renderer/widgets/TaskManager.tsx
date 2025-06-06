import React, { useState, useEffect } from 'react';
import './TaskManager.css';

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
  aiAnalysis: {
    complexity: string;
    suggestedApproach: string;
    prerequisites: string[];
    timeEstimate: string;
    riskFactors: string[];
  };
}

interface TaskManagerProps {
  isVisible: boolean;
  onClose: () => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({ isVisible, onClose }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (isVisible) {
      loadTasks();
      loadStats();
    }
  }, [isVisible]);

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

  const addTask = async () => {
    if (!newTaskInput.trim()) return;

    setAddingTask(true);
    setError(null);

    try {
      const result = await window.electronAPI.addTask(newTaskInput);
      
      if (result.success) {
        setNewTaskInput('');
        await loadTasks();
        await loadStats();
      } else {
        setError(result.error || 'Erro ao adicionar tarefa');
      }
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
      setError('Erro de conexão');
    } finally {
      setAddingTask(false);
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
    try {
      const result = await window.electronAPI.deleteTask(taskId);
      
      if (result.success) {
        await loadTasks();
        await loadStats();
      } else {
        setError(result.error || 'Erro ao deletar tarefa');
      }
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critica': return '#ff4757';
      case 'alta': return '#ff6b35';
      case 'media': return '#ffa726';
      case 'baixa': return '#66bb6a';
      default: return '#9e9e9e';
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

  if (!isVisible) return null;

  return (
    <div className="task-manager-overlay">
      <div className="task-manager">
        <div className="task-manager-header">
          <div className="task-manager-title">
            <span className="title-icon">📋</span>
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
              🧠
            </button>
            <button 
              className="stats-btn"
              onClick={loadStats}
              title="Atualizar estatísticas"
            >
              📊
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
              ✕
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

        {/* Adicionar nova tarefa */}
        <div className="add-task-section">
          <div className="add-task-input">
            <textarea
              placeholder="Descreva sua tarefa em linguagem natural... Ex: 'Preciso finalizar o relatório até sexta-feira'"
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  addTask();
                }
              }}
              disabled={addingTask}
              rows={2}
            />
            <button 
              className="add-task-btn"
              onClick={addTask}
              disabled={addingTask || !newTaskInput.trim()}
            >
              {addingTask ? '🤖' : '+'} {addingTask ? 'Analisando...' : 'Adicionar'}
            </button>
          </div>
          <p className="add-task-hint">
            💡 A IA analisará automaticamente urgência, facilidade e priorizará sua tarefa
          </p>
        </div>

        {/* Filtros */}
        <div className="task-filters">
          {[
            { key: 'all', label: 'Todas', icon: '📋' },
            { key: 'pending', label: 'Pendentes', icon: '⏳' },
            { key: 'progress', label: 'Em Progresso', icon: '🔄' },
            { key: 'completed', label: 'Concluídas', icon: '✅' },
            { key: 'critica', label: 'Críticas', icon: '🔴' },
            { key: 'alta', label: 'Alta', icon: '🟠' }
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
              🗑️ Limpar
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
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
              <button onClick={loadTasks} className="retry-btn">
                Tentar Novamente
              </button>
            </div>
          )}

          {!loading && !error && tasks.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">📝</span>
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
                    <span className="time-estimate">⏱️ {task.estimatedTime}</span>
                    <span className="category">📁 {task.category}</span>
                    <span className="created-time">🕒 {formatTime(task.createdAt)}</span>
                  </div>
                  
                  {task.tags.length > 0 && (
                    <div className="task-tags">
                      {task.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                  
                  <div className="task-actions">
                    {task.status === 'pendente' && (
                      <button 
                        className="action-btn start-btn"
                        onClick={() => updateTaskStatus(task.id, 'em_progresso')}
                      >
                        ▶️ Iniciar
                      </button>
                    )}
                    
                    {task.status === 'em_progresso' && (
                      <>
                        <button 
                          className="action-btn complete-btn"
                          onClick={() => updateTaskStatus(task.id, 'concluida')}
                        >
                          ✅ Concluir
                        </button>
                        <button 
                          className="action-btn pause-btn"
                          onClick={() => updateTaskStatus(task.id, 'pendente')}
                        >
                          ⏸️ Pausar
                        </button>
                      </>
                    )}
                    
                    {task.status === 'concluida' && (
                      <button 
                        className="action-btn reopen-btn"
                        onClick={() => updateTaskStatus(task.id, 'pendente')}
                      >
                        🔄 Reabrir
                      </button>
                    )}
                    
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => deleteTask(task.id)}
                    >
                      🗑️
                    </button>
                  </div>
                  
                  {task.aiAnalysis && (
                    <div className="ai-analysis">
                      <h5>💡 Análise da IA:</h5>
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
              <h4>🧠 Sugestões da IA</h4>
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