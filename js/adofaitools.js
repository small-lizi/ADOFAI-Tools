document.addEventListener('DOMContentLoaded', () => {
  const navButtons = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page-container');
  
  // 默认显示工具页面
  showPage('tools');
  
  // 导航按钮点击事件
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const pageId = button.dataset.page;
      showPage(pageId);
    });
  });
  
  // 显示指定页面的函数
  function showPage(pageId) {
    // 更新按钮状态
    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    
    // 更新页面显示
    pages.forEach(page => {
      if (page.id === pageId + '-page') {
        page.style.display = 'block';
        // 添加一个小延迟后添加active类，实现淡入效果
        setTimeout(() => {
          page.classList.add('active');
        }, 10);
      } else {
        page.style.display = 'none';
        page.classList.remove('active');
      }
    });
  }
}); 