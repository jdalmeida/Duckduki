import React, { useState, useEffect, useRef } from 'react';
import './SpotlightMode.css';
import { AIResponsePopup } from './AIResponsePopup';

interface Command {
  id: string;
  title: string;
  description: string;
  icon: string;
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
  onSendCommand,
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
      icon: '💡',
      action: onOpenFeed,
      keywords: ['feed', 'ideias', 'trends', 'tecnologia', 'insights']
    },
    {
      id: 'tasks',
      title: 'Organizador de Tarefas',
      description: 'Gerencie suas tarefas com IA',
      icon: '📋',
      action: onOpenTasks,
      keywords: ['tasks', 'tarefas', 'todo', 'organizador', 'gerenciar']
    },
    {
      id: 'knowledge',
      title: 'Repositório de Conhecimento',
      description: 'Base de conhecimento e documentação',
      icon: '🧠',
      action: onOpenKnowledge,
      keywords: ['knowledge', 'conhecimento', 'docs', 'documentação', 'base']
    },
    {
      id: 'settings',
      title: 'Configurações',
      description: 'Configurar API keys e preferências',
      icon: '⚙️',
      action: onOpenSettings,
      keywords: ['settings', 'configurações', 'config', 'api', 'preferencias']
    },
    {
      id: 'fullscreen',
      title: 'Modo Tela Cheia',
      description: 'Alternar para interface completa',
      icon: '🖥️',
      action: onToggleFullscreen,
      keywords: ['fullscreen', 'tela cheia', 'expandir', 'maximizar']
    },

    // === FERRAMENTAS DE IA - EMAIL ===
    {
      id: 'ai-email-summary',
      title: 'Resumo de Emails',
      description: 'IA analisa e resume emails recentes',
      icon: '📧',
      action: () => executeAICommand('Use a ferramenta getEmailSummary para obter e resumir meus emails recentes', 'Resumo de Emails'),
      keywords: ['email', 'emails', 'resumo', 'caixa', 'correio', 'mensagens']
    },

    // === FERRAMENTAS DE IA - TAREFAS ===
    {
      id: 'ai-add-task',
      title: 'Criar Tarefa com IA',
      description: 'Criar nova tarefa com sugestões inteligentes',
      icon: '➕',
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
      icon: '📊',
      action: () => executeAICommand('Use a ferramenta getTaskStats para mostrar estatísticas das minhas tarefas', 'Estatísticas de Tarefas'),
      keywords: ['estatisticas', 'stats', 'progresso', 'relatório', 'dashboard']
    },
    {
      id: 'ai-task-suggestions',
      title: 'Sugestões de Produtividade',
      description: 'IA sugere otimizações para suas tarefas',
      icon: '💡',
      action: () => executeAICommand('Use a ferramenta getTaskSuggestions para dar sugestões de otimização das minhas tarefas', 'Sugestões de Produtividade'),
      keywords: ['sugestões', 'otimizar', 'produtividade', 'melhorar', 'eficiência']
    },
    {
      id: 'ai-list-tasks',
      title: 'Listar Tarefas',
      description: 'Ver todas as tarefas pendentes',
      icon: '📝',
      action: () => executeAICommand('Use a ferramenta getTasks para listar todas as minhas tarefas', 'Lista de Tarefas'),
      keywords: ['listar', 'ver', 'tarefas', 'lista', 'pendentes', 'todas']
    },

    // === FERRAMENTAS DE IA - NOTÍCIAS ===
    {
      id: 'ai-tech-news',
      title: 'Notícias de Tecnologia',
      description: 'Buscar últimas notícias tech com IA',
      icon: '📰',
      action: () => executeAICommand('Use a ferramenta getTechNews para buscar as últimas notícias de tecnologia', 'Notícias de Tecnologia'),
      keywords: ['noticias', 'tech', 'tecnologia', 'hackernews', 'reddit', 'github']
    },
    {
      id: 'ai-search-news',
      title: 'Buscar Notícias Específicas',
      description: 'Buscar notícias por palavras-chave',
      icon: '🔍',
      action: () => {
        const keywords = prompt('Digite as palavras-chave para buscar:');
        if (keywords) executeAICommand(`Use a ferramenta searchNews para buscar notícias sobre: ${keywords}`, 'Busca de Notícias');
      },
      keywords: ['buscar', 'procurar', 'noticia', 'pesquisar', 'filtrar']
    },

    // === FERRAMENTAS DE IA - CONHECIMENTO ===
    {
      id: 'ai-save-note',
      title: 'Salvar Nota',
      description: 'Salvar informação no repositório de conhecimento',
      icon: '📝',
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
      icon: '🔎',
      action: () => {
        const searchQuery = prompt('O que você quer buscar?');
        if (searchQuery) executeAICommand(`Use a ferramenta searchKnowledge para buscar: ${searchQuery}`, 'Busca no Conhecimento');
      },
      keywords: ['buscar', 'procurar', 'encontrar', 'pesquisar', 'base', 'conhecimento']
    },

    // === FERRAMENTAS DE IA - SISTEMA ===
    {
      id: 'ai-system-status',
      title: 'Status do Sistema',
      description: 'Verificar CPU, memória e aplicativo ativo',
      icon: '💻',
      action: () => executeAICommand('Use a ferramenta getSystemStatus para mostrar o status do sistema', 'Status do Sistema'),
      keywords: ['sistema', 'status', 'cpu', 'memoria', 'performance', 'monitorar']
    },
    {
      id: 'ai-analyze-code',
      title: 'Analisar Código',
      description: 'IA analisa o código do projeto atual',
      icon: '🔍',
      action: () => executeAICommand('Use a ferramenta analyzeCurrentCode para analisar o código do projeto', 'Análise de Código'),
      keywords: ['analisar', 'codigo', 'revisar', 'code', 'review', 'projeto']
    },
    {
      id: 'ai-run-build',
      title: 'Executar Build',
      description: 'Executar build/deploy do projeto',
      icon: '🔨',
      action: () => executeAICommand('Use a ferramenta runBuild para executar o build do projeto', 'Build do Projeto'),
      keywords: ['build', 'compilar', 'deploy', 'construir', 'executar']
    }
  ];

  // Separar comandos por categoria
  const commandCategories = [
    {
      name: 'Principal',
      commands: commands.slice(0, 5) // feed, tasks, knowledge, settings, fullscreen
    },
    {
      name: 'IA - Email',
      commands: commands.slice(5, 6) // email summary
    },
    {
      name: 'IA - Tarefas',
      commands: commands.slice(6, 9) // task commands
    },
    {
      name: 'IA - Notícias',
      commands: commands.slice(9, 11) // news commands
    },
    {
      name: 'IA - Conhecimento',
      commands: commands.slice(11, 13) // knowledge commands
    },
    {
      name: 'IA - Sistema',
      commands: commands.slice(13, 16) // system commands
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

  // Se não há comandos filtrados e a query não está vazia, mostrar opção de comando direto
  const showDirectCommand = filteredCommands.length === 0 && query.trim() !== '' && hasGroqKey;

  const allOptions = showDirectCommand 
    ? [...filteredCommands, {
        id: 'direct-command',
        title: `Executar: "${query}"`,
        description: 'Enviar comando para a IA',
        icon: '🤖',
        action: () => executeAICommand(query, `Comando: "${query}"`),
        keywords: []
      }]
    : filteredCommands;

  // Determinar se deve mostrar com categorias (quando não há filtro)
  const showWithCategories = query.trim() === '' && !showDirectCommand;

  // Função para executar comandos da IA
  const executeAICommand = async (command: string, title: string) => {
    if (!hasGroqKey) {
      setAiTitle('Configuração Necessária');
      setAiResponse('Configure sua chave da API Groq nas configurações primeiro.');
      setShowAIPopup(true);
      return;
    }

    setAiTitle(title);
    setAiResponse('');
    setAiLoading(true);
    setShowAIPopup(true);

    try {
      // Usar a API de processamento de comandos com contexto (que suporta tools)
      const result = await window.electronAPI.processCommandWithContext(command, []);
      
      if (result.success) {
        setAiResponse(result.response || 'Comando executado com sucesso!');
      } else {
        setAiResponse(`Erro: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao executar comando da IA:', error);
      setAiResponse(`Erro ao processar comando: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Resetar índice selecionado quando os comandos mudam
  useEffect(() => {
    setSelectedIndex(0);
    // Limpar refs quando a lista muda
    resultItemsRef.current = [];
  }, [query]);

  // Scroll automático quando a seleção muda
  useEffect(() => {
    const selectedElement = resultItemsRef.current[selectedIndex];
    if (selectedElement) {
      // Usar um pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }, 10);
    }
  }, [selectedIndex]);

  // Focar no input quando o componente é montado
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Lidar com teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (allOptions[selectedIndex]) {
          allOptions[selectedIndex].action();
          setQuery('');
        }
        break;
      case 'Escape':
        e.preventDefault();
        window.electronAPI.closeSpotlightMode();
        setQuery('');
        setSelectedIndex(0);
        break;
    }
  };

  return (
    <div className="spotlight-container">
      <div className="spotlight-search">
        <div className="search-icon">🔍</div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite um comando ou procure por funcionalidades..."
          className="search-input"
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      {allOptions.length > 0 && (
        <div className="spotlight-results">
          {showWithCategories ? (
            // Mostrar com categorias
            commandCategories.map((category, categoryIndex) => (
              <React.Fragment key={`category-${categoryIndex}`}>
                <div className="result-separator">{category.name}</div>
                {category.commands.map((cmd, cmdIndex) => {
                  const globalIndex = commandCategories
                    .slice(0, categoryIndex)
                    .reduce((acc, cat) => acc + cat.commands.length, 0) + cmdIndex;
                  
                  return (
                    <div
                      key={cmd.id}
                      ref={(el) => {
                        resultItemsRef.current[globalIndex] = el;
                      }}
                      className={`result-item ${globalIndex === selectedIndex ? 'selected' : ''}`}
                      onClick={() => {
                        cmd.action();
                        setQuery('');
                      }}
                    >
                      <div className="result-icon">{cmd.icon}</div>
                      <div className="result-content">
                        <div className="result-title">{cmd.title}</div>
                        <div className="result-description">{cmd.description}</div>
                      </div>
                      {globalIndex === selectedIndex && (
                        <div className="result-shortcut">⏎</div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          ) : (
            // Mostrar lista simples (com filtro ou comando direto)
            allOptions.map((cmd, index) => (
              <div
                key={cmd.id}
                ref={(el) => {
                  resultItemsRef.current[index] = el;
                }}
                className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  cmd.action();
                  setQuery('');
                }}
              >
                <div className="result-icon">{cmd.icon}</div>
                <div className="result-content">
                  <div className="result-title">{cmd.title}</div>
                  <div className="result-description">{cmd.description}</div>
                </div>
                {index === selectedIndex && (
                  <div className="result-shortcut">⏎</div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {!hasGroqKey && query.trim() !== '' && filteredCommands.length === 0 && (
        <div className="spotlight-message">
          <div className="message-icon">⚠️</div>
          <div className="message-content">
            <div className="message-title">Configure sua API Key</div>
            <div className="message-description">
              Digite "configurações" para configurar sua chave Groq
            </div>
          </div>
        </div>
      )}

      <div className="spotlight-footer">
        <div className="footer-shortcuts">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>⏎</kbd> executar</span>
          <span><kbd>esc</kbd> limpar</span>
        </div>
      </div>

      {/* Popup de resposta da IA */}
      <AIResponsePopup
        isVisible={showAIPopup}
        title={aiTitle}
        content={aiResponse}
        isLoading={aiLoading}
        onClose={() => setShowAIPopup(false)}
      />
    </div>
  );
}; 