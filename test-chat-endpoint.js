const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testChatEndpoint() {
  console.log('🧪 Testando endpoint /api/chat...');
  
  try {
    const response = await fetch('http://localhost:3003/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Olá! Como você está?' }
        ]
      })
    });

    console.log('📡 Status:', response.status);
    console.log('📡 Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type:', contentType);
      
      if (contentType?.includes('application/json')) {
        // Resposta JSON simples
        const data = await response.json();
        console.log('📄 Resposta JSON:', JSON.stringify(data, null, 2));
      } else {
        // Tentar ler como stream
        try {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          
          console.log('📥 Lendo stream...');
          let fullContent = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;
            console.log('📦 Chunk recebido:', chunk);
          }
          
          console.log('✅ Stream concluído:', fullContent);
        } catch (streamError) {
          console.error('❌ Erro no stream:', streamError.message);
          const text = await response.text();
          console.log('📄 Resposta texto:', text);
        }
      }
    } else {
      const error = await response.text();
      console.error('❌ Erro completo:', error);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

// Aguardar alguns segundos para a aplicação inicializar
setTimeout(testChatEndpoint, 5000); 