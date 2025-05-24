import { app, BrowserWindow, ipcMain, shell, Tray, Menu, dialog } from 'electron';
import path from 'path';
import axios from 'axios';
import * as fs from 'fs';
import os from 'os';
import AdmZip from 'adm-zip';

let mainWindow = null
let updateWindow = null
let tray = null
let isQuiting = false

// 确保只运行一个实例
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // 当运行第二个实例时，聚焦到主窗口
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
        }
    })
}

// 创建托盘图标
function createTray() {
    const iconPath = process.platform === 'darwin' 
        ? path.join(app.getAppPath(), 'assets', 'img', 'icon-mac.png')
        : path.join(app.getAppPath(), 'assets', 'img', 'icon.png')
    
    tray = new Tray(iconPath)
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Main Window',
            click: () => {
                mainWindow.show()
                mainWindow.focus()
            }
        },
        {
            label: 'Exit',
            click: () => {
                isQuiting = true
                app.quit()
            }
        }
    ])

    tray.setToolTip('ADOFAI Tools')
    tray.setContextMenu(contextMenu)

    // 点击托盘图标显示主窗口
    tray.on('click', () => {
        mainWindow.show()
        mainWindow.focus()
    })
}

// 获取工具存储路径
function getToolsPath() {
  const platform = process.platform
  if (platform === 'darwin') {
    // macOS: 应用程序文件夹
    return path.join('/Applications', 'ADOFAI Tools')
  } else if (platform === 'win32') {
    // Windows: 优先使用D盘，没有则使用C盘
    const dDrivePath = 'D:\\ADOFAI Tools'
    const cDrivePath = 'C:\\ADOFAI Tools'
    
    try {
      // 检查D盘是否存在且可写
      fs.accessSync('D:\\', fs.constants.W_OK)
      return dDrivePath
    } catch (err) {
      return cDrivePath
    }
  }
}

// 确保工具目录存在
function ensureToolDirectory(toolId) {
  const toolsPath = getToolsPath()
  const toolPath = path.join(toolsPath, toolId)
  
  try {
    if (!fs.existsSync(toolsPath)) {
      fs.mkdirSync(toolsPath, { recursive: true })
    }
    if (!fs.existsSync(toolPath)) {
      fs.mkdirSync(toolPath)
    }
    return toolPath
  } catch (err) {
    console.error('创建工具目录失败:', err)
    throw err
  }
}

// 保存工具信息
function saveToolInfo(toolId, version, downloadDate) {
  const toolPath = path.join(getToolsPath(), toolId)
  const infoPath = path.join(toolPath, 'info.json')
  
  const info = {
    version,
    downloadDate,
    toolId
  }
  
  fs.writeFileSync(infoPath, JSON.stringify(info, null, 2))
}

// 获取工具信息
function getToolInfo(toolId) {
  try {
    const toolPath = path.join(getToolsPath(), toolId)
    const infoPath = path.join(toolPath, 'info.json')
    
    if (fs.existsSync(infoPath)) {
      const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'))
      return info
    }
    return null
  } catch (err) {
    console.error('读取工具信息失败:', err)
    return null
  }
}

// 解压工具
async function extractTool(toolPath, zipPath) {
  try {
    const zip = new AdmZip(zipPath)
    zip.extractAllTo(toolPath, true)
    
    // 解压完成后删除 zip 文件
    fs.unlinkSync(zipPath)
    return true
  } catch (err) {
    console.error('解压工具失败:', err)
    return false
  }
}

// 打开工具目录
function openToolDirectory(toolId) {
  try {
    const toolPath = path.join(getToolsPath(), toolId)
    if (fs.existsSync(toolPath)) {
      shell.openPath(toolPath)
      return true
    }
    return false
  } catch (err) {
    console.error('打开工具目录失败:', err)
    return false
  }
}

// 下载工具
async function downloadTool(toolId, url, version) {
  try {
    const toolPath = ensureToolDirectory(toolId)
    
    // 从 URL 中获取文件扩展名
    const fileExt = url.split('.').pop().toLowerCase()
    const isZip = fileExt === 'zip'
    
    // 根据文件类型决定保存的文件名
    const fileName = isZip ? 'tool.zip' : `tool.${fileExt}`
    const filePath = path.join(toolPath, fileName)
    
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    })

    const totalLength = response.headers['content-length']
    let downloadedLength = 0

    const writer = fs.createWriteStream(filePath)

    response.data.on('data', (chunk) => {
      downloadedLength += chunk.length
      const progress = Math.round((downloadedLength * 100) / totalLength)
      mainWindow.webContents.send('download-progress', { toolId, progress })
    })

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
      response.data.pipe(writer)
    })

    // 只有 ZIP 文件才需要解压
    if (isZip) {
      await extractTool(toolPath, filePath)
    }

    // 保存工具信息
    saveToolInfo(toolId, version, new Date().toISOString())
    
    mainWindow.webContents.send('download-complete', { toolId })
    return true
  } catch (err) {
    console.error('下载工具失败:', err)
    mainWindow.webContents.send('download-error', { toolId, error: err.message })
    return false
  }
}

