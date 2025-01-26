const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const extract = require('extract-zip');

// 修改 electron-dl 的导入方式
let electronDl;
import('electron-dl').then(module => {
  electronDl = module.default;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1465,
    height: 945,
    minWidth: 1465,
    minHeight: 945,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      enableRemoteModule: true,
      webviewTag: true
    },
    focusable: true,
    show: false
  });

  win.loadFile('index.html').then(() => {
    win.show();
    win.focus();
  });

  Menu.setApplicationMenu(null);
}

// 处理页面导航请求
ipcMain.handle('navigation:goTo', (event, path) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.loadFile(path).then(() => {
      // 导航完成后重新聚焦窗口
      win.focus();
      // 发送一个事件到渲染进程，通知导航完成
      win.webContents.send('navigation:completed');
    });
  }
});

// 在已有的代码后添加
async function syncToolsData() {
  try {
    const response = await fetch('https://adofaitools.voin.ink/data/tools.json');
    const toolsData = await response.json();
    
    // 确保tools目录存在
    const toolsDir = path.join(app.getPath('userData'), 'tools');
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir);
    }
    
    // 保存工具数据到本地
    const localToolsPath = path.join(app.getPath('userData'), 'tools.json');
    fs.writeFileSync(localToolsPath, JSON.stringify(toolsData, null, 2));
    
    return toolsData;
  } catch (error) {
    console.error('Sync tools data error:', error);
    // 如果同步失败，尝试读取本地缓存
    try {
      const localToolsPath = path.join(app.getPath('userData'), 'tools.json');
      return JSON.parse(fs.readFileSync(localToolsPath, 'utf8'));
    } catch (e) {
      return { tools: [] };
    }
  }
}

// 添加IPC处理器
ipcMain.handle('tools:sync', syncToolsData);
ipcMain.handle('tools:openFolder', (event, toolId) => {
  const toolPath = path.join(app.getPath('exe'), '../tools', toolId);
  if (!fs.existsSync(toolPath)) {
    fs.mkdirSync(toolPath, { recursive: true });
  }
  shell.openPath(toolPath);
});

// 添加对话框处理器
ipcMain.handle('dialog:showOpenDialog', (event, options) => {
  return dialog.showOpenDialog(options);
});

ipcMain.handle('dialog:showSaveDialog', (event, options) => {
  return dialog.showSaveDialog(options);
});

// 工具下载处理器
ipcMain.handle('tools:download', async (event, { url, toolId, version }) => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
  
    // 为工具下载创建一个新的 will-download 处理函数
    const handleToolDownload = (event, item, webContents) => {
      const fileName = path.basename(url);
      const toolsDir = path.join(app.getPath('exe'), '../tools');
      const toolDir = path.join(toolsDir, toolId);
      const filePath = path.join(toolDir, fileName);
      const fileExt = path.extname(fileName).toLowerCase();
  
      if (!fs.existsSync(toolDir)) {
        fs.mkdirSync(toolDir, { recursive: true });
      }
  
      item.setSavePath(filePath);
    
      item.on('updated', (event, state) => {
        if (state === 'progressing') {
          const progress = item.getReceivedBytes() / item.getTotalBytes();
          win.webContents.send('download:progress', { percent: progress * 100 });
        }
      });
    
      item.once('done', async (event, state) => {
        if (state === 'completed') {
          try {
            // 如果是exe文件，直接发送成功消息
            if (fileExt === '.exe') {
              // 保存版本信息
              const versionInfo = {
                version: version,
                installDate: new Date().toISOString()
              };
              fs.writeFileSync(
                path.join(toolDir, 'version.json'),
                JSON.stringify(versionInfo, null, 2)
              );
              win.webContents.send('download:complete', { success: true });
              return;
            }
            
            // 如果是压缩文件就解压
            if (fileExt === '.zip' || fileExt === '.rar') {
              // 解压文件
              await extract(filePath, { dir: toolDir });
              // 删除压缩包
              fs.unlinkSync(filePath);
            }
            
            // 保存版本信息
            const versionInfo = {
              version: version,
              installDate: new Date().toISOString()
            };
            fs.writeFileSync(
              path.join(toolDir, 'version.json'),
              JSON.stringify(versionInfo, null, 2)
            );
            
            // 发送成功消息
            win.webContents.send('download:complete', { success: true });
          } catch (error) {
            console.error('Post-download processing error:', error);
            win.webContents.send('download:complete', { 
              success: false, 
              error: (fileExt === '.zip' || fileExt === '.rar') ? '解压失败' : '处理文件失败'
            });
          }
        } else {
          win.webContents.send('download:complete', { success: false });
        }
      });
    };
    
    // 只监听一次下载事件
    win.webContents.session.once('will-download', handleToolDownload);
  
    // 触发下载
    win.webContents.downloadURL(url);
  
    return { success: true };
  } catch (error) {
    console.error('Download error:', error);
    return { success: false, error: error.message };
  }
});

