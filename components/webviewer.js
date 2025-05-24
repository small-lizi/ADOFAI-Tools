import languageProperties from '../i18n/prop.js'
let curlang = languageProperties.getlang();

class WebViewer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        // 创建音频元素
        this.openSound = new Audio('../assets/audio/sndMenuStonePanelOpen.ogg');
        this.closeSound = new Audio('../assets/audio/sndMenuStonePanelClose.ogg');
    }

    static get observedAttributes() {
        return ['url', 'no-cache', 'tool-id', 'show-comments'];
    }

    connectedCallback() {
        this.checkAndClearCache();
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if ((name === 'url' && oldValue !== newValue) || 
            (name === 'no-cache' && oldValue !== newValue) ||
            (name === 'tool-id' && oldValue !== newValue) ||
            (name === 'show-comments' && oldValue !== newValue)) {
            this.render();
        }
    }

    // 检查并清除缓存
    async checkAndClearCache() {
        const lastClearTime = localStorage.getItem('webviewer-last-clear-cache');
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        if (!lastClearTime || parseInt(lastClearTime) < today) {
            const webview = this.shadowRoot.querySelector('webview');
            if (webview) {
                try {
                    await webview.clearCache();
                    const session = webview.getWebContents().session;
                    await session.clearCache();
                    await session.clearStorageData({
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
                    });
                    localStorage.setItem('webviewer-last-clear-cache', today.toString());
                    console.log('WebViewer 缓存已自动清除');
                } catch (error) {
                    console.error('清除缓存时发生错误:', error);
                }
            }
        }
    }

    render() {
        const url = this.getAttribute('url') || '';
        const toolId = this.getAttribute('tool-id') || '';
        const noCache = this.hasAttribute('no-cache');
        const showComments = this.hasAttribute('show-comments');
        const partition = noCache ? `no-cache-${Date.now()}` : 'persist:main';
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                    position: relative;
                }

                .container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                }

                .webview-container {
                    flex: 1;
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                }

                webview {
                    width: 100%;
                    height: 100%;
                    border: none;
                    background-color: #ffffff;
                }

                .loading {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    background-color: rgba(26, 26, 26, 0.8);
                    color: #ffffff;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    backdrop-filter: blur(4px);
                    transition: opacity 0.3s ease;
                    opacity: 0;
                    pointer-events: none;
                }

                .loading.visible {
                    opacity: 1;
                }

                /* 下载进度指示器样式 */
                .download-progress {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background-color: rgba(26, 26, 26, 0.8);
                    color: #ffffff;
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    backdrop-filter: blur(4px);
                    transition: opacity 0.3s ease;
                    opacity: 0;
                    pointer-events: none;
                    z-index: 1000;
                    max-width: 300px;
                }

                .download-progress.visible {
                    opacity: 1;
                }

                .download-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }

                .download-name {
                    margin-right: 12px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .download-percent {
                    margin-left: 12px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .progress-bar {
                    width: 100%;
                    height: 4px;
                    background-color: rgba(255, 255, 255, 0.2);
                    border-radius: 2px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background-color: #4CAF50;
                    transition: width 0.3s ease;
                    width: 0;
                }

                /* 评论区样式 */
                .comments-section {
                    width: 36px;
                    height: 100%;
                    position: relative;
                    flex-shrink: 0;
                    display: ${showComments ? 'block' : 'none'};
                }

                .comments-toggle {
                    width: 100%;
                    height: 100%;
                    writing-mode: vertical-lr;
                    padding: 16px 8px;
                    background:rgb(0, 0, 0);
                    border: none;
                    border-left: 1px solidrgb(0, 0, 0);
                    color: #666666;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: background-color 0.2s;
                }

                .comments-toggle:hover {
                    background:rgb(0, 0, 0);
                }

                .comments-toggle svg {
                    width: 16px;
                    height: 16px;
                    fill: currentColor;
                    transform: rotate(90deg);
                }

                .comments-drawer {
                    position: absolute;
                    right: 100%;
                    top: 0;
                    width: 380px;
                    height: 100%;
                    background: #ffffff;
                    border-left: 1px solid #e5e5e5;
                    transform: translateX(100%);
                    transition: all 0.3s ease;
                    opacity: 0;
                    visibility: hidden;
                }

                .comments-drawer.open {
                    transform: translateX(0);
                    opacity: 1;
                    visibility: visible;
                }

                .comments-iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                }
            </style>
            <div class="container">
                <div class="webview-container">
                    <webview src="${url}" 
                        nodeintegration 
                        allowpopups 
                        webpreferences="contextIsolation=false, nodeIntegration=true"
                        partition="${partition}"
                        backgroundColor="#ffffff">
                    </webview>
                    <div class="loading">${languageProperties[curlang].main['loading']}</div>
                    <div class="download-progress">
                        <div class="download-info">
                            <span class="download-name"></span>
                            <span class="download-percent">0%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                </div>
                ${showComments ? `
                <div class="comments-section">
                    <button class="comments-toggle" id="commentsToggle">
                        <svg viewBox="0 0 24 24">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                        </svg>
                        评论区
                    </button>
                    <div class="comments-drawer" id="commentsDrawer">
                        <iframe class="comments-iframe" src="https://adofaitools.top/comments/index.php?id=${toolId}"></iframe>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        const webview = this.shadowRoot.querySelector('webview');
        const loading = this.shadowRoot.querySelector('.loading');
        const downloadProgress = this.shadowRoot.querySelector('.download-progress');
        const downloadName = downloadProgress.querySelector('.download-name');
        const downloadPercent = downloadProgress.querySelector('.download-percent');
        const progressFill = downloadProgress.querySelector('.progress-fill');
        const commentsToggle = this.shadowRoot.querySelector('#commentsToggle');
        const commentsDrawer = this.shadowRoot.querySelector('#commentsDrawer');
        const { shell } = require('electron');
        const { ipcRenderer } = require('electron');

        // 监听WebViewer专用的下载进度
        ipcRenderer.on('webviewer-download-progress', (event, data) => {
            // 确保进度条可见
            downloadProgress.classList.add('visible');
            downloadName.textContent = data.fileName;
            
            // 更新进度
            const percent = Math.round(data.progress);
            progressFill.style.width = `${percent}%`;
            downloadPercent.textContent = `${percent}%`;

            // 处理下载状态
            if (data.state === 'completed') {
                // 下载完成后延迟隐藏进度条
                setTimeout(() => {
                    downloadProgress.classList.remove('visible');
                    progressFill.style.width = '0';
                }, 3000);
            } else if (data.state === 'cancelled' || data.state === 'interrupted') {
                // 下载取消或中断时立即隐藏进度条
                downloadProgress.classList.remove('visible');
                progressFill.style.width = '0';
                downloadName.textContent = `${data.fileName} - ${data.state === 'cancelled' ? 'Canceled.' : 'Paused.'}`;
            }
        });

        // 评论区切换功能
        commentsToggle.addEventListener('click', () => {
            const isOpen = commentsDrawer.classList.contains('open');
            if (!isOpen) {
                // 打开评论区时播放打开音效
                this.openSound.currentTime = 0;
                this.openSound.play();
            } else {
                // 关闭评论区时播放关闭音效
                this.closeSound.currentTime = 0;
                this.closeSound.play();
            }
            commentsDrawer.classList.toggle('open');
            // 更新按钮文本
            commentsToggle.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
                ${isOpen ? languageProperties[curlang].main['close_comments'] : languageProperties[curlang].main['comments']}
            `;
        });

        webview.addEventListener('did-start-loading', () => {
            loading.classList.add('visible');
        });

        webview.addEventListener('did-stop-loading', () => {
            loading.classList.remove('visible');
            this.checkAndClearCache();
        });

        webview.addEventListener('did-fail-load', (event) => {
            if (event.errorCode !== -3) {
                loading.textContent = `${languageProperties[curlang].main['load_failed']}`;
                loading.classList.add('visible');
                setTimeout(() => {
                    loading.classList.remove('visible');
                }, 3000);
            }
        });

        // 处理新窗口打开
        webview.addEventListener('new-window', (event) => {
            event.preventDefault();
            webview.loadURL(event.url);
        });

        // 处理目标为_blank的链接点击
        webview.addEventListener('will-navigate', (event) => {
            const targetUrl = event.url;
            const currentUrl = webview.getURL();

            // 如果是外部链接，阻止默认行为并使用默认浏览器打开
            if (!targetUrl.startsWith(new URL(currentUrl).origin)) {
                event.preventDefault();
                shell.openExternal(targetUrl);
            }
        });
    }
}

customElements.define('web-viewer', WebViewer); 
window.languageProperties = languageProperties;
window.curlang = curlang;