# 🤖 Tools da IA - Google Calendar, Tasks e Tarefas Locais

## 📋 Visão Geral

O Duckduki agora possui ferramentas integradas que permitem à IA controlar automaticamente:
- **Google Calendar**: Criar, visualizar e gerenciar eventos
- **Google Tasks**: Gerenciar tarefas online
- **Tarefas Locais**: Sincronizar com sistema de tarefas interno
- **Sincronização**: Bidirecionalmente entre local e Google

## 🎯 Comandos Disponíveis para a IA

### 📅 Google Calendar Tools

#### `get_today_events`
Obtém eventos de hoje do calendário principal
```typescript
// Uso: "Mostre meus eventos de hoje"
// Parâmetros: nenhum
// Retorna: lista de eventos do dia atual
```

#### `get_upcoming_events` 
Obtém eventos futuros (padrão 7 dias)
```typescript
// Uso: "Quais são meus próximos compromissos?"
// Parâmetros: { days?: number }
// Retorna: eventos dos próximos N dias
```

#### `create_calendar_event`
Cria novo evento no calendário
```typescript
// Uso: "Agende reunião amanhã às 14h"
// Parâmetros: {
//   title: string,
//   description: string,
//   startTime: string (ISO 8601),
//   endTime: string (ISO 8601),
//   location?: string
// }
```

#### `get_day_overview`
Resumo completo do dia (eventos + tarefas)
```typescript
// Uso: "Como está meu dia hoje?"
// Retorna: eventos + tarefas pendentes + estatísticas
```

### ✅ Google Tasks Tools

#### `get_tasks`
Obtém todas as tarefas do Google Tasks
```typescript
// Uso: "Liste minhas tarefas do Google"
// Retorna: { all: [], pending: [], completed: [] }
```

#### `create_task`
Cria nova tarefa no Google Tasks
```typescript
// Uso: "Adicione 'comprar leite' nas minhas tarefas"
// Parâmetros: {
//   title: string,
//   description?: string,
//   dueDate?: string (ISO 8601)
// }
```

#### `complete_task`
Marca tarefa como concluída (busca por título)
```typescript
// Uso: "Marque 'comprar leite' como concluída"
// Parâmetros: { taskTitle: string }
```

### 🏠 Tarefas Locais Tools

#### `get_local_tasks`
Obtém tarefas do sistema local com filtros
```typescript
// Uso: "Mostre tarefas pendentes de trabalho"
// Parâmetros: {
//   status?: 'pendente' | 'em_progresso' | 'concluida' | 'cancelada',
//   priority?: 'baixa' | 'media' | 'alta' | 'critica',
//   category?: string
// }
```

#### `create_local_task`
Cria tarefa local usando análise de IA
```typescript
// Uso: "Preciso revisar código urgente amanhã"
// Parâmetros: { input: string }
// A IA analisa e extrai: prioridade, categoria, prazo, etc.
```

#### `complete_local_task`
Marca tarefa local como concluída
```typescript
// Uso: "Concluí a revisão de código"
// Parâmetros: { taskTitle: string }
```

#### `delete_local_task`
Remove tarefa local
```typescript
// Uso: "Remova a tarefa de compras"
// Parâmetros: { taskTitle: string }
```

#### `get_task_stats`
Estatísticas detalhadas das tarefas
```typescript
// Uso: "Como está minha produtividade?"
// Retorna: total, pendentes, por prioridade, por categoria
```

#### `get_pending_tasks`
Apenas tarefas pendentes
```typescript
// Uso: "O que preciso fazer hoje?"
// Retorna: tarefas com status 'pendente'
```

#### `get_high_priority_tasks`
Tarefas de alta prioridade (alta + crítica)
```typescript
// Uso: "Quais são minhas prioridades?"
// Retorna: tarefas urgentes que precisam de atenção
```

#### `get_tasks_by_category`
Tarefas de categoria específica
```typescript
// Uso: "Mostre tarefas de trabalho"
// Parâmetros: { category: string }
```

## 💬 Exemplos de Conversas com a IA

