import React, { useEffect, useRef } from 'react';
import './AIResponsePopup.css';

interface AIResponsePopupProps {
  isVisible: boolean;
  title: string;
  content: string;
  isLoading?: boolean;
  onClose: () => void;
}

export const AIResponsePopup: React.FC<AIResponsePopupProps> = ({
  isVisible,
  title,
  content,
  isLoading = false,
  onClose
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      // Focar no popup para permitir scroll com teclado
      popupRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);

  // Fechar clicando fora
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="ai-popup-backdrop" onClick={handleBackdropClick}>
      <div 
        className="ai-popup-container"
        ref={popupRef}
        tabIndex={-1}
      >
        <div className="ai-popup-header">
          <div className="ai-popup-title">
            <span className="ai-popup-icon">🤖</span>
            {title}
          </div>
          <button
            className="ai-popup-close"
            onClick={onClose}
            title="Fechar (ESC)"
          >
            ✕
          </button>
        </div>

        <div className="ai-popup-content">
          {isLoading ? (
            <div className="ai-popup-loading">
              <div className="loading-spinner"></div>
              <p>IA processando seu comando...</p>
            </div>
          ) : (
            <div className="ai-popup-response">
              {content.split('\n').map((line, index) => (
                <p key={index} className={line.trim() === '' ? 'empty-line' : ''}>
                  {line.trim() === '' ? '\u00A0' : line}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="ai-popup-footer">
          <div className="ai-popup-shortcuts">
            <span><kbd>esc</kbd> fechar</span>
            <span><kbd>↑</kbd><kbd>↓</kbd> rolar</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 