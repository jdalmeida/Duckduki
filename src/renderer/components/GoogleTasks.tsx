import React, { useState, useEffect } from 'react';
import './GoogleTasks.css';

interface Task {
  id?: string;
  title: string;
  notes?: string;
  due?: string;
  completed?: boolean;
  status?: 'needsAction' | 'completed';
  parent?: string;
  position?: string;
  updated?: string;
}

interface TaskList {
  id?: string;
  title: string;
  updated?: string;
}

const GoogleTasks: React.FC = () => {
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedTaskList, setSelectedTaskList] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'today'>('pending');

  // Formulário de nova tarefa
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    notes: '',
    due: ''
  });

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadTaskLists();
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && selectedTaskList) {
      loadTasks();
    }
  }, [selectedTaskList, isConnected, showCompleted]);

  const checkConnectionStatus = async () => {
    try {
      const status = await window.electronAPI?.getGoogleServicesStatus?.();
      setIsConnected(status?.connected || false);
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const connectToGoogle = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI?.connectGoogleServices?.();
      if (result?.success) {
        setIsConnected(true);
        await loadTaskLists();
      } else {
        console.error('Erro ao conectar:', result?.error);
      }
    } catch (error) {
      console.error('Erro na conexão:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskLists = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI?.getGoogleTaskLists?.();
      if (result?.success) {
        setTaskLists(result.taskLists || []);
        // Selecionar primeira lista por padrão
        if (result.taskLists && result.taskLists.length > 0) {
          setSelectedTaskList(result.taskLists[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI?.getGoogleTasks?.(selectedTaskList, showCompleted);
      if (result?.success) {
        setTasks(result.tasks || []);
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      if (!newTask.title?.trim()) {
        alert('Digite um título para a tarefa');
        return;
      }

      setLoading(true);
      const result = await window.electronAPI?.createGoogleTask?.(newTask, selectedTaskList);
      if (result?.success) {
        setShowTaskForm(false);
        setNewTask({ title: '', notes: '', due: '' });
        await loadTasks();
      } else {
        alert(`Erro ao criar tarefa: ${result?.error}`);
      }
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      alert('Erro ao criar tarefa');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    try {
      if (!editingTask?.id) return;

      setLoading(true);
      const result = await window.electronAPI?.updateGoogleTask?.(
        editingTask.id,
        editingTask,
        selectedTaskList
      );
      if (result?.success) {
        setEditingTask(null);
        await loadTasks();
      } else {
        alert(`Erro ao atualizar tarefa: ${result?.error}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      alert('Erro ao atualizar tarefa');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      if (!task.id) return;

      setLoading(true);
      const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
      const result = await window.electronAPI?.updateGoogleTask?.(
        task.id,
        { ...task, status: newStatus },
        selectedTaskList
      );
      if (result?.success) {
        await loadTasks();
      } else {
        alert(`Erro ao atualizar tarefa: ${result?.error}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

      setLoading(true);
      const result = await window.electronAPI?.deleteGoogleTask?.(taskId, selectedTaskList);
      if (result?.success) {
        await loadTasks();
      } else {
        alert(`Erro ao excluir tarefa: ${result?.error}`);
      }
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      alert('Erro ao excluir tarefa');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  const getFilteredTasks = () => {
    let filtered = tasks;

    switch (filter) {
      case 'pending':
        filtered = tasks.filter(task => task.status !== 'completed');
        break;
      case 'completed':
        filtered = tasks.filter(task => task.status === 'completed');
        break;
      case 'today':
        const today = new Date().toDateString();
        filtered = tasks.filter(task => 
          task.due && new Date(task.due).toDateString() === today
        );
        break;
      default:
        filtered = tasks;
    }

    return filtered.sort((a, b) => {
      // Tarefas pendentes primeiro
      if (a.status !== b.status) {
        return a.status === 'needsAction' ? -1 : 1;
      }
      // Por data de vencimento
      if (a.due && b.due) {
        return new Date(a.due).getTime() - new Date(b.due).getTime();
      }
      if (a.due) return -1;
      if (b.due) return 1;
      // Por título
      return a.title.localeCompare(b.title);
    });
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const pending = total - completed;
    const today = tasks.filter(task => 
      task.due && new Date(task.due).toDateString() === new Date().toDateString()
    ).length;

    return { total, completed, pending, today };
  };

  const isOverdue = (task: Task) => {
    if (!task.due || task.status === 'completed') return false;
    return new Date(task.due) < new Date();
  };

  const isDueToday = (task: Task) => {
    if (!task.due) return false;
    return new Date(task.due).toDateString() === new Date().toDateString();
  };

  if (!isConnected) {
    return (
      <div className="google-tasks">
        <div className="tasks-header">
          <h3>✅ Google Tasks</h3>
          <div className="connection-status disconnected">
            <span>🔴 Desconectado</span>
          </div>
        </div>

        <div className="connection-prompt">
          <p>Conecte sua conta Google para gerenciar suas tarefas do Google Tasks diretamente no Duckduki.</p>
          <button 
            onClick={connectToGoogle} 
            disabled={loading}
            className="connect-btn"
          >
            {loading ? '🔄 Conectando...' : '🔗 Conectar Google Tasks'}
          </button>
        </div>
      </div>
    );
  }

  const stats = getTaskStats();

  return (
    <div className="google-tasks">
      <div className="tasks-header">
        <h3>✅ Google Tasks</h3>
        <div className="header-controls">
          <div className="connection-status connected">
            <span>🟢 Conectado</span>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="tasks-stats">
        <div className="stat-card">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-number">{stats.pending}</span>
          <span className="stat-label">Pendentes</span>
        </div>
        <div className="stat-card completed">
          <span className="stat-number">{stats.completed}</span>
          <span className="stat-label">Concluídas</span>
        </div>
        <div className="stat-card today">
          <span className="stat-number">{stats.today}</span>
          <span className="stat-label">Hoje</span>
        </div>
      </div>

      {/* Seletor de Lista e Controles */}
      <div className="tasks-controls">
        <div className="list-selector">
          <label>
            📋 Lista:
            <select 
              value={selectedTaskList} 
              onChange={(e) => setSelectedTaskList(e.target.value)}
            >
              {taskLists.map(list => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="filter-controls">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="pending">🔄 Pendentes</option>
            <option value="all">📋 Todas</option>
            <option value="completed">✅ Concluídas</option>
            <option value="today">📅 Hoje</option>
          </select>
        </div>

        <button 
          onClick={() => setShowTaskForm(true)}
          className="new-task-btn"
        >
          ➕ Nova Tarefa
        </button>
      </div>

      {/* Lista de Tarefas */}
      <div className="tasks-list">
        <div className="list-header">
          <button onClick={loadTasks} disabled={loading} className="refresh-btn">
            {loading ? '🔄' : '↻'} Atualizar
          </button>
        </div>

        {loading && (
          <div className="loading">🔄 Carregando tarefas...</div>
        )}

        {!loading && getFilteredTasks().length === 0 && (
          <div className="no-tasks">
            <p>Nenhuma tarefa encontrada neste filtro.</p>
            <p>Crie sua primeira tarefa clicando em "Nova Tarefa"!</p>
          </div>
        )}

        <div className="tasks-grid">
          {getFilteredTasks().map(task => (
            <div 
              key={task.id} 
              className={`task-card ${task.status === 'completed' ? 'completed' : ''} ${isOverdue(task) ? 'overdue' : ''}`}
            >
              <div className="task-header">
                <div className="task-checkbox">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => handleToggleComplete(task)}
                    className="task-check"
                  />
                  <span className="checkmark"></span>
                </div>
                
                <div className="task-content">
                  <h5 className={`task-title ${task.status === 'completed' ? 'completed' : ''}`}>
                    {task.title}
                  </h5>
                  
                  {task.notes && (
                    <p className="task-notes">{task.notes}</p>
                  )}
                  
                  {task.due && (
                    <div className={`task-due ${isDueToday(task) ? 'today' : ''} ${isOverdue(task) ? 'overdue' : ''}`}>
                      📅 {formatDate(task.due)}
                      {isDueToday(task) && ' (Hoje)'}
                      {isOverdue(task) && ' (Atrasada)'}
                    </div>
                  )}
                </div>

                <div className="task-actions">
                  <button 
                    onClick={() => setEditingTask(task)}
                    className="edit-btn"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDeleteTask(task.id!)}
                    className="delete-btn"
                    title="Excluir"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Nova Tarefa */}
      {showTaskForm && (
        <div className="modal-overlay">
          <div className="task-form-modal">
            <div className="modal-header">
              <h4>➕ Nova Tarefa</h4>
              <button 
                onClick={() => setShowTaskForm(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="form-group">
              <label>Título*</label>
              <input
                type="text"
                value={newTask.title || ''}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título da tarefa"
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label>Descrição</label>
              <textarea
                value={newTask.notes || ''}
                onChange={(e) => setNewTask(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Descrição da tarefa (opcional)"
                rows={3}
              />
            </div>
            
            <div className="form-group">
              <label>Data de Vencimento</label>
              <input
                type="date"
                value={formatDateForInput(newTask.due || '')}
                onChange={(e) => setNewTask(prev => ({ 
                  ...prev, 
                  due: e.target.value ? new Date(e.target.value).toISOString() : ''
                }))}
              />
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowTaskForm(false)}
                className="cancel-btn"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateTask}
                disabled={loading}
                className="create-btn"
              >
                {loading ? '🔄 Criando...' : '✅ Criar Tarefa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingTask && (
        <div className="modal-overlay">
          <div className="task-form-modal">
            <div className="modal-header">
              <h4>✏️ Editar Tarefa</h4>
              <button 
                onClick={() => setEditingTask(null)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="form-group">
              <label>Título*</label>
              <input
                type="text"
                value={editingTask.title || ''}
                onChange={(e) => setEditingTask(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                placeholder="Título da tarefa"
              />
            </div>
            
            <div className="form-group">
              <label>Descrição</label>
              <textarea
                value={editingTask.notes || ''}
                onChange={(e) => setEditingTask(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                placeholder="Descrição da tarefa (opcional)"
                rows={3}
              />
            </div>
            
            <div className="form-group">
              <label>Data de Vencimento</label>
              <input
                type="date"
                value={formatDateForInput(editingTask.due || '')}
                onChange={(e) => setEditingTask(prev => prev ? ({ 
                  ...prev, 
                  due: e.target.value ? new Date(e.target.value).toISOString() : ''
                }) : null)}
              />
            </div>
            
            <div className="form-group">
              <label>Status</label>
              <select
                value={editingTask.status || 'needsAction'}
                onChange={(e) => setEditingTask(prev => prev ? ({ 
                  ...prev, 
                  status: e.target.value as 'needsAction' | 'completed'
                }) : null)}
              >
                <option value="needsAction">🔄 Pendente</option>
                <option value="completed">✅ Concluída</option>
              </select>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setEditingTask(null)}
                className="cancel-btn"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateTask}
                disabled={loading}
                className="update-btn"
              >
                {loading ? '🔄 Salvando...' : '💾 Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleTasks; 