import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface BuildResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export class DeployService {
  async runBuild(): Promise<BuildResult> {
    const startTime = Date.now();
    
    try {
      // Detectar tipo de projeto baseado nos arquivos
      const buildCommand = await this.detectBuildCommand();
      
      const { stdout, stderr } = await execAsync(buildCommand, {
        timeout: 300000, // 5 minutos
        maxBuffer: 1024 * 1024 // 1MB
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: stdout || 'Build executado com sucesso',
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        duration
      };
    }
  }

  async runDeploy(): Promise<BuildResult> {
    const startTime = Date.now();
    
    try {
      const deployCommand = await this.detectDeployCommand();
      
      const { stdout, stderr } = await execAsync(deployCommand, {
        timeout: 600000, // 10 minutos
        maxBuffer: 1024 * 1024
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: stdout || 'Deploy executado com sucesso',
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        duration
      };
    }
  }

  async runCustomCommand(command: string): Promise<BuildResult> {
    const startTime = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000,
        maxBuffer: 1024 * 1024
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: stdout || 'Comando executado com sucesso',
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        duration
      };
    }
  }

  private async detectBuildCommand(): Promise<string> {
    try {
      // Verificar se existe package.json
      const { stdout: packageJson } = await execAsync('type package.json || cat package.json', { timeout: 5000 });
      
      if (packageJson) {
        // Verificar se tem script de build
        try {
          const { stdout: npmScripts } = await execAsync('npm run', { timeout: 5000 });
          if (npmScripts.includes('build')) {
            return 'npm run build';
          }
        } catch {
          // Fallback para yarn se npm falhar
          try {
            const { stdout: yarnScripts } = await execAsync('yarn run', { timeout: 5000 });
            if (yarnScripts.includes('build')) {
              return 'yarn build';
            }
          } catch {
            // Ignorar erro
          }
        }
      }
    } catch {
      // Ignorar erro de detecção
    }

    // Verificar outros tipos de projeto
    try {
      await execAsync('ls Cargo.toml', { timeout: 2000 });
      return 'cargo build --release';
    } catch {}

    try {
      await execAsync('ls pom.xml', { timeout: 2000 });
      return 'mvn clean package';
    } catch {}

    try {
      await execAsync('ls build.gradle', { timeout: 2000 });
      return './gradlew build';
    } catch {}

    try {
      await execAsync('ls Makefile', { timeout: 2000 });
      return 'make';
    } catch {}

    // Comando padrão
    return 'echo "Nenhum comando de build detectado. Configure manualmente."';
  }

  private async detectDeployCommand(): Promise<string> {
    try {
      // Verificar se existe package.json com script deploy
      const { stdout: npmScripts } = await execAsync('npm run', { timeout: 5000 });
      if (npmScripts.includes('deploy')) {
        return 'npm run deploy';
      }
    } catch {
      try {
        const { stdout: yarnScripts } = await execAsync('yarn run', { timeout: 5000 });
        if (yarnScripts.includes('deploy')) {
          return 'yarn deploy';
        }
      } catch {
        // Ignorar erro
      }
    }

    // Verificar se é projeto Vercel
    try {
      await execAsync('ls vercel.json || ls .vercel', { timeout: 2000 });
      return 'vercel --prod';
    } catch {}

    // Verificar se é projeto Netlify
    try {
      await execAsync('ls netlify.toml', { timeout: 2000 });
      return 'netlify deploy --prod';
    } catch {}

    // Comando padrão
    return 'echo "Nenhum comando de deploy detectado. Configure manualmente."';
  }

  // Comandos predefinidos úteis
  async runTest(): Promise<BuildResult> {
    const commands = ['npm test', 'yarn test', 'cargo test', 'mvn test', 'pytest'];
    
    for (const command of commands) {
      try {
        const result = await this.runCustomCommand(command);
        if (result.success) return result;
      } catch {
        continue;
      }
    }

    return {
      success: false,
      output: '',
      error: 'Nenhum comando de teste encontrado',
      duration: 0
    };
  }

  async installDependencies(): Promise<BuildResult> {
    const commands = ['npm install', 'yarn install', 'cargo build', 'mvn install'];
    
    for (const command of commands) {
      try {
        const result = await this.runCustomCommand(command);
        if (result.success) return result;
      } catch {
        continue;
      }
    }

    return {
      success: false,
      output: '',
      error: 'Nenhum gerenciador de dependências encontrado',
      duration: 0
    };
  }

  async lintCode(): Promise<BuildResult> {
    const commands = ['npm run lint', 'yarn lint', 'eslint .', 'cargo clippy'];
    
    for (const command of commands) {
      try {
        const result = await this.runCustomCommand(command);
        if (result.success) return result;
      } catch {
        continue;
      }
    }

    return {
      success: false,
      output: '',
      error: 'Nenhum comando de lint encontrado',
      duration: 0
    };
  }

  // Comandos Git úteis
  async gitStatus(): Promise<BuildResult> {
    return this.runCustomCommand('git status --porcelain');
  }

  async gitCommit(message: string): Promise<BuildResult> {
    return this.runCustomCommand(`git add . && git commit -m "${message}"`);
  }

  async gitPush(): Promise<BuildResult> {
    return this.runCustomCommand('git push');
  }
} 