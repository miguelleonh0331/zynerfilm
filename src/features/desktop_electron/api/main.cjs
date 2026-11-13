const { app, BrowserWindow, dialog, shell } = require('electron');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
let backend;
let stopping = false;
app.whenReady().then(async () => {
  try {
    let target = process.env.ZYNER_SERVER_URL;
    if (target) {
      const url = new URL(target);
      if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
        throw new Error('El servidor remoto requiere HTTPS.');
      target = url.href;
    } else {
      const { startBackend } = await import(pathToFileURL(path.resolve(__dirname, '../../../../server.mjs')).href);
      backend = await startBackend({ host: '127.0.0.1', port: 0, publicOrigin: undefined, secureCookies: false });
      target = backend.origin + '/#token=' + encodeURIComponent(backend.token);
    }
    const window = new BrowserWindow({ width: 1320, height: 900, minWidth: 960, minHeight: 680,
      title: 'Zynerfilmer', autoHideMenuBar: true, backgroundColor: '#0c1017',
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
    const allowed = new URL(target).origin;
    window.webContents.setWindowOpenHandler(({ url }) => {
      const external = new URL(url);
      if (external.protocol === 'https:' && external.hostname === 'auth.openai.com' && external.pathname === '/codex/device')
        void shell.openExternal(external.href);
      return { action: 'deny' };
    });
    window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== allowed) event.preventDefault(); });
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    await window.loadURL(target);
  } catch (error) { dialog.showErrorBox('Zynerfilmer', error.message); app.quit(); }
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', event => {
  if (backend && !stopping) {
    event.preventDefault(); stopping = true;
    backend.close().finally(() => app.quit());
  }
});
