import { contextBridge, ipcRenderer } from 'electron';

// Interface para API exposta ao renderer
export interface ElectronAPI {
  // Comandos Groq
  processCommand: (command: string) => Promise<any>;
  processCommandWithContext: (command: string, chatContext: Array<{ role: string; content: string }>) => Promise<any>;
  processCommandWithContextStream: (command: string, chatContext: Array<{ role: string; content: string }>) => Promise<any>;
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
  
  // Feeds de tendências
  getTechFeeds: (limitPerSource?: number) => Promise<any>;
  getFilteredFeeds: (sources: string[], keywords?: string[]) => Promise<any>;
  clearFeedsCache: () => Promise<any>;
  openExternalUrl: (url: string) => Promise<any>;
  
  // Organizador de tarefas
  addTask: (input: string) => Promise<any>;
  getTasks: (filter?: any) => Promise<any>;
  updateTaskStatus: (taskId: string, status: string) => Promise<any>;
  deleteTask: (taskId: string) => Promise<any>;
  getTaskSuggestions: () => Promise<any>;
  getTaskStats: () => Promise<any>;
  clearCompletedTasks: () => Promise<any>;
  
  // Tela inteira
  toggleFullscreen: () => Promise<any>;
  getFullscreenStatus: () => Promise<any>;
  setFullscreen: (fullscreen: boolean) => Promise<any>;
  
  // Repositório de Conhecimento
  addKnowledgeItem: (item: { title: string; content: string; type: string; tags: string[]; url?: string }) => Promise<any>;
  searchKnowledge: (query: string, type?: string, limit?: number) => Promise<any>;
  getAllKnowledge: (type?: string, limit?: number) => Promise<any>;
  getKnowledgeItem: (id: string) => Promise<any>;
  updateKnowledgeItem: (id: string, updates: any) => Promise<any>;
  deleteKnowledgeItem: (id: string) => Promise<any>;
  getKnowledgeStats: () => Promise<any>;
  getAllKnowledgeTags: () => Promise<any>;
  savePostSummary: (title: string, content: string, url?: string, tags?: string[]) => Promise<any>;
  exportKnowledge: () => Promise<any>;
  importKnowledge: (items: any[]) => Promise<any>;
  clearKnowledge: () => Promise<any>;
}

const electronAPI: ElectronAPI = {
  // Comandos Groq
  processCommand: (command: string) => 
    ipcRenderer.invoke('process-command', command),
  
  processCommandWithContext: (command: string, chatContext: Array<{ role: string; content: string }>) => 
    ipcRenderer.invoke('process-command-with-context', command, chatContext),
  
  processCommandWithContextStream: (command: string, chatContext: Array<{ role: string; content: string }>) => 
    ipcRenderer.invoke('process-command-with-context-stream', command, chatContext),
  
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
  },
  
  // Feeds de tendências
  getTechFeeds: (limitPerSource?: number) => 
    ipcRenderer.invoke('get-tech-feeds', limitPerSource),
  
  getFilteredFeeds: (sources: string[], keywords?: string[]) => 
    ipcRenderer.invoke('get-filtered-feeds', sources, keywords),
  
  clearFeedsCache: () => 
    ipcRenderer.invoke('clear-feeds-cache'),
  
  openExternalUrl: (url: string) => 
    ipcRenderer.invoke('open-external-url', url),
  
  // Organizador de tarefas
  addTask: (input: string) => 
    ipcRenderer.invoke('add-task', input),
  
  getTasks: (filter?: any) => 
    ipcRenderer.invoke('get-tasks', filter),
  
  updateTaskStatus: (taskId: string, status: string) => 
    ipcRenderer.invoke('update-task-status', taskId, status),
  
  deleteTask: (taskId: string) => 
    ipcRenderer.invoke('delete-task', taskId),
  
  getTaskSuggestions: () => 
    ipcRenderer.invoke('get-task-suggestions'),
  
  getTaskStats: () => 
    ipcRenderer.invoke('get-task-stats'),
  
  clearCompletedTasks: () => 
    ipcRenderer.invoke('clear-completed-tasks'),
  
  // Tela inteira
  toggleFullscreen: () => 
    ipcRenderer.invoke('toggle-fullscreen'),
  
  getFullscreenStatus: () => 
    ipcRenderer.invoke('get-fullscreen-status'),
  
  setFullscreen: (fullscreen: boolean) => 
    ipcRenderer.invoke('set-fullscreen', fullscreen),
  
  // Repositório de Conhecimento
  addKnowledgeItem: (item: { title: string; content: string; type: string; tags: string[]; url?: string }) =>
    ipcRenderer.invoke('add-knowledge-item', item),
  
  searchKnowledge: (query: string, type?: string, limit?: number) =>
    ipcRenderer.invoke('search-knowledge', query, type, limit),
  
  getAllKnowledge: (type?: string, limit?: number) =>
    ipcRenderer.invoke('get-all-knowledge', type, limit),
  
  getKnowledgeItem: (id: string) =>
    ipcRenderer.invoke('get-knowledge-item', id),
  
  updateKnowledgeItem: (id: string, updates: any) =>
    ipcRenderer.invoke('update-knowledge-item', id, updates),
  
  deleteKnowledgeItem: (id: string) =>
    ipcRenderer.invoke('delete-knowledge-item', id),
  
  getKnowledgeStats: () =>
    ipcRenderer.invoke('get-knowledge-stats'),
  
  getAllKnowledgeTags: () =>
    ipcRenderer.invoke('get-all-knowledge-tags'),
  
  savePostSummary: (title: string, content: string, url?: string, tags?: string[]) =>
    ipcRenderer.invoke('save-post-summary', title, content, url, tags),
  
  exportKnowledge: () =>
    ipcRenderer.invoke('export-knowledge'),
  
  importKnowledge: (items: any[]) =>
    ipcRenderer.invoke('import-knowledge', items),
  
  clearKnowledge: () =>
    ipcRenderer.invoke('clear-knowledge')
};

// Expor API para o renderer de forma segura
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Declaração global para TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 