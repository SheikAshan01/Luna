import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, session } from 'electron';
import path from 'path';

// Allow automatic audio playback without requiring prior mouse clicks (Essential for JARVIS duplex voice)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#070B14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window close -> hide to system tray unless explicitly quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Handle window maximize/unmaximize state events
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:stateChange', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:stateChange', false);
  });

  const devUrl = 'http://localhost:5173';
  const distFile = path.join(__dirname, '../dist/index.html');

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow?.loadFile(distFile);
    });

    // If initial navigation fails (e.g. vite not ready yet), fallback to dist
    mainWindow.webContents.on('did-fail-load', () => {
      mainWindow?.loadFile(distFile);
    });
  } else {
    mainWindow.loadFile(distFile);
  }
}

function createTray() {
  const iconPath = path.join(__dirname, 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('LUNA AI Assistant (Ctrl + Space)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show LUNA (Ctrl + Space)',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit LUNA Completely',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
}

app.whenReady().then(() => {
  // Automatically grant microphone permissions for seamless hands-free speech
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler(() => true);

  createWindow();
  try {
    createTray();
  } catch (err) {
    console.error('Tray initialization error:', err);
  }

  // JARVIS Global Shortcut: Ctrl + Space to summon Luna anywhere in Windows
  globalShortcut.register('CommandOrControl+Space', () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

// IPC Window Controls
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  // If close button clicked in header, hide to tray
  mainWindow?.hide();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

ipcMain.handle('app:version', () => {
  return app.getVersion();
});
