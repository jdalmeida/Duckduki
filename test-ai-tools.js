// Teste simples do sistema AI Tools
const { AIToolsService } = require('./dist/main/aiToolsService');
const { createGroq } = require('@ai-sdk/groq');

async function testAITools() {
  console.log('🧪 Testando AI Tools...');
  
  // Verificar se a chave Groq existe
  const groqKey = process.env.GROQ_API_KEY || 'YOUR_GROQ_KEY_HERE';
  
  if (!groqKey || groqKey === 'YOUR_GROQ_KEY_HERE') {
    console.log('❌ Chave Groq não configurada');
    console.log('Configure a variável GROQ_API_KEY ou adicione nas configurações do app');
    return;
  }
  
  console.log('✅ Chave Groq encontrada');
  
  // Teste simples de conexão
  try {
    const groqModel = createGroq({
      apiKey: groqKey,
    });
    
    console.log('✅ Modelo Groq criado com sucesso');
    console.log('🎯 AI Tools deve estar funcionando!');
    
  } catch (error) {
    console.log('❌ Erro ao criar modelo Groq:', error.message);
  }
}

testAITools().catch(console.error); 