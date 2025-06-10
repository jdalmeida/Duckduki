import React, { useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './AIChat.css';

interface AIChatProps {
  isVisible: boolean;
  onClose: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({ isVisible, onClose }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit, status, error } = useChat({
    api: 'http://localhost:3003/api/chat',
    onError: (error) => {
      console.error('❌ [FRONTEND] Chat error:', error);
      console.error('❌ [FRONTEND] Error stack:', error.stack);
      console.error('❌ [FRONTEND] Error details:', {
        name: error.name,
        message: error.message,
        toString: error.toString()
      });
    },
    onFinish: (message, options) => {
      console.log('✅ [FRONTEND] Chat message finished:', message);
      console.log('📊 [FRONTEND] Usage:', options?.usage);
      console.log('📊 [FRONTEND] Finish reason:', options?.finishReason);
    },
    onResponse: (response) => {
      console.log('📡 [FRONTEND] Response status:', response.status);
      console.log('📡 [FRONTEND] Response headers:', Object.fromEntries(response.headers.entries()));
      if (!response.ok) {
        console.error('❌ [FRONTEND] Response not OK:', response.statusText);
      }
    }
  });

  // Auto scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus no input quando o chat abrir
  useEffect(() => {
    if (isVisible) {
      const inputElement = document.querySelector('.ai-chat-input') as HTMLInputElement;
      inputElement?.focus();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="ai-chat-container-inline">
        <div className="ai-chat-header">
          <div className="ai-chat-title">
            <span className="ai-chat-icon">🤖</span>
            <span>Duckduki AI Chat</span>
            <span className="ai-chat-status">
              {status === 'streaming' ? '⚡ Pensando...' : '💬 Pronto'}
            </span>
          </div>
          <button className="ai-chat-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="ai-chat-messages">
          {messages.length === 0 && (
            <div className="ai-chat-welcome">
              <img src="icon.png" alt="Duckduki" className="ai-chat-welcome-icon" />
              <h3>Olá! Sou o Duckduki</h3>
              <p>
                Posso ajudar você com suas tarefas, buscar notícias de tecnologia, 
                salvar notas, verificar o sistema e muito mais!
              </p>
              <div className="ai-chat-suggestions">
                <span>Experimente:</span>
                <div className="ai-chat-suggestion-pills">
                  <button onClick={() => handleInputChange({ target: { value: 'Quais são as últimas notícias de tecnologia?' } } as any)}>
                    📰 Últimas notícias
                  </button>
                  <button onClick={() => handleInputChange({ target: { value: 'Criar uma tarefa para estudar React' } } as any)}>
                    📋 Criar tarefa
                  </button>
                  <button onClick={() => handleInputChange({ target: { value: 'Como está o sistema?' } } as any)}>
                    💻 Status do sistema
                  </button>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`ai-chat-message ${
                message.role === 'user' ? 'ai-chat-message-user' : 'ai-chat-message-assistant'
              }`}
            >
              <div className="ai-chat-message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="ai-chat-message-content">
                <div className="ai-chat-message-text">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                </div>
                <div className="ai-chat-message-time">
                  {new Date(message.createdAt || Date.now()).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}

          {status === 'streaming' && (
            <div className="ai-chat-message ai-chat-message-assistant">
              <div className="ai-chat-message-avatar">🤖</div>
              <div className="ai-chat-message-content">
                <div className="ai-chat-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="ai-chat-error">
              <span className="ai-chat-error-icon">⚠️</span>
              <span>Erro: {error.message}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form className="ai-chat-form" onSubmit={(e) => {
          console.log('🚀 [FRONTEND] Enviando mensagem:', input);
          handleSubmit(e);
        }}>
          <div className="ai-chat-input-container">
            <input
              className="ai-chat-input"
              value={input}
              onChange={handleInputChange}
              placeholder="Digite sua mensagem..."
              disabled={status === 'streaming'}
            />
            <button
              type="submit"
              className="ai-chat-send"
              disabled={status === 'streaming' || !input.trim()}
            >
              {status === 'streaming' ? '⏳' : '📤'}
            </button>
          </div>
          
          <div className="ai-chat-tools-indicator">
            <span className="ai-chat-tools-icon">🛠️</span>
            <span>Ferramentas ativas: Email, Tarefas Completas, Notícias, Conhecimento, Sistema, Build</span>
          </div>
        </form>
      </div>
  );
}; 