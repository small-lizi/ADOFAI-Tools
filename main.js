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
    const response = await fetch('https://adofaitools.top/data/tools.json');
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

    // 添加清理旧文件的函数
    const cleanOldFiles = (dirPath) => {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const curPath = path.join(dirPath, file);
          if (fs.lstatSync(curPath).isDirectory()) {
            // 递归清理子目录
            cleanOldFiles(curPath);
            fs.rmdirSync(curPath);
          } else {
            // 删除文件，但保留version.json
            if (file !== 'version.json') {
              fs.unlinkSync(curPath);
            }
          }
        }
      }
    };
  
    // 为工具下载创建一个新的 will-download 处理函数
    const handleToolDownload = (event, item, webContents) => {
      const fileName = path.basename(url);
      const toolsDir = path.join(app.getPath('exe'), '../tools');
      const toolDir = path.join(toolsDir, toolId);
      const filePath = path.join(toolDir, fileName);
      const fileExt = path.extname(fileName).toLowerCase();
  
      if (!fs.existsSync(toolDir)) {
        fs.mkdirSync(toolDir, { recursive: true });
      } else {
        // 在下载新版本前清理旧文件
        cleanOldFiles(toolDir);
      }
  
      item.setSavePath(filePath);
    
      item.on('updated', (event, state) => {
        if (state === 'progressing') {
          const progress = item.getReceivedBytes() / item.getTotalBytes();
          win.webContents.send('download:progress', { 
            toolId: toolId,
            percent: progress * 100 
          });
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
              win.webContents.send('download:complete', { 
                toolId: toolId,
                success: true,
                isExe: true 
              });
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
            win.webContents.send('download:complete', { 
              toolId: toolId,
              success: true,
              isExe: false
            });
          } catch (error) {
            console.error('Post-download processing error:', error);
            win.webContents.send('download:complete', { 
              toolId: toolId,
              success: false, 
              error: (fileExt === '.zip' || fileExt === '.rar') ? '解压失败' : '处理文件失败'
            });
          }
        } else {
          win.webContents.send('download:complete', { 
            toolId: toolId,
            success: false 
          });
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

// 添加资源更新检查函数
async function checkForAsarUpdate() {
  try {
    // 读取本地版本
    const localVersionPath = path.join(__dirname, 'version.json');
    const localVersionData = JSON.parse(fs.readFileSync(localVersionPath, 'utf8'));
    
    // 获取服务器版本
    const response = await fetch('https://adofaitools.top/version.json');
    const serverData = await response.json();
    
    // 比较版本
    if (serverData.asarVersion && serverData.asarVersion !== localVersionData.asarVersion) {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return;
      
      // 通知渲染进程开始更新
      win.webContents.send('asar:updateStart');
      
      try {
        // 下载新的asar文件
        const asarResponse = await fetch(serverData.asarUrl);
        if (!asarResponse.ok) throw new Error('Download failed');
        
        const buffer = await asarResponse.buffer();
        const tmpPath = path.join(app.getPath('exe'), '../app.asar.tmp');
        fs.writeFileSync(tmpPath, buffer);
        
        // 通知渲染进程更新完成，准备重启
        win.webContents.send('asar:updateReady');
        
        // 等待一小段时间让用户看到提示
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 运行更新脚本
        const scriptPath = path.join(app.getPath('exe'), '../asar_update.bat');
        require('child_process').spawn(scriptPath, [], {
          detached: true,
          stdio: 'ignore'
        });
        
        // 退出当前程序
        app.quit();
      } catch (error) {
        console.error('Asar update error:', error);
        win.webContents.send('asar:updateError', error.message);
      }
    }
  } catch (error) {
    console.error('Check asar update error:', error);
  }
}

// 修改现有的 checkForUpdates 函数，使其与资源更新共存
async function checkForUpdates() {
  try {
    const response = await fetch('https://adofaitools.top/version.json');
    const data = await response.json();
    const currentVersion = app.getVersion();
    
    // 版本比较逻辑保持不变
    const serverVersion = data.version.split('.').map(Number);
    const localVersion = currentVersion.split('.').map(Number);
    
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
        // 下载安装包
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return;

        // 创建下载进度对话框
        const progressResult = await dialog.showMessageBox({
          type: 'info',
          title: '正在下载更新',
          message: '正在下载更新安装包，下载完成后将自动安装。',
          buttons: ['确定']
        });

        try {
          // 下载安装包
          const setupResponse = await fetch(data.downloadUrl);
          if (!setupResponse.ok) throw new Error('Download failed');
          
          const buffer = await setupResponse.buffer();
          
          // 保存到临时目录
          const setupPath = path.join(app.getPath('temp'), 'ADOFAI-Tools-Setup.exe');
          fs.writeFileSync(setupPath, buffer);
          
          // 提示用户即将安装
          const installResult = await dialog.showMessageBox({
            type: 'info',
            title: '下载完成',
            message: '更新包下载完成，点击确定将关闭程序并开始安装。',
            buttons: ['确定', '取消'],
            defaultId: 0
          });
          
          if (installResult.response === 0) {
            // 运行安装程序并退出当前程序
            require('child_process').spawn(setupPath, [], {
              detached: true,
              stdio: 'ignore'
            });
            app.quit();
          }
        } catch (error) {
          console.error('Download setup error:', error);
          dialog.showErrorBox('更新失败', '下载安装包时出现错误，请稍后重试。');
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
  // 延迟执行更新检查
  setTimeout(() => {
    checkForUpdates();
    checkForAsarUpdate();
  }, 3000);
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
  
  devConsole.loadURL('https://adofaitools.top/');
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