### Scenario 1: Planejamento do Dia
```
Usuário: "Como está meu dia hoje?"
IA: Executa get_day_overview()
```

**Resposta da IA:**
```
📅 **Resumo do seu dia - 10/12/2024**

🗓️ **Eventos hoje (3):**
- 09:00-10:00: Reunião de equipe (Sala de conferências)
- 14:00-15:30: Apresentação do projeto Q4
- 17:00-18:00: Call com cliente internacional

✅ **Tarefas pendentes (5):**
- [CRÍTICA] Revisar código da feature X (Vence hoje)
- [ALTA] Responder emails importantes  
- [MÉDIA] Documentar API endpoints
- [BAIXA] Organizar desktop
- [BAIXA] Backup de arquivos

💡 **Sugestão:** Foque na revisão de código antes da reunião das 9h!
```

### Scenario 2: Criando Evento
```
Usuário: "Agende uma reunião com o time de design para amanhã às 15h, vai durar 1 hora"
IA: Executa create_calendar_event()
```

### Scenario 3: Gerenciamento de Tarefas
```
Usuário: "Adicione 'preparar apresentação para cliente' como tarefa urgente"
IA: Executa create_local_task() + análise de IA
```

**A IA entende automaticamente:**
- **Título:** "Preparar apresentação para cliente"
- **Prioridade:** Alta (palavra "urgente")
- **Categoria:** Trabalho
- **Tags:** ["apresentação", "cliente", "trabalho"]
- **Estimativa:** 2-3 horas

### Scenario 4: Sincronização
```
Usuário: "Sincronize minhas tarefas locais com o Google Tasks"
IA: Usa Google Integration Service para sync bidirecional
```

## 🔧 Configuração Técnica

### Ativação das Tools
As tools são automaticamente disponibilizadas quando:
1. ✅ Google Services conectado (OAuth2)
2. ✅ Chave Groq configurada
3. ✅ APIs ativadas no Google Cloud Console

### APIs Necessárias
- Google Calendar API
- Google Tasks API  
- Google Drive API (para sincronização)

### Handlers IPC
```typescript
// Frontend pode chamar diretamente:
window.electronAPI.executeGoogleTool('get_today_events', {})
window.electronAPI.executeLocalTaskTool('create_local_task', { input: "..." })
```

## 🚀 Funcionalidades Avançadas

### Sincronização Inteligente
- **Bidirecional**: Tarefas locais ↔ Google Tasks
- **Detecção de conflitos**: Resolve por timestamp
- **Mapeamento**: Campos locais → campos Google
- **Preservação**: Mantém metadados específicos de cada plataforma

### Análise de IA para Tarefas
Quando você cria uma tarefa local, a IA analisa automaticamente:
- **Prioridade**: Extrai urgência do texto
- **Categoria**: Classifica por contexto
- **Tempo estimado**: Estima duração
- **Tags**: Extrai palavras-chave relevantes
- **Prazo**: Detecta datas mencionadas

### Contexto Inteligente
A IA mantém contexto de:
- Padrões de trabalho do usuário
- Histórico de tarefas concluídas
- Preferências de agendamento
- Categorias mais usadas

## 📊 Métricas e Análises

### Relatórios Automáticos
A IA pode gerar:
- **Produtividade semanal**: Tarefas concluídas vs criadas
- **Distribuição de tempo**: Por categoria/prioridade
- **Padrões de agenda**: Horários mais produtivos
- **Sugestões de otimização**: Baseado em dados históricos

### Comandos de Análise
```
"Como foi minha semana?"
"Qual categoria consume mais tempo?"
"Quando sou mais produtivo?"
"Sugestões para melhorar meu planejamento?"
```

## 🔒 Privacidade e Segurança

- **OAuth2 seguro**: Tokens criptografados localmente
- **Dados locais**: Tarefas ficam no dispositivo
- **Sincronização opcional**: Usuário controla quando sincronizar
- **Sem tracking**: Dados não são enviados para terceiros

---

**🎉 Resultado**: Agora você tem um assistente IA completo que pode gerenciar sua agenda e tarefas automaticamente, respondendo comandos em linguagem natural e mantendo tudo sincronizado! 