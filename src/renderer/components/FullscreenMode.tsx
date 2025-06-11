import React, { useState, useEffect } from 'react';
import { FullscreenButton } from './FullscreenButton';
import { ThemeToggle } from './ThemeToggle';
import FeedPanel from '../widgets/FeedPanel';
import TaskManager from '../widgets/TaskManager';
import KnowledgePanel from '../widgets/KnowledgePanel';
import { 
  MdLightbulb, 
  MdAnalytics, 
  MdChecklist, 
  MdMemory, 
  MdSettings,
  MdEvent,
  MdToday,
  MdSchedule,
  MdAccessTime,
  MdPlayArrow,
  MdCheckCircle,
  MdRefresh,
  MdOpenInNew,
  MdStar
} from 'react-icons/md';
import { 
  FaHackerNews, 
  FaReddit, 
  FaGithub, 
  FaDev 
} from 'react-icons/fa';
import './FullScreenMode.css';

interface FullscreenModeProps {
  showFeedPanel: boolean;
  showTaskManager: boolean;
  showKnowledgePanel: boolean;
  hasGroqKey: boolean;
  darkMode: boolean;
  onSetShowFeedPanel: (show: boolean) => void;
  onSetShowTaskManager: (show: boolean) => void;
  onSetShowKnowledgePanel: (show: boolean) => void;
  onShowSettings: () => void;
  onFullscreenChange: (isFullscreen: boolean) => void;
}

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
  attendees?: { email: string }[];
  htmlLink?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'pendente' | 'em_progresso' | 'concluida' | 'cancelada';
  estimatedTime: string;
  category: string;
  createdAt: number;
  dueDate?: number;
}

interface FeedItem {
  id: string;
  title: string;
  url: string;
  score: number;
  source: 'hackernews' | 'reddit' | 'github' | 'dev.to';
  author?: string;
  comments: number;
  timestamp: number;
  description?: string;
  tags?: string[];
}