// 删除工具
function deleteTool(toolId) {
  try {
    const toolPath = path.join(getToolsPath(), toolId)
    if (fs.existsSync(toolPath)) {
      fs.rmSync(toolPath, { recursive: true, force: true })
    }
    return true
  } catch (err) {
    console.error('删除工具失败:', err)
    return false
  }
}

// 注册IPC处理程序
ipcMain.handle('get-tool-info', async (event, toolId) => {
  return getToolInfo(toolId)
})

ipcMain.handle('download-tool', async (event, { toolId, url, version }) => {
  return downloadTool(toolId, url, version)
})

ipcMain.handle('delete-tool', async (event, toolId) => {
  return deleteTool(toolId)
})

ipcMain.handle('open-tool-directory', async (event, toolId) => {
  return openToolDirectory(toolId)
})

// 处理清除缓存请求
ipcMain.on('clear-cache', async (event) => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) {
    // 清除所有类型的缓存数据
    await win.webContents.session.clearCache()
    await win.webContents.session.clearStorageData({
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
    
    // 重启应用
    app.relaunch({ args: process.argv.slice(1).concat(['--restart']) })
    app.exit(0)
  }
})

function createUpdateWindow() {
  updateWindow = new BrowserWindow({
    width: 800,
    height: 500,
    icon: path.join(path.dirname('.'), 'assets', 'img', 'icon.png'),
    frame: false,
    resizable: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  })

  updateWindow.loadFile('update.html')
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    frame: false,
    icon: path.join(path.dirname('.'), 'assets', 'img', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      webSecurity: false, // 允许加载外部资源
      allowRunningInsecureContent: true, // 允许运行不安全内容
      experimentalFeatures: true // 启用实验性功能
    }
  })

  mainWindow.loadFile('pages/shouye.html')

  // 处理窗口关闭事件
  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  // 处理所有webview的新窗口和下载
  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
      // 处理新窗口打开
      contents.setWindowOpenHandler((details) => {
        contents.loadURL(details.url);
        return { action: 'deny' };
      });

      // 防止重复监听下载事件
      if (contents.session.listenerCount('will-download') > 0) {
        return;
      }

      // WebViewer的普通下载处理
      contents.session.on('will-download', (event, item, webContents) => {
        // 获取文件名
        const fileName = item.getFilename();
        
        // 让用户选择保存位置
        const filePath = dialog.showSaveDialogSync({
          defaultPath: fileName
        });

        if (filePath) {
          // 设置保存路径
          item.setSavePath(filePath);

          // 监听下载进度
          item.on('updated', (event, state) => {
            if (state === 'progressing' && !item.isPaused()) {
              const progress = item.getReceivedBytes() / item.getTotalBytes() * 100;
              // 发送WebViewer专用的下载进度消息
              BrowserWindow.getAllWindows().forEach(win => {
                if (!win.isDestroyed()) {
                  win.webContents.send('webviewer-download-progress', {
                    progress: progress,
                    state: 'progressing',
                    fileName: fileName
                  });
                }
              });
            }
          });

          // 下载完成
          item.on('done', (event, state) => {
            BrowserWindow.getAllWindows().forEach(win => {
              if (!win.isDestroyed()) {
                win.webContents.send('webviewer-download-progress', {
                  progress: 100,
                  state: state,
                  fileName: fileName
                });
              }
            });
          });
        } else {
          // 如果用户取消选择保存位置，取消下载
          item.cancel();
        }
      });
    }
  });
}

async function checkUpdate() {
  try {
    const response = await axios.get('https://adofaitools.top/api/check_update.php')
    const currentVersion = app.getVersion()
    
    if (response.data.version > currentVersion) {
      updateWindow.webContents.send('update-available', response.data)
    } else {
      updateWindow.webContents.send('no-update')
    }
  } catch (error) {
    console.error('更新检查失败:', error)
    updateWindow.webContents.send('no-update')
  }
}

// 窗口控制处理
ipcMain.on('window-control', (event, command) => {
  const window = BrowserWindow.getFocusedWindow()
  if (!window) return

  switch (command) {
    case 'minimize':
      window.minimize()
      break
    case 'maximize':
      if (window.isMaximized()) {
        window.unmaximize()
      } else {
        window.maximize()
      }
      break
    case 'close':
      window.hide()
      break
  }
})

// 修改启动逻辑
app.whenReady().then(() => {
  // 检查是否是从托盘图标启动
  const isRestart = process.argv.includes('--restart')
  
  if (!isRestart) {
    createUpdateWindow()
  } else {
    createMainWindow()
  }
  
  createTray()
})

ipcMain.on('check-update', () => {
  checkUpdate()
})

ipcMain.on('load-main-window', () => {
  createMainWindow()
  updateWindow.close()
})

ipcMain.on('open-download-url', (event, url) => {
  // 检查url是否是一个对象（包含win和mac链接）
  if (typeof url === 'object' && url !== null) {
    const platform = process.platform
    const downloadUrl = platform === 'darwin' ? url.mac : url.win
    if (downloadUrl) {
      shell.openExternal(downloadUrl)
      app.quit()
    } else {
      console.error(`没有找到${platform}平台的下载链接`)
    }
  } else {
    // 向后兼容：如果url是字符串，直接打开
    shell.openExternal(url)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuiting = true
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow()
  } else {
    mainWindow.show()
  }
}) 