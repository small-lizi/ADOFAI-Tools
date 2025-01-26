document.addEventListener('DOMContentLoaded', () => {
  const webview = document.getElementById('content-webview');
  const sidebarItems = document.querySelectorAll('.sidebar-item');

  // 初始化加载第一个页面
  if (webview && sidebarItems.length > 0) {
    const firstItem = sidebarItems[0];
    const url = firstItem.dataset.url;
    webview.src = url;
  }

  // 处理侧边栏点击事件
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      // 更新激活状态
      sidebarItems.forEach(btn => btn.classList.remove('active'));
      item.classList.add('active');
      
      // 加载对应的网页
      const url = item.dataset.url;
      if (url) {
        webview.src = url;
      }
    });
  });
}); 