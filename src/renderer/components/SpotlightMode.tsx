import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './SpotlightMode.css';
import { 
  MdLightbulb, 
  MdChecklist, 
  MdMemory, 
  MdSettings, 
  MdFullscreen,
  MdSend,
  MdChat,
  MdKeyboard
} from 'react-icons/md';

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

interface SpotlightModeProps {
  onOpenFeed: () => void;
  onOpenTasks: () => void;
  onOpenKnowledge: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  onSendCommand?: (command: string) => void;
  hasGroqKey: boolean;
}

export const SpotlightMode: React.FC<SpotlightModeProps> = ({
  onOpenFeed,
  onOpenTasks,
  onOpenKnowledge,
  onOpenSettings,
  onToggleFullscreen,
  hasGroqKey
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook do chat IA
  const { messages, input, handleInputChange, handleSubmit, status, error } = useChat({
    api: 'http://localhost:3003/api/chat',
    fetch: async (url, options = {}) => {
      console.log('🔄 [SPOTLIGHT] Custom fetch para:', url);
      
      // Fazer requisição normal
      const response = await fetch(url, options);
      
      // Se a resposta for JSON simples, processar adequadamente
      if (response.headers.get('content-type')?.includes('application/json')) {
        console.log('📡 [SPOTLIGHT] Detectado JSON simples, processando...');
        
        const data = await response.json();
        console.log('📄 [SPOTLIGHT] Dados recebidos:', data);
        
        // Simular uma resposta de stream de texto para o useChat
        const textResponse = data.content || '';
        const blob = new Blob([textResponse], { type: 'text/plain' });
        
        return new Response(blob, {
          status: response.status,
          headers: {
            'Content-Type': 'text/plain',
          }
        });
      }
      
      // Para outras respostas, retornar como está
      return response;
    },
    streamProtocol: 'text', // Usar protocolo de texto para JSON simples
    onError: (error) => {
      console.error('❌ [SPOTLIGHT] Chat error:', error);
      console.error('❌ [SPOTLIGHT] Error details:', {
        message: error.message,
        stack: error.stack,
        toString: error.toString()
      });
    },
    onFinish: (message, options) => {
      console.log('✅ [SPOTLIGHT] Chat message finished:', message);
    },
    onResponse: (response) => {
      console.log('📡 [SPOTLIGHT] Response status:', response.status);
      console.log('📡 [SPOTLIGHT] Response headers:', Object.fromEntries(response.headers.entries()));
      if (!response.ok) {
        console.error('❌ [SPOTLIGHT] Response not OK:', response.statusText);
      }
    }
  });

  // Comandos principais (mais simples)
  const commands: Command[] = [
    {
      id: 'chat',
      title: 'Conversar com IA',
      description: 'Abrir chat inteligente com ferramentas',
      icon: <MdChat />,
      action: () => {
        setShowChat(true);
        setQuery('');
      },
      keywords: ['chat', 'ia', 'conversar', 'perguntar', 'ai']
    },
    {
      id: 'feed',
      title: 'Quadro de Ideias',
      description: 'Tendências e insights tecnológicos',
      icon: <MdLightbulb />,
      action: onOpenFeed,
      keywords: ['feed', 'ideias', 'trends', 'tecnologia', 'insights']
    },
    {
      id: 'tasks',
      title: 'Organizador de Tarefas',
      description: 'Gerencie suas tarefas com IA',
      icon: <MdChecklist />,
      action: onOpenTasks,
      keywords: ['tasks', 'tarefas', 'todo', 'organizador', 'gerenciar']
    },
    {
      id: 'knowledge',
      title: 'Repositório de Conhecimento',
      description: 'Base de conhecimento e documentação',
      icon: <MdMemory />,
      action: onOpenKnowledge,
      keywords: ['knowledge', 'conhecimento', 'docs', 'documentação', 'base']
    },
    {
      id: 'settings',
      title: 'Configurações',
      description: 'Configurar API keys e preferências',
      icon: <MdSettings />,
      action: onOpenSettings,
      keywords: ['settings', 'configurações', 'config', 'api', 'preferencias']
    },
    {
      id: 'fullscreen',
      title: 'Modo Tela Cheia',
      description: 'Alternar para interface completa',
      icon: <MdFullscreen />,
      action: onToggleFullscreen,
      keywords: ['fullscreen', 'tela cheia', 'expandir', 'maximizar']
    }
  ];

  // Filtrar comandos baseado na query
  const filteredCommands = query.trim() === '' 
    ? commands 
    : commands.filter(cmd => 
        cmd.title.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description.toLowerCase().includes(query.toLowerCase()) ||
        cmd.keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase()))
      );

  // Auto scroll para última mensagem no chat
  useEffect(() => {
    if (showChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  // Resetar índice selecionado quando os comandos mudam
  useEffect(() => {
    setSelectedIndex(0);
    resultItemsRef.current = [];
  }, [query]);

  // Scroll automático quando a seleção muda
  useEffect(() => {
    const selectedElement = resultItemsRef.current[selectedIndex];
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Focar no input quando o componente é montado
  useEffect(() => {
    if (inputRef.current && !showChat) {
      inputRef.current.focus();
    }
  }, [showChat]);

  // Função para lidar com seleção de comandos
  const handleCommandSelect = (command: Command) => {
    command.action();
    setQuery('');
  };

  // Lidar com teclas no modo busca
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showChat) return; // Não interceptar teclas no modo chat
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (query.trim() && filteredCommands.length === 0 && hasGroqKey) {
          // Abrir chat e enviar query diretamente
          setShowChat(true);
          handleInputChange({ target: { value: query } } as any);
          setQuery('');
        } else if (filteredCommands.length > 0) {
          // Executar comando selecionado
          handleCommandSelect(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (showChat) {
          setShowChat(false);
        } else {
          setQuery('');
          setSelectedIndex(0);
        }
        break;
      case 'k':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          setQuery('');
          setSelectedIndex(0);
        }
        break;
    }
  };

  // Renderizar interface de chat
  if (showChat) {
    return (
      <div className="spotlight-container spotlight-chat-mode">
        <div className="spotlight-chat-header">
          <div className="spotlight-chat-title">
            <span>Chat IA</span>
            <span className="spotlight-chat-status">
              {status === 'streaming' ? '⚡ Pensando...' : '💬 Pronto'}
            </span>
          </div>
          <button 
            className="spotlight-chat-back"
            onClick={() => setShowChat(false)}
          >
            ← Voltar
          </button>
        </div>

        <div className="spotlight-chat-messages">
          {messages.length === 0 && (
            <div className="spotlight-chat-welcome">
              <MdChat className="welcome-icon" />
              <h4>Olá! Sou o Duckduki</h4>
              <p>Posso ajudar com tarefas, notícias, sistema e muito mais!</p>
              <div className="spotlight-chat-suggestions">
                <button onClick={() => handleInputChange({ target: { value: 'Quais são as últimas notícias de tecnologia?' } } as any)}>
                  📰 Notícias
                </button>
                <button onClick={() => handleInputChange({ target: { value: 'Criar uma tarefa para estudar React' } } as any)}>
                  📋 Nova tarefa
                </button>
                <button onClick={() => handleInputChange({ target: { value: 'Como está o sistema?' } } as any)}>
                  💻 Sistema
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`spotlight-chat-message ${
                message.role === 'user' ? 'spotlight-chat-message-user' : 'spotlight-chat-message-assistant'
              }`}
            >
              <div className="spotlight-chat-message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="spotlight-chat-message-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                <div className="spotlight-chat-message-time">
                  {new Date(message.createdAt || Date.now()).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}

          {status === 'streaming' && (
            <div className="spotlight-chat-message spotlight-chat-message-assistant">
              <div className="spotlight-chat-message-avatar">🤖</div>
              <div className="spotlight-chat-message-content">
                <div className="spotlight-chat-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="spotlight-chat-error">
              <span>⚠️ Erro: {error.message}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form className="spotlight-chat-form" onSubmit={handleSubmit}>
          <div className="spotlight-chat-input-container">
            <input
              className="spotlight-chat-input"
              value={input}
              onChange={handleInputChange}
              placeholder="Digite sua mensagem..."
              disabled={status === 'streaming'}
              autoFocus
            />
            <button
              type="submit"
              className="spotlight-chat-send"
              disabled={status === 'streaming' || !input.trim()}
            >
              <MdSend />
            </button>
          </div>
          
          <div className="spotlight-chat-tools">
            <span>🛠️ Ferramentas: Email, Tarefas, Notícias, Conhecimento, Sistema, Build</span>
          </div>
        </form>

        <div className="spotlight-footer">
          <div className="footer-shortcuts">
            <span><kbd>Esc</kbd> Voltar</span>
            <span><kbd>⏎</kbd> Enviar</span>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar interface padrão de busca
  return (
    <div className="spotlight-container">
      <div className="spotlight-search">
        <img src="icon.png" alt="Duckduki" className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Digite para buscar comandos ou conversar com IA..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>

      {filteredCommands.length > 0 ? (
        <div className="spotlight-results">
          {filteredCommands.map((command, index) => (
            <div
              key={command.id}
              ref={(el) => resultItemsRef.current[index] = el}
              className={`result-item ${selectedIndex === index ? 'selected' : ''}`}
              onClick={() => handleCommandSelect(command)}
            >
              <span className="result-icon">{command.icon}</span>
              <div className="result-content">
                <div className="result-title">{command.title}</div>
                <div className="result-description">{command.description}</div>
              </div>
              <span className="result-shortcut">⏎</span>
            </div>
          ))}
        </div>
      ) : query.length > 0 ? (
        <div className="spotlight-message">
          <MdChat className="message-icon" />
          <div className="message-content">
            <div className="message-title">
              {hasGroqKey ? 'Conversar com IA' : 'Configure a IA'}
            </div>
            <div className="message-description">
              {hasGroqKey 
                ? `Pressione Enter para enviar "${query}" para a IA processar.`
                : 'Configure uma chave de API nas configurações para usar a IA.'
              }
            </div>
          </div>
        </div>
      ) : (
        <div className="spotlight-message">
          <MdLightbulb className="message-icon" />
          <div className="message-content">
            <div className="message-title">Bem-vindo ao Duckduki</div>
            <div className="message-description">
              Digite para buscar comandos ou converse diretamente com a IA.
            </div>
          </div>
        </div>
      )}

      <div className="spotlight-footer">
        <div className="footer-shortcuts">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navegar</span>
          <span><kbd>⏎</kbd> Executar</span>
          <span><kbd>Esc</kbd> Fechar</span>
        </div>
      </div>
    </div>
  );
};