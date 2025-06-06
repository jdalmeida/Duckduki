import React, { useState } from 'react';

export const StreamTest: React.FC = () => {
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const testStreamAPI = async () => {
    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      console.log('🧪 [STREAM TEST] Iniciando teste de streaming...');
      
      const response = await fetch('http://localhost:3003/api/test-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain',
        },
        body: JSON.stringify({ test: true })
      });

      console.log('📡 [STREAM TEST] Response recebido:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream reader não disponível');
      }

      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ [STREAM TEST] Stream concluído');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('📤 [STREAM TEST] Chunk recebido:', chunk);
        
        result += chunk;
        setResponse(result);
      }

    } catch (error) {
      console.error('❌ [STREAM TEST] Erro:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  const testChatAPI = async () => {
    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      console.log('🧪 [CHAT TEST] Iniciando teste de chat...');
      
      const response = await fetch('http://localhost:3003/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Olá! Como você está?' }
          ]
        })
      });

      console.log('📡 [CHAT TEST] Response recebido:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream reader não disponível');
      }

      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ [CHAT TEST] Stream concluído');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('📤 [CHAT TEST] Chunk recebido:', chunk);
        
        result += chunk;
        setResponse(result);
      }

    } catch (error) {
      console.error('❌ [CHAT TEST] Erro:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h3>🧪 Teste de Streaming</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testStreamAPI} 
          disabled={isLoading}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          {isLoading ? '⏳ Testando...' : '🌊 Testar Stream Simples'}
        </button>
        
        <button 
          onClick={testChatAPI} 
          disabled={isLoading}
          style={{ padding: '10px 20px' }}
        >
          {isLoading ? '⏳ Testando...' : '🤖 Testar Chat AI'}
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          border: '1px solid #f44336',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>❌ Erro:</strong> {error}
        </div>
      )}

      {response && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace'
        }}>
          <strong>📝 Resposta:</strong><br />
          {response}
        </div>
      )}
    </div>
  );
}; 