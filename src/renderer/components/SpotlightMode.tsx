import React, { useState, useEffect, useRef } from 'react';
import './SpotlightMode.css';
import { AIResponsePopup } from './AIResponsePopup';
import { 
  MdLightbulb, 
  MdChecklist, 
  MdMemory, 
  MdSettings, 
  MdFullscreen,
  MdEmail,
  MdAdd,
  MdAnalytics,
  MdList,
  MdNewspaper,
  MdSearch,
  MdNote,
  MdFindInPage,
  MdComputer,
  MdCode,
  MdBuild,
  MdAutoAwesome
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
  const inputRef = useRef<HTMLInputElement>(null);
  const resultItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  // Estados do popup de resposta da IA
  const [showAIPopup, setShowAIPopup] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTitle, setAiTitle] = useState('');

  const commands: Command[] = [
    // === COMANDOS PRINCIPAIS ===
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
    },

    // === FERRAMENTAS DE IA ===
    {
      id: 'ai-email-summary',
      title: 'Resumo de Emails',
      description: 'IA analisa e resume emails recentes',
      icon: <MdEmail />,
      action: () => executeAICommand('Use a ferramenta getEmailSummary para obter e resumir meus emails recentes', 'Resumo de Emails'),
      keywords: ['email', 'emails', 'resumo', 'caixa', 'correio', 'mensagens']
    },
    {
      id: 'ai-add-task',
      title: 'Criar Tarefa com IA',
      description: 'Criar nova tarefa com sugestões inteligentes',
      icon: <MdAdd />,
      action: () => {
        const taskDesc = prompt('Digite a descrição da tarefa:');
        if (taskDesc) executeAICommand(`Use a ferramenta addTask para criar uma nova tarefa: ${taskDesc}`, 'Nova Tarefa');
      },
      keywords: ['criar', 'adicionar', 'nova', 'tarefa', 'task', 'todo']
    },
    {
      id: 'ai-task-stats',
      title: 'Estatísticas de Tarefas',
      description: 'Visualizar estatísticas e progresso das tarefas',
      icon: <MdAnalytics />,
      action: () => executeAICommand('Use a ferramenta getTaskStats para mostrar estatísticas das minhas tarefas', 'Estatísticas de Tarefas'),
      keywords: ['estatisticas', 'stats', 'progresso', 'relatório', 'dashboard']
    },
    {
      id: 'ai-task-suggestions',
      title: 'Sugestões de Produtividade',
      description: 'IA sugere otimizações para suas tarefas',
      icon: <MdAutoAwesome />,
      action: () => executeAICommand('Use a ferramenta getTaskSuggestions para dar sugestões de otimização das minhas tarefas', 'Sugestões de Produtividade'),
      keywords: ['sugestões', 'otimizar', 'produtividade', 'melhorar', 'eficiência']
    },
    {
      id: 'ai-list-tasks',
      title: 'Listar Tarefas',
      description: 'Ver todas as tarefas pendentes',
      icon: <MdList />,
      action: () => executeAICommand('Use a ferramenta getTasks para listar todas as minhas tarefas', 'Lista de Tarefas'),
      keywords: ['listar', 'ver', 'tarefas', 'lista', 'pendentes', 'todas']
    },
    {
      id: 'ai-tech-news',
      title: 'Notícias de Tecnologia',
      description: 'Buscar últimas notícias tech com IA',
      icon: <MdNewspaper />,
      action: () => executeAICommand('Use a ferramenta getTechNews para buscar as últimas notícias de tecnologia', 'Notícias de Tecnologia'),
      keywords: ['noticias', 'tech', 'tecnologia', 'hackernews', 'reddit', 'github']
    },
    {
      id: 'ai-search-news',
      title: 'Buscar Notícias Específicas',
      description: 'Buscar notícias por palavras-chave',
      icon: <MdSearch />,
      action: () => {
        const keywords = prompt('Digite as palavras-chave para buscar:');
        if (keywords) executeAICommand(`Use a ferramenta searchNews para buscar notícias sobre: ${keywords}`, 'Busca de Notícias');
      },
      keywords: ['buscar', 'procurar', 'noticia', 'pesquisar', 'filtrar']
    },
    {
      id: 'ai-save-note',
      title: 'Salvar Nota',
      description: 'Salvar informação no repositório de conhecimento',
      icon: <MdNote />,
      action: () => {
        const title = prompt('Título da nota:');
        if (title) {
          const content = prompt('Conteúdo da nota:');
          if (content) executeAICommand(`Use a ferramenta saveNote para salvar uma nota com título "${title}" e conteúdo: ${content}`, 'Salvar Nota');
        }
      },
      keywords: ['salvar', 'nota', 'anotar', 'guardar', 'documentar', 'memo']
    },
    {
      id: 'ai-search-knowledge',
      title: 'Buscar no Conhecimento',
      description: 'Procurar informações salvas anteriormente',
      icon: <MdFindInPage />,
      action: () => {
        const searchQuery = prompt('O que você quer buscar?');
        if (searchQuery) executeAICommand(`Use a ferramenta searchKnowledge para buscar: ${searchQuery}`, 'Busca no Conhecimento');
      },
      keywords: ['buscar', 'procurar', 'encontrar', 'pesquisar', 'base', 'conhecimento']
    },
    {
      id: 'ai-system-status',
      title: 'Status do Sistema',
      description: 'Verificar CPU, memória e aplicativo ativo',
      icon: <MdComputer />,
      action: () => executeAICommand('Use a ferramenta getSystemStatus para mostrar o status do sistema', 'Status do Sistema'),
      keywords: ['sistema', 'status', 'cpu', 'memoria', 'performance', 'monitorar']
    },
    {
      id: 'ai-analyze-code',
      title: 'Analisar Código',
      description: 'IA analisa o código do projeto atual',
      icon: <MdCode />,
      action: () => executeAICommand('Use a ferramenta analyzeCurrentCode para analisar o código do projeto', 'Análise de Código'),
      keywords: ['analisar', 'codigo', 'revisar', 'code', 'review', 'projeto']
    },
    {
      id: 'ai-run-build',
      title: 'Executar Build',
      description: 'Compilar e construir o projeto',
      icon: <MdBuild />,
      action: () => executeAICommand('Use a ferramenta runBuild para executar o build do projeto', 'Executar Build'),
      keywords: ['build', 'compilar', 'construir', 'executar', 'npm']
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

  // Separar comandos filtrados por categoria
  const primaryCommands = filteredCommands.filter(cmd => 
    ['feed', 'tasks', 'knowledge', 'settings', 'fullscreen'].includes(cmd.id)
  );
  
  const aiCommands = filteredCommands.filter(cmd => 
    cmd.id.startsWith('ai-')
  );

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
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Função para executar comandos da IA
  const executeAICommand = async (command: string, title: string) => {
    if (!hasGroqKey) {
      alert('Configure uma chave de API primeiro nas configurações!');
      return;
    }

    try {
      setAiLoading(true);
      setAiTitle(title);
      setShowAIPopup(true);
      
      const result = await window.electronAPI.processCommand(command);
      
      if (result.success) {
        setAiResponse(result.response);
      } else {
        setAiResponse(`Erro: ${result.error}`);
      }
    } catch (error) {
      setAiResponse(`Erro ao processar comando: ${error}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Função para lidar com seleção de comandos
  const handleCommandSelect = (command: Command) => {
    command.action();
    setQuery('');
  };

  // Lidar com teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalCommands = primaryCommands.length + aiCommands.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, totalCommands - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (query.trim() && filteredCommands.length === 0 && hasGroqKey) {
          // Enviar query diretamente para IA
          executeAICommand(query, `Comando: "${query}"`);
        } else if (filteredCommands.length > 0) {
          // Executar comando selecionado
          const allFilteredCommands = [...primaryCommands, ...aiCommands];
          if (allFilteredCommands[selectedIndex]) {
            handleCommandSelect(allFilteredCommands[selectedIndex]);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setQuery('');
        setSelectedIndex(0);
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

  return (
    <div className="spotlight-container">
      <div className="spotlight-search">
        <MdSearch className="search-icon" />
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
          {/* Comandos principais */}
          {primaryCommands.length > 0 && (
            <>
              <div className="result-separator">Comandos Principais</div>
              {primaryCommands.map((command, index) => (
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
            </>
          )}

          {/* Ferramentas de IA */}
          {aiCommands.length > 0 && (
            <>
              <div className="result-separator">Ferramentas de IA</div>
              {aiCommands.map((command, index) => {
                const actualIndex = primaryCommands.length + index;
                return (
                  <div
                    key={command.id}
                    ref={(el) => resultItemsRef.current[actualIndex] = el}
                    className={`result-item ${selectedIndex === actualIndex ? 'selected' : ''}`}
                    onClick={() => handleCommandSelect(command)}
                  >
                    <span className="result-icon">{command.icon}</span>
                    <div className="result-content">
                      <div className="result-title">{command.title}</div>
                      <div className="result-description">{command.description}</div>
                    </div>
                    <span className="result-shortcut">⏎</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      ) : query.length > 0 ? (
        <div className="spotlight-message">
          <MdSearch className="message-icon" />
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

      {/* Popup de resposta da IA */}
      {showAIPopup && (
        <AIResponsePopup
          isVisible={showAIPopup}
          title={aiTitle}
          content={aiResponse}
          isLoading={aiLoading}
          onClose={() => setShowAIPopup(false)}
        />
      )}
    </div>
  );
};