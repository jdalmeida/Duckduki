#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 Iniciando Duckduki em modo desenvolvimento...\n');

// Verificar dependências críticas
const criticalDeps = ['electron', 'react', 'typescript', 'vite'];
let missingDeps = [];

for (const dep of criticalDeps) {
  try {
    require.resolve(dep);
  } catch (error) {
    missingDeps.push(dep);
  }
}

if (missingDeps.length > 0) {
  console.log('❌ Dependências faltando:', missingDeps.join(', '));
  console.log('🔧 Executando: npm install...\n');
  
  const install = spawn('npm', ['install'], { 
    stdio: 'inherit',
    shell: true 
  });
  
  install.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Dependências instaladas! Iniciando aplicação...\n');
      startDev();
    } else {
      console.error('\n❌ Erro ao instalar dependências');
      process.exit(1);
    }
  });
} else {
  startDev();
}

function startDev() {
  // Verificar se ícone existe
  if (!fs.existsSync('assets/icon.png') && !fs.existsSync('assets/icon.svg')) {
    console.log('🎨 Criando ícone...');
    const createIcon = spawn('node', ['create-icon.js'], { 
      stdio: 'inherit',
      shell: true 
    });
    
    createIcon.on('close', () => {
      startApplication();
    });
  } else {
    startApplication();
  }
}

function startApplication() {
  console.log('🚀 Iniciando aplicação...\n');
  
  const dev = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit',
    shell: true 
  });
  
  dev.on('close', (code) => {
    console.log(`\n📋 Aplicação finalizada com código: ${code}`);
  });
  
  // Capturar Ctrl+C para limpeza
  process.on('SIGINT', () => {
    console.log('\n🛑 Parando aplicação...');
    dev.kill('SIGINT');
    process.exit(0);
  });
} 