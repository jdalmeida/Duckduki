import React from 'react';
import './CornerMask.css';

interface CornerMaskProps {
  backgroundColor?: string;
}

export const CornerMask: React.FC<CornerMaskProps> = ({ 
  backgroundColor = 'var(--bg-primary)' 
}) => {
  return (
    <div className="corner-mask-container">
      {/* Canto superior esquerdo */}
      <div 
        className="corner-mask corner-top-left"
        style={{ backgroundColor }}
      />
      {/* Canto superior direito */}
      <div 
        className="corner-mask corner-top-right"
        style={{ backgroundColor }}
      />
      {/* Canto inferior esquerdo */}
      <div 
        className="corner-mask corner-bottom-left"
        style={{ backgroundColor }}
      />
      {/* Canto inferior direito */}
      <div 
        className="corner-mask corner-bottom-right"
        style={{ backgroundColor }}
      />
    </div>
  );
};

export default CornerMask; 