// 普通下载处理器
ipcMain.handle('download', async (event, { url }) => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    
    // 添加下载对话框
    const saveDialogResult = await dialog.showSaveDialog(win, {
      defaultPath: path.basename(url),
      filters: [
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (saveDialogResult.canceled) {
      return { success: false, error: '用户取消下载' };
    }
    
    const filePath = saveDialogResult.filePath;
    
    // 为普通下载创建一个新的 will-download 处理函数
    const handleNormalDownload = (event, item, webContents) => {
      item.setSavePath(filePath);
      
      item.on('updated', (event, state) => {
        if (state === 'progressing') {
          const progress = item.getReceivedBytes() / item.getTotalBytes();
          win.webContents.send('download:progress', { percent: progress * 100 });
        }
      });
      
      item.once('done', (event, state) => {
        win.webContents.send('download:complete', { 
          success: state === 'completed'
        });
      });
    };
    
    // 只监听一次下载事件
    win.webContents.session.once('will-download', handleNormalDownload);
    
    // 触发下载
    win.webContents.downloadURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Download error:', error);
    return { success: false, error: error.message };
  }
});

// 添加版本检查处理器
ipcMain.handle('tools:checkVersion', (event, toolId) => {
  try {
    const toolDir = path.join(app.getPath('exe'), '../tools', toolId);
    const versionPath = path.join(toolDir, 'version.json');
    
    if (fs.existsSync(versionPath)) {
      const versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      return { installed: true, version: versionInfo.version };
    }
    
    return { installed: false };
  } catch (error) {
    console.error('Version check error:', error);
    return { installed: false };
  }
});

// 添加版本检查函数
async function checkForUpdates() {
  try {
    const response = await fetch('https://adofaitools.voin.ink/version.json');
    const data = await response.json();
    const currentVersion = app.getVersion();
    
    // 将版本号分割为数字数组进行比较
    const serverVersion = data.version.split('.').map(Number);
    const localVersion = currentVersion.split('.').map(Number);
    
    // 比较版本号，只有服务器版本更高时才提示更新
    let hasUpdate = false;
    for (let i = 0; i < 3; i++) {
      if (serverVersion[i] > localVersion[i]) {
        hasUpdate = true;
        break;
      } else if (serverVersion[i] < localVersion[i]) {
        break;
      }
    }
    
    if (hasUpdate) {
      const result = await dialog.showMessageBox({
        type: 'info',
        title: '发现新版本',
        message: `发现新版本 ${data.version}，是否更新？\n\n更新内容：\n${data.changelog}`,
        buttons: ['更新', '取消'],
        defaultId: 0
      });

      if (result.response === 0) {
        // 用户选择更新
        const downloadResult = await dialog.showMessageBox({
          type: 'info',
          message: '即将打开下载页面，下载完成后请关闭当前程序并安装新版本。',
          buttons: ['确定', '取消']
        });

        if (downloadResult.response === 0) {
          shell.openExternal(data.downloadUrl);
        }
      }
    }
  } catch (error) {
    console.error('Check update error:', error);
  }
}

// 在应用启动时检查更新
app.whenReady().then(() => {
  createWindow();
  // 延迟几秒检查更新，避免影响启动速度
  setTimeout(checkForUpdates, 3000);
});

// 添加手动检查更新的IPC处理器
ipcMain.handle('app:checkUpdate', checkForUpdates);

// 处理开发者控制台窗口
ipcMain.handle('window:openDevConsole', () => {
  const devConsole = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  
  // 创建菜单
  const menu = Menu.buildFromTemplate([
    {
      label: '清除缓存',
      click: async () => {
        await devConsole.webContents.session.clearCache();
        await devConsole.webContents.session.clearStorageData();
        devConsole.reload();  // 重新加载页面
      }
    }
  ]);
  
  // 设置窗口菜单
  devConsole.setMenu(menu);
  
  devConsole.loadURL('https://adofaitools.voin.ink/');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 