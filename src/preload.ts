import { contextBridge, ipcRenderer } from 'electron';

// Interface para API exposta ao renderer
export interface ElectronAPI {
  // Comandos Groq
  processCommand: (command: string) => Promise<any>;
  getEmailSummary: () => Promise<any>;
  analyzeCurrentCode: () => Promise<any>;
  
  // Build/Deploy
  runBuild: () => Promise<any>;
  
  // Sistema
  getSystemStatus: () => Promise<any>;
  getWindowHistory: () => Promise<any>;
  getHistoryStats: () => Promise<any>;
  cleanupHistory: () => Promise<any>;
  
  // Configurações
  setGroqKey: (apiKey: string) => Promise<any>;
  hasGroqKey: () => Promise<any>;
  clearData: () => Promise<any>;
  
  // Configurações de Email
  setEmailConfig: (config: { user: string; password: string; host: string; port: number; tls: boolean }) => Promise<any>;
  hasEmailConfig: () => Promise<any>;
  configureGmail: (email: string, appPassword: string) => Promise<any>;
  configureOutlook: (email: string, password: string) => Promise<any>;
  removeEmailConfig: () => Promise<any>;
  
  // Listeners
  onContextualSuggestion: (callback: (suggestion: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}

const electronAPI: ElectronAPI = {
  // Comandos Groq
  processCommand: (command: string) => 
    ipcRenderer.invoke('process-command', command),
  
  getEmailSummary: () => 
    ipcRenderer.invoke('get-email-summary'),
  
  analyzeCurrentCode: () => 
    ipcRenderer.invoke('analyze-current-code'),
  
  // Build/Deploy
  runBuild: () => 
    ipcRenderer.invoke('run-build'),
  
  // Sistema
  getSystemStatus: () => 
    ipcRenderer.invoke('get-system-status'),
  
  getWindowHistory: () => 
    ipcRenderer.invoke('get-window-history'),
  
  getHistoryStats: () => 
    ipcRenderer.invoke('get-history-stats'),
  
  cleanupHistory: () => 
    ipcRenderer.invoke('cleanup-history'),
  
  // Configurações
  setGroqKey: (apiKey: string) => 
    ipcRenderer.invoke('set-groq-key', apiKey),
  
  hasGroqKey: () => 
    ipcRenderer.invoke('has-groq-key'),
  
  clearData: () => 
    ipcRenderer.invoke('clear-data'),
  
  // Configurações de Email
  setEmailConfig: (config: { user: string; password: string; host: string; port: number; tls: boolean }) => 
    ipcRenderer.invoke('set-email-config', config),
  
  hasEmailConfig: () => 
    ipcRenderer.invoke('has-email-config'),
  
  configureGmail: (email: string, appPassword: string) => 
    ipcRenderer.invoke('configure-gmail', email, appPassword),
  
  configureOutlook: (email: string, password: string) => 
    ipcRenderer.invoke('configure-outlook', email, password),
  
  removeEmailConfig: () => 
    ipcRenderer.invoke('remove-email-config'),
  
  // Listeners
  onContextualSuggestion: (callback: (suggestion: any) => void) => {
    ipcRenderer.on('contextual-suggestion', (_, suggestion) => callback(suggestion));
  },
  
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
};

// Expor API para o renderer de forma segura
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Declaração global para TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 