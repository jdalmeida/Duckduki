# 🛠️ Guia de Integração das AI Tools - Duckduki

## 🎯 **Visão Geral**

O Duckduki agora possui um sistema completo de tools integrado com a IA, permitindo que ela execute ações reais em todos os módulos do aplicativo. A IA pode automaticamente decidir quais ferramentas usar com base no contexto da conversa.

## 🔧 **Tools Disponíveis**

### 📧 **EMAIL**
- `getEmailSummary` - Resumir emails recentes

### 📋 **TAREFAS**
- `addTask` - Criar nova tarefa
- `getTasks` - Listar tarefas (com filtros)
- `updateTaskStatus` - Atualizar status de tarefa
- `deleteTask` - Deletar tarefa
- `getTaskStats` - Estatísticas das tarefas

### 📰 **NOTÍCIAS**
- `getTechNews` - Buscar notícias de tecnologia
- `searchNews` - Buscar notícias com palavras-chave

### 📚 **CONHECIMENTO**
- `saveNote` - Salvar nota no repositório
- `searchKnowledge` - Buscar no repositório de conhecimento
- `saveWebSummary` - Salvar resumo de post/artigo

### 💻 **SISTEMA**
- `getSystemStatus` - Status do sistema (CPU, RAM)
- `getActiveApps` - Apps atualmente ativos

### 🔨 **BUILD/DEPLOY**
- `runBuild` - Executar build do projeto

## 💬 **Exemplos de Uso**

### **Gerenciamento de Tarefas**
```
Usuário: "Crie uma tarefa para revisar o código do módulo de autenticação"
IA: Usando a tool addTask para criar sua tarefa...
✅ Tarefa criada: "Revisar código do módulo de autenticação"
📁 Categoria: desenvolvimento
🚀 Prioridade: MÉDIA
```

### **Busca de Notícias**
```
Usuário: "Quais são as últimas notícias sobre React?"
IA: Vou buscar as últimas notícias sobre React para você...
📰 Encontradas 8 notícias sobre React:
1. "React 19 Beta Features" - hackernews
2. "New Hooks in React" - dev.to
...
```

### **Gestão de Conhecimento**
```
Usuário: "Salve uma nota sobre as melhores práticas de TypeScript"
IA: Vou salvar essa nota no seu repositório de conhecimento...
📝 Nota salva: "Melhores práticas de TypeScript"
🏷️ Tags: typescript, desenvolvimento, práticas
```

### **Status do Sistema**
```
Usuário: "Como está o desempenho do sistema?"
IA: Verificando o status atual do sistema...
💻 Sistema: CPU 45%, RAM 67%
📱 App ativo: VS Code - projeto-duckduki
```

## 🚀 **Arquitetura Técnica**

### **Backend (AI Tools Service)**
```typescript
class AIToolsService {
  // Processa comandos com tools usando AI SDK da Vercel
  async processWithTools(userMessage, chatHistory) {
    const result = await generateText({
      model: groq('llama3-8b-8192'),
      tools: { /* todas as tools disponíveis */ },
      // Executa automaticamente as tools quando necessário
    });
  }
}
```

### **Frontend (Streaming)**
```typescript
// Usar streaming para respostas em tempo real
const result = await window.electronAPI.processCommandWithContextStream(
  command, 
  chatContext
);
```

## 🔄 **Fluxo de Execução**

1. **Usuário envia comando** → "Crie uma tarefa para estudar React"
2. **IA analisa contexto** → Determina que precisa usar `addTask`
3. **Tool é executada** → `executeAddTask("estudar React")`
4. **Resultado é processado** → Tarefa criada com análise de IA
5. **Resposta final** → IA apresenta resultado de forma conversacional

## ⚡ **Streaming e Performance**

- **Resposta em tempo real**: As respostas são streamadas conforme são geradas
- **Context Window otimizado**: Apenas 15 últimas mensagens são enviadas
- **Tools assíncronas**: Todas as ferramentas executam de forma não-bloqueante
- **Fallback inteligente**: Se streaming falhar, usa método tradicional

## 🎨 **Interface Visual**

### **Diferenciação de Mensagens**
- **👤 Você**: Mensagens do usuário (borda verde, alinhadas à direita)
- **🤖 Duckduki**: Respostas tradicionais
- **🤖 Duckduki (Tools)**: Respostas com tools executadas

### **Indicadores Visuais**
- **🔧 Executando tool**: Logs no console
- **✅ Tool executada**: Resultado incluído na resposta
- **❌ Erro na tool**: Fallback para resposta tradicional

## 🛡️ **Segurança e Validação**

- **Validação Zod**: Todos os parâmetros das tools são validados
- **Sanitização**: Inputs são sanitizados antes da execução
- **Rate Limiting**: Proteção contra uso excessivo de tools
- **Logs auditáveis**: Todas as execuções são registradas

## 🔧 **Configuração**

### **Pré-requisitos**
1. Chave da API Groq configurada
2. Serviços necessários inicializados (email, tasks, etc.)
3. Dependências instaladas: `ai`, `@ai-sdk/groq`, `zod`

### **Inicialização**
```typescript
// Automaticamente inicializada quando a chave Groq é configurada
const aiToolsService = new AIToolsService(
  groqApiKey,
  emailService,
  knowledgeService,
  taskService,
  feedService,
  processMonitor,
  deployService
);
```

## 📈 **Próximas Funcionalidades**

- **🎯 Tools customizadas**: Permitir criação de tools personalizadas
- **🔄 Tools compostas**: Combinar múltiplas tools em workflows
- **📊 Analytics**: Dashboard de uso das tools
- **🎨 Interface visual**: Mostrar execução de tools em tempo real
- **🔗 Integrações**: APIs externas como GitHub, Slack, etc.

## 🐛 **Troubleshooting**

### **Tool não executa**
- Verificar se a chave Groq está configurada
- Validar parâmetros da tool
- Checar logs do console

### **Streaming não funciona**
- Fallback automático para método tradicional
- Verificar conectividade de rede
- Logs detalhados disponíveis

### **Performance lenta**
- Context window otimizado (15 mensagens)
- Tools executam em paralelo quando possível
- Cache inteligente nos serviços

---

🎉 **Agora o Duckduki é um verdadeiro assistente inteligente que pode executar ações reais em todos os módulos do aplicativo!** 