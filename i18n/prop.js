const languageProperties = {
    'zh-CN': {
        'main': {
            "clearCache":"清除缓存",
            "clearCache_tip": "清除缓存并重启",
            "back":"后退",
            "forward":"前进",
            "refresh":"刷新",
            "account":"账户",
            "mini":"最小化",
            "max":"最大化",
            "close":"关闭",
            "loading":"加载中...",
            "close_comments":"关闭评论",
            "comments":"评论区",
            "load_failed":"加载失败，请检查网络连接!"
        },
        'community': {
            'menuCopyUrl': '复制链接',
            'menuOpenInBrowser': '在浏览器中打开',
            'menuOpenFolder': '打开工具文件夹',
            'menuOpenDoc':'使用浏览器打开文档'
        },
        'nav': {
            'showMain': '显示主窗口',
            'exit': '退出'
        },
        "status": {
            "0":"下载",
            "1": "下载中",
            "2": "已下载",
            "3": "打开",
            "4":"更新",
            "5":"下载失败",
            "6": "版本",
            "7": "下载次数",
            "8": "发布于",
            "9":"简介",
            "10":"暂无简介",
            "updateLog":"更新日志",
            "noUpdateLog": "暂无更新日志",
            "nodoc":"该工具暂时没有文档"
        },
        "page": {
            "home": "首页",
            "tools":"工具",
            "onlinetools":"在线工具",
            "community":"社区",
            "console":"开发者控制台"
        }
    },
    'en-US': {
        'main': {
            "clearCache": "Clear Cache",
            "clearCache_tip": "Clear cache and restart",
            "back": "Back",
            "forward": "Forward",
            "refresh": "Refresh",
            "account": "Account",
            "mini": "Minimize",
            "max": "Maximize",
            "close": "Close",
            "loading": "Loading...",
            "close_comments": "Close Comments",
            "comments": "Comments",
            "load_failed": "Load failed, please check your network connection!"
        },
        'community': {
            'menuCopyUrl': 'Copy Link',
            'menuOpenInBrowser': 'Open in Browser',
            'menuOpenFolder': 'Open Tool Folder',
            'menuOpenDoc': 'Open Documentation in Browser'
        },
        'nav': {
            'showMain': 'Show Main Window',
            'exit': 'Exit'
        },
        "status": {
            "0": "Download",
            "1": "Downloading",
            "2": "Downloaded",
            "3": "Open",
            "4": "Update",
            "5": "Download Failed",
            "6": "Version",
            "7": "Downloads",
            "8": "Released on",
            "9": "Tool Description",
            "10": "No description available",
            "updateLog": "Update Log",
            "noUpdateLog": "No update log available",
            "nodoc": "This tool has no documentation available"
        },
        "page": {
            "home": "Home",
            "tools": "Tools",
            "onlinetools": "Online Tools",
            "community": "Community",
            "console": "Developer Console"
        }
    },
    'ko-KR': {
        'main': {
            "clearCache": "캐시 지우기",
            "clearCache_tip": "캐시를 지우고 재시작합니다",
            "back": "뒤로",
            "forward": "앞으로",
            "refresh": "새로 고침",
            "account": "계정",
            "mini": "최소화",
            "max": "최대화",
            "close": "닫기",
            "loading": "로딩 중...",
            "close_comments": "댓글 닫기",
            "comments": "댓글 영역",
            "load_failed": "로드 실패, 네트워크 연결을 확인하세요!"
        },
        'community': {
            'menuCopyUrl': '링크 복사',
            'menuOpenInBrowser': '브라우저에서 열기',
            'menuOpenFolder': '도구 폴더 열기',
            'menuOpenDoc': '문서를 브라우저에서 열기'
        },
        'nav': {
            'showMain': '주 창 표시',
            'exit': '종료'
        },
        "status": {
            "0": "다운로드",
            "1": "다운로드 중",
            "2": "다운로드 완료",
            "3": "열기",
            "4": "업데이트",
            "5": "다운로드 실패",
            "6": "버전",
            "7": "다운로드 횟수",
            "8": "출시일",
            "9": "도구 설명",
            "10": "설명 없음",
            "updateLog": "업데이트 로그",
            "noUpdateLog": "업데이트 로그 없음",
            "nodoc": "이 도구는 문서가 없습니다"
        },
        "page": {
            "home": "홈",
            "tools": "도구",
            "onlinetools": "온라인 도구",
            "community": "커뮤니티",
            "console": "개발자 콘솔"
        }
    },
    'getlang': function () {
        if (localStorage.getItem('atl_language') == undefined || localStorage.getItem('atl_language') == '') {
            if (navigator.language in languageProperties) {
                localStorage.setItem('atl_language', navigator.language);
                return navigator.language;
            } else {
                localStorage.setItem('atl_language', 'en-US');
                return 'en-US';
            }
        }
        if (localStorage.getItem('atl_language') in languageProperties) {
            return localStorage.getItem('atl_language');
        } else {
            localStorage.setItem('atl_language', 'en-US');
            return 'en-US';
        }
    }
    ,
    'setlang': function (l) {
        localStorage.setItem('atl_language', l || navigator.language)
    }

}

export default languageProperties
