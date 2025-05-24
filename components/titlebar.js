import languageProperties from '../i18n/prop.js'
let curlang = languageProperties.getlang();

class TitleBar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 40px;
                    background-color: #1a1a1a;
                    -webkit-app-region: drag;
                    user-select: none;
                    display: flex;
                    align-items: center;
                    padding: 0 10px;
                    color: white;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                }

                .title-section {
                    display: flex;
                    align-items: center;
                    flex: 1;
                }

                .app-icon {
                    width: 16px;
                    height: 16px;
                    margin-right: 8px;
                }

                .app-title {
                    font-size: 12px;
                    font-weight: 500;
                }

                .clear-cache {
                    font-size: 12px;
                    margin-left: 12px;
                    padding: 4px 8px;
                    background-color: #333;
                    border-radius: 4px;
                    cursor: pointer;
                    -webkit-app-region: no-drag;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .clear-cache:hover {
                    background-color: #444;
                }

                .clear-cache svg {
                    width: 12px;
                    height: 12px;
                    fill: currentColor;
                }

                .window-controls {
                    display: flex;
                    -webkit-app-region: no-drag;
                }

                .control-button {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    opacity: 0.8;
                    transition: background-color 0.2s;
                }

                .control-button:hover {
                    opacity: 1;
                    background-color: rgba(255, 255, 255, 0.1);
                }

                .close-button:hover {
                    background-color: #e81123;
                }

                .control-icon {
                    width: 10px;
                    height: 10px;
                    fill: currentColor;
                }

                .login-button {
                    -webkit-app-region: no-drag;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px;
                    margin-right: 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                }

                .login-button:hover {
                    background-color: #333;
                }

                .login-button img {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                }

                .login-button span {
                    font-size: 12px;
                }

                .login-popup {
                    position: absolute;
                    top: 36px;
                    right: 0;
                    background: #262626;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    display: none;
                    z-index: 10000;
                    overflow: hidden;
                }

                .login-popup::before {
                    content: '';
                    position: absolute;
                    top: -4px;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: transparent;
                }

                .login-popup iframe {
                    width: 400px;
                    height: 500px;
                    border: none;
                }

                .nav-controls {
                    display: flex;
                    gap: 4px;
                    margin-right: 12px;
                    -webkit-app-region: no-drag;
                }

                .nav-button {
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: #333;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .nav-button:hover {
                    background-color: #444;
                }

                .nav-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .nav-button svg {
                    width: 16px;
                    height: 16px;
                    fill: #ffffff;
                }
            </style>
            <div class="title-section">
                <img src="../assets/img/icon.png" class="app-icon" alt="App Icon">
                <span class="app-title">ADOFAI-Tools</span>
                <div class="clear-cache" title="${languageProperties[curlang].main['clearCache_tip']}">
                    <svg viewBox="0 0 24 24">
                        <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                    </svg>
                    ${languageProperties[curlang].main['clearCache']}
                </div>
            </div>
            <div class="nav-controls">
                <button class="nav-button" id="backButton" title="${languageProperties[curlang].main['back']}">
                    <svg viewBox="0 0 24 24">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                    </svg>
                </button>
                <button class="nav-button" id="forwardButton" title="${languageProperties[curlang].main['forward']}">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                    </svg>
                </button>
                <button class="nav-button" id="refreshButton" title="${languageProperties[curlang].main['refresh']}">
                    <svg viewBox="0 0 24 24">
                        <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                    </svg>
                </button>
            </div>
            <div class="login-button">
                <img src="../assets/img/default-avatar.png" alt="${languageProperties[curlang].main['account']}">
                <span>${languageProperties[curlang].main['account']}</span>
                <div class="login-popup">
                    <iframe src="https://adofaitools.top/users/login.php" frameborder="0"></iframe>
                </div>
            </div>
            <div class="window-controls">
                <div class="control-button minimize-button" title="${languageProperties[curlang].main['mini']}">
                    <svg class="control-icon" viewBox="0 0 10 1">
                        <path d="M0 0h10v1H0z"/>
                    </svg>
                </div>
                <div class="control-button maximize-button" title="${languageProperties[curlang].main['max']}">
                    <svg class="control-icon" viewBox="0 0 10 10">
                        <path d="M0 0v10h10V0H0zm1 1h8v8H1V1z"/>
                    </svg>
                </div>
                <div class="control-button close-button" title="${languageProperties[curlang].main['close']}">
                    <svg class="control-icon" viewBox="0 0 10 10">
                        <path d="M1 0L0 1l4 4-4 4 1 1 4-4 4 4 1-1-4-4 4-4-1-1-4 4-4-4z"/>
                    </svg>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const { ipcRenderer } = require('electron');

        this.shadowRoot.querySelector('.minimize-button').addEventListener('click', () => {
            ipcRenderer.send('window-control', 'minimize');
        });

        this.shadowRoot.querySelector('.maximize-button').addEventListener('click', () => {
            ipcRenderer.send('window-control', 'maximize');
        });

        this.shadowRoot.querySelector('.close-button').addEventListener('click', () => {
            ipcRenderer.send('window-control', 'close');
        });

        this.shadowRoot.querySelector('.clear-cache').addEventListener('click', () => {
            ipcRenderer.send('clear-cache');
        });

        const loginButton = this.shadowRoot.querySelector('.login-button');
        const loginPopup = this.shadowRoot.querySelector('.login-popup');
        let popupVisible = false;
        let mouseInButton = false;
        let mouseInPopup = false;

        loginButton.addEventListener('mouseenter', () => {
            mouseInButton = true;
            loginPopup.style.display = 'block';
            popupVisible = true;
        });

        loginButton.addEventListener('mouseleave', () => {
            mouseInButton = false;
            setTimeout(() => {
                if (!mouseInPopup && !mouseInButton) {
                    loginPopup.style.display = 'none';
                    popupVisible = false;
                }
            }, 100);
        });

        loginPopup.addEventListener('mouseenter', () => {
            mouseInPopup = true;
        });

        loginPopup.addEventListener('mouseleave', () => {
            mouseInPopup = false;
            if (!mouseInButton) {
                loginPopup.style.display = 'none';
                popupVisible = false;
            }
        });

        const backButton = this.shadowRoot.getElementById('backButton');
        const forwardButton = this.shadowRoot.getElementById('forwardButton');
        const refreshButton = this.shadowRoot.getElementById('refreshButton');

        backButton.addEventListener('click', () => {
            const webviewer = document.querySelector('web-viewer');
            if (webviewer) {
                const webview = webviewer.shadowRoot.querySelector('webview');
                if (webview && webview.canGoBack()) {
                    webview.goBack();
                }
            }
        });

        forwardButton.addEventListener('click', () => {
            const webviewer = document.querySelector('web-viewer');
            if (webviewer) {
                const webview = webviewer.shadowRoot.querySelector('webview');
                if (webview && webview.canGoForward()) {
                    webview.goForward();
                }
            }
        });

        refreshButton.addEventListener('click', () => {
            const webviewer = document.querySelector('web-viewer');
            if (webviewer) {
                const webview = webviewer.shadowRoot.querySelector('webview');
                if (webview) {
                    webview.reload();
                }
            }
        });

        const updateNavButtons = () => {
            const webviewer = document.querySelector('web-viewer');
            if (webviewer) {
                const webview = webviewer.shadowRoot.querySelector('webview');
                if (webview) {
                    backButton.disabled = !webview.canGoBack();
                    forwardButton.disabled = !webview.canGoForward();
                }
            }
        };

        setInterval(updateNavButtons, 1000);
    }
}

customElements.define('title-bar', TitleBar); 