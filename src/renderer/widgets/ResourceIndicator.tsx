import React from 'react';
import './ResourceIndicator.css';

interface SystemStatus {
  cpu: number;
  memory: number;
  activeApp: {
    name: string;
    title: string;
    pid: number;
  } | null;
}

interface ResourceIndicatorProps {
  status: SystemStatus | null;
}

const ResourceIndicator: React.FC<ResourceIndicatorProps> = ({ status }) => {
  if (!status) {
    return (
      <div className="resource-indicator loading">
        <span>Carregando status do sistema...</span>
      </div>
    );
  }

  const getCpuColor = (cpu: number) => {
    if (cpu < 50) return '#38a169';
    if (cpu < 80) return '#ed8936';
    return '#e53e3e';
  };

  const getMemoryColor = (memory: number) => {
    if (memory < 60) return '#38a169';
    if (memory < 85) return '#ed8936';
    return '#e53e3e';
  };

  return (
    <div className="resource-indicator">
      <div className="system-stats">
        <div className="stat-item">
          <span className="stat-label">CPU</span>
          <div className="stat-bar">
            <div 
              className="stat-fill"
              style={{ 
                width: `${status.cpu}%`,
                backgroundColor: getCpuColor(status.cpu)
              }}
            />
          </div>
          <span className="stat-value">{status.cpu}%</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">RAM</span>
          <div className="stat-bar">
            <div 
              className="stat-fill"
              style={{ 
                width: `${status.memory}%`,
                backgroundColor: getMemoryColor(status.memory)
              }}
            />
          </div>
          <span className="stat-value">{status.memory}%</span>
        </div>
      </div>
      
      {status.activeApp && (
        <div className="active-app">
          <span className="app-label">📱 Último App:</span>
          <span className="app-name" title={status.activeApp.title}>
            {status.activeApp.name}
          </span>
        </div>
      )}
      
      {!status.activeApp && (
        <div className="active-app">
          <span className="app-label">📱 App:</span>
          <span className="app-name no-app">Nenhum detectado</span>
        </div>
      )}
    </div>
  );
};

export default ResourceIndicator; 