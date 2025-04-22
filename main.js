const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron')
const path = require('path')
const https = require('https')
const fs = require('fs')
const AdmZip = require('adm-zip')
const { spawn } = require('child_process');

let mainWindow
let tray = null
const gotTheLock = app.requestSingleInstanceLock()

// 直接从服务器获取JSON数据
async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve(jsonData)
        } catch (error) {
          reject(error)
        }
      })
    }).on('error', reject)
  })
}

// 创建托盘
function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'img', 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '显示主界面', 
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    { 
      label: '退出', 
      click: () => {
        app.exit();
      }
    }
  ]);

  tray.setToolTip('ADOFAI Tools');
  tray.setContextMenu(contextMenu);

  // 点击托盘图标显示主窗口
  tray.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

async function createWindow() {
  if (!gotTheLock) {
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    frame: false, // 无边框
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      plugins: true
    }
  })

  // 移除所有安全策略限制
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Content-Security-Policy': ['*']
      }
    })
  });

  // 加载页面
  mainWindow.loadFile('index.html')
  
  // 通知渲染进程
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('页面加载完成，通知渲染进程')
    mainWindow.webContents.send('tools-json-updated')
  })

  // 处理窗口关闭事件，改为最小化到托盘
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  // 创建托盘
  createTray();
}

// 读取配置文件
let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
} catch (error) {
  config = {
    toolsPath: path.join(require('os').homedir(), 'ADOFAI-Tools'),
    defaultDownloadPath: path.join(require('os').homedir(), 'ADOFAI-Tools')
  };
}

// 确保工具目录存在
if (!fs.existsSync(config.toolsPath)) {
  fs.mkdirSync(config.toolsPath, { recursive: true });
}

// 处理工具下载请求
ipcMain.handle('download-tool', async (event, tool) => {
  const toolDir = path.join(config.toolsPath, tool.id);
  const fileUrl = new URL(tool.downloadUrl);
  const fileName = path.basename(fileUrl.pathname) || 'download.zip';
  const downloadPath = path.join(toolDir, fileName);
  
  // 创建工具目录
  if (!fs.existsSync(toolDir)) {
    fs.mkdirSync(toolDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(downloadPath);
    https.get(tool.downloadUrl, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // 处理重定向
        https.get(response.headers.location, handleResponse);
      } else {
        handleResponse(response);
      }
    }).on('error', reject);

    function handleResponse(response) {
      const total = parseInt(response.headers['content-length'], 10);
      let current = 0;

      response.on('data', (chunk) => {
        current += chunk.length;
        event.sender.send('download-progress', {
          toolId: tool.id,
          progress: (current / total) * 100,
          total,
          current
        });
      });

      response.pipe(file);

      file.on('finish', async () => {
        file.close();

        try {
          // 检查文件是否为ZIP
          if (fileName.toLowerCase().endsWith('.zip')) {
            try {
              const zip = new AdmZip(downloadPath);
              zip.extractAllTo(toolDir, true);
              // 解压成功后删除zip
              fs.unlinkSync(downloadPath);
            } catch (error) {
              console.log('文件不是有效的ZIP格式，保留原始文件');
            }
          }

          // 保存工具信息
          fs.writeFileSync(
            path.join(toolDir, 'info.json'),
            JSON.stringify({
              id: tool.id,
              version: tool.version,
              installDate: new Date().toISOString(),
              fileName: fileName
            })
          );
          
          resolve({
            path: toolDir,
            isWeb: tool.downloadUrl.startsWith('http')
          });
        } catch (error) {
          reject(error);
        }
      });
    }
  });
});

// 检查工具是否已安装
ipcMain.handle('check-tool-installed', (event, toolId) => {
  const toolDir = path.join(config.toolsPath, toolId);
  const infoPath = path.join(toolDir, 'info.json');
  
  try {
    if (fs.existsSync(infoPath)) {
      const info = JSON.parse(fs.readFileSync(infoPath));
      return info;
    }
  } catch (error) {
    console.error('检查工具安装状态失败:', error);
  }
  return null;
});

// 打开目录
ipcMain.handle('open-tool-dir', (event, toolId) => {
  const toolDir = path.join(config.toolsPath, toolId);
  require('electron').shell.openPath(toolDir);
});

