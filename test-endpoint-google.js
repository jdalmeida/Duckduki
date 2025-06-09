const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testGoogleEndpoint() {
  console.log('🧪 Testando endpoint com Google específico...');
  
  try {
    // Primeiro, vamos testar o endpoint de configuração de IA
    console.log('📋 Verificando configuração atual...');
    const configResponse = await fetch('http://localhost:3003/api/test', {
      method: 'GET'
    });
    
    if (configResponse.ok) {
      console.log('✅ API está rodando');
    }

    // Testar chat com uma mensagem simples
    const response = await fetch('http://localhost:3003/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Qual é o provedor ativo? Me diga apenas isso.' }
        ]
      })
    });

    console.log('📡 Status:', response.status);
    console.log('📡 Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('📄 Resposta completa:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.error('❌ Erro completo:', error);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

// Aguardar alguns segundos para a aplicação inicializar
setTimeout(testGoogleEndpoint, 2000); 