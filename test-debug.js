const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDebug() {
  console.log('🔍 Testando endpoint de debug...');
  
  try {
    const response = await fetch('http://localhost:3003/api/debug-ai');
    
    console.log('📡 Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📄 Debug info:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.error('❌ Erro:', error);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

setTimeout(testDebug, 1000); 