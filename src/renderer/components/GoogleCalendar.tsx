import React, { useState, useEffect } from 'react';
import './GoogleCalendar.css';

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

interface Calendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

const GoogleCalendar: React.FC = () => {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('primary');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Formulário de novo evento
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    summary: '',
    description: '',
    location: '',
    start: { dateTime: '' },
    end: { dateTime: '' }
  });

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadCalendars();
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && selectedCalendar) {
      loadEvents();
    }
  }, [selectedCalendar, isConnected]);

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
        await loadCalendars();
      } else {
        console.error('Erro ao conectar:', result?.error);
      }
    } catch (error) {
      console.error('Erro na conexão:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendars = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI?.getGoogleCalendars?.();
      if (result?.success) {
        setCalendars(result.calendars || []);
        // Selecionar calendário principal por padrão
        const primaryCalendar = result.calendars?.find((cal: Calendar) => cal.primary);
        if (primaryCalendar) {
          setSelectedCalendar(primaryCalendar.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar calendários:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias atrás
      const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 dias à frente

      const result = await window.electronAPI?.getGoogleEvents?.(selectedCalendar, timeMin, timeMax);
      if (result?.success) {
        setEvents(result.events || []);
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      if (!newEvent.summary || !newEvent.start?.dateTime || !newEvent.end?.dateTime) {
        alert('Preencha pelo menos o título, data/hora de início e fim');
        return;
      }

      setLoading(true);
      const result = await window.electronAPI?.createGoogleEvent?.(newEvent, selectedCalendar);
      if (result?.success) {
        setShowEventForm(false);
        setNewEvent({
          summary: '',
          description: '',
          location: '',
          start: { dateTime: '' },
          end: { dateTime: '' }
        });
        await loadEvents();
      } else {
        alert(`Erro ao criar evento: ${result?.error}`);
      }
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      alert('Erro ao criar evento');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEvent = async () => {
    try {
      if (!editingEvent?.id) return;

      setLoading(true);
      const result = await window.electronAPI?.updateGoogleEvent?.(
        editingEvent.id,
        editingEvent,
        selectedCalendar
      );
      if (result?.success) {
        setEditingEvent(null);
        await loadEvents();
      } else {
        alert(`Erro ao atualizar evento: ${result?.error}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      alert('Erro ao atualizar evento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      if (!confirm('Tem certeza que deseja excluir este evento?')) return;

      setLoading(true);
      const result = await window.electronAPI?.deleteGoogleEvent?.(eventId, selectedCalendar);
      if (result?.success) {
        await loadEvents();
      } else {
        alert(`Erro ao excluir evento: ${result?.error}`);
      }
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      alert('Erro ao excluir evento');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('pt-BR');
  };

  const formatDateForInput = (dateTimeStr: string) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toISOString().slice(0, 16);
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
      .slice(0, 5);
  };

  if (!isConnected) {
    return (
      <div className="google-calendar">
        <div className="calendar-header">
          <h3>📅 Google Calendar</h3>
          <div className="connection-status disconnected">
            <span>🔴 Desconectado</span>
          </div>
        </div>

        <div className="connection-prompt">
          <p>Conecte sua conta Google para gerenciar seus eventos do Calendar diretamente no Duckduki.</p>
          <button 
            onClick={connectToGoogle} 
            disabled={loading}
            className="connect-btn"
          >
            {loading ? '🔄 Conectando...' : '🔗 Conectar Google Calendar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="google-calendar">
      <div className="calendar-header">
        <h3>📅 Google Calendar</h3>
        <div className="header-controls">
          <div className="connection-status connected">
            <span>🟢 Conectado</span>
          </div>
          <div className="view-controls">
            <button 
              onClick={() => setViewMode('week')}
              className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
            >
              Semana
            </button>
            <button 
              onClick={() => setViewMode('month')}
              className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
            >
              Mês
            </button>
          </div>
        </div>
      </div>

      {/* Seletor de Calendário */}
      <div className="calendar-selector">
        <label>
          📋 Calendário:
          <select 
            value={selectedCalendar} 
            onChange={(e) => setSelectedCalendar(e.target.value)}
          >
            {calendars.map(calendar => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.summary} {calendar.primary ? '(Principal)' : ''}
              </option>
            ))}
          </select>
        </label>
        <button 
          onClick={() => setShowEventForm(true)}
          className="new-event-btn"
        >
          ➕ Novo Evento
        </button>
      </div>

      {/* Resumo do Dia */}
      <div className="daily-summary">
        <h4>📅 Hoje ({new Date().toLocaleDateString('pt-BR')})</h4>
        <div className="today-events">
          {getTodayEvents().length === 0 ? (
            <p className="no-events">Nenhum evento hoje</p>
          ) : (
            getTodayEvents().map(event => (
              <div key={event.id} className="event-summary">
                <span className="event-time">
                  {new Date(event.start.dateTime).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                <span className="event-title">{event.summary}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lista de Eventos */}
      <div className="events-list">
        <div className="list-header">
          <h4>📋 Próximos Eventos</h4>
          <button onClick={loadEvents} disabled={loading} className="refresh-btn">
            {loading ? '🔄' : '↻'} Atualizar
          </button>
        </div>

        {loading && (
          <div className="loading">🔄 Carregando eventos...</div>
        )}

        {!loading && events.length === 0 && (
          <div className="no-events">
            <p>Nenhum evento encontrado.</p>
            <p>Crie seu primeiro evento clicando em "Novo Evento"!</p>
          </div>
        )}

        <div className="events-grid">
          {getUpcomingEvents().map(event => (
            <div key={event.id} className="event-card">
              <div className="event-header">
                <h5>{event.summary}</h5>
                <div className="event-actions">
                  <button 
                    onClick={() => setEditingEvent(event)}
                    className="edit-btn"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDeleteEvent(event.id!)}
                    className="delete-btn"
                    title="Excluir"
                  >
                    🗑️
                  </button>
                  {event.htmlLink && (
                    <a 
                      href={event.htmlLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="external-link"
                      title="Abrir no Google Calendar"
                    >
                      🔗
                    </a>
                  )}
                </div>
              </div>
              
              <div className="event-details">
                <div className="event-time">
                  📅 {formatDateTime(event.start.dateTime)}
                  {event.start.dateTime !== event.end.dateTime && (
                    <span> - {formatDateTime(event.end.dateTime)}</span>
                  )}
                </div>
                
                {event.location && (
                  <div className="event-location">📍 {event.location}</div>
                )}
                
                {event.description && (
                  <div className="event-description">{event.description}</div>
                )}
                
                {event.attendees && event.attendees.length > 0 && (
                  <div className="event-attendees">
                    👥 {event.attendees.length} participante(s)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Novo Evento */}
      {showEventForm && (
        <div className="modal-overlay">
          <div className="event-form-modal">
            <div className="modal-header">
              <h4>➕ Novo Evento</h4>
              <button 
                onClick={() => setShowEventForm(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="form-group">
              <label>Título*</label>
              <input
                type="text"
                value={newEvent.summary || ''}
                onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Título do evento"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Data/Hora Início*</label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(newEvent.start?.dateTime || '')}
                  onChange={(e) => setNewEvent(prev => ({ 
                    ...prev, 
                    start: { dateTime: new Date(e.target.value).toISOString() }
                  }))}
                />
              </div>
              
              <div className="form-group">
                <label>Data/Hora Fim*</label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(newEvent.end?.dateTime || '')}
                  onChange={(e) => setNewEvent(prev => ({ 
                    ...prev, 
                    end: { dateTime: new Date(e.target.value).toISOString() }
                  }))}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Local</label>
              <input
                type="text"
                value={newEvent.location || ''}
                onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Local do evento"
              />
            </div>
            
            <div className="form-group">
              <label>Descrição</label>
              <textarea
                value={newEvent.description || ''}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do evento"
                rows={3}
              />
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowEventForm(false)}
                className="cancel-btn"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateEvent}
                disabled={loading}
                className="create-btn"
              >
                {loading ? '🔄 Criando...' : '✅ Criar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingEvent && (
        <div className="modal-overlay">
          <div className="event-form-modal">
            <div className="modal-header">
              <h4>✏️ Editar Evento</h4>
              <button 
                onClick={() => setEditingEvent(null)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="form-group">
              <label>Título*</label>
              <input
                type="text"
                value={editingEvent.summary || ''}
                onChange={(e) => setEditingEvent(prev => prev ? ({ ...prev, summary: e.target.value }) : null)}
                placeholder="Título do evento"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Data/Hora Início*</label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(editingEvent.start?.dateTime || '')}
                  onChange={(e) => setEditingEvent(prev => prev ? ({ 
                    ...prev, 
                    start: { dateTime: new Date(e.target.value).toISOString() }
                  }) : null)}
                />
              </div>
              
              <div className="form-group">
                <label>Data/Hora Fim*</label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(editingEvent.end?.dateTime || '')}
                  onChange={(e) => setEditingEvent(prev => prev ? ({ 
                    ...prev, 
                    end: { dateTime: new Date(e.target.value).toISOString() }
                  }) : null)}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Local</label>
              <input
                type="text"
                value={editingEvent.location || ''}
                onChange={(e) => setEditingEvent(prev => prev ? ({ ...prev, location: e.target.value }) : null)}
                placeholder="Local do evento"
              />
            </div>
            
            <div className="form-group">
              <label>Descrição</label>
              <textarea
                value={editingEvent.description || ''}
                onChange={(e) => setEditingEvent(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                placeholder="Descrição do evento"
                rows={3}
              />
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setEditingEvent(null)}
                className="cancel-btn"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateEvent}
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

export default GoogleCalendar; 