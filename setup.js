#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Duckduki - Script de Configuração\n');

// Verificar Node.js version
const nodeVersion = process.version;
const requiredVersion = 18;
const currentVersion = parseInt(nodeVersion.substring(1).split('.')[0]);

if (currentVersion < requiredVersion) {
  console.error(`❌ Node.js ${requiredVersion}+ é necessário. Versão atual: ${nodeVersion}`);
  process.exit(1);
}

console.log(`✅ Node.js ${nodeVersion} - OK\n`);

// Verificar dependências
console.log('📦 Verificando dependências...');

try {
  // Verificar se package.json existe
  if (!fs.existsSync('package.json')) {
    console.error('❌ package.json não encontrado. Execute este script na pasta do projeto.');
    process.exit(1);
  }

  // Verificar se node_modules existe
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Instalando dependências...');
    execSync('npm install', { stdio: 'inherit' });
  } else {
    console.log('✅ Dependências já instaladas');
  }

  console.log('\n🛠️ Verificando estrutura do projeto...');

  // Criar pastas necessárias se não existirem
  const folders = [
    'src/main',
    'src/renderer/widgets',
    'src/renderer/settings',
    'assets',
    'dist'
  ];

  folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
      console.log(`📁 Criada pasta: ${folder}`);
    }
  });

  // Verificar se ícone existe
  if (!fs.existsSync('assets/icon.png')) {
    console.log('\n⚠️  AVISO: Ícone não encontrado em assets/icon.png');
    console.log('   Para funcionar corretamente, adicione um ícone PNG 256x256px');
    console.log('   Você pode criar um em: https://www.favicon.cc/\n');
  }

  console.log('✅ Estrutura do projeto verificada\n');

  // Verificar TypeScript
  try {
    execSync('npx tsc --version', { stdio: 'pipe' });
    console.log('✅ TypeScript configurado');
  } catch (error) {
    console.log('⚠️  TypeScript não encontrado, mas será instalado via dependências');
  }

  // Verificar Electron
  try {
    execSync('npx electron --version', { stdio: 'pipe' });
    console.log('✅ Electron configurado');
  } catch (error) {
    console.log('⚠️  Electron não encontrado, mas será instalado via dependências');
  }

  console.log('\n🎉 Configuração concluída com sucesso!\n');

  console.log('📋 Próximos passos:');
  console.log('   1. Obtenha sua chave API Groq em: https://console.groq.com');
  console.log('   2. Execute: npm run dev');
  console.log('   3. Configure a chave Groq no aplicativo');
  console.log('   4. Teste um comando: "Hello, teste de conexão"\n');

  console.log('🔧 Comandos úteis:');
  console.log('   npm run dev          - Iniciar desenvolvimento');
  console.log('   npm run build        - Build de produção');
  console.log('   npm run dist         - Gerar executável');
  console.log('   npm start            - Executar versão compilada\n');

  console.log('📖 Documentação completa no README.md\n');

  // Verificar se pode executar o projeto
  console.log('🧪 Testando configuração...');
  
  try {
    execSync('npm run build:main', { stdio: 'pipe' });
    console.log('✅ Build do processo principal - OK');
  } catch (error) {
    console.log('⚠️  Build do processo principal com problemas');
    console.log('   Execute: npm run dev:main para mais detalhes');
  }

  try {
    execSync('npm run build:renderer', { stdio: 'pipe' });
    console.log('✅ Build da interface - OK');
  } catch (error) {
    console.log('⚠️  Build da interface com problemas');
    console.log('   Execute: npm run dev:renderer para mais detalhes');
  }

  console.log('\n🎊 Duckduki está pronto para usar!');
  console.log('   Execute: npm run dev para começar\n');

} catch (error) {
  console.error('❌ Erro durante a configuração:', error.message);
  console.log('\n🔧 Soluções:');
  console.log('   1. Certifique-se que está na pasta correta do projeto');
  console.log('   2. Execute: npm install');
  console.log('   3. Verifique sua conexão com a internet');
  console.log('   4. Tente executar: npm cache clean --force');
  process.exit(1);
}

// Função helper para verificar comandos
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
} 