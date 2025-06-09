#!/usr/bin/env node

/**
 * Script de Preparação para Distribuição
 * 
 * Este script facilita o processo de embarcamento de credenciais
 * no executável antes de gerar o instalador.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🚀 PREPARAÇÃO PARA DISTRIBUIÇÃO - Duckduki\n');
  console.log('Este script irá embutir as credenciais do Google Drive no executável.\n');
  
  // Verificar se existe arquivo .env
  const envExists = fs.existsSync('.env');
  if (envExists) {
    console.log('✅ Arquivo .env encontrado');
    
    // Ler .env para sugerir valores
    const envContent = fs.readFileSync('.env', 'utf8');
    const clientIdMatch = envContent.match(/GOOGLE_DRIVE_CLIENT_ID=(.+)/);
    const clientSecretMatch = envContent.match(/GOOGLE_DRIVE_CLIENT_SECRET=(.+)/);
    
    const suggestedClientId = clientIdMatch ? clientIdMatch[1].trim() : '';
    const suggestedClientSecret = clientSecretMatch ? clientSecretMatch[1].trim() : '';
    
    console.log('\n📋 Credenciais encontradas no .env:');
    console.log(`  • GOOGLE_DRIVE_CLIENT_ID: ${suggestedClientId ? '✅ Configurado' : '❌ Não encontrado'}`);
    console.log(`  • GOOGLE_DRIVE_CLIENT_SECRET: ${suggestedClientSecret ? '✅ Configurado' : '❌ Não encontrado'}`);
    
    if (suggestedClientId && suggestedClientSecret) {
      const useEnv = await askQuestion('\n🤔 Usar as credenciais do .env? (s/n): ');
      
      if (useEnv.toLowerCase() === 's' || useEnv.toLowerCase() === 'sim' || useEnv === '') {
        await embedCredentials(suggestedClientId, suggestedClientSecret);
        await buildAndDist();
        rl.close();
        return;
      }
    }
  } else {
    console.log('⚠️  Arquivo .env não encontrado');
  }
  
  console.log('\n📝 Digite as credenciais do Google Drive:');
  console.log('   (Obtenha em: https://console.cloud.google.com/)');
  
  const clientId = await askQuestion('\n🔑 GOOGLE_DRIVE_CLIENT_ID: ');
  const clientSecret = await askQuestion('🔐 GOOGLE_DRIVE_CLIENT_SECRET: ');
  
  if (!clientId || !clientSecret) {
    console.log('\n❌ Credenciais não fornecidas. Abortando...');
    rl.close();
    return;
  }
  
  await embedCredentials(clientId, clientSecret);
  await buildAndDist();
  rl.close();
}

async function embedCredentials(clientId, clientSecret) {
  console.log('\n🔧 Embarcando credenciais...');
  
  const configPath = path.join(__dirname, 'src', 'main', 'embeddedConfig.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Substituir os valores undefined pelas credenciais reais
  configContent = configContent.replace(
    'clientId: undefined, // Cole aqui o GOOGLE_DRIVE_CLIENT_ID',
    `clientId: '${clientId}', // Credencial embarcada`
  );
  
  configContent = configContent.replace(
    'clientSecret: undefined, // Cole aqui o GOOGLE_DRIVE_CLIENT_SECRET',  
    `clientSecret: '${clientSecret}', // Credencial embarcada`
  );
  
  fs.writeFileSync(configPath, configContent);
  console.log('✅ Credenciais embarcadas com sucesso!');
}

async function buildAndDist() {
  console.log('\n🔨 Iniciando build...');
  
  const { spawn } = require('child_process');
  
  const platform = process.platform;
  let buildCommand = 'npm run dist';
  
  if (platform === 'win32') {
    buildCommand = 'npm run dist:win';
  } else if (platform === 'darwin') {
    buildCommand = 'npm run dist:mac';  
  } else {
    buildCommand = 'npm run dist:linux';
  }
  
  console.log(`🎯 Executando: ${buildCommand}`);
  
  const buildProcess = spawn(buildCommand.split(' ')[0], buildCommand.split(' ').slice(1), {
    stdio: 'inherit',
    shell: true
  });
  
  buildProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n🎉 BUILD CONCLUÍDO COM SUCESSO!');
      console.log('📦 Instalador disponível na pasta "release/"');
      console.log('\n⚠️  IMPORTANTE: Restaure o arquivo embeddedConfig.ts antes de fazer commit:');
      console.log('   git checkout src/main/embeddedConfig.ts');
    } else {
      console.log(`\n❌ Build falhou com código: ${code}`);
    }
    
    // Restaurar configuração automaticamente
    restoreConfig();
  });
}

function restoreConfig() {
  console.log('\n🔄 Restaurando configuração...');
  
  const configPath = path.join(__dirname, 'src', 'main', 'embeddedConfig.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Restaurar valores undefined
  configContent = configContent.replace(
    /clientId: '[^']*', \/\/ Credencial embarcada/,
    'clientId: undefined, // Cole aqui o GOOGLE_DRIVE_CLIENT_ID'
  );
  
  configContent = configContent.replace(
    /clientSecret: '[^']*', \/\/ Credencial embarcada/,
    'clientSecret: undefined, // Cole aqui o GOOGLE_DRIVE_CLIENT_SECRET'
  );
  
  fs.writeFileSync(configPath, configContent);
  console.log('✅ Configuração restaurada');
}

main().catch(console.error); 