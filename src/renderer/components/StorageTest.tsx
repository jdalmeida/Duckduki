import React, { useState } from 'react';
import './StorageTest.css';

interface StorageTestProps {
  onClose: () => void;
}

export const StorageTest: React.FC<StorageTestProps> = ({ onClose }) => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTest = async () => {
    setTesting(true);
    setResults(null);

    try {
      const result = await window.electronAPI.testStorage();
      setResults(result);
    } catch (error) {
      setResults({
        success: false,
        details: { error: error instanceof Error ? error.message : 'Erro desconhecido' }
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? '✅' : '❌';
  };

  const getRecommendation = () => {
    if (!results) return null;

    const { details } = results;
    const recommendations = [];

    if (details.platform === 'win32') {
      if (details.windowsCredentialWorking) {
        recommendations.push('🪟 Windows Credential Manager funcionando - suas chaves estão seguras!');
      } else if (!details.keytarWorking) {
        recommendations.push('⚠️ Windows Credential Manager não está funcionando. Usando armazenamento criptografado como fallback.');
      }
    } else if (!details.keytarWorking && details.platform === 'linux') {
      recommendations.push('No Linux, instale libsecret para maior segurança: sudo apt install libsecret-1-dev');
    }

    if (!details.storeWorking) {
      recommendations.push('O armazenamento local não está funcionando. Reinstale a aplicação.');
    }

    if (!details.testResults?.saveAndRetrieve) {
      recommendations.push('Teste de salvamento/recuperação falhou. Os dados podem não estar sendo salvos corretamente.');
    }

    if (recommendations.length === 0 && results.success) {
      recommendations.push('Tudo funcionando corretamente! ✨');
    }

    return recommendations;
  };

  return (
    <div className="storage-test-overlay">
      <div className="storage-test-modal">
        <div className="storage-test-header">
          <h2>🔍 Diagnóstico de Armazenamento</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="storage-test-content">
          <p className="description">
            Este teste verifica se o sistema de armazenamento está funcionando corretamente
            para salvar suas chaves API e configurações.
          </p>

          <div className="test-actions">
            <button 
              onClick={runTest} 
              disabled={testing}
              className="test-btn"
            >
              {testing ? '🔄 Testando...' : '🧪 Executar Teste'}
            </button>
          </div>

          {results && (
            <div className="test-results">
              <h3>📊 Resultados do Teste</h3>
              
              <div className="result-item">
                <strong>Status Geral:</strong> 
                <span className={results.success ? 'success' : 'error'}>
                  {getStatusIcon(results.success)} {results.success ? 'Sucesso' : 'Falha'}
                </span>
              </div>

              <div className="result-details">
                <h4>Detalhes Técnicos:</h4>
                <ul>
                  <li>
                    <strong>Plataforma:</strong> {results.details.platform}
                  </li>
                  <li>
                    <strong>Keytar disponível:</strong> 
                    {getStatusIcon(results.details.keytarAvailable)} 
                    {results.details.keytarAvailable ? 'Sim' : 'Não'}
                  </li>
                  <li>
                    <strong>Keytar funcionando:</strong> 
                    {getStatusIcon(results.details.keytarWorking)} 
                    {results.details.keytarWorking ? 'Sim' : 'Não'}
                  </li>
                  {results.details.platform === 'win32' && (
                    <li>
                      <strong>Windows Credential Manager:</strong> 
                      {getStatusIcon(results.details.windowsCredentialWorking)} 
                      {results.details.windowsCredentialWorking ? 'Funcionando' : 'Não funcionando'}
                    </li>
                  )}
                  <li>
                    <strong>Store funcionando:</strong> 
                    {getStatusIcon(results.details.storeWorking)} 
                    {results.details.storeWorking ? 'Sim' : 'Não'}
                  </li>
                  <li>
                    <strong>Teste salvar/recuperar:</strong> 
                    {getStatusIcon(results.details.testResults?.saveAndRetrieve)} 
                    {results.details.testResults?.saveAndRetrieve ? 'Sucesso' : 'Falha'}
                  </li>
                </ul>
              </div>

              <div className="recommendations">
                <h4>💡 Recomendações:</h4>
                <ul>
                  {getRecommendation()?.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>

              {results.details.error && (
                <div className="error-details">
                  <h4>❌ Erro:</h4>
                  <code>{results.details.error}</code>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 