#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

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

// Verificar plataforma
const platform = os.platform();
console.log(`🖥️  Plataforma detectada: ${platform}`);

// Verificações específicas para Linux
if (platform === 'linux') {
  console.log('🐧 Configuração para Linux detectada');
  console.log('📋 Verificando dependências do sistema...');
  
  // Verificar dependências do sistema para Linux
  const linuxDeps = [
    { pkg: 'libsecret-1-0', desc: 'Necessário para keytar (armazenamento seguro de chaves)' },
    { pkg: 'libxss1', desc: 'Necessário para active-win (monitoramento de janelas)' },
    { pkg: 'libgconf-2-4', desc: 'Necessário para active-win (monitoramento de janelas)' }
  ];
  
  let missingDeps = [];
  
  for (const dep of linuxDeps) {
    try {
      execSync(`dpkg -l | grep ${dep.pkg}`, { stdio: 'pipe' });
      console.log(`  ✅ ${dep.pkg} - Instalado`);
    } catch (error) {
      console.log(`  ❌ ${dep.pkg} - Não encontrado`);
      missingDeps.push(dep);
    }
  }
  
  if (missingDeps.length > 0) {
    console.log('\n⚠️  AVISO: Algumas dependências do sistema estão faltando:');
    missingDeps.forEach(dep => {
      console.log(`   • ${dep.pkg}: ${dep.desc}`);
    });
    
    console.log('\n💡 Para instalar no Ubuntu/Debian:');
    const ubuntuPkgs = missingDeps.map(d => d.pkg).join(' ');
    console.log(`   sudo apt update && sudo apt install ${ubuntuPkgs}`);
    
    console.log('\n💡 Para instalar no Fedora/RHEL:');
    const fedoraPkgs = missingDeps.map(d => {
      if (d.pkg === 'libsecret-1-0') return 'libsecret-devel';
      if (d.pkg === 'libxss1') return 'libXScrnSaver';
      if (d.pkg === 'libgconf-2-4') return 'GConf2';
      return d.pkg;
    }).join(' ');
    console.log(`   sudo dnf install ${fedoraPkgs}`);
    
    console.log('\n💡 Para instalar no Arch:');
    const archPkgs = missingDeps.map(d => {
      if (d.pkg === 'libsecret-1-0') return 'libsecret';
      if (d.pkg === 'libxss1') return 'libxss';
      if (d.pkg === 'libgconf-2-4') return 'gconf';
      return d.pkg;
    }).join(' ');
    console.log(`   sudo pacman -S ${archPkgs}`);
    
    console.log('\n🔄 Após instalar as dependências, execute este script novamente.');
    console.log('   Algumas funcionalidades podem não funcionar corretamente sem essas dependências.\n');
  } else {
    console.log('✅ Todas as dependências do sistema estão instaladas!\n');
  }
}

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

  if (platform === 'linux') {
    console.log('🐧 Dicas específicas para Linux:');
    console.log('   • Se a gravação da API key não funcionar, verifique se libsecret está instalado');
    console.log('   • Se o monitor do sistema não funcionar, verifique libxss1 e libgconf-2-4');
    console.log('   • Execute o aplicativo com: npm run dev\n');
  }

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
  
  if (platform === 'linux') {
    console.log('   5. Instale as dependências do sistema mencionadas acima');
  }
  
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