# Site Duckduki

Site oficial do Duckduki - Assistente Desktop Inteligente com IA Generativa via Groq.

## 🎯 Novos Recursos Implementados

### Transição Spotlight → Fullscreen Mode

O site agora apresenta uma demonstração interativa autêntica do app Duckduki, mostrando a transição entre os dois modos principais:

#### **Modo Spotlight** (Inicial)
- Interface compacta inspirada no Spotlight do macOS
- Barra de pesquisa funcional com placeholder dinâmico
- Lista de comandos disponíveis (emails, tarefas, ideias)
- Efeitos hover interativos nos itens
- Animações de entrada suaves

#### **Modo Fullscreen** (Scroll ≥ 30%)
- Interface completa do app com header profissional
- Status da IA em tempo real (ativa/inativa)
- Botões dos painéis com cores específicas:
  - 🧠 Knowledge (roxo)
  - ✅ Tasks (verde) 
  - 📊 Feed (laranja)
- Chat principal com histórico de conversa
- Animações de mensagens sliding

### Funcionalidades Interativas

#### **Transição Inteligente**
```javascript
// Detecta scroll e alterna entre modos
const scrollThreshold = heroHeight * 0.3;
if (scrollY > scrollThreshold) {
    // Ativa Fullscreen Mode
} else {
    // Mantém Spotlight Mode  
}
```

#### **Efeitos Visuais**
- **Spotlight Search Bar**: Focus effects com glow cyan
- **Result Items**: Hover com translate e border glow
- **App Preview**: Rotação 3D → perspectiva plana
- **Typing Indicator**: Removido automaticamente após 5s
- **Panel Buttons**: Scale transform no hover

#### **Responsividade Aprimorada**
- **Desktop**: Transição 3D completa (600px → 450px → 320px)
- **Tablet**: Transição simplificada sem rotação 3D  
- **Mobile**: Preview estático com foco no conteúdo

## 🎨 Design System

### **Cores Temáticas**
```css
--primary-color: #00f5ff;     /* Cyan futurístico */
--secondary-color: #7c3aed;   /* Roxo profundo */
--accent-color: #f59e0b;      /* Laranja vibrante */
```

### **Animações Fluidas**
- **Cubic Bezier**: `(0.25, 0.46, 0.45, 0.94)` para transições orgânicas
- **Duração**: 0.8s para mudanças de modo, 0.3s para interações
- **Stagger Effect**: 0.1s delay entre itens do spotlight

### **Scrollbars Customizadas**
- Spotlight Results: Cyan (4px width)
- Chat Interface: Purple (4px width)
- Hover: Opacity increase (0.3 → 0.5)

## 📱 Responsividade Detalhada

### **Breakpoints**
- **768px+**: Experiência desktop completa
- **768px-**: Header stack, preview compacto  
- **480px-**: Sidebar collapse, modo mobile

### **Ajustes por Dispositivo**
```css
/* Desktop */
.fullscreen-window { width: 600px; }

/* Tablet */  
@media (max-width: 768px) {
    .fullscreen-window { width: 450px; }
    .app-preview.scrolled { transform: scale(1); }
}

/* Mobile */
@media (max-width: 480px) {
    .fullscreen-window { width: 320px; }
    .app-preview { transform: none !important; }
}
```

## 🚀 Tecnologias Utilizadas

- **HTML5**: Estrutura semântica e acessível
- **CSS3**: Gradientes, animações, grid/flexbox
- **JavaScript ES6+**: Event listeners, DOM manipulation
- **Particles.js**: Background interativo
- **Google Fonts**: Orbitron (títulos) + Exo 2 (corpo)

## 🎯 UX/UI Highlights

### **Micro-interações**
1. **Search Focus**: Placeholder text muda dinamicamente
2. **Result Selection**: Estado visual ativo com feedback
3. **Button Hover**: Scale + glow effects
4. **Message Animation**: Slide-in com stagger delay

### **Feedback Visual**
- ✅ **Status Indicators**: Glow animation para IA ativa
- 🎯 **Selection States**: Border + background + transform
- 💫 **Loading States**: Typing indicators animados
- 🌟 **Hover Effects**: Transform + shadow + color shift

### **Performance**
- **Throttled Scroll**: Otimizado para 60fps
- **CSS Transitions**: Hardware-accelerated transforms
- **Lazy Effects**: Elementos animam apenas quando visíveis

## 📋 Estrutura de Arquivos

```
docs/
├── index.html          # Landing page com spotlight/fullscreen
├── styles.css          # CSS completo com novos modos
├── script.js           # JavaScript para transições
├── docs.html           # Documentação técnica
├── docs-styles.css     # Estilos da documentação
├── _config.yml         # Configuração Jekyll
└── README.md          # Este arquivo
```

## 🔧 Configuração GitHub Pages

1. **Ativar GitHub Pages** no repositório
2. **Source**: Deploy from a branch → `/docs`
3. **URL**: `https://seu-usuario.github.io/duckduki`

O site estará automaticamente disponível após ~5 minutos.

---

**Resultado**: Landing page futurística com demonstração autêntica dos modos Spotlight e Fullscreen do app Duckduki, incluindo transições suaves, interações realistas e design responsivo otimizado. 