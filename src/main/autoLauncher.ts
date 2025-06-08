import { app } from 'electron';
import { join } from 'path';
import { promises as fs } from 'fs';
import { homedir } from 'os';

export class AutoLauncher {
  private appName: string;
  private appPath: string;

  constructor() {
    this.appName = 'Duckduki';
    this.appPath = process.execPath;
  }

  /**
   * Habilita a inicialização automática no sistema
   */
  async enable(): Promise<boolean> {
    try {
      const platform = process.platform;
      
      switch (platform) {
        case 'win32':
          return await this.enableWindows();
        case 'darwin':
          return await this.enableMacOS();
        case 'linux':
          return await this.enableLinux();
        default:
          console.warn(`⚠️ Sistema operacional ${platform} não suportado para inicialização automática`);
          return false;
      }
    } catch (error) {
      console.error('❌ Erro ao habilitar inicialização automática:', error);
      return false;
    }
  }

  /**
   * Desabilita a inicialização automática no sistema
   */
  async disable(): Promise<boolean> {
    try {
      const platform = process.platform;
      
      switch (platform) {
        case 'win32':
          return await this.disableWindows();
        case 'darwin':
          return await this.disableMacOS();
        case 'linux':
          return await this.disableLinux();
        default:
          console.warn(`⚠️ Sistema operacional ${platform} não suportado para inicialização automática`);
          return false;
      }
    } catch (error) {
      console.error('❌ Erro ao desabilitar inicialização automática:', error);
      return false;
    }
  }

  /**
   * Verifica se a inicialização automática está habilitada
   */
  async isEnabled(): Promise<boolean> {
    try {
      const platform = process.platform;
      
      switch (platform) {
        case 'win32':
          return await this.isEnabledWindows();
        case 'darwin':
          return await this.isEnabledMacOS();
        case 'linux':
          return await this.isEnabledLinux();
        default:
          return false;
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status da inicialização automática:', error);
      return false;
    }
  }

  // Métodos específicos para Windows
  private async enableWindows(): Promise<boolean> {
    try {
      // Usar Electron's built-in auto-launch para Windows
      if (app.setLoginItemSettings) {
        app.setLoginItemSettings({
          openAtLogin: true,
          path: this.appPath,
          args: ['--minimized']
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao habilitar inicialização automática no Windows:', error);
      return false;
    }
  }

  private async disableWindows(): Promise<boolean> {
    try {
      if (app.setLoginItemSettings) {
        app.setLoginItemSettings({
          openAtLogin: false
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao desabilitar inicialização automática no Windows:', error);
      return false;
    }
  }

  private async isEnabledWindows(): Promise<boolean> {
    try {
      if (app.getLoginItemSettings) {
        const settings = app.getLoginItemSettings();
        return settings.openAtLogin;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao verificar status no Windows:', error);
      return false;
    }
  }

  // Métodos específicos para macOS
  private async enableMacOS(): Promise<boolean> {
    try {
      // Usar Electron's built-in auto-launch para macOS
      if (app.setLoginItemSettings) {
        app.setLoginItemSettings({
          openAtLogin: true,
          path: this.appPath,
          args: ['--minimized']
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao habilitar inicialização automática no macOS:', error);
      return false;
    }
  }

  private async disableMacOS(): Promise<boolean> {
    try {
      if (app.setLoginItemSettings) {
        app.setLoginItemSettings({
          openAtLogin: false
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao desabilitar inicialização automática no macOS:', error);
      return false;
    }
  }

  private async isEnabledMacOS(): Promise<boolean> {
    try {
      if (app.getLoginItemSettings) {
        const settings = app.getLoginItemSettings();
        return settings.openAtLogin;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao verificar status no macOS:', error);
      return false;
    }
  }

  // Métodos específicos para Linux
  private async enableLinux(): Promise<boolean> {
    try {
      const autostartDir = join(homedir(), '.config', 'autostart');
      const desktopFile = join(autostartDir, `${this.appName}.desktop`);

      // Criar diretório autostart se não existir
      try {
        await fs.mkdir(autostartDir, { recursive: true });
      } catch (err) {
        // Diretório já existe
      }

      // Criar arquivo .desktop
      const desktopContent = `[Desktop Entry]
Type=Application
Version=1.0
Name=${this.appName}
Comment=Assistente desktop inteligente com IA generativa
Exec="${this.appPath}" --minimized
Icon=${this.appName.toLowerCase()}
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
StartupNotify=false
`;

      await fs.writeFile(desktopFile, desktopContent, 'utf8');
      
      // Tornar o arquivo executável
      await fs.chmod(desktopFile, 0o755);
      
      console.log('✅ Inicialização automática habilitada no Linux');
      return true;
    } catch (error) {
      console.error('❌ Erro ao habilitar inicialização automática no Linux:', error);
      return false;
    }
  }

  private async disableLinux(): Promise<boolean> {
    try {
      const autostartDir = join(homedir(), '.config', 'autostart');
      const desktopFile = join(autostartDir, `${this.appName}.desktop`);

      try {
        await fs.unlink(desktopFile);
        console.log('✅ Inicialização automática desabilitada no Linux');
        return true;
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // Arquivo não existe, já está desabilitado
          return true;
        }
        throw error;
      }
    } catch (error) {
      console.error('❌ Erro ao desabilitar inicialização automática no Linux:', error);
      return false;
    }
  }

  private async isEnabledLinux(): Promise<boolean> {
    try {
      const autostartDir = join(homedir(), '.config', 'autostart');
      const desktopFile = join(autostartDir, `${this.appName}.desktop`);

      try {
        await fs.access(desktopFile);
        return true;
      } catch (err) {
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status no Linux:', error);
      return false;
    }
  }

  /**
   * Alterna o estado da inicialização automática
   */
  async toggle(): Promise<boolean> {
    const currentState = await this.isEnabled();
    if (currentState) {
      return await this.disable();
    } else {
      return await this.enable();
    }
  }

  /**
   * Obtém informações sobre o status da inicialização automática
   */
  async getStatus(): Promise<{
    enabled: boolean;
    platform: string;
    supported: boolean;
  }> {
    const platform = process.platform;
    const supported = ['win32', 'darwin', 'linux'].includes(platform);
    const enabled = supported ? await this.isEnabled() : false;

    return {
      enabled,
      platform,
      supported
    };
  }
} 