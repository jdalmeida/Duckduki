# 🚀 Duckduki

**Assistente Desktop Inteligente com IA Generativa**

Um aplicativo desktop multiplataforma (Windows, macOS, Linux) de alta performance que utiliza a API Groq para fornecer assistência inteligente e proativa, elevando sua produtividade através de sugestões contextuais e automações inteligentes.

![Duckduki](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## ✨ Características Principais

### 🤖 IA Generativa via Groq
- **Resumos Inteligentes de E-mail**: Conecta-se a contas de e-mail para gerar briefings matinais com prioridades
- **Análise de Código**: Analisa trechos de código do VS Code e sugere melhorias e otimizações
- **Planejamento de Agenda**: Cria planos de foco baseados no histórico de atividades
- **Comandos em Linguagem Natural**: Processe comandos de texto ou voz

### 🎯 Detecção de Contexto e Sugestões Proativas
- **Monitoramento de Apps**: Detecta qual aplicação está em foco
- **Sugestões Contextuais**: Oferece dicas específicas baseadas no app ativo
- **Notificações Discretas**: Exibe sugestões sem interromper o fluxo de trabalho

### 🛠️ Automação de Desenvolvimento
- **Build/Deploy Inteligente**: Executa comandos de build automaticamente
- **Análise Rápida de Código**: Atalhos para revisão de código no editor
- **Detecção de Projeto**: Reconhece diferentes tipos de projeto (Node.js, Rust, Java, etc.)

### 📊 Monitoramento de Sistema
- **Status de CPU/RAM**: Exibição em tempo real do uso de recursos
- **Modo Foco Automático**: Detecta longos períodos de trabalho e sugere pausas
- **Análise de Processos**: Identifica processos que consomem muitos recursos

### 🎯 Acesso Rápido e Integração
- **Atalho Global**: Pressione **Ctrl+Shift+Space* (Windows/Linux) ou **Cmd+Shift+Space** (Mac) para abrir o agente instantaneamente
- **Integração com Paleta de Comandos do Windows**: Acesso nativo via Command Palette do Windows
- **Comandos Rápidos**: Abrir Duckduki, chat, configurações via Win+X
- **Auto-Inicialização**: A extensão pode iniciar o agente automaticamente
- **Comandos Disponíveis**: Abrir, chat com foco, monitoramento, email

### 🔐 Segurança e Privacidade
- **Armazenamento Criptografado**: Chaves API seguras no keychain do sistema
- **Dados Locais**: Todos os dados permanecem no seu computador
- **Logs Limpos**: Opção de limpar histórico a qualquer momento

## 🖥️ Interface de Usuário

### Widget Flutuante
- **Ícone na Bandeja**: Acesso rápido via systray
- **Painel Flutuante**: Interface compacta e elegante
- **Campo de Comando**: Entrada de texto ou voz
- **Cards de Resposta**: Visualização organizada das sugestões

### Recursos da Interface
- **Entrada por Voz**: Suporte a Web Speech API (português brasileiro)
- **Sugestões Rápidas**: Botões para comandos comuns
- **Indicadores Visuais**: Status do sistema e aplicação ativa
- **Tema Moderno**: Design responsivo e acessível

## 🚀 Instalação e Configuração

### Pré-requisitos

- **Node.js 18+** 
- **npm** ou **yarn**
- **Git**

### Linux - Dependências do Sistema

Para funcionar corretamente no Linux, instale as seguintes dependências:

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install libsecret-1-dev libxss1 libgconf-2-4
```

#### Fedora/RHEL:
```bash
sudo dnf install libsecret-devel libXScrnSaver GConf2
```

#### Arch Linux:
```bash
sudo pacman -S libsecret libxss gconf
```

**Por que essas dependências são necessárias:**
- `libsecret`: Para armazenamento seguro da API key do Groq
- `libxss1` + `libgconf-2-4`: Para monitoramento de janelas ativas

### Instalação

1. **Clone o repositório:**
```bash
git clone https://github.com/seu-usuario/duckduki.git
cd duckduki
```

2. **Execute o script de configuração:**
```bash
npm run setup
```

3. **Obtenha sua chave API Groq:**
   - Acesse [console.groq.com](https://console.groq.com)
   - Crie uma conta ou faça login
   - Vá para "API Keys" e crie uma nova chave
   - Guarde essa chave, você vai precisar dela

4. **Inicie o desenvolvimento:**
```bash
npm run dev
```

5. **Configure a chave Groq no aplicativo** através do painel de configurações

## 🐧 Troubleshooting Linux

### Problema: API key não salva
**Sintoma:** A chave da API Groq não é salva ou é perdida após reiniciar
**Solução:**
```bash
# Instalar libsecret
sudo apt install libsecret-1-dev  # Ubuntu/Debian
sudo dnf install libsecret-devel  # Fedora/RHEL
sudo pacman -S libsecret          # Arch

# Reiniciar o aplicativo
npm run dev
```

### Problema: Monitor do sistema não funciona
**Sintoma:** Não consegue detectar janelas ativas ou dados do sistema
**Solução:**
```bash
# Instalar dependências do active-win
sudo apt install libxss1 libgconf-2-4  # Ubuntu/Debian
sudo dnf install libXScrnSaver GConf2   # Fedora/RHEL
sudo pacman -S libxss gconf             # Arch

# Reiniciar o aplicativo
npm run dev
```

### Problema: Permissões no Wayland
**Sintoma:** Erros de permissão em ambientes Wayland
**Solução:**
```bash
# Executar em modo XWayland (compatibilidade)
export GDK_BACKEND=x11
npm run dev
```

### Problema: Snap/Flatpak/AppImage
**Sintoma:** Dependências não funcionam em pacotes confinados
**Solução:**
- Use a instalação via npm/git ao invés de pacotes confinados
- Ou instale as dependências no sistema host

## 💡 Guia de Uso

### Comandos Básicos

**Resumo de E-mails**
```
resumo dos emails
```

**Análise de Código**
```
analisar código atual
```

**Executar Build**
```
executar build
rodar build
compilar projeto
```

**Planejamento do Dia**
```
planejar meu dia
organizar agenda
```

**Comandos Personalizados**
```
como otimizar performance em React?
explique este erro de TypeScript
sugira melhorias para esta função
```

### Atalhos de Teclado

- **Ctrl+Shift+A** (ou **Cmd+Shift+A** no Mac): Abrir/mostrar o Duckduki
- **Enter**: Enviar comando
- **Shift + Enter**: Nova linha no comando
- **Esc**: Fechar widget (se ativo)

### Recursos de Voz

- **Microfone (🎤)**: Clique para gravar comando por voz
- **Parar (🔴)**: Clique novamente para parar gravação
- **Idioma**: Português brasileiro por padrão

## 🔧 Configuração Avançada

### E-mail (IMAP)

**Gmail**
1. Ative autenticação de 2 fatores
2. Gere uma senha de app específica
3. Configure nas configurações do Duckduki

**Outlook/Hotmail**
1. Use suas credenciais normais
2. Certifique-se que IMAP está habilitado

### Detecção de Projetos

O Duckduki detecta automaticamente:
- **Node.js**: `package.json` → `npm run build`
- **Rust**: `Cargo.toml` → `cargo build --release`
- **Java**: `pom.xml` → `mvn clean package`
- **Gradle**: `build.gradle` → `./gradlew build`

### Integração com Paleta de Comandos (Windows)

**Comandos Disponíveis na Paleta**
- 🏠 **Abrir Duckduki**: Mostra a interface principal
- 💬 **Perguntar ao Duckduki**: Abre chat com foco no input
- 📊 **Monitorar Processos**: Liga/desliga monitoramento inteligente
- ⚙️ **Configurações**: Abre painel de configurações
- 📧 **Enviar Email via Duckduki**: Compositor de email com IA

**Como Usar**
1. Pressione `Win + X` ou abra Command Palette
2. Digite "Duckduki"
3. Selecione o comando desejado
4. O agente será ativado automaticamente

**Configuração**
```powershell
# Como administrador, execute:
.\Co-piloto\build-and-register.ps1

# Ou registre manualmente:
Add-AppxPackage -Register "C:\caminho\para\Co-piloto\Package.appxmanifest"
```

### Personalização

**Comandos Personalizados**
- Adicione scripts personalizados no `package.json`
- O Co-Piloto detectará automaticamente

**Aplicações Prioritárias**
- Configure nas configurações quais apps devem gerar sugestões
- Padrão: VS Code, Chrome, Terminal, Slack

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
co-piloto-desktop/
├── src/
│   ├── main/                  # Processo principal (Electron)
│   │   ├── index.ts           # Ponto de entrada
│   │   ├── groqClient.ts      # Cliente API Groq
│   │   ├── emailService.ts    # Serviço de e-mail
│   │   ├── processMonitor.ts  # Monitor de sistema
│   │   ├── deployService.ts   # Automação de build/deploy
│   │   └── securityManager.ts # Gerenciamento seguro de dados
│   ├── renderer/              # Interface React
│   │   ├── App.tsx            # Componente principal
│   │   ├── widgets/           # Componentes do widget
│   │   └── settings/          # Painel de configurações
│   └── preload.ts             # Comunicação segura IPC
├── assets/                    # Ícones e recursos
├── package.json               # Dependências e scripts
└── README.md                  # Este arquivo
```

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia desenvolvimento
npm run dev:renderer # Apenas interface React
npm run dev:main     # Apenas processo principal

# Diagnóstico
npm run test-deps    # Testa dependências e detecta problemas

# Build
npm run build        # Build completo
npm run build:renderer # Build da interface
npm run build:main   # Build do processo principal

# Distribuição
npm run dist         # Pacote para plataforma atual
npm run dist:win     # Pacote para Windows
npm run dist:mac     # Pacote para macOS
npm run dist:linux   # Pacote para Linux

# Execução
npm start            # Inicia aplicação compilada
```

### Tecnologias Utilizadas

- **Electron**: Framework desktop multiplataforma
- **React**: Biblioteca de interface de usuário
- **TypeScript**: Linguagem tipada
- **Vite**: Build tool moderno e rápido
- **Groq API**: IA generativa de alta performance
- **Node.js**: Runtime JavaScript

### Adicionando Novos Recursos

1. **Novos Comandos Groq**
   - Edite `src/main/groqClient.ts`
   - Adicione novos métodos para diferentes tipos de prompts

2. **Integração com Novos Apps**
   - Edite `src/main/processMonitor.ts`
   - Adicione detecção para novos aplicativos

3. **Novos Serviços**
   - Crie arquivos na pasta `src/main/`
   - Registre no `index.ts`

## 🔍 Solução de Problemas

### Problemas Comuns

**"Chave Groq não configurada"**
- Verifique se a chave foi salva corretamente nas configurações
- Teste a conectividade com a internet
- Verifique se a chave não expirou

**"Cannot read properties of undefined (reading 'whenReady')"**
- Execute `npm install` para instalar todas as dependências
- Use `npm run dev` em vez de executar arquivos TypeScript diretamente
- Certifique-se que está na pasta correta do projeto
- Se persistir, execute: `npm run setup`

**"VS Code não está ativo"**
- Certifique-se que o VS Code está em primeiro plano
- O título da janela deve conter "Visual Studio Code"

**Build falha**
- Verifique se há um `package.json` no diretório
- Certifique-se que as dependências estão instaladas
- Verifique se o script "build" existe

**Alto uso de CPU/RAM**
- O monitoramento é atualizado a cada 5 segundos
- Use o botão de limpar dados se necessário
- Verifique processos em background

### Logs e Debug

**Modo Desenvolvimento**
- Console do DevTools para errors de frontend
- Terminal para logs do processo principal

**Modo Produção**
- Logs salvos em: `~/.config/co-piloto-desktop/logs/`

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Ideias para Contribuição

- **Novos Provedores de IA**: Integração com OpenAI, Claude, etc.
- **Mais Integrações**: Slack, Discord, Teams, etc.
- **Plugins**: Sistema de extensões para desenvolvedores
- **Melhorias de UI**: Temas, animações, acessibilidade
- **Análise de Código**: Suporte para mais linguagens

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- **Groq**: Pela API de IA generativa rápida e poderosa
- **Electron**: Framework que torna possível apps desktop com web tech
- **React**: Biblioteca fantástica para interfaces de usuário
- **Comunidade Open Source**: Pelas inúmeras bibliotecas utilizadas

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/co-piloto-desktop/issues)
- **Discussions**: [GitHub Discussions](https://github.com/seu-usuario/co-piloto-desktop/discussions)
- **E-mail**: seu-email@exemplo.com

---

**Co-Piloto Desktop** - Transformando produtividade com IA generativa 🚀

Feito com ❤️ pela Allpines para a comunidade de desenvolvedores brasileiros. 