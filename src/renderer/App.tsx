import React, { useState, useEffect } from 'react';
import CommandInput from './widgets/CommandInput';
import SuggestionCard from './widgets/SuggestionCard';
import SettingsPanel from './settings/SettingsPanel';
import FeedPanel from './widgets/FeedPanel';
import TaskManager from './widgets/TaskManager';
import { FullscreenButton } from './components/FullscreenButton';
import { ThemeToggle } from './components/ThemeToggle';
import { ThemeProvider } from './contexts/ThemeContext';
import { AIChat } from './components/AIChat';
import './App.css';
import './themes.css';
import KnowledgePanel from './widgets/KnowledgePanel';

interface SystemStatus {
  cpu: number;
  memory: number;
  activeApp: {
    name: string;
    title: string;
    pid: number;
  } | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Suggestion {
  id: string;
  type: 'command' | 'email' | 'code' | 'contextual';
  title: string;
  content: string;
  timestamp: number;
  actionable?: boolean;
  isUserMessage?: boolean;
}

const App: React.FC = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedPanel, setShowFeedPanel] = useState(false);
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);
  const [hasGroqKey, setHasGroqKey] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkGroqKey();
    checkEmailConfig();
    loadChatHistory();
    
    // Listener para sugestões contextuais - DESABILITADO (spam removido)
    // window.electronAPI.onContextualSuggestion((suggestion) => {
    //   addSuggestion({
    //     id: Date.now().toString(),
    //     type: 'contextual',
    //     title: 'Sugestão Contextual',
    //     content: suggestion.suggestion,
    //     timestamp: Date.now(),
    //     actionable: true
    //   });
    // });

    // Atualizar status do sistema a cada 10 segundos

    return () => {
      window.electronAPI.removeAllListeners('contextual-suggestion'); // Limpar qualquer listener restante
    };
  }, []);

  const checkGroqKey = async () => {
    try {
      const result = await window.electronAPI.hasGroqKey();
      setHasGroqKey(result.hasKey);
    } catch (error) {
      console.error('Erro ao verificar chave Groq:', error);
    }
  };

  const checkEmailConfig = async () => {
    try {
      const result = await window.electronAPI.hasEmailConfig();
      setHasEmailConfig(result.hasConfig);
    } catch (error) {
      console.error('Erro ao verificar configuração de email:', error);
    }
  };

  const loadChatHistory = () => {
    try {
      const saved = localStorage.getItem('duckduki-chat-history');
      if (saved) {
        const parsedHistory = JSON.parse(saved);
        setChatHistory(parsedHistory.slice(0, 15)); // Limitar a 15 mensagens
        
        // Recriar sugestões a partir do histórico
        const recreatedSuggestions = parsedHistory.slice(0, 10).map((msg: ChatMessage) => ({
          id: msg.id,
          type: 'command' as const,
          title: msg.role === 'user' ? '👤 Você' : '🤖 Duckduki',
          content: msg.content,
          timestamp: msg.timestamp,
          isUserMessage: msg.role === 'user'
        }));
        setSuggestions(recreatedSuggestions);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico do chat:', error);
    }
  };

  const saveChatHistory = (newHistory: ChatMessage[]) => {
    try {
      localStorage.setItem('duckduki-chat-history', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Erro ao salvar histórico do chat:', error);
    }
  };

  const addSuggestion = (suggestion: Suggestion) => {
    setSuggestions(prev => [suggestion, ...prev.slice(0, 9)]); // Manter apenas 10
  };

  const addChatMessage = (role: 'user' | 'assistant', content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now()
    };
    setChatHistory(prev => {
      const newHistory = [message, ...prev];
      // Manter apenas as últimas 15 mensagens para contexto da IA
      const limitedHistory = newHistory.slice(0, 15);
      saveChatHistory(limitedHistory);
      return limitedHistory;
    });
    return message;
  };

  const getChatContext = (): Array<{ role: string; content: string }> => {
    // Retornar as mensagens em ordem cronológica (mais antigas primeiro) para a IA
    return chatHistory
      .slice()
      .reverse()
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  };

  const isTaskCommand = (command: string): boolean => {
    const taskKeywords = [
      'tarefa', 'tarefas', 'todo', 'todos', 'task', 'tasks',
      'adicionar tarefa', 'nova tarefa', 'criar tarefa',
      'listar tarefas', 'ver tarefas', 'mostrar tarefas',
      'concluir tarefa', 'finalizar tarefa', 'completar tarefa',
      'deletar tarefa', 'remover tarefa', 'apagar tarefa',
      'minhas tarefas', 'pendente', 'em progresso', 'concluída'
    ];
    
    const lowerCommand = command.toLowerCase();
    return taskKeywords.some(keyword => lowerCommand.includes(keyword));
  };

  const formatTasksForDisplay = (tasks: any[]): string => {
    if (tasks.length === 0) {
      return '📝 Você não tem tarefas no momento. Use o comando "adicionar tarefa [descrição]" para criar uma nova tarefa.';
    }

    let output = `📋 **Suas Tarefas (${tasks.length}):**\n\n`;
    
    // Agrupar por status
    const pendentes = tasks.filter(t => t.status === 'pendente');
    const emProgresso = tasks.filter(t => t.status === 'em_progresso');
    const concluidas = tasks.filter(t => t.status === 'concluida');

    if (pendentes.length > 0) {
      output += `⏳ **PENDENTES (${pendentes.length}):**\n`;
      pendentes.forEach((task, index) => {
        const priority = task.priority === 'critica' ? '🔴' : 
                        task.priority === 'alta' ? '🟠' : 
                        task.priority === 'media' ? '🟡' : '🟢';
        output += `${index + 1}. ${priority} ${task.title}\n`;
        output += `   📁 ${task.category} | ⏱️ ${task.estimatedTime} | 🔥 ${task.urgency}/10\n`;
        if (task.description && task.description !== task.title) {
          output += `   💬 ${task.description}\n`;
        }
        output += `   🆔 ID: ${task.id}\n\n`;
      });
    }

    if (emProgresso.length > 0) {
      output += `🔄 **EM PROGRESSO (${emProgresso.length}):**\n`;
      emProgresso.forEach((task, index) => {
        output += `${index + 1}. ${task.title}\n`;
        output += `   📁 ${task.category} | ⏱️ ${task.estimatedTime}\n`;
        output += `   🆔 ID: ${task.id}\n\n`;
      });
    }

    if (concluidas.length > 0) {
      output += `✅ **CONCLUÍDAS (${concluidas.length}):**\n`;
      concluidas.slice(0, 3).forEach((task, index) => {
        output += `${index + 1}. ${task.title}\n`;
      });
      if (concluidas.length > 3) {
        output += `   ... e mais ${concluidas.length - 3} tarefas concluídas\n`;
      }
      output += '\n';
    }

    output += `💡 **Comandos úteis:**\n`;
    output += `• "concluir tarefa [ID]" - Marcar como concluída\n`;
    output += `• "deletar tarefa [ID]" - Remover tarefa\n`;
    output += `• "adicionar tarefa [descrição]" - Nova tarefa\n`;
    output += `• "tarefas pendentes" - Ver apenas pendentes\n`;

    return output;
  };

  const handleTaskCommand = async (command: string) => {
    const lowerCommand = command.toLowerCase();

    try {
      // Adicionar nova tarefa
      if (lowerCommand.includes('adicionar tarefa') || lowerCommand.includes('nova tarefa') || lowerCommand.includes('criar tarefa')) {
        const taskDescription = command.replace(/adicionar tarefa|nova tarefa|criar tarefa/i, '').trim();
        if (!taskDescription) {
          addSuggestion({
            id: Date.now().toString(),
            type: 'command',
            title: '📋 Adicionar Tarefa',
            content: 'Por favor, descreva a tarefa que deseja adicionar. Exemplo: "adicionar tarefa finalizar relatório até sexta"',
            timestamp: Date.now()
          });
          return;
        }

        const result = await window.electronAPI.addTask(taskDescription);
        if (result.success && result.task) {
          const priority = result.task.priority === 'critica' ? '🔴' : 
                          result.task.priority === 'alta' ? '🟠' : 
                          result.task.priority === 'media' ? '🟡' : '🟢';
          
          const taskResponse = `${priority} **${result.task.title}**\n\n📁 Categoria: ${result.task.category}\n⏱️ Estimativa: ${result.task.estimatedTime}\n🔥 Urgência: ${result.task.urgency}/10\n🎯 Facilidade: ${result.task.ease}/10\n🚀 Prioridade: ${result.task.priority.toUpperCase()}\n\n💡 Abordagem sugerida: ${result.task.aiAnalysis.suggestedApproach}\n\n🆔 ID: ${result.task.id}`;
          
          // Adicionar resposta da IA no chat
          const assistantMessage = addChatMessage('assistant', taskResponse);
          addSuggestion({
            id: assistantMessage.id,
            type: 'command',
            title: '✅ Tarefa Criada',
            content: taskResponse,
            timestamp: assistantMessage.timestamp
          });
        } else {
          throw new Error(result.error || 'Erro ao criar tarefa');
        }
      }
      // Listar tarefas
      else if (lowerCommand.includes('listar tarefas') || lowerCommand.includes('ver tarefas') || 
               lowerCommand.includes('mostrar tarefas') || lowerCommand.includes('minhas tarefas') || 
               lowerCommand === 'tarefas') {
        
        let filter = undefined;
        if (lowerCommand.includes('pendente')) {
          filter = { status: 'pendente' };
        } else if (lowerCommand.includes('progresso')) {
          filter = { status: 'em_progresso' };
        } else if (lowerCommand.includes('concluída') || lowerCommand.includes('concluida')) {
          filter = { status: 'concluida' };
        } else if (lowerCommand.includes('crítica') || lowerCommand.includes('critica')) {
          filter = { priority: 'critica' };
        }

        const result = await window.electronAPI.getTasks(filter);
        if (result.success && result.tasks) {
          const tasksResponse = formatTasksForDisplay(result.tasks);
          
          // Adicionar resposta da IA no chat
          const assistantMessage = addChatMessage('assistant', tasksResponse);
          addSuggestion({
            id: assistantMessage.id,
            type: 'command',
            title: '📋 Suas Tarefas',
            content: tasksResponse,
            timestamp: assistantMessage.timestamp
          });
        } else {
          throw new Error(result.error || 'Erro ao carregar tarefas');
        }
      }
      // Concluir tarefa
      else if (lowerCommand.includes('concluir tarefa') || lowerCommand.includes('finalizar tarefa') || 
               lowerCommand.includes('completar tarefa')) {
        
        const taskIdMatch = command.match(/\b\d+\b/);
        if (!taskIdMatch) {
          addSuggestion({
            id: Date.now().toString(),
            type: 'command',
            title: '📋 Concluir Tarefa',
            content: 'Por favor, especifique o ID da tarefa. Exemplo: "concluir tarefa 1234567890". Use "ver tarefas" para ver os IDs.',
            timestamp: Date.now()
          });
          return;
        }

        const taskId = taskIdMatch[0];
        const result = await window.electronAPI.updateTaskStatus(taskId, 'concluida');
        if (result.success && result.task) {
          addSuggestion({
            id: Date.now().toString(),
            type: 'command',
            title: '✅ Tarefa Concluída',
            content: `Parabéns! Você concluiu a tarefa:\n\n**${result.task.title}**\n\n🎉 Tarefa marcada como concluída com sucesso!`,
            timestamp: Date.now()
          });
        } else {
          throw new Error(result.error || 'Tarefa não encontrada');
        }
      }
      // Deletar tarefa
      else if (lowerCommand.includes('deletar tarefa') || lowerCommand.includes('remover tarefa') || 
               lowerCommand.includes('apagar tarefa')) {
        
        const taskIdMatch = command.match(/\b\d+\b/);
        if (!taskIdMatch) {
          addSuggestion({
            id: Date.now().toString(),
            type: 'command',
            title: '📋 Deletar Tarefa',
            content: 'Por favor, especifique o ID da tarefa. Exemplo: "deletar tarefa 1234567890". Use "ver tarefas" para ver os IDs.',
            timestamp: Date.now()
          });
          return;
        }

        const taskId = taskIdMatch[0];
        const result = await window.electronAPI.deleteTask(taskId);
        if (result.success) {
          addSuggestion({
            id: Date.now().toString(),
            type: 'command',
            title: '🗑️ Tarefa Removida',
            content: 'Tarefa deletada com sucesso!',
            timestamp: Date.now()
          });
        } else {
          throw new Error(result.error || 'Tarefa não encontrada');
        }
      }
      // Obter sugestões da IA
      else if (lowerCommand.includes('sugestões') || lowerCommand.includes('sugestoes') || 
               lowerCommand.includes('dicas') || lowerCommand.includes('otimizar tarefas')) {
        
        const result = await window.electronAPI.getTaskSuggestions();
        if (result.success) {
          addSuggestion({
            id: Date.now().toString(),
            type: 'command',
            title: '🧠 Sugestões da IA',
            content: result.error || 'Nenhuma sugestão disponível no momento.',
            timestamp: Date.now()
          });
        } else {
          throw new Error(result.error || 'Erro ao obter sugestões');
        }
      }
      // Estatísticas
      else if (lowerCommand.includes('estatísticas') || lowerCommand.includes('estatisticas') || 
               lowerCommand.includes('stats') || lowerCommand.includes('resumo tarefas')) {
        
        const result = await window.electronAPI.getTaskStats();
        if (result.success && result.stats) {
          const stats = result.stats;
          addSuggestion({
            id: Date.now().toString(),
            type: 'command',
            title: '📊 Estatísticas das Tarefas',
            content: `📋 **Resumo Geral:**\n\n🔢 Total: ${stats.total} tarefas\n⏳ Pendentes: ${stats.pendentes}\n🔄 Em Progresso: ${stats.emProgresso}\n✅ Concluídas: ${stats.concluidas}\n\n🎯 **Por Prioridade:**\n🔴 Críticas: ${stats.porPrioridade.critica}\n🟠 Altas: ${stats.porPrioridade.alta}\n🟡 Médias: ${stats.porPrioridade.media}\n🟢 Baixas: ${stats.porPrioridade.baixa}\n\n📁 **Principais Categorias:**\n${Object.entries(stats.porCategoria).map(([cat, count]) => `• ${cat}: ${count}`).join('\n')}`,
            timestamp: Date.now()
          });
        } else {
          throw new Error(result.error || 'Erro ao obter estatísticas');
        }
      }
      // Comando genérico de tarefa não reconhecido
      else {
        addSuggestion({
          id: Date.now().toString(),
          type: 'command',
          title: '📋 Comandos de Tarefas',
          content: `Não entendi o comando. Aqui estão os comandos disponíveis:\n\n**Básicos:**\n• "ver tarefas" - Listar todas as tarefas\n• "adicionar tarefa [descrição]" - Criar nova tarefa\n• "concluir tarefa [ID]" - Marcar como concluída\n• "deletar tarefa [ID]" - Remover tarefa\n\n**Filtros:**\n• "tarefas pendentes" - Apenas pendentes\n• "tarefas em progresso" - Apenas em andamento\n• "tarefas críticas" - Apenas prioridade crítica\n\n**Avançados:**\n• "sugestões tarefas" - Insights da IA\n• "estatísticas tarefas" - Resumo numérico\n\n💡 Experimente: "ver minhas tarefas" ou "adicionar tarefa estudar React"`,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      addSuggestion({
        id: Date.now().toString(),
        type: 'command',
        title: '❌ Erro nas Tarefas',
        content: `Erro ao processar comando de tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: Date.now()
      });
    }
  };

  const handleCommand = async (command: string) => {
    if (!hasGroqKey) {
      addSuggestion({
        id: Date.now().toString(),
        type: 'command',
        title: 'Configuração Necessária',
        content: 'Configure sua chave da API Groq nas configurações primeiro.',
        timestamp: Date.now()
      });
      return;
    }

    setIsLoading(true);
    
    // Adicionar mensagem do usuário no chat
    const userMessage = addChatMessage('user', command);
    addSuggestion({
      id: userMessage.id,
      type: 'command',
      title: '👤 Você',
      content: command,
      timestamp: userMessage.timestamp,
      isUserMessage: true
    });
    
    try {
      // Processar comandos especiais
      if (command.toLowerCase().includes('resumo') && command.toLowerCase().includes('email')) {
        const result = await window.electronAPI.getEmailSummary();
        const emailResponse = result.success ? result.summary : result.error;
        
        // Adicionar resposta da IA no chat
        const assistantMessage = addChatMessage('assistant', emailResponse);
        addSuggestion({
          id: assistantMessage.id,
          type: 'email',
          title: '📧 Resumo de E-mails',
          content: emailResponse,
          timestamp: assistantMessage.timestamp
        });
      } else if (isTaskCommand(command)) {
        await handleTaskCommand(command);
      } else if (command.toLowerCase().includes('analisar') && command.toLowerCase().includes('código')) {
        const result = await window.electronAPI.analyzeCurrentCode();
        const codeResponse = result.success ? result.analysis : result.error;
        
        // Adicionar resposta da IA no chat
        const assistantMessage = addChatMessage('assistant', codeResponse);
        addSuggestion({
          id: assistantMessage.id,
          type: 'code',
          title: '💻 Análise de Código',
          content: codeResponse,
          timestamp: assistantMessage.timestamp
        });
      } else if (command.toLowerCase().includes('build') || command.toLowerCase().includes('compilar')) {
        const result = await window.electronAPI.runBuild();
        const buildResponse = result.success ? result.result.output : result.error;
        
        // Adicionar resposta da IA no chat
        const assistantMessage = addChatMessage('assistant', buildResponse);
        addSuggestion({
          id: assistantMessage.id,
          type: 'command',
          title: '🔨 Resultado do Build',
          content: buildResponse,
          timestamp: assistantMessage.timestamp
        });
      } else {
        // Chat está sempre visível agora, adicionar apenas sugestão
        addSuggestion({
          id: Date.now().toString(),
          type: 'command',
          title: '💬 Comando',
          content: `Use o chat para: ${command}`,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      addSuggestion({
        id: Date.now().toString(),
        type: 'command',
        title: 'Erro',
        content: `Erro ao processar comando: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: Date.now()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroqKeySet = async (apiKey: string) => {
    try {
      const result = await window.electronAPI.setGroqKey(apiKey);
      if (result.success) {
        setHasGroqKey(true);
        addSuggestion({
          id: Date.now().toString(),
          type: 'command',
          title: 'Configuração',
          content: 'Chave Groq configurada com sucesso!',
          timestamp: Date.now()
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      addSuggestion({
        id: Date.now().toString(),
        type: 'command',
        title: 'Erro',
        content: `Erro ao configurar chave: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: Date.now()
      });
    }
  };

  const handleEmailConfigSet = async (provider: 'gmail' | 'outlook' | 'custom', email: string, password: string, customConfig?: { host: string; port: number; tls: boolean }) => {
    try {
      let result;
      if (provider === 'gmail') {
        result = await window.electronAPI.configureGmail(email, password);
      } else if (provider === 'outlook') {
        result = await window.electronAPI.configureOutlook(email, password);
      } else if (provider === 'custom' && customConfig) {
        result = await window.electronAPI.setEmailConfig({
          user: email,
          password: password,
          host: customConfig.host,
          port: customConfig.port,
          tls: customConfig.tls
        });
      } else {
        throw new Error('Configuração inválida');
      }
      
      if (result.success) {
        setHasEmailConfig(true);
        addSuggestion({
          id: Date.now().toString(),
          type: 'command',
          title: 'Configuração',
          content: `${provider === 'gmail' ? 'Gmail' : provider === 'outlook' ? 'Outlook' : 'Servidor personalizado'} configurado com sucesso!`,
          timestamp: Date.now()
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      addSuggestion({
        id: Date.now().toString(),
        type: 'command',
        title: 'Erro',
        content: `Erro ao configurar email: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: Date.now()
      });
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setChatHistory([]);
    localStorage.removeItem('duckduki-chat-history');
  };

  if (showSettings) {
    return (
      <SettingsPanel
        onClose={() => setShowSettings(false)}
        onGroqKeySet={handleGroqKeySet}
        hasGroqKey={hasGroqKey}
        onEmailConfigSet={handleEmailConfigSet}
        hasEmailConfig={hasEmailConfig}
      />
    );
  }

  return (
    <ThemeProvider>
      <div className="app theme-transition">
        <div className="app-header">
          <div className="header-title">
            <h1>Duckduki</h1>
            <span className={`status-indicator ${hasGroqKey ? 'active' : 'inactive'}`}>
              {hasGroqKey ? '🟢 Ativo' : '🔴 Configure API'}
            </span>
          </div>
          <div className="header-controls">
            <div className="control-group">
              <span className="control-group-label">Painéis</span>
              <button 
                className="feed-panel-btn"
                onClick={() => setShowFeedPanel(true)}
                title="Quadro de Ideias - Tendências Tech"
              >
                💡
              </button>
              <button 
                className="task-manager-btn"
                onClick={() => setShowTaskManager(true)}
                title="Organizador de Tarefas com IA"
              >
                📋
              </button>
              <button 
                className="knowledge-panel-btn"
                onClick={() => setShowKnowledgePanel(true)}
                title="Repositório de Conhecimento"
              >
                🧠
              </button>

            </div>
            
            <div className="control-group">
              <span className="control-group-label">Exibição</span>
              <FullscreenButton />
              <ThemeToggle />
            </div>
            
            <button 
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              title="Configurações"
            >
              ⚙️
            </button>
          </div>
        </div>

        <div className="suggestions-container">
          <div className="suggestions-header">
            <h3>Sugestões e Respostas</h3>
            {suggestions.length > 0 && (
              <button 
                className="clear-btn"
                onClick={clearSuggestions}
                title="Limpar histórico"
              >
                🗑️
              </button>
            )}
          </div>

          {hasGroqKey ? (
            <div className="chat-main-container">
              <AIChat 
                isVisible={true}
                onClose={() => {}}
              />
            </div>
          ) : (
            <div className="setup-required-main">
              <div className="welcome-icon">🦆</div>
              <h2>Bem-vindo ao Duckduki!</h2>
              <p>Seu assistente de produtividade inteligente</p>
              <div className="setup-required">
                <p>⚙️ Configure sua chave Groq para começar</p>
                <button 
                  className="setup-btn"
                  onClick={() => setShowSettings(true)}
                >
                  Configurar Agora
                </button>
              </div>
            </div>
          )}
        </div>
        
        <FeedPanel 
          isVisible={showFeedPanel}
          onClose={() => setShowFeedPanel(false)}
        />

        <TaskManager 
          isVisible={showTaskManager}
          onClose={() => setShowTaskManager(false)}
        />

        <KnowledgePanel
          isVisible={showKnowledgePanel}
          onClose={() => setShowKnowledgePanel(false)}
        />


      </div>
    </ThemeProvider>
  );
};

export default App; 