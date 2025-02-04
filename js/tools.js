const { ipcRenderer } = require('electron');
const { shell } = require('electron');

document.addEventListener('DOMContentLoaded', async () => {
  // 同步工具数据
  const toolsData = await ipcRenderer.invoke('tools:sync');
  
  // 获取DOM元素
  const toolsList = document.querySelector('.tools-list');
  const toolIcon = document.querySelector('.tool-icon');
  const toolName = document.querySelector('.tool-name');
  const toolDescription = document.querySelector('.tool-description');
  const authorAvatar = document.querySelector('.author-avatar');
  const authorName = document.querySelector('.author-name');
  const downloadBtn = document.querySelector('.download-btn');
  const openBtn = document.querySelector('.open-btn');
  const searchInput = document.querySelector('.search-box input');
  const toolDocs = document.querySelector('#tool-docs');
  
  let currentTool = null;
  let isToolInstalled = false;

  // 添加一个变量来跟踪正在下载的工具
  let downloadingTools = new Map(); // 存储正在下载的工具ID和其下载进度

  // 添加一个函数来获取最新的工具数据
  async function getLatestToolData(toolId) {
    try {
      const response = await fetch('https://adofaitools.top/data/tools.json');
      const data = await response.json();
      return data.tools.find(tool => tool.id === toolId);
    } catch (error) {
      console.error('Failed to get latest tool data:', error);
      return null;
    }
  }

  // 修改显示工具信息的函数
  async function showToolInfo(tool) {
    // 获取最新的工具数据
    const latestTool = await getLatestToolData(tool.id);
    if (latestTool) {
      tool = latestTool;  // 使用最新的数据
    }

    currentTool = tool;
    toolIcon.src = tool.icon;
    toolName.textContent = tool.name;
    toolDescription.textContent = tool.description;
    toolDescription.title = tool.description;
    authorAvatar.src = tool.author.avatar;
    authorName.textContent = tool.author.name;
    document.querySelector('.download-count .count').textContent = tool.downloads || 0;
    if (tool.author.link) {
      authorName.href = tool.author.link;
      authorName.style.cursor = 'pointer';
    } else {
      authorName.href = '#';
      authorName.style.cursor = 'default';
    }
    
    // 重置导航按钮状态
    document.querySelectorAll('.tool-nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector('.tool-nav-btn[data-view="home"]').classList.add('active');
    
    // 显示文档
    toolDocs.src = tool.documentation;

    // 检查工具版本和下载状态
    const versionInfo = await ipcRenderer.invoke('tools:checkVersion', tool.id);
    isToolInstalled = versionInfo.installed;
    
    // 更新按钮状态
    openBtn.disabled = !isToolInstalled;
    
    // 检查该工具是否正在下载
    if (downloadingTools.has(tool.id)) {
        const progress = downloadingTools.get(tool.id);
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = `<span class="icon-download"></span>下载中 ${progress}%`;
    } else if (isToolInstalled) {
        if (versionInfo.version !== tool.version) {
            downloadBtn.innerHTML = '<span class="icon-download"></span>更新';
            downloadBtn.classList.add('update');
            downloadBtn.disabled = false;
        } else {
            downloadBtn.innerHTML = '<span class="icon-download"></span>已安装';
            downloadBtn.disabled = true;
            downloadBtn.classList.remove('update');
        }
    } else {
        downloadBtn.innerHTML = '<span class="icon-download"></span>下载';
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('update');
    }
  }

  // 渲染工具列表
  function renderToolsList(tools) {
    toolsList.innerHTML = '';
    tools.forEach(tool => {
      const toolItem = document.createElement('div');
      toolItem.className = 'tool-item';
      toolItem.innerHTML = `
        <img src="${tool.icon}" alt="${tool.name}">
        <span>${tool.name}</span>
      `;
      toolItem.addEventListener('click', () => {
        document.querySelectorAll('.tool-item').forEach(item => {
          item.classList.remove('active');
        });
        toolItem.classList.add('active');
        showToolInfo(tool);
      });
      toolsList.appendChild(toolItem);
    });
    
    // 默认显示第一个工具
    if (tools.length > 0) {
      toolsList.firstChild.classList.add('active');
      showToolInfo(tools[0]);
    }
  }

  // 搜索功能
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredTools = toolsData.tools.filter(tool => 
      tool.name.toLowerCase().includes(searchTerm) ||
      tool.description.toLowerCase().includes(searchTerm)
    );
    renderToolsList(filteredTools);
  });

  // 下载按钮点击事件
  downloadBtn.addEventListener('click', async () => {
    if (currentTool) {
      downloadBtn.disabled = true;
      const isUpdate = downloadBtn.classList.contains('update');
      downloadBtn.innerHTML = `<span class="icon-download"></span>${isUpdate ? '更新中...' : '下载中...'}`;
      
      try {
        // 更新下载次数
        const response = await fetch('https://adofaitools.top/api/update_downloads.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            toolId: currentTool.id
          })
        });
        
        const result = await response.json();
        if (result.success) {
          // 更新显示的下载次数
          document.querySelector('.download-count .count').textContent = result.downloads;
          // 更新当前工具的下载次数
          currentTool.downloads = result.downloads;
        }

        // 继续原有的下载逻辑
        const downloadResult = await ipcRenderer.invoke('tools:download', { 
          url: currentTool.downloadUrl,
          toolId: currentTool.id,
          version: currentTool.version
        });
        if (!downloadResult.success) {
          // 下载失败时移除下载状态
          downloadingTools.delete(currentTool.id);
          downloadBtn.innerHTML = `<span class="icon-download"></span>${isUpdate ? '更新失败' : '下载失败'}`;
          setTimeout(() => {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = `<span class="icon-download"></span>${isUpdate ? '更新' : '下载'}`;
          }, 2000);
        }
      } catch (error) {
        console.error('Download error:', error);
        // 发生错误时也移除下载状态
        downloadingTools.delete(currentTool.id);
        downloadBtn.innerHTML = `<span class="icon-download"></span>${isUpdate ? '更新失败' : '下载失败'}`;
        setTimeout(() => {
          downloadBtn.disabled = false;
          downloadBtn.innerHTML = `<span class="icon-download"></span>${isUpdate ? '更新' : '下载'}`;
        }, 2000);
      }
    }
  });

  // 打开按钮点击事件
  openBtn.addEventListener('click', async () => {
    if (currentTool) {
      await ipcRenderer.invoke('tools:openFolder', currentTool.id);
    }
  });

  // 添加作者链接点击事件
  document.querySelector('.author-name').addEventListener('click', (e) => {
    e.preventDefault();
    if (currentTool && currentTool.author.link) {
      shell.openExternal(currentTool.author.link);
    }
  });

  // 修改下载进度监听
  ipcRenderer.on('download:progress', (event, { toolId, percent }) => {
    if (toolId) {  // 确保有 toolId
      downloadingTools.set(toolId, Math.round(percent));
      // 只有当前显示的工具正在下载时才更新按钮
      if (currentTool && currentTool.id === toolId) {
        downloadBtn.disabled = true;  // 确保按钮保持禁用状态
        downloadBtn.innerHTML = `<span class="icon-download"></span>下载中 ${Math.round(percent)}%`;
      }
    }
  });

  // 修改下载完成监听
  ipcRenderer.on('download:complete', async (event, { toolId, success, isExe }) => {
    if (!toolId) return;  // 确保有 toolId
    
    // 移除下载状态
    downloadingTools.delete(toolId);
    
    if (currentTool && currentTool.id === toolId) {
      if (success) {
        downloadBtn.innerHTML = '<span class="icon-download"></span>下载完成';
        // 重新检查工具版本状态
        const versionInfo = await ipcRenderer.invoke('tools:checkVersion', currentTool.id);
        isToolInstalled = versionInfo.installed;
        openBtn.disabled = !isToolInstalled;
        
        if (isToolInstalled) {
          setTimeout(() => {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<span class="icon-download"></span>已安装';
            downloadBtn.classList.remove('update');
          }, isExe ? 0 : 2000);
        }
      } else {
        downloadBtn.innerHTML = '<span class="icon-download"></span>下载失败';
        setTimeout(() => {
          downloadBtn.disabled = false;
          downloadBtn.innerHTML = '<span class="icon-download"></span>下载';
        }, 2000);
      }
    }
  });

  // 添加导航按钮点击事件
  document.querySelectorAll('.tool-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      
      // 更新按钮状态
      document.querySelectorAll('.tool-nav-btn').forEach(b => {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      
      // 切换显示内容
      if (view === 'home') {
        toolDocs.src = currentTool.documentation;
      } else if (view === 'changelog') {
        // 创建一个HTML页面来显示更新日志
        const changelogContent = currentTool.changelog || '暂无更新日志';
        const changelogHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  padding: 20px;
                  white-space: pre-wrap;
                }
                h1 {
                  color: #333;
                  border-bottom: 1px solid #eee;
                  padding-bottom: 10px;
                }
                .no-changelog {
                  color: #666;
                  font-style: italic;
                  text-align: center;
                  margin-top: 40px;
                }
              </style>
            </head>
            <body>
              <h1>更新日志</h1>
              <div class="${currentTool.changelog ? '' : 'no-changelog'}">
                ${changelogContent}
              </div>
            </body>
          </html>
        `;
        toolDocs.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(changelogHtml)}`);
      }
    });
  });

  // 初始渲染工具列表
  renderToolsList(toolsData.tools);
}); 