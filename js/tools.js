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

  // 显示工具信息
  async function showToolInfo(tool) {
    currentTool = tool;
    toolIcon.src = tool.icon;
    toolName.textContent = tool.name;
    toolDescription.textContent = tool.description;
    authorAvatar.src = tool.author.avatar;
    authorName.textContent = tool.author.name;
    if (tool.author.link) {
      authorName.href = tool.author.link;
      authorName.style.cursor = 'pointer';
    } else {
      authorName.href = '#';
      authorName.style.cursor = 'default';
    }
    toolDocs.src = tool.documentation;

    // 检查工具版本
    const versionInfo = await ipcRenderer.invoke('tools:checkVersion', tool.id);
    isToolInstalled = versionInfo.installed;
    
    // 更新按钮状态
    openBtn.disabled = !isToolInstalled;
    if (isToolInstalled) {
      if (versionInfo.version !== tool.version) {
        downloadBtn.innerHTML = '<span class="icon-download"></span>更新';
        downloadBtn.classList.add('update');
      } else {
        downloadBtn.innerHTML = '<span class="icon-download"></span>已安装';
        downloadBtn.disabled = true;
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
        const result = await ipcRenderer.invoke('tools:download', { 
          url: currentTool.downloadUrl,
          toolId: currentTool.id,
          version: currentTool.version
        });
        if (result.success) {
          downloadBtn.innerHTML = `<span class="icon-download"></span>${isUpdate ? '更新中...' : '下载中...'}`;
        } else {
          downloadBtn.innerHTML = `<span class="icon-download"></span>${isUpdate ? '更新失败' : '下载失败'}`;
          setTimeout(() => {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = `<span class="icon-download"></span>${isUpdate ? '更新' : '下载'}`;
          }, 2000);
        }
      } catch (error) {
        console.error('Download error:', error);
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

  // 添加下载进度监听
  ipcRenderer.on('download:progress', (event, { percent }) => {
    if (downloadBtn) {
      downloadBtn.innerHTML = `<span class="icon-download"></span>下载中 ${Math.round(percent)}%`;
    }
  });

  // 添加下载完成监听
  ipcRenderer.on('download:complete', async (event, { success, isExe }) => {
    if (downloadBtn) {
      if (success) {
        downloadBtn.innerHTML = '<span class="icon-download"></span>下载完成';
        // 重新检查工具版本状态
        if (currentTool) {
          const versionInfo = await ipcRenderer.invoke('tools:checkVersion', currentTool.id);
          isToolInstalled = versionInfo.installed;
          openBtn.disabled = !isToolInstalled;
          
          if (isToolInstalled) {
            setTimeout(() => {
              downloadBtn.disabled = true;
              downloadBtn.innerHTML = '<span class="icon-download"></span>已安装';
              downloadBtn.classList.remove('update');
            }, isExe ? 0 : 2000);  // exe文件立即更新状态
          }
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

  // 初始渲染工具列表
  renderToolsList(toolsData.tools);
}); 