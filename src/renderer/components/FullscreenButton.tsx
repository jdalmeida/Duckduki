import React, { useState, useEffect } from 'react';
import './FullscreenButton.css';

interface FullscreenButtonProps {
  className?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({ className = '', onFullscreenChange }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Verificar status inicial
  useEffect(() => {
    checkFullscreenStatus();
  }, []);

  // Verificar status da tela inteira
  const checkFullscreenStatus = async () => {
    try {
      const result = await window.electronAPI.getFullscreenStatus();
      if (result.success) {
        setIsFullscreen(result.isFullScreen);
        onFullscreenChange?.(result.isFullScreen);
      }
    } catch (error) {
      console.error('Erro ao verificar status da tela inteira:', error);
    }
  };

  // Alternar tela inteira
  const toggleFullscreen = async () => {
    try {
      const result = await window.electronAPI.toggleFullscreen();
      if (result.success) {
        setIsFullscreen(result.isFullScreen);
        onFullscreenChange?.(result.isFullScreen);
        console.log(`✅ Tela cheia ${result.isFullScreen ? 'ativada' : 'desativada'}`);
      } else {
        console.error('❌ Erro ao alternar tela inteira:', result.error);
        // Verificar status atual após falha
        setTimeout(checkFullscreenStatus, 500);
      }
    } catch (error) {
      console.error('❌ Erro ao alternar tela inteira:', error);
      // Verificar status atual após falha
      setTimeout(checkFullscreenStatus, 500);
    }
  };

  // Atalho de teclado F11
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        event.preventDefault();
        console.log('🎹 F11 pressionado - alternando fullscreen');
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <button
      className={`fullscreen-button ${className} ${isFullscreen ? 'active' : ''}`}
      onClick={toggleFullscreen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={isFullscreen ? 'Sair da tela inteira (F11)' : 'Entrar em tela inteira (F11)'}
    >
      <div className="fullscreen-icon">
        {isFullscreen ? (
          // Ícone para sair da tela inteira - minimize/contrair
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Quatro setas apontando para dentro */}
            <path
              d="M9 9L5 5M9 9H6M9 9V6M15 9L19 5M15 9H18M15 9V6M9 15L5 19M9 15H6M9 15V18M15 15L19 19M15 15H18M15 15V18"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          // Ícone para entrar em tela inteira - maximize/expandir
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Quatro setas apontando para fora */}
            <path
              d="m 5.5138747,18.323156 4,-4 m -4,4 h 3 m -3,0 v -3 m 14.0000003,3 -4,-4 m 4,4 h -3 m 3,0 v -3 M 5.5872854,3.9883984 l 4,4 m -4,-4 h 3 m -3,0 v 3 m 13.9999996,-3 -4,4 m 4,-4 h -3 m 3,0 v 3"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      
      {isHovered && (
        <span className="fullscreen-tooltip">
          {isFullscreen ? 'Sair (F11)' : 'Tela Inteira (F11)'}
        </span>
      )}
    </button>
  );
}; 