# 🔄 Sincronização entre Dispositivos - Duckduki

## Visão Geral

O Duckduki agora oferece sincronização completa entre dispositivos usando **Google Drive**. Esta funcionalidade permite que você mantenha suas configurações, base de conhecimento e dados sincronizados em todos os seus dispositivos.

## 📋 O que é Sincronizado

- **Configurações do aplicativo**: Preferências, configurações de notificações, apps prioritários
- **Base de conhecimento**: Todas as notas, conversas salvas, documentos e referências
- **Configurações de sincronização**: Suas preferências de como os dados devem ser sincronizados
- **Metadados**: Estatísticas de uso, histórico de sincronizações

## 🚀 Como Usar

### 1. Acesso às Configurações

1. Abra o Duckduki
2. Clique em **Configurações** 
3. Navegue até a seção **"🔄 Sincronização entre Dispositivos"**

### 2. Conectar ao Google Drive

1. Clique em **"Conectar"** no cartão do Google Drive
2. Você será direcionado para a página de autenticação do Google
3. Faça login com sua conta Google
4. Autorize as permissões necessárias para o Duckduki
5. Uma pasta "DuckdukiSync" será criada automaticamente no seu Drive

### 3. Configurar Sincronização

Após conectar ao Google Drive:

1. **O provedor será selecionado automaticamente**
2. **Configure as opções**:
   - ✅ **Sincronização automática**: Liga/desliga sync automático
   - ⏱️ **Intervalo**: Escolha entre 5min, 15min, 30min, 1h ou 2h
   - 🔧 **Resolução de conflitos**: Como lidar com dados diferentes entre dispositivos

### 4. Resolução de Conflitos

Quando o mesmo dado é modificado em dispositivos diferentes, você pode escolher:

- **🔄 Mesclar dados (recomendado)**: Combina automaticamente as alterações
- **📱 Priorizar dados locais**: Mantém os dados do dispositivo atual
- **☁️ Priorizar dados da nuvem**: Usa os dados salvos na nuvem

## 🔧 Funcionalidades Avançadas

### Sincronização Manual
- Clique em **"🔄 Sincronizar Agora"** para forçar uma sincronização imediata
- Útil para garantir que dados importantes sejam sincronizados antes de trocar de dispositivo

### Criptografia
- 🔒 Todos os dados são **criptografados** antes de serem enviados para a nuvem
- Apenas você tem acesso às suas informações

### Verificação de Integridade
- ✅ Checksum automático garante que os dados não foram corrompidos
- Detecção automática de problemas de sincronização

## 📱 Configuração Multi-Dispositivo

### Primeiro Dispositivo
1. Configure normalmente seguindo os passos acima
2. Este dispositivo criará a estrutura inicial na nuvem
3. Faça a primeira sincronização

### Dispositivos Adicionais
1. Instale o Duckduki no novo dispositivo
2. Configure a mesma conta Google Drive
3. Na primeira sincronização, escolha **"Priorizar dados da nuvem"**
4. Todos os seus dados serão baixados e aplicados

## ⚠️ Considerações Importantes

### Segurança
- 🔐 **Criptografia ponta-a-ponta**: Seus dados são criptografados localmente
- 🚫 **Sem acesso direto**: Nem mesmo o Google pode ler seus dados criptografados
- 🔑 **Chaves seguras**: APIs keys e tokens são armazenados de forma segura

### Privacidade
- 📊 **Dados sensíveis protegidos**: Senhas e tokens não são sincronizados
- 🎯 **Sincronização seletiva**: Apenas dados não-sensíveis são incluídos
- 🧹 **Controle total**: Você pode desconectar e limpar dados a qualquer momento

### Configuração do Google Drive
- 📋 **Permissões mínimas**: O Duckduki solicita apenas acesso aos arquivos que cria
- 📁 **Pasta específica**: Todos os dados ficam organizados na pasta "DuckdukiSync"
- 🔄 **OAuth2 oficial**: Usa a API oficial do Google Drive com autenticação segura

## 🛠️ Solução de Problemas

### Erro "OAuth client was not found"
1. Verifique se as credenciais no arquivo `.env` estão corretas
2. Confirme se o Client ID termina com `.apps.googleusercontent.com`
3. Verifique se o Client Secret começa com `GOCSPX-`
4. Reinicie o aplicativo após configurar as credenciais

### Problemas de Conexão
1. Verifique sua conexão com a internet
2. Confirme se tem uma conta Google válida
3. Tente desconectar e reconectar ao Google Drive

### Dados não Sincronizam
1. Verifique se a sincronização automática está habilitada
2. Force uma sincronização manual
3. Confirme se há espaço suficiente no Google Drive

### Conflitos de Dados
1. Use a opção "Mesclar dados" na maioria dos casos
2. Se houver problemas, priorize dados locais e sincronize novamente
3. Faça backups locais antes de grandes mudanças

## 🔮 Funcionalidades Futuras

- **Sincronização em tempo real**: Updates instantâneos entre dispositivos
- **Histórico de versões**: Recuperar versões anteriores dos dados
- **Sync seletivo**: Escolher quais tipos de dados sincronizar
- **Mais provedores**: Dropbox, iCloud, serviços próprios
- **Grupos/equipes**: Compartilhar bases de conhecimento entre usuários

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs no console do aplicativo (F12)
2. Tente a sincronização manual primeiro
3. Reporte problemas com detalhes específicos sobre:
   - Sistema operacional
   - Mensagem de erro específica
   - Passos para reproduzir o problema
   - Se as credenciais do Google estão configuradas

---

A sincronização com Google Drive torna o Duckduki verdadeiramente útil em um ambiente multi-dispositivo, permitindo que você tenha acesso às suas informações importantes onde quer que esteja! 🚀 