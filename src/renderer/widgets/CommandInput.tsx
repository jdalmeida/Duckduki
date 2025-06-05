import React, { useState, useRef, useEffect } from 'react';
import './CommandInput.css';

interface CommandInputProps {
  onCommand: (command: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

const CommandInput: React.FC<CommandInputProps> = ({ onCommand, isLoading, disabled }) => {
  const [command, setCommand] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Verificar suporte para Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true);
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCommand(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !disabled && !isLoading) {
      onCommand(command.trim());
      setCommand('');
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !disabled) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="command-input-container">
      <form onSubmit={handleSubmit} className="command-form">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              disabled 
                ? "Configure a chave Groq primeiro..." 
                : isListening 
                  ? "🎤 Escutando..."
                  : "Digite um comando ou use o microfone..."
            }
            className={`command-input ${isLoading ? 'loading' : ''} ${disabled ? 'disabled' : ''}`}
            disabled={disabled || isLoading}
          />
          
          {speechSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`voice-btn ${isListening ? 'listening' : ''} ${disabled ? 'disabled' : ''}`}
              disabled={disabled || isLoading}
              title={isListening ? "Parar gravação" : "Gravar comando por voz"}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          )}
          
          <button
            type="submit"
            className={`submit-btn ${disabled || !command.trim() ? 'disabled' : ''}`}
            disabled={disabled || isLoading || !command.trim()}
            title="Enviar comando"
          >
            {isLoading ? '⏳' : '▶️'}
          </button>
        </div>
      </form>

      <div className="quick-suggestions">
        <button
          onClick={() => setCommand('resumo dos emails')}
          className="suggestion-pill"
          disabled={disabled}
        >
          📧 E-mails
        </button>
        <button
          onClick={() => setCommand('analisar código atual')}
          className="suggestion-pill"
          disabled={disabled}
        >
          💻 Código
        </button>
        <button
          onClick={() => setCommand('executar build')}
          className="suggestion-pill"
          disabled={disabled}
        >
          🔨 Build
        </button>
        <button
          onClick={() => setCommand('planejar meu dia')}
          className="suggestion-pill"
          disabled={disabled}
        >
          📅 Planejamento
        </button>
      </div>
    </div>
  );
};

export default CommandInput; 