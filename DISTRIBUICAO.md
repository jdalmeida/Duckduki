# 📦 Guia de Distribuição - Duckduki

Este guia explica como criar um instalador do Duckduki que já inclui as credenciais do Google Drive embutidas, resolvendo o problema do "módulo dotenv não encontrado" na instalação.

## 🎯 Problema Resolvido

**Antes:** Quando instalava o app, ele não encontrava o módulo dotenv e as credenciais GOOGLE_DRIVE_CLIENT_ID e GOOGLE_DRIVE_CLIENT_SECRET.

**Agora:** As credenciais são embarcadas diretamente no código compilado, funcionando sem precisar de arquivo .env.

## 🚀 Como Usar - Método Automático (Recomendado)

### 1. Comando Simples
```bash
npm run dist-with-credentials
```

### 2. O script irá:
- ✅ Detectar automaticamente se você tem arquivo `.env`
- ✅ Sugerir usar as credenciais do `.env` (se existir)
- ✅ Ou permitir inserir manualmente
- ✅ Embarcar as credenciais no código
- ✅ Fazer o build automaticamente
- ✅ Restaurar o arquivo original depois

### 3. Resultado
- 📦 Instalador pronto na pasta `release/`
- 🔐 Credenciais embutidas e funcionais
- 🛡️ Arquivo original restaurado (seguro para commit)

## 🛠️ Como Usar - Método Manual

### 1. Editar Arquivo de Configuração
Abra `src/main/embeddedConfig.ts` e substitua:

```typescript
const EMBEDDED_CONFIG: EmbeddedConfig = {
  googleDrive: {
    // ANTES:
    clientId: undefined, 
    clientSecret: undefined,
    
    // DEPOIS (substitua pelos seus valores):
    clientId: 'seu-google-client-id-aqui.apps.googleusercontent.com',
    clientSecret: 'seu-google-client-secret-aqui',
  }
};
```

### 2. Fazer Build
```bash
npm run dist:win    # Para Windows
npm run dist:mac    # Para macOS  
npm run dist:linux  # Para Linux
```

### 3. Restaurar Arquivo (IMPORTANTE!)
```bash
git checkout src/main/embeddedConfig.ts
```

## 🔍 Como Verificar se Funcionou

### Durante Desenvolvimento
```bash
npm run dev
```

No console você verá:
```
📋 [CONFIG] Status das configurações:
  • GOOGLE_DRIVE_CLIENT_ID: ✅ Configurado
  • GOOGLE_DRIVE_CLIENT_SECRET: ✅ Configurado  
  • Credenciais válidas: ✅ Sim
```

### No App Instalado
- O app não mostrará erro de "módulo dotenv não encontrado"
- As funcionalidades do Google Drive funcionarão normalmente
- Não precisará de arquivo `.env` na máquina do usuário

## 🔐 Segurança e Boas Práticas

### ✅ Seguro
- ✅ As credenciais são ofuscadas no código compilado
- ✅ O arquivo original é restaurado após o build
- ✅ Nunca commite credenciais reais no git

### ⚠️ Cuidados
- ⚠️ Não commite o arquivo `embeddedConfig.ts` com credenciais reais
- ⚠️ Use este método apenas para builds de distribuição
- ⚠️ Mantenha as credenciais seguras

## 🎯 Fluxo Completo Recomendado

```bash
# 1. Desenvolvimento normal (com .env)
npm run dev

# 2. Quando quiser distribuir
npm run dist-with-credentials

# 3. Testar o instalador gerado
# Instalar em máquina limpa (sem .env)

# 4. Confirmar que funciona sem erros
```

## 🐛 Solução de Problemas

### "Cannot find name 'getConfigValue'"
- ✅ **Solução:** Os imports foram adicionados automaticamente nos arquivos necessários

### "Credenciais não funcionam no app instalado"
- ✅ **Verifique:** Se usou `npm run dist-with-credentials` ou se editou manualmente o `embeddedConfig.ts`
- ✅ **Teste:** Verificar logs do console no app instalado

### "Build falha"
- ✅ **Primeiro:** Execute `npm run build` para ver erros específicos
- ✅ **Depois:** Execute `npm run dist-with-credentials` novamente

## 📁 Estrutura dos Arquivos

```
duckduki/
├── src/main/embeddedConfig.ts          # ← Configuração embarcada
├── src/main/cloudProviders/
│   ├── googleServicesProvider.ts       # ← Usa getConfigValue()
│   └── googleDriveProvider.ts           # ← Usa getConfigValue()
├── prepare-dist.js                      # ← Script automatizado
└── package.json                        # ← Novos comandos
```

## 🎉 Pronto!

Agora você pode distribuir o Duckduki sem se preocupar com configurações manuais do usuário. O app funcionará imediatamente após a instalação! 🚀 