export const FullscreenMode: React.FC<FullscreenModeProps> = ({
  showFeedPanel,
  showTaskManager,
  showKnowledgePanel,
  hasGroqKey,
  onSetShowFeedPanel,
  onSetShowTaskManager,
  onSetShowKnowledgePanel,
  onShowSettings,
  onFullscreenChange,
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingFeeds, setLoadingFeeds] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // Atualizar dados a cada 10 minutos
    const interval = setInterval(loadDashboardData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    await Promise.all([
      loadCalendarEvents(),
      loadTasks(),
      loadFeeds()
    ]);
  };

  const loadCalendarEvents = async () => {
    setLoadingEvents(true);
    try {
      // Verificar status da conexão Google
      const status = await window.electronAPI?.getGoogleServicesStatus?.();
      setIsCalendarConnected(status?.connected || false);

      if (status?.connected) {
        // Buscar eventos dos próximos 7 dias
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const result = await window.electronAPI?.getGoogleEvents?.(
          'primary',
          now.toISOString(),
          nextWeek.toISOString(),
          10
        );
        
        if (result?.success && result.events) {
          setEvents(result.events);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadTasks = async () => {
    setLoadingTasks(true);
    try {
      const result = await window.electronAPI?.getTasks?.({
        status: 'pendente'
      });
      
      if (result?.success && result.tasks) {
        // Pegar apenas as primeiras 5 tarefas ordenadas por prioridade
        const sortedTasks = result.tasks
          .sort((a: Task, b: Task) => {
            const priorityOrder = { 'critica': 4, 'alta': 3, 'media': 2, 'baixa': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          })
          .slice(0, 5);
        setTasks(sortedTasks);
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadFeeds = async () => {
    setLoadingFeeds(true);
    try {
      const result = await window.electronAPI?.getTechFeeds?.(6);
      
      if (result?.success && result.feeds) {
        setFeeds(result.feeds.sort((a: FeedItem, b: FeedItem) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6));
      }
    } catch (error) {
      console.error('Erro ao carregar feeds:', error);
    } finally {
      setLoadingFeeds(false);
    }
  };

  const connectToGoogle = async () => {
    try {
      const result = await window.electronAPI?.connectGoogleServices?.();
      if (result?.success) {
        setIsCalendarConnected(true);
        await loadCalendarEvents();
      }
    } catch (error) {
      console.error('Erro ao conectar Google:', error);
    }
  };

  const formatEventTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    const today = new Date().toDateString();
    const eventDate = date.toDateString();
    
    if (eventDate === today) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getTodayEvents = () => {
    const today = new Date().toDateString();
    return events.filter(event => 
      new Date(event.start.dateTime).toDateString() === today
    );
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events
      .filter(event => new Date(event.start.dateTime) > now)
      .slice(0, 4);
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

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'hackernews': return <FaHackerNews style={{ color: '#ff6600' }} />;
      case 'reddit': return <FaReddit style={{ color: '#ff4500' }} />;
      case 'github': return <FaGithub style={{ color: '#333' }} />;
      case 'dev.to': return <FaDev style={{ color: '#0a0a0a' }} />;
      default: return <MdStar />;
    }
  };

  const openUrl = async (url: string) => {
    try {
      await window.electronAPI?.openExternalUrl?.(url);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  const startTask = async (taskId: string) => {
    try {
      await window.electronAPI?.updateTaskStatus?.(taskId, 'em_progresso');
      await loadTasks();
    } catch (error) {
      console.error('Erro ao iniciar tarefa:', error);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      await window.electronAPI?.updateTaskStatus?.(taskId, 'concluida');
      await loadTasks();
    } catch (error) {
      console.error('Erro ao completar tarefa:', error);
    }
  };

  return (
    <>
      <div className="app-header">
        <div className="header-title">
          <img 
            src="icon.png" 
            alt="Duckduki" 
            className="app-logo"
            onError={(e) => {
              // Fallback se a imagem não carregar
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallback = document.createElement('div');
                fallback.className = 'app-logo app-logo-fallback';
                fallback.textContent = '🦆';
                parent.appendChild(fallback);
              }
            }}
          />
          <div className="title-content">
            <h1>Duckduki</h1>
            <div className={`status-indicator ${hasGroqKey ? 'active' : 'inactive'}`}>
              <MdLightbulb />
              IA {hasGroqKey ? 'Ativa' : 'Inativa'}
            </div>
          </div>
        </div>
        <div className="header-controls">
          <div className="control-group">
            <span className="control-group-label">Painéis</span>
            <button 
              className="feed-panel-btn"
              onClick={() => onSetShowFeedPanel(true)}
              title="Quadro de Ideias - Tendências Tech"
            >
              <MdAnalytics />
            </button>
            <button 
              className="task-manager-btn"
              onClick={() => onSetShowTaskManager(true)}
              title="Organizador de Tarefas com IA"
            >
              <MdChecklist />
            </button>
            <button 
              className="knowledge-panel-btn"
              onClick={() => onSetShowKnowledgePanel(true)}
              title="Repositório de Conhecimento"
            >
              <MdMemory />
            </button>
          </div>
          
          <div className="control-group">
            <span className="control-group-label">Exibição</span>
            <FullscreenButton onFullscreenChange={onFullscreenChange} />
            <ThemeToggle />
          </div>
          
          <button 
            className="settings-btn"
            onClick={onShowSettings}
            title="Configurações"
          >
            <MdSettings />
          </button>
        </div>
      </div>

      <div className="dashboard-container">
        <div className="dashboard-header">
          <h3>Dashboard</h3>
          <button 
            className="refresh-dashboard-btn"
            onClick={loadDashboardData}
            title="Atualizar dashboard"
          >
            <MdRefresh />
          </button>
        </div>

        <div className="dashboard-grid">
          {/* Seção Google Calendar */}
          <div className="dashboard-section calendar-section">
            <div className="section-header">
              <div className="section-title">
                <MdEvent />
                <span>Google Calendar</span>
              </div>
              <div className="section-actions">
                {!isCalendarConnected && (
                  <button className="connect-btn" onClick={connectToGoogle}>
                    Conectar
                  </button>
                )}
                <button 
                  className="section-refresh-btn"
                  onClick={loadCalendarEvents}
                  disabled={loadingEvents}
                >
                  <MdRefresh />
                </button>
              </div>
            </div>

            <div className="section-content">
              {!isCalendarConnected ? (
                <div className="empty-state">
                  <MdEvent />
                  <p>Conecte sua conta Google para ver seus eventos</p>
                </div>
              ) : loadingEvents ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Carregando eventos...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="empty-state">
                  <MdEvent />
                  <p>Nenhum evento nos próximos 7 dias</p>
                </div>
              ) : (
                <>
                  {/* Eventos de hoje */}
                  {getTodayEvents().length > 0 && (
                    <div className="today-events">
                      <h4><MdToday /> Hoje</h4>
                      {getTodayEvents().slice(0, 3).map(event => (
                        <div key={event.id} className="event-item today">
                          <div className="event-time">
                            <MdAccessTime />
                            {new Date(event.start.dateTime).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          <div className="event-title">{event.summary}</div>
                          {event.location && (
                            <div className="event-location">📍 {event.location}</div>
                          )}
                          {event.htmlLink && (
                            <button 
                              className="event-link-btn"
                              onClick={() => openUrl(event.htmlLink!)}
                              title="Abrir no Google Calendar"
                            >
                              <MdOpenInNew />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Próximos eventos */}
                  <div className="upcoming-events">
                    <h4><MdSchedule /> Próximos</h4>
                    {getUpcomingEvents().map(event => (
                      <div key={event.id} className="event-item">
                        <div className="event-time">
                          <MdAccessTime />
                          {formatEventTime(event.start.dateTime)}
                        </div>
                        <div className="event-title">{event.summary}</div>
                        {event.location && (
                          <div className="event-location">📍 {event.location}</div>
                        )}
                        {event.htmlLink && (
                          <button 
                            className="event-link-btn"
                            onClick={() => openUrl(event.htmlLink!)}
                            title="Abrir no Google Calendar"
                          >
                            <MdOpenInNew />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Seção Tarefas */}
          <div className="dashboard-section tasks-section">
            <div className="section-header">
              <div className="section-title">
                <MdChecklist />
                <span>Minhas Tarefas</span>
              </div>
              <div className="section-actions">
                <button 
                  className="section-refresh-btn"
                  onClick={loadTasks}
                  disabled={loadingTasks}
                >
                  <MdRefresh />
                </button>
              </div>
            </div>

            <div className="section-content">
              {loadingTasks ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Carregando tarefas...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="empty-state">
                  <MdChecklist />
                  <p>Nenhuma tarefa pendente</p>
                </div>
              ) : (
                <div className="tasks-list">
                  {tasks.map(task => (
                    <div key={task.id} className="task-item-fullscreen">
                      <div className="task-priority" style={{ 
                        backgroundColor: getPriorityColor(task.priority) 
                      }}></div>
                      <div className="task-content">
                        <div className="task-title">{task.title}</div>
                        <div className="task-meta">
                          <span className="task-category">{task.category}</span>
                          <span className="task-time">{task.estimatedTime}</span>
                        </div>
                      </div>
                      <div className="task-actions">
                        <button 
                          className="task-action-btn start-btn"
                          onClick={() => startTask(task.id)}
                          title="Iniciar tarefa"
                        >
                          <MdPlayArrow />
                        </button>
                        <button 
                          className="task-action-btn complete-btn"
                          onClick={() => completeTask(task.id)}
                          title="Marcar como concluída"
                        >
                          <MdCheckCircle />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Seção Feed de Notícias */}
          <div className="dashboard-section feeds-section">
            <div className="section-header">
              <div className="section-title">
                <MdAnalytics />
                <span>Notícias Tech</span>
              </div>
              <div className="section-actions">
                <button 
                  className="section-refresh-btn"
                  onClick={loadFeeds}
                  disabled={loadingFeeds}
                >
                  <MdRefresh />
                </button>
              </div>
            </div>

            <div className="section-content">
              {loadingFeeds ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Carregando notícias...</p>
                </div>
              ) : feeds.length === 0 ? (
                <div className="empty-state">
                  <MdAnalytics />
                  <p>Nenhuma notícia disponível</p>
                </div>
              ) : (
                <div className="feeds-list">
                  {feeds.map(feed => (
                    <div 
                      key={feed.id} 
                      className="feed-item"
                      onClick={() => openUrl(feed.url)}
                    >
                      <div className="feed-header">
                        <div className="feed-source">
                          {getSourceIcon(feed.source)}
                          <span>{feed.source.toUpperCase()}</span>
                        </div>
                        <div className="feed-score">
                          <MdStar />
                          {feed.score}
                        </div>
                      </div>
                      <div className="feed-title">{feed.title}</div>
                      {feed.description && (
                        <div className="feed-description">
                          {feed.description.length > 100 
                            ? feed.description.slice(0, 100) + '...'
                            : feed.description}
                        </div>
                      )}
                      <div className="feed-meta">
                        {feed.author && <span>por {feed.author}</span>}
                        <span>{feed.comments} comentários</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <FeedPanel 
        isVisible={showFeedPanel}
        onClose={() => onSetShowFeedPanel(false)}
      />

      <TaskManager 
        isVisible={showTaskManager}
        onClose={() => onSetShowTaskManager(false)}
      />

      <KnowledgePanel
        isVisible={showKnowledgePanel}
        onClose={() => onSetShowKnowledgePanel(false)}
      />
    </>
  );
}; 