// 处理渲染进程请求获取工具列表
ipcMain.handle('get-tools-json', async () => {
  try {
    const data = await fetchJson('https://adofaitools.top/data/tools.json')
    return data.tools || data
  } catch (error) {
    console.error('获取工具列表失败:', error)
    return null
  }
})

// 处理渲染进程请求获取谱面列表
ipcMain.handle('get-down-json', async () => {
  try {
    const data = await fetchJson('https://adofaitools.top/data/down.json')
    return data.downloads || data
  } catch (error) {
    console.error('获取谱面列表失败:', error)
    return null
  }
})

// 修改window-controls事件处理
ipcMain.on('window-controls', (event, action) => {
  switch (action) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      break;
    case 'close':
      mainWindow.hide(); // 改为隐藏窗口而不是关闭
      break;
  }
});

let adminWindow = null;

// 添加IPC事件处理
ipcMain.on('open-admin-console', () => {
    if (adminWindow) {
        adminWindow.focus();
        return;
    }

    // 创建菜单模板
    const menuTemplate = [
        {
            label: '强制刷新',
            click: async () => {
                const choice = await require('electron').dialog.showMessageBox(adminWindow, {
                    type: 'warning',
                    buttons: ['确认', '取消'],
                    title: '确认清除数据',
                    message: '此操作将清除所有应用数据，包括浏览器缓存。确定继续吗？'
                });

                if (choice.response === 0) {  // 用户点击了确认
                    // 清除所有数据
                    await Promise.all([
                        adminWindow.webContents.session.clearCache(),
                        adminWindow.webContents.session.clearStorageData({
                            storages: [
                                'appcache',
                                'cookies',
                                'filesystem',
                                'indexdb',
                                'localstorage',
                                'shadercache',
                                'websql',
                                'serviceworkers',
                                'cachestorage'
                            ]
                        })
                    ]);

                    // 重载窗口
                    adminWindow.reload();
                }
            }
        }
    ];

    // 创建菜单
    const menu = Menu.buildFromTemplate(menuTemplate);

    adminWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: false, // 显示菜单栏
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // 设置菜单
    adminWindow.setMenu(menu);

    adminWindow.loadURL('https://adofaitools.top/');

    adminWindow.on('closed', () => {
        adminWindow = null;
    });
});

// 移除原有的checkForUpdates函数
// 添加新的更新检查逻辑
let updaterWindow = null;

async function checkForUpdates() {
  // 创建更新窗口
  updaterWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  updaterWindow.loadFile('updater.html');

  try {
    const localVersion = JSON.parse(fs.readFileSync(path.join(__dirname, 'version.json')));
    const serverVersion = await fetchJson('https://adofaitools.top/version.json');
    
    if (serverVersion.version > localVersion.version) {
      updaterWindow.webContents.send('update-status', '发现新版本，正在下载...');
      const downloadPath = path.join(app.getPath('temp'), 'ADOFAI-Tools-Update.exe');
      // 下载逻辑...
      updaterWindow.webContents.send('update-downloaded', downloadPath);
    } else {
      updaterWindow.webContents.send('update-status', '已是最新版本');
      // 延迟3秒后关闭更新窗口并显示主窗口
      setTimeout(() => {
        updaterWindow.close();
        initializeApp();
      }, 3000);
    }
  } catch (error) {
    console.error('检查更新失败:', error);
    updaterWindow.webContents.send('update-status', '检查更新失败，正在启动程序...');
    setTimeout(() => {
      updaterWindow.close();
      initializeApp();
    }, 3000);
  }
}

// 修改启动逻辑
app.whenReady().then(() => {
  if (!process.argv.includes('--skip-update-check')) {
    checkForUpdates();
  } else {
    initializeApp();
  }
});

// 修改IPC事件处理
ipcMain.on('install-update', (event, filePath) => {
  spawn(filePath, [], {
    detached: true,
    stdio: 'ignore'
  }).unref();
  app.quit();
});

// 移动 app.whenReady() 的内容到新函数
function initializeApp() {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
}

// 处理第二个实例启动
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// 添加退出前的清理
app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})