// Importação com fallback para desenvolvimento
let Imap: any = null;

try {
  Imap = require('node-imap');
} catch (error) {
  console.warn('⚠️  node-imap não encontrado, usando emails mock');
}

import { Email } from './groqClient';

export interface EmailConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}

export class EmailService {
  private config: EmailConfig | null = null;

  setConfig(config: EmailConfig) {
    this.config = config;
  }

  async getRecentEmails(count: number = 5): Promise<Email[]> {
    if (!this.config || !Imap) {
      // Retorna emails de exemplo para teste
      return this.getMockEmails();
    }

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.config.user,
        password: this.config.password,
        host: this.config.host,
        port: this.config.port,
        tls: this.config.tls,
        tlsOptions: { rejectUnauthorized: false }
      });

      const emails: Email[] = [];

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            reject(err);
            return;
          }

          // Buscar os últimos emails
          const fetch = imap.seq.fetch(`${Math.max(1, box.messages.total - count + 1)}:*`, {
            bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
            struct: true
          });

          fetch.on('message', (msg) => {
            let header = '';
            
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                header += chunk.toString('utf8');
              });
            });

            msg.once('end', () => {
              try {
                const lines = header.split('\r\n');
                const from = this.parseHeader(lines, 'From:') || 'Desconhecido';
                const subject = this.parseHeader(lines, 'Subject:') || 'Sem assunto';
                const date = new Date(this.parseHeader(lines, 'Date:') || Date.now());

                emails.push({
                  from,
                  subject,
                  preview: `Preview do e-mail de ${from}`, // Simplificado para MVP
                  date
                });
              } catch (error) {
                console.error('Erro ao processar e-mail:', error);
              }
            });
          });

          fetch.once('error', (err) => {
            reject(err);
          });

          fetch.once('end', () => {
            imap.end();
            resolve(emails.reverse()); // Mais recentes primeiro
          });
        });
      });

      imap.once('error', (err) => {
        reject(err);
      });

      imap.connect();
    });
  }

  private parseHeader(lines: string[], headerName: string): string | null {
    const line = lines.find(l => l.toLowerCase().startsWith(headerName.toLowerCase()));
    if (!line) return null;
    
    return line.substring(headerName.length).trim();
  }

  private getMockEmails(): Email[] {
    return [
      {
        from: 'chefe@empresa.com',
        subject: 'URGENTE: Revisão do projeto Q4',
        preview: 'Precisamos revisar os deliverables do projeto Q4 antes da apresentação de amanhã. Por favor, confirme sua disponibilidade...',
        date: new Date(Date.now() - 1000 * 60 * 30) // 30 min atrás
      },
      {
        from: 'cliente@importante.com',
        subject: 'Feedback sobre a proposta',
        preview: 'Recebemos sua proposta e gostaríamos de discutir alguns pontos. Quando podemos agendar uma reunião?',
        date: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2h atrás
      },
      {
        from: 'newsletter@tech.com',
        subject: 'Últimas tendências em IA',
        preview: 'Descubra as principais inovações em inteligência artificial que estão transformando o mercado...',
        date: new Date(Date.now() - 1000 * 60 * 60 * 4) // 4h atrás
      },
      {
        from: 'equipe@dev.com',
        subject: 'Build quebrou no CI/CD',
        preview: 'O build da branch main falhou nos testes automatizados. Error: TypeError in component UserProfile...',
        date: new Date(Date.now() - 1000 * 60 * 60 * 6) // 6h atrás
      },
      {
        from: 'hr@empresa.com',
        subject: 'Lembrete: 1:1 mensal agendado',
        preview: 'Seu 1:1 mensal está agendado para quinta-feira às 14h. Prepare seus pontos de discussão...',
        date: new Date(Date.now() - 1000 * 60 * 60 * 8) // 8h atrás
      }
    ];
  }

  // Configuração rápida para Gmail (via App Password)
  configureGmail(email: string, appPassword: string) {
    this.setConfig({
      user: email,
      password: appPassword,
      host: 'imap.gmail.com',
      port: 993,
      tls: true
    });
  }

  // Configuração para Outlook/Hotmail
  configureOutlook(email: string, password: string) {
    this.setConfig({
      user: email,
      password: password,
      host: 'outlook.office365.com',
      port: 993,
      tls: true
    });
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  clearConfig() {
    this.config = null;
  }
} 