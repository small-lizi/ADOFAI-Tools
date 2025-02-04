// 加载下载页面数据
async function loadDownloadItems() {
  try {
    const response = await fetch('https://adofaitools.top/data/down.json');
    const data = await response.json();
    
    const sidebarMenu = document.querySelector('#download-page .sidebar-menu');
    sidebarMenu.innerHTML = data.downloads.map(item => `
      <button class="sidebar-item" data-url="${item.url}">
        <img src="${item.icon}" alt="${item.name}" class="sidebar-icon">
        <span>${item.name}</span>
      </button>
    `).join('');

    // 初始化第一个下载项
    const firstItem = sidebarMenu.querySelector('.sidebar-item');
    if (firstItem) {
      firstItem.click();
    }
  } catch (error) {
    console.error('Load download items error:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const downloadPage = document.getElementById('download-page');
  const contentWebview = document.getElementById('content-webview');

  // 监听下载页面的显示状态
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        if (downloadPage.style.display !== 'none') {
          loadDownloadItems();
        }
      }
    });
  });

  observer.observe(downloadPage, {
    attributes: true
  });

  // 处理侧边栏点击事件（事件委托）
  document.querySelector('#download-page .sidebar-menu').addEventListener('click', (e) => {
    const item = e.target.closest('.sidebar-item');
    if (!item) return;

    // 更新激活状态
    const allItems = downloadPage.querySelectorAll('.sidebar-item');
    allItems.forEach(btn => btn.classList.remove('active'));
    item.classList.add('active');
    
    // 加载对应的网页
    const url = item.dataset.url;
    if (url) {
      contentWebview.src = url;
    }
  });
}); 