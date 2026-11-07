const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

let mainWindow = null;
let bunServerProcess = null;

function checkServerReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureBunServer() {
  const ready = await checkServerReady('http://127.0.0.1:5189/api/bootstrap');
  if (ready) return;

  const bunPath = 'C:\\Users\\lai\\.cherrystudio\\bin\\bun.exe';
  const serverScript = path.join(__dirname, '..', 'server', 'index.ts');
  bunServerProcess = spawn(bunPath, ['run', serverScript], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
    windowsHide: true,
  });

  for (let i = 0; i < 40; i++) {
    if (await checkServerReady('http://127.0.0.1:5189/api/bootstrap')) break;
    await new Promise((r) => setTimeout(r, 150));
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 920,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#70686a',
      height: 36,
    },
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.OMP_DESKTOP_URL || 'http://127.0.0.1:5189';
  mainWindow.loadURL(devUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

ipcMain.handle('window:updateOverlay', (_event, { isDark, symbolColor }) => {
  if (mainWindow && typeof mainWindow.setTitleBarOverlay === 'function') {
    mainWindow.setTitleBarOverlay({
      color: '#00000000',
      symbolColor: symbolColor || (isDark ? '#beb6b8' : '#70686a'),
      height: 36,
    });
  }
});

app.whenReady().then(async () => {
  await ensureBunServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (bunServerProcess) {
    try {
      bunServerProcess.kill();
    } catch {}
  }
  if (process.platform !== 'darwin') app.quit();
});
