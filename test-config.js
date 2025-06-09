const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAIConfig() {
  console.log('🔍 Verificando configuração de IA...');
  
  try {
    // Simular o endpoint get-ai-config
    const configURL = 'http://localhost:3003/api/ai-config';
    
    console.log('📋 Tentando acessar configuração de IA...');
    
    // Primeiro vamos tentar um endpoint básico
    const testResponse = await fetch('http://localhost:3003/api/test');
    
    if (testResponse.ok) {
      console.log('✅ Servidor está rodando');
    } else {
      console.log('❌ Servidor não está rodando');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

setTimeout(testAIConfig, 1000); 